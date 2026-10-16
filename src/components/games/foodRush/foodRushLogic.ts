import { TikTokEvent } from '../../../types';

export interface FoodRushState {
  rushCoins: number;
  isFireEmergency: boolean;
  extinguishProgress: number;
  orderQueueCount: number;
}

export function processFoodRushEvent(
  event: TikTokEvent,
  currentState: FoodRushState,
  goalCoins: number = 50
): FoodRushState {
  if (!event || !event.type) return currentState;

  let nextRushCoins = currentState.rushCoins;
  let isFire = currentState.isFireEmergency;
  let extProgress = currentState.extinguishProgress;
  let queueCount = currentState.orderQueueCount;

  if (event.type === 'gift') {
    const diamonds = Number(event.data.diamondCount) || 1;
    const repeatCount = Number(event.data.repeatCount) || 1;
    const totalDiamonds = diamonds * repeatCount;
    const giftName = event.data.giftName || 'Regalo';
    const giftLower = giftName.toLowerCase();

    if (
      giftLower.includes('fuego') ||
      giftLower.includes('llama') ||
      giftLower.includes('fire')
    ) {
      isFire = true;
      extProgress = 0;
    }

    if (
      isFire &&
      (giftLower.includes('agua') || giftLower.includes('rosa') || giftLower.includes('rose'))
    ) {
      extProgress = Math.min(30, extProgress + 12);
      if (extProgress >= 30) {
        isFire = false;
      }
    }

    nextRushCoins += totalDiamonds;
    if (nextRushCoins >= goalCoins) {
      nextRushCoins = 0; // Rush hour triggered reset
    }

    queueCount += 1;
  }

  return {
    rushCoins: nextRushCoins,
    isFireEmergency: isFire,
    extinguishProgress: extProgress,
    orderQueueCount: queueCount,
  };
}
