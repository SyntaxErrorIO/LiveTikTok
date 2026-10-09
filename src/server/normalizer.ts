import { TikTokEvent, TriggerType, EventSource } from '../types';

/**
 * Normalizes raw TikTok LIVE incoming packets into a standard TikTokEvent format.
 * Compatible with tiktok-live-connector, official webhook relays, and internal simulator packets.
 */
export class EventNormalizer {
  public static normalize(raw: any, source: EventSource = 'real_tiktok'): TikTokEvent | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    // Determine event type
    const eventType = this.resolveEventType(raw);
    if (!eventType) {
      return null;
    }

    // Extract or generate event ID
    const eventId = String(
      raw.id ||
      raw.eventId ||
      raw.msgId ||
      raw.messageId ||
      `evt-${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    );

    // Extract user info safely
    const rawUser = raw.user || raw.sender || raw.author || raw;
    const username = this.sanitizeString(rawUser.uniqueId || rawUser.username || rawUser.userId || 'usuario_anonimo');
    const nickname = this.sanitizeString(rawUser.nickname || rawUser.displayName || username);
    const userId = String(rawUser.id || rawUser.userId || rawUser.secUid || `usr-${username}`);
    const avatarUrl = typeof rawUser.avatarUrl === 'string' ? rawUser.avatarUrl : rawUser.profilePictureUrl;
    const isFollower = Boolean(rawUser.isFollower ?? raw.isFollower);
    const isSubscriber = Boolean(rawUser.isSubscriber ?? raw.isSubscriber);
    const isModerator = Boolean(rawUser.isModerator ?? raw.isModerator);
    const badgeLevel = Number(rawUser.badgeLevel || rawUser.level || 1);

    // Extract event-specific data
    const eventData: TikTokEvent['data'] = {};

    switch (eventType) {
      case 'gift': {
        const rawGift = raw.gift || raw.data || raw;
        eventData.giftId = String(rawGift.giftId || rawGift.id || 'gift_standard');
        eventData.giftName = this.sanitizeString(rawGift.giftName || rawGift.name || rawGift.describe || 'Regalo');
        eventData.diamondCount = Math.max(1, Number(rawGift.diamondCount || rawGift.diamonds || raw.diamondCount || 1));
        eventData.repeatCount = Math.max(1, Number(rawGift.repeatCount || rawGift.combo || raw.repeatCount || 1));
        break;
      }

      case 'comment': {
        const commentMsg = raw.comment || raw.text || raw.message || raw.content || '';
        eventData.comment = this.sanitizeString(commentMsg);
        break;
      }

      case 'like': {
        eventData.likeCount = Math.max(1, Number(raw.likeCount || raw.count || raw.likes || 1));
        eventData.totalLikes = Number(raw.totalLikes || raw.total);
        break;
      }

      case 'share': {
        eventData.shareTarget = this.sanitizeString(raw.shareTarget || raw.target || 'general');
        break;
      }

      case 'follow': {
        // No extra payload required
        break;
      }
    }

    return {
      id: eventId,
      type: eventType,
      source,
      timestamp: Number(raw.timestamp || Date.now()),
      user: {
        id: userId,
        username,
        nickname,
        avatarUrl,
        isFollower,
        isSubscriber,
        isModerator,
        badgeLevel: isNaN(badgeLevel) ? 1 : badgeLevel,
      },
      data: eventData,
    };
  }

  private static resolveEventType(raw: any): TriggerType | null {
    const rawType = String(raw.type || raw.eventType || raw.event || '').toLowerCase();

    if (rawType.includes('gift') || raw.gift || raw.diamondCount) return 'gift';
    if (rawType.includes('chat') || rawType.includes('comment') || raw.comment || raw.message) return 'comment';
    if (rawType.includes('like') || raw.likeCount) return 'like';
    if (rawType.includes('follow') || rawType.includes('subscribe') || rawType.includes('sub')) return 'follow';
    if (rawType.includes('share')) return 'share';

    return null;
  }

  private static sanitizeString(str: any): string {
    if (typeof str !== 'string') return '';
    // Strip control chars and escape HTML delimiters
    return str
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim();
  }
}
