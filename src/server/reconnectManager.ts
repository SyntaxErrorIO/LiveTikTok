export interface ReconnectState {
  attempts: number;
  maxAttempts: number;
  nextDelayMs: number;
  isReconnecting: boolean;
  lastDisconnectReason: string;
}

export class ReconnectManager {
  private attempts: number = 0;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private timer: NodeJS.Timeout | null = null;
  private lastDisconnectReason: string = 'Ninguna desconexión registrada';
  private onReconnectTrigger: () => Promise<boolean>;

  constructor(
    onReconnectTrigger: () => Promise<boolean>,
    maxAttempts: number = 8,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 60000
  ) {
    this.onReconnectTrigger = onReconnectTrigger;
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  public getNextDelay(): number {
    // Exponential backoff: base * 2^(attempts) + proportional jitter (0-15%)
    const exponential = this.baseDelayMs * Math.pow(2, this.attempts);
    const jitter = Math.floor(Math.random() * Math.min(250, exponential * 0.15));
    return Math.min(this.maxDelayMs, exponential + jitter);
  }

  public handleDisconnect(reason: string) {
    this.lastDisconnectReason = reason;

    if (this.attempts >= this.maxAttempts) {
      this.cancel();
      return {
        canRetry: false,
        reason: `Límite de reconexión alcanzado (${this.maxAttempts} intentos fallidos). Conexión en pausa.`,
        attempts: this.attempts,
      };
    }

    const delay = this.getNextDelay();
    this.attempts++;

    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      try {
        const success = await this.onReconnectTrigger();
        if (success) {
          this.reset();
        } else {
          // If unsuccessful, chain next retry
          this.handleDisconnect('Fallo en intento de reconexión automática');
        }
      } catch {
        this.handleDisconnect('Excepción de red durante la reconexión');
      }
    }, delay);

    return {
      canRetry: true,
      delayMs: delay,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      reason,
    };
  }

  public reset() {
    this.attempts = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public getState(): ReconnectState {
    return {
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      nextDelayMs: this.getNextDelay(),
      isReconnecting: this.timer !== null,
      lastDisconnectReason: this.lastDisconnectReason,
    };
  }
}
