import fs from 'fs';
import path from 'path';
import DatabaseConstructor, { Database } from 'better-sqlite3';
import {
  AutomationRule,
  OverlayEffect,
  AppSettings,
  ConnectionConfig,
  ExecutionLog,
  StreamCounter,
  LeaderboardEntry,
} from '../types';
import {
  DEFAULT_RULES,
  DEFAULT_EFFECTS,
  DEFAULT_SETTINGS,
  DEFAULT_CONNECTION,
} from '../services/storageService';
import { SystemLogger } from './systemLogger';

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

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [];

export interface FullBackupSnapshot {
  id: string;
  timestamp: number;
  version: string;
  userId?: string;
  reason: string;
  data: {
    rules: AutomationRule[];
    effects: OverlayEffect[];
    settings: AppSettings;
    connection: ConnectionConfig;
    counters: StreamCounter[];
    leaderboard: LeaderboardEntry[];
  };
}

export interface StoredUserAccount {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'streamer';
  passwordHash: string;
  passwordSalt: string;
  overlayToken: string;
  createdAt: number;
  lastLoginAt: number;
}

export class StateStore {
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

  private static ensureDirs(dataDir: string) {
    const backupsDir = path.resolve(dataDir, 'backups');
    const workspacesDir = path.resolve(dataDir, 'workspaces');
    [dataDir, backupsDir, workspacesDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
      }
    });
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
        if (settings && typeof settings === 'object') {
          const exists = db.prepare('SELECT user_id FROM settings WHERE user_id = ?').get(userId);
          if (!exists) {
            db.prepare('INSERT OR REPLACE INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)').run(
              userId,
              JSON.stringify(settings),
              Date.now()
            );
          }
        }
      } catch {}
    }

    // Connection
    const connFile = path.join(dir, 'connection.json');
    if (fs.existsSync(connFile)) {
      try {
        const conn = JSON.parse(fs.readFileSync(connFile, 'utf-8'));
        if (conn && typeof conn === 'object') {
          const exists = db.prepare('SELECT user_id FROM connection WHERE user_id = ?').get(userId);
          if (!exists) {
            db.prepare('INSERT OR REPLACE INTO connection (user_id, data, updated_at) VALUES (?, ?, ?)').run(
              userId,
              JSON.stringify(conn),
              Date.now()
            );
          }
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

  private static normalizeUserId(userId?: string): string {
    return (!userId || userId === 'default') ? 'default' : userId.trim();
  }

  // Users Entity
  public static getUsers(): StoredUserAccount[] {
    const db = this.getDb();
    const rows = db.prepare(`
      SELECT id, username, email, role,
             password_hash as passwordHash,
             password_salt as passwordSalt,
             overlay_token as overlayToken,
             created_at as createdAt,
             last_login_at as lastLoginAt
      FROM users
      ORDER BY created_at ASC
    `).all() as StoredUserAccount[];
    return rows || [];
  }

  public static saveUser(user: StoredUserAccount): void {
    const db = this.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, role, password_hash, password_salt, overlay_token, created_at, last_login_at)
      VALUES (@id, @username, @email, @role, @passwordHash, @passwordSalt, @overlayToken, @createdAt, @lastLoginAt)
    `).run(user);
  }

  public static saveAllUsers(users: StoredUserAccount[]): void {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, role, password_hash, password_salt, overlay_token, created_at, last_login_at)
      VALUES (@id, @username, @email, @role, @passwordHash, @passwordSalt, @overlayToken, @createdAt, @lastLoginAt)
    `);
    const tx = db.transaction((items: StoredUserAccount[]) => {
      for (const u of items) stmt.run(u);
    });
    tx(users);
  }

  // Rules Entity
  public static getRules(userId?: string): AutomationRule[] {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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

  // Overlay Effects Entity
  public static getEffects(userId?: string): OverlayEffect[] {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    const rows = db.prepare('SELECT data FROM effects WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      this.saveEffects(DEFAULT_EFFECTS, uid);
      return DEFAULT_EFFECTS;
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveEffects(effects: OverlayEffect[], userId?: string): void {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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

  // App Settings Entity
  public static getSettings(userId?: string): AppSettings {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    db.prepare('INSERT OR REPLACE INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)').run(
      uid,
      JSON.stringify(settings),
      Date.now()
    );
  }

  // Connection Entity
  public static getConnection(userId?: string): ConnectionConfig {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    db.prepare('INSERT OR REPLACE INTO connection (user_id, data, updated_at) VALUES (?, ?, ?)').run(
      uid,
      JSON.stringify(conn),
      Date.now()
    );
  }

  // Counters Entity
  public static getCounters(userId?: string): StreamCounter[] {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    const rows = db.prepare('SELECT data FROM counters WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      this.saveCounters(DEFAULT_COUNTERS, uid);
      return DEFAULT_COUNTERS;
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveCounters(counters: StreamCounter[], userId?: string): void {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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

  // Leaderboard Entity
  public static getLeaderboard(userId?: string): LeaderboardEntry[] {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    const rows = db.prepare('SELECT data FROM leaderboard WHERE user_id = ?').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      return [];
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveLeaderboard(leaderboard: LeaderboardEntry[], userId?: string): void {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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

  // Logs Entity
  public static getLogs(userId?: string): ExecutionLog[] {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    const rows = db.prepare('SELECT data FROM logs WHERE user_id = ? ORDER BY timestamp DESC').all(uid) as { data: string }[];
    if (!rows || rows.length === 0) {
      return [];
    }
    return rows.map((r) => JSON.parse(r.data));
  }

  public static saveLogs(logs: ExecutionLog[], userId?: string): void {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
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
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    const ins = db.prepare('INSERT OR REPLACE INTO logs (id, user_id, data, timestamp) VALUES (?, ?, ?, ?)');
    ins.run(log.id, uid, JSON.stringify(log), log.eventTimestamp || Date.now());

    // Prune logs exceeding limit
    db.prepare(`
      DELETE FROM logs
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
      )
    `).run(uid, uid, limit);

    return this.getLogs(userId);
  }

  public static clearLogs(userId?: string): void {
    const uid = this.normalizeUserId(userId);
    const db = this.getDb();
    db.prepare('DELETE FROM logs WHERE user_id = ?').run(uid);
  }

  // -------------------------------------------------------------
  // BACKUPS, SNAPSHOTS & RESTORE
  // -------------------------------------------------------------
  public static createSnapshot(userId?: string, reason: string = 'Respaldo manual'): FullBackupSnapshot {
    const backupsDir = this.getBackupsDirectory();
    const uid = this.normalizeUserId(userId);
    const snapshot: FullBackupSnapshot = {
      id: 'snap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      version: '2.0.0-sqlite',
      userId: uid,
      reason,
      data: {
        rules: this.getRules(userId),
        effects: this.getEffects(userId),
        settings: this.getSettings(userId),
        connection: this.getConnection(userId),
        counters: this.getCounters(userId),
        leaderboard: this.getLeaderboard(userId),
      },
    };

    const fileName = `snapshot_${snapshot.id}_${Date.now()}.json`;
    const filePath = path.join(backupsDir, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      SystemLogger.info('BACKUP', `Copia de seguridad creada en SQLite: ${snapshot.id}`, {
        userId,
        details: { reason, fileName },
      });
    } catch {}

    return snapshot;
  }

  public static listSnapshots(
    userId?: string,
    isAdmin: boolean = false
  ): { id: string; timestamp: number; reason: string; fileName: string; sizeBytes: number; userId?: string }[] {
    const backupsDir = this.getBackupsDirectory();
    try {
      const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.json'));
      const list = files
        .map((f) => {
          const fullPath = path.join(backupsDir, f);
          const stat = fs.statSync(fullPath);
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const parsed = JSON.parse(raw) as FullBackupSnapshot;
            return {
              id: parsed.id || f.replace('.json', ''),
              timestamp: parsed.timestamp || stat.mtimeMs,
              reason: parsed.reason || 'Snapshot automático',
              fileName: f,
              sizeBytes: stat.size,
              userId: parsed.userId,
            };
          } catch {
            return {
              id: f.replace('.json', ''),
              timestamp: stat.mtimeMs,
              reason: 'Archivo de respaldo',
              fileName: f,
              sizeBytes: stat.size,
              userId: undefined,
            };
          }
        })
        .filter((item) => {
          if (isAdmin) return true;
          if (!userId) return false;
          return item.userId === userId || item.userId === this.normalizeUserId(userId);
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      return list;
    } catch {
      return [];
    }
  }

  public static restoreSnapshot(fileName: string, userId?: string, isAdmin: boolean = false): boolean {
    const backupsDir = this.getBackupsDirectory();
    const safeName = path.basename(fileName);
    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) return false;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as FullBackupSnapshot;
      if (!parsed.data) return false;

      // Ensure snapshot belongs to caller unless caller is admin
      if (!isAdmin && parsed.userId && parsed.userId !== userId && parsed.userId !== this.normalizeUserId(userId)) {
        SystemLogger.warn('SECURITY', `Intento no autorizado de restaurar snapshot de otro usuario: ${safeName}`, {
          userId,
          details: { snapshotOwner: parsed.userId },
        });
        return false;
      }

      if (Array.isArray(parsed.data.rules)) this.saveRules(parsed.data.rules, userId);
      if (Array.isArray(parsed.data.effects)) this.saveEffects(parsed.data.effects, userId);
      if (parsed.data.settings) this.saveSettings(parsed.data.settings, userId);
      if (parsed.data.connection) this.saveConnection(parsed.data.connection, userId);
      if (Array.isArray(parsed.data.counters)) this.saveCounters(parsed.data.counters, userId);
      if (Array.isArray(parsed.data.leaderboard)) this.saveLeaderboard(parsed.data.leaderboard, userId);

      SystemLogger.info('BACKUP', `Copia de seguridad restaurada exitosamente en SQLite: ${safeName}`, {
        userId,
        details: { snapshotId: parsed.id },
      });
      return true;
    } catch {
      return false;
    }
  }

  public static exportFullConfigJson(userId?: string): string {
    const data = {
      version: '2.0.0-sqlite',
      exportedAt: Date.now(),
      userId: userId || 'default',
      rules: this.getRules(userId),
      effects: this.getEffects(userId),
      settings: this.getSettings(userId),
      connection: this.getConnection(userId),
      counters: this.getCounters(userId),
      leaderboard: this.getLeaderboard(userId),
    };
    return JSON.stringify(data, null, 2);
  }

  public static importFullConfigJson(jsonStr: string, userId?: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') return false;

      // Auto-snapshot previous state before applying import
      this.createSnapshot(userId, 'Snapshot previo a importación JSON (SQLite)');

      if (Array.isArray(parsed.rules)) this.saveRules(parsed.rules, userId);
      if (Array.isArray(parsed.effects)) this.saveEffects(parsed.effects, userId);
      if (parsed.settings && typeof parsed.settings === 'object') this.saveSettings(parsed.settings, userId);
      if (parsed.connection && typeof parsed.connection === 'object') this.saveConnection(parsed.connection, userId);
      if (Array.isArray(parsed.counters)) this.saveCounters(parsed.counters, userId);
      if (Array.isArray(parsed.leaderboard)) this.saveLeaderboard(parsed.leaderboard, userId);

      SystemLogger.info('BACKUP', 'Configuración importada mediante JSON a SQLite con snapshot previo', {
        userId,
      });
      return true;
    } catch {
      return false;
    }
  }
}
