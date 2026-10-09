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

    // Safety checks for Webhooks & IoT Device Orders with strict SSRF prevention
    if (action.type === 'iot_device_order' || action.type === 'webhook_post') {
      const url = String(action.deviceEndpoint || action.webhookUrl || '').trim();
      if (url) {
        const ssrfCheck = this.isSafeExternalUrl(url);
        if (!ssrfCheck.safe) {
          return { valid: false, error: ssrfCheck.reason || 'URL no permitida por razones de seguridad (prevención SSRF).' };
        }
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

  /**
   * SSRF Defense: Validates that a destination URL is a legitimate public web destination
   * and blocks requests to loopback, internal networks, metadata endpoints, and non-HTTP protocols.
   */
  public static isSafeExternalUrl(urlStr: string): { safe: boolean; reason?: string } {
    if (!urlStr || typeof urlStr !== 'string') {
      return { safe: false, reason: 'URL no proporcionada.' };
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { safe: false, reason: 'La URL proporcionada tiene un formato inválido.' };
    }

    // Scheme whitelist
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Solo se permiten protocolos http:// y https://.' };
    }

    const rawHostname = parsed.hostname.toLowerCase().trim();

    // Block empty hostname
    if (!rawHostname) {
      return { safe: false, reason: 'El nombre de host no puede estar vacío.' };
    }

    // Hostname blocklist
    const blockedHosts = [
      'localhost',
      'metadata.google.internal',
      'instance-data',
      'metadata.internal',
    ];
    if (blockedHosts.includes(rawHostname)) {
      return { safe: false, reason: 'Acceso a endpoints internos y metadatos bloqueado (SSRF).' };
    }

    if (
      rawHostname.endsWith('.localhost') ||
      rawHostname.endsWith('.local') ||
      rawHostname.endsWith('.internal') ||
      rawHostname.endsWith('.arpa')
    ) {
      return { safe: false, reason: 'Acceso a redes locales e internas bloqueado (SSRF).' };
    }

    // IPv6 checks
    const ipv6 = rawHostname.startsWith('[') && rawHostname.endsWith(']')
      ? rawHostname.slice(1, -1)
      : rawHostname;

    if (
      ipv6 === '::1' ||
      ipv6 === '::' ||
      ipv6.startsWith('fe80:') ||
      ipv6.startsWith('fc00:') ||
      ipv6.startsWith('fd00:') ||
      ipv6.includes('::ffff:127.') ||
      ipv6.includes('::ffff:10.') ||
      ipv6.includes('::ffff:192.168.') ||
      ipv6.includes('::ffff:169.254.')
    ) {
      return { safe: false, reason: 'Dirección IPv6 interna o de bucle invertido bloqueada (SSRF).' };
    }

    // IPv4 dotted-decimal or decimal/hex integer checks
    // Check if hostname is an IPv4 or numeric format
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const numMatch = rawHostname.match(ipv4Pattern);

    if (numMatch) {
      const oct1 = parseInt(numMatch[1], 10);
      const oct2 = parseInt(numMatch[2], 10);
      const oct3 = parseInt(numMatch[3], 10);
      const oct4 = parseInt(numMatch[4], 10);

      if (oct1 > 255 || oct2 > 255 || oct3 > 255 || oct4 > 255) {
        return { safe: false, reason: 'Dirección IP inválida.' };
      }

      // 0.0.0.0/8
      if (oct1 === 0) return { safe: false, reason: 'Rango 0.0.0.0/8 no permitido.' };

      // 127.0.0.0/8 Loopback
      if (oct1 === 127) return { safe: false, reason: 'Dirección de bucle invertido 127.0.0.0/8 bloqueada.' };

      // 10.0.0.0/8 Private
      if (oct1 === 10) return { safe: false, reason: 'Red privada RFC 1918 (10.0.0.0/8) bloqueada.' };

      // 172.16.0.0/12 Private (172.16.x.x - 172.31.x.x)
      if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
        return { safe: false, reason: 'Red privada RFC 1918 (172.16.0.0/12) bloqueada.' };
      }

      // 192.168.0.0/16 Private
      if (oct1 === 192 && oct2 === 168) {
        return { safe: false, reason: 'Red privada RFC 1918 (192.168.0.0/16) bloqueada.' };
      }

      // 169.254.0.0/16 Link-Local / Cloud Metadata (AWS/GCP/Azure)
      if (oct1 === 169 && oct2 === 254) {
        return { safe: false, reason: 'Endpoint de metadatos de nube (169.254.0.0/16) bloqueado.' };
      }

      // 100.64.0.0/10 Carrier-Grade NAT
      if (oct1 === 100 && oct2 >= 64 && oct2 <= 127) {
        return { safe: false, reason: 'Rango CGNAT (100.64.0.0/10) bloqueado.' };
      }

      // Multicast / Reserved
      if (oct1 >= 224) {
        return { safe: false, reason: 'Dirección multicast o reservada bloqueada.' };
      }
    } else if (/^\d+$/.test(rawHostname) || /^0x[0-9a-f]+$/i.test(rawHostname)) {
      // Decimal or hex integer IP obfuscation (e.g. 2130706433 or 0x7f000001)
      return { safe: false, reason: 'Representación numérica de IP no permitida.' };
    }

    return { safe: true };
  }
}
