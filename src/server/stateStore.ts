import fs from 'fs';
import path from 'path';
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const WORKSPACES_DIR = path.resolve(DATA_DIR, 'workspaces');

export const DEFAULT_COUNTERS: StreamCounter[] = [
  {
    id: 'cnt-roses-goal',
    name: 'Meta de Rosas del Directo',
    current: 42,
    target: 100,
    unit: 'Rosas',
    lastUpdated: Date.now(),
  },
  {
    id: 'cnt-diamonds-session',
    name: 'Diamantes Acumulados',
    current: 2450,
    target: 10000,
    unit: 'Diamantes',
    lastUpdated: Date.now(),
  },
  {
    id: 'cnt-likes-rush',
    name: 'Ráfaga de Likes Comunitarios',
    current: 15400,
    target: 50000,
    unit: 'Taps',
    lastUpdated: Date.now(),
  },
];

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: 'usr-carlos_pro',
    username: 'carlos_pro',
    nickname: 'Carlos El León',
    points: 2500,
    giftsCount: 14,
    lastUpdated: Date.now() - 3600000,
  },
  {
    userId: 'usr-mariana_stream',
    username: 'mariana_stream',
    nickname: 'Mariana VIP',
    points: 1200,
    giftsCount: 8,
    lastUpdated: Date.now() - 7200000,
  },
  {
    userId: 'usr-david_gamer',
    username: 'david_gamer',
    nickname: 'David 🎮',
    points: 600,
    giftsCount: 22,
    lastUpdated: Date.now() - 10800000,
  },
];

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

