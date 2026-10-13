import { AutomationRule } from '../../types';
import { DEFAULT_RULES } from '../../services/storageService';
import { DatabaseManager } from './database';

export class RulesRepository {
  public static getRules(userId?: string): AutomationRule[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM rules WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      if (uid === 'default') {
        this.saveRules(DEFAULT_RULES, uid);
        return DEFAULT_RULES;
      }
      return [];
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveRules(rules: AutomationRule[], userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const now = Date.now();
    const del = db.prepare('DELETE FROM rules WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO rules (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: AutomationRule[]) => {
      del.run(uid);
      for (const r of items) {
        ins.run(r.id, uid, JSON.stringify(r), now);
      }
    });
    tx(rules);
  }
}
