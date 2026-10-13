import { TikTokEvent } from '../../types';
import { StateStore } from '../stateStore';
import { SystemLogger } from '../systemLogger';

export class GiftProcessor {
  /**
   * Updates diamonds goal counter and top donors leaderboard in SQLite StateStore for OBS overlay
   */
  public static recordGiftStats(
    event: TikTokEvent,
    diamonds: number,
    targetUserId?: string,
    broadcast?: (msg: any, userId?: string) => void
  ) {
    try {
      // 1. Update diamonds counter
      const counters = StateStore.getCounters(targetUserId);
      const diamondCounter = counters.find(
        (c) => c.name.toLowerCase().includes('diamante') || c.id.toLowerCase().includes('diamond')
      );
      if (diamondCounter) {
        diamondCounter.current = (diamondCounter.current || 0) + diamonds;
        diamondCounter.lastUpdated = Date.now();
        StateStore.saveCounters(counters, targetUserId);
        if (broadcast) {
          broadcast(
            {
              type: 'COUNTERS_UPDATED',
              payload: counters,
              timestamp: Date.now(),
            },
            targetUserId
          );
        }
      }

      // 2. Update Leaderboard (top donors)
      const leaderboard = StateStore.getLeaderboard(targetUserId);
      const donorUser = event.user.username;
      let entry = leaderboard.find((l) => l.username === donorUser || l.userId === event.user.id);
      if (!entry) {
        entry = {
          userId: event.user.id || donorUser,
          username: donorUser,
          nickname: event.user.nickname || donorUser,
          points: diamonds,
          giftsCount: 1,
          lastUpdated: Date.now(),
        };
        leaderboard.push(entry);
      } else {
        entry.points += diamonds;
        entry.giftsCount += 1;
        entry.lastUpdated = Date.now();
      }

      leaderboard.sort((a, b) => b.points - a.points);
      const topLeaderboard = leaderboard.slice(0, 50);
      StateStore.saveLeaderboard(topLeaderboard, targetUserId);
      if (broadcast) {
        broadcast(
          {
            type: 'LEADERBOARD_UPDATED',
            payload: topLeaderboard,
            timestamp: Date.now(),
          },
          targetUserId
        );
      }
    } catch (err: any) {
      SystemLogger.error('ENGINE', `Error actualizando estadísticas de regalo: ${err?.message}`);
    }
  }
}
