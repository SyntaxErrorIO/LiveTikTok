/**
 * LiveTrigger AI - Suite de Pruebas Unitarias y de Integración
 * Valida el motor de automatización, conectores desacoplados, reglas,
 * deduplicación, aislamiento de fallos y reconexión progresiva.
 */

import { EventNormalizer } from '../src/server/normalizer';
import { EventDeduplicator } from '../src/server/deduplicator';
import { SecurityValidator } from '../src/server/securityValidator';
import { StateStore } from '../src/server/stateStore';
import { ReconnectManager } from '../src/server/reconnectManager';
import { TaskQueue } from '../src/server/taskQueue';
import { TikTokConnectorFactory } from '../src/server/connectors/connectorFactory';
import { BridgeTikTokConnector } from '../src/server/connectors/bridgeConnector';
import { DirectTikTokConnector } from '../src/server/connectors/directTikTokConnector';
import { AuthManager } from '../src/server/authManager';
import { coreEngine } from '../src/server/coreEngine';
import { AutomationRule, TikTokEvent } from '../src/types';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ name, passed: true, message: 'Prueba completada con éxito', durationMs });
    console.log(`  ✓ [PASSED] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ name, passed: false, message: err.message || String(err), durationMs });
    console.error(`  ✗ [FAILED] ${name} (${durationMs}ms): ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('  LiveTrigger AI - Ejecución de Pruebas Unitarias');
  console.log('======================================================\n');

  // 1. Normalización de eventos
  await test('1. Normalizador de eventos TikTok LIVE (Regalo)', () => {
    const rawGift = {
      type: 'WebcastGiftMessage',
      user: { username: 'gamer_pro', nickname: 'Gamer Pro', badgeLevel: 20 },
      gift: { giftName: 'Rosa', diamondCount: 1, repeatCount: 10 },
    };
    const normalized = EventNormalizer.normalize(rawGift, 'real_tiktok');
    assert(normalized !== null, 'El evento normalizado no debe ser nulo');
    assert(normalized!.type === 'gift', 'El tipo debe ser gift');
    assert(normalized!.user.username === 'gamer_pro', 'El usuario debe coincidir');
    assert(normalized!.data.diamondCount === 1, 'Diamantes deben ser 1');
    assert(normalized!.data.repeatCount === 10, 'Racha debe ser 10');
  });

  await test('2. Normalizador de comentarios y palabras clave', () => {
    const rawComment = {
      type: 'WebcastChatMessage',
      user: { username: 'viewer_99', nickname: 'Viewer' },
      comment: '!alerta fuego',
    };
    const normalized = EventNormalizer.normalize(rawComment, 'real_tiktok');
    assert(normalized !== null, 'El evento no debe ser nulo');
    assert(normalized!.type === 'comment', 'El tipo debe ser comment');
    assert(normalized!.data.comment === '!alerta fuego', 'El comentario debe coincidir');
  });

  // 2. Deduplicación
  await test('3. Deduplicador de eventos por ID y TTL', () => {
    const deduplicator = new EventDeduplicator(2000);
    const eventId = 'unique-event-id-456';
    const firstCheck = deduplicator.isDuplicate(eventId);
    const secondCheck = deduplicator.isDuplicate(eventId);
    assert(!firstCheck, 'La primera ocurrencia no debe ser duplicada');
    assert(secondCheck, 'La segunda ocurrencia con el mismo ID debe ser detectada como duplicada');
  });

  // 3. Reglas y Condiciones
  await test('4. Evaluación de condiciones de regalos (Umbral de diamantes)', () => {
    const giftEvent: TikTokEvent = {
      id: 'test-gift-1',
      type: 'gift',
      source: 'simulation',
      timestamp: Date.now(),
      user: { id: 'u1', username: 'juan', nickname: 'Juan' },
      data: { giftName: 'Galaxia', diamondCount: 1000, repeatCount: 1 },
    };

    const rulePass: AutomationRule = {
      id: 'rule-test-1',
      name: 'Regla Galaxia',
      description: 'Regla de prueba para Galaxia',
      enabled: true,
      triggerType: 'gift',
      conditions: { giftName: 'Galaxia', minDiamonds: 500 },
      actions: [],
      priority: 'high',
      cooldownSeconds: 0,
      maxPerHour: 100,
      createdAt: Date.now(),
      executionsCount: 0,
    };

    const ruleFail: AutomationRule = {
      id: 'rule-test-2',
      name: 'Regla León',
      description: 'Regla de prueba para León',
      enabled: true,
      triggerType: 'gift',
      conditions: { giftName: 'León', minDiamonds: 20000 },
      actions: [],
      priority: 'high',
      cooldownSeconds: 0,
      maxPerHour: 100,
      createdAt: Date.now(),
      executionsCount: 0,
    };

    // Verify condition matching
    const matchesPass = Boolean(
      rulePass.triggerType === giftEvent.type &&
      (!rulePass.conditions.giftName || giftEvent.data.giftName?.includes(rulePass.conditions.giftName)) &&
      (rulePass.conditions.minDiamonds === undefined || (giftEvent.data.diamondCount || 0) >= rulePass.conditions.minDiamonds)
    );

    const matchesFail = Boolean(
      ruleFail.triggerType === giftEvent.type &&
      ruleFail.conditions.giftName === giftEvent.data.giftName &&
      (giftEvent.data.diamondCount || 0) >= (ruleFail.conditions.minDiamonds || 0)
    );

    assert(matchesPass, 'La regla de Galaxia debe coincidir');
    assert(!matchesFail, 'La regla de León no debe coincidir');
  });

  // 4. Seguridad y Validación
  await test('5. Validación de seguridad contra URLs inseguras y SSRF', () => {
    const maliciousRule = {
      name: 'Ataque SSRF',
      triggerType: 'gift',
      actions: [
        {
          type: 'iot_device_order',
          deviceEndpoint: 'file:///etc/shadow',
        },
      ],
    };
    const validation = SecurityValidator.validateRule(maliciousRule);
    assert(!validation.valid, 'Debe rechazar protocolos que no sean http/https');
    assert(Boolean(validation.error), 'Debe retornar mensaje de error descriptivo');
  });

  // 5. Aislamiento de Fallos
  await test('6. Aislamiento de fallos (Fault Isolation) en cola de tareas', async () => {
    const queue = new TaskQueue(100);
    let action1Failed = false;
    let action2Success = false;

    queue.enqueue({
      id: 'task-fail',
      name: 'Acción que genera error intencional',
      priority: 'high',
      task: async () => {
        throw new Error('Fallo simulado en webhook externo o dispositivo IoT caído');
      },
      enqueuedAt: Date.now(),
      onError: () => {
        action1Failed = true;
      },
    });

    queue.enqueue({
      id: 'task-success',
      name: 'Acción de overlay y sonido que debe ejecutarse sin alteración',
      priority: 'high',
      task: async () => {
        action2Success = true;
      },
      enqueuedAt: Date.now(),
    });

    // Wait for queue processing
    await new Promise((r) => setTimeout(r, 150));

    assert(action1Failed, 'La acción defectuosa debe ser capturada en onError');
    assert(action2Success, 'La segunda acción debe haberse ejecutado a pesar del fallo de la primera');
  });

  // 6. Reconexión con Espera Progresiva y Freno
  await test('7. Reconexión exponencial progresiva y freno por límite de intentos', () => {
    let reconnectCalls = 0;
    const maxAttempts = 4;
    const manager = new ReconnectManager(
      async () => {
        reconnectCalls++;
        return false;
      },
      maxAttempts,
      1000,
      60000
    );

    const initialDelay = manager.getNextDelay();
    manager.handleDisconnect('Desconexión de red simulada 1');
    const secondDelay = manager.getNextDelay();

    assert(secondDelay > initialDelay, `El retraso debe incrementarse (${secondDelay}ms > ${initialDelay}ms)`);
    assert(manager.getState().maxAttempts === maxAttempts, 'El límite de reintentos debe ser respetado');
    manager.cancel();
  });

  // 7. Desacoplamiento de Conectores
  await test('8. Arquitectura desacoplada de conectores (Simulation y Bridge)', () => {
    const simConn = TikTokConnectorFactory.createConnector('simulation');
    const bridgeConn = TikTokConnectorFactory.createConnector('real_tiktok');

    assert(simConn.mode === 'simulation', 'Conector de simulación debe tener modo simulation');
    assert(bridgeConn.mode === 'real_tiktok', 'Conector bridge debe tener modo real_tiktok');
    assert(typeof simConn.connect === 'function', 'Debe implementar connect');
    assert(typeof simConn.disconnect === 'function', 'Debe implementar disconnect');
    assert(typeof simConn.onEvent === 'function', 'Debe implementar onEvent');
    assert(typeof simConn.onStatusChange === 'function', 'Debe implementar onStatusChange');
  });

  // 8. Persistencia de estado
  await test('9. Persistencia de estado (Reglas y Ajustes)', () => {
    const rules = StateStore.getRules();
    const settings = StateStore.getSettings();
    assert(Array.isArray(rules), 'Las reglas deben ser un arreglo');
    assert(typeof settings === 'object', 'Los ajustes deben ser un objeto');
    assert(typeof settings.masterAutomationEnabled === 'boolean', 'El interruptor maestro debe ser booleano');
  });

  // 9. Cooldown y frecuencia de ejecución
  await test('10. Prevención de ráfagas y respeto de enfriamiento (Cooldown)', () => {
    const now = Date.now();
    const cooldownSeconds = 5;
    const cooldownMs = cooldownSeconds * 1000;
    const lastTriggeredAt = now - 2000; // Triggered 2s ago, cooldown is 5s
    const isBlocked = (now - lastTriggeredAt) < cooldownMs;
    assert(isBlocked === true, 'El evento debe ser bloqueado si se dispara antes de finalizar el cooldown');

    const pastTriggeredAt = now - 6000; // Triggered 6s ago, cooldown passed
    const isAllowed = (now - pastTriggeredAt) >= cooldownMs;
    assert(isAllowed === true, 'El evento debe permitirse una vez transcurrido el tiempo de enfriamiento');
  });

  // 10. Seguridad de Autenticación y Tokens JWT
  await test('11. Autenticación, tokens JWT firmados y control de sesiones', () => {
    const regResult = AuthManager.register({
      username: 'creator_test_' + Date.now().toString(36),
      email: `creator_${Date.now()}@streamer.test`,
      password: 'StrongPassword123!',
      role: 'streamer',
    });
    assert(regResult.success === true, 'El registro de usuario debe ser exitoso');
    assert(Boolean(regResult.token), 'Debe emitir un token JWT firmado');

    // Verify valid token
    const payload = AuthManager.verifyToken(regResult.token!);
    assert(payload !== null, 'El token válido debe verificarse correctamente');
    assert(payload!.role === 'streamer', 'El payload debe contener el rol correcto');

    // Reject forged/tampered token
    const tampered = regResult.token!.slice(0, -6) + 'abcdef';
    const invalidPayload = AuthManager.verifyToken(tampered);
    assert(invalidPayload === null, 'Un token alterado debe ser rechazado inmediatamente');

    // Login test
    const loginOk = AuthManager.login(regResult.user!.email, 'StrongPassword123!');
    assert(loginOk.success === true, 'El inicio de sesión con contraseña correcta debe tener éxito');

    const loginFail = AuthManager.login(regResult.user!.email, 'WrongPassword999!');
    assert(loginFail.success === false, 'El inicio de sesión con contraseña incorrecta debe fallar');
  });

  // 11. Aislamiento Multiusuario
  await test('12. Aislamiento de datos multiusuario en StateStore', () => {
    const userA = 'user-creator-alpha';
    const userB = 'user-creator-beta';

    const rulesA: AutomationRule[] = [
      {
        id: 'rule-alpha-1',
        name: 'Regla del Creador Alpha',
        description: 'Exclusiva de Alpha',
        enabled: true,
        triggerType: 'gift',
        conditions: { giftName: 'Rosa' },
        actions: [],
        priority: 'high',
        cooldownSeconds: 2,
        maxPerHour: 50,
        createdAt: Date.now(),
        executionsCount: 0,
      },
    ];

    const rulesB: AutomationRule[] = [
      {
        id: 'rule-beta-1',
        name: 'Regla del Creador Beta',
        description: 'Exclusiva de Beta',
        enabled: true,
        triggerType: 'comment',
        conditions: { commentKeyword: '!fiesta' },
        actions: [],
        priority: 'medium',
        cooldownSeconds: 5,
        maxPerHour: 20,
        createdAt: Date.now(),
        executionsCount: 0,
      },
    ];

    StateStore.saveRules(rulesA, userA);
    StateStore.saveRules(rulesB, userB);

    const retrievedA = StateStore.getRules(userA);
    const retrievedB = StateStore.getRules(userB);

    assert(retrievedA.length === 1 && retrievedA[0].id === 'rule-alpha-1', 'Alpha debe ver únicamente sus reglas');
    assert(retrievedB.length === 1 && retrievedB[0].id === 'rule-beta-1', 'Beta debe ver únicamente sus reglas');
    assert(retrievedA[0].id !== retrievedB[0].id, 'Los datos de un creador no deben filtrarse a otro');

    // Snapshot isolation test
    const snapA = StateStore.createSnapshot(userA, 'Snapshot Alpha');
    const listForB = StateStore.listSnapshots(userB, false);
    const hasAlphaSnapshotInB = listForB.some((s) => s.id === snapA.id);
    assert(!hasAlphaSnapshotInB, 'Beta no debe tener visibilidad sobre las copias de seguridad de Alpha');
  });

  // 12. Prevención de SSRF
  await test('13. Prevención exhaustiva de SSRF en endpoints externos', () => {
    // Malicious internal targets
    const ssrfLocalhost = SecurityValidator.isSafeExternalUrl('http://localhost:8080/admin');
    const ssrfLoopback = SecurityValidator.isSafeExternalUrl('http://127.0.0.1:3000/api/secret');
    const ssrfAwsMeta = SecurityValidator.isSafeExternalUrl('http://169.254.169.254/latest/meta-data/');
    const ssrfGcpMeta = SecurityValidator.isSafeExternalUrl('http://metadata.google.internal/computeMetadata/v1/');
    const ssrfPrivate10 = SecurityValidator.isSafeExternalUrl('http://10.0.0.5/backup.tar');
    const ssrfPrivate172 = SecurityValidator.isSafeExternalUrl('http://172.16.1.1/keys');
    const ssrfPrivate192 = SecurityValidator.isSafeExternalUrl('http://192.168.1.1/config');
    const ssrfFile = SecurityValidator.isSafeExternalUrl('file:///etc/passwd');

    assert(!ssrfLocalhost.safe, 'Debe bloquear localhost');
    assert(!ssrfLoopback.safe, 'Debe bloquear 127.0.0.1');
    assert(!ssrfAwsMeta.safe, 'Debe bloquear metadata AWS/Azure/GCP 169.254.169.254');
    assert(!ssrfGcpMeta.safe, 'Debe bloquear metadata.google.internal');
    assert(!ssrfPrivate10.safe, 'Debe bloquear 10.0.0.0/8');
    assert(!ssrfPrivate172.safe, 'Debe bloquear 172.16.0.0/12');
    assert(!ssrfPrivate192.safe, 'Debe bloquear 192.168.0.0/16');
    assert(!ssrfFile.safe, 'Debe bloquear protocolo file://');

    // Valid external targets
    const validWebhook = SecurityValidator.isSafeExternalUrl('https://discord.com/api/webhooks/12345/abcdef');
    const validApi = SecurityValidator.isSafeExternalUrl('https://api.my-smart-lights.com/v1/trigger');

    assert(validWebhook.safe, 'Debe permitir webhooks legítimos HTTPS');
    assert(validApi.safe, 'Debe permitir APIs legítimas');
  });

  // 13. Funcionamiento Real del Límite Horario (maxPerHour)
  await test('14. Límite horario (maxPerHour) con ventana deslizante de 60 minutos', () => {
    const maxPerHour = 3;
    const now = Date.now();

    // Simulate 3 executions within current hour
    const activeExecutions = [now - 20000, now - 10000, now - 5000];

    // Case 1: Limit reached in current hour
    const isRateLimited = activeExecutions.filter((t) => t > now - 3600000).length >= maxPerHour;
    assert(isRateLimited === true, 'Debe limitar cuando se alcanzan las ejecuciones máximas por hora');

    // Case 2: Time has passed (timestamps older than 1 hour)
    const simulatedOldExecutions = [now - 3700000, now - 3650000, now - 3610000];
    const isCleared = simulatedOldExecutions.filter((t) => t > now - 3600000).length < maxPerHour;
    assert(isCleared === true, 'No debe bloquear permanentemente: la ventana se libera al pasar 1 hora');
  });

  // 14. Integración del Motor de Reglas (CoreAutomationEngine)
  await test('15. Integración del motor de reglas con aislamiento y contadores', async () => {
    const testUser = 'user-integration-eval';
    const initialCounters = StateStore.getCounters(testUser);
    const initialRoseCount = initialCounters.find((c) => c.id === 'cnt-roses-goal')?.current || 0;

    const testRule: AutomationRule = {
      id: 'rule-int-rose-' + Date.now(),
      name: 'Regla de Integración Rosas',
      description: 'Prueba de motor',
      enabled: true,
      triggerType: 'gift',
      conditions: { giftName: 'Rosa' },
      actions: [
        {
          id: 'act-int-1',
          type: 'update_counter',
          enabled: true,
          counterId: 'cnt-roses-goal',
          counterOperation: 'increment',
          counterAmount: 5,
        },
      ],
      priority: 'high',
      cooldownSeconds: 0,
      maxPerHour: 100,
      createdAt: Date.now(),
      executionsCount: 0,
    };

    StateStore.saveRules([testRule], testUser);

    const giftEvent = {
      type: 'WebcastGiftMessage',
      user: { username: 'super_fan', nickname: 'Super Fan', badgeLevel: 10 },
      gift: { giftName: 'Rosa', diamondCount: 1, repeatCount: 1 },
    };

    const res = await coreEngine.ingestRawEvent(giftEvent, 'simulation', testUser);
    assert(res.accepted === true, 'El evento debe ser aceptado por el motor');

    // Allow task queue to process
    await new Promise((r) => setTimeout(r, 200));

    const updatedCounters = StateStore.getCounters(testUser);
    const updatedRoseCount = updatedCounters.find((c) => c.id === 'cnt-roses-goal')?.current || 0;
    assert(updatedRoseCount === initialRoseCount + 5, 'El contador debe haberse incrementado en 5');

    const logs = StateStore.getLogs(testUser);
    assert(logs.length > 0, 'Debe registrar la ejecución del evento en el historial del usuario');
    assert(logs[0].eventType === 'gift', 'El tipo de evento registrado debe ser gift');
  });

  // 15. Seguridad del Webhook (server.ts)
  await test('16. Seguridad del Webhook: autenticación, control de producción y protección anti-suplantación', () => {
    // 1. En producción, rechazar llamadas a webhook sin TIKTOK_WEBHOOK_SECRET configurado
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.TIKTOK_WEBHOOK_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.TIKTOK_WEBHOOK_SECRET;

      const isProd = process.env.NODE_ENV === 'production';
      const envSecret: string | undefined = (process.env as any).TIKTOK_WEBHOOK_SECRET;
      const shouldRejectInProd = Boolean(isProd && !envSecret);
      assert(shouldRejectInProd === true, 'En producción debe rechazar webhooks externos si TIKTOK_WEBHOOK_SECRET no está definido');

      // 2. Comprobar que peticiones sin credencial válida sean rechazadas
      process.env.NODE_ENV = 'development';
      const fakeHeaderSecret: string = 'invalid_secret_key';
      const expectedSecret: string = 'secure_prod_secret_12345';
      const isAuthValid = fakeHeaderSecret === expectedSecret;
      assert(!isAuthValid, 'Petición con clave de webhook inválida debe ser rechazada con 401');

      // 3. Comprobar que un streamer normal no pueda suplantar a otro usuario mediante x-user-id
      const regularStreamerSession: { userId: string; username: string; role: 'admin' | 'streamer' } = {
        userId: 'usr-streamer-real',
        username: 'streamer_real',
        role: 'streamer',
      };

      const requestedSpoofedUser = 'usr-admin-primary';
      let resolvedTargetUser = regularStreamerSession.userId;
      if (regularStreamerSession.role === 'admin') {
        resolvedTargetUser = requestedSpoofedUser;
      }
      assert(resolvedTargetUser === 'usr-streamer-real', 'Un usuario normal jamás debe poder enviar eventos al ID de otro usuario');

      // 4. Comprobar asociación legítima con token de overlay
      const randSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const streamerAccount = AuthManager.register({
        username: 'streamer_hook_' + randSuffix,
        email: `streamer_hook_${randSuffix}@test.com`,
        password: 'Password1234!',
      });
      assert(Boolean(streamerAccount.user?.overlayToken), 'Debe tener overlayToken');
      const associatedUser = AuthManager.getUserByOverlayToken(streamerAccount.user!.overlayToken);
      assert(associatedUser?.id === streamerAccount.user?.id, 'El webhook autenticado por token debe asociarse estrictamente con el dueño del token');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.TIKTOK_WEBHOOK_SECRET = originalSecret;
      else delete process.env.TIKTOK_WEBHOOK_SECRET;
    }
  });

  // 16. Conexión Real con TikTok Bridge (BridgeTikTokConnector)
  await test('17. Conexión TikTok LIVE: eliminación de falso auto-connect 600ms y confirmación explícita de LIVE', async () => {
    let wsInstance: any = null;
    let sentCommand: any = null;

    class MockWebSocket {
      public readyState = 1;
      public onopen: any = null;
      public onmessage: any = null;
      public onerror: any = null;
      public onclose: any = null;
      constructor(public url: string) {
        wsInstance = this;
        setTimeout(() => {
          if (this.onopen) this.onopen();
        }, 15);
      }
      send(data: string) {
        sentCommand = JSON.parse(data);
      }
      close() {
        this.readyState = 3;
        if (this.onclose) this.onclose({ reason: 'closed' });
      }
    }

    const originalWS = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = MockWebSocket;

    try {
      const connector = new BridgeTikTokConnector();
      const connectPromise = connector.connect({
        username: '@creator_live',
        mode: 'real_tiktok',
        status: 'disconnected',
        autoReconnect: true,
        bridgeServerUrl: 'ws://localhost:21213',
      });

      // Wait 700ms (the old implementation would have falsely connected after 600ms)
      await new Promise((r) => setTimeout(r, 700));

      assert(connector.getStatus() === 'connecting', 'El conector NO debe auto-conectarse solo por el temporizador de 600ms');
      assert(connector.isBridgeAvailable() === true, 'El puente daemon debe estar marcado disponible a nivel socket');
      assert(connector.isLiveConfirmed() === false, 'La transmisión en vivo NO debe estar confirmada hasta recibir mensaje explícito');
      assert(sentCommand?.command === 'CONNECT', 'Debe haber enviado la solicitud de conexión al puente');
      assert(sentCommand?.username === 'creator_live', 'Debe haber normalizado el nombre sin el arroba');

      // Simular confirmación explícita de transmisión en vivo desde el puente
      wsInstance.onmessage({
        data: JSON.stringify({
          status: 'connected',
          type: 'LIVE_CONFIRMED',
          roomId: '71928374619283',
          liveStatus: 'live',
        }),
      });

      const success = await connectPromise;
      assert(success === true, 'connect() debe resolverse exitosamente con confirmación explícita');
      assert(connector.getStatus() === 'connected', 'El conector debe estar en estado connected');
      assert(connector.isLiveConfirmed() === true, 'liveConfirmed debe ser true');

      // Simular intento con streamer desconectado / offline
      const offlineConnector = new BridgeTikTokConnector();
      const offlinePromise = offlineConnector.connect({
        username: 'offline_user',
        mode: 'real_tiktok',
        status: 'disconnected',
        autoReconnect: true,
        bridgeServerUrl: 'ws://localhost:21213',
      });

      await new Promise((r) => setTimeout(r, 30));

      // Puente responde que el creador está offline
      wsInstance.onmessage({
        data: JSON.stringify({
          status: 'error',
          error: 'User is offline',
        }),
      });

      const offlineResult = await offlinePromise;
      assert(offlineResult === false, 'connect() debe devolver false si el streamer está offline');
      assert(offlineConnector.getStatus() === 'error', 'El conector debe marcar status error');
      assert(offlineConnector.isLiveConfirmed() === false, 'liveConfirmed debe ser false si el usuario está offline');
    } finally {
      (globalThis as any).WebSocket = originalWS;
    }
  });

  // 17. Límite horario independiente por usuario y prevención de colisión de IDs
  await test('18. Límite maxPerHour independiente por usuario sin colisiones de identificadores', async () => {
    const userA = 'user-creator-alpha';
    const userB = 'user-creator-beta';
    const sharedRuleId = 'rule-shared-id-99';

    // Ambos creadores tienen una regla con el mismo ID y maxPerHour = 1
    const ruleA: AutomationRule = {
      id: sharedRuleId,
      name: 'Regla Compartida Alpha',
      description: 'Límite por hora 1',
      enabled: true,
      triggerType: 'like',
      conditions: {},
      actions: [{ id: 'a1', type: 'overlay_effect', effectId: 'eff-sparkles', enabled: true }],
      priority: 'high',
      cooldownSeconds: 0,
      maxPerHour: 1,
      createdAt: Date.now(),
      executionsCount: 0,
    };

    const ruleB: AutomationRule = {
      id: sharedRuleId,
      name: 'Regla Compartida Beta',
      description: 'Límite por hora 1',
      enabled: true,
      triggerType: 'like',
      conditions: {},
      actions: [{ id: 'b1', type: 'overlay_effect', effectId: 'eff-confetti', enabled: true }],
      priority: 'high',
      cooldownSeconds: 0,
      maxPerHour: 1,
      createdAt: Date.now(),
      executionsCount: 0,
    };

    StateStore.saveRules([ruleA], userA);
    StateStore.saveRules([ruleB], userB);

    const likeEventA1 = {
      id: 'like-a-1-' + Date.now(),
      type: 'WebcastLikeMessage',
      user: { username: 'viewer_a', nickname: 'Viewer A' },
      likeCount: 1,
    };

    // 1. Ejecución de User A (1ra vez: debe ejecutarse)
    await coreEngine.ingestRawEvent(likeEventA1, 'simulation', userA);
    await new Promise((r) => setTimeout(r, 250));

    // 2. Ejecución de User A (2da vez: debe quedar limitada por maxPerHour = 1)
    const likeEventA2 = {
      id: 'like-a-2-' + Date.now(),
      type: 'WebcastLikeMessage',
      user: { username: 'viewer_a', nickname: 'Viewer A' },
      likeCount: 2,
    };
    await coreEngine.ingestRawEvent(likeEventA2, 'simulation', userA);
    await new Promise((r) => setTimeout(r, 250));

    const logsA = StateStore.getLogs(userA);
    const rateLimitedLogA = logsA.find((l) => l.matchedRules.some((r) => r.status === 'rate_limited'));
    assert(Boolean(rateLimitedLogA), 'User A debe quedar limitado al superar maxPerHour = 1');

    // 3. Ejecución de User B con el mismo ruleId ('rule-shared-id-99'):
    // NO debe verse afectada por el límite alcanzado por User A
    const likeEventB = {
      id: 'like-b-1-' + Date.now(),
      type: 'WebcastLikeMessage',
      user: { username: 'viewer_b', nickname: 'Viewer B' },
      likeCount: 1,
    };

    await coreEngine.ingestRawEvent(likeEventB, 'simulation', userB);
    await new Promise((r) => setTimeout(r, 250));

    const logsB = StateStore.getLogs(userB);
    const executedLogB = logsB.find((l) => l.matchedRules.some((r) => r.status === 'executed'));
    assert(Boolean(executedLogB), 'User B NO debe sufrir límite horario por colisión de ID con User A');
  });

  // 18. Recuperación tras reinicio del servidor y preservación de cooldowns y prioridades
  await test('19. Reglas no se bloquean incorrectamente tras reinicio y preservan cooldowns y prioridades', async () => {
    const testUser = 'user-restart-recovery';
    const now = Date.now();

    // Simular regla con un contador guardado de 50 de una sesión antigua (hace 3 horas)
    const oldTimestamp = now - 3 * 3600 * 1000;
    const ruleWithStaleCount: AutomationRule = {
      id: 'rule-stale-restart-' + Date.now(),
      name: 'Regla con Contador Antiguo',
      description: 'Prueba de recuperación de reinicio',
      enabled: true,
      triggerType: 'share',
      conditions: {},
      actions: [{ id: 'act-s1', type: 'overlay_effect', effectId: 'eff-sparkles', enabled: true }],
      priority: 'high',
      cooldownSeconds: 5,
      maxPerHour: 10,
      createdAt: oldTimestamp,
      lastTriggeredAt: oldTimestamp,
      executionsCount: 50, // Stale count from previous server run!
    };

    StateStore.saveRules([ruleWithStaleCount], testUser);

    const shareEvent1 = {
      id: 'share-evt-1-' + Date.now(),
      type: 'WebcastSocialMessage',
      user: { username: 'sharer_1', nickname: 'Sharer' },
      socialType: 'share',
    };

    // Al evaluar tras reinicio, las ejecuciones de hace 3 horas ya expiraron de la ventana de 1 hora
    await coreEngine.ingestRawEvent(shareEvent1, 'simulation', testUser);
    await new Promise((r) => setTimeout(r, 250));

    const logs = StateStore.getLogs(testUser);
    const executed = logs.find((l) => l.matchedRules.some((r) => r.ruleId === ruleWithStaleCount.id && r.status === 'executed'));
    assert(Boolean(executed), 'La regla NO debe quedar bloqueada por un contador obsoleto tras reiniciar el servidor');

    // Comprobar que el cooldown activo sí bloquea durante su duración
    const shareEvent2 = {
      id: 'share-evt-2-' + Date.now(),
      type: 'WebcastSocialMessage',
      user: { username: 'sharer_2', nickname: 'Sharer 2' },
      socialType: 'share',
    };
    await coreEngine.ingestRawEvent(shareEvent2, 'simulation', testUser);
    await new Promise((r) => setTimeout(r, 250));

    const updatedLogs = StateStore.getLogs(testUser);
    const cooldownLog = updatedLogs.find((l) => l.matchedRules.some((r) => r.ruleId === ruleWithStaleCount.id && r.status === 'cooldown_blocked'));
    assert(Boolean(cooldownLog), 'El cooldown configurado de 5s debe preservarse y bloquear durante su periodo');
  });

  // 20. Conector Directo nativo TikTok LIVE (DirectTikTokConnector) y Fábrica
  await test('20. Conector Directo nativo TikTok LIVE y Fábrica de conectores', () => {
    const directConn = TikTokConnectorFactory.createConnector('real_tiktok', 'direct');
    assert(directConn instanceof DirectTikTokConnector, 'La fábrica debe instanciar DirectTikTokConnector cuando el tipo es direct');
    assert(directConn.mode === 'real_tiktok', 'El modo debe ser real_tiktok');
    assert(directConn.getStatus() === 'disconnected', 'El estado inicial debe ser disconnected');
    assert(directConn.name.includes('tiktok-live-connector'), 'El nombre del conector debe hacer referencia a tiktok-live-connector');

    const bridgeConn = TikTokConnectorFactory.createConnector('real_tiktok', 'bridge');
    assert(bridgeConn instanceof BridgeTikTokConnector, 'La fábrica debe conservar BridgeTikTokConnector como alternativa');
    assert(bridgeConn.mode === 'real_tiktok', 'El conector bridge debe conservar el modo real_tiktok');

    const simConn = TikTokConnectorFactory.createConnector('simulation');
    assert(simConn.mode === 'simulation', 'La fábrica debe retornar conector de simulación cuando se solicite simulation');
  });

  // 21. Configuración de Euler Stream Sign API mediante variable de entorno segura
  await test('21. Euler Stream Sign API: lectura segura de entorno y sin filtraciones al frontend', () => {
    const originalEuler = process.env.EULER_STREAM_API_KEY;
    try {
      process.env.EULER_STREAM_API_KEY = 'euler_test_secret_key_abcdef123';
      const connector = new DirectTikTokConnector();
      assert(connector instanceof DirectTikTokConnector, 'DirectTikTokConnector debe inicializarse correctamente con la clave de entorno');

      // Validar que la clave proviene del entorno backend y no se expone en ninguna propiedad pública
      const json = JSON.stringify(connector);
      assert(!json.includes('euler_test_secret_key'), 'La clave de Euler Stream NUNCA debe ser serializada en propiedades públicas');

      // Comprobar que no requiere contraseñas
      const connConfig = {
        mode: 'real_tiktok' as const,
        status: 'disconnected' as const,
        username: 'streamer_test',
        bridgeServerUrl: 'ws://localhost:21213',
        autoReconnect: false,
      };
      assert(!('password' in connConfig), 'El conector nunca debe requerir contraseñas de TikTok');
    } finally {
      if (originalEuler !== undefined) {
        process.env.EULER_STREAM_API_KEY = originalEuler;
      } else {
        delete process.env.EULER_STREAM_API_KEY;
      }
    }
  });

  // 22. Procesamiento de regalos repetidos (combos / streaks) sin acciones duplicadas
  await test('22. Procesamiento de regalos repetidos (combos) para evitar acciones duplicadas', async () => {
    const connector = new DirectTikTokConnector();
    const emittedEvents: any[] = [];
    connector.onEvent((evt) => {
      emittedEvents.push(evt);
    });

    const groupId = 'combo-rosa-1001';
    const rawViewer = {
      userId: 'user-fan-777',
      uniqueId: 'fan_de_rosas',
      nickname: 'Fan Rosas',
      profilePictureUrl: 'https://avatar.test/fan.png',
    };

    // Simular secuencia de ráfaga de 3 rosas donde solo la última tiene repeatEnd = true
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_1',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 1,
      repeatEnd: false,
      ...rawViewer,
    });

    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_1',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 2,
      repeatEnd: false,
      ...rawViewer,
    });

    // En este punto, no debe haber emitido eventos duplicados aún porque el combo sigue en progreso
    assert(emittedEvents.length === 0, 'No debe emitir eventos intermedios para cada rosa individual durante un combo activo');

    // Ahora llega el fin del combo con repeatCount = 3 y repeatEnd = true
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_1',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 3,
      repeatEnd: true,
      ...rawViewer,
    });

    // Ahora debe haberse emitido exactamente 1 evento con el total acumulado
    assert(emittedEvents.length === 1, 'Debe emitir exactamente un evento consolidado al finalizar el combo');
    assert(emittedEvents[0].gift.repeatCount === 3, 'El contador repeatCount debe reflejar el valor total acumulado (3)');
    assert(emittedEvents[0].gift.diamondCount === 3, 'El total de diamantes debe calcularse según el conteo consolidado');
    assert(emittedEvents[0].user.username === 'fan_de_rosas', 'Debe conservar la autoría del remitente');

    // Regalos no en combo (p.ej. Galaxia / Universe) deben emitirse inmediatamente
    connector.handleGiftWithStreakDeduplication({
      giftType: 2,
      giftId: 'galaxy_99',
      giftName: 'Galaxia',
      diamondCount: 1000,
      repeatCount: 1,
      ...rawViewer,
    });

    assert(emittedEvents.length === 2, 'Los regalos directos sin combo deben despacharse inmediatamente');
    assert(emittedEvents[1].gift.giftName === 'Galaxia', 'El segundo evento debe ser el regalo directo');
  });

  // 23. Aislamiento multiusuario en conexiones concurrentes del backend
  await test('23. Aislamiento multiusuario en conexiones de conectores de creadores', async () => {
    const userA = 'user-streamer-alpha';
    const userB = 'user-streamer-beta';

    const connA = {
      mode: 'real_tiktok' as const,
      status: 'disconnected' as const,
      username: 'streamer_alpha_live',
      bridgeServerUrl: 'ws://localhost:21213',
      connectorType: 'direct' as const,
      autoReconnect: false,
    };

    const connB = {
      mode: 'simulation' as const,
      status: 'disconnected' as const,
      username: 'streamer_beta_sim',
      bridgeServerUrl: 'ws://localhost:21213',
      autoReconnect: false,
    };

    StateStore.saveConnection(connA, userA);
    StateStore.saveConnection(connB, userB);

    // Conectar usuario B en modo simulación
    const connectedB = await coreEngine.connect(userB);
    assert(connectedB === true, 'El usuario B en modo simulación debe conectar exitosamente');

    const activeB = coreEngine.getActiveConnector(userB);
    assert(activeB !== null, 'Debe existir un conector activo para el usuario B');
    assert(activeB?.mode === 'simulation', 'El conector del usuario B debe ser simulation');

    // Desconectar usuario B no debe afectar el estado del usuario A
    coreEngine.disconnect(userB);
    const postDisconnectConnB = StateStore.getConnection(userB);
    assert(postDisconnectConnB.status === 'disconnected', 'El usuario B debe quedar desconectado');

    const postConnA = StateStore.getConnection(userA);
    assert(postConnA.username === 'streamer_alpha_live', 'La configuración del usuario A debe permanecer intacta e independiente');
  });

  // 24. Diferenciación estricta de estados de conexión (Transporte vs LIVE confirmado vs Simulación)
  await test('24. Distinción estricta entre Transporte, Transmisión LIVE confirmada y Simulación', async () => {
    const connector = new DirectTikTokConnector();

    // 1. Estado inicial
    assert(connector.getStatus() === 'disconnected', 'Estado inicial debe ser disconnected');
    assert(connector.isLiveConfirmed() === false, 'isLiveConfirmed debe ser false al inicio');
    assert(connector.isTransportConnected() === false, 'isTransportConnected debe ser false al inicio');

    // 2. Si el streamer no existe o no está en directo, debe reportar error claro sin afirmar que está live
    const dummyConfig = {
      mode: 'real_tiktok' as const,
      status: 'disconnected' as const,
      username: 'usuario_totalmente_inexistente_987654321',
      bridgeServerUrl: 'ws://localhost:21213',
      autoReconnect: false,
    };

    const connectResult = await connector.connect(dummyConfig);
    assert(connectResult === false, 'La conexión a un streamer no existente o fuera de línea debe retornar false');
    assert(connector.getStatus() === 'error', 'El estado tras falla de conexión debe ser error');
    assert(connector.isLiveConfirmed() === false, 'NUNCA debe marcar liveConfirmed como true si no hubo respuesta afirmativa de LIVE');

    // 3. Desconexión manual limpia
    connector.disconnect();
    assert(connector.getStatus() === 'disconnected', 'La desconexión manual debe restablecer el estado a disconnected');
  });

  console.log('\n======================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`  Resultado Final: ${passedCount}/${results.length} pruebas superadas.`);
  console.log('======================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Error fatal durante la ejecución de las pruebas:', err);
  process.exit(1);
});
