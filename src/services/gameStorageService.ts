import { LiveGameConfig, CustomerLeaderboardEntry } from '../components/games/types';
import { DEFAULT_GAME_CONFIG } from '../components/games/GameRegistry';
import { eventBus } from './eventBus';

const GAME_STORAGE_KEYS = {
  CONFIG: 'livetrigger_game_config_v1',
  TOP_CUSTOMERS: 'livetrigger_game_customers_v1',
};

export class GameStorageService {
  public static getConfig(): LiveGameConfig {
    if (typeof window === 'undefined') return DEFAULT_GAME_CONFIG;
    try {
      const raw = localStorage.getItem(GAME_STORAGE_KEYS.CONFIG);
      if (!raw) return DEFAULT_GAME_CONFIG;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_GAME_CONFIG,
        ...parsed,
        foodRush: {
          ...DEFAULT_GAME_CONFIG.foodRush,
          ...(parsed.foodRush || {}),
        },
      };
    } catch {
      return DEFAULT_GAME_CONFIG;
    }
  }

  public static saveConfig(config: LiveGameConfig): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GAME_STORAGE_KEYS.CONFIG, JSON.stringify(config));
      // Notify bus so OBS overlay window immediately synchronizes
      eventBus.broadcast({
        type: 'MASTER_SWITCH_CHANGED', // or notify through bus
        payload: true,
      });
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('livetrigger_games_channel');
          bc.postMessage({ type: 'CONFIG_UPDATED', config });
          bc.close();
        } catch {}
      }
    } catch {}
  }

  public static getTopCustomers(): CustomerLeaderboardEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(GAME_STORAGE_KEYS.TOP_CUSTOMERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static saveTopCustomers(customers: CustomerLeaderboardEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GAME_STORAGE_KEYS.TOP_CUSTOMERS, JSON.stringify(customers.slice(0, 50)));
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('livetrigger_games_channel');
          bc.postMessage({ type: 'CUSTOMERS_UPDATED', customers: customers.slice(0, 50) });
          bc.close();
        } catch {}
      }
    } catch {}
  }

  public static resetTopCustomers(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(GAME_STORAGE_KEYS.TOP_CUSTOMERS);
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('livetrigger_games_channel');
          bc.postMessage({ type: 'CUSTOMERS_RESET' });
          bc.close();
        } catch {}
      }
    } catch {}
  }
}
