# Guía Técnica de Integración: TikTok LIVE & OBS Studio en LiveTrigger AI

Este documento detalla la arquitectura de integración, el estado real de las APIs de TikTok, las consideraciones de seguridad, la arquitectura modular y la configuración paso a paso para OBS Studio.

---

## 1. Estado de la API de TikTok LIVE: Análisis de Acceso y Riesgos

### ¿Existe una API oficial abierta para capturar eventos de TikTok LIVE?
**No.** Actualmente, TikTok **no ofrece una API pública, abierta y gratuita** para que aplicaciones de terceros escuchen eventos de regalos, comentarios o interacciones en tiempo real de cualquier creador.
* **TikTok for Developers / TikTok Live API Oficial:** Solo está disponible mediante acuerdos empresariales cerrados para agencias certificadas en el *TikTok Creator Marketplace* o desarrolladores con contratos comerciales específicos. No otorga acceso directo mediante API Keys estándar para streaming general de creadores independientes.
* **Política de Seguridad:** LiveTrigger AI **nunca solicita contraseñas, tokens de sesión de usuario ni credenciales privadas de TikTok**. Para unirse al flujo público de una sala en directo únicamente se requiere el identificador público (`@nombre_de_usuario`).

### Biblioteca de Terceros Utilizada: Protocolo `tiktok-live-connector`
Para transmisiones de creadores independientes, la plataforma utiliza el estándar comunitario de ingeniería inversa basado en WebSocket scraping público:
* **Funcionamiento:** Se conecta a los WebSockets de entrega de contenido público (Webcast CDN) que TikTok envía al reproductor web de la sala.
* **Limitaciones y Riesgos Técnicos:**
  1. *Cambios de Protobuf:* TikTok actualiza periódicamente la estructura de sus mensajes Protobuf. Cuando esto ocurre, el conector debe actualizarse.
  2. *Retos de Captcha y Rate Limiting por IP:* Si una misma IP abre demasiadas conexiones concurrentes a diferentes salas, TikTok puede responder con un captcha o bloqueo temporal.
  3. *Retrasos de Red:* La latencia típica oscila entre 200ms y 1.5s dependiendo de la región geográfica del creador y del servidor.
* **Aislamiento Arquitectónico:**
  En LiveTrigger AI, el conector está desacoplado mediante la interfaz `ITikTokConnector`. Si TikTok lanza una API oficial abierta en el futuro o se requiere un proveedor alternativo (ej. Webhooks, Relays en la nube o emuladores), este puede sustituirse sin modificar una sola línea del motor de automatización de reglas.

---

## 2. Modos de Operación

LiveTrigger AI proporciona dos modos de funcionamiento claramente diferenciados:

1. **Modo Simulación Controlada (Predeterminado):**
   - Entorno aislado y seguro dentro de la aplicación.
   - Permite diseñar y probar reglas, efectos visuales, locución TTS y contadores sin necesidad de estar transmitiendo en vivo.
   - Muestra claramente la insignia `[SIMULACIÓN]`.
2. **Modo Conexión Real TikTok LIVE:**
   - Requiere ejecutar el puente WebSocket local seguro en la máquina del streamer:
     ```bash
     npx @tiktok-live/connector --user tu_usuario_de_tiktok
     ```
   - Este puente escucha el flujo de la sala y expone un WebSocket local (`ws://localhost:21213`).
   - LiveTrigger AI se conecta a este puerto local, recibe los paquetes sin exponer credenciales a la red pública y los normaliza automáticamente.

---

## 3. Integración con OBS Studio

LiveTrigger AI incluye un motor de overlay transparente optimizado para motores de renderizado Chromium (CEF) de OBS Studio:

### URL de la Fuente de Navegador
```
https://[TU_DOMINIO_O_LOCALHOST]/?mode=overlay
```
* **Sin credenciales privadas en la URL:** La URL no transporta claves de API privadas ni secretos que puedan filtrarse durante una captura de pantalla en vivo.
* **Canal en Tiempo Real:** El overlay se comunica con el servidor backend mediante **Server-Sent Events (SSE)** en `/api/events/stream` y, a nivel de navegador local, a través de la API estándar **BroadcastChannel**.

### Pasos de Configuración en OBS Studio
1. Abre OBS Studio y selecciona la Escena donde desees mostrar las alertas.
2. En el panel **Fuentes (Sources)**, haz clic en **+** y añade una fuente **Navegador (Browser)**.
3. Asigna un nombre descriptivo: `LiveTrigger Alertas`.
4. En el campo **URL**, pega la URL con el parámetro `?mode=overlay`.
5. Configura las dimensiones del lienzo:
   - **Ancho:** `1920`
   - **Alto:** `1080`
   - **FPS:** `60`
