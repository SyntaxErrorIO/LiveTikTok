import {
  AppSettings,
  AutomationRule,
  ConnectionConfig,
  ExecutionLog,
  LeaderboardEntry,
  OverlayEffect,
  StreamCounter,
} from '../types';

const STORAGE_KEYS = {
  RULES: 'livetrigger_rules_v1',
  EFFECTS: 'livetrigger_effects_v1',
  SETTINGS: 'livetrigger_settings_v1',
  CONNECTION: 'livetrigger_conn_v1',
  HISTORY: 'livetrigger_history_v1',
  COUNTERS: 'livetrigger_counters_v1',
  LEADERBOARD: 'livetrigger_leaderboard_v1',
};

export const DEFAULT_EFFECTS: OverlayEffect[] = [
  {
    id: 'eff-confetti-burst',
    name: 'Lluvia de Confeti & Neón',
    animationType: 'confetti_burst',
    titleTemplate: '¡REGALO DE {user}!',
    subtitleTemplate: 'Ha enviado {amount}x {gift} (+{diamonds} 💎)',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    durationMs: 4000,
    soundId: 'chime',
    soundVolume: 85,
    enableTTS: false,
    ttsTemplate: '¡Muchas gracias a {user} por el regalo {gift}!',
    position: 'top',
    badgeIcon: 'Sparkles',
  },
  {
    id: 'eff-cyber-strike',
    name: 'Cyber Strike Holograma',
    animationType: 'cyber_strike',
    titleTemplate: '⚡ ALERTA CYBER STRIKE ⚡',
    subtitleTemplate: '{user} desató {amount}x {gift} ({diamonds} Diamantes)',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    durationMs: 5000,
    soundId: 'laser',
    soundVolume: 90,
    enableTTS: true,
    ttsTemplate: 'Atención al directo: {user} acaba de detonar una {gift}',
    position: 'center',
    badgeIcon: 'Zap',
  },
  {
    id: 'eff-jackpot-gold',
    name: 'Jackpot Golden Legend',
    animationType: 'jackpot_gold',
    titleTemplate: '👑 DONACIÓN LEGENDARIA 👑',
    subtitleTemplate: '¡{user} ha donado un {gift} épico de {diamonds} diamantes!',
    primaryColor: '#eab308',
    secondaryColor: '#f59e0b',
    durationMs: 7000,
    soundId: 'fanfare',
    soundVolume: 95,
    enableTTS: true,
    ttsTemplate: '¡Increíble! {user} rompió el récord con un regalo {gift}. ¡Todos dejen su follow!',
    position: 'center',
    badgeIcon: 'Crown',
  },
  {
    id: 'eff-neon-pulse',
    name: 'Pulso Neón Galaxia',
    animationType: 'neon_pulse',
    titleTemplate: '🌌 IMPACTO CÓSMICO: {user}',
    subtitleTemplate: '{gift} enviado en racha ({amount}x)',
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    durationMs: 4500,
    soundId: 'powerup',
    soundVolume: 80,
    enableTTS: false,
    ttsTemplate: '{user} envió {amount} {gift}',
    position: 'top',
    badgeIcon: 'Flame',
  },
  {
    id: 'eff-rose-shower',
    name: 'Lluvia de Rosas Stream',
    animationType: 'rose_shower',
    titleTemplate: '🌹 RACHA DE ROSAS',
    subtitleTemplate: '{user} aportó {amount} Rosas al directo',
    primaryColor: '#f43f5e',
    secondaryColor: '#fb7185',
    durationMs: 3500,
    soundId: 'coin',
    soundVolume: 75,
    enableTTS: false,
    ttsTemplate: 'Gracias {user} por las rosas',
    position: 'bottom',
    badgeIcon: 'Heart',
  },
];

