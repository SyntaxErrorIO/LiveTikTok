/**
 * Event Deduplicator: Keeps track of seen event IDs to prevent repeated processing
 * when streaming providers or webhooks retry packets.
 */
export class EventDeduplicator {
  private cache: Map<string, number> = new Map();
  private readonly ttlMs: number;
  private readonly maxCapacity: number;

  constructor(ttlMs: number = 5 * 60 * 1000, maxCapacity: number = 10000) {
    this.ttlMs = ttlMs;
    this.maxCapacity = maxCapacity;

    // Periodic sweep every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  public isDuplicate(eventId: string): boolean {
    if (!eventId) return false;
    const now = Date.now();
    const expiry = this.cache.get(eventId);

    if (expiry && expiry > now) {
      return true; // Already processed
    }

    // Register event
    this.cache.set(eventId, now + this.ttlMs);

    // Evict oldest if capacity exceeded
    if (this.cache.size > this.maxCapacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    return false;
  }

  public cleanup() {
    const now = Date.now();
    for (const [id, expiry] of this.cache.entries()) {
      if (expiry <= now) {
        this.cache.delete(id);
      }
    }
  }

  public size(): number {
    return this.cache.size;
  }

  public clear() {
    this.cache.clear();
  }
}
