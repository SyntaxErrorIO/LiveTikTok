import { Router, Response } from 'express';
import { StateStore } from '../stateStore';
import { coreEngine } from '../coreEngine';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Get Creator Connection Status & Metadata
router.get('/', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const conn = StateStore.getConnection(userId);
  const eulerConfigured = Boolean(
    (process.env.EULER_STREAM_API_KEY || process.env.EULER_STREAM_KEY || process.env.SIGN_API_KEY || '').trim()
  );
  return res.json({
    success: true,
    connection: conn,
    meta: {
      eulerStreamConfigured: eulerConfigured,
      directConnectorAvailable: true,
    },
  });
});

// Update Creator Connection Configuration
router.post('/config', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const { username, bridgeServerUrl, connectorType, autoReconnect } = req.body;
  const conn = StateStore.getConnection(userId);
  if (typeof username === 'string') conn.username = username.replace(/^@/, '').trim();
  if (typeof bridgeServerUrl === 'string') conn.bridgeServerUrl = bridgeServerUrl.trim();
  if (connectorType === 'direct' || connectorType === 'bridge') conn.connectorType = connectorType;
  if (typeof autoReconnect === 'boolean') conn.autoReconnect = autoReconnect;

  StateStore.saveConnection(conn, userId);
  return res.json({ success: true, connection: conn });
});

// Switch Connection Mode (simulation / real_tiktok)
router.post('/mode', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const { mode } = req.body;
  if (mode !== 'simulation' && mode !== 'real_tiktok') {
    return res.status(400).json({ success: false, error: 'Modo de conexión inválido.' });
  }

  const conn = StateStore.getConnection(userId);
  conn.mode = mode;
  conn.status = 'disconnected';
  StateStore.saveConnection(conn, userId);
  coreEngine.disconnect(userId);

  return res.json({ success: true, connection: conn });
});

// Connect to Stream Provider
router.post('/connect', async (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const success = await coreEngine.connect(userId);
  return res.json({ success, connection: StateStore.getConnection(userId) });
});

// Disconnect from Stream Provider
router.post('/disconnect', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  coreEngine.disconnect(userId);
  return res.json({ success: true, connection: StateStore.getConnection(userId) });
});

// Simulate Provider Disconnect for Failover Testing
router.post('/disconnect-simulate', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const reason = req.body?.reason || 'Corte de socket simulado para prueba de reconexión';
  coreEngine.simulateProviderDisconnect(reason, userId);
  return res.json({ success: true, reason, connection: StateStore.getConnection(userId) });
});

export default router;
