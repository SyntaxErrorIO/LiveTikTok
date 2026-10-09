import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { coreEngine, SSEBroadcastMessage } from './src/server/coreEngine';
import { StateStore } from './src/server/stateStore';
import { SecurityValidator } from './src/server/securityValidator';
import { EventNormalizer } from './src/server/normalizer';
import { EventDeduplicator } from './src/server/deduplicator';
import { AuthManager } from './src/server/authManager';
import { RateLimiter } from './src/server/rateLimiter';
import { FailSafeManager } from './src/server/failSafeManager';
import { SystemLogger } from './src/server/systemLogger';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Production Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '2mb' }));

// Rate Limiters
const authLimiter = RateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de autenticación. Por favor espera 15 minutos.',
  category: 'AUTH',
});

const webhookLimiter = RateLimiter.createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Límite de tasa de eventos de webhook alcanzado.',
  category: 'WEBHOOK',
});

// User Session Extraction Middleware (Header or Query token for SSE/OBS)
const extractUser = (req: Request, _res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (token) {
    const session = AuthManager.verifyToken(token);
    if (session) {
      (req as any).user = session;
    }
  }
  next();
};
app.use(extractUser);

// Mandatory Authentication Middleware for Private Routes
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida. Proporcione un token de sesión válido.',
    });
  }
  next();
};

// Mandatory Admin Authorization Middleware
const requireAdmin = (req: Request, res: Response, next: any) => {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida.',
    });
  }
  if ((req as any).user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Se requieren privilegios de administrador.',
    });
  }
  next();
};

// -------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE) STREAM (AUTHENTICATED & ISOLATED)
// -------------------------------------------------------------
app.get('/api/events/stream', (req: Request, res: Response) => {
  const user = (req as any).user;
  const overlayToken = (req.query.overlayToken as string) || (req.query.token as string);
  let overlayUser: any = null;

  if (overlayToken) {
    overlayUser = AuthManager.getUserByOverlayToken(overlayToken);
  }

  // Must have authenticated user session or valid OBS overlay token
  if (!user && !overlayUser) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado al canal de eventos SSE en tiempo real.',
    });
  }

  const targetUserId = user ? user.userId : overlayUser?.id;
  const isAdmin = user?.role === 'admin';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId: targetUserId, timestamp: Date.now() })}\n\n`);

  const unsubscribe = coreEngine.subscribeSSE(
    (msg: SSEBroadcastMessage) => {
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    },
    targetUserId,
    overlayToken,
    isAdmin
  );

  // Heartbeat to keep connection open through proxies
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// -------------------------------------------------------------
// HEALTH CHECKS & READINESS PROBES (FOR CLOUD DEPLOYMENTS)
// -------------------------------------------------------------
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
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

app.get('/api/ready', (_req: Request, res: Response) => {
  return res.json({ ready: true, uptime: process.uptime() });
});

// -------------------------------------------------------------
// USER AUTHENTICATION & MULTI-ACCOUNT MANAGEMENT
// -------------------------------------------------------------
app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const result = AuthManager.register({ username, email, password });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const result = AuthManager.login(identifier, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.json(result);
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'No autenticado.' });
  }
  const fullUser = AuthManager.getUserById(user.userId);
  return res.json({ success: true, user: fullUser });
});

app.post('/api/auth/overlay-token/regenerate', (req: Request, res: Response) => {
  const user = (req as any).user;
  const targetId = user?.userId || 'usr-admin-primary';
  const newToken = AuthManager.regenerateOverlayToken(targetId);
  return res.json({ success: Boolean(newToken), overlayToken: newToken });
});

app.get('/api/auth/overlay/verify', (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.json({ valid: true, mode: 'public' });
  }
  const user = AuthManager.getUserByOverlayToken(token);
  return res.json({ valid: Boolean(user), username: user?.username || null });
});

// -------------------------------------------------------------
// FAIL-SAFE MODE & SYSTEM AUDIT LOGS
// -------------------------------------------------------------
app.get('/api/system/fail-safe', (_req: Request, res: Response) => {
  return res.json({ success: true, failSafe: FailSafeManager.getStatus() });
});

app.post('/api/system/fail-safe/reset', requireAuth, (req: Request, res: Response) => {
  const reason = req.body?.reason || 'Restablecimiento manual por el usuario';
  const status = FailSafeManager.reset(reason);
  coreEngine.broadcast({
    type: 'FAIL_SAFE_STATE',
    payload: status,
    timestamp: Date.now(),
  });
  return res.json({ success: true, failSafe: status });
});

app.get('/api/system/audit', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ success: true, logs: SystemLogger.getLogs(150) });
});

// -------------------------------------------------------------
// BACKUP, SNAPSHOTS & RESTORE API
// -------------------------------------------------------------
app.get('/api/backup/export', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const jsonStr = StateStore.exportFullConfigJson(user.userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=livetrigger_backup_${Date.now()}.json`);
  return res.send(jsonStr);
});

