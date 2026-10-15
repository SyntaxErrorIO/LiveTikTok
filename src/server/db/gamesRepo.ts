import { DatabaseManager } from './database';

export class GamesRepository {
  public static getGameConfig(userId?: string): any {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const row = db.prepare('SELECT data FROM games_config WHERE user_id = ?').get(uid) as { data: string } | undefined;
    if (!row) {
      return null;
    }
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }

  public static saveGameConfig(config: any, userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    db.prepare('INSERT OR REPLACE INTO games_config (user_id, data, updated_at) VALUES (?, ?, ?)').run(
      uid,
      JSON.stringify(config),
      Date.now()
    );
  }
}