6. Marca las casillas:
   - *Controlar audio a través de OBS* (para ecualizar o silenciar las alertas desde el mezclador de OBS).
   - *Actualizar el navegador cuando la escena se active*.
   - *Cerrar la fuente cuando no sea visible*.
7. Haz clic en **Aceptar**.

---

## 4. Garantías de Fiabilidad y Tolerancia a Fallos

1. **Aislamiento de Errores en Acciones:**
   Si una acción secundaria falla (por ejemplo, un enchufe inteligente IoT que no responde o un webhook externo caído), el motor captura la excepción de forma aislada, registra el aviso y continúa ejecutando las demás acciones (overlay visual, sonido, TTS y contadores).
2. **Reconexión con Espera Progresiva (Exponential Backoff):**
   Si la conexión con el directo se pierde (corte de internet o cambio de sala), el sistema reintenta la conexión tras intervalos crecientes:
   $$1\text{s} \to 2\text{s} \to 4\text{s} \to 8\text{s} \to 16\text{s} \to 30\text{s} \to 60\text{s}$$
   Alcanzado el límite máximo de 8 intentos fallidos, el conector entra en estado de seguridad (*Circuit Breaker*) y detiene los reintentos para evitar saturar la red.
3. **Deduplicación:**
   Todo evento recibido se coteja contra la caché de identificadores de los últimos 5 minutos. Si el proveedor retransmite un evento repetido, se descarta antes de llegar a la cola de ejecución.

---

## 5. Procedimiento de Verificación y Pruebas Automatizadas

LiveTrigger AI incluye una suite completa de pruebas unitarias y de integración que puede ejecutarse tanto en entorno local / CI como desde la interfaz visual:

### A. Ejecución de Pruebas por Consola (CLI)
Para correr la suite de 10 pruebas unitarias en consola:
```bash
npm test
# O alternativamente:
npx tsx test/unit_tests.ts
```

### B. Pruebas Validadas por la Suite:
1. **Normalización de eventos de TikTok LIVE (Regalo):** Verifica que paquetes crudos como `WebcastGiftMessage` se transformen en formato uniforme con nombre de regalo, conteo de diamantes y racha.
2. **Normalización de comentarios y palabras clave:** Verifica la captura limpia de mensajes y comandos como `!alerta`.
3. **Deduplicador por TTL e Identificador Único:** Garantiza que eventos reenviados por la red no se ejecuten dos veces.
4. **Evaluación de condiciones de reglas (Regalos y Umbrales):** Verifica filtros por nombre y diamantes mínimos.
5. **Validación de Seguridad y Anti-Inyección (Anti-SSRF):** Comprueba el rechazo de protocolos inseguros (`file://`, `ftp://`).
6. **Aislamiento de Fallos en Acciones (Fault Isolation):** Comprueba que un fallo forzado en un webhook o enchufe inteligente no interrumpa las alertas de overlay, sonido, locución TTS ni contadores.
7. **Reconexión Exponencial Progresiva:** Verifica que los intervalos aumenten ($1\text{s} \to 2\text{s} \to 4\text{s} \dots$) y respeten el límite máximo de 8 intentos.
8. **Arquitectura Desacoplada de Conectores (`ITikTokConnector`):** Valida la instanciación independiente de `SimulationConnector` y `BridgeTikTokConnector`.
9. **Persistencia de Estado en Disco:** Confirma la lectura y escritura íntegra de reglas y ajustes.
10. **Prevención de Ráfagas y Cooldown:** Asegura que una regla disparada recientemente no sature la pantalla antes de cumplir su tiempo de enfriamiento.

### C. Verificación Interactiva en la Interfaz:
- **Simulador (Pestaña Simulador):**
  - Haz clic en **"Ejecutar Pruebas Unitarias"** para ver el informe con 10/10 pruebas superadas en tiempo real.
  - Utiliza los botones rápidos de **Escenarios de Prueba Verificables** (`Rosa`, `Galaxia`, `León`, `Universo`, `!alerta`, `Caída Proveedor`).
- **Editor de Efectos (Pestaña Efectos & OBS):**
  - Utiliza el **Banco de Verificación Rápida de Animaciones** para probar cada uno de los 6 estilos visuales (`Lluvia Confeti`, `Jackpot Dorado`, `Lluvia de Rosas`, `Rayo Cibernético`, `Pulso Neón`, `Tarjeta VIP`) con sonido y renderizado de partículas simultáneo en el lienzo 16:9 y en OBS.

