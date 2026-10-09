import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { coreEngine } from './src/server/coreEngine';
import { StateStore } from './src/server/stateStore';
import { SystemLogger } from './src/server/systemLogger';
import { securityHeaders } from './src/server/middleware/securityHeaders';
import { extractUser } from './src/server/middleware/auth';

// Modular Express Routers
import authRoutes from './src/server/routes/auth';
import rulesRoutes from './src/server/routes/rules';
import connectionRoutes from './src/server/routes/connection';
import backupRoutes from './src/server/routes/backup';
import eventsRoutes from './src/server/routes/events';
import systemRoutes from './src/server/routes/system';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// 1. Comprehensive Security Headers (CSP, no X-XSS-Protection, HSTS, Sniff protection)
app.use(securityHeaders(isProd));

// 2. Body Parser
app.use(express.json({ limit: '2mb' }));

// 3. User Session Extraction (Authorization header only)
app.use(extractUser);

// 4. Mount Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/events', eventsRoutes);
app.use('/', systemRoutes);

// 5. Frontend Serving: Vite middleware in Dev, Static files in Prod
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
    SystemLogger.info(
      'ENGINE',
      `LiveTrigger AI iniciado en puerto ${PORT} (${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'})`
    );

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
