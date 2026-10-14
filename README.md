# LiveTrigger AI 🚀

Plataforma de automatización en tiempo real para transmisiones de **TikTok LIVE** y overlays interactivos en **OBS Studio**.

Diseñado para streamers, creadores de contenido y agencias que requieren ejecución autónoma 24/7 sin depender de ventanas de navegador abiertas, con soporte de persistencia local en SQLite (`better-sqlite3`), cookies HttpOnly seguras, protección contra ataques CSRF, encabezados CSP y control de sesiones con roles.

---

## 📋 Requisitos del Sistema

* **Node.js**: Versión `>= 22` (especificado en `package.json`).
* **npm**: Versión `>= 10`.
* **Sistemas Operativos Soportados**: Windows 10/11, macOS (Apple Silicon e Intel) y Linux (x64 y ARM64).

---

## 🪟 Instalación en Windows (PowerShell)

### Particularidad de `better-sqlite3` en Windows

En Windows, al ejecutar `npm install`, paquetes nativos con archivos `binding.gyp` (como `better-sqlite3` v13) pueden intentar compilar código C++ utilizando `node-gyp`, lo cual falla a menos que se tengan instalados Python y las herramientas de compilación de Visual Studio C++ (Visual Studio Build Tools).

Sin embargo, `better-sqlite3` ya incluye **binarios precompilados** para Windows (`win32-x64`). Para aprovechar los binarios precompilados e instalar de forma instantánea sin requerir Visual Studio ni Python:

1. El repositorio incluye un archivo `.npmrc` en la raíz con la directiva:
   ```ini
   ignore-scripts=true
   ```
2. Esto indica a npm que omita los scripts de compilación de `node-gyp`, utilizando directamente los binarios precompilados.

### Pasos de Instalación en PowerShell:

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
# 1. Verificar versión de Node.js (debe ser >= 22)
node --version

# 2. Instalar dependencias (usa automáticamente .npmrc con ignore-scripts)
npm install

# Si ejecutas en un entorno sin .npmrc, puedes forzar la bandera:
npm install --ignore-scripts

# Para reconstruir binarios nativos en Windows si fuera necesario:
npm run setup:win

# 3. Crear el archivo de variables de entorno a partir de la plantilla
Copy-Item .env.example .env

# 4. Generar claves secretas seguras para JWT_SECRET y contraseñas
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ADMIN_PASSWORD=' + require('crypto').randomBytes(16).toString('base64'))"

# 5. Iniciar la aplicación en modo desarrollo
npm run dev

# 6. Para verificar la suite de pruebas unitarias:
npm test
```

---

## 🐧 Instalación en Linux / macOS

```bash
# Instalar dependencias
npm install

# Copiar entorno
cp .env.example .env

# Iniciar servidor
npm run dev
```

---

## 🐳 Despliegue con Docker y Docker Compose

El proyecto cuenta con un `Dockerfile` multi-stage optimizado sobre `node:22-alpine` y binarios precompilados `linuxmusl`:

```bash
# Construir la imagen
docker compose build

# Iniciar el servicio en segundo plano
docker compose up -d

# Ver registros en tiempo real
docker compose logs -f
```

---

## 🧪 Pruebas y Calidad de Código

* **Suite de pruebas unitarias**: `npm test`
* **Chequeo de tipos TypeScript**: `npm run lint`
* **Compilación de producción**: `npm run build`

---

## 📚 Documentación Adicional

* [Guía de Despliegue en Internet y Producción](docs/GUIA_DESPLIEGUE_INTERNET.md)
* [Integración de TikTok LIVE y Overlay para OBS Studio](docs/INTEGRACION_TIKTOK_OBS.md)
* [Instalación Detallada en Windows PowerShell](docs/INSTALACION_WINDOWS.md)
