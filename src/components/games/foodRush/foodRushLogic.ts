import { TikTokEvent } from '../../../types';
import {
  FoodOrder,
  CustomerLeaderboardEntry,
  LiveDish,
  MenuThemeId,
  FoodRushSettings,
} from '../types';
import { QUICK_DISHES, VIP_DISHES, getMenuItemsByTheme } from '../GameRegistry';

export interface FoodRushState {
  orderQueue: FoodOrder[];
  rushCoins: number;
  rushHourActiveUntil: number;
  isFireEmergency: boolean;
  extinguishProgress: number;
  speedMultiplier: number;
  likesCount: number;
  boostActiveUntil: number;
  recentCheer?: { user: string; text: string } | null;
  topCustomers: CustomerLeaderboardEntry[];
  orderQueueCount?: number;
  processedEventIds?: string[];
}

export interface FoodRushProcessResult extends FoodRushState {
  newOrder?: FoodOrder | null;
  stackedOrder?: FoodOrder | null;
  audioEffects?: ('fireWoosh' | 'chime' | 'fanfare' | 'sizzle' | 'remySqueak')[];
  confettiEffect?: 'extinguish' | 'rushHour' | null;
  isDuplicate?: boolean;
}

/**
 * Selecciona el plato correspondiente según el regalo, diamantes y temática activa.
 * Regla de producción oficial:
 * - Flor/Rosa (o 1 moneda) -> Plato rápido de 1 moneda (ej: Jugo Helado)
 * - Corazón/Quereme (o 5-10 monedas) -> Especial temático de 5 monedas (ej: Segundo de Chaufa VIP)
 * - Lomo/Donas/Perfume (o 11-49 monedas) -> Plato VIP de 15-25 monedas (ej: Lomo Saltado Flambeado)
 * - León/Dragón/Universo (o 50+ monedas) -> Banquete Imperial de 50+ monedas
 * - Otros: Selección aleatoria ponderada Quick vs VIP
 */
export function selectDishForGift(
  giftName: string = 'Regalo',
  totalDiamonds: number = 1,
  isVip: boolean = false,
  themeId: MenuThemeId = 'peruvian_sazon'
): LiveDish {
  const giftLower = giftName.toLowerCase();
  const themeItems = getMenuItemsByTheme(themeId);

  if (
    giftLower.includes('flor') ||
    giftLower.includes('rosa') ||
    giftLower.includes('rose') ||
    totalDiamonds === 1
  ) {
    const matched = themeItems.find((i) => i.coins === 1) || themeItems[0];
    return {
      id: matched.id,
      name: matched.dishName,
      emoji: matched.emoji,
      category: 'quick',
      cookTimeSec: 2.8,
      points: 15,
    };
  }

  if (
    giftLower.includes('corazon') ||
    giftLower.includes('corazón') ||
    giftLower.includes('heart') ||
    giftLower.includes('quereme') ||
    giftLower.includes('love') ||
    (totalDiamonds >= 5 && totalDiamonds <= 10)
  ) {
    const matched = themeItems.find((i) => i.coins === 5) || themeItems[1] || themeItems[0];
    return {
      id: matched.id,
      name: matched.dishName,
      emoji: matched.emoji,
      category: 'vip',
      cookTimeSec: 4.2,
      points: 65,
    };
  }

  if (
    giftLower.includes('lomo') ||
    giftLower.includes('dona') ||
    giftLower.includes('donut') ||
    giftLower.includes('perfume') ||
    (totalDiamonds > 10 && totalDiamonds < 50)
  ) {
    const matched =
      themeItems.find((i) => i.coins >= 10 && i.coins <= 25) || themeItems[2] || VIP_DISHES[1];
    return {
      id: matched.id,
      name: matched.dishName,
      emoji: matched.emoji,
      category: 'vip',
      cookTimeSec: 4.8,
      points: 75,
    };
  }

  if (
    giftLower.includes('leon') ||
    giftLower.includes('león') ||
    giftLower.includes('dragon') ||
    giftLower.includes('dragón') ||
    giftLower.includes('universo') ||
    giftLower.includes('galaxia') ||
    totalDiamonds >= 50
  ) {
    const matched =
      themeItems.find((i) => i.coins >= 50) || themeItems[themeItems.length - 1] || VIP_DISHES[0];
    return {
      id: matched.id,
      name: matched.dishName,
      emoji: matched.emoji,
      category: 'vip',
      cookTimeSec: 5.5,
      points: 100,
    };
  }

  if (isVip) {
    const idx = Math.floor(Math.random() * VIP_DISHES.length);
    return VIP_DISHES[idx];
  }

  const idx = Math.floor(Math.random() * QUICK_DISHES.length);
  return QUICK_DISHES[idx];
}

