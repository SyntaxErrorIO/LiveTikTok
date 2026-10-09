import { ConnectionConfig, TikTokEvent } from '../../types';

export type ConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectorStatusEvent {
  status: ConnectorStatus;
  mode: 'simulation' | 'real_tiktok';
  username: string;
  roomId?: string;
  pingMs?: number;
  viewerCount?: number;
  lastActivityAt?: number;
  errorMessage?: string;
  reconnectAttempts?: number;
}

export interface ITikTokConnector {
  readonly name: string;
  readonly mode: 'simulation' | 'real_tiktok';

  getStatus(): ConnectorStatus;
  connect(config: ConnectionConfig): Promise<boolean>;
  disconnect(): void;
  testLatency(): Promise<number>;

  onEvent(callback: (rawEvent: any) => void): () => void;
  onStatusChange(callback: (status: ConnectorStatusEvent) => void): () => void;
}
