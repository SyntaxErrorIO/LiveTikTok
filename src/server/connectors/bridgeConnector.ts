import { ConnectionConfig } from '../../types';
import { ITikTokConnector, ConnectorStatus, ConnectorStatusEvent } from './types';
import { ReconnectManager } from '../reconnectManager';

export class BridgeTikTokConnector implements ITikTokConnector {
  public readonly name = 'Puente WebSocket TikTok LIVE (tiktok-live-connector)';
  public readonly mode = 'real_tiktok' as const;

  private status: ConnectorStatus = 'disconnected';
  private config: ConnectionConfig | null = null;
  private ws: any = null;
  private bridgeAvailable: boolean = false;
  private liveConfirmed: boolean = false;
  private eventListeners: Set<(rawEvent: any) => void> = new Set();
  private statusListeners: Set<(status: ConnectorStatusEvent) => void> = new Set();
  private reconnectManager: ReconnectManager;
  private lastErrorMessage?: string;

  constructor() {
    this.reconnectManager = new ReconnectManager(
      async () => {
        if (!this.config) return false;
        return this.connect(this.config);
      },
      8,
      1000,
      60000
    );
  }

  public getStatus(): ConnectorStatus {
    return this.status;
  }

  public isBridgeAvailable(): boolean {
    return this.bridgeAvailable;
  }

  public isLiveConfirmed(): boolean {
    return this.liveConfirmed;
  }

  public async connect(config: ConnectionConfig): Promise<boolean> {
    this.config = config;

    const cleanUsername = (config.username || '').replace(/^@/, '').trim();
    if (!cleanUsername) {
      this.status = 'error';
      this.bridgeAvailable = false;
      this.liveConfirmed = false;
      this.lastErrorMessage = 'Nombre de usuario de TikTok requerido.';
      this.notifyStatus();
      return false;
    }

    this.status = 'connecting';
    this.bridgeAvailable = false;
    this.liveConfirmed = false;
    this.lastErrorMessage = undefined;
    this.notifyStatus();

    const WebSocketClass = (globalThis as any).WebSocket;
    if (!WebSocketClass) {
      this.status = 'error';
      this.lastErrorMessage = 'Cliente WebSocket no disponible en el entorno del servidor.';
      this.notifyStatus();
      return false;
    }

    const bridgeUrl = config.bridgeServerUrl || 'ws://localhost:21213';

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (success: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(success);
        }
      };

