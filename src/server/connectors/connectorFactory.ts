import { ITikTokConnector } from './types';
import { SimulationConnector } from './simulationConnector';
import { BridgeTikTokConnector } from './bridgeConnector';

export class TikTokConnectorFactory {
  public static createConnector(mode: 'simulation' | 'real_tiktok'): ITikTokConnector {
    if (mode === 'simulation') {
      return new SimulationConnector();
    } else {
      return new BridgeTikTokConnector();
    }
  }
}
