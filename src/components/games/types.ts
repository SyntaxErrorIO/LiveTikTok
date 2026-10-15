export type LiveGameId = 'street_food_rush' | 'boss_battle' | 'gift_race' | 'none';

export interface LiveDish {
  id: string;
  name: string;
  emoji: string;
  category: 'quick' | 'vip';
  cookTimeSec: number;
  points: number;
  soundName?: string;
}

export interface LiveMenuItem {
  id: string;
  triggerGift: string; // e.g. 'Flor / Rosa (1 🪙)'
  dishName: string;    // e.g. 'Solo Jugo Helado'
  emoji: string;       // 🥤
  description: string; // 'Jugo frutal helado con cañita'
  coins: number;       // 1
  isVip?: boolean;
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
}

export interface LiveGameConfig {
  activeGameId: LiveGameId;
  aspectRatio: '9:16' | 'responsive';
  sceneTheme?: 'stall' | 'transparent';
  showTopCustomers: boolean;
  soundVolume: number;
  foodRush: FoodRushSettings;
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
