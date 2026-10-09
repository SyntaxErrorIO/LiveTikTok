# Guía de Despliegue en Internet y Mantenimiento - LiveTrigger AI

Esta guía detalla la arquitectura, configuración, despliegue en producción con HTTPS, persistencia de datos, gestión de secretos, recuperación ante caídas y estrategias de mitigación para hosting en la nube.

---

## 1. Arquitectura de Despliegue

LiveTrigger AI está diseñado como una plataforma **monolítica desacoplada y contenerizable**:

```
                         Internet (HTTPS / WSS)
                                   │
                    ┌──────────────▼──────────────┐
                    │ Reverse Proxy / Cloud Load  │
                    │   Balancer (SSL / Let's     │
                    │         Encrypt)            │
                    └──────────────┬──────────────┘
                                   │ Puerto 3000
    ┌──────────────────────────────▼──────────────────────────────┐
    │                Servidor Node.js (server.ts)                 │
    │                                                             │
    │  ┌───────────────────────┐      ┌────────────────────────┐  │
    │  │ Frontend SPA (Vite)   │      │ API REST & SSE Stream  │  │
    │  │ Servido estáticamente │      │ /api/events/stream     │  │
    │  └───────────────────────┘      └───────────┬────────────┘  │
    │                                             │               │
    │  ┌──────────────────────────────────────────▼────────────┐  │
    │  │      Motor de Automatización Autónomo (coreEngine)    │  │
    │  │   • Conector TikTok LIVE (Bridge / WebSocket / Ws)    │  │
    │  │   • Deduplicador de Eventos (TTL 5 min)               │  │
    │  │   • Evaluador de Reglas de Automatización             │  │
    │  │   • Cola de Tareas con Limitador de Ráfagas           │  │
    │  │   • Gestor de Modo Seguro (FailSafeManager)           │  │
    │  └───────────────────────┬───────────────────────────────┘  │
    │                          │                                  │
    │  ┌───────────────────────▼───────────────────────────────┐  │
    │  │        Capa de Persistencia y Base de Datos           │  │
    │  │      (/app/data montado en volumen persistente)       │  │
    │  │   • users.json        • audit_log.json                │  │
    │  │   • rules.json        • backups/ (snapshots)          │  │
    │  │   • settings.json     • workspaces/ (cuentas de user) │  │
    │  └───────────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────────┘
```

---

## 2. Ejecución Autónoma: Por Qué Funciona Sin Pestaña Abierta

1. **El motor corre 100% en el proceso Node.js**:
   - `coreEngine`, `taskQueue`, `deduplicator` y los conectores de TikTok viven en la memoria del servidor Node.js.
   - Cuando un espectador envía un regalo o comentario en TikTok LIVE, el conector del backend recibe el paquete directamente a través del socket o webhook externo.
   - Las reglas se evalúan en el servidor, los contadores se actualizan en disco y el webhook externo o acción de dispositivo se dispara **sin que ningún usuario tenga el navegador web abierto**.
2. **El Frontend es un visor en tiempo real**:
   - El panel de control y el OBS Overlay se conectan mediante Server-Sent Events (`/api/events/stream`) para recibir telemetría visual. Si el streamer apaga su monitor o cierra todas las pestañas, el motor continúa operando.

---

## 3. Limitaciones Críticas de los Planes Gratuitos (Scale-to-Zero)

> ⚠️ **ADVERTENCIA FUNDAMENTAL DE ARQUITECTURA**:
> La mayoría de proveedores en la nube gratuitos (Render Free Web Services, Koyeb Free, Heroku Eco, Vercel Serverless) **suspenden los contenedores tras 15 minutos sin peticiones HTTP entrantes** ("Scale-to-Zero" / "Sleep Mode").

### ¿Cómo afecta esto a las automatizaciones?
* Si el contenedor entra en suspensión, el proceso Node.js se congela o destruye.
* **Se pierde la conexión con TikTok LIVE**: Los sockets se cierran y los eventos que ocurran mientras el contenedor duerme se perderán.
* **Retardo de arranque en frío (Cold Start)**: Cuando entra un webhook, el servidor tarda de 30 a 60 segundos en despertar.

