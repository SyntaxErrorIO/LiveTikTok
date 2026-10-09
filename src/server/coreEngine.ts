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

export class CoreAutomationEngine {
  private deduplicator: EventDeduplicator;
  private taskQueue: TaskQueue;
  private sseClients: Set<(data: SSEBroadcastMessage) => void> = new Set();
  private activeConnector: ITikTokConnector | null = null;
  private startedAt: number = Date.now();

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

  // Subscribe SSE clients
  public subscribeSSE(listener: (data: SSEBroadcastMessage) => void): () => void {
    this.sseClients.add(listener);
    return () => this.sseClients.delete(listener);
  }

  public broadcast(msg: SSEBroadcastMessage) {
    this.sseClients.forEach((client) => {
      try {
        client(msg);
      } catch {
        // SSE disconnected
      }
    });
  }

  // Master switch control
  public setMasterAutomation(enabled: boolean) {
    const settings = StateStore.getSettings();
    settings.masterAutomationEnabled = enabled;
    StateStore.saveSettings(settings);

    if (enabled) {
      this.taskQueue.resume();
    } else {
      this.taskQueue.pause();
    }

    this.broadcast({
      type: 'MASTER_SWITCH',
      payload: { enabled },
      timestamp: Date.now(),
    });
  }

  // Handle incoming raw event from webhook, connector, or simulator
  public async ingestRawEvent(raw: any, source: 'real_tiktok' | 'simulation' = 'real_tiktok'): Promise<{
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

    // 3. Broadcast incoming normalized event
    this.broadcast({
      type: 'TIKTOK_EVENT',
      payload: event,
      timestamp: Date.now(),
    });

    // 4. Update activity in connection
    const conn = StateStore.getConnection();
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn);

    // 5. Enqueue for autonomous processing
    this.taskQueue.enqueue({
      id: `task-${event.id}`,
      name: `Procesar evento ${event.type} de @${event.user.username}`,
      priority: event.type === 'gift' ? 'high' : event.type === 'comment' ? 'medium' : 'low',
      task: async () => {
        await this.evaluateAndExecute(event);
      },
      enqueuedAt: Date.now(),
      onError: (err) => {
        this.totalErrors++;
      },
    });

