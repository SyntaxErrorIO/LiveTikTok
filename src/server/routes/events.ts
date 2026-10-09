import { Router, Request, Response } from 'express';
import { coreEngine, SSEBroadcastMessage } from '../coreEngine';
import { AuthManager } from '../authManager';
import { RateLimiter } from '../rateLimiter';
import { SystemLogger } from '../systemLogger';
import { FailSafeManager } from '../failSafeManager';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

const webhookLimiter = RateLimiter.createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Límite de tasa de eventos de webhook alcanzado.',
  category: 'WEBHOOK',
});

/**
 * SSE Real-time Stream
 * Security rules:
 * - Session JWT must come through Authorization header.
 * - For OBS browser sources, ONLY overlayToken query param (?overlayToken=) is permitted.
 * - Raw session JWT or generic ?token= query parameter is strictly disallowed.
 */
router.get('/stream', (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user;
  const overlayToken = typeof req.query.overlayToken === 'string' ? req.query.overlayToken.trim() : undefined;
  let overlayUser: any = null;

  if (overlayToken) {
    overlayUser = AuthManager.getUserByOverlayToken(overlayToken);
  }

  // Must have authenticated user session (from header) or valid OBS overlayToken (from query)
  if (!user && !overlayUser) {
    return res.status(401).json({
      success: false,
      error: 'Acceso no autorizado al canal de eventos SSE en tiempo real. Proporcione cabecera Authorization o un overlayToken válido.',
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

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

/**
 * Webhook Ingestion
 * Security rules:
 * - Strict header authentication: x-webhook-secret, Authorization, or x-webhook-token.
 * - Query parameters (?token=) are NOT accepted.
 */
router.post('/webhook', webhookLimiter, async (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const expectedSecret = process.env.TIKTOK_WEBHOOK_SECRET?.trim();

  // 1. In production, reject if TIKTOK_WEBHOOK_SECRET is not configured
  if (isProd && !expectedSecret) {
    SystemLogger.error('SECURITY', 'Rechazada llamada a webhook: TIKTOK_WEBHOOK_SECRET no configurado en producción.');
    return res.status(503).json({
      success: false,
      error: 'Servicio de webhook no disponible: TIKTOK_WEBHOOK_SECRET es obligatorio en producción.',
    });
  }

  // 2. Strict Header-Only Authentication
  const headerSecret = (req.headers['x-webhook-secret'] as string)?.trim();
  const authHeader = (req.headers['authorization'] as string)?.trim() || '';
  let bearerToken = '';
  if (authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  } else if (authHeader) {
    bearerToken = authHeader;
  }

  const headerToken =
    (req.headers['x-webhook-token'] as string)?.trim() ||
    (req.headers['x-overlay-token'] as string)?.trim();

  let authType: 'global_secret' | 'user_session' | 'user_token' | null = null;
  let authenticatedUserId: string | null = null;

  // Check global secret in headers
  if (expectedSecret && (headerSecret === expectedSecret || bearerToken === expectedSecret)) {
    authType = 'global_secret';
  } else if ((req as AuthedRequest).user) {
    // Valid session extracted from Authorization header
    authType = 'user_session';
    authenticatedUserId = (req as AuthedRequest).user!.userId;
  } else {
    // Check specific user token in header
    const tokenCandidate = headerToken || bearerToken;
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

  if (!authType) {
    FailSafeManager.activate('Fallo de autenticación en webhook externo', 'webhook_auth_failed');
    SystemLogger.warn('SECURITY', 'Rechazada llamada a webhook sin autenticación válida en cabeceras', {
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });
    return res.status(401).json({ success: false, error: 'Autenticación de webhook inválida o ausente en cabeceras.' });
  }

  // 3. User association & anti-impersonation
  let targetUserId: string;

  if (authType === 'user_session') {
    const session = (req as AuthedRequest).user!;
    const requestedTarget = (req.headers['x-user-id'] as string)?.trim();
    if (requestedTarget && session.role === 'admin') {
      const targetUser = AuthManager.getUserById(requestedTarget);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Usuario destino especificado no existe.' });
      }
      targetUserId = targetUser.id;
    } else {
      targetUserId = session.userId;
    }
  } else if (authType === 'user_token') {
    targetUserId = authenticatedUserId!;
  } else {
    const requestedTarget = (req.headers['x-user-id'] as string)?.trim();
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

// Simulator Ingestion
router.post('/simulate', requireAuth, webhookLimiter, async (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const result = await coreEngine.ingestRawEvent(req.body, 'simulation', user.userId);
  return res.json(result);
});

export default router;