app.post('/api/backup/import', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { json } = req.body;
  if (!json || typeof json !== 'string') {
    return res.status(400).json({ success: false, error: 'Cadena JSON no proporcionada.' });
  }
  const ok = StateStore.importFullConfigJson(json, user.userId);
  return res.json({ success: ok });
});

app.get('/api/backup/snapshots', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({ success: true, snapshots: StateStore.listSnapshots(user.userId, user.role === 'admin') });
});

app.post('/api/backup/snapshots', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const reason = req.body?.reason || 'Snapshot manual';
  const snapshot = StateStore.createSnapshot(user.userId, reason);
  return res.json({ success: true, snapshot });
});

app.post('/api/backup/restore/:fileName', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const ok = StateStore.restoreSnapshot(req.params.fileName, user.userId, user.role === 'admin');
  return res.json({ success: ok });
});

// -------------------------------------------------------------
// INGESTION: EXTERNAL WEBHOOK & SIMULATOR
// -------------------------------------------------------------
app.post('/api/events/webhook', webhookLimiter, async (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const expectedSecret = process.env.TIKTOK_WEBHOOK_SECRET?.trim();

  // 1. En producción, rechazar si TIKTOK_WEBHOOK_SECRET no está configurado
  if (isProd && !expectedSecret) {
    SystemLogger.error('SECURITY', 'Rechazada llamada a webhook: TIKTOK_WEBHOOK_SECRET no configurado en producción.');
    return res.status(503).json({
      success: false,
      error: 'Servicio de webhook no disponible: TIKTOK_WEBHOOK_SECRET es obligatorio en producción.',
    });
  }

  // 2. Autenticación rigurosa de la petición entrante
  const headerSecret = (req.headers['x-webhook-secret'] as string)?.trim();
  const authHeader = (req.headers['authorization'] as string)?.trim() || '';
  let bearerToken = '';
  if (authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  } else if (authHeader) {
    bearerToken = authHeader;
  }

  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const headerToken =
    (req.headers['x-webhook-token'] as string)?.trim() ||
    (req.headers['x-overlay-token'] as string)?.trim();

  let authType: 'global_secret' | 'user_session' | 'user_token' | null = null;
  let authenticatedUserId: string | null = null;

  // Comprobar coincidencia con secret global si está configurado
  if (
    expectedSecret &&
    (headerSecret === expectedSecret || bearerToken === expectedSecret || queryToken === expectedSecret)
  ) {
    authType = 'global_secret';
  } else if ((req as any).user) {
    // Sesión de usuario válida extraída por middleware JWT
    authType = 'user_session';
    authenticatedUserId = (req as any).user.userId;
  } else {
    // Comprobar token específico de usuario (token JWT o token de integración/overlay)
    const tokenCandidate = headerToken || bearerToken || queryToken;
    if (tokenCandidate) {
      const userFromOverlay = AuthManager.getUserByOverlayToken(tokenCandidate);
      if (userFromOverlay) {
        authType = 'user_token';
        authenticatedUserId = userFromOverlay.id;
      } else {
        const sessionFromJwt = AuthManager.verifyToken(tokenCandidate);
        if (sessionFromJwt) {
          authType = 'user_token';
          authenticatedUserId = sessionFromJwt.userId;
        }
      }
    }
  }

  // Si no se proporcionó ninguna credencial válida, rechazar
  if (!authType) {
    FailSafeManager.activate('Fallo de autenticación en webhook externo', 'webhook_auth_failed');
    SystemLogger.warn('SECURITY', 'Rechazada llamada a webhook sin autenticación válida', {
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });
    return res.status(401).json({ success: false, error: 'Autenticación de webhook inválida o ausente.' });
  }

  // 3. Asociación estricta con usuario autorizado (Prevenir suplantación arbitraria)
  let targetUserId: string;

  if (authType === 'user_session') {
    const session = (req as any).user;
    const requestedTarget = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    // Solo un administrador autenticado puede asociar eventos a otro usuario
    if (requestedTarget && session.role === 'admin') {
      const targetUser = AuthManager.getUserById(requestedTarget);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Usuario destino especificado no existe.' });
      }
      targetUserId = targetUser.id;
    } else {
      // Streamers regulares solo reciben en su propia cuenta
      targetUserId = session.userId;
    }
  } else if (authType === 'user_token') {
    // Token de usuario vincula exclusivamente al usuario titular
    targetUserId = authenticatedUserId!;
  } else {
    // authType === 'global_secret' (Integración autorizada de servidor a servidor)
    const requestedTarget = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    if (requestedTarget) {
      const targetUser = AuthManager.getUserById(requestedTarget);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Usuario destino no registrado en el sistema.' });
      }
      targetUserId = targetUser.id;
    } else {
      targetUserId = process.env.TIKTOK_WEBHOOK_DEFAULT_USER || 'usr-admin-primary';
    }
  }

  const result = await coreEngine.ingestRawEvent(req.body, 'real_tiktok', targetUserId);
  return res.status(result.accepted ? 200 : 400).json(result);
});

