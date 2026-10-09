import { ConnectionConfig } from '../../types';
import { ITikTokConnector, ConnectorStatus, ConnectorStatusEvent } from './types';

export class SimulationConnector implements ITikTokConnector {
  public readonly name = 'Simulador de Laboratorio TikTok LIVE';
  public readonly mode = 'simulation' as const;

  private status: ConnectorStatus = 'disconnected';
  private config: ConnectionConfig | null = null;
  private eventListeners: Set<(rawEvent: any) => void> = new Set();
  private statusListeners: Set<(status: ConnectorStatusEvent) => void> = new Set();
  private intervalTimer: NodeJS.Timeout | null = null;

  public getStatus(): ConnectorStatus {
    return this.status;
  }

  public async connect(config: ConnectionConfig): Promise<boolean> {
    this.config = config;
    this.status = 'connecting';
    this.notifyStatus();

    // Realistic handshake delay
    await new Promise((r) => setTimeout(r, 400));

    this.status = 'connected';
    this.notifyStatus();

    // Subtle drift of viewers
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.notifyStatus();
      }
    }, 5000);

    return true;
  }

  public disconnect(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.status = 'disconnected';
    this.notifyStatus();
  }

  /**
   * Nota técnica: El modo simulación se ejecuta 100% en memoria local (in-process).
   * Al no utilizar sockets ni conexiones de red externas, no existe latencia de transporte remoto.
   * Se mide la latencia real del bucle de eventos local (microtask dispatch RTT).
   */
  public async testLatency(): Promise<number> {
    const start = performance.now();
    await new Promise((resolve) => {
      if (typeof setImmediate === 'function') {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
    return Math.max(1, Math.round(performance.now() - start));
  }

  public onEvent(callback: (rawEvent: any) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusChange(callback: (status: ConnectorStatusEvent) => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  public emitEvent(rawEvent: any) {
    this.eventListeners.forEach((cb) => {
      try { cb(rawEvent); } catch {}
    });
  }

  private notifyStatus() {
    const statusPayload: ConnectorStatusEvent = {
      status: this.status,
      mode: 'simulation',
      username: this.config?.username || 'streamer_demo',
      roomId: this.config?.roomId || 'sim-room-8849201',
      pingMs: 14,
      viewerCount: 1250 + Math.floor(Math.random() * 20) - 10,
      lastActivityAt: Date.now(),
    };
    this.statusListeners.forEach((cb) => {
      try { cb(statusPayload); } catch {}
    });
  }
}
