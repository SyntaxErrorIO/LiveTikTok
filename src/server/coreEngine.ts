import {
  AutomationRule,
  ConnectionConfig,
  EngineStats,
  ExecutionLog,
  LeaderboardEntry,
  OverlayEffect,
  StreamCounter,
  TikTokEvent,
} from '../types';
import { EventNormalizer } from './normalizer';
import { EventDeduplicator } from './deduplicator';
import { StateStore } from './stateStore';
import { TaskQueue } from './taskQueue';
import { SecurityValidator } from './securityValidator';
import { ITikTokConnector, ConnectorStatusEvent } from './connectors/types';
import { TikTokConnectorFactory } from './connectors/connectorFactory';
import { FailSafeManager } from './failSafeManager';
import { SystemLogger } from './systemLogger';
import { ActionExecutor } from './actionExecutor';
import { SharedRuleEvaluator } from '../services/sharedRuleEvaluator';

export interface SSEBroadcastMessage {
  type:
    | 'TRIGGER_ACTION'
    | 'TIKTOK_EVENT'
    | 'EXECUTION_LOG'
    | 'COUNTERS_UPDATED'
    | 'LEADERBOARD_UPDATED'
    | 'CONNECTION_STATUS'
    | 'MASTER_SWITCH'
    | 'FAIL_SAFE_STATE';
  payload: any;
  timestamp: number;
}

interface SSEClientSubscriber {
  id: string;
  listener: (data: SSEBroadcastMessage) => void;
  userId?: string;
  overlayToken?: string;
  isAdmin?: boolean;
}

export class CoreAutomationEngine {
  private deduplicator: EventDeduplicator;
  private taskQueue: TaskQueue;
  private sseClients: Map<string, SSEClientSubscriber> = new Map();
  // Multi-user connector isolation: active connector per user workspace
  private activeConnectors: Map<string, ITikTokConnector> = new Map();
  private startedAt: number = Date.now();

  // Sliding window execution timestamps per isolated user & rule: `${userId}:${ruleId}` -> timestamp[]
  private ruleExecutionTimestamps: Map<string, number[]> = new Map();
  private seededUsers: Set<string> = new Set();

  // Multi-user isolation helper to prevent rule key collisions across different creators
  private getRuleRateKey(userId: string | undefined, ruleId: string): string {
    const safeUser = userId || 'default';
    return `${safeUser}:${ruleId}`;
  }

