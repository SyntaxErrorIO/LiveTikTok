export type LiveGameId = 'street_food_rush' | 'boss_battle' | 'gift_race' | 'none';

export type MenuThemeId = 'peruvian_sazon' | 'street_burger' | 'sushi_ramen';

export interface LiveDish {
  id: string;
  name: string;
  emoji: string;
  category: 'quick' | 'vip';
  cookTimeSec: number;
  points: number;
  soundName?: string;
  themeId?: MenuThemeId;
}

export interface LiveMenuItem {
  id: string;
  triggerGift: string; // e.g. 'Flor / Rosa (1 🪙)'
  dishName: string;    // e.g. 'Solo Jugo Helado'
  emoji: string;       // 🥤
  description: string; // 'Jugo frutal helado con cañita'
  coins: number;       // 1
  isVip?: boolean;
  themeId?: MenuThemeId;
}

export interface FoodRushSettings {
  quickOrderMinCoins: number;
  quickOrderMaxCoins: number;
  vipOrderMinCoins: number;
  vipOrderMaxCoins: number;
  baseCookingTimeSec: number;
  likesBoostEnabled: boolean;
  likesThreshold: number;
  commentsBoostEnabled: boolean;
  soundEnabled: boolean;
  maxQueueLength: number;
  menuDisplayMode: 'always' | 'compact' | 'hidden';
  fullScreenShowcaseEnabled: boolean;
  fullScreenDurationSec: number;
  // Nuevas mecánicas interactivas y virales:
  menuThemeId: MenuThemeId;
  rushHourGoalCoins: number;
  ttsEnabled: boolean;
  fireSabotageActive?: boolean;
}

export interface BossBattleSettings {
  bossName: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  bossElement: 'dragon_fire' | 'stone_titan' | 'cyber_demon';
  rewardCoinsGoal: number;
  soundEnabled: boolean;
  shieldPercentage: number;
}

export interface LiveGameConfig {
  activeGameId: LiveGameId;
  aspectRatio: '9:16' | 'responsive';
  sceneTheme?: 'stall' | 'transparent';
  showTopCustomers: boolean;
  soundVolume: number;
  foodRush: FoodRushSettings;
  bossBattle?: BossBattleSettings;
}

export interface FoodOrder {
  id: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  dishName: string;
  dishEmoji: string;
  isVip: boolean;
  diamonds: number;
  giftName: string;
  repeatCount: number;
  comboCount?: number;
  status: 'queued' | 'cooking' | 'serving' | 'completed';
  cookDurationMs: number;
  cookProgress: number; // 0 to 100
  createdAt: number;
  pointsEarned: number;
}

export interface CustomerLeaderboardEntry {
  username: string;
  nickname: string;
  avatarUrl?: string;
  totalOrders: number;
  totalPoints: number;
  totalDiamonds: number;
  vipOrders: number;
  lastOrderAt: number;
}

export interface LiveGameMetadata {
  id: LiveGameId;
  title: string;
  subtitle: string;
  description: string;
  status: 'active' | 'coming_soon';
  badge: string;
  icon: string;
  tags: string[];
}