/**
 * Calcula los puntos ganados por un plato servido.
 * Regla: VIP duplica base + 5 pts por diamante; normal base + 2 pts por diamante.
 * Fiebre Dorada (Rush Hour) duplica todos los puntos ganados x2.
 */
export function calculateFoodRushPoints(
  dishPoints: number,
  totalDiamonds: number,
  isVip: boolean,
  isRushHour: boolean
): number {
  const rawPoints = isVip
    ? dishPoints * 2 + totalDiamonds * 5
    : dishPoints + totalDiamonds * 2;
  return isRushHour ? Math.round(rawPoints * 2) : rawPoints;
}

/**
 * Calcula la duración base de cocción en milisegundos.
 * Regla: 8.0s base normales + 3.0s adicionales por cada escalón de diamantes (totalDiamonds / 3, máx +12s).
 */
export function calculateCookDurationMs(totalDiamonds: number): number {
  const giftTierBonus = Math.min(4, Math.floor(totalDiamonds / 3));
  const baseDurationSec = 8.0 + giftTierBonus * 3.0;
  return baseDurationSec * 1000;
}

/**
 * Actualiza el ranking de mejores clientes acumulando pedidos, diamantes y puntos.
 */
export function updateCustomerLeaderboard(
  prev: CustomerLeaderboardEntry[],
  order: FoodOrder
): CustomerLeaderboardEntry[] {
  const existingIdx = prev.findIndex(
    (c) => c.username.toLowerCase() === order.username.toLowerCase()
  );
  let updated: CustomerLeaderboardEntry[];

  if (existingIdx >= 0) {
    const item = { ...prev[existingIdx] };
    item.nickname = order.nickname || item.nickname;
    if (order.avatarUrl) item.avatarUrl = order.avatarUrl;
    item.totalOrders += 1;
    item.totalPoints += order.pointsEarned;
    item.totalDiamonds += order.diamonds;
    if (order.isVip) item.vipOrders += 1;
    item.lastOrderAt = Date.now();

    updated = [...prev];
    updated[existingIdx] = item;
  } else {
    const newItem: CustomerLeaderboardEntry = {
      username: order.username,
      nickname: order.nickname || order.username,
      avatarUrl: order.avatarUrl,
      totalOrders: 1,
      totalPoints: order.pointsEarned,
      totalDiamonds: order.diamonds,
      vipOrders: order.isVip ? 1 : 0,
      lastOrderAt: Date.now(),
    };
    updated = [...prev, newItem];
  }

  updated.sort((a, b) => b.totalPoints - a.totalPoints || b.totalDiamonds - a.totalDiamonds);
  return updated;
}

/**
 * Función principal y unificada para procesar eventos TikTok LIVE en Food Rush.
 * Usada tanto por el componente FoodRushGame.tsx en producción como por los tests unitarios.
 */
