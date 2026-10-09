import { AutomationRule, RulePriority, TikTokEvent } from '../types';

export class SharedRuleEvaluator {
  private static readonly PRIORITY_WEIGHT: Record<RulePriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  /**
   * Sorts automation rules by priority descending: high (3) -> medium (2) -> low (1).
   */
  public static sortRulesByPriority(rules: AutomationRule[]): AutomationRule[] {
    return [...rules].sort(
      (a, b) => (this.PRIORITY_WEIGHT[b.priority] || 1) - (this.PRIORITY_WEIGHT[a.priority] || 1)
    );
  }

  /**
   * Replaces template tags with actual event values.
   */
  public static formatTemplate(template: string, event: TikTokEvent): string {
    if (!template) return '';
    return template
      .replace(/\{user\}/gi, event.user.nickname || event.user.username)
      .replace(/\{username\}/gi, event.user.username)
      .replace(/\{gift\}/gi, event.data.giftName || 'Regalo')
      .replace(/\{amount\}/gi, String(event.data.repeatCount || 1))
      .replace(/\{diamonds\}/gi, String(event.data.diamondCount || 0))
      .replace(/\{message\}/gi, event.data.comment || '')
      .replace(/\{likes\}/gi, String(event.data.likeCount || 1));
  }

  /**
   * Validates if a TikTok event satisfies all conditions specified in an automation rule.
   */
  public static checkConditions(
    event: TikTokEvent,
    rule: AutomationRule
  ): { passed: boolean; reason: string } {
    const c = rule.conditions || {};

    // 1. Gift conditions
    if (event.type === 'gift') {
      const diamonds = event.data.diamondCount || 0;
      const repeat = event.data.repeatCount || 1;
      const giftName = (event.data.giftName || '').toLowerCase().trim();

      if (c.giftName && c.giftName !== 'all' && c.giftName.toLowerCase() !== 'cualquiera') {
        if (!giftName.includes(c.giftName.toLowerCase().trim())) {
          return {
            passed: false,
            reason: `Regalo "${event.data.giftName}" no coincide con el filtro "${c.giftName}"`,
          };
        }
      }

      if (c.minDiamonds !== undefined && diamonds < c.minDiamonds) {
        return {
          passed: false,
          reason: `Diamantes (${diamonds}) menor al mínimo requerido (${c.minDiamonds})`,
        };
      }

      if (c.maxDiamonds !== undefined && diamonds > c.maxDiamonds) {
        return {
          passed: false,
          reason: `Diamantes (${diamonds}) supera el máximo (${c.maxDiamonds})`,
        };
      }

      if (c.minRepeatCount !== undefined && repeat < c.minRepeatCount) {
        return {
          passed: false,
          reason: `Racha de envío (${repeat}) menor al mínimo (${c.minRepeatCount})`,
        };
      }
    }

    // 2. Comment conditions
    if (event.type === 'comment') {
      const text = (event.data.comment || '').toLowerCase().trim();
      const keyword = (c.commentKeyword || '').toLowerCase().trim();

      if (keyword) {
        const matchType = c.commentMatchType || 'contains';
        let matched = false;

        if (matchType === 'exact') {
          matched = text === keyword;
        } else if (matchType === 'starts_with') {
          matched = text.startsWith(keyword);
        } else if (matchType === 'regex') {
          try {
            const re = new RegExp(keyword, 'i');
            matched = re.test(text);
          } catch {
            matched = text.includes(keyword);
          }
        } else {
          matched = text.includes(keyword);
        }

        if (!matched) {
          return {
            passed: false,
            reason: `Comentario "${event.data.comment}" no cumple condición "${keyword}" (${matchType})`,
          };
        }
      }
    }

    // 3. Like conditions
    if (event.type === 'like') {
      const likes = event.data.likeCount || 1;
      if (c.minLikeCount !== undefined && likes < c.minLikeCount) {
        return {
          passed: false,
          reason: `Likes (${likes}) menor al umbral requerido (${c.minLikeCount})`,
        };
      }
    }

    // 4. User level & role filters
    if (c.userFilter && c.userFilter !== 'all') {
      if (c.userFilter === 'subscribers' && !event.user.isSubscriber) {
        return { passed: false, reason: 'Solo permitido para suscriptores' };
      }
      if (c.userFilter === 'moderators' && !event.user.isModerator) {
        return { passed: false, reason: 'Solo permitido para moderadores' };
      }
      if (c.userFilter === 'min_level') {
        const userLevel = event.user.badgeLevel || 0;
        const requiredLevel = c.minSenderLevel || 1;
        if (userLevel < requiredLevel) {
          return {
            passed: false,
            reason: `Nivel del usuario (${userLevel}) menor a ${requiredLevel}`,
          };
        }
      }
    }

    return { passed: true, reason: 'OK' };
  }

  /**
   * Generates a readable human summary of a TikTok event.
   */
  public static getEventSummary(event: TikTokEvent): string {
    switch (event.type) {
      case 'gift':
        return `${event.data.repeatCount || 1}x ${event.data.giftName || 'Regalo'} (${event.data.diamondCount || 0} 💎)`;
      case 'comment':
        return `"${event.data.comment || ''}"`;
      case 'like':
        return `+${event.data.likeCount || 1} Likes`;
      case 'follow':
        return 'Nuevo Seguidor';
      case 'share':
        return 'Transmisión compartida';
      default:
        return 'Evento recibido';
    }
  }
}
