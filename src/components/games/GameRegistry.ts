import { LiveGameId, LiveGameMetadata, LiveGameConfig, LiveDish, LiveMenuItem } from './types';

export const AVAILABLE_GAMES: LiveGameMetadata[] = [
  {
    id: 'street_food_rush',
    title: 'Vendedor de Comida / Street Food Rush',
    subtitle: 'El puesto callejero interactivo de TikTok LIVE',
    description:
      'Tus espectadores entran como clientes al puesto de comida rápida. Los regalos de 1 moneda piden órdenes express (Jugo, Papas, Chaufa), los de 5-20 monedas desatan órdenes VIP con fuego flambeado, y los likes aceleran al chef.',
    status: 'active',
    badge: '¡Disponible & Jugable!',
    icon: 'ChefHat',
    tags: ['Regalos 1-20 Monedas', 'Carta en Pantalla', 'Showcase Pantalla Completa', 'Ranking Top 3'],
  },
  {
    id: 'boss_battle',
    title: 'Batalla de Jefe / Boss Raid Arena',
    subtitle: 'Derrota al dragón colosal en equipo con tus espectadores',
    description:
      'Un monstruo legendario ataca la transmisión con una barra masiva de vida. Las rosas infligen ataques ligeros, los leones/galaxias lanzan meteoros mágicos y los likes cargan el escudo comunitario.',
    status: 'coming_soon',
    badge: 'Próximamente',
    icon: 'Swords',
    tags: ['Modo Cooperativo', 'Barra de Vida de Jefe', 'Ataques Especiales'],
  },
  {
    id: 'gift_race',
    title: 'Carrera de Regalos / Turbo Nitro Race',
    subtitle: 'Carrera de vehículos en pista vertical para viewers',
    description:
      'Cada regalo impulsa el coche del espectador o de su equipo en una pista vertical 9:16 hacia la meta con turbos y obstáculos.',
    status: 'coming_soon',
    badge: 'Próximamente',
    icon: 'Trophy',
    tags: ['Carrera 9:16', 'Equipos', 'Turbo Nitro'],
  },
  {
    id: 'none',
    title: 'Desactivado / Modo Estándar',
    subtitle: 'Solo alertas clásicas y metas de OBS',
    description:
      'Muestra únicamente las alertas tradicionales de regalos, metas de diamantes y ranking general de donadores sin minijuegos en pantalla.',
    status: 'active',
    badge: 'Clásico',
    icon: 'Monitor',
    tags: ['Alertas Pop-up', 'Barra de Metas', 'Sin Minijuegos'],
  },
];

/**
 * Carta oficial del Puesto de Comida en vivo:
 * Muestra a los espectadores del Live exactamente qué regalo deben enviar para ordenar cada plato.
 */
export const LIVE_MENU_ITEMS: LiveMenuItem[] = [
  {
    id: 'menu-jugo',
    triggerGift: '🌹 Flor / Rosa (1 Moneda)',
    dishName: 'Solo Jugo / Refresco Helado',
    emoji: '🥤',
    description: 'Jugo frutal helado con cañita y cubos de hielo',
    coins: 1,
    isVip: false,
  },
  {
    id: 'menu-chaufa',
    triggerGift: '💖 Corazón / Quereme (5-10 Monedas)',
    dishName: 'Segundo de Chaufa Especial',
    emoji: '🍲',
    description: 'Arroz chaufa al wok humeante con wantán crocante',
    coins: 5,
    isVip: true,
  },
  {
    id: 'menu-lomo',
    triggerGift: '🔥 Donas / VIP (15-20 Monedas)',
    dishName: 'Lomo Saltado Flambeado VIP',
    emoji: '🥩🔥',
    description: 'Lomo tierno saltado a fuego vivo con papas y ají',
    coins: 15,
    isVip: true,
  },
  {
    id: 'menu-banquete',
    triggerGift: '👑 León / Galaxia (50+ Monedas)',
    dishName: 'Banquete Imperial Supremo',
    emoji: '🦞✨',
    description: 'Gran festín dorado del chef con fuegos artificiales',
    coins: 50,
    isVip: true,
  },
];

export const QUICK_DISHES: LiveDish[] = [
  { id: 'dish-jugo', name: 'Solo Jugo / Refresco Helado', emoji: '🥤', category: 'quick', cookTimeSec: 2.8, points: 15 },
  { id: 'dish-fries', name: 'Papas Fritas Crujientes', emoji: '🍟', category: 'quick', cookTimeSec: 3.2, points: 15 },
  { id: 'dish-chaufa-quick', name: 'Segundo de Chaufa Especial', emoji: '🍲', category: 'quick', cookTimeSec: 3.5, points: 25 },
  { id: 'dish-burger', name: 'Hamburguesa Callejera', emoji: '🍔', category: 'quick', cookTimeSec: 4.0, points: 20 },
  { id: 'dish-taco', name: 'Tacos al Pastor', emoji: '🌮', category: 'quick', cookTimeSec: 3.5, points: 18 },
  { id: 'dish-dumpling', name: 'Dumplings al Vapor', emoji: '🥟', category: 'quick', cookTimeSec: 3.0, points: 15 },
  { id: 'dish-hotdog', name: 'Salchipapa Suprema', emoji: '🌭', category: 'quick', cookTimeSec: 3.2, points: 16 },
];

export const VIP_DISHES: LiveDish[] = [
  { id: 'dish-chaufa-vip', name: 'Segundo de Chaufa Especial VIP', emoji: '🍲🔥', category: 'vip', cookTimeSec: 4.2, points: 65 },
  { id: 'dish-vip-wok', name: 'Wok Dragón con Fuego Imperial', emoji: '🔥🍲', category: 'vip', cookTimeSec: 5.0, points: 80 },
  { id: 'dish-vip-lomo', name: 'Lomo Saltado Flambeado VIP', emoji: '🥩🔥', category: 'vip', cookTimeSec: 4.8, points: 70 },
  { id: 'dish-vip-lobster', name: 'Banquete Dorado del Chef', emoji: '🦞✨', category: 'vip', cookTimeSec: 5.5, points: 100 },
  { id: 'dish-vip-ramen', name: 'Mega Ramen Especial Maestro', emoji: '🍜👑', category: 'vip', cookTimeSec: 4.8, points: 85 },
];

export const DEFAULT_GAME_CONFIG: LiveGameConfig = {
  activeGameId: 'street_food_rush',
  aspectRatio: '9:16',
  showTopCustomers: true,
  soundVolume: 80,
  foodRush: {
    quickOrderMinCoins: 1,
    quickOrderMaxCoins: 4,
    vipOrderMinCoins: 5,
    vipOrderMaxCoins: 20,
    baseCookingTimeSec: 3.5,
    likesBoostEnabled: true,
    likesThreshold: 10,
    commentsBoostEnabled: true,
    soundEnabled: true,
    maxQueueLength: 15,
    menuDisplayMode: 'always',
    fullScreenShowcaseEnabled: true,
    fullScreenDurationSec: 3.5,
  },
};
