import { Database } from 'better-sqlite3';
import {
  AutomationRule,
  OverlayEffect,
  AppSettings,
  ConnectionConfig,
  ExecutionLog,
  StreamCounter,
  LeaderboardEntry,
} from '../types';
import type {
  StoredUserAccount,
  FullBackupSnapshot,
} from './db';
import {
  DEFAULT_COUNTERS,
  DEFAULT_LEADERBOARD,
  DatabaseManager,
  UsersRepository,
  RulesRepository,
  EffectsRepository,
  SettingsRepository,
  CountersRepository,
  LeaderboardRepository,
  LogsRepository,
  BackupsRepository,
  GamesRepository,
} from './db';

export {
  DEFAULT_COUNTERS,
  DEFAULT_LEADERBOARD,
};
export type {
  FullBackupSnapshot,
  StoredUserAccount,
};

/**
 * StateStore Facade delegating to entity repositories in src/server/db/
 */
export class StateStore {
  public static getDataDirectory(): string {
    return DatabaseManager.getDataDirectory();
  }

  public static getBackupsDirectory(): string {
    return DatabaseManager.getBackupsDirectory();
  }

  public static getDb(): Database {
    return DatabaseManager.getDb();
  }

  // Users Entity
  public static getUsers(): StoredUserAccount[] {
    return UsersRepository.getUsers();
  }

  public static saveUser(user: StoredUserAccount): void {
    UsersRepository.saveUser(user);
  }

  public static saveAllUsers(users: StoredUserAccount[]): void {
    UsersRepository.saveAllUsers(users);
  }

  // Rules Entity
  public static getRules(userId?: string): AutomationRule[] {
    return RulesRepository.getRules(userId);
  }

  public static saveRules(rules: AutomationRule[], userId?: string): void {
    RulesRepository.saveRules(rules, userId);
  }

  // Overlay Effects Entity
  public static getEffects(userId?: string): OverlayEffect[] {
    return EffectsRepository.getEffects(userId);
  }

  public static saveEffects(effects: OverlayEffect[], userId?: string): void {
    EffectsRepository.saveEffects(effects, userId);
  }

  // Settings & Connection Entity
  public static getSettings(userId?: string): AppSettings {
    return SettingsRepository.getSettings(userId);
  }

  public static saveSettings(settings: AppSettings, userId?: string): void {
    SettingsRepository.saveSettings(settings, userId);
  }

  public static getConnection(userId?: string): ConnectionConfig {
    return SettingsRepository.getConnection(userId);
  }

  public static saveConnection(conn: ConnectionConfig, userId?: string): void {
    SettingsRepository.saveConnection(conn, userId);
  }

  // Games Config Entity (Interactive Live Games: Street Food Rush, Boss Battle, etc.)
  public static getGameConfig(userId?: string): any {
    return GamesRepository.getGameConfig(userId);
  }

  public static saveGameConfig(config: any, userId?: string): void {
    GamesRepository.saveGameConfig(config, userId);
  }

  // Counters Entity
  public static getCounters(userId?: string): StreamCounter[] {
    return CountersRepository.getCounters(userId);
  }

  public static saveCounters(counters: StreamCounter[], userId?: string): void {
    CountersRepository.saveCounters(counters, userId);
  }

  // Leaderboard Entity
  public static getLeaderboard(userId?: string): LeaderboardEntry[] {
    return LeaderboardRepository.getLeaderboard(userId);
  }

  public static saveLeaderboard(leaderboard: LeaderboardEntry[], userId?: string): void {
    LeaderboardRepository.saveLeaderboard(leaderboard, userId);
  }

  // Execution & Audit Logs Entity
  public static getLogs(userId?: string): ExecutionLog[] {
    return LogsRepository.getLogs(userId);
  }

  public static saveLogs(logs: ExecutionLog[], userId?: string): void {
    LogsRepository.saveLogs(logs, userId);
  }

  public static addLog(log: ExecutionLog, limit: number = 500, userId?: string): ExecutionLog[] {
    return LogsRepository.addLog(log, limit, userId);
  }

  public static clearLogs(userId?: string): void {
    LogsRepository.clearLogs(userId);
  }

  public static getAuditLogs(): any[] {
    return LogsRepository.getAuditLogs();
  }

  public static addAuditLog(entry: any): void {
    LogsRepository.addAuditLog(entry);
  }

  // Backups, Snapshots & Config Import/Export
  public static createSnapshot(userId?: string, reason: string = 'Respaldo manual'): FullBackupSnapshot {
    return BackupsRepository.createSnapshot(userId, reason);
  }

  public static listSnapshots(
    userId?: string,
    isAdmin: boolean = false
  ): { id: string; timestamp: number; reason: string; fileName: string; sizeBytes: number; userId?: string }[] {
    return BackupsRepository.listSnapshots(userId, isAdmin);
  }

  public static restoreSnapshot(fileName: string, userId?: string, isAdmin: boolean = false): boolean {
    return BackupsRepository.restoreSnapshot(fileName, userId, isAdmin);
  }

  public static exportFullConfigJson(userId?: string): string {
    return BackupsRepository.exportFullConfigJson(userId);
  }

  public static importFullConfigJson(jsonStr: string, userId?: string): boolean {
    return BackupsRepository.importFullConfigJson(jsonStr, userId);
  }
}