  // Hydrate active timestamps from persistent logs on restart to prevent false rule lockups
  private ensureUserTimestampsLoaded(userId?: string) {
    const safeUser = userId || 'default';
    if (this.seededUsers.has(safeUser)) return;
    this.seededUsers.add(safeUser);

    try {
      const logs = StateStore.getLogs(userId);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const log of logs) {
        const ts = log.eventTimestamp || (log as any).timestamp || 0;
        if (ts > oneHourAgo && log.matchedRules) {
          for (const mr of log.matchedRules) {
            if (mr.status === 'executed' && mr.ruleId) {
              const key = this.getRuleRateKey(userId, mr.ruleId);
              const list = this.ruleExecutionTimestamps.get(key) || [];
              list.push(ts);
              this.ruleExecutionTimestamps.set(key, list);
            }
          }
        }
      }
    } catch {}
  }

  // Engine telemetry
  private totalReceived: number = 0;
  private totalProcessed: number = 0;
  private totalDeduplicated: number = 0;
  private totalRateLimited: number = 0;
  private totalErrors: number = 0;

  constructor() {
    this.deduplicator = new EventDeduplicator(5 * 60 * 1000);
    const settings = StateStore.getSettings();
    this.taskQueue = new TaskQueue(settings.globalRateLimitPerMinute || 60);

    // Initial check of master switch
    if (!settings.masterAutomationEnabled) {
      this.taskQueue.pause();
    }
  }

  // Subscribe SSE clients with user identification
  public subscribeSSE(
    listener: (data: SSEBroadcastMessage) => void,
    userId?: string,
    overlayToken?: string,
    isAdmin?: boolean
  ): () => void {
    const id = 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    this.sseClients.set(id, { id, listener, userId, overlayToken, isAdmin: Boolean(isAdmin) });
    return () => this.sseClients.delete(id);
  }

  // User-scoped broadcasting
  public broadcast(msg: SSEBroadcastMessage, targetUserId?: string) {
    this.sseClients.forEach((client) => {
      // If targetUserId is specified, only send to matching user, matching overlay, or admin
      if (targetUserId) {
        const matchesUser = client.userId === targetUserId;
        const matchesAdmin = client.isAdmin === true;
        let matchesOverlay = false;
        if (client.overlayToken) {
          const user = StateStore.getConnection(targetUserId);
          // Check if overlay belongs to target user
          matchesOverlay = client.userId === targetUserId;
        }

        if (!matchesUser && !matchesAdmin && !matchesOverlay) {
          return;
        }
      }

      try {
        client.listener(msg);
      } catch {
        // SSE disconnected
      }
    });
  }

  // Master switch control
  public setMasterAutomation(enabled: boolean, userId?: string) {
    const settings = StateStore.getSettings(userId);
    settings.masterAutomationEnabled = enabled;
    StateStore.saveSettings(settings, userId);

    if (enabled) {
      this.taskQueue.resume();
    } else {
      this.taskQueue.pause();
    }

    this.broadcast(
      {
        type: 'MASTER_SWITCH',
        payload: { enabled },
        timestamp: Date.now(),
      },
      userId
    );
  }

  // Handle incoming raw event from webhook, connector, or simulator
  public async ingestRawEvent(
    raw: any,
    source: 'real_tiktok' | 'simulation' = 'real_tiktok',
    targetUserId?: string
  ): Promise<{
    accepted: boolean;
    reason: string;
    event?: TikTokEvent;
  }> {
    this.totalReceived++;

    // 1. Normalize
    const event = EventNormalizer.normalize(raw, source);
    if (!event) {
      this.totalErrors++;
      return { accepted: false, reason: 'Payload no compatible con eventos de TikTok LIVE.' };
    }

    // 2. Deduplicate
    if (this.deduplicator.isDuplicate(event.id)) {
      this.totalDeduplicated++;
      return { accepted: false, reason: `Evento duplicado detectado (ID: ${event.id}). Omitido por deduplicador.` };
    }

    // 3. Broadcast incoming normalized event to user channel
    this.broadcast(
      {
        type: 'TIKTOK_EVENT',
        payload: event,
        timestamp: Date.now(),
      },
      targetUserId
    );

    // 4. Update activity in connection
    const conn = StateStore.getConnection(targetUserId);
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn, targetUserId);

    // 5. Enqueue for autonomous processing
    this.taskQueue.enqueue({
      id: `task-${event.id}`,
      name: `Procesar evento ${event.type} de @${event.user.username}`,
      priority: event.type === 'gift' ? 'high' : event.type === 'comment' ? 'medium' : 'low',
      task: async () => {
        await this.evaluateAndExecute(event, targetUserId);
      },
      enqueuedAt: Date.now(),
      onError: () => {
        this.totalErrors++;
      },
    });

    return { accepted: true, reason: 'Evento encolado y en procesamiento.', event };
  }

  // Evaluate rules and trigger actions
  private async evaluateAndExecute(event: TikTokEvent, targetUserId?: string) {
    const startTime = performance.now();
    const settings = StateStore.getSettings(targetUserId);
    const rules = StateStore.getRules(targetUserId);
    const effects = StateStore.getEffects(targetUserId);
    const now = Date.now();

    if (!settings.masterAutomationEnabled) {
      this.recordLog(event, [], 'no_match', 0, 'Motor pausado por el usuario.', targetUserId);
      return;
    }

    const sortedRules = SharedRuleEvaluator.sortRulesByPriority(rules);

    const evaluatedDetails: ExecutionLog['matchedRules'] = [];
    let anyExecuted = false;
    let anyCooldown = false;
    let lastExecutionError: string | undefined;

    for (const rule of sortedRules) {
      if (!rule.enabled || rule.triggerType !== event.type) {
        continue;
      }

      // Check conditions via unified SharedRuleEvaluator
      const condResult = SharedRuleEvaluator.checkConditions(event, rule);
      if (!condResult.passed) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'condition_failed',
        });
        continue;
      }

      // Check cooldown
      const cooldownMs = (rule.cooldownSeconds || 0) * 1000;
      if (rule.lastTriggeredAt && now - rule.lastTriggeredAt < cooldownMs) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'cooldown_blocked',
        });
        anyCooldown = true;
        continue;
      }

      // Check hourly rate limit with rolling 1-hour window (isolated per user and rule ID)
      this.ensureUserTimestampsLoaded(targetUserId);
      const rateKey = this.getRuleRateKey(targetUserId, rule.id);
      const oneHourAgo = now - 60 * 60 * 1000;
      const history = (this.ruleExecutionTimestamps.get(rateKey) || []).filter((t) => t > oneHourAgo);
      this.ruleExecutionTimestamps.set(rateKey, history);

      // Synchronize executionsCount so stale numbers from restarts or past days do not lock rules
      rule.executionsCount = history.length;

      if (rule.maxPerHour && history.length >= rule.maxPerHour) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'rate_limited',
        });
        this.totalRateLimited++;
        continue;
      }

      // Execute actions via modular ActionExecutor
      let executedActionsCount = 0;
      let ruleActionError: string | undefined;

      for (const action of rule.actions) {
        if (!action.enabled) continue;
        try {
          await ActionExecutor.executeAction(
            action,
            event,
            effects,
            settings,
            targetUserId,
            (msg, uid) => this.broadcast(msg, uid)
          );
          executedActionsCount++;
        } catch (err: any) {
          this.totalErrors++;
          ruleActionError = err?.message || String(err);
          lastExecutionError = ruleActionError;
          SystemLogger.error(
            'ENGINE',
            `Fallo en acción [${action.type}] de regla "${rule.name}": ${ruleActionError}`,
            {
              userId: targetUserId,
              details: { ruleId: rule.id, actionId: action.id, error: ruleActionError },
            }
          );
        }
      }

      if (executedActionsCount > 0) {
        // Register execution timestamp in rolling 1-hour window
        history.push(now);
        this.ruleExecutionTimestamps.set(rateKey, history);
        rule.executionsCount = history.length;
        rule.lastTriggeredAt = now;
        anyExecuted = true;

        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount,
          status: 'executed',
        });
      } else if (ruleActionError) {
        // External action failed: do not report success
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'condition_failed',
        });
      }
    }

    StateStore.saveRules(rules, targetUserId);

    const execTime = Math.max(1, Math.round(performance.now() - startTime));
    this.totalProcessed++;

    const overallStatus: ExecutionLog['overallStatus'] = anyExecuted
      ? 'executed'
      : anyCooldown
      ? 'cooldown'
      : 'no_match';

    this.recordLog(event, evaluatedDetails, overallStatus, execTime, lastExecutionError, targetUserId);
  }

  private recordLog(
    event: TikTokEvent,
    matchedRules: ExecutionLog['matchedRules'],
    overallStatus: ExecutionLog['overallStatus'],
    executionTimeMs: number,
    errorDetails?: string,
    targetUserId?: string
  ) {
    const log: ExecutionLog = {
      id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9),
      eventId: event.id,
      eventTimestamp: event.timestamp,
      source: event.source,
      eventType: event.type,
      eventSummary: SharedRuleEvaluator.getEventSummary(event),
      senderName: event.user.nickname || event.user.username,
      matchedRules,
      overallStatus,
      executionTimeMs,
      errorDetails,
    };

    StateStore.addLog(log, 500, targetUserId);

    this.broadcast(
      {
        type: 'EXECUTION_LOG',
        payload: log,
        timestamp: Date.now(),
      },
      targetUserId
    );
  }

  // Connection management via decoupled ITikTokConnector (multi-user isolated)
  public async connect(userId?: string): Promise<boolean> {
    const targetUserId = userId || 'default';
    const conn = StateStore.getConnection(userId);

    // If existing connector has different mode or connectorType, tear down cleanly
    const existing = this.activeConnectors.get(targetUserId);
    if (existing && (existing.mode !== conn.mode || (conn.connectorType && existing.connectorType !== conn.connectorType))) {
      existing.disconnect();
      this.activeConnectors.delete(targetUserId);
    }

    let connector = this.activeConnectors.get(targetUserId);
    if (!connector) {
      connector = TikTokConnectorFactory.createConnector(conn.mode, conn.connectorType || 'direct');
      this.activeConnectors.set(targetUserId, connector);

      // Listen to raw events from connector and ingest them into automation engine for this user
      connector.onEvent((rawEvent) => {
        this.ingestRawEvent(rawEvent, connector?.mode || 'simulation', userId);
      });

      // Listen to status updates
      connector.onStatusChange((statusEvent) => {
        conn.status = (statusEvent.status === 'reconnecting' ? 'connecting' : statusEvent.status) as any;
        conn.lastActivityAt = statusEvent.lastActivityAt || Date.now();
        conn.errorMessage = statusEvent.errorMessage;
        if (statusEvent.pingMs) conn.pingMs = statusEvent.pingMs;
        if (statusEvent.viewerCount) conn.viewerCount = statusEvent.viewerCount;
        StateStore.saveConnection(conn, userId);

        if (statusEvent.status === 'error') {
          FailSafeManager.activate(statusEvent.errorMessage || 'Error crítico en el conector de TikTok');
          this.broadcast(
            {
              type: 'FAIL_SAFE_STATE',
              payload: FailSafeManager.getStatus(),
              timestamp: Date.now(),
            },
            userId
          );
        }

        this.broadcast(
          {
            type: 'CONNECTION_STATUS',
            payload: conn,
            timestamp: Date.now(),
          },
          userId
        );
      });
    }

    const success = await connector.connect(conn);
    if (success) {
      FailSafeManager.reset('Conexión establecida exitosamente');
      this.broadcast(
        {
          type: 'FAIL_SAFE_STATE',
          payload: FailSafeManager.getStatus(),
          timestamp: Date.now(),
        },
        userId
      );
    } else {
      FailSafeManager.activate('No fue posible negociar la conexión con el proveedor.');
      this.broadcast(
        {
          type: 'FAIL_SAFE_STATE',
          payload: FailSafeManager.getStatus(),
          timestamp: Date.now(),
        },
        userId
      );
    }
    return success;
  }

  public disconnect(userId?: string) {
    const targetUserId = userId || 'default';
    const connector = this.activeConnectors.get(targetUserId);
    if (connector) {
      connector.disconnect();
      this.activeConnectors.delete(targetUserId);
    }

    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    StateStore.saveConnection(conn, userId);
    this.broadcast({ type: 'CONNECTION_STATUS', payload: conn, timestamp: Date.now() }, userId);
  }

  public getActiveConnector(userId?: string): ITikTokConnector | null {
    return this.activeConnectors.get(userId || 'default') || null;
  }

  public simulateProviderDisconnect(reason: string = 'Pérdida de señal o socket cerrado por TikTok LIVE', userId?: string) {
    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    conn.errorMessage = reason;
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn, userId);

    FailSafeManager.activate(reason, 'tiktok_disconnect');
    this.broadcast(
      {
        type: 'FAIL_SAFE_STATE',
        payload: FailSafeManager.getStatus(),
        timestamp: Date.now(),
      },
      userId
    );

    this.broadcast(
      {
        type: 'CONNECTION_STATUS',
        payload: conn,
        timestamp: Date.now(),
      },
      userId
    );

    this.recordLog(
      {
        id: 'sys-disc-' + Date.now(),
        type: 'comment',
        source: conn.mode,
        timestamp: Date.now(),
        user: { id: 'system', username: 'sistema_conexion', nickname: 'Sistema' },
        data: { comment: reason },
      },
      [],
      'no_match',
      1,
      `Aviso de conexión: ${reason}`,
      userId
    );
  }

  public async testLatency(userId?: string): Promise<number> {
    const connector = this.activeConnectors.get(userId || 'default');
    if (connector) {
      return connector.testLatency();
    }
    return 15;
  }

  // Engine statistics
  public getStats(userId?: string): EngineStats {
    const conn = StateStore.getConnection(userId);
    return {
      queuePending: this.taskQueue.size(),
      totalReceived: this.totalReceived,
      totalProcessed: this.totalProcessed,
      totalDeduplicated: this.totalDeduplicated,
      totalRateLimited: this.totalRateLimited,
      totalErrors: this.totalErrors,
      reconnectAttempts: conn.status === 'connecting' ? 1 : 0,
      maxReconnectAttempts: 8,
      nextBackoffDelayMs: 1000,
      lastDisconnectReason: conn.errorMessage || 'Desconexión controlada por el usuario',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}

export const coreEngine = new CoreAutomationEngine();
