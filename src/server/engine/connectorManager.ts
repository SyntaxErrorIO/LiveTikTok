import { ITikTokConnector } from '../connectors/types';
import { TikTokConnectorFactory } from '../connectors/connectorFactory';
import { StateStore } from '../stateStore';
import { FailSafeManager } from '../failSafeManager';
import { SSEBroadcastMessage } from '../coreEngine';
import { SystemLogger } from '../systemLogger';

export class ConnectorManager {
  private activeConnectors: Map<string, ITikTokConnector> = new Map();
  private connectingGenerations: Map<string, Set<number>> = new Map();
  private connectionGenerations: Map<string, number> = new Map();
  private attemptUnsubs: Map<string, Map<number, (() => void)[]>> = new Map();

  private cleanupAttemptListeners(targetUserId: string, gen: number) {
    const userMap = this.attemptUnsubs.get(targetUserId);
    if (userMap) {
      const unsubs = userMap.get(gen);
      if (unsubs) {
        unsubs.forEach((unsub) => {
          try { unsub(); } catch {}
        });
        userMap.delete(gen);
      }
    }
  }

  private cleanupAllListeners(targetUserId: string) {
    const userMap = this.attemptUnsubs.get(targetUserId);
    if (userMap) {
      userMap.forEach((unsubs) => {
        unsubs.forEach((unsub) => {
          try { unsub(); } catch {}
        });
      });
      this.attemptUnsubs.delete(targetUserId);
    }
  }

  public async connect(
    userId: string | undefined,
    onRawEvent: (raw: any, mode: string) => void,
    broadcast: (msg: SSEBroadcastMessage, userId?: string) => void
  ): Promise<boolean> {
    const targetUserId = userId || 'default';

    const currentGen = (this.connectionGenerations.get(targetUserId) || 0) + 1;
    this.connectionGenerations.set(targetUserId, currentGen);

    // Proactively clean up any stale attempt listeners from older generations
    const existingUserUnsubMap = this.attemptUnsubs.get(targetUserId);
    if (existingUserUnsubMap) {
      for (const [gen, unsubs] of existingUserUnsubMap.entries()) {
        if (gen < currentGen) {
          unsubs.forEach((unsub) => {
            try { unsub(); } catch {}
          });
          existingUserUnsubMap.delete(gen);
        }
      }
    }

    let connectingSet = this.connectingGenerations.get(targetUserId);
    if (!connectingSet) {
      connectingSet = new Set();
      this.connectingGenerations.set(targetUserId, connectingSet);
    }
    connectingSet.add(currentGen);

    const conn = StateStore.getConnection(userId);
    conn.desiredConnected = true;
    conn.status = 'connecting';
    StateStore.saveConnection(conn, userId);

    // Create a dedicated connector instance for this specific attempt (isolation per attempt)
    const connector = TikTokConnectorFactory.createConnector(conn.mode, conn.connectorType || 'direct');
    const unsubs: (() => void)[] = [];

    try {
      // Listen to raw events from connector
      const unsubEvent = connector.onEvent((rawEvent) => {
        if (this.connectionGenerations.get(targetUserId) !== currentGen) return;
        onRawEvent(rawEvent, connector.mode);
      });
      unsubs.push(unsubEvent);

      // Listen to status updates
      const unsubStatus = connector.onStatusChange((statusEvent) => {
        if (this.connectionGenerations.get(targetUserId) !== currentGen) return;

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
      unsubs.push(unsubStatus);

      let userUnsubMap = this.attemptUnsubs.get(targetUserId);
      if (!userUnsubMap) {
        userUnsubMap = new Map();
        this.attemptUnsubs.set(targetUserId, userUnsubMap);
      }
      userUnsubMap.set(currentGen, unsubs);

      let success = false;
      try {
        success = await connector.connect(conn);
      } catch (err: any) {
        SystemLogger.error('ENGINE', `Excepción en conector para ${targetUserId}: ${err?.message || err}`);
        success = false;
      }

      // Check if generation changed during async await (e.g., user clicked disconnect or started new connect)
      if (this.connectionGenerations.get(targetUserId) !== currentGen) {
        // Obsolete connection attempt: disconnect ONLY this attempt's connector instance and clean up its listeners
        try { connector.disconnect(); } catch {}
        this.cleanupAttemptListeners(targetUserId, currentGen);
        return false;
      }

      if (success) {
        // Replace previous active connector cleanly
        const existing = this.activeConnectors.get(targetUserId);
        if (existing && existing !== connector) {
          try { existing.disconnect(); } catch {}
        }
        this.activeConnectors.set(targetUserId, connector);

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
        try { connector.disconnect(); } catch {}
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
    } catch (outerErr: any) {
      try { connector.disconnect(); } catch {}
      this.cleanupAttemptListeners(targetUserId, currentGen);
      return false;
    } finally {
      const set = this.connectingGenerations.get(targetUserId);
      if (set) {
        set.delete(currentGen);
        if (set.size === 0) this.connectingGenerations.delete(targetUserId);
      }
    }
  }

  public disconnect(userId?: string, broadcast?: (msg: SSEBroadcastMessage, userId?: string) => void) {
    const targetUserId = userId || 'default';

    const gen = (this.connectionGenerations.get(targetUserId) || 0) + 1;
    this.connectionGenerations.set(targetUserId, gen);
    const set = this.connectingGenerations.get(targetUserId);
    if (set) set.clear();

    this.cleanupAllListeners(targetUserId);

    const connector = this.activeConnectors.get(targetUserId);
    if (connector) {
      try { connector.disconnect(); } catch {}
      this.activeConnectors.delete(targetUserId);
    }

    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    conn.desiredConnected = false; // Intentional manual disconnect
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
    const conn = StateStore.getConnection(userId);
    conn.status = 'disconnected';
    conn.errorMessage = reason;
    conn.lastActivityAt = Date.now();
    // Preserve desiredConnected because provider disconnect is network drop, not manual user disconnect
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
