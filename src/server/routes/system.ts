import { Router, Request, Response } from 'express';
import { StateStore } from '../stateStore';
import { coreEngine } from '../coreEngine';
import { FailSafeManager } from '../failSafeManager';
import { SystemLogger } from '../systemLogger';
import { AutomatedTestRunner } from '../testRunner';
import { AuthManager } from '../authManager';
import { AuthedRequest } from '../types';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Health Check (Public probe for container orchestration)
router.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  const conn = StateStore.getConnection();
  const failSafe = FailSafeManager.getStatus();
  const stats = coreEngine.getStats();
  const mem = process.memoryUsage();

  const status = failSafe.active
    ? 'fail_safe'
    : conn.status === 'error'
    ? 'degraded'
    : 'healthy';

  return res.json({
    status,
    service: 'LiveTrigger AI Automation Engine',
    version: '1.2.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    engine: {
      totalProcessed: stats.totalProcessed,
      queuePending: stats.queuePending,
      totalErrors: stats.totalErrors,
      totalDeduplicated: stats.totalDeduplicated,
    },
    connection: {
      mode: conn.mode,
      status: conn.status,
      lastActivityAt: conn.lastActivityAt,
      errorMessage: conn.errorMessage,
      pingMs: conn.pingMs,
    },
    failSafe,
    storage: {
      status: 'ok',
      type: 'persistent_disk',
    },
  });
});

// Readiness Probe
router.get(['/ready', '/api/ready'], (_req: Request, res: Response) => {
  return res.json({ ready: true, uptime: process.uptime() });
});

// Fail-Safe Status (Security fix: Now strictly requires authenticated session)
router.get('/api/system/fail-safe', requireAuth, (_req: Request, res: Response) => {
  return res.json({ success: true, failSafe: FailSafeManager.getStatus() });
});

// Reset Fail-Safe
router.post('/api/system/fail-safe/reset', requireAuth, (req: Request, res: Response) => {
  const reason = req.body?.reason || 'Restablecimiento manual por el usuario';
  const status = FailSafeManager.reset(reason);
  coreEngine.broadcast({
    type: 'FAIL_SAFE_STATE',
    payload: status,
    timestamp: Date.now(),
  });
  return res.json({ success: true, failSafe: status });
});

// Audit Logs (Admin only)
router.get('/api/system/audit', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ success: true, logs: SystemLogger.getLogs(150) });
});

// Counters
router.get('/api/counters', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  return res.json({ success: true, counters: StateStore.getCounters(authedReq.user!.userId) });
});

router.post('/api/counters/:id/reset', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const counters = StateStore.getCounters(userId);
  const counter = counters.find((c) => c.id === req.params.id);
  if (counter) {
    counter.current = 0;
    counter.lastUpdated = Date.now();
    StateStore.saveCounters(counters, userId);
    coreEngine.broadcast(
      {
        type: 'COUNTERS_UPDATED',
        payload: counters,
        timestamp: Date.now(),
      },
      userId
    );
    return res.json({ success: true, counter });
  }
  return res.status(404).json({ success: false, error: 'Contador no encontrado' });
});

// Leaderboard
router.get('/api/leaderboard', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  return res.json({ success: true, leaderboard: StateStore.getLeaderboard(authedReq.user!.userId) });
});

router.post('/api/leaderboard/reset', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  StateStore.saveLeaderboard([], userId);
  coreEngine.broadcast(
    {
      type: 'LEADERBOARD_UPDATED',
      payload: [],
      timestamp: Date.now(),
    },
    userId
  );
  return res.json({ success: true });
});

// Creator Logs
router.get('/api/logs', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  return res.json({ success: true, logs: StateStore.getLogs(authedReq.user!.userId) });
});

router.delete('/api/logs', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  StateStore.clearLogs(authedReq.user!.userId);
  return res.json({ success: true });
});

// Engine Stats
router.get('/api/engine/stats', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  return res.json({ success: true, stats: coreEngine.getStats(authedReq.user!.userId) });
});

// Settings & Master Switch
router.get('/api/settings', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  return res.json({ success: true, settings: StateStore.getSettings(authedReq.user!.userId) });
});

router.post('/api/settings', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const current = StateStore.getSettings(userId);
  const updated = { ...current, ...req.body };
  StateStore.saveSettings(updated, userId);
  coreEngine.setMasterAutomation(updated.masterAutomationEnabled, userId);

  // Sync goalTargetDiamonds with diamonds counter target in persistent StateStore
  if (req.body.goalTargetDiamonds !== undefined) {
    const target = Math.max(1, Number(req.body.goalTargetDiamonds));
    const counters = StateStore.getCounters(userId);
    const diamondCounter = counters.find(
      (c) => c.name.toLowerCase().includes('diamante') || c.id.toLowerCase().includes('diamond')
    );
    if (diamondCounter) {
      diamondCounter.target = target;
      StateStore.saveCounters(counters, userId);
      coreEngine.broadcast(
        {
          type: 'COUNTERS_UPDATED',
          payload: counters,
          timestamp: Date.now(),
        },
        userId
      );
    }
  }

  return res.json({ success: true, settings: updated });
});

