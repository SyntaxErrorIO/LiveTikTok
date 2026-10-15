import fs from 'fs';
import path from 'path';
import DatabaseConstructor, { Database } from 'better-sqlite3';
import { AutomationRule, OverlayEffect, AppSettings, ConnectionConfig, StreamCounter, LeaderboardEntry, ExecutionLog } from '../../types';
import { StoredUserAccount } from './types';
import { SystemLogger } from '../systemLogger';

export class DatabaseManager {
  private static dbInstance: Database | null = null;
  private static currentDbPath: string = '';

  public static getDataDirectory(): string {
    const dataDir = process.env.DATA_DIR?.trim()
      ? path.resolve(process.env.DATA_DIR.trim())
      : path.resolve(process.cwd(), 'data');
    this.ensureDirs(dataDir);
    return dataDir;
  }

  public static getBackupsDirectory(): string {
    const dataDir = this.getDataDirectory();
    const backupsDir = path.resolve(dataDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      try { fs.mkdirSync(backupsDir, { recursive: true }); } catch {}
    }
    return backupsDir;
  }

  public static ensureDirs(dataDir: string) {
    const backupsDir = path.resolve(dataDir, 'backups');
    const workspacesDir = path.resolve(dataDir, 'workspaces');
    [dataDir, backupsDir, workspacesDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      }
    });
  }

  public static normalizeUserId(userId?: string): string {
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || userId === 'default') {
      return 'default';
    }
    return userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  public static getDb(): Database {
    const dataDir = this.getDataDirectory();
    const dbPath = path.resolve(dataDir, 'livetrigger.db');

    if (!this.dbInstance || this.currentDbPath !== dbPath) {
      if (this.dbInstance) {
        try { this.dbInstance.close(); } catch {}
      }
      this.dbInstance = new DatabaseConstructor(dbPath);
      this.currentDbPath = dbPath;
      this.initSchemaAndMigrate(this.dbInstance, dataDir);
    }
    return this.dbInstance;
  }

  private static initSchemaAndMigrate(db: Database, dataDir: string) {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        role TEXT,
        password_hash TEXT,
        password_salt TEXT,
        overlay_token TEXT UNIQUE,
        created_at INTEGER,
        last_login_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS rules (
        id TEXT,
        user_id TEXT,
        data TEXT,
        updated_at INTEGER,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS effects (
        id TEXT,
        user_id TEXT,
        data TEXT,
        updated_at INTEGER,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        data TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS connection (
        user_id TEXT PRIMARY KEY,
        data TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS counters (
        id TEXT,
        user_id TEXT,
        data TEXT,
        updated_at INTEGER,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        user_id TEXT,
        username TEXT,
        data TEXT,
        updated_at INTEGER,
        PRIMARY KEY (user_id, username)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT,
        user_id TEXT,
        data TEXT,
        timestamp INTEGER,
        PRIMARY KEY (user_id, id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS games_config (
        user_id TEXT PRIMARY KEY,
        data TEXT,
        updated_at INTEGER
      );
    `);

    // Automatic migration from existing JSON files in DATA_DIR
    this.migrateJsonFiles(db, dataDir);
  }

  private static migrateJsonFiles(db: Database, dataDir: string) {
    try {
      // 1. Migrate users.json
      const usersFile = path.join(dataDir, 'users.json');
      if (fs.existsSync(usersFile)) {
        try {
          const raw = fs.readFileSync(usersFile, 'utf-8');
          const users: StoredUserAccount[] = JSON.parse(raw);
          if (Array.isArray(users) && users.length > 0) {
            const insertUser = db.prepare(`
              INSERT OR IGNORE INTO users (id, username, email, role, password_hash, password_salt, overlay_token, created_at, last_login_at)
              VALUES (@id, @username, @email, @role, @passwordHash, @passwordSalt, @overlayToken, @createdAt, @lastLoginAt)
            `);
            const runMany = db.transaction((rows: StoredUserAccount[]) => {
              for (const u of rows) {
                insertUser.run(u);
              }
            });
            runMany(users);
          }
        } catch (e: any) {
          SystemLogger.warn('ENGINE', `Aviso durante migración de users.json: ${e.message}`);
        }
      }

      // 2. Migrate root entity files (default user workspace)
      this.migrateWorkspaceDirectory(db, dataDir, 'default');

      // 3. Migrate workspaces directories (DATA_DIR/workspaces/<userId>)
      const workspacesDir = path.join(dataDir, 'workspaces');
      if (fs.existsSync(workspacesDir)) {
        const entries = fs.readdirSync(workspacesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const userDir = path.join(workspacesDir, entry.name);
            this.migrateWorkspaceDirectory(db, userDir, entry.name);
          }
        }
      }
    } catch (err: any) {
      SystemLogger.error('ENGINE', `Error en migración SQLite: ${err.message}`);
    }
  }

  private static migrateWorkspaceDirectory(db: Database, dir: string, userId: string) {
    // Rules
    const rulesFile = path.join(dir, 'rules.json');
    if (fs.existsSync(rulesFile)) {
      try {
        const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
        if (Array.isArray(rules)) {
          const count = db.prepare('SELECT COUNT(*) as cnt FROM rules WHERE user_id = ?').get(userId) as any;
          if (!count || count.cnt === 0) {
            const insert = db.prepare('INSERT OR REPLACE INTO rules (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
            const now = Date.now();
            const tx = db.transaction((items: AutomationRule[]) => {
              for (const r of items) insert.run(r.id, userId, JSON.stringify(r), now);
            });
            tx(rules);
          }
        }
      } catch {}
    }

    // Effects
    const effectsFile = path.join(dir, 'effects.json');
    if (fs.existsSync(effectsFile)) {
      try {
        const effects = JSON.parse(fs.readFileSync(effectsFile, 'utf-8'));
        if (Array.isArray(effects)) {
          const count = db.prepare('SELECT COUNT(*) as cnt FROM effects WHERE user_id = ?').get(userId) as any;
          if (!count || count.cnt === 0) {
            const insert = db.prepare('INSERT OR REPLACE INTO effects (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
            const now = Date.now();
            const tx = db.transaction((items: OverlayEffect[]) => {
              for (const e of items) insert.run(e.id, userId, JSON.stringify(e), now);
            });
            tx(effects);
          }
        }
      } catch {}
    }

    // Settings
    const settingsFile = path.join(dir, 'settings.json');
    if (fs.existsSync(settingsFile)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
        const count = db.prepare('SELECT COUNT(*) as cnt FROM settings WHERE user_id = ?').get(userId) as any;
        if (!count || count.cnt === 0) {
          db.prepare('INSERT OR REPLACE INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)').run(
            userId,
            JSON.stringify(settings),
            Date.now()
          );
        }
      } catch {}
    }

    // Connection
    const connFile = path.join(dir, 'connection.json');
    if (fs.existsSync(connFile)) {
      try {
        const conn = JSON.parse(fs.readFileSync(connFile, 'utf-8'));
        const count = db.prepare('SELECT COUNT(*) as cnt FROM connection WHERE user_id = ?').get(userId) as any;
        if (!count || count.cnt === 0) {
          db.prepare('INSERT OR REPLACE INTO connection (user_id, data, updated_at) VALUES (?, ?, ?)').run(
            userId,
            JSON.stringify(conn),
            Date.now()
          );
        }
      } catch {}
    }

    // Counters
    const countersFile = path.join(dir, 'counters.json');
    if (fs.existsSync(countersFile)) {
      try {
        const counters = JSON.parse(fs.readFileSync(countersFile, 'utf-8'));
        if (Array.isArray(counters)) {
          const count = db.prepare('SELECT COUNT(*) as cnt FROM counters WHERE user_id = ?').get(userId) as any;
          if (!count || count.cnt === 0) {
            const insert = db.prepare('INSERT OR REPLACE INTO counters (id, user_id, data, updated_at) VALUES (?, ?, ?, ?)');
            const now = Date.now();
            const tx = db.transaction((items: StreamCounter[]) => {
              for (const c of items) insert.run(c.id, userId, JSON.stringify(c), now);
            });
            tx(counters);
          }
        }
      } catch {}
    }

    // Leaderboard
    const lbFile = path.join(dir, 'leaderboard.json');
    if (fs.existsSync(lbFile)) {
      try {
        const lb = JSON.parse(fs.readFileSync(lbFile, 'utf-8'));
        if (Array.isArray(lb)) {
          const count = db.prepare('SELECT COUNT(*) as cnt FROM leaderboard WHERE user_id = ?').get(userId) as any;
          if (!count || count.cnt === 0) {
            const insert = db.prepare('INSERT OR REPLACE INTO leaderboard (user_id, username, data, updated_at) VALUES (?, ?, ?, ?)');
            const now = Date.now();
            const tx = db.transaction((items: LeaderboardEntry[]) => {
              for (const item of items) insert.run(userId, item.username, JSON.stringify(item), now);
            });
            tx(lb);
          }
        }
      } catch {}
    }

    // Logs
    const logsFile = path.join(dir, 'logs.json');
    if (fs.existsSync(logsFile)) {
      try {
        const logs = JSON.parse(fs.readFileSync(logsFile, 'utf-8'));
        if (Array.isArray(logs)) {
          const count = db.prepare('SELECT COUNT(*) as cnt FROM logs WHERE user_id = ?').get(userId) as any;
          if (!count || count.cnt === 0) {
            const insert = db.prepare('INSERT OR REPLACE INTO logs (id, user_id, data, timestamp) VALUES (?, ?, ?, ?)');
            const tx = db.transaction((items: ExecutionLog[]) => {
              for (const l of items) insert.run(l.id, userId, JSON.stringify(l), l.eventTimestamp || Date.now());
            });
            tx(logs);
          }
        }
      } catch {}
    }
  }
}