export const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'rule-galaxy-legend',
    name: 'Alerta Legendaria: Galaxia / León (>500 💎)',
    description: 'Dispara efectos de pantalla completa, fanfarria épica y TTS cuando se recibe un regalo de alto valor.',
    enabled: true,
    priority: 'high',
    triggerType: 'gift',
    conditions: {
      minDiamonds: 500,
    },
    actions: [
      {
        id: 'act-1',
        type: 'overlay_effect',
        enabled: true,
        effectId: 'eff-jackpot-gold',
      },
      {
        id: 'act-2',
        type: 'sound_fx',
        enabled: true,
        soundId: 'fanfare',
        volume: 95,
      },
      {
        id: 'act-3',
        type: 'tts_speech',
        enabled: true,
        ttsTemplate: '¡Tremenda donación de {user}! Gracias por {gift} de {diamonds} diamantes.',
        ttsSpeed: 1.0,
      },
    ],
    cooldownSeconds: 5,
    maxPerHour: 100,
    executionsCount: 14,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'rule-roses-shower',
    name: 'Racha de Rosas & Regalos Menores',
    description: 'Muestra un aviso rápido y sonido de monedas al recibir Rosas o regalos de 1 a 10 diamantes.',
    enabled: true,
    priority: 'medium',
    triggerType: 'gift',
    conditions: {
      minDiamonds: 1,
      maxDiamonds: 99,
    },
    actions: [
      {
        id: 'act-4',
        type: 'overlay_effect',
        enabled: true,
        effectId: 'eff-rose-shower',
      },
      {
        id: 'act-5',
        type: 'sound_fx',
        enabled: true,
        soundId: 'coin',
        volume: 75,
      },
    ],
    cooldownSeconds: 2,
    maxPerHour: 500,
    executionsCount: 88,
    createdAt: Date.now() - 72000000,
  },
  {
    id: 'rule-cyber-sub-welcome',
    name: 'Nuevo Seguidor / Suscriptor',
    description: 'Efecto holográfico futurista cada vez que un nuevo usuario se suscribe o sigue la transmisión.',
    enabled: true,
    priority: 'medium',
    triggerType: 'follow',
    conditions: {},
    actions: [
      {
        id: 'act-6',
        type: 'overlay_effect',
        enabled: true,
        effectId: 'eff-cyber-strike',
      },
      {
        id: 'act-7',
        type: 'sound_fx',
        enabled: true,
        soundId: 'laser',
        volume: 80,
      },
    ],
    cooldownSeconds: 4,
    maxPerHour: 200,
    executionsCount: 31,
    createdAt: Date.now() - 50000000,
  },
  {
    id: 'rule-comment-command',
    name: 'Comando Chat "!ruleta" o "!alerta"',
    description: 'Detecta palabras clave en el chat y lanza un sonido de poder con aviso en pantalla.',
    enabled: true,
    priority: 'low',
    triggerType: 'comment',
    conditions: {
      commentKeyword: '!alerta',
      commentMatchType: 'contains',
    },
    actions: [
      {
        id: 'act-8',
        type: 'sound_fx',
        enabled: true,
        soundId: 'powerup',
        volume: 70,
      },
      {
        id: 'act-9',
        type: 'overlay_effect',
        enabled: true,
        effectId: 'eff-neon-pulse',
      },
    ],
    cooldownSeconds: 10,
    maxPerHour: 50,
    executionsCount: 9,
    createdAt: Date.now() - 36000000,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  masterAutomationEnabled: true,
  masterVolume: 80,
  enableAudioSynthesizer: true,
  obsWebSocket: {
    enabled: false,
    url: 'ws://127.0.0.1:4455',
    password: '',
    connected: false,
  },
  globalRateLimitPerMinute: 60,
  defaultOverlayDurationMs: 4500,
  historyRetentionCount: 300,
};

export const DEFAULT_CONNECTION: ConnectionConfig = {
  mode: 'simulation',
  status: 'connected',
  username: 'streamer_live_pro',
  roomId: '7412984920491029381',
  bridgeServerUrl: 'ws://localhost:21213',
  autoReconnect: true,
  connectedAt: Date.now() - 3600000,
  lastActivityAt: Date.now(),
  viewerCount: 1420,
  likeTotal: 28450,
  pingMs: 18,
};