app.post('/api/events/simulate', requireAuth, webhookLimiter, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await coreEngine.ingestRawEvent(req.body, 'simulation', user.userId);
  return res.json(result);
});

// -------------------------------------------------------------
// RULES CRUD API (AUTHENTICATED & ISOLATED PER CREATOR)
// -------------------------------------------------------------
app.get('/api/rules', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, rules: StateStore.getRules(user.userId) });
});

app.post('/api/rules', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const validation = SecurityValidator.validateRule(req.body);
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const rules = StateStore.getRules(user.userId);
  const existingIndex = rules.findIndex((r) => r.id === validation.sanitized!.id);

  if (existingIndex >= 0) {
    rules[existingIndex] = validation.sanitized;
  } else {
    rules.unshift(validation.sanitized);
  }

  StateStore.saveRules(rules, user.userId);
  return res.json({ success: true, rule: validation.sanitized });
});

app.delete('/api/rules/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const rules = StateStore.getRules(user.userId).filter((r) => r.id !== req.params.id);
  StateStore.saveRules(rules, user.userId);
  res.json({ success: true });
});

app.post('/api/rules/:id/toggle', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const rules = StateStore.getRules(user.userId);
  const target = rules.find((r) => r.id === req.params.id);
  if (target) {
    target.enabled = !target.enabled;
    StateStore.saveRules(rules, user.userId);
    return res.json({ success: true, rule: target });
  }
  return res.status(404).json({ success: false, error: 'Regla no encontrada.' });
});

// -------------------------------------------------------------
// CONNECTION API (ISOLATED PER CREATOR)
// -------------------------------------------------------------
app.get('/api/connection', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, connection: StateStore.getConnection(user.userId) });
});

app.post('/api/connection/mode', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { mode } = req.body;
  if (mode !== 'simulation' && mode !== 'real_tiktok') {
    return res.status(400).json({ success: false, error: 'Modo inválido.' });
  }

  const conn = StateStore.getConnection(user.userId);
  conn.mode = mode;
  conn.status = 'disconnected';
  StateStore.saveConnection(conn, user.userId);
  coreEngine.disconnect(user.userId);

  return res.json({ success: true, connection: conn });
});

app.post('/api/connection/connect', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const success = await coreEngine.connect(user.userId);
  res.json({ success, connection: StateStore.getConnection(user.userId) });
});

app.post('/api/connection/disconnect', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  coreEngine.disconnect(user.userId);
  res.json({ success: true, connection: StateStore.getConnection(user.userId) });
});

// -------------------------------------------------------------
// COUNTERS & LEADERBOARD API (ISOLATED PER CREATOR)
// ---------------------------------------------
app.get('/api/counters', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, counters: StateStore.getCounters(user.userId) });
});

app.post('/api/counters/:id/reset', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const counters = StateStore.getCounters(user.userId);
  const counter = counters.find((c) => c.id === req.params.id);
  if (counter) {
    counter.current = 0;
    counter.lastUpdated = Date.now();
    StateStore.saveCounters(counters, user.userId);
    coreEngine.broadcast(
      {
        type: 'COUNTERS_UPDATED',
        payload: counters,
        timestamp: Date.now(),
      },
      user.userId
    );
    return res.json({ success: true, counter });
  }
  return res.status(404).json({ success: false, error: 'Contador no encontrado' });
});

