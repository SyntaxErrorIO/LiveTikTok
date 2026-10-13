import {
  AutomationRule,
  OverlayEffect,
  AppSettings,
  ConnectionConfig,
  StreamCounter,
  LeaderboardEntry,
} from '../../types';

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
