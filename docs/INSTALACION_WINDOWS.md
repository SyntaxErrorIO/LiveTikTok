# Guía de Instalación en Windows (PowerShell) - LiveTrigger AI

Esta guía documenta la instalación y ejecución de LiveTrigger AI en entornos Microsoft Windows 10 y Windows 11 utilizando PowerShell.

---

## 1. Requisitos Previos

1. **Node.js**: Versión 22 o superior (`node >= 22`).
   Descarga e instala la versión LTS desde [nodejs.org](https://nodejs.org/).
2. **PowerShell**: PowerShell 5.1 o PowerShell 7 (Core).
3. **Navegador u OBS Studio**: Para visualizar el panel de control o incrustar la fuente de navegador de OBS.

---

## 2. La particularidad de `better-sqlite3` en Windows

En Windows, al ejecutar `npm install`, muchos módulos nativos de C/C++ que contienen un archivo `binding.gyp` invocan `node-gyp rebuild`. Esto provoca que npm intente compilar desde el código fuente nativo, lo que arroja errores como:

```text
gyp ERR! find Python
gyp ERR! find VS
gyp ERR! stack Error: Could not find any Visual Studio installation to use
```

### Solución Verificada: `ignore-scripts=true`

El paquete `better-sqlite3` v13 ya incluye **binarios precompilados** oficiales para Windows (`better_sqlite3.node` para `win32-x64`). No es necesario compilar nada con Visual Studio C++ ni instalar Python.

Para omitir la ejecución de scripts innecesarios de `node-gyp`, el repositorio incluye el archivo `.npmrc` en la raíz:

```ini
ignore-scripts=true
```

Al estar configurado en `.npmrc`, cualquier comando como `npm install` o `npm ci` omite automáticamente las llamadas a `node-gyp`, instalando de inmediato los binarios precompilados.

---

## 3. Guía Paso a Paso en PowerShell

Abre una terminal de PowerShell y sigue estos pasos:

```powershell
# 1. Comprobar la versión instalada de Node.js
node --version
# Debe devolver v22.x.x o superior

# 2. Entrar al directorio del proyecto
cd livetrigger-ai

# 3. Instalar las dependencias
# Con el .npmrc presente, npm install funcionará sin compilar node-gyp:
npm install

# Si deseas forzar explícitamente el flag:
npm install --ignore-scripts

# Si en algún momento requieres reconstruir manualmente los módulos nativos:
npm run setup:win

# 4. Crear el archivo de entorno .env a partir de .env.example
Copy-Item .env.example .env

# 5. Generar un JWT_SECRET criptográfico y seguro de 32+ caracteres
$jwtKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "Clave JWT generada: $jwtKey"

# 6. Generar una contraseña de administrador segura
$adminPass = node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
Write-Host "Contraseña Admin generada: $adminPass"

# 7. Edita el archivo .env con tu editor favorito (Notepad, VSCode, etc.) y pega las claves
notepad .env

# 8. Iniciar el servidor en modo desarrollo
npm run dev

# 9. Para validar que todo funciona correctamente, ejecuta los tests unitarios:
npm test
```

---

## 4. Solución de Problemas Frecuentes

* **Error: 'ExecutionPolicy' bloquea scripts en PowerShell**:
  Si PowerShell bloquea la ejecución de scripts globales de npm (`tsx`, `vite`, etc.), ejecuta en una terminal con permisos estándar:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
* **Error de secretos prohibidos al iniciar en producción (`NODE_ENV=production`)**:
  LiveTrigger AI valida que `JWT_SECRET` y `ADMIN_PASSWORD` no contengan valores de relleno de ejemplo. Asegúrate de definir claves reales y aleatorias en tu archivo `.env`.
