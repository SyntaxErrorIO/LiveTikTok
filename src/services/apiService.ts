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
  error?: string;
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
  private sseAbortController: AbortController | null = null;
  private sseConnected: boolean = false;
  private sseListeners: Set<(event: any) => void> = new Set();
  private sseReconnectTimeout: any = null;
  private sseReconnectAttempts: number = 0;
  private authToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('livetrigger_auth_token');
      } catch {}
    }
    this.initSSE();
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    // Re-connect SSE with updated session
    this.initSSE();
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    // Client-side custom CSRF protection header
    if (!headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', '1');
    }
    if (this.authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  }

  public initSSE() {
    if (typeof window === 'undefined') return;

    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }
    if (this.sseReconnectTimeout) {
      clearTimeout(this.sseReconnectTimeout);
      this.sseReconnectTimeout = null;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const overlayToken = urlParams.get('overlayToken');

      let streamUrl = '/api/events/stream';
      // Permite únicamente overlayToken por query para OBS (solo lectura)
      if (!this.authToken && overlayToken) {
        streamUrl += `?overlayToken=${encodeURIComponent(overlayToken)}`;
      }

      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const controller = new AbortController();
      this.sseAbortController = controller;

      const startStream = async () => {
        try {
          const response = await fetch(streamUrl, {
            method: 'GET',
            headers,
            credentials: 'include',
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`SSE stream error: HTTP ${response.status}`);
          }

          if (!response.body) {
            throw new Error('ReadableStream no disponible en respuesta');
          }

          this.sseConnected = true;
          this.sseReconnectAttempts = 0;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
              const trimmed = chunk.trim();
              if (!trimmed || trimmed.startsWith(':')) continue; // Heartbeat comment

              for (const line of trimmed.split('\n')) {
                if (line.startsWith('data:')) {
                  const dataStr = line.replace(/^data:\s*/, '').trim();
                  if (!dataStr) continue;
                  try {
                    const data = JSON.parse(dataStr);
                    this.handleSSEEvent(data);
                  } catch {}
                }
              }
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        } finally {
          this.sseConnected = false;
          if (!controller.signal.aborted) {
            this.sseReconnectAttempts++;
            const backoffDelay = Math.min(30000, 1000 * Math.pow(2, Math.min(this.sseReconnectAttempts - 1, 5)));
            this.sseReconnectTimeout = setTimeout(() => {
              if (!controller.signal.aborted) {
                this.initSSE();
              }
            }, backoffDelay);
          }
        }
      };

      startStream();
    } catch {}
  }

  private handleSSEEvent(data: any) {
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
  }

  public isSseConnected(): boolean {
    return this.sseConnected;
  }

  public async getOverlayState(overlayToken: string): Promise<any> {
    try {
      const res = await fetch(`/api/overlay/state?overlayToken=${encodeURIComponent(overlayToken)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public onSSEMessage(cb: (data: any) => void): () => void {
    this.sseListeners.add(cb);
    return () => this.sseListeners.delete(cb);
  }

  // Rules
  public async getRules(): Promise<AutomationRule[]> {
    try {
      const res = await this.fetchWithAuth('/api/rules');
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.rules)) return data.rules;
      return [];
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

  public async getConnectionWithMeta(): Promise<{
    connection: ConnectionConfig | null;
    meta: { eulerStreamConfigured: boolean; directConnectorAvailable: boolean } | null;
  }> {
    try {
      const res = await this.fetchWithAuth('/api/connection');
      const data = await res.json();
      return { connection: data.connection || null, meta: data.meta || null };
    } catch {
      return { connection: null, meta: null };
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
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.counters)) return data.counters;
      return [];
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
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.leaderboard)) return data.leaderboard;
      return [];
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
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.logs)) return data.logs;
      return [];
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
      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.results)) {
        return {
          success: false,
          total: 1,
          passed: 0,
          error: data?.error || (res.status === 403 ? 'Pruebas deshabilitadas en producción o rol de administrador requerido.' : `Error del servidor (${res.status})`),
          results: [{
            test: 'Ejecución de pruebas del servidor',
            status: 'failed',
            details: data?.error || `Error HTTP ${res.status}: Requiere rol de administrador`,
          }],
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        total: 1,
        passed: 0,
        error: err?.message || 'Error de conexión',
        results: [{ test: 'Ejecución de pruebas del servidor', status: 'failed', details: err?.message || 'Error desconocido' }],
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
  public async getRegistrationStatus(): Promise<{ registrationOpen: boolean }> {
    try {
      const res = await fetch('/api/auth/registration-status');
      if (!res.ok) return { registrationOpen: false };
      return await res.json();
    } catch {
      return { registrationOpen: false };
    }
  }

  public async getUsers(): Promise<UserProfile[]> {
    try {
      const res = await this.fetchWithAuth('/api/auth/users');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.users) ? data.users : [];
    } catch {
      return [];
    }
  }

  public async adminRegisterUser(payload: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await this.fetchWithAuth('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al crear usuario.' };
    }
  }

  public async register(payload: { username: string; email: string; password: string }): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '1' },
        credentials: 'include',
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
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '1' },
        credentials: 'include',
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

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': '1' },
        credentials: 'include',
      });
    } catch {}
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
