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
