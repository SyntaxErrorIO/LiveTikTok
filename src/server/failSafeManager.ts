import { SystemLogger } from './systemLogger';

export interface FailSafeStatus {
  active: boolean;
  reason: string | null;
  triggeredAt: number | null;
  source: 'tiktok_disconnect' | 'webhook_auth_failed' | 'external_integration_error' | 'manual' | null;
  suppressOverlayAnimations: boolean;
}

const DEFAULT_FAIL_SAFE: FailSafeStatus = {
  active: false,
  reason: null,
  triggeredAt: null,
  source: null,
  suppressOverlayAnimations: true,
};

export class FailSafeManager {
  private static globalStatus: FailSafeStatus = { ...DEFAULT_FAIL_SAFE };
  private static userStatuses: Map<string, FailSafeStatus> = new Map();
  private static listeners: ((status: FailSafeStatus, userId?: string) => void)[] = [];

  public static getStatus(userId?: string): FailSafeStatus {
    const key = userId || 'default';
    const status = this.userStatuses.get(key) || this.globalStatus;
    return { ...status };
  }

  public static activate(
    reason: string,
    source: FailSafeStatus['source'] = 'tiktok_disconnect',
    suppressOverlay: boolean = true,
    userId?: string
  ): FailSafeStatus {
    const key = userId || 'default';
    const current = this.userStatuses.get(key) || this.globalStatus;

    if (current.active && current.reason === reason) {
      return { ...current };
    }

    const nextStatus: FailSafeStatus = {
      active: true,
      reason,
      triggeredAt: Date.now(),
      source,
      suppressOverlayAnimations: suppressOverlay,
    };

    if (userId) {
      this.userStatuses.set(userId, nextStatus);
    } else {
      this.globalStatus = nextStatus;
    }

    SystemLogger.error('FAIL_SAFE', `MODO SEGURO ACTIVADO [scope: ${key}]: ${reason}`, {
      details: { source, suppressOverlay, userId: userId || 'global' },
    });

    this.notify(userId);
    return { ...nextStatus };
  }

  public static reset(reason: string = 'Recuperación de servicio o restablecimiento manual', userId?: string): FailSafeStatus {
    const key = userId || 'default';
    const current = this.userStatuses.get(key) || this.globalStatus;

    if (!current.active) return { ...current };

    const nextStatus: FailSafeStatus = { ...DEFAULT_FAIL_SAFE };

    if (userId) {
      this.userStatuses.set(userId, nextStatus);
    } else {
      this.globalStatus = nextStatus;
    }

    SystemLogger.info('FAIL_SAFE', `Modo Seguro desactivado [scope: ${key}]: ${reason}`);
    this.notify(userId);
    return { ...nextStatus };
  }

  public static onStateChange(cb: (status: FailSafeStatus, userId?: string) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private static notify(userId?: string) {
    const current = this.getStatus(userId);
    this.listeners.forEach((cb) => {
      try {
        cb(current, userId);
      } catch {}
    });
  }
}
