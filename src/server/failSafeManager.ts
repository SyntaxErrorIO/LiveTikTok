import { SystemLogger } from './systemLogger';

export interface FailSafeStatus {
  active: boolean;
  reason: string | null;
  triggeredAt: number | null;
  source: 'tiktok_disconnect' | 'webhook_auth_failed' | 'external_integration_error' | 'manual' | null;
  suppressOverlayAnimations: boolean;
}

export class FailSafeManager {
  private static status: FailSafeStatus = {
    active: false,
    reason: null,
    triggeredAt: null,
    source: null,
    suppressOverlayAnimations: true,
  };

  private static listeners: ((status: FailSafeStatus) => void)[] = [];

  public static getStatus(): FailSafeStatus {
    return { ...this.status };
  }

  public static activate(
    reason: string,
    source: FailSafeStatus['source'] = 'tiktok_disconnect',
    suppressOverlay: boolean = true
  ): FailSafeStatus {
    if (this.status.active && this.status.reason === reason) {
      return this.getStatus();
    }

    this.status = {
      active: true,
      reason,
      triggeredAt: Date.now(),
      source,
      suppressOverlayAnimations: suppressOverlay,
    };

    SystemLogger.error('FAIL_SAFE', `MODO SEGURO ACTIVADO: ${reason}`, {
      details: { source, suppressOverlay },
    });

    this.notify();
    return this.getStatus();
  }

  public static reset(reason: string = 'Recuperación de servicio o restablecimiento manual'): FailSafeStatus {
    if (!this.status.active) return this.getStatus();

    this.status = {
      active: false,
      reason: null,
      triggeredAt: null,
      source: null,
      suppressOverlayAnimations: true,
    };

    SystemLogger.info('FAIL_SAFE', `Modo Seguro desactivado: ${reason}`);
    this.notify();
    return this.getStatus();
  }

  public static onStateChange(cb: (status: FailSafeStatus) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private static notify() {
    const current = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch {}
    });
  }
}