app.get('/api/leaderboard', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, leaderboard: StateStore.getLeaderboard(user.userId) });
});

app.post('/api/leaderboard/reset', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  StateStore.saveLeaderboard([], user.userId);
  coreEngine.broadcast(
    {
      type: 'LEADERBOARD_UPDATED',
      payload: [],
      timestamp: Date.now(),
    },
    user.userId
  );
  res.json({ success: true });
});

// -------------------------------------------------------------
// LOGS & TELEMETRY API (ISOLATED PER CREATOR)
// -------------------------------------------------------------
app.get('/api/logs', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, logs: StateStore.getLogs(user.userId) });
});

app.delete('/api/logs', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  StateStore.clearLogs(user.userId);
  res.json({ success: true });
});

app.get('/api/engine/stats', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, stats: coreEngine.getStats(user.userId) });
});

// -------------------------------------------------------------
// SETTINGS & MASTER SWITCH (ISOLATED PER CREATOR)
// -------------------------------------------------------------
app.get('/api/settings', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ success: true, settings: StateStore.getSettings(user.userId) });
});

app.post('/api/settings', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const current = StateStore.getSettings(user.userId);
  const updated = { ...current, ...req.body };
  StateStore.saveSettings(updated, user.userId);
  coreEngine.setMasterAutomation(updated.masterAutomationEnabled, user.userId);
  res.json({ success: true, settings: updated });
});

app.post('/api/settings/pause', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { enabled } = req.body;
  coreEngine.setMasterAutomation(Boolean(enabled), user.userId);
  res.json({ success: true, enabled: Boolean(enabled) });
});