    return { accepted: true, reason: 'Evento encolado y en procesamiento.', event };
  }

  // Evaluate rules and trigger actions
  private async evaluateAndExecute(event: TikTokEvent) {
    const startTime = performance.now();
    const settings = StateStore.getSettings();
    const rules = StateStore.getRules();
    const effects = StateStore.getEffects();
    const now = Date.now();

    if (!settings.masterAutomationEnabled) {
      this.recordLog(event, [], 'no_match', 0, 'Motor pausado por el usuario.');
      return;
    }

    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const sortedRules = [...rules].sort(
      (a, b) => (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1)
    );

    const evaluatedDetails: ExecutionLog['matchedRules'] = [];
    let anyExecuted = false;
    let anyCooldown = false;

    for (const rule of sortedRules) {
      if (!rule.enabled || rule.triggerType !== event.type) {
        continue;
      }

      // Check conditions
      const condResult = this.checkConditions(event, rule);
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

      // Check hourly rate limit
      if (rule.maxPerHour && rule.executionsCount >= rule.maxPerHour) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'rate_limited',
        });
        this.totalRateLimited++;
        continue;
      }

      // Execute actions
      let executedActionsCount = 0;
      for (const action of rule.actions) {
        if (!action.enabled) continue;
        try {
          await this.executeAction(action, event, effects, settings);
          executedActionsCount++;
        } catch (err: any) {
          this.totalErrors++;
        }
      }

      // Update rule execution counters
      rule.lastTriggeredAt = now;
      rule.executionsCount = (rule.executionsCount || 0) + 1;

      evaluatedDetails.push({
        ruleId: rule.id,
        ruleName: rule.name,
        executedActionsCount,
        status: 'executed',
      });

      if (executedActionsCount > 0) {
        anyExecuted = true;
      }
    }

    StateStore.saveRules(rules);

    const execTime = Math.max(1, Math.round(performance.now() - startTime));
    this.totalProcessed++;

    const overallStatus: ExecutionLog['overallStatus'] = anyExecuted
      ? 'executed'
      : anyCooldown
      ? 'cooldown'
      : 'no_match';

    this.recordLog(event, evaluatedDetails, overallStatus, execTime);
  }

  private checkConditions(event: TikTokEvent, rule: AutomationRule): { passed: boolean; reason: string } {
    const c = rule.conditions;

    if (event.type === 'gift') {
      const diamonds = event.data.diamondCount || 0;
      const repeat = event.data.repeatCount || 1;
      const giftName = (event.data.giftName || '').toLowerCase().trim();

      if (c.giftName && c.giftName !== 'all' && c.giftName.toLowerCase() !== 'cualquiera') {
        if (!giftName.includes(c.giftName.toLowerCase().trim())) {
          return { passed: false, reason: 'Filtro de nombre no coincide.' };
        }
      }

      if (c.minDiamonds !== undefined && diamonds < c.minDiamonds) {
        return { passed: false, reason: `Diamantes (${diamonds}) < ${c.minDiamonds}` };
      }

      if (c.maxDiamonds !== undefined && diamonds > c.maxDiamonds) {
        return { passed: false, reason: `Diamantes (${diamonds}) > ${c.maxDiamonds}` };
      }

      if (c.minRepeatCount !== undefined && repeat < c.minRepeatCount) {
        return { passed: false, reason: `Racha (${repeat}) < ${c.minRepeatCount}` };
      }
    }

    if (event.type === 'comment') {
      const text = (event.data.comment || '').toLowerCase().trim();
      const keyword = (c.commentKeyword || '').toLowerCase().trim();

      if (keyword) {
        const matchType = c.commentMatchType || 'contains';
        let match = false;
        if (matchType === 'exact') match = text === keyword;
        else if (matchType === 'starts_with') match = text.startsWith(keyword);
        else match = text.includes(keyword);

        if (!match) return { passed: false, reason: 'Palabra clave no coincide.' };
      }
    }

    if (event.type === 'like') {
      const likes = event.data.likeCount || 1;
      if (c.minLikeCount !== undefined && likes < c.minLikeCount) {
        return { passed: false, reason: 'Likes insuficientes.' };
      }
    }

    // Role checks
    if (c.userFilter && c.userFilter !== 'all') {
      if (c.userFilter === 'subscribers' && !event.user.isSubscriber) return { passed: false, reason: 'Solo subs' };
      if (c.userFilter === 'moderators' && !event.user.isModerator) return { passed: false, reason: 'Solo moderadores' };
      if (c.userFilter === 'min_level' && (event.user.badgeLevel || 1) < (c.minSenderLevel || 1)) {
        return { passed: false, reason: 'Nivel inferior al requerido' };
      }
    }

    return { passed: true, reason: 'OK' };
  }

  private async executeAction(action: any, event: TikTokEvent, effects: OverlayEffect[], settings: any) {
    const formattedTitle = this.formatVariables(action.customMessageText || '{user} activó evento', event);

    switch (action.type) {
      case 'overlay_effect': {
        const effect = effects.find((e) => e.id === action.effectId) || effects[0];
        const title = this.formatVariables(effect.titleTemplate, event);
        const subtitle = this.formatVariables(effect.subtitleTemplate, event);
        const ttsText = effect.enableTTS ? this.formatVariables(effect.ttsTemplate, event) : undefined;

        this.broadcast({
          type: 'TRIGGER_ACTION',
          payload: {
            actionType: 'overlay_effect',
            effect,
            formattedTitle: title,
            formattedSubtitle: subtitle,
            ttsVoiceText: ttsText,
            event,
          },
          timestamp: Date.now(),
        });
        break;
      }

      case 'sound_fx': {
        this.broadcast({
          type: 'TRIGGER_ACTION',
          payload: {
            actionType: 'sound_fx',
            soundId: action.soundId || 'chime',
            volume: action.volume ?? 80,
            event,
          },
          timestamp: Date.now(),
        });
        break;
      }

      case 'tts_speech': {
        const text = this.formatVariables(action.ttsTemplate || '{user} envió un regalo', event);
        this.broadcast({
          type: 'TRIGGER_ACTION',
          payload: {
            actionType: 'tts_speech',
            text,
            ttsSpeed: action.ttsSpeed || 1.0,
            ttsVoice: action.ttsVoice,
            event,
          },
          timestamp: Date.now(),
        });
        break;
      }

      case 'custom_message': {
        this.broadcast({
          type: 'TRIGGER_ACTION',
          payload: {
            actionType: 'custom_message',
            message: formattedTitle,
            event,
          },
          timestamp: Date.now(),
        });
        break;
      }

      case 'update_counter': {
        this.handleCounterUpdate(action, event);
        break;
      }

      case 'add_leaderboard_points': {
        this.handleLeaderboardUpdate(action, event);
        break;
      }

      case 'iot_device_order': {
        await this.handleIoTDeviceOrder(action, event);
        break;
      }

      case 'webhook_post': {
        if (action.webhookUrl) {
          fetch(action.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event,
              timestamp: Date.now(),
              source: 'LiveTrigger_AI',
            }),
          }).catch(() => {});
        }
        break;
      }
    }
  }

  private handleCounterUpdate(action: any, event: TikTokEvent) {
    const counters = StateStore.getCounters();
    const targetCounter = counters.find((c) => c.id === action.counterId) || counters[0];

    if (!targetCounter) return;

    let delta = 1;
    if (action.counterAmount === 'event_diamonds') {
      delta = event.data.diamondCount || 1;
    } else if (action.counterAmount === 'event_amount') {
      delta = event.data.repeatCount || 1;
    } else if (typeof action.counterAmount === 'number') {
      delta = action.counterAmount;
    }

    if (action.counterOperation === 'reset') {
      targetCounter.current = 0;
    } else if (action.counterOperation === 'set') {
      targetCounter.current = delta;
    } else {
      targetCounter.current += delta;
    }

    targetCounter.lastUpdated = Date.now();
    StateStore.saveCounters(counters);

    this.broadcast({
      type: 'COUNTERS_UPDATED',
      payload: counters,
      timestamp: Date.now(),
    });
  }

  private handleLeaderboardUpdate(action: any, event: TikTokEvent) {
    const leaderboard = StateStore.getLeaderboard();
    let entry = leaderboard.find((l) => l.userId === event.user.id || l.username === event.user.username);

    let pointsToAdd = 10;
    if (action.leaderboardPoints === 'event_diamonds') {
      pointsToAdd = event.data.diamondCount || 10;
    } else if (typeof action.leaderboardPoints === 'number') {
      pointsToAdd = action.leaderboardPoints;
    }

    if (!entry) {
      entry = {
        userId: event.user.id,
        username: event.user.username,
        nickname: event.user.nickname,
        points: pointsToAdd,
        giftsCount: event.type === 'gift' ? 1 : 0,
        lastUpdated: Date.now(),
      };
      leaderboard.push(entry);
    } else {
      entry.points += pointsToAdd;
      if (event.type === 'gift') entry.giftsCount += (event.data.repeatCount || 1);
      entry.lastUpdated = Date.now();
    }

    // Sort descending by points
    leaderboard.sort((a, b) => b.points - a.points);
    const topLeaderboard = leaderboard.slice(0, 50);
    StateStore.saveLeaderboard(topLeaderboard);

    this.broadcast({
      type: 'LEADERBOARD_UPDATED',
      payload: topLeaderboard,
      timestamp: Date.now(),
    });
  }

  private async handleIoTDeviceOrder(action: any, event: TikTokEvent) {
    if (!action.deviceEndpoint) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), action.deviceTimeoutMs || 2500);

    const payload = action.deviceCommandPayload
      ? this.formatVariables(action.deviceCommandPayload, event)
      : JSON.stringify({ trigger: 'TikTokEvent', type: event.type, user: event.user.username });

    try {
      await fetch(action.deviceEndpoint, {
        method: action.deviceMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action.deviceMethod === 'GET' ? undefined : payload,
        signal: controller.signal,
      });
    } catch (err: any) {
      // Caught safely without bringing down engine
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordLog(
    event: TikTokEvent,
    matchedRules: ExecutionLog['matchedRules'],
    overallStatus: ExecutionLog['overallStatus'],
    executionTimeMs: number,
    errorDetails?: string
  ) {
    const log: ExecutionLog = {
      id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9),
      eventId: event.id,
      eventTimestamp: event.timestamp,
      source: event.source,
      eventType: event.type,
      eventSummary: this.getSummary(event),
      senderName: event.user.nickname || event.user.username,
      matchedRules,
      overallStatus,
      executionTimeMs,
      errorDetails,
    };

    StateStore.addLog(log);

    this.broadcast({
      type: 'EXECUTION_LOG',
      payload: log,
      timestamp: Date.now(),
    });
  }

  private formatVariables(template: string, event: TikTokEvent): string {
    return template
      .replace(/\{user\}/gi, event.user.nickname || event.user.username)
      .replace(/\{username\}/gi, event.user.username)
      .replace(/\{gift\}/gi, event.data.giftName || 'Regalo')
      .replace(/\{amount\}/gi, String(event.data.repeatCount || 1))
      .replace(/\{diamonds\}/gi, String(event.data.diamondCount || 0))
      .replace(/\{message\}/gi, event.data.comment || '')
      .replace(/\{likes\}/gi, String(event.data.likeCount || 1));
  }

  private getSummary(event: TikTokEvent): string {
    switch (event.type) {
      case 'gift':
        return `${event.data.repeatCount || 1}x ${event.data.giftName || 'Regalo'} (${event.data.diamondCount || 0} 💎)`;
      case 'comment':
        return `"${event.data.comment || ''}"`;
      case 'like':
        return `+${event.data.likeCount || 1} Likes`;
      case 'follow':
        return 'Nuevo Seguidor';
      case 'share':
        return 'Transmisión compartida';
      default:
        return 'Evento recibido';
    }
  }

  // Connection management via decoupled ITikTokConnector
  public async connect(): Promise<boolean> {
    const conn = StateStore.getConnection();

    // If existing connector has different mode, tear down cleanly
    if (this.activeConnector && this.activeConnector.mode !== conn.mode) {
      this.activeConnector.disconnect();
      this.activeConnector = null;
    }

    if (!this.activeConnector) {
      this.activeConnector = TikTokConnectorFactory.createConnector(conn.mode);

      // Listen to raw events from connector and ingest them into automation engine
      this.activeConnector.onEvent((rawEvent) => {
        this.ingestRawEvent(rawEvent, this.activeConnector?.mode || 'simulation');
      });

      // Listen to status updates
      this.activeConnector.onStatusChange((statusEvent) => {
        conn.status = (statusEvent.status === 'reconnecting' ? 'connecting' : statusEvent.status) as any;
        conn.lastActivityAt = statusEvent.lastActivityAt || Date.now();
        conn.errorMessage = statusEvent.errorMessage;
        if (statusEvent.pingMs) conn.pingMs = statusEvent.pingMs;
        if (statusEvent.viewerCount) conn.viewerCount = statusEvent.viewerCount;
        StateStore.saveConnection(conn);

        if (statusEvent.status === 'error') {
          FailSafeManager.activate(statusEvent.errorMessage || 'Error crítico en el conector de TikTok');
          this.broadcast({
            type: 'FAIL_SAFE_STATE',
            payload: FailSafeManager.getStatus(),
            timestamp: Date.now(),
          });
        }

        this.broadcast({
          type: 'CONNECTION_STATUS',
          payload: conn,
          timestamp: Date.now(),
        });
      });
    }

    const success = await this.activeConnector.connect(conn);
    if (success) {
      FailSafeManager.reset('Conexión establecida exitosamente');
      this.broadcast({
        type: 'FAIL_SAFE_STATE',
        payload: FailSafeManager.getStatus(),
        timestamp: Date.now(),
      });
    } else {
      FailSafeManager.activate('No fue posible negociar la conexión con el proveedor.');
      this.broadcast({
        type: 'FAIL_SAFE_STATE',
        payload: FailSafeManager.getStatus(),
        timestamp: Date.now(),
      });
    }
    return success;
  }

  public disconnect() {
    if (this.activeConnector) {
      this.activeConnector.disconnect();
    }

    const conn = StateStore.getConnection();
    conn.status = 'disconnected';
    StateStore.saveConnection(conn);
    this.broadcast({ type: 'CONNECTION_STATUS', payload: conn, timestamp: Date.now() });
  }

  public simulateProviderDisconnect(reason: string = 'Pérdida de señal o socket cerrado por TikTok LIVE') {
    const conn = StateStore.getConnection();
    conn.status = 'disconnected';
    conn.errorMessage = reason;
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn);

    FailSafeManager.activate(reason, 'tiktok_disconnect');
    this.broadcast({
      type: 'FAIL_SAFE_STATE',
      payload: FailSafeManager.getStatus(),
      timestamp: Date.now(),
    });

    this.broadcast({
      type: 'CONNECTION_STATUS',
      payload: conn,
      timestamp: Date.now(),
    });

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
      `Aviso de conexión: ${reason}`
    );
  }

  public async testLatency(): Promise<number> {
    if (this.activeConnector) {
      return this.activeConnector.testLatency();
    }
    return 15;
  }

  // Engine statistics
  public getStats(): EngineStats {
    const conn = StateStore.getConnection();
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