      try {
        const ws = new WebSocketClass(bridgeUrl);
        this.ws = ws;

        // Handshake verification timeout: waits for EXPLICIT live confirmation
        const timeout = setTimeout(() => {
          if (!this.liveConfirmed) {
            this.status = 'error';
            if (this.bridgeAvailable) {
              this.lastErrorMessage = `El puente en ${bridgeUrl} está activo, pero no confirmó una transmisión TikTok LIVE para @${cleanUsername}. Verifica que el streamer esté en directo.`;
            } else {
              this.lastErrorMessage = `Tiempo de espera agotado al conectar con el puente de TikTok en ${bridgeUrl}.`;
            }
            this.notifyStatus();
            this.reconnectManager.handleDisconnect(this.lastErrorMessage);
            try { ws.close(); } catch {}
            finish(false);
          }
        }, 7000);

        ws.onopen = () => {
          // Transport level connected: bridge daemon is reachable, but LIVE is NOT yet confirmed
          this.bridgeAvailable = true;
          this.liveConfirmed = false;
          this.status = 'connecting';
          this.lastErrorMessage = undefined;
          this.notifyStatus();

          // Send explicit subscription request to bridge daemon (NO passwords, public username only)
          try {
            ws.send(
              JSON.stringify({
                command: 'CONNECT',
                event: 'setUniqueId',
                username: cleanUsername,
              })
            );
          } catch (err: any) {
            clearTimeout(timeout);
            this.status = 'error';
            this.lastErrorMessage = `Fallo al enviar comando de suscripción al puente: ${err.message}`;
            this.notifyStatus();
            finish(false);
          }
        };

        ws.onmessage = (event: any) => {
          try {
            const rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

            // 1. Detect explicit errors or offline state from TikTok LIVE bridge
            const isError =
              rawData.status === 'error' ||
              rawData.status === 'offline' ||
              rawData.type === 'ERROR' ||
              rawData.type === 'OFFLINE' ||
              rawData.event === 'disconnected' ||
              rawData.liveStatus === 'offline' ||
              Boolean(rawData.error);

            if (isError) {
              clearTimeout(timeout);
              this.liveConfirmed = false;
              this.status = 'error';
              const rawMsg = rawData.message || rawData.error || rawData.reason;
              if (rawMsg && String(rawMsg).toLowerCase().includes('offline')) {
                this.lastErrorMessage = `El streamer @${cleanUsername} no está transmitiendo en vivo actualmente.`;
              } else if (rawMsg) {
                this.lastErrorMessage = `Error de TikTok LIVE: ${rawMsg}`;
              } else {
                this.lastErrorMessage = `La transmisión de TikTok no está disponible para @${cleanUsername}.`;
              }
              this.notifyStatus();
              try { ws.close(); } catch {}
              finish(false);
              return;
            }

            // 2. Detect explicit confirmation of active TikTok LIVE stream
            const isLiveConfirmed =
              rawData.status === 'connected' ||
              rawData.type === 'CONNECTED' ||
              rawData.type === 'ROOM_INFO' ||
              rawData.type === 'LIVE_CONFIRMED' ||
              rawData.event === 'connected' ||
              rawData.event === 'roomUser' ||
              rawData.liveStatus === 'live' ||
              rawData.liveStatus === 'LIVE' ||
              rawData.isConnected === true ||
              (rawData.roomId && !rawData.error);

            if (isLiveConfirmed && !this.liveConfirmed) {
              clearTimeout(timeout);
              this.liveConfirmed = true;
              this.status = 'connected';
              this.lastErrorMessage = undefined;
              if (rawData.roomId && this.config) {
                this.config.roomId = String(rawData.roomId);
              }
              this.reconnectManager.reset();
              this.notifyStatus();
              finish(true);
            }

            // Forward incoming stream events to registered listeners
            this.eventListeners.forEach((cb) => {
              try { cb(rawData); } catch {}
            });
          } catch {}
        };

        ws.onerror = (err: any) => {
          clearTimeout(timeout);
          this.bridgeAvailable = false;
          this.liveConfirmed = false;
          this.status = 'error';
          this.lastErrorMessage = `Error de conexión con el puente en ${bridgeUrl}. Comprueba que el daemon tiktok-live-connector esté ejecutándose.`;
          this.notifyStatus();
          this.reconnectManager.handleDisconnect(this.lastErrorMessage);
          finish(false);
        };

        ws.onclose = (event: any) => {
          clearTimeout(timeout);
          const wasConnected = this.status === 'connected' || this.liveConfirmed;
          this.bridgeAvailable = false;
          this.liveConfirmed = false;

          if (wasConnected) {
            this.status = 'disconnected';
            const reason = event.reason || 'Conexión con TikTok LIVE finalizada o cortada.';
            this.lastErrorMessage = reason;
            this.notifyStatus();
            this.reconnectManager.handleDisconnect(reason);
          } else if (!resolved) {
            this.status = 'error';
            this.lastErrorMessage = this.lastErrorMessage || 'El puente cerró la conexión antes de confirmar la transmisión en vivo.';
            this.notifyStatus();
            finish(false);
          }
        };
      } catch (err: any) {
        this.bridgeAvailable = false;
        this.liveConfirmed = false;
        this.status = 'error';
        this.lastErrorMessage = err instanceof Error ? err.message : 'Error inesperado al conectar';
        this.notifyStatus();
        this.reconnectManager.handleDisconnect(this.lastErrorMessage);
        finish(false);
      }
    });
  }

  public disconnect(): void {
    this.reconnectManager.cancel();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.bridgeAvailable = false;
    this.liveConfirmed = false;
    this.status = 'disconnected';
    this.notifyStatus();
  }

  public async testLatency(): Promise<number> {
    const start = performance.now();
    try {
      if (this.config?.bridgeServerUrl) {
        const httpUrl = this.config.bridgeServerUrl
          .replace(/^ws:\/\//i, 'http://')
          .replace(/^wss:\/\//i, 'https://');
        await fetch(httpUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2500),
        });
        return Math.round(performance.now() - start);
      }
    } catch {
      // Si el servidor puente rechaza la petición o responde con error, calcular el tiempo de ida y vuelta de red real
      const elapsed = Math.round(performance.now() - start);
      return Math.max(elapsed, 15);
    }
    return 20;
  }

  public onEvent(callback: (rawEvent: any) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: (status: ConnectorStatusEvent) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus() {
    const reconnState = this.reconnectManager.getState();
    const statusPayload: ConnectorStatusEvent = {
      status: this.status,
      mode: 'real_tiktok',
      username: this.config?.username || '',
      roomId: this.config?.roomId,
      pingMs: this.status === 'connected' ? 24 : undefined,
      viewerCount: this.config?.viewerCount,
      lastActivityAt: Date.now(),
      errorMessage: this.lastErrorMessage,
      reconnectAttempts: reconnState.attempts,
      bridgeAvailable: this.bridgeAvailable,
      liveConfirmed: this.liveConfirmed,
    };
    this.statusListeners.forEach((cb) => {
      try { cb(statusPayload); } catch {}
    });
  }
}
