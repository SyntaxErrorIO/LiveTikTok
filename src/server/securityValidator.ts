import { AutomationRule, RuleAction, ActionType, RulePriority, TriggerType } from '../types';

export class SecurityValidator {
  private static readonly ALLOWED_TRIGGER_TYPES: TriggerType[] = ['gift', 'comment', 'like', 'follow', 'share'];
  private static readonly ALLOWED_PRIORITIES: RulePriority[] = ['high', 'medium', 'low'];
  private static readonly ALLOWED_ACTION_TYPES: ActionType[] = [
    'overlay_effect',
    'sound_fx',
    'tts_speech',
    'custom_message',
    'update_counter',
    'add_leaderboard_points',
    'iot_device_order',
    'obs_scene',
    'webhook_post',
  ];

  public static validateRule(rule: any): { valid: boolean; sanitized?: AutomationRule; error?: string } {
    if (!rule || typeof rule !== 'object') {
      return { valid: false, error: 'La regla debe ser un objeto JSON válido.' };
    }

    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim().length === 0) {
      return { valid: false, error: 'El nombre de la regla es obligatorio.' };
    }

    if (!this.ALLOWED_TRIGGER_TYPES.includes(rule.triggerType)) {
      return { valid: false, error: `Tipo de desencadenante "${rule.triggerType}" no admitido.` };
    }

    const priority: RulePriority = this.ALLOWED_PRIORITIES.includes(rule.priority)
      ? rule.priority
      : 'medium';

    const cooldownSeconds = Math.max(0, Math.min(3600, Number(rule.cooldownSeconds) || 0));
    const maxPerHour = Math.max(1, Math.min(10000, Number(rule.maxPerHour) || 200));

    // Validate actions array
    if (!Array.isArray(rule.actions)) {
      return { valid: false, error: 'Las acciones deben ser una lista de acciones válidas.' };
    }

    const sanitizedActions: RuleAction[] = [];
    for (const act of rule.actions) {
      const validatedAct = this.validateAction(act);
      if (!validatedAct.valid) {
        return { valid: false, error: validatedAct.error };
      }
      if (validatedAct.sanitized) {
        sanitizedActions.push(validatedAct.sanitized);
      }
    }

    const sanitized: AutomationRule = {
      id: String(rule.id || 'rule-' + Math.random().toString(36).substring(2, 9)),
      name: String(rule.name).substring(0, 80).trim(),
      description: String(rule.description || '').substring(0, 200).trim(),
      enabled: Boolean(rule.enabled ?? true),
      priority,
      triggerType: rule.triggerType,
      conditions: this.sanitizeConditions(rule.conditions || {}),
      actions: sanitizedActions,
      cooldownSeconds,
      maxPerHour,
      executionsCount: Number(rule.executionsCount || 0),
      createdAt: Number(rule.createdAt || Date.now()),
      lastTriggeredAt: rule.lastTriggeredAt ? Number(rule.lastTriggeredAt) : undefined,
    };

    return { valid: true, sanitized };
  }

  private static validateAction(action: any): { valid: boolean; sanitized?: RuleAction; error?: string } {
    if (!action || typeof action !== 'object') {
      return { valid: false, error: 'Acción inválida.' };
    }

    if (!this.ALLOWED_ACTION_TYPES.includes(action.type)) {
      return { valid: false, error: `Tipo de acción no admitido: ${action.type}` };
    }

    // Safety checks for Webhooks & IoT Device Orders
    if (action.type === 'iot_device_order' || action.type === 'webhook_post') {
      const url = String(action.deviceEndpoint || action.webhookUrl || '').trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return { valid: false, error: 'Las direcciones de dispositivos o webhooks deben comenzar con http:// o https://' };
      }
    }

    const sanitized: RuleAction = {
      id: String(action.id || 'act-' + Math.random().toString(36).substring(2, 9)),
      type: action.type,
      enabled: Boolean(action.enabled ?? true),
      effectId: action.effectId ? String(action.effectId).substring(0, 50) : undefined,
      soundId: action.soundId ? String(action.soundId).substring(0, 30) as any : undefined,
      volume: typeof action.volume === 'number' ? Math.max(0, Math.min(100, action.volume)) : 80,
      ttsTemplate: action.ttsTemplate ? String(action.ttsTemplate).substring(0, 200) : undefined,
      ttsVoice: action.ttsVoice ? String(action.ttsVoice).substring(0, 50) : undefined,
      ttsSpeed: typeof action.ttsSpeed === 'number' ? Math.max(0.5, Math.min(2.0, action.ttsSpeed)) : 1.0,
      customMessageText: action.customMessageText ? String(action.customMessageText).substring(0, 200) : undefined,
      counterId: action.counterId ? String(action.counterId).substring(0, 50) : undefined,
      counterOperation: action.counterOperation || 'increment',
      counterAmount: action.counterAmount,
      leaderboardCategory: action.leaderboardCategory ? String(action.leaderboardCategory).substring(0, 30) : undefined,
      leaderboardPoints: action.leaderboardPoints,
      deviceEndpoint: action.deviceEndpoint ? String(action.deviceEndpoint).substring(0, 250) : undefined,
      deviceMethod: action.deviceMethod === 'GET' ? 'GET' : 'POST',
      deviceCommandPayload: action.deviceCommandPayload ? String(action.deviceCommandPayload).substring(0, 500) : undefined,
      deviceTimeoutMs: typeof action.deviceTimeoutMs === 'number' ? Math.max(200, Math.min(5000, action.deviceTimeoutMs)) : 2000,
      obsSceneName: action.obsSceneName ? String(action.obsSceneName).substring(0, 60) : undefined,
      webhookUrl: action.webhookUrl ? String(action.webhookUrl).substring(0, 250) : undefined,
      webhookPayload: action.webhookPayload ? String(action.webhookPayload).substring(0, 500) : undefined,
    };

    return { valid: true, sanitized };
  }

  private static sanitizeConditions(cond: any): any {
    const res: any = {};
    if (cond.giftName) res.giftName = String(cond.giftName).substring(0, 50).trim();
    if (typeof cond.minDiamonds === 'number') res.minDiamonds = Math.max(0, cond.minDiamonds);
    if (typeof cond.maxDiamonds === 'number') res.maxDiamonds = Math.max(0, cond.maxDiamonds);
    if (typeof cond.minRepeatCount === 'number') res.minRepeatCount = Math.max(1, cond.minRepeatCount);
    if (cond.commentKeyword) res.commentKeyword = String(cond.commentKeyword).substring(0, 100).trim();
    if (cond.commentMatchType) res.commentMatchType = cond.commentMatchType;
    if (cond.userFilter) res.userFilter = cond.userFilter;
    if (typeof cond.minSenderLevel === 'number') res.minSenderLevel = Math.max(0, cond.minSenderLevel);
    if (typeof cond.minLikeCount === 'number') res.minLikeCount = Math.max(1, cond.minLikeCount);
    return res;
  }
}
