import { TikTokEvent } from '../../../types';

export interface BossHeroEntry {
  username: string;
  nickname: string;
  avatarUrl?: string;
  damage: number;
  attacksCount: number;
  combo: number;
}

export interface BossBattleState {
  bossHp: number;
  maxHp: number;
  bossState: 'idle' | 'hit' | 'enraged' | 'defeated';
  shield: number;
  heroes: BossHeroEntry[];
  recentAttack?: { user: string; text: string; gift?: string; avatarUrl?: string } | null;
  userCombos?: Record<string, { count: number; lastTime: number }>;
  chatCooldowns?: Record<string, number>;
  processedEventIds?: string[];
}

export interface BossBattleProcessResult extends BossBattleState {
  damageDealt?: number;
  isCrit?: boolean;
  combo?: number;
  attackType?: 'gift' | 'chat' | 'action';
  projectileType?: 'fireball' | 'lightning' | 'sword';
  isDuplicate?: boolean;
  attacker?: {
    username: string;
    nickname?: string;
    avatarUrl?: string;
  };
}

/**
 * Calcula el daño base de regalo según las monedas de TikTok:
 * - 50+ monedas (León, Universo, etc.) -> 600 daño, crítico garantizado
 * - 15-49 monedas (Donas, Rosa masiva, etc.) -> 250 daño, crítico garantizado
 * - 5-14 monedas (Corazón, etc.) -> 80 daño
 * - 1-4 monedas (Rosa individual, etc.) -> 15 daño
 */
export function calculateGiftDamage(coins: number): { baseDamage: number; isCrit: boolean } {
  if (coins >= 50) {
    return { baseDamage: 600, isCrit: true };
  } else if (coins >= 15) {
    return { baseDamage: 250, isCrit: true };
  } else if (coins >= 5) {
    return { baseDamage: 80, isCrit: false };
  }
  return { baseDamage: 15, isCrit: false };
}

/**
 * Aplica combo por usuario si ataca dentro de una ventana de 4 segundos.
 * El combo multiplica el daño hasta x10 y a partir de combo x3 otorga golpe crítico.
 */
export function applyUserCombo(
  username: string,
  baseDamage: number,
  isCritInitial: boolean,
  userCombos: Record<string, { count: number; lastTime: number }>,
  now: number = Date.now()
): {
  finalDamage: number;
  combo: number;
  isCrit: boolean;
  updatedCombos: Record<string, { count: number; lastTime: number }>;
} {
  const usernameKey = username.toLowerCase();
  const existing = userCombos[usernameKey];

  let combo = 1;
  if (existing && now - existing.lastTime < 4000) {
    combo = existing.count + 1;
  }

  const updatedCombos = {
    ...userCombos,
    [usernameKey]: { count: combo, lastTime: now },
  };

  const finalDamage = baseDamage * Math.min(combo, 10);
  const isCrit = isCritInitial || combo >= 3;

  return { finalDamage, combo, isCrit, updatedCombos };
}

/**
 * Actualiza el ranking de los 10 mejores héroes atacantes de la incursión.
 */
export function updateBossHeroesLeaderboard(
  heroes: BossHeroEntry[],
  user: { username: string; nickname?: string; avatarUrl?: string },
  damage: number,
  combo: number
): BossHeroEntry[] {
  const usernameKey = user.username.toLowerCase();
  const nextHeroes = heroes.map((h) => ({ ...h }));
  const existingIdx = nextHeroes.findIndex((h) => h.username.toLowerCase() === usernameKey);

  if (existingIdx >= 0) {
    const item = { ...nextHeroes[existingIdx] };
    item.damage += damage;
    item.attacksCount += 1;
    item.combo = combo;
    if (user.avatarUrl) item.avatarUrl = user.avatarUrl;
    if (user.nickname) item.nickname = user.nickname;
    nextHeroes[existingIdx] = item;
  } else {
    nextHeroes.push({
      username: user.username,
      nickname: user.nickname || user.username,
      avatarUrl: user.avatarUrl,
      damage,
      attacksCount: 1,
      combo,
    });
  }

  nextHeroes.sort((a, b) => b.damage - a.damage);
  return nextHeroes.slice(0, 10);
}

/**
 * Función principal y unificada para procesar eventos TikTok LIVE en Boss Battle.
 * Usada tanto por BossBattleGame.tsx en producción como por los tests unitarios.
 */
