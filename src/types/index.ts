export type TriggerType = 'gift' | 'comment' | 'like' | 'follow' | 'share';

export type EventSource = 'simulation' | 'real_tiktok';

export type RulePriority = 'high' | 'medium' | 'low';

export interface TikTokEvent {
  id: string;
  type: TriggerType;
  source: EventSource;
  timestamp: number;
  user: {
    id: string;
    username: string;
    nickname: string;
    avatarUrl?: string;
    isFollower?: boolean;
    isSubscriber?: boolean;
    isModerator?: boolean;
    badgeLevel?: number;
  };
  data: {
    // Gift specific
    giftId?: string;
    giftName?: string;
    diamondCount?: number;
    repeatCount?: number;
    // Comment specific
    comment?: string;
    // Like specific
    likeCount?: number;
    totalLikes?: number;
    // Share specific
    shareTarget?: string;
  };
}

export interface RuleConditions {
  // Gift conditions
  giftName?: string; // 'all' or specific gift name
  minDiamonds?: number;
  maxDiamonds?: number;
  minRepeatCount?: number;
  // Comment conditions
  commentKeyword?: string;
  commentMatchType?: 'contains' | 'exact' | 'regex' | 'starts_with';
  // User filters
  userFilter?: 'all' | 'subscribers' | 'moderators' | 'min_level';
  minSenderLevel?: number;
  // Like conditions
  minLikeCount?: number;
}

export type ActionType =
  | 'overlay_effect'
  | 'sound_fx'
  | 'tts_speech'
  | 'custom_message'
  | 'update_counter'
  | 'add_leaderboard_points'
  | 'iot_device_order'
  | 'obs_scene'
  | 'webhook_post';

export interface RuleAction {
  id: string;
  type: ActionType;
  enabled: boolean;
  // Overlay config
  effectId?: string;
  // Sound config
  soundId?: SoundPresetId;
  volume?: number; // 0 to 100
  // TTS config
  ttsTemplate?: string; // e.g. "{user} envió {amount} {gift}!"
  ttsVoice?: string;
  ttsSpeed?: number;
  // Custom message banner
  customMessageText?: string;
  // Counter update
  counterId?: string;
  counterOperation?: 'increment' | 'set' | 'reset';
  counterAmount?: number | 'event_diamonds' | 'event_amount';
  // Leaderboard points
  leaderboardCategory?: string;
  leaderboardPoints?: number | 'event_diamonds';
  // IoT / External device order
  deviceEndpoint?: string;
  deviceMethod?: 'POST' | 'GET';
  deviceCommandPayload?: string;
  deviceTimeoutMs?: number;
  // OBS scene switch
  obsSceneName?: string;
  // Webhook
  webhookUrl?: string;
  webhookPayload?: string;
}

export interface StreamCounter {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  lastUpdated: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  nickname: string;
  points: number;
  giftsCount: number;
  lastUpdated: number;
}

export interface EngineStats {
  queuePending: number;
  totalReceived: number;
  totalProcessed: number;
  totalDeduplicated: number;
  totalRateLimited: number;
  totalErrors: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  nextBackoffDelayMs: number;
  lastDisconnectReason?: string;
  uptimeSeconds: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: RulePriority;
  triggerType: TriggerType;
  conditions: RuleConditions;
  actions: RuleAction[];
  cooldownSeconds: number;
  maxPerHour: number;
  lastTriggeredAt?: number;
  executionsCount: number;
  createdAt: number;
}

export type SoundPresetId = 'chime' | 'fanfare' | 'laser' | 'explosion' | 'coin' | 'powerup' | 'notification' | 'airhorn' | 'cyber_pulse';

export type OverlayAnimationType = 'confetti_burst' | 'cyber_strike' | 'jackpot_gold' | 'neon_pulse' | 'rose_shower' | 'streamer_card';

export interface OverlayEffect {
  id: string;
  name: string;
  animationType: OverlayAnimationType;
  titleTemplate: string;
  subtitleTemplate: string;
  primaryColor: string; // Hex or CSS color
  secondaryColor: string;
  durationMs: number;
  soundId: SoundPresetId;
  soundVolume: number;
  enableTTS: boolean;
  ttsTemplate: string;
  position: 'top' | 'center' | 'bottom' | 'top_left' | 'top_right' | 'bottom_right';
  badgeIcon: string;
}

export interface ExecutionLog {
  id: string;
  eventId: string;
  eventTimestamp: number;
  source: EventSource;
  eventType: TriggerType;
  eventSummary: string;
  senderName: string;
  matchedRules: {
    ruleId: string;
    ruleName: string;
    executedActionsCount: number;
    status: 'executed' | 'cooldown_blocked' | 'rate_limited' | 'condition_failed';
  }[];
  overallStatus: 'executed' | 'cooldown' | 'no_match' | 'error';
  executionTimeMs: number;
  errorDetails?: string;
}

export interface ConnectionConfig {
  mode: 'simulation' | 'real_tiktok';
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  username: string;
  roomId?: string;
  bridgeServerUrl: string; // e.g. ws://localhost:21213
  autoReconnect: boolean;
  connectedAt?: number;
  lastActivityAt?: number;
  viewerCount?: number;
  likeTotal?: number;
  pingMs?: number;
  errorMessage?: string;
}

export interface AppSettings {
  masterAutomationEnabled: boolean;
  masterVolume: number; // 0 to 100
  enableAudioSynthesizer: boolean;
  obsWebSocket: {
    enabled: boolean;
    url: string; // ws://127.0.0.1:4455
    password?: string;
    connected: boolean;
  };
  globalRateLimitPerMinute: number;
  defaultOverlayDurationMs: number;
  preferredTtsVoice?: string;
  historyRetentionCount: number;
}
