import { AppSettings, ConnectionConfig } from '../../types';
import { DEFAULT_SETTINGS, DEFAULT_CONNECTION } from '../../services/storageService';
import { DatabaseManager } from './database';

export class SettingsRepository {
  public static getSettings(userId?: string): AppSettings {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const row = db.prepare('SELECT data FROM settings WHERE user_id = ?').get(uid) as { data: string } | undefined;
    if (!row) {
      this.saveSettings(DEFAULT_SETTINGS, uid);
      return DEFAULT_SETTINGS;
    }
    try {
      return JSON.parse(row.data);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: AppSettings, userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    db.prepare('INSERT OR REPLACE INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)').run(
      uid,
      JSON.stringify(settings),
      Date.now()
    );
  }

  public static getConnection(userId?: string): ConnectionConfig {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    const row = db.prepare('SELECT data FROM connection WHERE user_id = ?').get(uid) as { data: string } | undefined;
    if (!row) {
      this.saveConnection(DEFAULT_CONNECTION, uid);
      return DEFAULT_CONNECTION;
    }
    try {
      return JSON.parse(row.data);
    } catch {
      return DEFAULT_CONNECTION;
    }
  }

  public static saveConnection(conn: ConnectionConfig, userId?: string): void {
    const uid = DatabaseManager.normalizeUserId(userId);
    const db = DatabaseManager.getDb();
    db.prepare('INSERT OR REPLACE INTO connection (user_id, data, updated_at) VALUES (?, ?, ?)').run(
      uid,
      JSON.stringify(conn),
      Date.now()
    );
  }
}