export function processFoodRushEvent(
  event: TikTokEvent,
  currentState: FoodRushState,
  options?: number | Partial<FoodRushSettings>,
  now: number = Date.now()
): FoodRushProcessResult {
  if (!event || !event.type) {
    return {
      ...currentState,
      orderQueue: currentState.orderQueue || [],
      rushCoins: currentState.rushCoins || 0,
      rushHourActiveUntil: currentState.rushHourActiveUntil || 0,
      isFireEmergency: Boolean(currentState.isFireEmergency),
      extinguishProgress: currentState.extinguishProgress || 0,
      speedMultiplier: currentState.speedMultiplier || 1.0,
      likesCount: currentState.likesCount || 0,
      boostActiveUntil: currentState.boostActiveUntil || 0,
      topCustomers: currentState.topCustomers || [],
      orderQueueCount: (currentState.orderQueue || []).length,
    };
  }

  // Normalización de opciones y configuración
  let goalCoins = 50;
  let vipOrderMinCoins = 5;
  let maxQueueLength = 12;
  let likesBoostEnabled = true;
  let likesThreshold = 20;
  let commentsBoostEnabled = true;
  let themeId: MenuThemeId = 'peruvian_sazon';

  if (typeof options === 'number') {
    goalCoins = options;
  } else if (options && typeof options === 'object') {
    if (options.rushHourGoalCoins) goalCoins = options.rushHourGoalCoins;
    if (options.vipOrderMinCoins) vipOrderMinCoins = options.vipOrderMinCoins;
    if (options.maxQueueLength) maxQueueLength = options.maxQueueLength;
    if (options.likesBoostEnabled !== undefined) likesBoostEnabled = options.likesBoostEnabled;
    if (options.likesThreshold) likesThreshold = options.likesThreshold;
    if (options.commentsBoostEnabled !== undefined) commentsBoostEnabled = options.commentsBoostEnabled;
    if (options.menuThemeId) themeId = options.menuThemeId;
  }

  // Normalización del estado actual
  const currentQueue = currentState.orderQueue ? [...currentState.orderQueue] : [];
  let nextRushCoins = currentState.rushCoins || 0;
  let rushHourActiveUntil = currentState.rushHourActiveUntil || 0;
  let isFire = Boolean(currentState.isFireEmergency);
  let extProgress = currentState.extinguishProgress || 0;
  let speedMultiplier = currentState.speedMultiplier || 1.0;
  let likesCount = currentState.likesCount || 0;
  let boostActiveUntil = currentState.boostActiveUntil || 0;
  let recentCheer = currentState.recentCheer || null;
  const processedEventIds = currentState.processedEventIds ? [...currentState.processedEventIds] : [];

  const audioEffects: ('fireWoosh' | 'chime' | 'fanfare' | 'sizzle' | 'remySqueak')[] = [];
  let confettiEffect: 'extinguish' | 'rushHour' | null = null;
  let newOrderCreated: FoodOrder | null = null;
  let stackedOrderCreated: FoodOrder | null = null;

  // 1. DEDUPLICACIÓN ESTRICTA: Ignorar si el evento ya fue procesado
  if (event.id) {
    if (processedEventIds.includes(event.id)) {
      return {
        ...currentState,
        orderQueue: currentQueue,
        orderQueueCount: currentQueue.length,
        isDuplicate: true,
      };
    }
    processedEventIds.push(event.id);
    if (processedEventIds.length > 200) {
      processedEventIds.shift();
    }
  }

  const isRushHour = rushHourActiveUntil > now;

  // PROCESAMIENTO DE REGALOS (GIFT)
  if (event.type === 'gift') {
    const diamonds = Number(event.data.diamondCount) || 1;
    const repeatCount = Number(event.data.repeatCount) || 1;
    const totalDiamonds = diamonds * repeatCount;
    const giftName = event.data.giftName || 'Regalo';
    const giftLower = giftName.toLowerCase();
    const isVip = totalDiamonds >= vipOrderMinCoins;

    // Sabotaje: Regalo incendiario activa Cocina en Llamas
    if (
      giftLower.includes('fuego') ||
      giftLower.includes('llama') ||
      giftLower.includes('picante') ||
      giftLower.includes('fire') ||
      giftLower.includes('diablo') ||
      giftLower.includes('chile')
    ) {
      isFire = true;
      extProgress = 0;
      audioEffects.push('fireWoosh');
    }

    // Espectadores apagan la cocina con bebidas, agua, rosas o jugos
    if (
      isFire &&
      (giftLower.includes('agua') ||
        giftLower.includes('jugo') ||
        giftLower.includes('refresco') ||
        giftLower.includes('ice') ||
        giftLower.includes('hielo') ||
        giftLower.includes('water') ||
        giftLower.includes('drink') ||
        giftLower.includes('chicha') ||
        giftLower.includes('flor') ||
        giftLower.includes('rosa') ||
        giftLower.includes('rose'))
    ) {
      extProgress = Math.min(30, extProgress + 12);
      if (extProgress >= 30) {
        isFire = false;
        audioEffects.push('fanfare');
        confettiEffect = 'extinguish';
      }
    }

    // Meta Comunitaria ("Fiebre de Cocina / Rush Hour")
    nextRushCoins += totalDiamonds;
    if (nextRushCoins >= goalCoins && rushHourActiveUntil <= now) {
      rushHourActiveUntil = now + 45000; // 45 segundos de Fiebre Dorada
      nextRushCoins = 0;
      audioEffects.push('fanfare');
      confettiEffect = 'rushHour';
    }

    // Selección del plato
    const selectedDish = selectDishForGift(giftName, totalDiamonds, isVip, themeId);
    const pointsEarned = calculateFoodRushPoints(selectedDish.points, totalDiamonds, isVip, isRushHour);
    const cookDurationMs = calculateCookDurationMs(totalDiamonds);

    const newOrder: FoodOrder = {
      id: `order-${now}-${Math.random().toString(36).substring(2, 7)}`,
      userId: event.user.id || event.user.username,
      username: event.user.username,
      nickname: event.user.nickname || event.user.username,
      avatarUrl: event.user.avatarUrl,
      dishName: selectedDish.name,
      dishEmoji: selectedDish.emoji,
      isVip,
      diamonds: totalDiamonds,
      giftName,
      repeatCount,
      status: 'queued',
      cookDurationMs,
      cookProgress: 0,
      createdAt: now,
      pointsEarned,
      comboCount: 1,
    };

    audioEffects.push(isVip ? 'fireWoosh' : 'chime');

    // Combo Stacking: Si el mismo usuario pide el mismo plato en menos de 4s
    const lastIdx = currentQueue.findIndex(
      (o) =>
        o.username.toLowerCase() === newOrder.username.toLowerCase() &&
        o.dishName === newOrder.dishName &&
        o.status === 'queued' &&
        now - o.createdAt < 4000
    );

    if (lastIdx >= 0) {
      const existing = { ...currentQueue[lastIdx] };
      existing.comboCount = (existing.comboCount || 1) + 1;
      existing.diamonds += newOrder.diamonds;
      existing.pointsEarned += newOrder.pointsEarned;
      existing.cookDurationMs = Math.min(16000, existing.cookDurationMs + 2000);
      currentQueue[lastIdx] = existing;
      stackedOrderCreated = existing;
    } else {
      if (currentQueue.length >= maxQueueLength) {
        currentQueue.shift();
      }
      currentQueue.push(newOrder);
      newOrderCreated = newOrder;
    }

    recentCheer = {
      user: newOrder.username,
      text: `¡Pidió ${newOrder.dishName}! En preparación, espere... 🍳⏳`,
    };
  }

  // PROCESAMIENTO DE LIKES (LIKE)
  else if (event.type === 'like' && likesBoostEnabled) {
    const count = Number(event.data.likeCount) || 1;

    if (isFire) {
      extProgress = Math.min(30, extProgress + (count >= 5 ? 3 : 1));
      if (extProgress >= 30) {
        isFire = false;
        audioEffects.push('fanfare');
        confettiEffect = 'extinguish';
      }
    }

    likesCount += count;
    if (likesCount >= likesThreshold) {
      boostActiveUntil = now + 8000;
      speedMultiplier = 2.2;
      likesCount = 0;
    }
  }

  // PROCESAMIENTO DE COMENTARIOS (COMMENT)
  else if (event.type === 'comment' && commentsBoostEnabled) {
    const comment = (event.data.comment || '').trim();
    if (comment) {
      const lower = comment.toLowerCase();
      const isCallingRemy =
        lower.includes('remy') ||
        lower.includes('rata') ||
        lower.includes('ratita') ||
        lower.includes('queso') ||
        lower.includes('ratatouille');

      const isHungryComment =
        lower.includes('hambre') ||
        lower.includes('pedido') ||
        lower.includes('chaufa') ||
        lower.includes('burger') ||
        lower.includes('!pedir') ||
        lower.includes('comida');

      if (isCallingRemy) {
        audioEffects.push('remySqueak');
        recentCheer = {
          user: 'Remy',
          text: `¡${event.user.nickname || event.user.username} llamó a Remy! +15% Sazón 🧀✨`,
        };
        boostActiveUntil = Math.max(boostActiveUntil, now + 6000);
        speedMultiplier = Math.min(2.5, speedMultiplier + 0.2);
      } else if (isHungryComment) {
        recentCheer = {
          user: event.user.nickname || event.user.username,
          text: '¡Tiene hambre! Manda una Rosa para atenderte con prioridad VIP 🍲✨',
        };
        boostActiveUntil = Math.max(boostActiveUntil, now + 3000);
      } else {
        recentCheer = {
          user: event.user.nickname || event.user.username,
          text: comment.length > 32 ? comment.substring(0, 32) + '...' : comment,
        };
        boostActiveUntil = Math.max(boostActiveUntil, now + 4000);
        speedMultiplier = Math.min(2.5, Math.max(1.5, speedMultiplier));
      }
    }
  }

  return {
    ...currentState,
    orderQueue: currentQueue,
    rushCoins: nextRushCoins,
    rushHourActiveUntil,
    isFireEmergency: isFire,
    extinguishProgress: extProgress,
    speedMultiplier,
    likesCount,
    boostActiveUntil,
    recentCheer,
    topCustomers: currentState.topCustomers || [],
    orderQueueCount: currentQueue.length,
    processedEventIds,
    newOrder: newOrderCreated,
    stackedOrder: stackedOrderCreated,
    audioEffects,
    confettiEffect,
    isDuplicate: false,
  };
}

