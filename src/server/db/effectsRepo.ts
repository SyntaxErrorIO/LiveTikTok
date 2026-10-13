import { OverlayEffect } from '../../types';
import { DEFAULT_EFFECTS } from '../../services/storageService';
import { DatabaseManager } from './database';

export class EffectsRepository {
  public static getEffects(userId?: string): OverlayEffect[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM effects WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      this.saveEffects(DEFAULT_EFFECTS, uid);
      return DEFAULT_EFFECTS;
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveEffects(effects: OverlayEffect[], userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const now = Date.now();
    const del = db.prepare('DELETE FROM effects WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO effects (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: OverlayEffect[]) => {
      del.run(uid);
      for (const e of items) {
        ins.run(e.id, uid, JSON.stringify(e), now);
      }
    });
    tx(effects);
  }
}
