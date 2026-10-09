import {
  AutomationRule,
  ConnectionConfig,
  EngineStats,
  ExecutionLog,
  LeaderboardEntry,
  StreamCounter,
  AppSettings,
  TikTokEvent,
} from '../types';
import { eventBus } from './eventBus';

export interface TestSuiteResult {
  success: boolean;
  total: number;
  passed: number;
  results: { test: string; status: 'passed' | 'failed'; details: string }[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'streamer';
  overlayToken: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'fail_safe';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  engine: { totalProcessed: number; queuePending: number; totalErrors: number; totalDeduplicated: number };
  connection: { mode: string; status: string; lastActivityAt: number; errorMessage?: string; pingMs?: number };
  failSafe: { active: boolean; reason: string | null; triggeredAt: number | null; source: string | null };
  storage: { status: string; type: string };
}

class ApiService {
  private eventSource: EventSource | null = null;
  private sseConnected: boolean = false;
  private sseListeners: Set<(event: any) => void> = new Set();
  private authToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('livetrigger_auth_token');
    }
    this.initSSE();
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('livetrigger_auth_token', token);
      } else {
        localStorage.removeItem('livetrigger_auth_token');
      }
    }
    // Re-connect SSE with authenticated token
    this.initSSE();
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (this.authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }
    return fetch(url, { ...options, headers });
  }

  public initSSE() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const overlayToken = urlParams.get('token') || urlParams.get('overlayToken');

      let streamUrl = '/api/events/stream';
      if (this.authToken) {
        streamUrl += `?token=${encodeURIComponent(this.authToken)}`;
      } else if (overlayToken) {
        streamUrl += `?overlayToken=${encodeURIComponent(overlayToken)}`;
      }

      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.sseConnected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'TRIGGER_ACTION') {
            const p = data.payload;
            if (p.actionType === 'overlay_effect') {
              eventBus.broadcast({
                type: 'TRIGGER_OVERLAY',
                payload: {
                  effect: p.effect,
                  event: p.event,
                  formattedTitle: p.formattedTitle,
                  formattedSubtitle: p.formattedSubtitle,
                  ttsVoiceText: p.ttsVoiceText,
                  timestamp: data.timestamp,
                },
              });
            }
          } else if (data.type === 'TIKTOK_EVENT') {
            eventBus.broadcast({
              type: 'TIKTOK_EVENT_RECEIVED',
              payload: data.payload,
            });
          }

          this.sseListeners.forEach((cb) => cb(data));
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.sseConnected = false;
      };
    } catch {}
  }

  public onSSEMessage(cb: (data: any) => void): () => void {
    this.sseListeners.add(cb);
    return () => this.sseListeners.delete(cb);
  }

  // Rules
  public async getRules(): Promise<AutomationRule[]> {
    try {
      const res = await this.fetchWithAuth('/api/rules');
      const data = await res.json();
      return data.rules || [];
    } catch {
      return [];
    }
  }

  public async saveRule(rule: AutomationRule): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async deleteRule(id: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/api/rules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async toggleRule(id: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/api/rules/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // Connection
  public async getConnection(): Promise<ConnectionConfig | null> {
    try {
      const res = await this.fetchWithAuth('/api/connection');
      const data = await res.json();
      return data.connection || null;
    } catch {
      return null;
    }
  }

  public async saveConnectionConfig(config: Partial<ConnectionConfig>): Promise<ConnectionConfig | null> {
    try {
      const res = await this.fetchWithAuth('/api/connection/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      return data.connection || null;
    } catch {
      return null;
    }
  }

  public async setConnectionMode(mode: 'simulation' | 'real_tiktok'): Promise<ConnectionConfig | null> {
    try {
      const res = await this.fetchWithAuth('/api/connection/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      return data.connection || null;
    } catch {
      return null;
    }
  }

  public async connect(): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/connection/connect', { method: 'POST' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async disconnect(): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/connection/disconnect', { method: 'POST' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // Counters
  public async getCounters(): Promise<StreamCounter[]> {
    try {
      const res = await this.fetchWithAuth('/api/counters');
      const data = await res.json();
      return data.counters || [];
    } catch {
      return [];
    }
  }

  public async resetCounter(id: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/api/counters/${id}/reset`, { method: 'POST' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // Leaderboard
  public async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await this.fetchWithAuth('/api/leaderboard');
      const data = await res.json();
      return data.leaderboard || [];
    } catch {
      return [];
    }
  }

  public async resetLeaderboard(): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/leaderboard/reset', { method: 'POST' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // Logs
  public async getLogs(): Promise<ExecutionLog[]> {
    try {
      const res = await this.fetchWithAuth('/api/logs');
      const data = await res.json();
      return data.logs || [];
    } catch {
      return [];
    }
  }

  public async clearLogs(): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  // Settings & Engine Stats
  public async getSettings(): Promise<AppSettings | null> {
    try {
      const res = await this.fetchWithAuth('/api/settings');
      const data = await res.json();
      return data.settings || null;
    } catch {
      return null;
    }
  }

  public async saveSettings(settings: AppSettings): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async toggleMasterAutomation(enabled: boolean): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/settings/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async getEngineStats(): Promise<EngineStats | null> {
    try {
      const res = await this.fetchWithAuth('/api/engine/stats');
      const data = await res.json();
      return data.stats || null;
    } catch {
      return null;
    }
  }

  // Simulate event via backend engine
  public async simulateEvent(rawEvent: any): Promise<any> {
    try {
      const res = await this.fetchWithAuth('/api/events/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawEvent),
      });
      return await res.json();
    } catch (err: any) {
      return { accepted: false, reason: err.message };
    }
  }

  // Automated Tests Runner
  public async runAutomatedTests(): Promise<TestSuiteResult> {
    try {
      const res = await this.fetchWithAuth('/api/tests/run', { method: 'POST' });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        total: 1,
        passed: 0,
        results: [{ test: 'Ejecución de pruebas del servidor', status: 'failed', details: err.message }],
      };
    }
  }

  // Pre-configured Mock Event Dispatcher
  public async triggerMockPresetEvent(preset: 'rose' | 'galaxy' | 'lion' | 'universe' | 'comment_hype' | 'likes'): Promise<any> {
    try {
      const res = await this.fetchWithAuth('/api/tests/mock-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Simulate unexpected connection drop to verify backoff & error logging
  public async simulateProviderDisconnect(reason?: string): Promise<any> {
    try {
      const res = await this.fetchWithAuth('/api/connection/disconnect-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // -------------------------------------------------------------
  // USER AUTHENTICATION & MULTI-ACCOUNT METHODS
  // -------------------------------------------------------------
  public async register(payload: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.token) {
        this.setAuthToken(data.token);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al conectar con el servidor de autenticación.' };
    }
  }

  public async login(identifier: string, password: string): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (data.token) {
        this.setAuthToken(data.token);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red al iniciar sesión.' };
    }
  }

  public async getMe(): Promise<UserProfile | null> {
    try {
      const res = await this.fetchWithAuth('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  public logout() {
    this.setAuthToken(null);
  }

  public async regenerateOverlayToken(): Promise<string | null> {
    try {
      const res = await this.fetchWithAuth('/api/auth/overlay-token/regenerate', { method: 'POST' });
      const data = await res.json();
      return data.overlayToken || null;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------
  // HEALTH & CLOUD MONITORING
  // -------------------------------------------------------------
  public async getHealth(): Promise<SystemHealthReport | null> {
    try {
      const res = await fetch('/health');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async getFailSafe(): Promise<{ active: boolean; reason: string | null; triggeredAt: number | null }> {
    try {
      const res = await fetch('/api/system/fail-safe');
      const data = await res.json();
      return data.failSafe;
    } catch {
      return { active: false, reason: null, triggeredAt: null };
    }
  }

  public async resetFailSafe(reason?: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/system/fail-safe/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async getAuditLogs(): Promise<any[]> {
    try {
      const res = await this.fetchWithAuth('/api/system/audit');
      const data = await res.json();
      return data.logs || [];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------
  // BACKUP & SNAPSHOT MANAGEMENT
  // -------------------------------------------------------------
  public async exportFullBackup(): Promise<string | null> {
    try {
      const res = await this.fetchWithAuth('/api/backup/export');
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  public async importFullBackup(json: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  public async getSnapshots(): Promise<any[]> {
    try {
      const res = await this.fetchWithAuth('/api/backup/snapshots');
      const data = await res.json();
      return data.snapshots || [];
    } catch {
      return [];
    }
  }

  public async createSnapshot(reason?: string): Promise<any> {
    try {
      const res = await this.fetchWithAuth('/api/backup/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  public async restoreSnapshot(fileName: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/api/backup/restore/${encodeURIComponent(fileName)}`, {
        method: 'POST',
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