export class StateStore {
  private static ensureDirs() {
    [DATA_DIR, BACKUPS_DIR, WORKSPACES_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
    });
  }

  private static getWorkspaceDir(userId?: string): string {
    this.ensureDirs();
    if (!userId || userId === 'default') {
      return DATA_DIR;
    }
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const userDir = path.join(WORKSPACES_DIR, safeUser);
    if (!fs.existsSync(userDir)) {
      try {
        fs.mkdirSync(userDir, { recursive: true });
        // If migrating admin or creating initial user, seed with defaults or root data if available
        if (userId === 'usr-admin-primary') {
          const files = ['rules.json', 'effects.json', 'settings.json', 'connection.json', 'counters.json', 'leaderboard.json'];
          for (const f of files) {
            const rootFile = path.join(DATA_DIR, f);
            const userFile = path.join(userDir, f);
            if (fs.existsSync(rootFile) && !fs.existsSync(userFile)) {
              try { fs.copyFileSync(rootFile, userFile); } catch {}
            }
          }
        }
      } catch {}
    }
    return userDir;
  }

  private static readFileSafe<T>(filename: string, fallback: T, userId?: string): T {
    this.ensureDirs();
    const dir = this.getWorkspaceDir(userId);
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      this.writeFileSafe(filename, fallback, userId);
      return fallback;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  private static writeFileSafe<T>(filename: string, data: T, userId?: string): void {
    this.ensureDirs();
    const dir = this.getWorkspaceDir(userId);
    const filePath = path.join(dir, filename);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
  }

  // Rules
  public static getRules(userId?: string): AutomationRule[] {
    return this.readFileSafe<AutomationRule[]>('rules.json', DEFAULT_RULES, userId);
  }

  public static saveRules(rules: AutomationRule[], userId?: string): void {
    this.writeFileSafe('rules.json', rules, userId);
  }

  // Overlay Effects
  public static getEffects(userId?: string): OverlayEffect[] {
    return this.readFileSafe<OverlayEffect[]>('effects.json', DEFAULT_EFFECTS, userId);
  }

  public static saveEffects(effects: OverlayEffect[], userId?: string): void {
    this.writeFileSafe('effects.json', effects, userId);
  }

  // App Settings
  public static getSettings(userId?: string): AppSettings {
    return this.readFileSafe<AppSettings>('settings.json', DEFAULT_SETTINGS, userId);
  }

  public static saveSettings(settings: AppSettings, userId?: string): void {
    this.writeFileSafe('settings.json', settings, userId);
  }

  // Connection
  public static getConnection(userId?: string): ConnectionConfig {
    return this.readFileSafe<ConnectionConfig>('connection.json', DEFAULT_CONNECTION, userId);
  }

  public static saveConnection(conn: ConnectionConfig, userId?: string): void {
    this.writeFileSafe('connection.json', conn, userId);
  }

  // Counters
  public static getCounters(userId?: string): StreamCounter[] {
    return this.readFileSafe<StreamCounter[]>('counters.json', DEFAULT_COUNTERS, userId);
  }

  public static saveCounters(counters: StreamCounter[], userId?: string): void {
    this.writeFileSafe('counters.json', counters, userId);
  }

  // Leaderboard
  public static getLeaderboard(userId?: string): LeaderboardEntry[] {
    return this.readFileSafe<LeaderboardEntry[]>('leaderboard.json', DEFAULT_LEADERBOARD, userId);
  }

  public static saveLeaderboard(leaderboard: LeaderboardEntry[], userId?: string): void {
    this.writeFileSafe('leaderboard.json', leaderboard, userId);
  }

  // Execution Logs
  public static getLogs(userId?: string): ExecutionLog[] {
    return this.readFileSafe<ExecutionLog[]>('logs.json', [], userId);
  }

  public static saveLogs(logs: ExecutionLog[], userId?: string): void {
    this.writeFileSafe('logs.json', logs, userId);
  }

  public static addLog(log: ExecutionLog, limit: number = 500, userId?: string): ExecutionLog[] {
    const logs = this.getLogs(userId);
    const updated = [log, ...logs].slice(0, limit);
    this.saveLogs(updated, userId);
    return updated;
  }

  public static clearLogs(userId?: string): void {
    this.saveLogs([], userId);
  }

  // -------------------------------------------------------------
  // BACKUPS, SNAPSHOTS & RESTORE
  // -------------------------------------------------------------
  public static createSnapshot(userId?: string, reason: string = 'Respaldo manual'): FullBackupSnapshot {
    this.ensureDirs();
    const snapshot: FullBackupSnapshot = {
      id: 'snap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      version: '1.2.0',
      userId: userId || 'default',
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
    const filePath = path.join(BACKUPS_DIR, fileName);

    try {
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      SystemLogger.info('BACKUP', `Copia de seguridad creada: ${snapshot.id}`, {
        userId,
        details: { reason, fileName },
      });
    } catch {}

    return snapshot;
  }

  public static listSnapshots(userId?: string, isAdmin: boolean = false): { id: string; timestamp: number; reason: string; fileName: string; sizeBytes: number; userId?: string }[] {
    this.ensureDirs();
    try {
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      const list = files
        .map((f) => {
          const fullPath = path.join(BACKUPS_DIR, f);
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
          return item.userId === userId;
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      return list;
    } catch {
      return [];
    }
  }

  public static restoreSnapshot(fileName: string, userId?: string, isAdmin: boolean = false): boolean {
    this.ensureDirs();
    const safeName = path.basename(fileName);
    const filePath = path.join(BACKUPS_DIR, safeName);

    if (!fs.existsSync(filePath)) return false;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as FullBackupSnapshot;
      if (!parsed.data) return false;

      // Ensure snapshot belongs to caller unless caller is admin
      if (!isAdmin && parsed.userId && parsed.userId !== userId) {
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

      SystemLogger.info('BACKUP', `Copia de seguridad restaurada exitosamente: ${safeName}`, {
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
      version: '1.2.0',
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
      this.createSnapshot(userId, 'Snapshot previo a importación JSON');

      if (Array.isArray(parsed.rules)) this.saveRules(parsed.rules, userId);
      if (Array.isArray(parsed.effects)) this.saveEffects(parsed.effects, userId);
      if (parsed.settings && typeof parsed.settings === 'object') this.saveSettings(parsed.settings, userId);
      if (parsed.connection && typeof parsed.connection === 'object') this.saveConnection(parsed.connection, userId);
      if (Array.isArray(parsed.counters)) this.saveCounters(parsed.counters, userId);
      if (Array.isArray(parsed.leaderboard)) this.saveLeaderboard(parsed.leaderboard, userId);

      SystemLogger.info('BACKUP', 'Configuración importada mediante JSON con snapshot de seguridad previo', {
        userId,
      });
      return true;
    } catch {
      return false;
    }
  }
}