### Mitigaciones obligatorias para producción
1. **Opción A (Recomendada): Instancia Always-On o VPS Económico**:
   - Desplegar en un VPS de $4–$5/mes (Hetzner Cloud, DigitalOcean, Linode) o plan Starter de Railway ($5/mo) o Render Individual ($7/mo) que garantice que el contenedor **nunca duerme**.
2. **Opción B (Uptime Monitor Keepalive)**:
   - Configurar un servicio gratuito de monitorización externa (como UptimeRobot, BetterStack o cronjob de GitHub Actions) que realice un `GET` a `https://tu-dominio.com/health` cada 5 minutos. Esto previene la inactividad en plataformas que se guían por tráfico HTTP.
3. **Opción C: Volumen de Almacenamiento Persistente**:
   - En plataformas con contenedores efímeros (como Cloud Run o Railway), es indispensable asociar un volumen persistente montado en `/app/data` para que los reinicios no borren usuarios ni reglas.

---

## 4. Modo Seguro (Fail-Safe Mode)

Para evitar que una desconexión de red o token caducado dé una falsa sensación de normalidad al streamer:

* **Activación Automática**: Si el conector pierde conexión, el webhook falla o se superan los reintentos de reconexión, el sistema activa el **Modo Seguro**.
* **Comportamiento en Modo Seguro**:
  - Se suspende el disparo de alertas visuales y sonoras en el OBS Overlay.
  - La barra superior del panel muestra una alerta ámbar con el motivo exacto del fallo (`/api/system/fail-safe`).
  - El endpoint `/health` reporta el estado como `"fail_safe"`.
  - El streamer puede inspeccionar la auditoría y pulsar **Restablecer Modo Seguro** una vez resuelto el problema.

---

## 5. Variables de Entorno en Producción

Copia el archivo `.env.example` a `.env` en tu servidor y define los siguientes valores:

```bash
# Puerto del servidor (asignado automáticamente por Railway/Render o 3000 en VPS)
PORT=3000

# Entorno
NODE_ENV=production

# Clave secreta para tokens de autenticación JWT (Generar con: openssl rand -hex 32)
JWT_SECRET=c1f4e09f87b8d65421ac7a892b45e7f1234abcd567890ef123456789abcdef01

# Credenciales de la cuenta administradora inicial (REEMPLAZA con tu propia clave secreta única)
ADMIN_USERNAME=admin
ADMIN_EMAIL=streamer@tudominio.com
ADMIN_PASSWORD=Reemplazar_Con_Tu_Contrasena_Robusta_Unica_Minimo_10_Chars

# Clave de validación para webhooks externos (opcional pero recomendada)
TIKTOK_WEBHOOK_SECRET=token_aleatorio_para_webhooks_externos

# Directorio de persistencia
DATA_DIR=/app/data
```

---

## 6. Opciones de Despliegue Paso a Paso

### Opción 1: Despliegue con Docker y Docker Compose (VPS / Servidor Propio)

1. **Clonar el repositorio en el servidor**:
   ```bash
   git clone <URL_REPOSITORIO> /opt/livetrigger
   cd /opt/livetrigger
   ```

2. **Configurar el entorno**:
   ```bash
   cp .env.example .env
   nano .env  # Establece JWT_SECRET y contraseñas
   ```

3. **Iniciar el contenedor**:
   ```bash
   docker compose up -d --build
   ```

