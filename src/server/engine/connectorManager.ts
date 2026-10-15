import { ITikTokConnector } from '../connectors/types';
import { TikTokConnectorFactory } from '../connectors/connectorFactory';
import { StateStore } from '../stateStore';
import { FailSafeManager } from '../failSafeManager';
import { SSEBroadcastMessage } from '../coreEngine';
import { SystemLogger } from '../systemLogger';

export class ConnectorManager {
  private activeConnectors: Map<string, ITikTokConnector> = new Map();
  private connectingUsers: Set<string> = new Set();
  private connectionGenerations: Map<string, number> = new Map();

  public async connect(
    userId: string | undefined,
    onRawEvent: (raw: any, mode: string) => void,
    broadcast: (msg: SSEBroadcastMessage, userId?: string) => void
  ): Promise<boolean> {
    const targetUserId = userId || 'default';

    if (this.connectingUsers.has(targetUserId)) {
      SystemLogger.info('ENGINE', `Intento de conexión concurrente bloqueado para el usuario ${targetUserId}.`);
      return false;
    }

    const currentGen = (this.connectionGenerations.get(targetUserId) || 0) + 1;
    this.connectionGenerations.set(targetUserId, currentGen);

    this.connectingUsers.add(targetUserId);
    try {
      const conn = StateStore.getConnection(userId);
      conn.desiredConnected = true;
      conn.status = 'connecting';
      StateStore.saveConnection(conn, userId);

      // If existing connector has different mode or connectorType, tear down cleanly
      const existing = this.activeConnectors.get(targetUserId);
      if (existing && (existing.mode !== conn.mode || (conn.connectorType && existing.connectorType !== conn.connectorType))) {
        existing.disconnect();
        this.activeConnectors.delete(targetUserId);
      }

      let connector = this.activeConnectors.get(targetUserId);
      if (!connector) {
        connector = TikTokConnectorFactory.createConnector(conn.mode, conn.connectorType || 'direct');
        this.activeConnectors.set(targetUserId, connector);

        // Listen to raw events from connector
        connector.onEvent((rawEvent) => {
          if (this.connectionGenerations.get(targetUserId) !== currentGen) return; // Obsolete
          onRawEvent(rawEvent, connector?.mode || 'simulation');
        });

        // Listen to status updates
        connector.onStatusChange((statusEvent) => {
          if (this.connectionGenerations.get(targetUserId) !== currentGen) return; // Obsolete

          conn.status = (statusEvent.status === 'reconnecting' ? 'connecting' : statusEvent.status) as any;
          conn.lastActivityAt = statusEvent.lastActivityAt || Date.now();
          conn.errorMessage = statusEvent.errorMessage;
          conn.notice = statusEvent.notice;
          conn.warning = statusEvent.warning;
          if (statusEvent.pingMs) conn.pingMs = statusEvent.pingMs;
          if (statusEvent.viewerCount) conn.viewerCount = statusEvent.viewerCount;
          StateStore.saveConnection(conn, userId);

          if (statusEvent.status === 'error') {
            FailSafeManager.activate(statusEvent.errorMessage || 'Error crítico en el conector de TikTok', 'tiktok_disconnect', true, userId);
            broadcast(
              {
                type: 'FAIL_SAFE_STATE',
                payload: FailSafeManager.getStatus(userId),
                timestamp: Date.now(),
              },
              userId
            );
          }

          broadcast(
            {
              type: 'CONNECTION_STATUS',
              payload: conn,
              timestamp: Date.now(),
            },
            userId
          );
        });
      }

      const success = await connector.connect(conn);

      // Check if generation changed during async await (e.g., user clicked disconnect or started new connect)
      if (this.connectionGenerations.get(targetUserId) !== currentGen) {
        return false;
      }

      if (success) {
        FailSafeManager.reset('Conexión establecida exitosamente', userId);
        broadcast(
          {
            type: 'FAIL_SAFE_STATE',
            payload: FailSafeManager.getStatus(userId),
            timestamp: Date.now(),
          },
          userId
        );
      } else {
        FailSafeManager.activate('No fue posible negociar la conexión con el proveedor.', 'tiktok_disconnect', true, userId);
        broadcast(
          {
            type: 'FAIL_SAFE_STATE',
            payload: FailSafeManager.getStatus(userId),
            timestamp: Date.now(),
          },
          userId
        );
      }
      return success;
    } finally {
      this.connectingUsers.delete(targetUserId);
    }
  }

  public disconnect(userId?: string, broadcast?: (msg: SSEBroadcastMessage, userId?: string) => void) {
    const targetUserId = userId || 'default';

    // Invalidate any pending connection attempts or callbacks for this user
    const gen = (this.connectionGenerations.get(targetUserId) || 0) + 1;
    this.connectionGenerations.set(targetUserId, gen);
    this.connectingUsers.delete(targetUserId);

    const connector = this.activeConnectors.get(targetUserId);
    if (connector) {
      connector.disconnect();
      this.activeConnectors.delete(targetUserId);
    }

    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    conn.desiredConnected = false; // User intentional disconnect
    StateStore.saveConnection(conn, userId);

    FailSafeManager.reset('Desconexión manual por el usuario', userId);

    if (broadcast) {
      broadcast({ type: 'CONNECTION_STATUS', payload: conn, timestamp: Date.now() }, userId);
      broadcast({ type: 'FAIL_SAFE_STATE', payload: FailSafeManager.getStatus(userId), timestamp: Date.now() }, userId);
    }
  }

  public getActiveConnector(userId?: string): ITikTokConnector | null {
    return this.activeConnectors.get(userId || 'default') || null;
  }

  public simulateProviderDisconnect(
    reason: string = 'Pérdida de señal o socket cerrado por TikTok LIVE',
    userId?: string,
    broadcast?: (msg: SSEBroadcastMessage, userId?: string) => void,
    recordLog?: (event: any, matched: any, overall: any, time: number, err?: string, uid?: string) => void
  ) {
    const targetUserId = userId || 'default';
    if (this.connectionGenerations.get(targetUserId) !== (this.connectionGenerations.get(targetUserId) || 0)) {
      // noop if generation invalid
    }

    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    conn.errorMessage = reason;
    conn.lastActivityAt = Date.now();
    StateStore.saveConnection(conn, userId);

    FailSafeManager.activate(reason, 'tiktok_disconnect', true, userId);
    if (broadcast) {
      broadcast(
        {
          type: 'FAIL_SAFE_STATE',
          payload: FailSafeManager.getStatus(userId),
          timestamp: Date.now(),
        },
        userId
      );

      broadcast(
        {
          type: 'CONNECTION_STATUS',
          payload: conn,
          timestamp: Date.now(),
        },
        userId
      );
    }

    if (recordLog) {
      recordLog(
        {
          id: 'sys-disc-' + Date.now(),
          type: 'comment',
          source: conn.mode,
          timestamp: Date.now(),
          user: { id: 'system', username: 'sistema_conexion', nickname: 'Sistema' },
          data: { comment: reason },
        },
        [],
        'no_match',
        1,
        `Aviso de conexión: ${reason}`,
        userId
      );
    }
  }

  public async testLatency(userId?: string): Promise<number> {
    const connector = this.activeConnectors.get(userId || 'default');
    if (connector) {
      return connector.testLatency();
    }
    return 15;
  }
}
