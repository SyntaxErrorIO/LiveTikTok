export interface QueueItem {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  task: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
  enqueuedAt: number;
}

export class TaskQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private rateLimitWindowStart: number = Date.now();
  private executionsInCurrentMinute: number = 0;
  private maxPerMinute: number = 60;

  constructor(maxPerMinute: number = 60) {
    this.maxPerMinute = maxPerMinute;
  }

  public setRateLimit(maxPerMinute: number) {
    this.maxPerMinute = Math.max(10, maxPerMinute);
  }

  public enqueue(item: QueueItem): boolean {
    if (this.isPaused) {
      return false;
    }

    // Insert sorted by priority: high first, then medium, then low
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const itemWeight = priorityWeight[item.priority] || 1;

    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      const currentWeight = priorityWeight[this.queue[i].priority] || 1;
      if (itemWeight > currentWeight) {
        this.queue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(item);
    }

    // Trigger processing
    this.processNext();
    return true;
  }

  private async processNext() {
    if (this.isProcessing || this.isPaused || this.queue.length === 0) {
      return;
    }

    // Check rate limit window
    const now = Date.now();
    if (now - this.rateLimitWindowStart >= 60000) {
      this.rateLimitWindowStart = now;
      this.executionsInCurrentMinute = 0;
    }

    if (this.executionsInCurrentMinute >= this.maxPerMinute) {
      // Defer till next window
      const delay = Math.max(100, 60000 - (now - this.rateLimitWindowStart));
      setTimeout(() => this.processNext(), delay);
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (item) {
      try {
        this.executionsInCurrentMinute++;
        await item.task();
        item.onSuccess?.();
      } catch (err: any) {
        item.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }

    this.isProcessing = false;

    // Small pacing interval between tasks
    setTimeout(() => this.processNext(), 40);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    this.processNext();
  }

  public clear() {
    this.queue = [];
  }

  public size(): number {
    return this.queue.length;
  }

  public isQueuePaused(): boolean {
    return this.isPaused;
  }
}
