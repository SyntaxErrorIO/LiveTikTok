import {
  LiveGameId,
  LiveGameMetadata,
  LiveGameConfig,
  LiveDish,
  LiveMenuItem,
  MenuThemeId,
} from './types';

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
    tags: ['Regalos 1-20 Monedas', 'Carta en Pantalla', 'Showcase Pantalla Completa', 'Meta Rush Hour'],
  },
  {
    id: 'boss_battle',
    title: 'Batalla de Jefe / Boss Raid Arena',
    subtitle: 'Derrota al dragón colosal en equipo con tus espectadores',
    description:
      'Un monstruo legendario ataca la transmisión con una barra masiva de vida. Las rosas infligen ataques ligeros de espada, los regalos medianos lanzan bolas de fuego y los leones desatan meteoros colosales.',
    status: 'active',
    badge: '¡Disponible & Jugable!',
    icon: 'Swords',
    tags: ['Barra de Vida de Jefe', 'Ataques por Regalos', 'Escudo Comunitario', 'Ranking de Daño'],
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
 * TEMA 1: Sazón Peruana / Street Food Andino
 */
export const PERUVIAN_MENU_ITEMS: LiveMenuItem[] = [
  {
    id: 'pe-jugo',
    themeId: 'peruvian_sazon',
    triggerGift: '🌹 Flor / Rosa (1 🪙)',
    dishName: 'Chicha Morada Helada / Solo Jugo',
    emoji: '🥤',
    description: 'Chicha morada helada con limón y frutas al paso',
    coins: 1,
    isVip: false,
  },
  {
    id: 'pe-chaufa',
    themeId: 'peruvian_sazon',
    triggerGift: '💖 Corazón / Quereme (5 🪙)',
    dishName: 'Segundo de Chaufa Especial',
    emoji: '🍲',
    description: 'Arroz chaufa al wok humeante con wantán crocante',
    coins: 5,
    isVip: true,
  },
  {
    id: 'pe-salchipapa',
    themeId: 'peruvian_sazon',
    triggerGift: '🌭 Hot Dog / Sombrero (10 🪙)',
    dishName: 'Salchipapa Suprema Carretillera',
    emoji: '🌭🍟',
    description: 'Papas nativas crujientes con salchicha y cremas',
    coins: 10,
    isVip: false,
  },
  {
    id: 'pe-lomo',
    themeId: 'peruvian_sazon',
    triggerGift: '🔥 Donas / VIP (15 🪙)',
    dishName: 'Lomo Saltado Flambeado VIP',
    emoji: '🥩🔥',
    description: 'Lomo tierno saltado a fuego vivo con papas y ají',
    coins: 15,
    isVip: true,
  },
  {
    id: 'pe-anticuchos',
    themeId: 'peruvian_sazon',
    triggerGift: '🍢 Brocheta / Perfume (25 🪙)',
    dishName: 'Anticuchos de Corazón a la Brasa',
    emoji: '🍢🔥',
    description: 'Corazón macerado al ají panca con choclo y papa dorada',
    coins: 25,
    isVip: true,
  },
  {
    id: 'pe-pollo',
    themeId: 'peruvian_sazon',
    triggerGift: '👑 León / Galaxia (50+ 🪙)',
    dishName: 'Banquete de Pollo a la Brasa & Picarones',
    emoji: '🍗👑',
    description: 'Festín imperial con pollo jugoso, papas y picarones con miel',
    coins: 50,
    isVip: true,
  },
];

/**
 * TEMA 2: Street Burger & Fries
 */
export const BURGER_MENU_ITEMS: LiveMenuItem[] = [
  {
    id: 'bg-shake',
    themeId: 'street_burger',
    triggerGift: '🌹 Flor / Rosa (1 🪙)',
    dishName: 'Solo Jugo / Malteada Helada',
    emoji: '🥤',
    description: 'Malteada cremosa de fresa y vainilla con crema',
    coins: 1,
    isVip: false,
  },
  {
    id: 'bg-fries',
    themeId: 'street_burger',
    triggerGift: '💖 Corazón / Quereme (5 🪙)',
    dishName: 'Papas Fritas con Queso Cheddar & Bacon',
    emoji: '🍟🥓',
    description: 'Papas doradas bañadas en queso fundido y tocino',
    coins: 5,
    isVip: false,
  },
  {
    id: 'bg-hotdog',
    themeId: 'street_burger',
    triggerGift: '🌭 Hot Dog (10 🪙)',
    dishName: 'Hot Dog Gigante New York Style',
    emoji: '🌭',
    description: 'Salchicha parrillera con chucrut y mostaza dulce',
    coins: 10,
    isVip: false,
  },
  {
    id: 'bg-smash',
    themeId: 'street_burger',
    triggerGift: '🔥 Donas / VIP (15 🪙)',
    dishName: 'Monster Smash Burger Doble VIP',
    emoji: '🍔🔥',
    description: 'Doble carne angus smash crujiente y cebolla caramelizada',
    coins: 15,
    isVip: true,
  },
  {
    id: 'bg-combo',
    themeId: 'street_burger',
    triggerGift: '👑 León / Galaxia (50+ 🪙)',
    dishName: 'Combo Imperial Mega Burger & Aros',
    emoji: '🍔👑',
    description: 'Triple carne, aros de cebolla crocantes y sundae gigante',
    coins: 50,
    isVip: true,
  },
];

/**
 * TEMA 3: Sushi & Ramen Bar
 */
export const SUSHI_RAMEN_MENU_ITEMS: LiveMenuItem[] = [
  {
    id: 'sr-tea',
    themeId: 'sushi_ramen',
    triggerGift: '🌹 Flor / Rosa (1 🪙)',
    dishName: 'Té Verde Matcha Helado / Bebida',
    emoji: '🍵',
    description: 'Té matcha ceremonial frío con hielo y menta',
    coins: 1,
    isVip: false,
  },
  {
    id: 'sr-gyoza',
    themeId: 'sushi_ramen',
    triggerGift: '💖 Corazón / Quereme (5 🪙)',
    dishName: 'Gyozas al Vapor con Salsa Ponzu',
    emoji: '🥟',
    description: 'Empanaditas japonesas rellenas de carne doradas al sartén',
    coins: 5,
    isVip: false,
  },
  {
    id: 'sr-roll',
    themeId: 'sushi_ramen',
    triggerGift: '🍣 Sushi / Sombrero (10 🪙)',
    dishName: 'Roll Dragón Acevichado Flambeado',
    emoji: '🍣🔥',
    description: 'Maki roll relleno de langostino furai bañado en salsa flambeada',
    coins: 10,
    isVip: true,
  },
  {
    id: 'sr-ramen',
    themeId: 'sushi_ramen',
    triggerGift: '🔥 Donas / VIP (15 🪙)',
    dishName: 'Ramen Tonkotsu Especial Humeante',
    emoji: '🍜🔥',
    description: 'Caldo denso con fideos artesanales, chashu tierno y huevo ajitsuke',
    coins: 15,
    isVip: true,
  },
  {
    id: 'sr-bento',
    themeId: 'sushi_ramen',
    triggerGift: '👑 León / Galaxia (50+ 🪙)',
    dishName: 'Banquete Bento Samurai Imperial',
    emoji: '🍱👑',
    description: 'Sashimi fresco, takoyaki caliente, tempura de langostinos y sake',
    coins: 50,
    isVip: true,
  },
];

/**
 * Selector de lista de menú según la temática configurada
 */
export function getMenuItemsByTheme(themeId: MenuThemeId): LiveMenuItem[] {
  switch (themeId) {
    case 'street_burger':
      return BURGER_MENU_ITEMS;
    case 'sushi_ramen':
      return SUSHI_RAMEN_MENU_ITEMS;
    case 'peruvian_sazon':
    default:
      return PERUVIAN_MENU_ITEMS;
  }
}

export const LIVE_MENU_ITEMS: LiveMenuItem[] = PERUVIAN_MENU_ITEMS;

export const QUICK_DISHES: LiveDish[] = [
  { id: 'dish-jugo', name: 'Solo Jugo / Refresco Helado', emoji: '🥤', category: 'quick', cookTimeSec: 2.8, points: 15 },
  { id: 'dish-fries', name: 'Papas Fritas Crujientes', emoji: '🍟', category: 'quick', cookTimeSec: 3.2, points: 15 },
  { id: 'dish-chaufa-quick', name: 'Segundo de Chaufa Especial', emoji: '🍲', category: 'quick', cookTimeSec: 3.5, points: 25 },
  { id: 'dish-burger', name: 'Hamburguesa Callejera', emoji: '🍔', category: 'quick', cookTimeSec: 4.0, points: 20 },
  { id: 'dish-gyoza', name: 'Gyozas al Vapor', emoji: '🥟', category: 'quick', cookTimeSec: 3.0, points: 18 },
  { id: 'dish-hotdog', name: 'Salchipapa Suprema', emoji: '🌭', category: 'quick', cookTimeSec: 3.2, points: 16 },
];

export const VIP_DISHES: LiveDish[] = [
  { id: 'dish-chaufa-vip', name: 'Segundo de Chaufa Especial VIP', emoji: '🍲🔥', category: 'vip', cookTimeSec: 4.2, points: 65 },
  { id: 'dish-vip-wok', name: 'Wok Dragón con Fuego Imperial', emoji: '🔥🍲', category: 'vip', cookTimeSec: 5.0, points: 80 },
  { id: 'dish-vip-lomo', name: 'Lomo Saltado Flambeado VIP', emoji: '🥩🔥', category: 'vip', cookTimeSec: 4.8, points: 70 },
  { id: 'dish-vip-lobster', name: 'Banquete de Pollo a la Brasa & Picarones', emoji: '🍗👑', category: 'vip', cookTimeSec: 5.5, points: 100 },
  { id: 'dish-vip-ramen', name: 'Mega Ramen Tonkotsu Maestro', emoji: '🍜👑', category: 'vip', cookTimeSec: 4.8, points: 85 },
];

export const DEFAULT_GAME_CONFIG: LiveGameConfig = {
  activeGameId: 'street_food_rush',
  aspectRatio: '9:16',
  sceneTheme: 'stall',
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
    // Nuevas mecánicas interactivas:
    menuThemeId: 'peruvian_sazon',
    rushHourGoalCoins: 50,
    ttsEnabled: true,
    fireSabotageActive: false,
  },
  bossBattle: {
    bossName: 'Dragón Colosal Ignis',
    bossMaxHp: 1000,
    bossCurrentHp: 1000,
    bossElement: 'dragon_fire',
    rewardCoinsGoal: 100,
    soundEnabled: true,
    shieldPercentage: 0,
  },
};
