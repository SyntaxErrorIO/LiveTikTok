import { OverlayEffect, TikTokEvent, RuleAction } from '../types';
import { StateStore } from './stateStore';
import { SecurityValidator } from './securityValidator';
import { SharedRuleEvaluator } from '../services/sharedRuleEvaluator';
import { SSEBroadcastMessage } from './coreEngine';

export class ActionExecutor {
  /**
   * Dispatches and executes an action configured in an automation rule with complete fault isolation.
   */
  public static async executeAction(
    action: RuleAction,
    event: TikTokEvent,
    effects: OverlayEffect[],
    _settings: any,
    targetUserId: string | undefined,
    broadcast: (msg: SSEBroadcastMessage, targetUserId?: string) => void
  ): Promise<void> {
    const formattedTitle = SharedRuleEvaluator.formatTemplate(
      action.customMessageText || '{user} activó evento',
      event
    );

    switch (action.type) {
      case 'overlay_effect': {
        const effect = effects.find((e) => e.id === action.effectId) || effects[0];
        const title = SharedRuleEvaluator.formatTemplate(effect.titleTemplate, event);
        const subtitle = SharedRuleEvaluator.formatTemplate(effect.subtitleTemplate, event);
        const ttsText = effect.enableTTS
          ? SharedRuleEvaluator.formatTemplate(effect.ttsTemplate, event)
          : undefined;

        broadcast(
          {
            type: 'TRIGGER_ACTION',
            payload: {
              actionType: 'overlay_effect',
              effect,
              formattedTitle: title,
              formattedSubtitle: subtitle,
              ttsVoiceText: ttsText,
              event,
            },
            timestamp: Date.now(),
          },
          targetUserId
        );
        break;
      }

      case 'sound_fx': {
        broadcast(
          {
            type: 'TRIGGER_ACTION',
            payload: {
              actionType: 'sound_fx',
              soundId: action.soundId || 'chime',
              volume: action.volume ?? 80,
              event,
            },
            timestamp: Date.now(),
          },
          targetUserId
        );
        break;
      }

      case 'tts_speech': {
        const text = SharedRuleEvaluator.formatTemplate(
          action.ttsTemplate || '{user} envió un regalo',
          event
        );
        broadcast(
          {
            type: 'TRIGGER_ACTION',
            payload: {
              actionType: 'tts_speech',
              text,
              ttsSpeed: action.ttsSpeed || 1.0,
              ttsVoice: action.ttsVoice,
              event,
            },
            timestamp: Date.now(),
          },
          targetUserId
        );
        break;
      }

      case 'custom_message': {
        broadcast(
          {
            type: 'TRIGGER_ACTION',
            payload: {
              actionType: 'custom_message',
              message: formattedTitle,
              event,
            },
            timestamp: Date.now(),
          },
          targetUserId
        );
        break;
      }

      case 'update_counter': {
        this.handleCounterUpdate(action, event, targetUserId, broadcast);
        break;
      }

      case 'add_leaderboard_points': {
        this.handleLeaderboardUpdate(action, event, targetUserId, broadcast);
        break;
      }

      case 'iot_device_order': {
        await this.handleIoTDeviceOrder(action, event);
        break;
      }

      case 'webhook_post': {
        await this.handleWebhookPost(action, event);
        break;
      }
    }
  }

  private static handleCounterUpdate(
    action: RuleAction,
    event: TikTokEvent,
    targetUserId: string | undefined,
    broadcast: (msg: SSEBroadcastMessage, targetUserId?: string) => void
  ) {
    const counters = StateStore.getCounters(targetUserId);
    const targetCounter = counters.find((c) => c.id === action.counterId) || counters[0];

    if (!targetCounter) return;

    let delta = 1;
    if (action.counterAmount === 'event_diamonds') {
      delta = event.data.diamondCount || 1;
    } else if (action.counterAmount === 'event_amount') {
      delta = event.data.repeatCount || 1;
    } else if (typeof action.counterAmount === 'number') {
      delta = action.counterAmount;
    }

    if (action.counterOperation === 'reset') {
      targetCounter.current = 0;
    } else if (action.counterOperation === 'set') {
      targetCounter.current = delta;
    } else {
      targetCounter.current += delta;
    }

    targetCounter.lastUpdated = Date.now();
    StateStore.saveCounters(counters, targetUserId);

    broadcast(
      {
        type: 'COUNTERS_UPDATED',
        payload: counters,
        timestamp: Date.now(),
      },
      targetUserId
    );
  }