export function processBossBattleEvent(
  event: TikTokEvent,
  currentState: BossBattleState,
  now: number = Date.now()
): BossBattleProcessResult {
  const maxHp = currentState.maxHp || 1000;
  const currentHp = currentState.bossHp !== undefined ? currentState.bossHp : maxHp;
  const currentShield = currentState.shield !== undefined ? currentState.shield : 30;
  const currentHeroes = currentState.heroes ? [...currentState.heroes] : [];
  const currentCombos = { ...(currentState.userCombos || {}) };
  const currentChatCooldowns = { ...(currentState.chatCooldowns || {}) };
  const processedEventIds = currentState.processedEventIds ? [...currentState.processedEventIds] : [];

  if (!event || !event.type) {
    return {
      ...currentState,
      bossHp: currentHp,
      maxHp,
      bossState: currentState.bossState || (currentHp === 0 ? 'defeated' : 'idle'),
      shield: currentShield,
      heroes: currentHeroes,
      userCombos: currentCombos,
      chatCooldowns: currentChatCooldowns,
      processedEventIds,
    };
  }

  // 1. DEDUPLICACIÓN ESTRICTA: Evita daño repetido si el evento ya fue procesado
  if (event.id) {
    if (processedEventIds.includes(event.id)) {
      return {
        ...currentState,
        bossHp: currentHp,
        maxHp,
        bossState: currentState.bossState || (currentHp === 0 ? 'defeated' : 'idle'),
        shield: currentShield,
        heroes: currentHeroes,
        userCombos: currentCombos,
        chatCooldowns: currentChatCooldowns,
        processedEventIds,
        isDuplicate: true,
      };
    }
    processedEventIds.push(event.id);
    if (processedEventIds.length > 200) {
      processedEventIds.shift();
    }
  }

  // 2. REGALOS: Ataques de proyectil poderosos
  if (event.type === 'gift') {
    const coins = (Number(event.data.diamondCount) || 1) * (Number(event.data.repeatCount) || 1);
    const giftName = event.data.giftName || 'Regalo';
    const { baseDamage, isCrit: initialCrit } = calculateGiftDamage(coins);

    const { finalDamage, combo, isCrit, updatedCombos } = applyUserCombo(
      event.user.username,
      baseDamage,
      initialCrit,
      currentCombos,
      now
    );

    const nextHp = Math.max(0, currentHp - finalDamage);
    const isEnraged = nextHp < maxHp * 0.4 && nextHp > 0;
    const nextBossState = nextHp === 0 ? 'defeated' : 'hit';

    const nextHeroes = updateBossHeroesLeaderboard(
      currentHeroes,
      event.user,
      finalDamage,
      combo
    );

    const projType: 'fireball' | 'lightning' | 'sword' =
      finalDamage >= 300 ? 'lightning' : finalDamage >= 100 ? 'fireball' : 'sword';

    const recentAttack = {
      user: event.user.nickname || event.user.username,
      text: `-${finalDamage} HP ${combo > 1 ? `(¡Combo x${combo}!)` : ''} ${isCrit ? '¡CRÍTICO!' : ''}`,
      gift: giftName,
      avatarUrl: event.user.avatarUrl,
    };

    return {
      ...currentState,
      bossHp: nextHp,
      maxHp,
      bossState: nextBossState,
      shield: currentShield,
      heroes: nextHeroes,
      userCombos: updatedCombos,
      chatCooldowns: currentChatCooldowns,
      processedEventIds,
      recentAttack,
      damageDealt: finalDamage,
      isCrit,
      combo,
      attackType: 'gift',
      projectileType: projType,
      attacker: {
        username: event.user.username,
        nickname: event.user.nickname,
        avatarUrl: event.user.avatarUrl,
      },
      isDuplicate: false,
    };
  }

  // 3. LIKES: Refuerzan el escudo comunitario
  if (event.type === 'like') {
    const count = Number(event.data.likeCount) || 1;
    const nextShield = Math.min(100, currentShield + count * 0.5);

    return {
      ...currentState,
      bossHp: currentHp,
      maxHp,
      bossState: currentState.bossState || (currentHp === 0 ? 'defeated' : 'idle'),
      shield: nextShield,
      heroes: currentHeroes,
      userCombos: currentCombos,
      chatCooldowns: currentChatCooldowns,
      processedEventIds,
      isDuplicate: false,
    };
  }

  // 4. COMENTARIOS: Comando chat !atacar con enfriamiento de 10s por usuario
  if (event.type === 'comment') {
    const text = (event.data.comment || '').toLowerCase().trim();
    if (text.includes('!atacar') || text.includes('ataque') || text.includes('fuego')) {
      const usernameKey = event.user.username.toLowerCase();
      const lastAttackTime = currentChatCooldowns[usernameKey] || 0;

      // Cooldown de 10 segundos por usuario
      if (now - lastAttackTime >= 10000 || lastAttackTime === 0) {
        currentChatCooldowns[usernameKey] = now;
        const baseDamage = 5;

        const { finalDamage, combo, isCrit, updatedCombos } = applyUserCombo(
          event.user.username,
          baseDamage,
          false,
          currentCombos,
          now
        );

        const nextHp = Math.max(0, currentHp - finalDamage);
        const nextBossState = nextHp === 0 ? 'defeated' : 'hit';

        const nextHeroes = updateBossHeroesLeaderboard(
          currentHeroes,
          event.user,
          finalDamage,
          combo
        );

        const recentAttack = {
          user: event.user.nickname || event.user.username,
          text: `-${finalDamage} HP ${combo > 1 ? `(¡Combo x${combo}!)` : ''}`,
          gift: 'Comando Chat (!atacar)',
          avatarUrl: event.user.avatarUrl,
        };

        return {
          ...currentState,
          bossHp: nextHp,
          maxHp,
          bossState: nextBossState,
          shield: currentShield,
          heroes: nextHeroes,
          userCombos: updatedCombos,
          chatCooldowns: currentChatCooldowns,
          processedEventIds,
          recentAttack,
          damageDealt: finalDamage,
          isCrit,
          combo,
          attackType: 'chat',
          projectileType: 'sword',
          attacker: {
            username: event.user.username,
            nickname: event.user.nickname,
            avatarUrl: event.user.avatarUrl,
          },
          isDuplicate: false,
        };
      }
    }
  }

  return {
    ...currentState,
    bossHp: currentHp,
    maxHp,
    bossState: currentState.bossState || (currentHp === 0 ? 'defeated' : 'idle'),
    shield: currentShield,
    heroes: currentHeroes,
    userCombos: currentCombos,
    chatCooldowns: currentChatCooldowns,
    processedEventIds,
    isDuplicate: false,
  };
}

