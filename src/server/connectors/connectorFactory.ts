import { ITikTokConnector } from './types';
import { SimulationConnector } from './simulationConnector';
import { BridgeTikTokConnector } from './bridgeConnector';
import { DirectTikTokConnector } from './directTikTokConnector';

export class TikTokConnectorFactory {
  public static createConnector(
    mode: 'simulation' | 'real_tiktok',
    connectorType: 'direct' | 'bridge' = 'direct'
  ): ITikTokConnector {
    if (mode === 'simulation') {
      return new SimulationConnector();
    }
    if (connectorType === 'bridge') {
      return new BridgeTikTokConnector();
    }
    return new DirectTikTokConnector();
  }
}
