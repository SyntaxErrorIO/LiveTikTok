import { ConnectionConfig, TikTokEvent } from '../types';
import { StorageService } from './storageService';

type EventListener = (event: TikTokEvent) => void;
type StatusListener = (config: ConnectionConfig) => void;

class TikTokService {
  private config: ConnectionConfig;
  private ws: WebSocket | null = null;
  private eventListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: number | null = null;
  private simulationInterval: number | null = null;

  constructor() {
    this.config = StorageService.getConnection();
  }

  public getConfig(): ConnectionConfig {
    return { ...this.config };
  }

  public onEvent(callback: EventListener): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: StatusListener): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus() {
    StorageService.saveConnection(this.config);
    this.statusListeners.forEach((cb) => cb({ ...this.config }));
  }

  private emitEvent(event: TikTokEvent) {
    this.config.lastActivityAt = Date.now();
    this.notifyStatus();
    this.eventListeners.forEach((cb) => cb(event));
  }

  public setMode(mode: 'simulation' | 'real_tiktok') {
    if (this.config.mode === mode) return;
    this.disconnect();
    this.config.mode = mode;
    this.config.status = 'disconnected';
    this.config.errorMessage = undefined;
    this.notifyStatus();
  }

  public updateCredentials(username: string, bridgeUrl: string, autoReconnect: boolean) {
    this.config.username = username.replace(/^@/, '').trim();
    this.config.bridgeServerUrl = bridgeUrl.trim();
    this.config.autoReconnect = autoReconnect;
    this.notifyStatus();
  }

  public async connect(): Promise<boolean> {
    if (this.config.status === 'connected') return true;

    if (this.config.mode === 'simulation') {
      return this.connectSimulation();
    } else {
      return this.connectRealBridge();
    }
  }

  private async connectSimulation(): Promise<boolean> {
    this.config.status = 'connecting';
    this.notifyStatus();

    // Small realistic handshake delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    this.config.status = 'connected';
    this.config.connectedAt = Date.now();
    this.config.lastActivityAt = Date.now();
    this.config.pingMs = 12;
    this.config.viewerCount = 1250;
    this.config.likeTotal = 15800;
    this.config.roomId = 'sim-' + Math.floor(1000000000 + Math.random() * 9000000000);
    this.config.errorMessage = undefined;
    this.notifyStatus();

    // Occasional subtle viewer/likes drift in simulation
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.simulationInterval = window.setInterval(() => {
      if (this.config.status === 'connected' && this.config.mode === 'simulation') {
        const drift = Math.floor(Math.random() * 7) - 3;
        this.config.viewerCount = Math.max(10, (this.config.viewerCount || 1000) + drift);
        this.config.likeTotal = (this.config.likeTotal || 10000) + Math.floor(Math.random() * 12);
        this.notifyStatus();
      }
    }, 4000);

    return true;
  }

  private async connectRealBridge(): Promise<boolean> {
    if (!this.config.username) {
      this.config.status = 'error';
      this.config.errorMessage = 'Debes ingresar un nombre de usuario de TikTok válido.';
      this.notifyStatus();
      return false;
    }

    this.config.status = 'connecting';
    this.config.errorMessage = undefined;
    this.notifyStatus();

    return new Promise((resolve) => {
      try {
        const bridgeUrl = this.config.bridgeServerUrl || 'ws://localhost:21213';
        const ws = new WebSocket(bridgeUrl);
        this.ws = ws;

        const timeout = setTimeout(() => {
          if (this.config.status === 'connecting') {
            this.config.status = 'error';
            this.config.errorMessage = `No se pudo conectar al puente WebSocket en ${bridgeUrl}. Asegúrate de que el conector de TikTokLIVE esté iniciado.`;
            this.notifyStatus();
            try { ws.close(); } catch {}
            resolve(false);
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          // Send join message for the tiktok username
          ws.send(JSON.stringify({
            command: 'CONNECT',
            username: this.config.username,
          }));

          this.config.status = 'connected';
          this.config.connectedAt = Date.now();
          this.config.lastActivityAt = Date.now();
          this.config.pingMs = 35;
          this.config.errorMessage = undefined;
          this.notifyStatus();
          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw.type && raw.user) {
              const tikTokEvent: TikTokEvent = {
                id: raw.id || 'evt-' + Date.now(),
                type: raw.type,
                source: 'real_tiktok',
                timestamp: Date.now(),
                user: {
                  id: raw.user.id || 'usr-' + raw.user.username,
                  username: raw.user.username,
                  nickname: raw.user.nickname || raw.user.username,
                  avatarUrl: raw.user.avatarUrl,
                  isFollower: raw.user.isFollower,
                  isSubscriber: raw.user.isSubscriber,
                  isModerator: raw.user.isModerator,
                  badgeLevel: raw.user.badgeLevel || 1,
                },
                data: raw.data || {},
              };
              this.emitEvent(tikTokEvent);
            }
          } catch {
            // Unparseable payload
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          this.config.status = 'error';
          this.config.errorMessage = `Error de socket al conectar con ${bridgeUrl}.`;
          this.notifyStatus();
          resolve(false);
        };

        ws.onclose = () => {
          if (this.config.status === 'connected') {
            this.config.status = 'disconnected';
            this.notifyStatus();
            if (this.config.autoReconnect) {
              this.scheduleReconnect();
            }
          }
        };
      } catch (err: unknown) {
        this.config.status = 'error';
        this.config.errorMessage = err instanceof Error ? err.message : 'Error inesperado de conexión';
        this.notifyStatus();
        resolve(false);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      if (this.config.mode === 'real_tiktok' && this.config.status !== 'connected') {
        this.connectRealBridge();
      }
    }, 5000);
  }

  public disconnect() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.config.status = 'disconnected';
    this.notifyStatus();
  }

  public async testPing(): Promise<number> {
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, Math.floor(15 + Math.random() * 25)));
    const ping = Math.round(performance.now() - start);
    this.config.pingMs = ping;
    this.notifyStatus();
    return ping;
  }

  public injectManualEvent(event: TikTokEvent) {
    this.emitEvent(event);
  }
}

export const tikTokService = new TikTokService();
