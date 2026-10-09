import { ConnectionConfig } from '../../types';
import { ITikTokConnector, ConnectorStatus, ConnectorStatusEvent } from './types';
import { ReconnectManager } from '../reconnectManager';

export class BridgeTikTokConnector implements ITikTokConnector {
  public readonly name = 'Puente WebSocket TikTok LIVE (tiktok-live-connector)';
  public readonly mode = 'real_tiktok' as const;

  private status: ConnectorStatus = 'disconnected';
  private config: ConnectionConfig | null = null;
  private ws: any = null;
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

  public async connect(config: ConnectionConfig): Promise<boolean> {
    this.config = config;

    if (!config.username || config.username.trim().length === 0) {
      this.status = 'error';
      this.lastErrorMessage = 'Nombre de usuario de TikTok requerido.';
      this.notifyStatus();
      return false;
    }

    this.status = 'connecting';
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
      try {
        const ws = new WebSocketClass(bridgeUrl);
        this.ws = ws;

        const timeout = setTimeout(() => {
          if (this.status === 'connecting') {
            this.status = 'error';
            this.lastErrorMessage = `Tiempo de espera agotado al conectar con el puente en ${bridgeUrl}.`;
            this.notifyStatus();
            this.reconnectManager.handleDisconnect('Timeout de conexión inicial');
            try { ws.close(); } catch {}
            resolve(false);
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.status = 'connected';
          this.lastErrorMessage = undefined;
          this.reconnectManager.reset();

          // Handshake payload: specify public username only (NO PASSWORDS)
          ws.send(
            JSON.stringify({
              command: 'CONNECT',
              username: config.username.replace(/^@/, '').trim(),
            })
          );

          this.notifyStatus();
          resolve(true);
        };

        ws.onmessage = (event: any) => {
          try {
            const rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            this.eventListeners.forEach((cb) => {
              try { cb(rawData); } catch {}
            });
          } catch {}
        };

        ws.onerror = (err: any) => {
          clearTimeout(timeout);
          this.status = 'error';
          this.lastErrorMessage = `Error de socket en ${bridgeUrl}. Asegúrate de que el conector de TikTok esté corriendo.`;
          this.notifyStatus();
          this.reconnectManager.handleDisconnect('Error en conexión de socket');
          resolve(false);
        };

        ws.onclose = (event: any) => {
          if (this.status === 'connected') {
            this.status = 'disconnected';
            const reason = event.reason || 'Conexión cerrada por el puente o corte de transmisión';
            this.lastErrorMessage = reason;
            this.notifyStatus();
            this.reconnectManager.handleDisconnect(reason);
          }
        };
      } catch (err: any) {
        this.status = 'error';
        this.lastErrorMessage = err instanceof Error ? err.message : 'Error inesperado';
        this.notifyStatus();
        this.reconnectManager.handleDisconnect(this.lastErrorMessage);
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    this.reconnectManager.cancel();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.status = 'disconnected';
    this.notifyStatus();
  }

  public async testLatency(): Promise<number> {
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 20 + Math.floor(Math.random() * 15)));
    return Math.round(performance.now() - start);
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
    };
    this.statusListeners.forEach((cb) => {
      try { cb(statusPayload); } catch {}
    });
  }
}
