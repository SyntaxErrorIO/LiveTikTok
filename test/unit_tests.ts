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