4. **Configurar Nginx con HTTPS (Let's Encrypt)**:
   ```nginx
   server {
       server_name streamer.tudominio.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Soporte para Server-Sent Events (SSE) sin buffering
           proxy_buffering off;
           proxy_cache off;
           proxy_read_timeout 86400s;
       }
   }
   ```

5. **Obtener certificado SSL gratuito**:
   ```bash
   certbot --nginx -d streamer.tudominio.com
   ```

---

### Opción 2: Despliegue en Railway

1. Conecta tu repositorio de GitHub en [Railway.app](https://railway.app).
2. Añade un **Volume** montado en la ruta `/app/data` para garantizar la persistencia de la base de datos.
3. En la sección **Variables**, añade `NODE_ENV=production` y `JWT_SECRET`.
4. En **Settings > Networking**, genera un dominio público con HTTPS (ej. `livetrigger-production.up.railway.app`).
5. En **Healthcheck Path**, ingresa `/health`.

---

### Opción 3: Despliegue en Render

1. Crea un nuevo **Web Service** apuntando al repositorio.
2. Selecciona **Environment**: `Docker` o `Node`.
   - Si usas Node: Build Command: `npm run build`, Start Command: `npm start`.
3. Selecciona una instancia no efímera o añade un **Disk** montado en `/app/data`.
4. Configura las variables de entorno en la pestaña **Environment**.
5. Configura el **Health Check Path** a `/health`.

---

## 7. Configuración Segura de OBS Studio

Para añadir el overlay en OBS Studio sin exponer contraseñas en stream:

1. Inicia sesión en el panel de LiveTrigger AI.
2. Ve a **Ajustes > Infraestructura Web** o abre el modal **Cuenta**.
3. Copia la **URL Privada para Fuente de Navegador en OBS**:
   ```
   https://streamer.tudominio.com/?mode=overlay&token=a8b3c4d5e6...
   ```
4. En OBS Studio:
   - Haz clic en `+` > **Navegador** (Browser Source).
   - Pega la URL generada.
   - Ancho: `1920`, Alto: `1080`.
   - Marca la casilla **Controlar audio mediante OBS** (si deseas modular volumen de fanfarrias o TTS).
   - Marca **Cerrar fuente cuando no esté visible** = Desactivado.
5. El token identifica tu cuenta y carga tus efectos sin requerir cookies ni contraseñas. Si sospechas que tu token se filtró en un directo, pulsa **Regenerar Token** en Ajustes.

---

## 8. Verificación de Funcionamiento Sin Navegador

Para verificar que el sistema sigue operando aunque cierres el navegador:

1. Abre el terminal de tu ordenador o servidor.
2. Realiza una comprobación de salud del servicio:
   ```bash
   curl -s https://streamer.tudominio.com/health | jq
   ```
   Debe devolver:
   ```json
   {
     "status": "healthy",
     "service": "LiveTrigger AI Automation Engine",
     "engine": {
       "totalProcessed": 142,
       "queuePending": 0
     },
     "connection": {
       "status": "connected"
     }
   }
   ```
3. Cierra **todas las pestañas del navegador** de LiveTrigger AI.
4. Dispara un evento simulado por HTTP o envía un regalo en directo:
   ```bash
   curl -X POST https://streamer.tudominio.com/api/events/simulate \
     -H "Content-Type: application/json" \
     -d '{"type":"gift","user":{"username":"test_cli"},"data":{"giftName":"Rosa","diamondCount":1}}'
   ```
5. Comprueba el log de auditoría:
   ```bash
   curl -s https://streamer.tudominio.com/api/system/audit | jq '.[0]'
   ```
   Observarás que el evento fue procesado y registrado por el motor del servidor sin ninguna sesión gráfica activa.

---

## 9. Mantenimiento y Respaldos

- **Respaldos Automáticos**: El servidor crea copias de seguridad en `/app/data/backups/` antes de cada importación o cambio estructural.
- **Descargar Copia de Seguridad**: Puedes hacer clic en **Exportar JSON** en el panel de Ajustes para descargar una copia local.
- **Recuperación tras caídas**: En caso de reinicio de la máquina virtual o caída del proceso, Docker o PM2 reinician automáticamente el contenedor (`restart: unless-stopped`), el servidor lee los archivos de `/app/data` y reanuda el conector de TikTok LIVE sin intervención humana.