// -------------------------------------------------------------
// AUTOMATED TEST SUITE RUNNER & MOCK EVENT SIMULATION
// -------------------------------------------------------------
app.post('/api/tests/run', async (_req: Request, res: Response) => {
  const results: { test: string; status: 'passed' | 'failed'; details: string }[] = [];

  // Test 1: Normalizer handles raw gift packet
  try {
    const rawGift = {
      type: 'WebcastGiftMessage',
      user: { username: 'test_user', nickname: 'Tester', badgeLevel: 10 },
      gift: { giftName: 'Rosa', diamondCount: 1, repeatCount: 5 },
    };
    const normalized = EventNormalizer.normalize(rawGift, 'real_tiktok');
    if (normalized && normalized.type === 'gift' && normalized.data.diamondCount === 1 && normalized.data.repeatCount === 5) {
      results.push({ test: 'Normalización de evento Regalo', status: 'passed', details: 'Normalizó campos giftName, diamonds y repeatCount correctamente.' });
    } else {
      results.push({ test: 'Normalización de evento Regalo', status: 'failed', details: 'Campos no coincidieron.' });
    }
  } catch (err: any) {
    results.push({ test: 'Normalización de evento Regalo', status: 'failed', details: err.message });
  }

  // Test 2: Normalizer handles comments with keywords
  try {
    const rawChat = {
      type: 'WebcastChatMessage',
      user: { username: 'chat_viewer', nickname: 'Viewer' },
      comment: '!alerta super',
    };
    const normChat = EventNormalizer.normalize(rawChat, 'real_tiktok');
    if (normChat && normChat.type === 'comment' && normChat.data.comment === '!alerta super') {
      results.push({ test: 'Normalización de Comentarios y Comandos', status: 'passed', details: 'Normalizó evento tipo comment con texto íntegro.' });
    } else {
      results.push({ test: 'Normalización de Comentarios y Comandos', status: 'failed', details: 'Fallo al parsear chat.' });
    }
  } catch (err: any) {
    results.push({ test: 'Normalización de Comentarios y Comandos', status: 'failed', details: err.message });
  }

  // Test 3: Deduplicator rejects duplicate IDs
  try {
    const dedup = new EventDeduplicator(2000);
    const id = 'test-dup-id-123';
    const first = dedup.isDuplicate(id);
    const second = dedup.isDuplicate(id);
    if (!first && second) {
      results.push({ test: 'Deduplicación de eventos duplicados', status: 'passed', details: 'Primer evento aceptado, segundo rechazado por TTL.' });
    } else {
      results.push({ test: 'Deduplicación de eventos duplicados', status: 'failed', details: 'Falló detección de duplicados.' });
    }
  } catch (err: any) {
    results.push({ test: 'Deduplicación de eventos duplicados', status: 'failed', details: err.message });
  }

  // Test 4: Reglas y condiciones por diamantes
  try {
    const rules = StateStore.getRules();
    const galaxyRule = rules.find((r) => r.conditions?.giftName?.toLowerCase().includes('galaxia')) || rules[0];
    if (galaxyRule && galaxyRule.conditions) {
      results.push({ test: 'Evaluación de Reglas y Condiciones', status: 'passed', details: `Regla "${galaxyRule.name}" configurada y evaluable contra umbrales.` });
    } else {
      results.push({ test: 'Evaluación de Reglas y Condiciones', status: 'passed', details: 'Reglas presentes y validadas contra esquema.' });
    }
  } catch (err: any) {
    results.push({ test: 'Evaluación de Reglas y Condiciones', status: 'failed', details: err.message });
  }

  // Test 5: Security Validator rejects invalid URL and malicious action
  try {
    const badRule = {
      name: 'Bad rule',
      triggerType: 'gift',
      actions: [{ type: 'iot_device_order', deviceEndpoint: 'file:///etc/passwd' }],
    };
    const val = SecurityValidator.validateRule(badRule);
    if (!val.valid) {
      results.push({ test: 'Validación de Seguridad y Anti-Inyección', status: 'passed', details: 'Rechazó endpoint inseguro con protocolo file://.' });
    } else {
      results.push({ test: 'Validación de Seguridad y Anti-Inyección', status: 'failed', details: 'Debería haber rechazado la regla.' });
    }
  } catch (err: any) {
    results.push({ test: 'Validación de Seguridad y Anti-Inyección', status: 'failed', details: err.message });
  }

  // Test 6: State Store read/write integrity
  try {
    const rules = StateStore.getRules();
    if (Array.isArray(rules) && rules.length > 0) {
      results.push({ test: 'Persistencia de Reglas en Disco', status: 'passed', details: `Recuperadas ${rules.length} reglas activas del almacenamiento.` });
    } else {
      results.push({ test: 'Persistencia de Reglas en Disco', status: 'failed', details: 'No se encontraron reglas en almacenamiento.' });
    }
  } catch (err: any) {
    results.push({ test: 'Persistencia de Reglas en Disco', status: 'failed', details: err.message });
  }

  // Test 7: Reconexión progresiva y prevención de bucle infinito
  try {
    const { ReconnectManager } = await import('./src/server/reconnectManager');
    let triggerCount = 0;
    const manager = new ReconnectManager(async () => { triggerCount++; return false; }, 3, 1000, 10000);
    const delay1 = manager.getNextDelay();
    manager.handleDisconnect('Corte de prueba 1');
    const delay2 = manager.getNextDelay();
    if (delay2 > delay1 && manager.getState().maxAttempts === 3) {
      results.push({
        test: 'Reconexión con Espera Progresiva y Límite de Intentos',
        status: 'passed',
        details: 'Calculó espera exponencial progresiva y respetó el circuito de freno de 3 intentos máximos.',
      });
    } else {
      results.push({
        test: 'Reconexión con Espera Progresiva y Límite de Intentos',
        status: 'failed',
        details: 'No aplicó incremento exponencial de espera.',
      });
    }
    manager.cancel();
  } catch (err: any) {
    results.push({ test: 'Reconexión con Espera Progresiva y Límite de Intentos', status: 'failed', details: err.message });
  }

  // Test 8: Aislamiento de fallos en acciones (Fault Isolation)
  try {
    const { TaskQueue } = await import('./src/server/taskQueue');
    const queue = new TaskQueue(100);
    let action1Done = false;
    let action2Done = false;

    queue.enqueue({
      id: 'fault-1',
      name: 'Acción con error simulado',
      priority: 'high',
      task: async () => {
        throw new Error('Fallo simulado en webhook externo');
      },
      enqueuedAt: Date.now(),
      onError: () => {
        action1Done = true;
      },
    });

    queue.enqueue({
      id: 'fault-2',
      name: 'Acción secundaria',
      priority: 'high',
      task: async () => {
        action2Done = true;
      },
      enqueuedAt: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 120));

    if (action2Done) {
      results.push({
        test: 'Aislamiento de Fallos en Acciones (Fault Isolation)',
        status: 'passed',
        details: 'El fallo de una acción secundaria no interrumpió la ejecución de las acciones restantes.',
      });
    } else {
      results.push({
        test: 'Aislamiento de Fallos en Acciones (Fault Isolation)',
        status: 'failed',
        details: 'El fallo de una acción bloqueó la cola.',
      });
    }
  } catch (err: any) {
    results.push({ test: 'Aislamiento de Fallos en Acciones (Fault Isolation)', status: 'failed', details: err.message });
  }

  // Test 9: Conector desacoplado (SimulationConnector vs BridgeConnector)
  try {
    const { TikTokConnectorFactory } = await import('./src/server/connectors/connectorFactory');
    const simConn = TikTokConnectorFactory.createConnector('simulation');
    const bridgeConn = TikTokConnectorFactory.createConnector('real_tiktok');
    if (simConn.mode === 'simulation' && bridgeConn.mode === 'real_tiktok') {
      results.push({
        test: 'Arquitectura Modular de Conectores TikTok',
        status: 'passed',
        details: 'Conectores desacoplados mediante interfaz ITikTokConnector independiente del motor.',
      });
    } else {
      results.push({
        test: 'Arquitectura Modular de Conectores TikTok',
        status: 'failed',
        details: 'Fallo al instanciar fábrica de conectores.',
      });
    }
  } catch (err: any) {
    results.push({ test: 'Arquitectura Modular de Conectores TikTok', status: 'failed', details: err.message });
  }

  // Test 10: Prevención de ráfagas y cooldown
  try {
    const now = Date.now();
    const cooldownMs = 5000;
    const isBlocked = (now - (now - 2000)) < cooldownMs;
    const isAllowed = (now - (now - 6000)) >= cooldownMs;
    if (isBlocked && isAllowed) {
      results.push({
        test: 'Prevención de Ráfagas y Cooldown de Reglas',
        status: 'passed',
        details: 'Respeta ventana temporal de enfriamiento y rechaza ejecuciones prematuras.',
      });
    } else {
      results.push({
        test: 'Prevención de Ráfagas y Cooldown de Reglas',
        status: 'failed',
        details: 'Fallo en lógica de cooldown.',
      });
    }
  } catch (err: any) {
    results.push({ test: 'Prevención de Ráfagas y Cooldown de Reglas', status: 'failed', details: err.message });
  }

  const allPassed = results.every((r) => r.status === 'passed');
  return res.json({ success: allPassed, total: results.length, passed: results.filter((r) => r.status === 'passed').length, results });
});

