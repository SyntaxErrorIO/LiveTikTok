import { TikTokEvent } from '../../../types';

export interface BossBattleState {
  bossHp: number;
  maxHp: number;
  shield: number;
  heroes: { username: string; damage: number; attacksCount: number; combo: number }[];
}

export function processBossBattleEvent(
  event: TikTokEvent,
  currentState: BossBattleState
): BossBattleState {
  if (!event || !event.type) return currentState;

  let nextHp = currentState.bossHp;
  let nextShield = currentState.shield;
  const nextHeroes = [...currentState.heroes];

  if (event.type === 'gift') {
    const coins = (Number(event.data.diamondCount) || 1) * (Number(event.data.repeatCount) || 1);
    let damage = coins * 15;

    if (coins >= 50) {
      damage = 600;
    } else if (coins >= 15) {
      damage = 250;
    } else if (coins >= 5) {
      damage = 80;
    } else {
      damage = 15;
    }

    nextHp = Math.max(0, currentState.bossHp - damage);

    const username = event.user.username;
    const existing = nextHeroes.find((h) => h.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      existing.damage += damage;
      existing.attacksCount += 1;
    } else {
      nextHeroes.push({
        username,
        damage,
        attacksCount: 1,
        combo: 1,
      });
    }
  } else if (event.type === 'like') {
    const count = Number(event.data.likeCount) || 1;
    nextShield = Math.min(100, currentState.shield + count * 0.5);
  } else if (event.type === 'comment') {
    const text = (event.data.comment || '').toLowerCase().trim();
    if (text.includes('!atacar') || text.includes('ataque') || text.includes('fuego')) {
      nextHp = Math.max(0, currentState.bossHp - 5);
    }
  }

  return {
    ...currentState,
    bossHp: nextHp,
    shield: nextShield,
    heroes: nextHeroes,
  };
}
