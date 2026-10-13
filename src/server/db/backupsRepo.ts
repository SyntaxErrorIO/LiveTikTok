import fs from 'fs';
import path from 'path';
import { FullBackupSnapshot } from './types';
import { DatabaseManager } from './database';
import { RulesRepository } from './rulesRepo';
import { EffectsRepository } from './effectsRepo';
import { SettingsRepository } from './settingsRepo';
import { CountersRepository } from './countersRepo';
import { LeaderboardRepository } from './leaderboardRepo';
import { SystemLogger } from '../systemLogger';

export class BackupsRepository {
  public static createSnapshot(userId?: string, reason: string = 'Respaldo manual'): FullBackupSnapshot {
    const backupsDir = DatabaseManager.getBackupsDirectory();
    const uid = DatabaseManager.normalizeUserId(userId);
    const snapshot: FullBackupSnapshot = {
      id: 'snap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      version: '2.0.0-sqlite',
      userId: uid,
      reason,
      data: {
        rules: RulesRepository.getRules(userId),
        effects: EffectsRepository.getEffects(userId),
        settings: SettingsRepository.getSettings(userId),
        connection: SettingsRepository.getConnection(userId),
        counters: CountersRepository.getCounters(userId),
        leaderboard: LeaderboardRepository.getLeaderboard(userId),
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
    const backupsDir = DatabaseManager.getBackupsDirectory();
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
          return item.userId === userId || item.userId === DatabaseManager.normalizeUserId(userId);
        })
        .sort((a, b) => b.timestamp - a.timestamp);
      return list;
    } catch {
      return [];
    }
  }

  public static restoreSnapshot(fileName: string, userId?: string, isAdmin: boolean = false): boolean {
    const backupsDir = DatabaseManager.getBackupsDirectory();
    const safeName = path.basename(fileName);
    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) return false;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as FullBackupSnapshot;
      if (!parsed.data) return false;

      // Ensure snapshot belongs to caller unless caller is admin
      if (!isAdmin && parsed.userId && parsed.userId !== userId && parsed.userId !== DatabaseManager.normalizeUserId(userId)) {
        SystemLogger.warn('SECURITY', `Intento no autorizado de restaurar snapshot de otro usuario: ${safeName}`, {
          userId,
          details: { snapshotOwner: parsed.userId },
        });
        return false;
      }

      if (Array.isArray(parsed.data.rules)) RulesRepository.saveRules(parsed.data.rules, userId);
      if (Array.isArray(parsed.data.effects)) EffectsRepository.saveEffects(parsed.data.effects, userId);
      if (parsed.data.settings) SettingsRepository.saveSettings(parsed.data.settings, userId);
      if (parsed.data.connection) SettingsRepository.saveConnection(parsed.data.connection, userId);
      if (Array.isArray(parsed.data.counters)) CountersRepository.saveCounters(parsed.data.counters, userId);
      if (Array.isArray(parsed.data.leaderboard)) LeaderboardRepository.saveLeaderboard(parsed.data.leaderboard, userId);

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
      rules: RulesRepository.getRules(userId),
      effects: EffectsRepository.getEffects(userId),
      settings: SettingsRepository.getSettings(userId),
      connection: SettingsRepository.getConnection(userId),
      counters: CountersRepository.getCounters(userId),
      leaderboard: LeaderboardRepository.getLeaderboard(userId),
    };
    return JSON.stringify(data, null, 2);
  }

  public static importFullConfigJson(jsonStr: string, userId?: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') return false;

      // Auto-snapshot previous state before applying import
      this.createSnapshot(userId, 'Snapshot previo a importación JSON (SQLite)');

      if (Array.isArray(parsed.rules)) RulesRepository.saveRules(parsed.rules, userId);
      if (Array.isArray(parsed.effects)) EffectsRepository.saveEffects(parsed.effects, userId);
      if (parsed.settings && typeof parsed.settings === 'object') SettingsRepository.saveSettings(parsed.settings, userId);
      if (parsed.connection && typeof parsed.connection === 'object') SettingsRepository.saveConnection(parsed.connection, userId);
      if (Array.isArray(parsed.counters)) CountersRepository.saveCounters(parsed.counters, userId);
      if (Array.isArray(parsed.leaderboard)) LeaderboardRepository.saveLeaderboard(parsed.leaderboard, userId);

      SystemLogger.info('BACKUP', 'Configuración importada mediante JSON a SQLite con snapshot previo', {
        userId,
      });
      return true;
    } catch {
      return false;
    }
  }
}
