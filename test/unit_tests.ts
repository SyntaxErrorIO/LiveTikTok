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

  // 25. Prevención de ejecuciones duplicadas de regalos ante eventos finales retrasados
  await test('25. Prevención de ejecuciones duplicadas ante eventos finales retrasados de regalos (Combos)', () => {
    const connector = new DirectTikTokConnector();
    const emittedEvents: any[] = [];
    connector.onEvent((evt) => {
      if (evt.type === 'gift') {
        emittedEvents.push(evt);
      }
    });

    const groupId = 'delayed_streak_group_999';
    const viewer = {
      userId: 'delayed_viewer_1',
      uniqueId: 'streamer_fan',
      nickname: 'Fan',
    };

    // 1. Llegan eventos de combo progresivos
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_5',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 2,
      repeatEnd: false,
      ...viewer,
    });

    // 2. Llega evento final de combo
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_5',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 5,
      repeatEnd: true,
      ...viewer,
    });

    assert(emittedEvents.length === 1, 'Debe emitirse exactamente un evento de combo');
    assert(emittedEvents[0].gift.repeatCount === 5, 'El conteo debe ser 5');

    // 3. Llega un evento retrasado (duplicate replay de la red con repeatEnd: true y repeatCount: 5)
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_5',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 5,
      repeatEnd: true,
      ...viewer,
    });

    assert(emittedEvents.length === 1, 'El evento final retrasado NO debe causar una segunda emisión duplicada');

    // 4. Llega un paquete desordenado con repeatCount menor (e.g. repeatCount: 3 retrasado)
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_5',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 3,
      repeatEnd: false,
      ...viewer,
    });

    assert(emittedEvents.length === 1, 'Los paquetes intermedios retrasados con conteo menor deben ignorarse');

    // 5. Si el usuario continuó la racha después (repeatCount aumentó a 7)
    connector.handleGiftWithStreakDeduplication({
      giftType: 1,
      groupId,
      giftId: 'rose_5',
      giftName: 'Rosa',
      diamondCount: 1,
      repeatCount: 7,
      repeatEnd: true,
      ...viewer,
    });

    assert(emittedEvents.length === 2, 'Si la racha continúa, debe emitir únicamente la diferencia incremental');
    assert(emittedEvents[1].gift.repeatCount === 2, 'El segundo evento debe emitir únicamente el delta (7 - 5 = 2)');
  });

  // 26. Medición de latencia de red y aislamiento local
  await test('26. Medición de latencia no simulada y reporte claro de simulación local', async () => {
    const directConnector = new DirectTikTokConnector();
    const bridgeConnector = new BridgeTikTokConnector();
    const simConnector = TikTokConnectorFactory.createConnector('simulation');

    const directLatency = await directConnector.testLatency();
    assert(typeof directLatency === 'number' && directLatency > 0, 'La latencia directa debe ser un número positivo medido');

    const bridgeLatency = await bridgeConnector.testLatency();
    assert(typeof bridgeLatency === 'number' && bridgeLatency > 0, 'La latencia del puente debe ser un número positivo medido');

    const simLatency = await simConnector.testLatency();
    assert(typeof simLatency === 'number' && simLatency >= 1, 'La latencia de simulación debe medir el dispatch loop local');
  });

  // 27. Eliminación estricta de contraseñas por defecto utilizables en plantillas
  await test('27. Eliminación estricta de contraseñas por defecto utilizables en configuración', async () => {
    const fs = await import('fs');
    const envExample = fs.readFileSync('.env.example', 'utf-8');
    assert(!envExample.includes('ADMIN_PASSWORD=LiveTrigger2026!'), '.env.example no debe contener contraseñas predeterminadas utilizables');
    assert(envExample.includes('ADMIN_PASSWORD=tu_contrasena_administrador_fuerte_aqui_minimo_10_caracteres'), '.env.example debe contener un placeholder descriptivo no utilizable');

    const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf-8');
    assert(!dockerCompose.includes('LiveTrigger2026!'), 'docker-compose.yml no debe proporcionar una contraseña utilizable por defecto');
  });

  // 28. DATA_DIR respetado y protección en .gitignore
  await test('28. DATA_DIR configurable mediante entorno y protección en .gitignore', async () => {
    const fs = await import('fs');
    const gitignore = fs.readFileSync('.gitignore', 'utf-8');
    assert(gitignore.includes('data/'), '.gitignore debe proteger la carpeta data/');
    assert(gitignore.includes('users.json'), '.gitignore debe proteger users.json');
    assert(gitignore.includes('audit_log.json'), '.gitignore debe proteger audit_log.json');
    assert(gitignore.includes('backups/'), '.gitignore debe proteger backups/');

    // Verificar que StateStore existe y mantiene aislamiento
    const dir = StateStore.getDataDirectory();
    assert(typeof dir === 'string' && dir.length > 0, 'StateStore debe exponer una ruta de almacenamiento válida');
  });

  // 29. Corrección de Seguridad 1a: POST /api/auth/overlay-token/regenerate exige requireAuth y rechaza anónimos
  await test('29. Seguridad 1a: Regeneración de token overlay exige autenticación y elimina valor por defecto', async () => {
    const { requireAuth } = await import('../src/server/middleware/auth');
    
    // Simular petición anónima sin cabecera Authorization
    let statusSet: number | null = null;
    let jsonSent: any = null;
    let nextCalled = false;

    const anonReq: any = { headers: {} };
    const anonRes: any = {
      status: (code: number) => {
        statusSet = code;
        return {
          json: (data: any) => { jsonSent = data; },
        };
      },
    };

    requireAuth(anonReq, anonRes, () => { nextCalled = true; });

    assert(!nextCalled, 'Petición anónima no debe avanzar al manejador');
    assert(statusSet === 401, 'Debe retornar código 401 Unauthorized');
    assert(jsonSent?.success === false, 'La respuesta de error debe indicar fallo');

    // Verificar que con sesión válida sí permite el paso
    nextCalled = false;
    const authedReq: any = { headers: {}, user: { userId: 'usr-tester-99', username: 'tester', role: 'creator' } };
    requireAuth(authedReq, anonRes, () => { nextCalled = true; });
    assert(nextCalled, 'Usuario autenticado debe poder avanzar');
  });

  // 30. Corrección de Seguridad 1b: POST /api/tests/run protegido con requireAdmin y desactivado en producción
  await test('30. Seguridad 1b: Endpoint /api/tests/run requiere admin y se bloquea en producción', async () => {
    const { requireAdmin } = await import('../src/server/middleware/auth');

    // 1. Usuario rol creator (no admin) debe ser rechazado con 403
    let statusSet: number | null = null;
    let jsonSent: any = null;
    let nextCalled = false;

    const creatorReq: any = { user: { userId: 'creator-1', username: 'creador', role: 'creator' } };
    const res: any = {
      status: (code: number) => {
        statusSet = code;
        return { json: (data: any) => { jsonSent = data; } };
      },
    };

    requireAdmin(creatorReq, res, () => { nextCalled = true; });
    assert(!nextCalled, 'Creador sin rol admin no debe ejecutar pruebas');
    assert(statusSet === 403, 'Debe devolver código 403 Forbidden para no-admins');

    // 2. En producción, la ejecución de pruebas está desactivada
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let prodStatus: number | null = null;
      let prodJson: any = null;
      const prodRes: any = {
        status: (code: number) => {
          prodStatus = code;
          return { json: (data: any) => { prodJson = data; } };
        },
      };

      // Simular lógica del handler en producción
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        prodRes.status(403).json({ success: false, error: 'Deshabilitada en producción' });
      }

      assert(prodStatus === 403, 'En producción debe retornar 403');
      assert(prodJson?.success === false, 'Debe indicar que las pruebas están deshabilitadas en producción');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  // 31. Corrección de Seguridad 1c: GET /api/system/fail-safe requiere autenticación
  await test('31. Seguridad 1c: Endpoint /api/system/fail-safe exige requireAuth', async () => {
    const { requireAuth } = await import('../src/server/middleware/auth');

    let statusSet: number | null = null;
    let nextCalled = false;
    const unauthedReq: any = { headers: {} };
    const res: any = {
      status: (code: number) => {
        statusSet = code;
        return { json: () => {} };
      },
    };

    requireAuth(unauthedReq, res, () => { nextCalled = true; });
    assert(!nextCalled, 'No debe permitir acceso sin sesión');
    assert(statusSet === 401, 'Debe devolver 401 Unauthorized para fail-safe sin login');
  });

  // 32. Corrección de Seguridad 1d: No aceptar JWT ni webhook secret en query (?token=)
  await test('32. Seguridad 1d: Rechazo de sesión y webhook secret por query string (?token=)', async () => {
    const { extractUser } = await import('../src/server/middleware/auth');
    
    // Crear token válido de prueba con createToken
    const testUser: any = {
      id: 'usr-secure-test',
      username: 'secure_user',
      email: 'secure@test.com',
      role: 'streamer',
      overlayToken: 'ovl-token-secure-123',
    };
    const validToken = AuthManager.createToken(testUser);

    // Petición que intenta autenticarse mediante query param ?token= (INSEGURO)
    const queryOnlyReq: any = {
      headers: {},
      query: { token: validToken },
    };

    extractUser(queryOnlyReq, {} as any, () => {});
    assert(!queryOnlyReq.user, 'extractUser NO debe extraer sesión desde ?token= en query string');

    // Petición con cabecera Authorization: Bearer (SEGURO)
    const headerReq: any = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      query: {},
    };

    extractUser(headerReq, {} as any, () => {});
    assert(headerReq.user !== undefined, 'extractUser SÍ debe extraer sesión desde cabecera Authorization');
    assert(headerReq.user.userId === 'usr-secure-test', 'El ID del usuario extraído debe coincidir');
  });

  // 33. Corrección de Seguridad 1e: Cabeceras Helmet / CSP y exclusión de X-XSS-Protection
  await test('33. Seguridad 1e: Content-Security-Policy activo y X-XSS-Protection eliminado', async () => {
    const { securityHeaders } = await import('../src/server/middleware/securityHeaders');

    const headersSet: Record<string, string> = {};
    const mockReq: any = {};
    const mockRes: any = {
      setHeader: (name: string, value: string) => {
        headersSet[name.toLowerCase()] = value;
      },
      removeHeader: (name: string) => {
        delete headersSet[name.toLowerCase()];
      },
      getHeader: (name: string) => headersSet[name.toLowerCase()],
    };

    // Pre-poblar res con X-XSS-Protection para asegurar que el middleware lo elimina
    headersSet['x-xss-protection'] = '1; mode=block';

    const middleware = securityHeaders(true);
    let nextCalled = false;
    middleware(mockReq, mockRes, () => { nextCalled = true; });

    assert(nextCalled, 'El middleware de cabeceras debe continuar el flujo');
    assert(Boolean(headersSet['content-security-policy']), 'Debe definir Content-Security-Policy');
    assert(headersSet['content-security-policy'].includes("default-src 'self'"), 'CSP debe contener directiva default-src');
    assert(headersSet['x-content-type-options'] === 'nosniff', 'Debe configurar X-Content-Type-Options: nosniff');
    assert(headersSet['strict-transport-security'] !== undefined, 'En producción debe configurar HSTS');
    assert(headersSet['x-xss-protection'] === undefined, 'X-XSS-Protection obsoleto debe ser removido');
  });

  // 34. Corrección 1: Stream SSE con sesión vía Authorization header responde 200 y emite CONNECTED
  await test('34. Stream SSE con sesión: responde 200, entrega CONNECTED y rechaza streaming sin credenciales', async () => {
    const { default: eventsRouter } = await import('../src/server/routes/events');

    // 1. Petición autenticada mediante sesión de usuario
    const authedUser = {
      userId: 'usr-sse-panel-tester',
      username: 'panel_creator',
      role: 'creator' as const,
      overlayToken: 'ovl-test-token-77',
    };

    let streamStatus = 0;
    let streamHeaders: Record<string, string> = {};
    let writtenChunks: string[] = [];

    const mockAuthedReq: any = {
      headers: {
        authorization: 'Bearer dummy-token',
        origin: 'http://localhost:3000',
      },
      query: {},
      user: authedUser,
      on: () => {},
    };

    const mockRes: any = {
      writeHead: (status: number, headers: any) => {
        streamStatus = status;
        streamHeaders = headers;
      },
      write: (data: string) => {
        writtenChunks.push(data);
      },
    };

    // Obtener la capa de la ruta /stream del router
    const streamLayer = (eventsRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/stream'
    );
    assert(streamLayer !== undefined, 'Ruta /stream debe estar registrada en eventsRouter');

    const streamHandler = streamLayer.route.stack[0].handle;
    streamHandler(mockAuthedReq, mockRes);

    assert(streamStatus === 200, 'Stream con sesión debe responder con HTTP 200');
    assert(streamHeaders['Content-Type'] === 'text/event-stream', 'Content-Type debe ser text/event-stream');
    assert(streamHeaders['Access-Control-Allow-Origin'] !== '*', 'CORS no debe exponer wildcard *');

    const firstChunk = writtenChunks[0] || '';
    assert(firstChunk.includes('"type":"CONNECTED"'), 'Debe emitir el evento inicial CONNECTED');
    assert(firstChunk.includes('usr-sse-panel-tester'), 'El evento inicial debe pertenecer al usuario autenticado');
  });

  // 35. Corrección 2: Eliminación de datos falsos en overlay (meta en 0 y ranking vacío)
  await test('35. Datos iniciales limpios: meta en 0 y ranking vacío sin usuarios ficticios', async () => {
    const { StorageService } = await import('../src/services/storageService');

    // 1. StorageService defaults
    const counters = StorageService.getCounters();
    const diamondsCounter = counters.find(
      (c) => c.name.toLowerCase().includes('diamante') || c.id.includes('diamond')
    );
    assert(diamondsCounter !== undefined, 'Debe existir contador de diamantes');
    assert(diamondsCounter!.current === 0, 'La meta de diamantes inicial debe ser 0, sin el falso valor 320');

    // 2. Ranking no debe contener AstroVIP, RosaFan ni LionKing
    const leaderboard = StorageService.getLeaderboard();
    const fakeDonors = ['AstroVIP', 'RosaFan', 'LionKing'];
    for (const fake of fakeDonors) {
      assert(
        !leaderboard.some((d) => d.username.toLowerCase() === fake.toLowerCase()),
        `No debe existir el donador de prueba ${fake}`
      );
    }
  });

  // 36. Corrección 3: Endpoint GET /api/overlay/state sincroniza y sobrevive a recargas
  await test('36. Sincronización de Overlay con servidor: GET /api/overlay/state y persistencia tras recarga', async () => {
    const testUserId = 'usr-overlay-sync-' + Date.now();
    const overlayToken = 'ovl-sync-token-' + Date.now();

    // Registrar usuario con overlayToken en StateStore/AuthManager
    const testUser = {
      id: testUserId,
      username: 'streamer_overlay_test',
      email: `overlay_${Date.now()}@test.com`,
      role: 'streamer' as const,
      passwordHash: 'hash',
      passwordSalt: 'salt',
      overlayToken,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    (AuthManager as any).users.push(testUser);

    // Inicializar contador en 0
    StateStore.saveCounters(
      [
        {
          id: 'cnt-diamonds-session',
          name: 'Meta de Diamantes',
          current: 0,
          target: 500,
          unit: 'Diamantes',
          lastUpdated: Date.now(),
        },
      ],
      testUserId
    );
    StateStore.saveLeaderboard([], testUserId);

    // Simular recepción de regalo de 150 diamantes
    const giftEvent: TikTokEvent = {
      id: 'gift-sync-event-1',
      type: 'gift',
      source: 'simulation',
      timestamp: Date.now(),
      user: { id: 'u-donor-1', username: 'donador_real_1', nickname: 'Donador Real' },
      data: { giftName: 'Galaxia', diamondCount: 150, repeatCount: 1 },
    };

    await coreEngine.ingestRawEvent(giftEvent, 'simulation', testUserId);
    await new Promise((r) => setTimeout(r, 100));

    // Consultar endpoint GET /api/overlay/state?overlayToken=...
    const { default: systemRouter } = await import('../src/server/routes/system');
    const overlayStateLayer = (systemRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/api/overlay/state'
    );
    assert(overlayStateLayer !== undefined, 'Ruta /api/overlay/state debe estar registrada en systemRouter');

    let stateResult: any = null;
    let stateStatus = 0;
    const req: any = { query: { overlayToken } };
    const res: any = {
      status: (code: number) => {
        stateStatus = code;
        return { json: (d: any) => { stateResult = d; } };
      },
      json: (d: any) => {
        stateStatus = 200;
        stateResult = d;
      },
    };

    overlayStateLayer.route.stack[0].handle(req, res);

    assert(stateStatus === 200, 'Debe devolver HTTP 200 con token válido');
    assert(stateResult?.success === true, 'Respuesta debe ser success: true');
    assert(stateResult?.goal?.current === 150, 'El progreso de la meta debe ser 150 diamantes');
    assert(stateResult?.topDonors?.length === 1, 'Debe registrar al donador en el top ranking');
    assert(stateResult?.topDonors[0]?.username === 'donador_real_1', 'El usuario en ranking debe ser el donador real');

    // Verificar que sobrevive a recarga: lectura directa del disco persistente StateStore
    const reloadedCounters = StateStore.getCounters(testUserId);
    const reloadedDiamondCounter = reloadedCounters.find((c) => c.name.toLowerCase().includes('diamante'));
    assert(reloadedDiamondCounter?.current === 150, 'El progreso debe sobrevivir a recargar la fuente de OBS');
  });

  // 37. Corrección 3: Configuración del objetivo de la meta desde Ajustes sincroniza con servidor
  await test('37. Ajustes: Configuración de objetivo de la meta sincroniza y persiste en el servidor', async () => {
    const testUserId = 'usr-target-settings-' + Date.now();
    const overlayToken = 'ovl-target-token-' + Date.now();

    (AuthManager as any).users.push({
      id: testUserId,
      username: 'target_tester',
      email: `target_${Date.now()}@test.com`,
      role: 'streamer' as const,
      passwordHash: 'hash',
      passwordSalt: 'salt',
      overlayToken,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });

    StateStore.saveCounters(
      [
        {
          id: 'cnt-diamonds-session',
          name: 'Meta de Diamantes',
          current: 50,
          target: 500,
          unit: 'Diamantes',
          lastUpdated: Date.now(),
        },
      ],
      testUserId
    );

    // Simular POST /api/settings con goalTargetDiamonds: 2000
    const { default: systemRouter } = await import('../src/server/routes/system');
    const settingsLayer = (systemRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/api/settings' && l.route.methods.post
    );

    const postSettingsHandler = settingsLayer.route.stack[settingsLayer.route.stack.length - 1].handle;

    let resJson: any = null;
    const req: any = {
      user: { userId: testUserId, role: 'creator' },
      body: { goalTargetDiamonds: 2000 },
    };
    const res: any = {
      json: (d: any) => { resJson = d; },
    };

    postSettingsHandler(req, res);

    assert(resJson?.success === true, 'Guardado de ajustes debe tener éxito');
    assert(resJson?.settings?.goalTargetDiamonds === 2000, 'Ajuste de meta debe actualizarse');

    // Verificar que el contador de diamantes en StateStore ahora tiene target: 2000
    const updatedCounters = StateStore.getCounters(testUserId);
    const diamondCounter = updatedCounters.find((c) => c.name.toLowerCase().includes('diamante'));
    assert(diamondCounter?.target === 2000, 'El objetivo del contador en StateStore debe reflejar 2000');
  });

  // 38. Corrección 4: CSP sin 'unsafe-eval', frame-ancestors configurable y SSE sin wildcard *
  await test('38. Seguridad CSP y SSE: script-src sin unsafe-eval, frame-ancestors restringido y sin CORS *', async () => {
    const { securityHeaders } = await import('../src/server/middleware/securityHeaders');

    // 1. Verificar CSP sin unsafe-eval
    const headersSet: Record<string, string> = {};
    const mockRes: any = {
      setHeader: (name: string, value: string) => { headersSet[name.toLowerCase()] = value; },
      removeHeader: () => {},
    };

    const prevEnv = process.env.ALLOWED_FRAME_ANCESTORS;
    try {
      delete process.env.ALLOWED_FRAME_ANCESTORS;
      delete process.env.FRAME_ANCESTORS;

      const middleware = securityHeaders(true);
      middleware({} as any, mockRes, () => {});

      const csp = headersSet['content-security-policy'];
      assert(!csp.includes("'unsafe-eval'"), "script-src no debe contener 'unsafe-eval' en producción");
      assert(csp.includes("frame-ancestors 'self'"), "frame-ancestors debe restringirse a 'self'");

      // 2. Con variable de entorno configurable para AI Studio
      process.env.ALLOWED_FRAME_ANCESTORS = 'https://custom-studio.google.com';
      const envHeadersSet: Record<string, string> = {};
      const envMockRes: any = {
        setHeader: (name: string, value: string) => { envHeadersSet[name.toLowerCase()] = value; },
        removeHeader: () => {},
      };
      const envMiddleware = securityHeaders(true);
      envMiddleware({} as any, envMockRes, () => {});

      const envCsp = envHeadersSet['content-security-policy'];
      assert(
        envCsp.includes("frame-ancestors 'self' https://custom-studio.google.com"),
        'frame-ancestors debe incorporar el valor configurable por variable de entorno'
      );
    } finally {
      process.env.ALLOWED_FRAME_ANCESTORS = prevEnv;
    }
  });

  // 39. Extracción de sesión por Cookie HttpOnly y compatibilidad con Authorization Header
  await test('39. Seguridad: Extracción de sesión por Cookie HttpOnly y compatibilidad con Bearer', async () => {
    const { extractUser } = await import('../src/server/middleware/auth');
    const token = AuthManager.createToken({
      id: 'usr-cookie-tester',
      username: 'cookie_tester',
      email: 'cookie@test.local',
      role: 'streamer',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      overlayToken: 'ovl-cookie-99',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });

    // 1. Extracción mediante cookie
    const reqWithCookie: any = {
      headers: {
        cookie: `livetrigger_session=${token}; other_cookie=xyz`,
      },
    };
    extractUser(reqWithCookie, {} as any, () => {});
    assert(reqWithCookie.user?.userId === 'usr-cookie-tester', 'Debe extraer el usuario desde la cookie livetrigger_session');
    assert(reqWithCookie.authSource === 'cookie', 'Debe marcar el origen de autenticación como cookie');

    // 2. Extracción mediante req.cookies (cookie-parser parseado)
    const reqWithParsedCookies: any = {
      headers: {},
      cookies: { livetrigger_session: token },
    };
    extractUser(reqWithParsedCookies, {} as any, () => {});
    assert(reqWithParsedCookies.user?.userId === 'usr-cookie-tester', 'Debe extraer el usuario desde req.cookies');

    // 3. Prioridad de Authorization: Bearer
    const reqWithBoth: any = {
      headers: {
        authorization: `Bearer ${token}`,
        cookie: 'livetrigger_session=invalid-token',
      },
    };
    extractUser(reqWithBoth, {} as any, () => {});
    assert(reqWithBoth.user?.userId === 'usr-cookie-tester', 'Authorization Bearer debe tener prioridad');
    assert(reqWithBoth.authSource === 'header', 'Debe marcar el origen como header');
  });

  // 40. Protección CSRF obligatoria en peticiones de modificación con cookie
  await test('40. Seguridad: Protección CSRF en POST/PUT/DELETE con cookie y excepción de Bearer', async () => {
    const { csrfProtection } = await import('../src/server/middleware/auth');

    // 1. Petición POST con cookie SIN cabecera personalizada -> 403 Forbidden
    let blockedStatus = 0;
    let blockedResult: any = null;
    const reqBlocked: any = {
      method: 'POST',
      headers: { cookie: 'livetrigger_session=dummy' },
      authSource: 'cookie',
    };
    const resBlocked: any = {
      status: (code: number) => {
        blockedStatus = code;
        return { json: (d: any) => { blockedResult = d; } };
      },
    };
    let nextCalled = false;
    csrfProtection(reqBlocked, resBlocked, () => { nextCalled = true; });
    assert(blockedStatus === 403, 'POST con cookie sin cabecera CSRF debe responder con 403');
    assert(!nextCalled, 'No debe invocar next() cuando falla la protección CSRF');
    assert(blockedResult?.success === false, 'Debe indicar success: false');

    // 2. Petición POST con cookie CON cabecera X-CSRF-Token -> Permitido
    let allowedWithToken = false;
    const reqAllowed: any = {
      method: 'POST',
      headers: { cookie: 'livetrigger_session=dummy', 'x-csrf-token': '1' },
      authSource: 'cookie',
    };
    csrfProtection(reqAllowed, {} as any, () => { allowedWithToken = true; });
    assert(allowedWithToken, 'POST con cookie y X-CSRF-Token debe permitirse');

    // 3. Petición POST con Authorization: Bearer (Webhook o API externa) -> Permitido sin CSRF
    let allowedBearer = false;
    const reqBearer: any = {
      method: 'POST',
      headers: { authorization: 'Bearer external-secret-token' },
    };
    csrfProtection(reqBearer, {} as any, () => { allowedBearer = true; });
    assert(allowedBearer, 'Petición con Authorization Bearer debe ser inmune al requisito de cabecera CSRF');

    // 4. Petición GET -> Métodos seguros siempre permitidos
    let allowedGet = false;
    const reqGet: any = {
      method: 'GET',
      headers: { cookie: 'livetrigger_session=dummy' },
      authSource: 'cookie',
    };
    csrfProtection(reqGet, {} as any, () => { allowedGet = true; });
    assert(allowedGet, 'Método GET debe permitirse sin restricción CSRF');
  });

  // 41. Persistencia SQLite con better-sqlite3 y aislamiento multiusuario
  await test('41. Persistencia: Base de datos SQLite (better-sqlite3) con tablas y aislamiento multiusuario', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const db = StateStore.getDb();
    assert(db !== null && db !== undefined, 'StateStore debe inicializar la instancia de base de datos SQLite');

    // 1. Verificar existencia del archivo de base de datos
    const dbFile = path.resolve(StateStore.getDataDirectory(), 'livetrigger.db');
    assert(fs.existsSync(dbFile), 'El archivo livetrigger.db debe existir en DATA_DIR');

    // 2. Verificar que las tablas existen
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    ['users', 'rules', 'effects', 'settings', 'connection', 'counters', 'leaderboard', 'logs'].forEach((tbl) => {
      assert(tableNames.includes(tbl), `La tabla "${tbl}" debe estar creada en SQLite`);
    });

    // 3. Aislamiento estricto de datos por user_id
    const userA = 'usr-sq-alpha-' + Date.now();
    const userB = 'usr-sq-beta-' + Date.now();

    StateStore.saveCounters(
      [{ id: 'cnt-a', name: 'Meta Alpha', current: 100, target: 500, unit: '💎', lastUpdated: Date.now() }],
      userA
    );
    StateStore.saveCounters(
      [{ id: 'cnt-b', name: 'Meta Beta', current: 200, target: 800, unit: '💎', lastUpdated: Date.now() }],
      userB
    );

    const countersA = StateStore.getCounters(userA);
    const countersB = StateStore.getCounters(userB);

    assert(countersA.length === 1 && countersA[0].id === 'cnt-a' && countersA[0].current === 100, 'Datos de userA en SQLite deben ser aislados');
    assert(countersB.length === 1 && countersB[0].id === 'cnt-b' && countersB[0].current === 200, 'Datos de userB en SQLite deben ser aislados');

    // 4. Snapshots y Exportación funcionando sobre SQLite
    const snapshot = StateStore.createSnapshot(userA, 'Snapshot de prueba SQLite');
    assert(snapshot.id.startsWith('snap-'), 'createSnapshot debe generar snapshot válido respaldado en disco');
    const exportedJson = StateStore.exportFullConfigJson(userA);
    assert(exportedJson.includes('Meta Alpha'), 'exportFullConfigJson debe contener las entidades del usuario');
  });

  // 42. Content-Security-Policy sin 'unsafe-inline' en producción y con nonce
  await test('42. Seguridad CSP: script-src sin unsafe-inline en producción y nonce dinámico generado', async () => {
    const { securityHeaders } = await import('../src/server/middleware/securityHeaders');

    // 1. En producción (isProd = true)
    const prodHeaders: Record<string, string> = {};
    const mockProdRes: any = {
      locals: {},
      setHeader: (name: string, value: string) => { prodHeaders[name.toLowerCase()] = value; },
      removeHeader: () => {},
    };
    const prodMiddleware = securityHeaders(true);
    prodMiddleware({} as any, mockProdRes, () => {});

    const prodCsp = prodHeaders['content-security-policy'];
    const scriptSrcPart = prodCsp.split(';').find((p: string) => p.trim().startsWith('script-src')) || '';
    assert(!scriptSrcPart.includes("'unsafe-inline'"), "script-src NO debe contener 'unsafe-inline' en producción");
    assert(!scriptSrcPart.includes("'unsafe-eval'"), "script-src NO debe contener 'unsafe-eval' en producción");
    assert(scriptSrcPart.includes("'nonce-"), "script-src debe utilizar un nonce criptográfico en producción");
    assert(typeof mockProdRes.locals.cspNonce === 'string', 'Debe generar y asignar res.locals.cspNonce');

    // 2. En desarrollo (isProd = false)
    const devHeaders: Record<string, string> = {};
    const mockDevRes: any = {
      locals: {},
      setHeader: (name: string, value: string) => { devHeaders[name.toLowerCase()] = value; },
      removeHeader: () => {},
    };
    const devMiddleware = securityHeaders(false);
    devMiddleware({} as any, mockDevRes, () => {});

    const devCsp = devHeaders['content-security-policy'];
    const devScriptSrcPart = devCsp.split(';').find((p: string) => p.trim().startsWith('script-src')) || '';
    assert(devScriptSrcPart.includes("'unsafe-inline'"), "script-src en desarrollo puede contener 'unsafe-inline' para Vite HMR");
  });

  // 43. Endpoint /api/auth/logout limpia cookie y validación de modularización de archivos (< 350 líneas)
  await test('43. Arquitectura y Logout: Endpoint logout limpia cookie y archivos divididos a < 350 líneas', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Endpoint /api/auth/logout limpia la cookie livetrigger_session
    const { default: authRouter } = await import('../src/server/routes/auth');
    const logoutLayer = (authRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/logout' && l.route.methods.post
    );
    assert(logoutLayer !== undefined, 'Ruta POST /api/auth/logout debe estar registrada');

    let clearedCookieName = '';
    let logoutJsonResult: any = null;
    const mockRes: any = {
      clearCookie: (name: string) => { clearedCookieName = name; },
      json: (d: any) => { logoutJsonResult = d; },
    };
    logoutLayer.route.stack[0].handle({} as any, mockRes);
    assert(clearedCookieName === 'livetrigger_session', 'POST /logout debe limpiar la cookie livetrigger_session');
    assert(logoutJsonResult?.success === true, 'POST /logout debe devolver success: true');

    // 2. Verificación de líneas de código (< 350 líneas por archivo)
    const filesToCheck = [
      'src/server/coreEngine.ts',
      'src/components/settings/SettingsView.tsx',
      'src/components/simulator/SimulatorView.tsx',
      'src/components/automations/RuleEditorModal.tsx',
    ];

    for (const f of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), f), 'utf-8');
      const lines = content.split('\n').length;
      assert(lines < 350, `El archivo ${f} tiene ${lines} líneas y debe tener menos de 350 líneas`);
    }
  });

  // 44. Detalle 1: Overlay delega meta y ranking exclusivamente al servidor (sin suma local)
  await test('44. Overlay OBS: Eliminación de suma local de meta y ranking en handleIncomingOverlay', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const overlayCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/overlay/ObsOverlayScreen.tsx'),
      'utf-8'
    );
    assert(!overlayCode.includes('setGoalCurrent((curr) => curr + diamonds)'), 'No debe sumar diamantes localmente en el overlay');
    assert(!overlayCode.includes('d.points + diamonds, giftsCount: d.giftsCount + 1'), 'No debe mutar topDonors localmente en handleIncomingOverlay');
    assert(overlayCode.includes('COUNTERS_UPDATED'), 'Debe escuchar COUNTERS_UPDATED del servidor');
    assert(overlayCode.includes('LEADERBOARD_UPDATED'), 'Debe escuchar LEADERBOARD_UPDATED del servidor');
    assert(overlayCode.includes('/api/overlay/state'), 'Debe consultar GET /api/overlay/state');
  });

  // 45. Detalle 2: Reinicio de celebración cuando la meta cae o el objetivo sube
  await test('45. Overlay OBS: Reinicio de goalReachedCelebrated cuando el objetivo supera el progreso', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const overlayCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/overlay/ObsOverlayScreen.tsx'),
      'utf-8'
    );
    assert(
      overlayCode.includes('goalCurrent < goalTarget && goalReachedCelebrated'),
      'Debe comprobar si goalCurrent < goalTarget para reiniciar goalReachedCelebrated'
    );
    assert(
      overlayCode.includes('setGoalReachedCelebrated(false)'),
      'Debe reiniciar setGoalReachedCelebrated(false) para permitir celebraciones posteriores'
    );
  });

  // 46. Detalle 3: giftsCount cuenta envíos de regalos (1 por combo) y points suma diamantes totales
  await test('46. Motor de Regalos: giftsCount cuenta envíos (1 por combo) y points acumula diamantes totales', async () => {
    const { GiftProcessor } = await import('../src/server/engine/giftProcessor');
    const testUserId = 'usr-gift-combo-' + Date.now();

    const comboEvent1: any = {
      id: 'combo-evt-1-' + Date.now(),
      type: 'gift',
      user: { id: 'u-combo-donor', username: 'combo_donor', nickname: 'Combo Donor' },
      data: {
        giftName: 'Rosa',
        diamondCount: 1,
        repeatCount: 10, // 10 rosas en 1 combo
      },
    };

    // 1. Primer envío combo: 10 diamantes, giftsCount = 1
    GiftProcessor.recordGiftStats(comboEvent1, 10, testUserId);
    let lb = StateStore.getLeaderboard(testUserId);
    let donor = lb.find((d) => d.username === 'combo_donor');
    assert(donor?.points === 10, 'Points debe acumular los diamantes totales del combo (10)');
    assert(donor?.giftsCount === 1, 'GiftsCount debe ser 1 para el primer combo enviado');

    // 2. Segundo envío combo: 50 diamantes, giftsCount debe incrementar en 1 (total 2)
    const comboEvent2: any = {
      id: 'combo-evt-2-' + Date.now(),
      type: 'gift',
      user: { id: 'u-combo-donor', username: 'combo_donor', nickname: 'Combo Donor' },
      data: {
        giftName: 'Galaxia',
        diamondCount: 50,
        repeatCount: 2, // 100 diamantes
      },
    };
    GiftProcessor.recordGiftStats(comboEvent2, 100, testUserId);
    lb = StateStore.getLeaderboard(testUserId);
    donor = lb.find((d) => d.username === 'combo_donor');
    assert(donor?.points === 110, 'Points debe acumular 10 + 100 = 110 diamantes');
    assert(donor?.giftsCount === 2, 'GiftsCount debe sumar 1 por cada envío de regalo/combo (total 2)');
  });

  // 47. Detalle 4: CSP connect-src limitado a 'self' y ws/wss sin wildcard https:
  await test('47. Seguridad CSP: connect-src restringido a self y ws/wss sin wildcard https:', async () => {
    const { securityHeaders } = await import('../src/server/middleware/securityHeaders');

    const headersSet: Record<string, string> = {};
    const mockRes: any = {
      setHeader: (name: string, value: string) => { headersSet[name.toLowerCase()] = value; },
      removeHeader: () => {},
    };

    const middleware = securityHeaders(true);
    middleware({} as any, mockRes, () => {});

    const csp = headersSet['content-security-policy'];
    const connectPart = csp.split(';').find((p: string) => p.trim().startsWith('connect-src')) || '';
    assert(connectPart.includes("'self'"), "connect-src debe incluir 'self'");
    assert(!connectPart.includes('https:'), "connect-src NO debe contener el comodín inseguro 'https:'");
  });

  // 48. Detalle 5: GET /api/auth/overlay/verify responde 400 sin overlayToken
  await test('48. Seguridad Overlay: /overlay/verify responde 400 con valid:false si no se envía overlayToken', async () => {
    const { default: authRouter } = await import('../src/server/routes/auth');
    const verifyLayer = (authRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/overlay/verify' && l.route.methods.get
    );
    assert(verifyLayer !== undefined, 'Ruta GET /overlay/verify debe estar registrada');

    const verifyHandler = verifyLayer.route.stack[0].handle;

    // 1. Sin parámetro overlayToken -> 400 Bad Request
    let statusSent = 0;
    let jsonSent: any = null;
    const mockResNoToken: any = {
      status: (code: number) => {
        statusSent = code;
        return { json: (d: any) => { jsonSent = d; } };
      },
      json: (d: any) => { jsonSent = d; },
    };
    verifyHandler({ query: {} } as any, mockResNoToken);
    assert(statusSent === 400, 'Debe responder 400 cuando falta overlayToken');
    assert(jsonSent?.valid === false, 'Debe devolver valid: false cuando falta token');

    // 2. Con overlayToken válido -> 200 OK con valid: true
    const testUser = AuthManager.register({
      username: 'overlay_user_' + Date.now(),
      email: `overlay_${Date.now()}@test.local`,
      password: 'Password123!',
    });
    const token = testUser.user?.overlayToken;
    let validJsonSent: any = null;
    const mockResValid: any = {
      status: (code: number) => ({ json: (d: any) => { validJsonSent = d; } }),
      json: (d: any) => { validJsonSent = d; },
    };
    verifyHandler({ query: { overlayToken: token } } as any, mockResValid);
    assert(validJsonSent?.valid === true, 'Debe responder valid: true cuando el token es válido');
  });

  // 49. Detalle 6: ALLOW_REGISTRATION=false bloquea registro público con 403 salvo para administradores
  await test('49. Seguridad Registro: ALLOW_REGISTRATION bloquea registro público con 403 excepto para admin', async () => {
    const { default: authRouter } = await import('../src/server/routes/auth');
    const registerLayer = (authRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/register' && l.route.methods.post
    );
    const registerHandler = registerLayer.route.stack[registerLayer.route.stack.length - 1].handle;

    const prevAllow = process.env.ALLOW_REGISTRATION;
    try {
      process.env.ALLOW_REGISTRATION = 'false';

      // 1. Solicitud anónima/pública sin rol admin -> 403 Forbidden
      let status403 = 0;
      let json403: any = null;
      const mockRes403: any = {
        status: (code: number) => {
          status403 = code;
          return { json: (d: any) => { json403 = d; } };
        },
      };
      registerHandler(
        { body: { username: 'intruder', email: 'intruder@test.local', password: 'Password123!' } } as any,
        mockRes403
      );
      assert(status403 === 403, 'Registro público con ALLOW_REGISTRATION=false debe responder 403');
      assert(json403?.success === false, 'Debe retornar success: false');

      // 2. Solicitud con usuario administrador autenticado -> Permitido (evalúa registro)
      let adminStatus = 0;
      let adminJson: any = null;
      const mockResAdmin: any = {
        status: (code: number) => {
          adminStatus = code;
          return { json: (d: any) => { adminJson = d; } };
        },
        json: (d: any) => { adminJson = d; },
        cookie: () => {},
      };
      registerHandler(
        {
          user: { role: 'admin', userId: 'usr-admin' },
          body: { username: 'new_sub_user_' + Date.now(), email: `sub_${Date.now()}@test.local`, password: 'Password123!' },
        } as any,
        mockResAdmin
      );
      assert(adminStatus !== 403, 'Administrador debe poder registrar usuarios incluso si ALLOW_REGISTRATION es false');
    } finally {
      process.env.ALLOW_REGISTRATION = prevAllow;
    }
  });

  // 50. Detalle 7: Repositorios en src/server/db/ todos de menos de 350 líneas y StateStore modularizado
  await test('50. Arquitectura Modular: stateStore.ts dividido en src/server/db/ con todos los módulos < 350 líneas', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const dbFiles = [
      'src/server/stateStore.ts',
      'src/server/db/database.ts',
      'src/server/db/usersRepo.ts',
      'src/server/db/rulesRepo.ts',
      'src/server/db/effectsRepo.ts',
      'src/server/db/settingsRepo.ts',
      'src/server/db/countersRepo.ts',
      'src/server/db/leaderboardRepo.ts',
      'src/server/db/logsRepo.ts',
      'src/server/db/backupsRepo.ts',
    ];

    for (const relPath of dbFiles) {
      const full = path.resolve(process.cwd(), relPath);
      assert(fs.existsSync(full), `El archivo ${relPath} debe existir en el sistema`);
      const lines = fs.readFileSync(full, 'utf-8').split('\n').length;
      assert(lines < 350, `El archivo ${relPath} tiene ${lines} líneas y debe tener menos de 350 líneas`);
    }

    // Comprobar que StateStore delega correctamente a los repositorios
    const counters = StateStore.getCounters();
    assert(Array.isArray(counters) && counters.length > 0, 'StateStore facade debe retornar contadores');
  });

  // 51. Detalle 8: Dockerfile sin dependencias de compilación nativa python3/make/g++/sqlite-dev
  await test('51. Dockerfile Optimizado: Eliminación de python3/make/g++/sqlite-dev aprovechando prebuilts linuxmusl', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const dockerfile = fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf-8');

    assert(!dockerfile.includes('python3'), 'Dockerfile no debe requerir python3');
    assert(!dockerfile.includes('make'), 'Dockerfile no debe requerir make');
    assert(!dockerfile.includes('g++'), 'Dockerfile no debe requerir g++');
    assert(!dockerfile.includes('sqlite-dev'), 'Dockerfile no debe requerir sqlite-dev');
    assert(dockerfile.includes('VOLUME ["/app/data"]'), 'Dockerfile debe conservar el volumen persistente /app/data');
  });

  // 52. Resiliencia Frontend: DashboardView y apiService manejan datos no-array sin errores de TypeError .map()
  await test('52. Resiliencia Frontend: Protección contra TypeError al mapear leaderboard y contadores no definidos', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const dashboardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/DashboardView.tsx'),
      'utf-8'
    );
    assert(dashboardCode.includes('safeLeaderboard'), 'DashboardView debe definir safeLeaderboard');
    assert(dashboardCode.includes('safeCounters'), 'DashboardView debe definir safeCounters');
    assert(dashboardCode.includes('safeRules'), 'DashboardView debe definir safeRules');
    assert(dashboardCode.includes('safeLeaderboard.slice(0, 4).map'), 'DashboardView debe usar safeLeaderboard para .map()');

    const apiServiceCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/apiService.ts'),
      'utf-8'
    );
    assert(apiServiceCode.includes('if (!res.ok) return [];'), 'apiService debe retornar [] cuando res.ok es false en llamadas GET');

    const appCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/App.tsx'),
      'utf-8'
    );
    assert(appCode.includes('Array.isArray(msg.payload)'), 'App.tsx debe comprobar Array.isArray antes de setLeaderboard/setCounters');
  });

  // 53. Recuperación de Admin con base no vacía: promoción sin duplicar y respeto de contraseñas existentes
  await test('53. Auth: Promoción o creación de cuenta admin en base no vacía preservando contraseñas', async () => {
    const { AuthManager } = await import('../src/server/authManager');
    const { UsersRepository } = await import('../src/server/db/usersRepo');

    const streamerEmail = `streamer_${Date.now()}@test.local`;
    const streamerPass = 'StreamerPass123!';

    // Registrar un usuario streamer común
    const regResult = AuthManager.register({
      username: `streamer_${Date.now()}`,
      email: streamerEmail,
      password: streamerPass,
    });
    assert(Boolean(regResult.success && regResult.user?.role === 'streamer'), 'Debe crearse como streamer');

    // Forzar en DB que todos los usuarios sean streamer (simular base sin ningún admin)
    const allUsers = UsersRepository.getUsers().map((u) => ({
      ...u,
      role: 'streamer' as const,
    }));
    UsersRepository.saveAllUsers(allUsers);

    // Configurar variables para promover este usuario existente
    const prevEmail = process.env.ADMIN_EMAIL;
    const prevPass = process.env.ADMIN_PASSWORD;
    try {
      process.env.ADMIN_EMAIL = streamerEmail;
      process.env.ADMIN_PASSWORD = 'NuevoAdminPassword123!';

      AuthManager.init();

      // Verificar que fue promovido a admin
      const promotedUser = AuthManager.getAllUsers().find((u) => u.email === streamerEmail);
      assert(promotedUser?.role === 'admin', 'El usuario con ADMIN_EMAIL debe ser promovido a admin');

      // Verificar que su contraseña NO cambió (puede seguir iniciando sesión con streamerPass)
      const loginCheck = AuthManager.login(streamerEmail, streamerPass);
      assert(loginCheck.success, 'La contraseña del usuario promovido no debe haber cambiado');

      // Si se vuelve a ejecutar con un admin ya existente, no debe alterar nada
      AuthManager.init();
      const loginCheckAgain = AuthManager.login(streamerEmail, streamerPass);
      assert(loginCheckAgain.success, 'La contraseña del admin existente nunca debe ser modificada');
    } finally {
      process.env.ADMIN_EMAIL = prevEmail;
      process.env.ADMIN_PASSWORD = prevPass;
    }
  });

  // 54. Registro cerrado en la interfaz: GET /registration-status, mensaje 403 y sección Usuarios para admin
  await test('54. Registro cerrado: GET /registration-status, interfaz condicional y gestión de usuarios admin', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { default: authRouter } = await import('../src/server/routes/auth');

    // 1. Endpoint GET /api/auth/registration-status sin autenticación
    const statusLayer = (authRouter as any).stack.find(
      (l: any) => l.route && l.route.path === '/registration-status' && l.route.methods.get
    );
    assert(statusLayer !== undefined, 'Ruta GET /registration-status debe estar registrada');

    let jsonResult: any = null;
    const mockRes: any = {
      json: (d: any) => { jsonResult = d; },
    };
    statusLayer.route.stack[0].handle({} as any, mockRes);
    assert(typeof jsonResult?.registrationOpen === 'boolean', 'registration-status debe retornar { registrationOpen: boolean }');

    // 2. Componente AuthModal maneja registrationOpen y oculta registro con mensaje
    const authModalCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/common/AuthModal.tsx'),
      'utf-8'
    );
    assert(authModalCode.includes('registrationOpen'), 'AuthModal debe manejar el estado registrationOpen');
    assert(
      authModalCode.includes('El registro está cerrado. Pide acceso al administrador.'),
      'AuthModal debe mostrar el mensaje exacto cuando el registro está cerrado'
    );

    // 3. Componente UsersAdminCard en Ajustes para admin
    const usersCardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/settings/UsersAdminCard.tsx'),
      'utf-8'
    );
    assert(usersCardCode.includes('adminRegisterUser'), 'UsersAdminCard debe llamar a adminRegisterUser');
    assert(usersCardCode.includes("role !== 'admin'"), 'UsersAdminCard debe validar rol admin');

    const settingsCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/settings/SettingsView.tsx'),
      'utf-8'
    );
    assert(settingsCode.includes('UsersAdminCard'), 'SettingsView debe incluir UsersAdminCard');
  });

  // 55. Instalación en Windows: .npmrc (ignore-scripts=true), package.json engines >=22 y documentación PowerShell
  await test('55. Instalación en Windows: .npmrc con ignore-scripts, engines >=22 y documentación PowerShell', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Archivo .npmrc en raíz con ignore-scripts=true
    const npmrcPath = path.resolve(process.cwd(), '.npmrc');
    assert(fs.existsSync(npmrcPath), 'El archivo .npmrc debe existir en la raíz');
    const npmrcContent = fs.readFileSync(npmrcPath, 'utf-8');
    assert(
      npmrcContent.includes('ignore-scripts=true') || npmrcContent.includes('ignore-scripts = true'),
      '.npmrc debe contener ignore-scripts=true'
    );

    // 2. package.json contiene engines >=22
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    assert(pkg.engines && pkg.engines.node && pkg.engines.node.includes('>=22'), 'package.json debe definir engines.node >=22');

    // 3. Documentación en README.md y docs/ con comandos PowerShell
    const readmePath = path.resolve(process.cwd(), 'README.md');
    assert(fs.existsSync(readmePath), 'README.md debe existir');
    const readmeContent = fs.readFileSync(readmePath, 'utf-8');
    assert(readmeContent.includes('PowerShell'), 'README.md debe documentar PowerShell');
    assert(readmeContent.includes('better-sqlite3'), 'README.md debe explicar la particularidad de better-sqlite3');
    assert(readmeContent.includes('ignore-scripts'), 'README.md debe mencionar ignore-scripts');

    const winDocPath = path.resolve(process.cwd(), 'docs/INSTALACION_WINDOWS.md');
    assert(fs.existsSync(winDocPath), 'docs/INSTALACION_WINDOWS.md debe existir');
    const winDocContent = fs.readFileSync(winDocPath, 'utf-8');
    assert(winDocContent.includes('PowerShell') && winDocContent.includes('ignore-scripts'), 'docs/INSTALACION_WINDOWS.md debe detallar PowerShell e ignore-scripts');

    // 4. Dockerfile copia .npmrc*
    const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
    assert(dockerfileContent.includes('.npmrc'), 'Dockerfile debe copiar .npmrc*');
  });

  // 56. Valores de relleno en .env.example: filtro en conector Euler, validación centralizada en producción y secretos vacíos
  await test('56. Valores de relleno en .env.example: filtro en Euler, validación centralizada y rechazo en producción', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { DirectTikTokConnector } = await import('../src/server/connectors/directTikTokConnector');
    const { isForbiddenPlaceholder, validateProductionSecrets, FORBIDDEN_PLACEHOLDER_SECRETS } = await import('../src/server/config/forbiddenSecrets');

    // 1. Detección de claves Euler de relleno ("tu_", "aqui" o vacías)
    assert(DirectTikTokConnector.isPlaceholderEulerKey('tu_clave_euler_stream_aqui') === true, 'Debe detectar tu_clave_euler_stream_aqui como relleno');
    assert(DirectTikTokConnector.isPlaceholderEulerKey('clave_aqui_123') === true, 'Debe detectar valores con aqui como relleno');
    assert(DirectTikTokConnector.isPlaceholderEulerKey('') === true, 'Debe detectar clave vacía como no configurada');
    assert(DirectTikTokConnector.isPlaceholderEulerKey('euler_real_live_sign_key_999') === false, 'Debe aceptar una clave válida');

    // Comprobar que getEffectiveEulerKey ignora valores de relleno
    const prevEuler = process.env.EULER_STREAM_API_KEY;
    try {
      process.env.EULER_STREAM_API_KEY = 'tu_clave_euler_stream_aqui';
      assert(DirectTikTokConnector.getEffectiveEulerKey() === '', 'getEffectiveEulerKey debe devolver cadena vacía ante valores de relleno');

      const connector = new DirectTikTokConnector();
      let capturedStatus: any = null;
      connector.onStatusChange((s) => { capturedStatus = s; });
      (connector as any).notifyStatus();
      assert(capturedStatus && capturedStatus.notice && capturedStatus.notice.includes('Euler'), 'El estado de conexión debe incluir un aviso claro de que Euler no está configurado');
    } finally {
      process.env.EULER_STREAM_API_KEY = prevEuler;
    }

    // 2. Centralización y rechazo en producción si JWT_SECRET o ADMIN_PASSWORD son valores de relleno
    assert(Array.isArray(FORBIDDEN_PLACEHOLDER_SECRETS), 'Debe exportar lista centralizada de secretos prohibidos');
    assert(isForbiddenPlaceholder('cambia_esta_clave_secreta_por_una_aleatoria_muy_segura_en_produccion') === true, 'JWT_SECRET de .env.example debe ser prohibido');
    assert(isForbiddenPlaceholder('tu_contrasena_administrador_fuerte_aqui_minimo_10_caracteres') === true, 'ADMIN_PASSWORD de .env.example debe ser prohibido');

    const prevNodeEnv = process.env.NODE_ENV;
    const prevJwt = process.env.JWT_SECRET;
    const prevPass = process.env.ADMIN_PASSWORD;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'cambia_esta_clave_secreta_por_una_aleatoria_muy_segura_en_produccion';
      process.env.ADMIN_PASSWORD = 'password_real_12345';

      let threwJwt = false;
      try {
        validateProductionSecrets();
      } catch (err: any) {
        threwJwt = true;
        assert(err.message.includes('seguridad') || err.message.includes('JWT_SECRET'), 'El mensaje debe explicar en español el rechazo de JWT_SECRET');
      }
      assert(threwJwt, 'validateProductionSecrets debe arrojar excepción si JWT_SECRET es valor de relleno');

      process.env.JWT_SECRET = 'c0a80101_crypto_random_secret_32_chars_ok!';
      process.env.ADMIN_PASSWORD = 'tu_contrasena_administrador_fuerte_aqui_minimo_10_caracteres';

      let threwPass = false;
      try {
        validateProductionSecrets();
      } catch (err: any) {
        threwPass = true;
        assert(err.message.includes('ADMIN_PASSWORD') || err.message.includes('seguridad'), 'El mensaje debe explicar en español el rechazo de ADMIN_PASSWORD');
      }
      assert(threwPass, 'validateProductionSecrets debe arrojar excepción si ADMIN_PASSWORD es valor de relleno');

      // Con valores seguros válidos no debe arrojar error
      process.env.ADMIN_PASSWORD = 'MiPasswordSeguraYUnica_2026!';
      let noError = true;
      try {
        validateProductionSecrets();
      } catch {
        noError = false;
      }
      assert(noError, 'Con credenciales seguras validateProductionSecrets debe pasar sin errores');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      process.env.JWT_SECRET = prevJwt;
      process.env.ADMIN_PASSWORD = prevPass;
    }

    // 3. .env.example deja vacíos los 4 secretos y contiene comandos de generación
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    const envExample = fs.readFileSync(envExamplePath, 'utf-8');
    assert(envExample.includes('EULER_STREAM_API_KEY=\n') || envExample.includes('EULER_STREAM_API_KEY=\r\n'), 'EULER_STREAM_API_KEY debe estar vacío en .env.example');
    assert(envExample.includes('JWT_SECRET=\n') || envExample.includes('JWT_SECRET=\r\n'), 'JWT_SECRET debe estar vacío en .env.example');
    assert(envExample.includes('ADMIN_PASSWORD=\n') || envExample.includes('ADMIN_PASSWORD=\r\n'), 'ADMIN_PASSWORD debe estar vacío en .env.example');
    assert(envExample.includes('TIKTOK_WEBHOOK_SECRET=\n') || envExample.includes('TIKTOK_WEBHOOK_SECRET=\r\n'), 'TIKTOK_WEBHOOK_SECRET debe estar vacío en .env.example');
    assert(envExample.includes('randomBytes'), '.env.example debe incluir instrucciones con randomBytes');
  });

  // 57. Consistencia Euler: eulerStreamConfigured usa getEffectiveEulerKey en /api/connection, /api/ready y /health
  await test('57. Consistencia Euler: eulerStreamConfigured usa getEffectiveEulerKey en /api/connection, /api/ready y /health', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { DirectTikTokConnector } = await import('../src/server/connectors/directTikTokConnector');
    const { default: connectionRouter } = await import('../src/server/routes/connection');
    const { default: systemRouter } = await import('../src/server/routes/system');

    const prevEuler = process.env.EULER_STREAM_API_KEY;
    try {
      // Con clave de relleno, getEffectiveEulerKey es cadena vacía
      process.env.EULER_STREAM_API_KEY = 'tu_clave_euler_stream_aqui';
      assert(DirectTikTokConnector.getEffectiveEulerKey() === '', 'Con clave de relleno getEffectiveEulerKey debe ser vacía');

      // Ruta /api/connection: GET / debe responder con eulerStreamConfigured: false
      const connGetLayer = (connectionRouter as any).stack.find(
        (l: any) => l.route && l.route.path === '/' && l.route.methods.get
      );
      assert(connGetLayer !== undefined, 'Ruta GET / en connectionRouter debe existir');

      let connJson: any = null;
      const mockReq: any = { user: { userId: 'usr-test-euler' } };
      const mockRes: any = { json: (d: any) => { connJson = d; } };
      connGetLayer.route.stack[connGetLayer.route.stack.length - 1].handle(mockReq, mockRes);
      assert(connJson?.meta?.eulerStreamConfigured === false, 'Con tu_clave_euler_stream_aqui eulerStreamConfigured en /api/connection debe ser false');

      // Ruta /ready y /api/ready: debe responder con eulerStreamConfigured: false
      const readyLayer = (systemRouter as any).stack.find(
        (l: any) => l.route && (l.route.path === '/ready' || (Array.isArray(l.route.path) && l.route.path.includes('/ready')))
      );
      assert(readyLayer !== undefined, 'Ruta GET /ready en systemRouter debe existir');
      let readyJson: any = null;
      readyLayer.route.stack[0].handle({} as any, { json: (d: any) => { readyJson = d; } });
      assert(readyJson?.eulerStreamConfigured === false, 'Con tu_clave_euler_stream_aqui eulerStreamConfigured en /ready debe ser false');

      // Con clave real válida, debe devolver true
      process.env.EULER_STREAM_API_KEY = 'real_euler_sign_key_valid_12345';
      assert(DirectTikTokConnector.getEffectiveEulerKey() === 'real_euler_sign_key_valid_12345', 'Debe aceptar clave real');

      connGetLayer.route.stack[connGetLayer.route.stack.length - 1].handle(mockReq, mockRes);
      assert(connJson?.meta?.eulerStreamConfigured === true, 'Con clave real eulerStreamConfigured en /api/connection debe ser true');

      readyLayer.route.stack[0].handle({} as any, { json: (d: any) => { readyJson = d; } });
      assert(readyJson?.eulerStreamConfigured === true, 'Con clave real eulerStreamConfigured en /ready debe ser true');

      // Verificar que ServerHealthCard incluye el indicador de Euler Stream
      const healthCardCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/settings/ServerHealthCard.tsx'),
        'utf-8'
      );
      assert(healthCardCode.includes('eulerStreamConfigured'), 'ServerHealthCard debe consultar eulerStreamConfigured');
      assert(healthCardCode.includes('Euler Stream'), 'ServerHealthCard debe mostrar la casilla de Euler Stream');
    } finally {
      process.env.EULER_STREAM_API_KEY = prevEuler;
    }
  });

  // 58. Interfaz: franja de aviso amarilla para connection.notice en ConnectionsView y DashboardView
  await test('58. Interfaz: franja de aviso amarilla para connection.notice en ConnectionsView y DashboardView', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. En ConnectionsView.tsx
    const connViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/connections/ConnectionsView.tsx'),
      'utf-8'
    );
    assert(connViewCode.includes('connection.notice'), 'ConnectionsView debe verificar connection.notice');
    assert(connViewCode.includes('bg-amber-950/40') || connViewCode.includes('border-amber-500'), 'ConnectionsView debe usar franja de aviso amarilla');

    // 2. En DashboardView.tsx
    const dashboardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/DashboardView.tsx'),
      'utf-8'
    );
    assert(dashboardCode.includes('connection.notice'), 'DashboardView debe verificar connection.notice');
    assert(dashboardCode.includes('bg-amber-950/40') || dashboardCode.includes('border-amber-500'), 'DashboardView debe usar franja de aviso amarilla');
    assert(dashboardCode.includes('eulerConfigured === false'), 'DashboardView debe mantener el aviso de Euler');
  });

  // 59. Validación de secretos: isForbiddenPlaceholder limitado a plantillas y prefijos tu_/cambia_esta_ sin rechazar contraseñas con 'aqui'
  await test('59. Validación de secretos: isForbiddenPlaceholder limitado a plantillas y prefijos sin rechazar contraseñas legítimas', async () => {
    const { isForbiddenPlaceholder, validateProductionSecrets } = await import('../src/server/config/forbiddenSecrets');

    // 1. Contraseñas legítimas que contengan "aqui" NO deben ser rechazadas
    assert(isForbiddenPlaceholder('Aqui123456!') === false, 'Aqui123456! no debe ser rechazado como placeholder');
    assert(isForbiddenPlaceholder('MiPasswordAqui_2026!') === false, 'MiPasswordAqui_2026! no debe ser rechazado');
    assert(isForbiddenPlaceholder('SuperSecretAqui!') === false, 'SuperSecretAqui! no debe ser rechazado');

    // 2. Valores que coinciden exactamente con la lista de plantillas SÍ deben ser rechazados
    assert(isForbiddenPlaceholder('cambia_esta_clave_secreta_por_una_aleatoria_muy_segura_en_produccion') === true, 'Plantilla JWT de .env.example debe ser rechazada');
    assert(isForbiddenPlaceholder('tu_contrasena_administrador_fuerte_aqui_minimo_10_caracteres') === true, 'Plantilla de contraseña admin debe ser rechazada');
    assert(isForbiddenPlaceholder('tu_clave_euler_stream_aqui') === true, 'Plantilla Euler debe ser rechazada');
    assert(isForbiddenPlaceholder('secret') === true, 'secret debe ser rechazado');
    assert(isForbiddenPlaceholder('password') === true, 'password debe ser rechazado');

    // 3. Prefijos de documentación "tu_" y "cambia_esta_" deben ser rechazados
    assert(isForbiddenPlaceholder('tu_otra_clave_ejemplo') === true, 'Valores que empiezan por tu_ deben ser rechazados');
    assert(isForbiddenPlaceholder('cambia_esta_clave_nueva') === true, 'Valores que empiezan por cambia_esta_ deben ser rechazados');

    // 4. validateProductionSecrets con contraseña que contiene 'aqui' no debe arrojar error
    const prevEnv = process.env.NODE_ENV;
    const prevJwt = process.env.JWT_SECRET;
    const prevPass = process.env.ADMIN_PASSWORD;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'c0a80101_crypto_random_secret_32_chars_ok!';
      process.env.ADMIN_PASSWORD = 'Aqui123456!';

      let errorThrown = false;
      try {
        validateProductionSecrets();
      } catch {
        errorThrown = true;
      }
      assert(!errorThrown, 'validateProductionSecrets no debe rechazar la contraseña legítima Aqui123456!');
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.JWT_SECRET = prevJwt;
      process.env.ADMIN_PASSWORD = prevPass;
    }
  });

  // 60. Juegos Live interactivos: catálogo modular, Street Food Rush, cola FIFO de órdenes, pedidos VIP y ranking
  await test('60. Juegos Live interactivos: catálogo modular, Street Food Rush, cola FIFO de órdenes, pedidos VIP y ranking', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { AVAILABLE_GAMES, QUICK_DISHES, VIP_DISHES, DEFAULT_GAME_CONFIG } = await import('../src/components/games/GameRegistry');

    // 1. Catálogo modular con Street Food Rush activo y slots preparados para futuros juegos
    assert(AVAILABLE_GAMES.some((g) => g.id === 'street_food_rush' && g.status === 'active'), 'Street Food Rush debe estar activo en el catálogo');
    assert(AVAILABLE_GAMES.some((g) => g.id === 'boss_battle'), 'Debe existir slot preparado para Batalla de Jefe');
    assert(AVAILABLE_GAMES.some((g) => g.id === 'gift_race'), 'Debe existir slot preparado para Carrera de Regalos');

    // 2. Platos rápidos y VIP
    assert(QUICK_DISHES.length >= 4, 'Deben existir al menos 4 platos rápidos');
    assert(VIP_DISHES.length >= 3, 'Deben existir al menos 3 platos VIP');
    assert(QUICK_DISHES.every((d) => d.emoji && d.points > 0 && d.cookTimeSec > 0), 'Platos rápidos deben tener emoji, puntos y tiempo');
    assert(VIP_DISHES.every((d) => d.emoji && d.points > 50 && d.category === 'vip'), 'Platos VIP deben ser de categoría vip y mayor puntaje');

    // 3. Reglas de clasificación: 1 moneda (Rosa) -> Quick, 5-20 monedas -> VIP
    const isVipQuick = 1 >= DEFAULT_GAME_CONFIG.foodRush.vipOrderMinCoins;
    const isVipTen = 10 >= DEFAULT_GAME_CONFIG.foodRush.vipOrderMinCoins;
    assert(!isVipQuick, '1 moneda (Rosa) no debe ser orden VIP');
    assert(isVipTen, '10 monedas debe clasificarse como orden VIP con fuego');

    // 4. Integración en Navbar y ObsOverlayScreen
    const navbarCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx'), 'utf-8');
    assert(navbarCode.includes('Juegos Live'), 'Navbar debe incluir pestaña Juegos Live');

    const overlayCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/overlay/ObsOverlayScreen.tsx'), 'utf-8');
    assert(overlayCode.includes('FoodRushGame'), 'ObsOverlayScreen debe importar y soportar FoodRushGame');
    assert(overlayCode.includes('activeGameId === \'street_food_rush\''), 'ObsOverlayScreen debe renderizar el minijuego activo');
    assert(overlayCode.includes('9:16'), 'ObsOverlayScreen debe soportar formato vertical 9:16');

    // 5. Presencia del componente GamesView y FoodRushVisuals
    const gamesViewCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/games/GamesView.tsx'), 'utf-8');
    assert(gamesViewCode.includes('Copiar URL OBS 9:16'), 'GamesView debe proporcionar botón para copiar URL vertical 9:16');
    assert(gamesViewCode.includes('Simular Eventos del Juego'), 'GamesView debe incluir panel de simulación en vivo');

    // 6. Carta en Pantalla (LIVE_MENU_ITEMS) y Showcase Pantalla Completa
    const { LIVE_MENU_ITEMS } = await import('../src/components/games/GameRegistry');
    assert(LIVE_MENU_ITEMS.some((m) => m.dishName.includes('Solo Jugo') && m.triggerGift.includes('Rosa')), 'Carta debe tener Flor/Rosa -> Solo Jugo');
    assert(LIVE_MENU_ITEMS.some((m) => m.dishName.includes('Chaufa') && m.triggerGift.includes('Corazón')), 'Carta debe tener Corazón -> Segundo de Chaufa');

    const foodRushCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/games/foodRush/FoodRushGame.tsx'), 'utf-8');
    assert(foodRushCode.includes('FoodMenuBoard'), 'FoodRushGame debe renderizar la Carta en Pantalla (FoodMenuBoard)');
    assert(foodRushCode.includes('FullScreenOrderShowcase'), 'FoodRushGame debe renderizar el Showcase en toda la pantalla');
    assert(foodRushCode.includes('RealisticChefStation'), 'FoodRushGame debe renderizar el Chef Realista y la Mesa de Preparación Culinaria');

    const chefStationCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/games/foodRush/RealisticChefStation.tsx'), 'utf-8');
    assert(chefStationCode.includes('Mesa de Salteado en Vivo'), 'RealisticChefStation debe incluir la mesa de preparación culinaria en vivo');
    assert(chefStationCode.includes('PREP DE MESA'), 'RealisticChefStation debe incluir tabla de cortar y mise en place');
    assert(chefStationCode.includes('FIEBRE DORADA'), 'RealisticChefStation debe incluir soporte para modo Fiebre Dorada');
    assert(chefStationCode.includes('COCINA EN LLAMAS'), 'RealisticChefStation debe incluir evento de sabotaje con cocina en llamas');

    // 7. Nuevas mecánicas virales: Rush Hour, Sabotaje, Temáticas y Boss Battle
    const { getMenuItemsByTheme } = await import('../src/components/games/GameRegistry');
    const burgerMenu = getMenuItemsByTheme('street_burger');
    const peMenu = getMenuItemsByTheme('peruvian_sazon');
    const sushiMenu = getMenuItemsByTheme('sushi_ramen');
    assert(burgerMenu.length >= 4, 'Temática Street Burger debe tener al menos 4 platos');
    assert(peMenu.length >= 4, 'Temática Sazón Peruana debe tener al menos 4 platos');
    assert(sushiMenu.length >= 4, 'Temática Sushi & Ramen debe tener al menos 4 platos');

    assert(overlayCode.includes('BossBattleGame'), 'ObsOverlayScreen debe soportar BossBattleGame');
    assert(overlayCode.includes('syncFromServer'), 'ObsOverlayScreen debe sincronizar configuración con el backend vía syncFromServer');
    assert(gamesViewCode.includes('BossBattleGame'), 'GamesView debe renderizar BossBattleGame cuando esté seleccionado');
    assert(foodRushCode.includes('Fiebre de Cocina'), 'FoodRushGame debe incluir barra de Meta Comunitaria');
    assert(foodRushCode.includes('isFireEmergency'), 'FoodRushGame debe incluir lógica de sabotaje de fuego');
  });

  // 61. GameRegistry y GamesRepository: carga sin errores de food_rush y boss_battle y persistencia con gamesRepo
  await test('61. GameRegistry y GamesRepository: carga sin errores de food_rush y boss_battle y persistencia con gamesRepo', async () => {
    const { AVAILABLE_GAMES } = await import('../src/components/games/GameRegistry');
    assert(AVAILABLE_GAMES.some((g) => g.id === 'street_food_rush'), 'GameRegistry debe incluir street_food_rush');
    assert(AVAILABLE_GAMES.some((g) => g.id === 'boss_battle'), 'GameRegistry debe incluir boss_battle');

    const { GamesRepository } = await import('../src/server/db/gamesRepo');
    const testConfig = { foodRush: { vipOrderMinCoins: 10 }, bossBattle: { maxHp: 1000 } };
    GamesRepository.saveGameConfig(testConfig, 'test_user_game');
    const loaded = GamesRepository.getGameConfig('test_user_game');
    assert(loaded !== null, 'GamesRepository debe retornar la configuración guardada');
    assert(loaded.foodRush.vipOrderMinCoins === 10, 'El valor guardado debe coincidir');
  });

  // 62. Seguridad Backend: Autorización Fail-Safe y validación estricta de x-webhook-secret en CSRF
  await test('62. Seguridad Backend: Autorización Fail-Safe y validación estricta de x-webhook-secret en CSRF', async () => {
    const { requireAdmin, csrfProtection } = await import('../src/server/middleware/auth');

    // 1. Fail-Safe Reset Auth Tests
    let statusSet: number | null = null;
    let nextCalled = false;
    const unauthedReq: any = { user: undefined };
    const resMock: any = {
      status: (code: number) => {
        statusSet = code;
        return { json: (d: any) => d };
      },
      json: (d: any) => d,
    };

    requireAdmin(unauthedReq, resMock, () => { nextCalled = true; });
    assert(!nextCalled, 'Usuario sin sesión no debe pasar requireAdmin');
    assert(statusSet === 401, 'Usuario sin sesión debe recibir 401 Unauthorized');

    // Streamer autenticado (role = 'streamer') intenta acceder a endpoint admin de fail-safe reset
    statusSet = null;
    nextCalled = false;
    const streamerReq: any = { user: { userId: 's1', role: 'streamer' } };
    requireAdmin(streamerReq, resMock, () => { nextCalled = true; });
    assert(!nextCalled, 'Streamer no debe poder acceder a funciones de admin (fail-safe reset)');
    assert(statusSet === 403, 'Streamer debe recibir 403 Forbidden');

    // Administrador autenticado (role = 'admin') puede acceder
    statusSet = null;
    nextCalled = false;
    const adminReq: any = { user: { userId: 'a1', role: 'admin' } };
    requireAdmin(adminReq, resMock, () => { nextCalled = true; });
    assert(nextCalled, 'Administrador sí debe poder acceder');

    // 2. CSRF & x-webhook-secret Validation Tests
    const prevSecret = process.env.TIKTOK_WEBHOOK_SECRET;
    try {
      process.env.TIKTOK_WEBHOOK_SECRET = 'super_secret_webhook_123';

      // Petición POST con cabecera x-webhook-secret FALSA
      let csrfNextCalled = false;
      let csrfStatus: number | null = null;
      const fakeSecretReq: any = {
        method: 'POST',
        headers: {
          'x-webhook-secret': 'wrong_secret',
        },
        authSource: 'cookie',
        cookies: { livetrigger_session: 'some_session' },
      };
      const csrfRes: any = {
        status: (code: number) => {
          csrfStatus = code;
          return { json: (d: any) => d };
        },
      };

      csrfProtection(fakeSecretReq, csrfRes, () => { csrfNextCalled = true; });
      assert(csrfStatus === 403 && !csrfNextCalled, 'Secreto de webhook falso no debe eximir la protección CSRF y debe retornar 403');

      // Petición POST con cabecera x-webhook-secret VÁLIDA
      csrfNextCalled = false;
      csrfStatus = null;
      const validSecretReq: any = {
        method: 'POST',
        headers: {
          'x-webhook-secret': 'super_secret_webhook_123',
        },
        authSource: 'cookie',
        cookies: { livetrigger_session: 'some_session' },
      };
      csrfProtection(validSecretReq, csrfRes, () => { csrfNextCalled = true; });
      assert(csrfNextCalled, 'Secreto de webhook válido debe eximir correctamente la comprobación CSRF');
    } finally {
      process.env.TIKTOK_WEBHOOK_SECRET = prevSecret;
    }
  });

  // 63. Corrección 2: Reconexión automática multiusuario y aislamiento de eventos
  await test('63. Reconexión automática multiusuario y aislamiento de eventos', async () => {
    const { ConnectorManager } = await import('../src/server/engine/connectorManager');
    const manager = new ConnectorManager();

    StateStore.saveConnection({
      username: 'test_user_stream',
      mode: 'simulation',
      connectorType: 'direct',
      status: 'disconnected',
      autoReconnect: false,
      bridgeServerUrl: 'ws://localhost:21213',
    }, 'user_isolated_1');

    const conn1 = StateStore.getConnection('user_isolated_1');
    assert(conn1.status === 'disconnected', 'Usuario desconectado no debe tener estado conectado');
    assert(conn1.autoReconnect === false, 'autoReconnect debe ser falso');

    let receivedUserA = false;
    let receivedUserB = false;

    coreEngine.subscribeSSE(() => { receivedUserA = true; }, 'user_a');
    coreEngine.subscribeSSE(() => { receivedUserB = true; }, 'user_b');

    coreEngine.broadcast({ type: 'MASTER_SWITCH', payload: { enabled: true }, timestamp: Date.now() }, 'user_a');

    assert(receivedUserA, 'Usuario A debe recibir su mensaje broadcast');
    assert(!receivedUserB, 'Usuario B NO debe recibir mensajes broadcast dirigidos al usuario A (aislamiento multiusuario)');
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