/**
 * Procesa acciones de ataque directo externas (ej: GAME_ACTION_RECEIVED BOSS_ATTACK).
 */
export function processBossBattleAction(
  payload: {
    username?: string;
    nickname?: string;
    avatarUrl?: string;
    damage?: number;
    gift?: string;
    isCrit?: boolean;
  },
  currentState: BossBattleState,
  now: number = Date.now()
): BossBattleProcessResult {
  const maxHp = currentState.maxHp || 1000;
  const currentHp = currentState.bossHp !== undefined ? currentState.bossHp : maxHp;
  const user = {
    username: payload.username || 'heroe_live',
    nickname: payload.nickname || 'Héroe del Chat',
    avatarUrl: payload.avatarUrl,
  };
  const baseDamage = payload.damage || 50;

  const { finalDamage, combo, isCrit, updatedCombos } = applyUserCombo(
    user.username,
    baseDamage,
    Boolean(payload.isCrit),
    currentState.userCombos || {},
    now
  );

  const nextHp = Math.max(0, currentHp - finalDamage);
  const nextBossState = nextHp === 0 ? 'defeated' : 'hit';
  const nextHeroes = updateBossHeroesLeaderboard(
    currentState.heroes || [],
    user,
    finalDamage,
    combo
  );

  const projType: 'fireball' | 'lightning' | 'sword' =
    finalDamage >= 300 ? 'lightning' : finalDamage >= 100 ? 'fireball' : 'sword';

  const recentAttack = {
    user: user.nickname || user.username,
    text: `-${finalDamage} HP ${combo > 1 ? `(¡Combo x${combo}!)` : ''} ${isCrit ? '¡CRÍTICO!' : ''}`,
    gift: payload.gift || 'Ataque Especial',
    avatarUrl: user.avatarUrl,
  };

  return {
    ...currentState,
    bossHp: nextHp,
    maxHp,
    bossState: nextBossState,
    shield: currentState.shield || 30,
    heroes: nextHeroes,
    userCombos: updatedCombos,
    chatCooldowns: currentState.chatCooldowns || {},
    processedEventIds: currentState.processedEventIds || [],
    recentAttack,
    damageDealt: finalDamage,
    isCrit,
    combo,
    attackType: 'action',
    projectileType: projType,
    attacker: user,
  };
}
