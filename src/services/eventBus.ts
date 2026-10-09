import { ExecutionLog, OverlayEffect, TikTokEvent } from '../types';

export interface TriggerActionPayload {
  effect: OverlayEffect;
  event: TikTokEvent;
  formattedTitle: string;
  formattedSubtitle: string;
  ttsVoiceText?: string;
  timestamp: number;
}

export type EventBusMessage =
  | { type: 'TRIGGER_OVERLAY'; payload: TriggerActionPayload }
  | { type: 'TIKTOK_EVENT_RECEIVED'; payload: TikTokEvent }
  | { type: 'EXECUTION_LOGGED'; payload: ExecutionLog }
  | { type: 'MASTER_SWITCH_CHANGED'; payload: boolean };

type ListenerCallback = (message: EventBusMessage) => void;

class EventBusService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<ListenerCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('livetrigger_bus');
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  public subscribe(callback: ListenerCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public broadcast(message: EventBusMessage) {
    // Notify local listeners
    this.notifyListeners(message);

    // Broadcast to other windows/tabs (e.g. OBS Browser Source)
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {
        // Post message error
      }
    }
  }

  private notifyListeners(message: EventBusMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(message);
      } catch {
        // Callback exception caught safely
      }
    });
  }
}

export const eventBus = new EventBusService();
