import { StreamCounter } from '../../types';
import { DatabaseManager } from './database';

export const DEFAULT_COUNTERS: StreamCounter[] = [
  {
    id: 'cnt-roses-goal',
    name: 'Meta de Rosas del Directo',
    current: 0,
    target: 100,
    unit: 'Rosas',
    lastUpdated: Date.now(),
  },
  {
    id: 'cnt-diamonds-session',
    name: 'Meta de Diamantes',
    current: 0,
    target: 500,
    unit: 'Diamantes',
    lastUpdated: Date.now(),
  },
  {
    id: 'cnt-likes-rush',
    name: 'Ráfaga de Likes Comunitarios',
    current: 0,
    target: 50000,
    unit: 'Taps',
    lastUpdated: Date.now(),
  },
];

export class CountersRepository {
  public static getCounters(userId?: string): StreamCounter[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM counters WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      this.saveCounters(DEFAULT_COUNTERS, uid);
      return DEFAULT_COUNTERS;
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveCounters(counters: StreamCounter[], userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const now = Date.now();
    const del = db.prepare('DELETE FROM counters WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO counters (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: StreamCounter[]) => {
      del.run(uid);
      for (const c of items) {
        ins.run(c.id, uid, JSON.stringify(c), now);
      }
    });
    tx(counters);
  }
}
