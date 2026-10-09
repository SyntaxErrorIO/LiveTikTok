import { Request, Response, NextFunction } from 'express';
import { SystemLogger } from './systemLogger';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private static store: Map<string, RateLimitRecord> = new Map();

  public static createLimiter(options: {
    windowMs: number;
    max: number;
    message: string;
    category?: 'AUTH' | 'API' | 'WEBHOOK';
  }) {
    const { windowMs, max, message, category = 'API' } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        'unknown_ip';
      const key = `${category}:${clientIp}`;
      const now = Date.now();

      let record = this.store.get(key);

      if (!record || now > record.resetAt) {
        record = {
          count: 1,
          resetAt: now + windowMs,
        };
        this.store.set(key, record);
        return next();
      }

      record.count++;

      if (record.count > max) {
        const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

        SystemLogger.warn('SECURITY', `Límite de tasa excedido para IP ${clientIp} en categoría ${category}`, {
          ip: clientIp,
          details: { category, count: record.count, limit: max, retryAfterSec },
        });

        return res.status(429).json({
          success: false,
          error: message,
          retryAfterSeconds: retryAfterSec,
        });
      }

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

      return next();
    };
  }

  // Periodic cleanup of stale IP records
  public static startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt) {
          this.store.delete(key);
        }
      }
    }, intervalMs);
  }
}

RateLimiter.startCleanup();
