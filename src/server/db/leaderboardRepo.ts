import { LeaderboardEntry } from '../../types';
import { DatabaseManager } from './database';

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [];

export class LeaderboardRepository {
  public static getLeaderboard(userId?: string): LeaderboardEntry[] {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT data FROM leaderboard WHERE user_id = ? ORDER BY updated_at DESC').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      return [];
    }
    const list: LeaderboardEntry[] = rows.map((r) => JSON.parse(r.data));
    return list.sort((a, b) => b.points - a.points);
  }

  public static saveLeaderboard(leaderboard: LeaderboardEntry[], userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const now = Date.now();
    const del = db.prepare('DELETE FROM leaderboard WHERE user_id = ?');
    const ins = db.prepare('INSERT OR REPLACE INTO leaderboard (user_id, username, data, updated_at) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((items: LeaderboardEntry[]) => {
      del.run(uid);
      for (const item of items) {
        ins.run(uid, item.username, JSON.stringify(item), now);
      }
    });
    tx(leaderboard);
  }
}
