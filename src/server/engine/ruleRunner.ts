import {
  ExecutionLog,
  TikTokEvent,
} from '../../types';
import { StateStore } from '../stateStore';
import { SharedRuleEvaluator } from '../../services/sharedRuleEvaluator';
import { ActionExecutor } from '../actionExecutor';
import { SystemLogger } from '../systemLogger';
import { GiftProcessor } from './giftProcessor';

export class RuleRunner {
  public static async evaluateAndExecute(
    event: TikTokEvent,
    targetUserId: string | undefined,
    broadcast: (msg: any, userId?: string) => void,
    recordLog: (
      event: TikTokEvent,
      matchedRules: ExecutionLog['matchedRules'],
      overallStatus: ExecutionLog['overallStatus'],
      executionTimeMs: number,
      errorDetails?: string,
      targetUserId?: string
    ) => void,
    rateTimestamps: Map<string, number[]>,
    ensureLoaded: (userId?: string) => void,
    onRateLimited: () => void,
    onError: () => void
  ): Promise<void> {
    const startTime = performance.now();
    const settings = StateStore.getSettings(targetUserId);
    const rules = StateStore.getRules(targetUserId);
    const effects = StateStore.getEffects(targetUserId);
    const now = Date.now();

    if (!settings.masterAutomationEnabled) {
      recordLog(event, [], 'no_match', 0, 'Motor pausado por el usuario.', targetUserId);
      return;
    }

    const sortedRules = SharedRuleEvaluator.sortRulesByPriority(rules);
    const evaluatedDetails: ExecutionLog['matchedRules'] = [];
    let anyExecuted = false;
    let anyCooldown = false;
    let lastExecutionError: string | undefined;

    for (const rule of sortedRules) {
      if (!rule.enabled || rule.triggerType !== event.type) {
        continue;
      }

      const condResult = SharedRuleEvaluator.checkConditions(event, rule);
      if (!condResult.passed) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'condition_failed',
        });
        continue;
      }

      const cooldownMs = (rule.cooldownSeconds || 0) * 1000;
      if (rule.lastTriggeredAt && now - rule.lastTriggeredAt < cooldownMs) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'cooldown_blocked',
        });
        anyCooldown = true;
        continue;
      }

      ensureLoaded(targetUserId);
      const rateKey = `${targetUserId || 'default'}:${rule.id}`;
      const oneHourAgo = now - 60 * 60 * 1000;
      const history = (rateTimestamps.get(rateKey) || []).filter((t) => t > oneHourAgo);
      rateTimestamps.set(rateKey, history);
      rule.executionsCount = history.length;

      if (rule.maxPerHour && history.length >= rule.maxPerHour) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'rate_limited',
        });
        onRateLimited();
        continue;
      }

      let executedActionsCount = 0;
      let ruleActionError: string | undefined;

      for (const action of rule.actions) {
        if (!action.enabled) continue;
        try {
          await ActionExecutor.executeAction(
            action,
            event,
            effects,
            settings,
            targetUserId,
            (msg, uid) => broadcast(msg, uid)
          );
          executedActionsCount++;
        } catch (err: any) {
          onError();
          ruleActionError = err?.message || String(err);
          lastExecutionError = ruleActionError;
          SystemLogger.error(
            'ENGINE',
            `Fallo en acción [${action.type}] de regla "${rule.name}": ${ruleActionError}`,
            {
              userId: targetUserId,
              details: { ruleId: rule.id, actionId: action.id, error: ruleActionError },
            }
          );
        }
      }

      if (executedActionsCount > 0) {
        history.push(now);
        rateTimestamps.set(rateKey, history);
        rule.executionsCount = history.length;
        rule.lastTriggeredAt = now;
        anyExecuted = true;

        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount,
          status: 'executed',
        });
      } else if (ruleActionError) {
        evaluatedDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executedActionsCount: 0,
          status: 'condition_failed',
        });
      }
    }

    StateStore.saveRules(rules, targetUserId);

    if (event.type === 'gift' && event.data?.diamondCount) {
      const diamonds = (event.data.diamondCount || 1) * (event.data.repeatCount || 1);
      GiftProcessor.recordGiftStats(event, diamonds, targetUserId, broadcast);
    }

    const execTime = Math.max(1, Math.round(performance.now() - startTime));

    const overallStatus: ExecutionLog['overallStatus'] = anyExecuted
      ? 'executed'
      : anyCooldown
      ? 'cooldown'
      : 'no_match';

    recordLog(event, evaluatedDetails, overallStatus, execTime, lastExecutionError, targetUserId);
  }
}
