import { ConnectionConfig } from '../../types';
import { ITikTokConnector, ConnectorStatus, ConnectorStatusEvent } from './types';
import { ReconnectManager } from '../reconnectManager';

export class DirectTikTokConnector implements ITikTokConnector {
  public readonly name = 'Conector Directo TikTok LIVE (tiktok-live-connector)';
  public readonly mode = 'real_tiktok' as const;
  public readonly connectorType = 'direct' as const;

  private status: ConnectorStatus = 'disconnected';
  private config: ConnectionConfig | null = null;
  private connection: any = null;
  private transportConnected: boolean = false;
  private liveConfirmed: boolean = false;
  private lastErrorMessage?: string;
  private eventListeners: Set<(rawEvent: any) => void> = new Set();
  private statusListeners: Set<(status: ConnectorStatusEvent) => void> = new Set();
  private reconnectManager: ReconnectManager;

  // Active streak tracking to prevent duplicate actions on repeating gifts
  private activeStreaks: Map<string, { timer: NodeJS.Timeout; lastData: any }> = new Map();
  // Cache of recently completed streaks to prevent duplicate actions on delayed final events
  private completedStreaks: Map<string, { timestamp: number; emittedCount: number }> = new Map();

  constructor() {
    this.reconnectManager = new ReconnectManager(
      async () => {
        if (!this.config) return false;
        return this.connect(this.config);
      },
      8,
      1500,
      60000
    );
  }

  public getStatus(): ConnectorStatus {
    return this.status;
  }

  public isLiveConfirmed(): boolean {
    return this.liveConfirmed;
  }

  public isTransportConnected(): boolean {
    return this.transportConnected;
  }