  private static handleLeaderboardUpdate(
    action: RuleAction,
    event: TikTokEvent,
    targetUserId: string | undefined,
    broadcast: (msg: SSEBroadcastMessage, targetUserId?: string) => void
  ) {
    const leaderboard = StateStore.getLeaderboard(targetUserId);
    let entry = leaderboard.find(
      (l) => l.userId === event.user.id || l.username === event.user.username
    );

    let pointsToAdd = 10;
    if (action.leaderboardPoints === 'event_diamonds') {
      pointsToAdd = event.data.diamondCount || 10;
    } else if (typeof action.leaderboardPoints === 'number') {
      pointsToAdd = action.leaderboardPoints;
    }

    if (!entry) {
      entry = {
        userId: event.user.id,
        username: event.user.username,
        nickname: event.user.nickname,
        points: pointsToAdd,
        giftsCount: event.type === 'gift' ? (event.data.repeatCount || 1) : 0,
        lastUpdated: Date.now(),
      };
      leaderboard.push(entry);
    } else {
      entry.points += pointsToAdd;
      if (event.type === 'gift') {
        entry.giftsCount += event.data.repeatCount || 1;
      }
      entry.lastUpdated = Date.now();
    }

    // Sort descending by points
    leaderboard.sort((a, b) => b.points - a.points);
    const topLeaderboard = leaderboard.slice(0, 50);
    StateStore.saveLeaderboard(topLeaderboard, targetUserId);

    broadcast(
      {
        type: 'LEADERBOARD_UPDATED',
        payload: topLeaderboard,
        timestamp: Date.now(),
      },
      targetUserId
    );
  }

  private static async handleIoTDeviceOrder(action: RuleAction, event: TikTokEvent) {
    if (!action.deviceEndpoint) return;

    // SSRF runtime check
    const ssrfCheck = SecurityValidator.isSafeExternalUrl(action.deviceEndpoint);
    if (!ssrfCheck.safe) {
      throw new Error(`SSRF Bloqueado: ${ssrfCheck.reason}`);
    }

    const controller = new AbortController();
    const timeoutMs =
      typeof action.deviceTimeoutMs === 'number'
        ? Math.max(500, Math.min(8000, action.deviceTimeoutMs))
        : 3000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const payload = action.deviceCommandPayload
      ? SharedRuleEvaluator.formatTemplate(action.deviceCommandPayload, event)
      : JSON.stringify({ trigger: 'TikTokEvent', type: event.type, user: event.user.username });

    try {
      const res = await fetch(action.deviceEndpoint, {
        method: action.deviceMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action.deviceMethod === 'GET' ? undefined : payload,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          `Dispositivo IoT respondió con estado HTTP ${res.status} (${res.statusText})`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private static async handleWebhookPost(action: RuleAction, event: TikTokEvent) {
    if (!action.webhookUrl) return;

    // SSRF runtime check
    const ssrfCheck = SecurityValidator.isSafeExternalUrl(action.webhookUrl);
    if (!ssrfCheck.safe) {
      throw new Error(`SSRF Bloqueado: ${ssrfCheck.reason}`);
    }

    const payload = action.webhookPayload
      ? SharedRuleEvaluator.formatTemplate(action.webhookPayload, event)
      : JSON.stringify({
          event,
          timestamp: Date.now(),
          source: 'LiveTrigger_AI',
        });

    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(action.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LiveTrigger-Automation-Engine/1.2',
          },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`Webhook devolvió error HTTP ${res.status}: ${res.statusText}`);
        }

        return;
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }
}
