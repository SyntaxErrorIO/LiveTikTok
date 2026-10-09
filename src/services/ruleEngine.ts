import {
  AppSettings,
  AutomationRule,
  ExecutionLog,
  OverlayEffect,
  TikTokEvent,
} from '../types';
import { audioEngine } from './audioEngine';
import { eventBus, TriggerActionPayload } from './eventBus';
import { StorageService } from './storageService';
import { SharedRuleEvaluator } from './sharedRuleEvaluator';

export interface EvaluationResult {
  event: TikTokEvent;
  matchedRules: {
    rule: AutomationRule;
    status: 'executed' | 'cooldown_blocked' | 'rate_limited' | 'condition_failed';
    reason: string;
    actionsExecuted: number;
  }[];
  overallStatus: 'executed' | 'cooldown' | 'no_match' | 'error';
  executionTimeMs: number;
  log: ExecutionLog;
}

export class RuleEngine {
  public static formatTemplate(template: string, event: TikTokEvent): string {
    return SharedRuleEvaluator.formatTemplate(template, event);
  }

  public static evaluateEvent(
    event: TikTokEvent,
    rules: AutomationRule[],
    effects: OverlayEffect[],
    settings: AppSettings
  ): EvaluationResult {
    const startTime = performance.now();
    const now = Date.now();

    // If master switch is disabled, return immediately
    if (!settings.masterAutomationEnabled) {
      const execTime = Math.round(performance.now() - startTime);
      const log: ExecutionLog = {
        id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9),
        eventId: event.id,
        eventTimestamp: event.timestamp,
        source: event.source,
        eventType: event.type,
        eventSummary: SharedRuleEvaluator.getEventSummary(event),
        senderName: event.user.nickname || event.user.username,
        matchedRules: [],
        overallStatus: 'no_match',
        executionTimeMs: execTime,
        errorDetails: 'Motor general de automatizaciones pausado por el usuario.',
      };
      return {
        event,
        matchedRules: [],
        overallStatus: 'no_match',
        executionTimeMs: execTime,
        log,
      };
    }

    // Sort rules by priority: high -> medium -> low
    const sortedRules = SharedRuleEvaluator.sortRulesByPriority(rules);

    const evaluationDetails: EvaluationResult['matchedRules'] = [];
    let anyActionExecuted = false;
    let anyCooldownBlocked = false;

    // Evaluate each rule
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      // 1. Trigger type check
      if (rule.triggerType !== event.type) {
        continue;
      }

      // 2. Conditions check via unified SharedRuleEvaluator
      const conditionPassed = SharedRuleEvaluator.checkConditions(event, rule);
      if (!conditionPassed.passed) {
        evaluationDetails.push({
          rule,
          status: 'condition_failed',
          reason: conditionPassed.reason,
          actionsExecuted: 0,
        });
        continue;
      }

      // 3. Cooldown check
      const cooldownMs = (rule.cooldownSeconds || 0) * 1000;
      if (rule.lastTriggeredAt && now - rule.lastTriggeredAt < cooldownMs) {
        const remainingSec = Math.ceil(
          (cooldownMs - (now - rule.lastTriggeredAt)) / 1000
        );
        evaluationDetails.push({
          rule,
          status: 'cooldown_blocked',
          reason: `Bloqueado por enfriamiento (espera ${remainingSec}s)`,
          actionsExecuted: 0,
        });
        anyCooldownBlocked = true;
        continue;
      }

      // 4. Rate limit check (maxPerHour) with 1-hour window reset
      if (rule.lastTriggeredAt && now - rule.lastTriggeredAt >= 3600000) {
        rule.executionsCount = 0;
      }
      if (rule.maxPerHour && (rule.executionsCount || 0) >= rule.maxPerHour) {
        evaluationDetails.push({
          rule,
          status: 'rate_limited',
          reason: `Límite por hora alcanzado (${rule.maxPerHour}/h)`,
          actionsExecuted: 0,
        });
        continue;
      }

      // 5. Execute actions
      let actionsCount = 0;
      for (const action of rule.actions) {
        if (!action.enabled) continue;

        try {
          this.executeAction(action, event, effects, settings);
          actionsCount++;
        } catch {
          // Action failure isolated
        }
      }