/**
 * Procesa acciones de juego locales o remotas de Food Rush.
 */
export function processFoodRushAction(
  action: string,
  currentState: FoodRushState,
  now: number = Date.now()
): FoodRushProcessResult {
  let isFire = Boolean(currentState.isFireEmergency);
  let extProgress = currentState.extinguishProgress || 0;
  let rushHourActiveUntil = currentState.rushHourActiveUntil || 0;
  const audioEffects: ('fireWoosh' | 'chime' | 'fanfare' | 'sizzle' | 'remySqueak')[] = [];
  let confettiEffect: 'extinguish' | 'rushHour' | null = null;

  if (action === 'sabotage_fire') {
    isFire = true;
    extProgress = 0;
    audioEffects.push('fireWoosh');
  } else if (action === 'extinguish_fire') {
    extProgress = Math.min(30, extProgress + 15);
    if (extProgress >= 30) {
      isFire = false;
      audioEffects.push('fanfare');
      confettiEffect = 'extinguish';
    }
  } else if (action === 'trigger_rush_hour') {
    rushHourActiveUntil = now + 45000;
    audioEffects.push('fanfare');
    confettiEffect = 'rushHour';
  }

  return {
    ...currentState,
    orderQueue: currentState.orderQueue || [],
    rushCoins: currentState.rushCoins || 0,
    rushHourActiveUntil,
    isFireEmergency: isFire,
    extinguishProgress: extProgress,
    speedMultiplier: currentState.speedMultiplier || 1.0,
    likesCount: currentState.likesCount || 0,
    boostActiveUntil: currentState.boostActiveUntil || 0,
    recentCheer: currentState.recentCheer || null,
    topCustomers: currentState.topCustomers || [],
    orderQueueCount: (currentState.orderQueue || []).length,
    processedEventIds: currentState.processedEventIds || [],
    audioEffects,
    confettiEffect,
  };
}