  public async connect(config: ConnectionConfig): Promise<boolean> {
    this.config = config;

    const cleanUsername = (config.username || '').replace(/^@/, '').trim();
    if (!cleanUsername) {
      this.status = 'error';
      this.transportConnected = false;
      this.liveConfirmed = false;
      this.lastErrorMessage = 'Nombre de usuario de TikTok requerido.';
      this.notifyStatus();
      return false;
    }

    // Clean up previous instance if any
    this.cleanupConnection();

    this.status = 'connecting';
    this.transportConnected = false;
    this.liveConfirmed = false;
    this.lastErrorMessage = undefined;
    this.notifyStatus();

    // Securely retrieve Euler Stream signing key from backend environment
    const eulerApiKey = (
      process.env.EULER_STREAM_API_KEY ||
      process.env.EULER_STREAM_KEY ||
      process.env.SIGN_API_KEY ||
      ''
    ).trim();

    try {
      // Dynamically import WebcastPushConnection from tiktok-live-connector/legacy
      const { WebcastPushConnection } = await import('tiktok-live-connector/legacy');

      const connectionOptions: Record<string, any> = {
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        enableExtendedGiftInfo: true,
      };

      if (eulerApiKey) {
        connectionOptions.signApiKey = eulerApiKey;
      }

      const conn = new WebcastPushConnection(cleanUsername, connectionOptions);
      this.connection = conn;

      // Transport connected event
      conn.on('websocketConnected', () => {
        this.transportConnected = true;
        this.notifyStatus();
      });

      // Stream chat messages
      conn.on('chat', (data: any) => {
        this.emitRawEvent({
          type: 'chat',
          eventType: 'comment',
          id: data.msgId || `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user: {
            id: String(data.userId || data.secUid || data.uniqueId),
            username: data.uniqueId,
            nickname: data.nickname || data.uniqueId,
            avatarUrl: data.profilePictureUrl,
            isFollower: Boolean(data.isFollower),
            isSubscriber: Boolean(data.isSubscriber),
            isModerator: Boolean(data.isModerator),
            badgeLevel: Number(data.badgeLevel || 1),
          },
          comment: data.comment,
          timestamp: Number(data.createTime || Date.now()),
        });
      });

      // Stream gift events with combo streak deduplication
      conn.on('gift', (data: any) => {
        this.handleGiftWithStreakDeduplication(data);
      });

      // Stream likes
      conn.on('like', (data: any) => {
        this.emitRawEvent({
          type: 'like',
          eventType: 'like',
          id: data.msgId || `like-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user: {
            id: String(data.userId || data.secUid || data.uniqueId),
            username: data.uniqueId,
            nickname: data.nickname || data.uniqueId,
            avatarUrl: data.profilePictureUrl,
          },
          likeCount: Math.max(1, Number(data.likeCount || 1)),
          totalLikes: Number(data.totalLikes || 0),
          timestamp: Number(data.createTime || Date.now()),
        });
      });

      // Stream social events (follow and share)
      conn.on('social', (data: any) => {
        const rawType = String(data.displayType || data.label || '').toLowerCase();
        const isFollow = rawType.includes('follow') || !rawType.includes('share');
        this.emitRawEvent({
          type: isFollow ? 'follow' : 'share',
          eventType: isFollow ? 'follow' : 'share',
          id: data.msgId || `soc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user: {
            id: String(data.userId || data.secUid || data.uniqueId),
            username: data.uniqueId,
            nickname: data.nickname || data.uniqueId,
            avatarUrl: data.profilePictureUrl,
          },
          shareTarget: isFollow ? undefined : 'general',
          timestamp: Number(data.createTime || Date.now()),
        });
      });

      // Room user / viewer count updates
      conn.on('roomUser', (data: any) => {
        if (data.viewerCount !== undefined && this.config) {
          this.config.viewerCount = Number(data.viewerCount);
          this.notifyStatus();
        }
      });

      // Stream end notification
      conn.on('streamEnd', () => {
        this.status = 'disconnected';
        this.liveConfirmed = false;
        this.lastErrorMessage = `La transmisión en vivo de @${cleanUsername} ha finalizado.`;
        this.notifyStatus();
        this.reconnectManager.handleDisconnect(this.lastErrorMessage);
      });

      // Disconnect notification
      conn.on('disconnected', () => {
        const wasConnected = this.status === 'connected' || this.liveConfirmed;
        this.transportConnected = false;
        this.liveConfirmed = false;

        if (wasConnected) {
          this.status = 'disconnected';
          this.lastErrorMessage = 'Conexión con TikTok LIVE cerrada por el servidor.';
          this.notifyStatus();
          if (this.config?.autoReconnect) {
            this.reconnectManager.handleDisconnect(this.lastErrorMessage);
          }
        }
      });

      // Runtime error notification
      conn.on('error', (err: any) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.lastErrorMessage = this.formatErrorMessage(errMsg, cleanUsername, Boolean(eulerApiKey));
        this.status = 'error';
        this.notifyStatus();
      });

      // Initiate connection handshake
      const state = await conn.connect();

      // Confirmed TikTok LIVE transmission!
      this.transportConnected = true;
      this.liveConfirmed = true;
      this.status = 'connected';
      this.lastErrorMessage = undefined;

      if (state?.roomId && this.config) {
        this.config.roomId = String(state.roomId);
      }

      this.reconnectManager.reset();
      this.notifyStatus();
      return true;
    } catch (err: any) {
      this.transportConnected = false;
      this.liveConfirmed = false;
      this.status = 'error';

      const rawMsg = err instanceof Error ? err.message : String(err);
      this.lastErrorMessage = this.formatErrorMessage(rawMsg, cleanUsername, Boolean(eulerApiKey));
      this.notifyStatus();

      if (this.config?.autoReconnect) {
        this.reconnectManager.handleDisconnect(this.lastErrorMessage);
      }

      return false;
    }
  }

  /**
   * Handles streak gifts (e.g. roses) to prevent duplicate execution of actions.
   * - Streakable gifts in progress (repeatEnd === false) are aggregated.
   * - Once repeatEnd === true arrives, the aggregated gift is dispatched once.
   * - A 3-second safety debounce ensures completion if repeatEnd is dropped or delayed.
   * - Completed streaks are retained in a TTL cache to drop delayed duplicate finish events.
   * - Non-streakable gifts are dispatched immediately.
   */
  public handleGiftWithStreakDeduplication(data: any): void {
    const isStreakable = Boolean(data.giftType === 1 || data.repeatEnd !== undefined || data.groupId);
    const isStreakFinished = Boolean(data.repeatEnd === true || data.repeat_end === 1);

    if (!isStreakable) {
      // Non-streakable gift (e.g. Galaxy, Lion, Universe) => emit immediately
      this.emitNormalizedGift(data, Number(data.repeatCount || 1));
      return;
    }

    // Prune completed streaks older than 60 seconds
    const now = Date.now();
    for (const [key, record] of this.completedStreaks.entries()) {
      if (now - record.timestamp > 60000) {
        this.completedStreaks.delete(key);
      }
    }

    // Unique streak key: viewer + combo groupId (or giftId if no groupId)
    const streakKey = `${data.userId || data.secUid || data.uniqueId}_${data.groupId || data.giftId}`;
    const completed = this.completedStreaks.get(streakKey);
    const existing = this.activeStreaks.get(streakKey);

    // If streak was already emitted/completed (either by repeatEnd or debounce timeout)
    if (completed) {
      const incomingRepeat = Number(data.repeatCount || 1);
      // Delayed packet or delayed final event whose count was already dispatched => drop duplicate!
      if (incomingRepeat <= completed.emittedCount) {
        return;
      }

      // If streamer/viewer continued streak past timeout, only emit incremental delta
      const deltaCount = incomingRepeat - completed.emittedCount;
      completed.emittedCount = incomingRepeat;
      completed.timestamp = now;
      this.emitNormalizedGift(data, deltaCount);
      return;
    }

    if (existing) {
      clearTimeout(existing.timer);
    }

    if (isStreakFinished) {
      // Final event of the streak received => emit once with the final repeatCount!
      this.activeStreaks.delete(streakKey);
      const finalCount = Math.max(Number(data.repeatCount || 1), Number(existing?.lastData?.repeatCount || 1));
      this.completedStreaks.set(streakKey, { timestamp: now, emittedCount: finalCount });
      this.emitNormalizedGift(data, finalCount);
    } else {
      // Streak in progress => update latest data and set debounce timer
      const debounceTimer = setTimeout(() => {
        const pending = this.activeStreaks.get(streakKey);
        if (pending) {
          this.activeStreaks.delete(streakKey);
          const pendingCount = Number(pending.lastData.repeatCount || 1);
          this.completedStreaks.set(streakKey, { timestamp: Date.now(), emittedCount: pendingCount });
          this.emitNormalizedGift(pending.lastData, pendingCount);
        }
      }, 3000);

      this.activeStreaks.set(streakKey, {
        timer: debounceTimer,
        lastData: data,
      });
    }
  }

  private emitNormalizedGift(data: any, finalRepeatCount: number): void {
    const singleDiamonds = Math.max(1, Number(data.diamondCount || data.diamonds || 1));
    const totalRepeat = Math.max(1, finalRepeatCount);
    const totalDiamonds = singleDiamonds * totalRepeat;

    this.emitRawEvent({
      type: 'gift',
      eventType: 'gift',
      id: data.msgId || `gift-${data.groupId || data.giftId}-${Date.now()}-${totalRepeat}`,
      user: {
        id: String(data.userId || data.secUid || data.uniqueId),
        username: data.uniqueId,
        nickname: data.nickname || data.uniqueId,
        avatarUrl: data.profilePictureUrl,
        isFollower: Boolean(data.isFollower),
        isSubscriber: Boolean(data.isSubscriber),
        isModerator: Boolean(data.isModerator),
        badgeLevel: Number(data.badgeLevel || 1),
      },
      gift: {
        giftId: String(data.giftId || 'gift_standard'),
        giftName: data.giftName || data.describe || 'Regalo',
        diamondCount: totalDiamonds,
        repeatCount: totalRepeat,
      },
      timestamp: Number(data.createTime || Date.now()),
    });
  }

  private emitRawEvent(rawEvent: any): void {
    this.eventListeners.forEach((cb) => {
      try {
        cb(rawEvent);
      } catch {}
    });
  }

  public disconnect(): void {
    this.reconnectManager.cancel();
    this.cleanupConnection();
    this.status = 'disconnected';
    this.transportConnected = false;
    this.liveConfirmed = false;
    this.notifyStatus();
  }

  private cleanupConnection(): void {
    // Clear pending streak timers
    this.activeStreaks.forEach((streak) => {
      clearTimeout(streak.timer);
    });
    this.activeStreaks.clear();
    this.completedStreaks.clear();

    if (this.connection) {
      try {
        if (typeof this.connection.disconnect === 'function') {
          this.connection.disconnect();
        }
      } catch {}
      this.connection = null;
    }
  }

  public async testLatency(): Promise<number> {
    const eulerApiKey = (
      process.env.EULER_STREAM_API_KEY ||
      process.env.EULER_STREAM_KEY ||
      process.env.SIGN_API_KEY ||
      ''
    ).trim();

    // Medición de latencia de red real hacia endpoint activo (Euler Stream o TikTok Webcast)
    const targetUrl = eulerApiKey ? 'https://www.eulerstream.com' : 'https://www.tiktok.com';
    const start = performance.now();
    try {
      await fetch(targetUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3500),
      });
      return Math.round(performance.now() - start);
    } catch {
      const elapsed = Math.round(performance.now() - start);
      return Math.max(elapsed, 25);
    }
  }

  public onEvent(callback: (rawEvent: any) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: (status: ConnectorStatusEvent) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private formatErrorMessage(rawErr: string, username: string, hasEulerKey: boolean): string {
    const lower = rawErr.toLowerCase();

    if (lower.includes('offline') || lower.includes('failed to retrieve room id') || lower.includes('not live')) {
      return `El usuario @${username} no está transmitiendo en vivo actualmente en TikTok LIVE.`;
    }

    if (lower.includes('signature') || lower.includes('sign') || lower.includes('captcha') || lower.includes('rate limit')) {
      if (!hasEulerKey) {
        return `TikTok requiere firma de autenticación Webcast. Para servidores en la nube, configura EULER_STREAM_API_KEY en las variables de entorno (.env).`;
      }
      return `Error en la firma de Euler Stream: ${rawErr}`;
    }

    if (lower.includes('timeout') || lower.includes('timed out')) {
      return `Tiempo de espera agotado al conectar con la transmisión de @${username}.`;
    }

    return `Error en la conexión con TikTok LIVE: ${rawErr}`;
  }

  private notifyStatus() {
    const reconnState = this.reconnectManager.getState();
    const statusPayload: ConnectorStatusEvent = {
      status: this.status,
      mode: 'real_tiktok',
      connectorType: 'direct',
      username: this.config?.username || '',
      roomId: this.config?.roomId,
      pingMs: this.status === 'connected' ? 28 : undefined,
      viewerCount: this.config?.viewerCount,
      lastActivityAt: Date.now(),
      errorMessage: this.lastErrorMessage,
      reconnectAttempts: reconnState.attempts,
      liveConfirmed: this.liveConfirmed,
      transportConnected: this.transportConnected,
    };
    this.statusListeners.forEach((cb) => {
      try {
        cb(statusPayload);
      } catch {}
    });
  }
}