      // Update rule state
      rule.lastTriggeredAt = now;
      rule.executionsCount = (rule.executionsCount || 0) + 1;

      evaluationDetails.push({
        rule,
        status: 'executed',
        reason: 'Condiciones cumplidas exitosamente',
        actionsExecuted: actionsCount,
      });

      if (actionsCount > 0) {
        anyActionExecuted = true;
      }
    }

    const execTime = Math.max(1, Math.round(performance.now() - startTime));

    const overallStatus: ExecutionLog['overallStatus'] = anyActionExecuted
      ? 'executed'
      : anyCooldownBlocked
      ? 'cooldown'
      : evaluationDetails.length === 0
      ? 'no_match'
      : 'no_match';

    const log: ExecutionLog = {
      id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9),
      eventId: event.id,
      eventTimestamp: event.timestamp,
      source: event.source,
      eventType: event.type,
      eventSummary: this.getEventSummary(event),
      senderName: event.user.nickname || event.user.username,
      matchedRules: evaluationDetails.map((item) => ({
        ruleId: item.rule.id,
        ruleName: item.rule.name,
        executedActionsCount: item.actionsExecuted,
        status: item.status,
      })),
      overallStatus,
      executionTimeMs: execTime,
    };

    // Save updated rules and new history log
    StorageService.saveRules(rules);
    StorageService.addHistoryLog(log, settings.historyRetentionCount);

    // Notify listeners via event bus
    eventBus.broadcast({ type: 'EXECUTION_LOGGED', payload: log });
    eventBus.broadcast({ type: 'TIKTOK_EVENT_RECEIVED', payload: event });

    return {
      event,
      matchedRules: evaluationDetails,
      overallStatus,
      executionTimeMs: execTime,
      log,
    };
  }

  private static executeAction(
    action: AutomationRule['actions'][0],
    event: TikTokEvent,
    effects: OverlayEffect[],
    settings: AppSettings
  ) {
    switch (action.type) {
      case 'overlay_effect': {
        const effect = effects.find((e) => e.id === action.effectId) || effects[0];
        if (!effect) return;

        const title = this.formatTemplate(effect.titleTemplate, event);
        const subtitle = this.formatTemplate(effect.subtitleTemplate, event);
        const ttsText = effect.enableTTS
          ? this.formatTemplate(effect.ttsTemplate, event)
          : undefined;

        const payload: TriggerActionPayload = {
          effect,
          event,
          formattedTitle: title,
          formattedSubtitle: subtitle,
          ttsVoiceText: ttsText,
          timestamp: Date.now(),
        };

        // Broadcast to overlay subscribers (in OBS or preview)
        eventBus.broadcast({ type: 'TRIGGER_OVERLAY', payload });

        // Play sound locally if enabled
        if (settings.enableAudioSynthesizer && effect.soundId) {
          const effectiveVolume = (effect.soundVolume * (settings.masterVolume / 100));
          audioEngine.playSound(effect.soundId, effectiveVolume);
        }

        // Trigger TTS if enabled on effect
        if (effect.enableTTS && ttsText) {
          audioEngine.speakText(ttsText, settings.preferredTtsVoice);
        }
        break;
      }

      case 'sound_fx': {
        if (settings.enableAudioSynthesizer && action.soundId) {
          const effectiveVolume = ((action.volume || 80) * (settings.masterVolume / 100));
          audioEngine.playSound(action.soundId, effectiveVolume);
        }
        break;
      }

      case 'tts_speech': {
        if (action.ttsTemplate) {
          const speech = this.formatTemplate(action.ttsTemplate, event);
          audioEngine.speakText(
            speech,
            action.ttsVoice || settings.preferredTtsVoice,
            action.ttsSpeed || 1.0
          );
        }
        break;
      }

      case 'obs_scene': {
        // OBS scene switch dispatch
        break;
      }

      case 'webhook_post': {
        // Optional webhook dispatch
        if (action.webhookUrl && action.webhookUrl.startsWith('http')) {
          try {
            fetch(action.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event,
                timestamp: Date.now(),
              }),
            }).catch(() => {});
          } catch {
            // Ignore fetch error
          }
        }
        break;
      }
    }
  }

  public static getEventSummary(event: TikTokEvent): string {
    return SharedRuleEvaluator.getEventSummary(event);
  }
}
