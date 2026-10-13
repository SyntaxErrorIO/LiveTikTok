import { DatabaseManager } from './database';
import { StoredUserAccount } from './types';

export class UsersRepository {
  public static getUsers(): StoredUserAccount[] {
    const db = DatabaseManager.getDb();
    const rows = db.prepare('SELECT * FROM users').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      passwordHash: r.password_hash,
      passwordSalt: r.password_salt,
      overlayToken: r.overlay_token,
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at,
    }));
  }

  public static saveUser(user: StoredUserAccount): void {
    const db = DatabaseManager.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, role, password_hash, password_salt, overlay_token, created_at, last_login_at)
      VALUES (@id, @username, @email, @role, @passwordHash, @passwordSalt, @overlayToken, @createdAt, @lastLoginAt)
    `).run(user);
  }

  public static saveAllUsers(users: StoredUserAccount[]): void {
    const db = DatabaseManager.getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, role, password_hash, password_salt, overlay_token, created_at, last_login_at)
      VALUES (@id, @username, @email, @role, @passwordHash, @passwordSalt, @overlayToken, @createdAt, @lastLoginAt)
    `);
    const tx = db.transaction((items: StoredUserAccount[]) => {
      for (const u of items) stmt.run(u);
    });
    tx(users);
  }
}