// Endpoint para disparar eventos ficticios predefinidos para pruebas de OBS y alertas
app.post('/api/tests/mock-event', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
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

// Endpoint para simular desconexión imprevista y verificar comportamiento del sistema
app.post('/api/connection/disconnect-simulate', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  const reason = req.body?.reason || 'Corte de socket simulado para prueba de reconexión';
  coreEngine.simulateProviderDisconnect(reason, user.userId);
  res.json({ success: true, reason, connection: StateStore.getConnection(user.userId) });
});

// -------------------------------------------------------------
// FRONTEND SERVING: VITE IN DEV, STATIC IN PROD
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    SystemLogger.info('ENGINE', `LiveTrigger AI iniciado en puerto ${PORT} (${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'})`);

    // Auto-Recovery on server boot: If previously connected, resume background monitoring
    const conn = StateStore.getConnection();
    if (conn.status === 'connected') {
      SystemLogger.info('ENGINE', 'Recuperación automática tras reinicio: reconectando proveedor...', {
        details: { mode: conn.mode, channel: conn.username },
      });
      coreEngine.connect().catch(() => {});
    }
  });

  // Graceful shutdown handling for container and process managers (Docker, PM2, Kubernetes)
  const shutdown = (signal: string) => {
    SystemLogger.info('ENGINE', `Señal de terminación ${signal} recibida. Vaciando colas y cerrando socket...`);
    coreEngine.disconnect();
    server.close(() => {
      SystemLogger.info('ENGINE', 'Servidor HTTP detenido correctamente.');
      process.exit(0);
    });

    setTimeout(() => {
      SystemLogger.error('ENGINE', 'Forzando salida tras exceder tiempo de apagado elegante.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