// Read-only overlay state endpoint for OBS Screen synchronization
router.get('/api/overlay/state', (req: Request, res: Response) => {
  const overlayToken = typeof req.query.overlayToken === 'string' ? req.query.overlayToken.trim() : undefined;
  if (!overlayToken) {
    return res.status(400).json({ success: false, error: 'Parámetro overlayToken requerido.' });
  }

  const user = AuthManager.getUserByOverlayToken(overlayToken);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Token de overlay inválido o expirado.' });
  }

  const counters = StateStore.getCounters(user.id);
  const diamondCounter = counters.find(
    (c) => c.name.toLowerCase().includes('diamante') || c.id.toLowerCase().includes('diamond')
  ) || counters[0] || {
    id: 'cnt-diamonds-session',
    name: 'Meta de Diamantes',
    current: 0,
    target: 500,
    unit: 'Diamantes',
    lastUpdated: Date.now(),
  };

  const settings = StateStore.getSettings(user.id);
  const effectiveTarget = settings.goalTargetDiamonds || diamondCounter.target || 500;

  const leaderboard = StateStore.getLeaderboard(user.id);
  const topDonors = leaderboard.slice(0, 5);

  return res.json({
    success: true,
    user: {
      userId: user.id,
      username: user.username,
    },
    goal: {
      id: diamondCounter.id,
      title: diamondCounter.name,
      current: diamondCounter.current || 0,
      target: effectiveTarget,
      unit: diamondCounter.unit || 'Diamantes',
      lastUpdated: diamondCounter.lastUpdated || Date.now(),
    },
    topDonors,
  });
});

router.post('/api/settings/pause', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const { enabled } = req.body;
  coreEngine.setMasterAutomation(Boolean(enabled), userId);
  return res.json({ success: true, enabled: Boolean(enabled) });
});

// Automated Test Suite Runner (Security fix: Admin only and disabled in production)
router.post('/api/tests/run', requireAdmin, async (_req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return res.status(403).json({
      success: false,
      error: 'La ejecución de pruebas automatizadas está deshabilitada en entornos de producción.',
    });
  }

  const result = await AutomatedTestRunner.runAllTests();
  return res.json(result);
});

// Mock Event Simulator Trigger
router.post('/api/tests/mock-event', requireAuth, async (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const { preset } = req.body;
  let mockEvent: any;

  switch (preset) {
    case 'rose':
      mockEvent = {
        type: 'gift',
        user: { username: 'viewer_rose', nickname: 'Rosa Fan', badgeLevel: 5 },
        data: { giftName: 'Rosa', diamondCount: 1, repeatCount: 1, comment: '🌹 Una rosa con cariño' },
      };
      break;
    case 'galaxy':
      mockEvent = {
        type: 'gift',
        user: { username: 'astro_vip', nickname: 'Astro VIP', badgeLevel: 25, isSubscriber: true },
        data: { giftName: 'Galaxia', diamondCount: 1000, repeatCount: 1, comment: '🌌 ¡Galaxia activada!' },
      };
      break;
    case 'lion':
      mockEvent = {
        type: 'gift',
        user: { username: 'king_sponsor', nickname: 'Rey de la Selva', badgeLevel: 40, isSubscriber: true },
        data: { giftName: 'León', diamondCount: 29999, repeatCount: 1, comment: '🦁 Rugido estelar' },
      };
      break;
    case 'universe':
      mockEvent = {
        type: 'gift',
        user: { username: 'legend_whale', nickname: 'Lord Universo', badgeLevel: 50, isSubscriber: true },
        data: { giftName: 'Universo', diamondCount: 34999, repeatCount: 1, comment: '🪐 ¡El Universo entero!' },
      };
      break;
    case 'comment_hype':
      mockEvent = {
        type: 'comment',
        user: { username: 'hype_master', nickname: 'Hype Master', badgeLevel: 12 },
        data: { comment: '!alerta ¡Directo épico hoy!' },
      };
      break;
    case 'likes':
      mockEvent = {
        type: 'like',
        user: { username: 'tap_tap_hero', nickname: 'Tapper', badgeLevel: 8 },
        data: { likeCount: 50 },
      };
      break;
    default:
      mockEvent = req.body.event || {
        type: 'gift',
        user: { username: 'tester', nickname: 'Tester' },
        data: { giftName: 'Rosa', diamondCount: 1, repeatCount: 1 },
      };
  }

  const result = await coreEngine.ingestRawEvent(mockEvent, 'simulation', user.userId);
  return res.json({ success: result.accepted, result, preset });
});

export default router;
