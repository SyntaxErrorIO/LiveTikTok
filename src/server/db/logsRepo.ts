import { ExecutionLog } from '../../types';
import { DatabaseManager } from './database';

export class LogsRepository {
  public static getLogs(userId?: string): ExecutionLog[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM logs WHERE user_id = ? ORDER BY timestamp DESC').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) return [];
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveLogs(logs: ExecutionLog[], userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const del = db.prepare('DELETE FROM logs WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO logs (id, user_id, data, timestamp) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: ExecutionLog[]) => {
      del.run(uid);
      for (const l of items) {
        ins.run(l.id, uid, JSON.stringify(l), l.eventTimestamp || Date.now());
      }
    });
    tx(logs);
  }

  public static addLog(log: ExecutionLog, limit: number = 500, userId?: string): ExecutionLog[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const ins = db.prepare('INSERT OR REPLACE INTO logs (id, user_id, data, timestamp) VALUES (?, ?, ?, ?)');
    ins.run(log.id, uid, JSON.stringify(log), log.eventTimestamp || Date.now());

    // Prune excess logs
    const total = db.prepare('SELECT COUNT(*) as cnt FROM logs WHERE user_id = ?').get(uid) as any;
    if (total && total.cnt > limit) {
      db.prepare(`
        DELETE FROM logs WHERE user_id = ? AND id NOT IN (
          SELECT id FROM logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        )
      `).run(uid, uid, limit);
    }

    return this.getLogs(userId);
  }

  public static clearLogs(userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    db.prepare('DELETE FROM logs WHERE user_id = ?').run(uid);
  }

  public static getAuditLogs(): any[] {
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data));
  }

  public static addAuditLog(entry: any): void {
    const db = DatabaseManager.getDb();
    db.prepare('INSERT OR REPLACE INTO audit_logs (id, timestamp, data) VALUES (?, ?, ?)').run(
      entry.id,
      entry.timestamp || Date.now(),
      JSON.stringify(entry)
    );
  }
}
