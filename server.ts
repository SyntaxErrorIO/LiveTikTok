import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { coreEngine } from './src/server/coreEngine';
import { StateStore } from './src/server/stateStore';
import { SystemLogger } from './src/server/systemLogger';
import { securityHeaders } from './src/server/middleware/securityHeaders';
import { extractUser, csrfProtection } from './src/server/middleware/auth';
import { validateProductionSecrets } from './src/server/config/forbiddenSecrets';

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
function resolvePort(): number {
  // 1. CLI flag passed by runner (e.g. npm run dev --port 3000)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // 2. DEFAULT_APP_PORT or APP_PORT
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.APP_PORT) {
    const parsed = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // 3. If NGINX is occupying PORT (e.g. PORT=8080 and NGINX_PORT=8080), fallback to 3000
  if (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT) {
    return 3000;
  }
  const envPort = Number(process.env.PORT);
  if (envPort && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

const PORT = resolvePort();
const isProd = process.env.NODE_ENV === 'production';

// 1. Comprehensive Security Headers (CSP, no X-XSS-Protection, HSTS, Sniff protection)
app.use(securityHeaders(isProd));

// 2. Body Parser & Cookie Parser
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// 3. User Session Extraction (Authorization header or HttpOnly session cookie)
app.use(extractUser);

// 4. CSRF Protection for state-changing requests relying on ambient credentials
app.use(csrfProtection);

// 5. Mount Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/connection', connectionRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/events', eventsRoutes);
app.use('/', systemRoutes);

// 5. Frontend Serving: Vite middleware in Dev, Static files in Prod
async function startServer() {
  try {
    validateProductionSecrets();

    if (!isProd) {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (viteErr: any) {
        SystemLogger.error('ENGINE', `Error al inicializar Vite middleware: ${viteErr?.message || viteErr}`);
        throw viteErr;
      }
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      const localUrl = `http://localhost:${PORT}`;
      console.log(`\n======================================================`);
      console.log(`  🚀 LiveTrigger AI Server listening at ${localUrl}`);
      console.log(`  Entorno: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'} | Puerto: ${PORT}`);
      console.log(`======================================================\n`);

      SystemLogger.info(
        'ENGINE',
        `LiveTrigger AI iniciado en ${localUrl} (${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'})`
      );

      // Auto-Recovery on server boot: Iterate over all users and default scope
      try {
        const users = StateStore.getUsers();
        const userIds = users.map(u => u.id).concat(['default']);
        const processedUserIds = new Set<string>();

        for (const uid of userIds) {
          if (processedUserIds.has(uid)) continue;
          processedUserIds.add(uid);

          try {
            const conn = StateStore.getConnection(uid);
            if (conn.status === 'connected' && conn.autoReconnect !== false && conn.username && conn.username.trim().length > 0) {
              SystemLogger.info('ENGINE', `Recuperación automática de conexión tras reinicio para ámbito ${uid}...`, {
                details: { mode: conn.mode, channel: conn.username },
              });
              coreEngine.connect(uid).catch((err) => {
                SystemLogger.error('ENGINE', `Fallo al recuperar conector en arranque para ${uid}: ${err?.message || err}`);
              });
            }
          } catch (userErr: any) {
            SystemLogger.error('ENGINE', `Error procesando recuperación para usuario ${uid}: ${userErr?.message || userErr}`);
          }
        }
      } catch (recoveryErr: any) {
        SystemLogger.error('ENGINE', `Error general en recuperación automática de conexiones: ${recoveryErr?.message || recoveryErr}`);
      }
    });

    server.on('error', (err: any) => {
      SystemLogger.error('ENGINE', `Error en servidor HTTP: ${err?.message || err}`);
      console.error(`[FATAL] Error en el servidor HTTP:`, err);
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
  } catch (err: any) {
    SystemLogger.error('ENGINE', `Fallo crítico al arrancar LiveTrigger AI: ${err?.message || err}`);
    console.error(`[FATAL] Fallo al iniciar el servidor:`, err);
    process.exit(1);
  }
}

startServer();
