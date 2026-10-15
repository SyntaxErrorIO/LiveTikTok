import {
  EngineStats,
  ExecutionLog,
  TikTokEvent,
} from '../types';
import { EventNormalizer } from './normalizer';
import { EventDeduplicator } from './deduplicator';
import { StateStore } from './stateStore';
import { TaskQueue } from './taskQueue';
import { ITikTokConnector } from './connectors/types';
import { SharedRuleEvaluator } from '../services/sharedRuleEvaluator';
import { ConnectorManager } from './engine/connectorManager';
import { RuleRunner } from './engine/ruleRunner';

export interface SSEBroadcastMessage {
  type:
    | 'TRIGGER_ACTION'
    | 'TIKTOK_EVENT'
    | 'EXECUTION_LOG'
    | 'COUNTERS_UPDATED'
    | 'LEADERBOARD_UPDATED'
    | 'CONNECTION_STATUS'
    | 'MASTER_SWITCH'
    | 'FAIL_SAFE_STATE'
    | 'GAME_CONFIG_UPDATED'
    | 'GAME_ACTION';
  payload?: any;
  config?: any;
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
  private connectorManager: ConnectorManager = new ConnectorManager();
  private startedAt: number = Date.now();

  private ruleExecutionTimestamps: Map<string, number[]> = new Map();
  private seededUsers: Set<string> = new Set();

  private totalReceived: number = 0;
  private totalProcessed: number = 0;
  private totalDeduplicated: number = 0;
  private totalRateLimited: number = 0;
  private totalErrors: number = 0;

  constructor() {
    this.deduplicator = new EventDeduplicator(5 * 60 * 1000);
    const settings = StateStore.getSettings();
    this.taskQueue = new TaskQueue(settings.globalRateLimitPerMinute || 60);

    if (!settings.masterAutomationEnabled) {
      this.taskQueue.pause();
    }
  }

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
              const key = `${safeUser}:${mr.ruleId}`;
              const list = this.ruleExecutionTimestamps.get(key) || [];
              list.push(ts);
              this.ruleExecutionTimestamps.set(key, list);
            }
          }
        }
      }
    } catch {}
  }

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

  public broadcast(msg: SSEBroadcastMessage, targetUserId?: string) {
    this.sseClients.forEach((client) => {
      if (targetUserId) {
        const matchesUser = client.userId === targetUserId;
        const matchesAdmin = client.isAdmin === true;
        const matchesOverlay = client.userId === targetUserId;

        if (!matchesUser && !matchesAdmin && !matchesOverlay) {
          return;
        }
      }

      try {
        client.listener(msg);
      } catch {}
    });
  }

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

    const event = EventNormalizer.normalize(raw, source);
    if (!event) {
      this.totalErrors++;
      return { accepted: false, reason: 'Payload no compatible con eventos de TikTok LIVE.' };
    }

    if (this.deduplicator.isDuplicate(event.id)) {
      this.totalDeduplicated++;
      return { accepted: false, reason: `Evento duplicado detectado (ID: ${event.id}). Omitido por deduplicador.` };
    }

    this.broadcast(
      {
        type: 'TIKTOK_EVENT',
        payload: event,
        timestamp: Date.now(),
      },
      targetUserId
    );

    const conn = StateStore.getConnection(targetUserId);
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn, targetUserId);

    this.taskQueue.enqueue({
      id: `task-${event.id}`,
      name: `Procesar evento ${event.type} de @${event.user.username}`,
      priority: event.type === 'gift' ? 'high' : event.type === 'comment' ? 'medium' : 'low',
      task: async () => {
        await RuleRunner.evaluateAndExecute(
          event,
          targetUserId,
          (msg, uid) => this.broadcast(msg, uid),
          (e, mr, os, t, err, uid) => this.recordLog(e, mr, os, t, err, uid),
          this.ruleExecutionTimestamps,
          (uid) => this.ensureUserTimestampsLoaded(uid),
          () => { this.totalRateLimited++; },
          () => { this.totalErrors++; }
        );
        this.totalProcessed++;
      },
      enqueuedAt: Date.now(),
      onError: () => {
        this.totalErrors++;
      },
    });

    return { accepted: true, reason: 'Evento encolado y en procesamiento.', event };
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
    this.broadcast({ type: 'EXECUTION_LOG', payload: log, timestamp: Date.now() }, targetUserId);
  }

  public async connect(userId?: string): Promise<boolean> {
    return this.connectorManager.connect(
      userId,
      (raw, mode) => this.ingestRawEvent(raw, mode as any, userId),
      (msg, uid) => this.broadcast(msg, uid)
    );
  }

  public disconnect(userId?: string) {
    this.connectorManager.disconnect(userId, (msg, uid) => this.broadcast(msg, uid));
  }

  public getActiveConnector(userId?: string): ITikTokConnector | null {
    return this.connectorManager.getActiveConnector(userId);
  }

  public simulateProviderDisconnect(reason: string = 'Pérdida de señal o socket cerrado por TikTok LIVE', userId?: string) {
    this.connectorManager.simulateProviderDisconnect(
      reason,
      userId,
      (msg, uid) => this.broadcast(msg, uid),
      (evt, matched, overall, time, err, uid) => this.recordLog(evt, matched, overall, time, err, uid)
    );
  }

  public async testLatency(userId?: string): Promise<number> {
    return this.connectorManager.testLatency(userId);
  }

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