export const DEFAULT_COUNTERS: StreamCounter[] = [
  {
    id: 'cnt-diamonds',
    name: 'Meta de Diamantes',
    current: 320,
    target: 500,
    unit: '💎',
    lastUpdated: Date.now(),
  },
  {
    id: 'cnt-likes',
    name: 'Meta de Likes',
    current: 14200,
    target: 20000,
    unit: '❤️',
    lastUpdated: Date.now(),
  },
];

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: '1',
    username: 'AstroVIP',
    nickname: 'Astro VIP',
    points: 1250,
    giftsCount: 14,
    lastUpdated: Date.now(),
  },
  {
    userId: '2',
    username: 'RosaFan',
    nickname: 'Rosa Fan',
    points: 680,
    giftsCount: 22,
    lastUpdated: Date.now(),
  },
  {
    userId: '3',
    username: 'LionKing',
    nickname: 'Rey León',
    points: 500,
    giftsCount: 3,
    lastUpdated: Date.now(),
  },
];

export class StorageService {
  public static getRules(): AutomationRule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RULES);
      if (!data) {
        this.saveRules(DEFAULT_RULES);
        return DEFAULT_RULES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_RULES;
    }
  }

  public static saveRules(rules: AutomationRule[]) {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  }

  public static getEffects(): OverlayEffect[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EFFECTS);
      if (!data) {
        this.saveEffects(DEFAULT_EFFECTS);
        return DEFAULT_EFFECTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_EFFECTS;
    }
  }

  public static saveEffects(effects: OverlayEffect[]) {
    localStorage.setItem(STORAGE_KEYS.EFFECTS, JSON.stringify(effects));
  }

  public static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  public static getConnection(): ConnectionConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONNECTION);
      if (!data) {
        this.saveConnection(DEFAULT_CONNECTION);
        return DEFAULT_CONNECTION;
      }
      return { ...DEFAULT_CONNECTION, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONNECTION;
    }
  }

  public static saveConnection(conn: ConnectionConfig) {
    localStorage.setItem(STORAGE_KEYS.CONNECTION, JSON.stringify(conn));
  }

  public static getHistory(): ExecutionLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static addHistoryLog(log: ExecutionLog, maxCount: number = 300): ExecutionLog[] {
    try {
      const current = this.getHistory();
      const updated = [log, ...current].slice(0, maxCount);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return updated;
    } catch {
      return [log];
    }
  }

  public static clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }

  public static exportFullConfig(): string {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      rules: this.getRules(),
      effects: this.getEffects(),
      settings: this.getSettings(),
      connection: this.getConnection(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public static importFullConfig(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.rules && Array.isArray(data.rules)) {
        this.saveRules(data.rules);
      }
      if (data.effects && Array.isArray(data.effects)) {
        this.saveEffects(data.effects);
      }
      if (data.settings && typeof data.settings === 'object') {
        this.saveSettings(data.settings);
      }
      if (data.connection && typeof data.connection === 'object') {
        this.saveConnection(data.connection);
      }
      return true;
    } catch {
      return false;
    }
  }

  public static getCounters(): StreamCounter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COUNTERS);
      if (!data) {
        this.saveCounters(DEFAULT_COUNTERS);
        return DEFAULT_COUNTERS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_COUNTERS;
    }
  }

  public static saveCounters(counters: StreamCounter[]) {
    localStorage.setItem(STORAGE_KEYS.COUNTERS, JSON.stringify(counters));
  }

  public static getLeaderboard(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (!data) {
        this.saveLeaderboard(DEFAULT_LEADERBOARD);
        return DEFAULT_LEADERBOARD;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_LEADERBOARD;
    }
  }

  public static saveLeaderboard(leaderboard: LeaderboardEntry[]) {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }

  public static resetToFactoryDefaults() {
    this.saveRules(DEFAULT_RULES);
    this.saveEffects(DEFAULT_EFFECTS);
    this.saveSettings(DEFAULT_SETTINGS);
    this.saveConnection(DEFAULT_CONNECTION);
    this.saveCounters(DEFAULT_COUNTERS);
    this.saveLeaderboard(DEFAULT_LEADERBOARD);
    this.clearHistory();
  }
}
