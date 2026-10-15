import { LiveGameConfig, CustomerLeaderboardEntry } from '../components/games/types';
import { DEFAULT_GAME_CONFIG } from '../components/games/GameRegistry';
import { eventBus } from './eventBus';
import { apiService } from './apiService';

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
        bossBattle: {
          ...DEFAULT_GAME_CONFIG.bossBattle,
          ...(parsed.bossBattle || {}),
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

      // Sincronización en vivo entre pestañas
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('livetrigger_games_channel');
          bc.postMessage({ type: 'CONFIG_UPDATED', config });
          bc.close();
        } catch {}
      }

      // Sincronización Backend para navegadores independientes (OBS Studio CEF / TikTok Live Studio)
      apiService.saveGameConfig(config).catch(() => {});
    } catch {}
  }

  /**
   * Sincroniza la configuración del juego desde el servidor backend (crucial para OBS Studio CEF)
   */
  public static async syncFromServer(overlayToken?: string): Promise<LiveGameConfig> {
    try {
      const serverConfig = await apiService.getGameConfig(overlayToken);
      if (serverConfig && serverConfig.activeGameId) {
        const merged: LiveGameConfig = {
          ...DEFAULT_GAME_CONFIG,
          ...serverConfig,
          foodRush: {
            ...DEFAULT_GAME_CONFIG.foodRush,
            ...(serverConfig.foodRush || {}),
          },
          bossBattle: {
            ...DEFAULT_GAME_CONFIG.bossBattle,
            ...(serverConfig.bossBattle || {}),
          },
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(GAME_STORAGE_KEYS.CONFIG, JSON.stringify(merged));
        }
        return merged;
      }
    } catch {}
    return this.getConfig();
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
