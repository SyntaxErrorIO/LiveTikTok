import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FoodOrder,
  CustomerLeaderboardEntry,
  LiveGameConfig,
  LiveDish,
  LiveMenuItem,
} from '../types';
import { QUICK_DISHES, VIP_DISHES, DEFAULT_GAME_CONFIG, LIVE_MENU_ITEMS, getMenuItemsByTheme } from '../GameRegistry';
import confetti from 'canvas-confetti';
import { StreetFoodScenery } from './FoodRushVisuals';
import { RealisticChefStation } from './RealisticChefStation';
import { FoodMenuBoard } from './FoodMenuBoard';
import { FullScreenOrderShowcase } from './FullScreenOrderShowcase';
import { foodAudio } from './foodAudio';
import { CustomerAvatar } from '../common/CustomerAvatar';
import { ServingDishToss } from './ServingDishToss';
import { GameStorageService } from '../../../services/gameStorageService';
import { eventBus } from '../../../services/eventBus';
import { apiService } from '../../../services/apiService';
import { TikTokEvent } from '../../../types';
import {
  Trophy,
  Flame,
  Zap,
  Users,
  Heart,
  Volume2,
  VolumeX,
  ChefHat,
  Sparkles,
  Clock,
  Layers,
  ScrollText,
  AlertTriangle,
} from 'lucide-react';

interface FoodRushGameProps {
  isPreview?: boolean;
  aspectRatio?: '9:16' | 'responsive';
  sceneTheme?: 'stall' | 'transparent';
  configOverride?: Partial<LiveGameConfig>;
}

export const FoodRushGame: React.FC<FoodRushGameProps> = ({
  isPreview = false,
  aspectRatio = '9:16',
  sceneTheme = 'stall',
  configOverride,
}) => {
  // Config
  const [config, setConfig] = useState<LiveGameConfig>(() => ({
    ...GameStorageService.getConfig(),
    ...configOverride,
  }));

  // Game State
  const [orderQueue, setOrderQueue] = useState<FoodOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<FoodOrder | null>(null);
  const [isCooking, setIsCooking] = useState(false);
  const [isVipFlame, setIsVipFlame] = useState(false);
  const [isServing, setIsServing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<FoodOrder | null>(null);

  // Pantalla Completa Cinemática (Showcase al pedir o servir)
  const [fullScreenOrder, setFullScreenOrder] = useState<FoodOrder | null>(null);

  // Carta en Pantalla (Menú de Pedidos para el Live)
  const [isMenuOpen, setIsMenuOpen] = useState(
    config.foodRush.menuDisplayMode !== 'hidden'
  );

  // Speed boost & likes
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [likesCount, setLikesCount] = useState(0);
  const [boostActiveUntil, setBoostActiveUntil] = useState(0);
  const [recentCheer, setRecentCheer] = useState<{ user: string; text: string } | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: string; x: number }[]>([]);

  // 1. Meta Comunitaria ("Fiebre de Cocina / Rush Hour")
  const [rushCoins, setRushCoins] = useState(0);
  const [rushHourActiveUntil, setRushHourActiveUntil] = useState(0);
  const [rushSecondsLeft, setRushSecondsLeft] = useState(0);
  const isRushHour = rushHourActiveUntil > Date.now();

  // 2. Evento de Sabotaje ("¡Se quema la parrilla!")
  const [isFireEmergency, setIsFireEmergency] = useState(Boolean(config.foodRush.fireSabotageActive));
  const [extinguishProgress, setExtinguishProgress] = useState(0);

  // Rush Hour countdown tick
  useEffect(() => {
    if (rushHourActiveUntil <= 0) {
      setRushSecondsLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((rushHourActiveUntil - Date.now()) / 1000));
      setRushSecondsLeft(remaining);
      if (remaining <= 0) {
        setRushHourActiveUntil(0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [rushHourActiveUntil]);

  // Sound
  const [soundMuted, setSoundMuted] = useState(!config.foodRush.soundEnabled);

  // Top 3 Clientes del Día
  const [topCustomers, setTopCustomers] = useState<CustomerLeaderboardEntry[]>(() =>
    GameStorageService.getTopCustomers()
  );

  // Update sound engine on volume / mute changes
  useEffect(() => {
    foodAudio.setMuted(soundMuted);
    foodAudio.setVolume(config.soundVolume);
  }, [soundMuted, config.soundVolume]);

  // Sync config from local storage or broadcast channel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBroadcast = (evt: MessageEvent) => {
      if (evt.data?.type === 'CONFIG_UPDATED' && evt.data.config) {
        setConfig(evt.data.config);
      } else if (evt.data?.type === 'CUSTOMERS_UPDATED' && Array.isArray(evt.data.customers)) {
        setTopCustomers(evt.data.customers);
      } else if (evt.data?.type === 'CUSTOMERS_RESET') {
        setTopCustomers([]);
      }
    };
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('livetrigger_games_channel');
      bc.onmessage = handleBroadcast;
      return () => bc.close();
    }
  }, []);

  // Update Top Customers leaderboard in state & storage
  const recordCustomerOrder = useCallback((order: FoodOrder) => {
    setTopCustomers((prev) => {
      const existingIdx = prev.findIndex((c) => c.username.toLowerCase() === order.username.toLowerCase());
      let updated: CustomerLeaderboardEntry[];

      if (existingIdx >= 0) {
        const item = { ...prev[existingIdx] };
        item.nickname = order.nickname || item.nickname;
        if (order.avatarUrl) item.avatarUrl = order.avatarUrl;
        item.totalOrders += 1;
        item.totalPoints += order.pointsEarned;
        item.totalDiamonds += order.diamonds;
        if (order.isVip) item.vipOrders += 1;
        item.lastOrderAt = Date.now();

        updated = [...prev];
        updated[existingIdx] = item;
      } else {
        const newItem: CustomerLeaderboardEntry = {
          username: order.username,
          nickname: order.nickname || order.username,
          avatarUrl: order.avatarUrl,
          totalOrders: 1,
          totalPoints: order.pointsEarned,
          totalDiamonds: order.diamonds,
          vipOrders: order.isVip ? 1 : 0,
          lastOrderAt: Date.now(),
        };
        updated = [...prev, newItem];
      }

      // Sort descending by points, then diamonds
      updated.sort((a, b) => b.totalPoints - a.totalPoints || b.totalDiamonds - a.totalDiamonds);
      GameStorageService.saveTopCustomers(updated);
      return updated;
    });
  }, []);

  // Ingest TikTok Event into the Food Rush engine
  const handleIncomingTikTokEvent = useCallback(
    (event: TikTokEvent) => {
      if (!event || !event.type) return;

      // 1. Gift Event: Food Orders
      if (event.type === 'gift') {
        const diamonds = Number(event.data.diamondCount) || 1;
        const repeatCount = Number(event.data.repeatCount) || 1;
        const totalDiamonds = diamonds * repeatCount;
        const giftName = event.data.giftName || 'Regalo';
        const giftLower = giftName.toLowerCase();

        // Check if VIP or Quick order according to settings
        const isVip = totalDiamonds >= config.foodRush.vipOrderMinCoins;

        // 1. Evento de Sabotaje: Regalo incendiario activa Cocina en Llamas
        if (
          giftLower.includes('fuego') ||
          giftLower.includes('llama') ||
          giftLower.includes('picante') ||
          giftLower.includes('fire') ||
          giftLower.includes('diablo') ||
          giftLower.includes('chile')
        ) {
          setIsFireEmergency(true);
          setExtinguishProgress(0);
          foodAudio.playFireWoosh();
        }

        // 2. Si hay fuego y mandan bebidas o agua, los espectadores apagan la cocina
        if (
          isFireEmergency &&
          (giftLower.includes('agua') ||
            giftLower.includes('jugo') ||
            giftLower.includes('refresco') ||
            giftLower.includes('ice') ||
            giftLower.includes('hielo') ||
            giftLower.includes('water') ||
            giftLower.includes('drink') ||
            giftLower.includes('chicha') ||
            giftLower.includes('flor') ||
            giftLower.includes('rosa'))
        ) {
          setExtinguishProgress((prev) => {
            const next = prev + 12;
            if (next >= 30) {
              setIsFireEmergency(false);
              foodAudio.playFanfare();
              try {
                confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
              } catch {}
            }
            return Math.min(30, next);
          });
        }

        // 3. Meta Comunitaria ("Fiebre de Cocina / Rush Hour")
        setRushCoins((prev) => {
          const goal = config.foodRush.rushHourGoalCoins || 50;
          const next = prev + totalDiamonds;
          if (next >= goal && rushHourActiveUntil <= Date.now()) {
            setRushHourActiveUntil(Date.now() + 45000); // 45 segundos de Fiebre Dorada
            foodAudio.playFanfare();
            try {
              confetti({
                particleCount: 120,
                spread: 100,
                origin: { y: 0.25 },
                colors: ['#facc15', '#f59e0b', '#fbbf24', '#ffffff', '#eab308'],
              });
            } catch {}
            return 0;
          }
          return next;
        });

        // 4. Selección del plato según la temática activa (Street Burger, Sazón Peruana, Sushi & Ramen)
        const activeTheme = config.foodRush.menuThemeId || 'peruvian_sazon';
        const themeItems = getMenuItemsByTheme(activeTheme);
        let selectedDish: LiveDish;

        if (
          giftLower.includes('flor') ||
          giftLower.includes('rosa') ||
          giftLower.includes('rose') ||
          totalDiamonds === 1
        ) {
          // Flor / Rosa ➔ Solo Jugo / Bebida helada del tema
          const matched = themeItems.find((i) => i.coins === 1) || themeItems[0];
          selectedDish = {
            id: matched.id,
            name: matched.dishName,
            emoji: matched.emoji,
            category: 'quick',
            cookTimeSec: 2.8,
            points: 15,
          };
        } else if (
          giftLower.includes('corazon') ||
          giftLower.includes('corazón') ||
          giftLower.includes('heart') ||
          giftLower.includes('quereme') ||
          giftLower.includes('love') ||
          (totalDiamonds >= 5 && totalDiamonds <= 10)
        ) {
          // Corazón / Quereme ➔ Segundo de Chaufa / Especial del tema
          const matched = themeItems.find((i) => i.coins === 5) || themeItems[1] || themeItems[0];
          selectedDish = {
            id: matched.id,
            name: matched.dishName,
            emoji: matched.emoji,
            category: 'vip',
            cookTimeSec: 4.2,
            points: 65,
          };
        } else if (
          giftLower.includes('lomo') ||
          giftLower.includes('dona') ||
          giftLower.includes('donut') ||
          giftLower.includes('perfume') ||
          (totalDiamonds > 10 && totalDiamonds < 50)
        ) {
          const matched = themeItems.find((i) => i.coins >= 10 && i.coins <= 25) || themeItems[2] || VIP_DISHES[1];
          selectedDish = {
            id: matched.id,
            name: matched.dishName,
            emoji: matched.emoji,
            category: 'vip',
            cookTimeSec: 4.8,
            points: 75,
          };
        } else if (
          giftLower.includes('leon') ||
          giftLower.includes('león') ||
          giftLower.includes('dragon') ||
          giftLower.includes('dragón') ||
          giftLower.includes('universo') ||
          giftLower.includes('galaxia') ||
          totalDiamonds >= 50
        ) {
          const matched = themeItems.find((i) => i.coins >= 50) || themeItems[themeItems.length - 1] || VIP_DISHES[0];
          selectedDish = {
            id: matched.id,
            name: matched.dishName,
            emoji: matched.emoji,
            category: 'vip',
            cookTimeSec: 5.5,
            points: 100,
          };
        } else if (isVip) {
          const idx = Math.floor(Math.random() * VIP_DISHES.length);
          selectedDish = VIP_DISHES[idx];
        } else {
          const idx = Math.floor(Math.random() * QUICK_DISHES.length);
          selectedDish = QUICK_DISHES[idx];
        }

        // Calculate points: VIP awards bonus; Rush Hour grants double points x2!
        const basePoints = selectedDish.points;
        const rawPoints = isVip
          ? basePoints * 2 + totalDiamonds * 5
          : basePoints + totalDiamonds * 2;
        const pointsEarned = isRushHour ? Math.round(rawPoints * 2) : rawPoints;

        // Regla solicitada: 8 segundos base normales sin potenciadores + 3 segundos adicionales por cada nivel o mayor tamaño de regalo
        const giftTierBonus = Math.min(4, Math.floor(totalDiamonds / 3));
        const baseDurationSec = 8.0 + giftTierBonus * 3.0;

        const newOrder: FoodOrder = {
          id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: event.user.id || event.user.username,
          username: event.user.username,
          nickname: event.user.nickname || event.user.username,
          avatarUrl: event.user.avatarUrl,
          dishName: selectedDish.name,
          dishEmoji: selectedDish.emoji,
          isVip,
          diamonds: totalDiamonds,
          giftName,
          repeatCount,
          status: 'queued',
          cookDurationMs: baseDurationSec * 1000,
          cookProgress: 0,
          createdAt: Date.now(),
          pointsEarned,
        };

        // Audio de aviso de nueva orden en cola
        if (isVip) {
          foodAudio.playFireWoosh();
        } else {
          foodAudio.playChime();
        }

        // Enqueue order with Combo Stacking: If same username sends same dish within 4 seconds, stack combo!
        setOrderQueue((prev) => {
          const now = Date.now();
          const lastIdx = prev.findIndex(
            (o) =>
              o.username.toLowerCase() === newOrder.username.toLowerCase() &&
              o.dishName === newOrder.dishName &&
              o.status === 'queued' &&
              now - o.createdAt < 4000
          );

          if (lastIdx >= 0) {
            const existing = { ...prev[lastIdx] };
            const currentCombo = existing.comboCount || 1;
            existing.comboCount = currentCombo + 1;
            existing.diamonds += newOrder.diamonds;
            existing.pointsEarned += newOrder.pointsEarned;
            existing.cookDurationMs = Math.min(16000, existing.cookDurationMs + 2000); // Ligeramente más tiempo de cocción por combo acumulado

            const updatedQueue = [...prev];
            updatedQueue[lastIdx] = existing;
            return updatedQueue;
          }

          if (prev.length >= config.foodRush.maxQueueLength) {
            return [...prev.slice(1), { ...newOrder, comboCount: 1 }];
          }
          return [...prev, { ...newOrder, comboCount: 1 }];
        });

        // Notificación flotante de que la orden está en preparación
        setRecentCheer({
          user: newOrder.username,
          text: `¡Pidió ${newOrder.dishName}! En preparación, espere... 🍳⏳`,
        });
        setTimeout(() => {
          setRecentCheer((curr) => (curr?.text?.includes('En preparación') ? null : curr));
        }, 4000);
      }

      // 2. Like Event: Accelerate Cooking Speed & Extinguish Fire if in emergency
      else if (event.type === 'like' && config.foodRush.likesBoostEnabled) {
        const count = Number(event.data.likeCount) || 1;

        // Si la parrilla está en llamas, los Likes de los espectadores ayudan a apagar el fuego
        if (isFireEmergency) {
          setExtinguishProgress((prev) => {
            const next = prev + (count >= 5 ? 3 : 1);
            if (next >= 30) {
              setIsFireEmergency(false);
              foodAudio.playFanfare();
              try {
                confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
              } catch {}
            }
            return Math.min(30, next);
          });
        }

        setLikesCount((prev) => {
          const next = prev + count;
          if (next >= config.foodRush.likesThreshold) {
            // Activate speed boost for 8 seconds
            setBoostActiveUntil(Date.now() + 8000);
            setSpeedMultiplier(2.2);
            return 0; // reset meter
          }
          return next;
        });

        // Spawn floating heart particle
        const heartId = 'heart-' + Math.random().toString(36).substring(2, 7);
        setFloatingHearts((prev) => [...prev.slice(-6), { id: heartId, x: 20 + Math.random() * 60 }]);
        setTimeout(() => {
          setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
        }, 1800);
      }

      // 3. Comment Event: Chef encouragement & mini-boost / Free hunger comments
      else if (event.type === 'comment' && config.foodRush.commentsBoostEnabled) {
        const comment = event.data.comment?.trim();
        if (comment) {
          const lower = comment.toLowerCase();
          const isCallingRemy =
            lower.includes('remy') ||
            lower.includes('rata') ||
            lower.includes('ratita') ||
            lower.includes('queso') ||
            lower.includes('ratatouille');

          const isHungryComment =
            lower.includes('hambre') ||
            lower.includes('pedido') ||
            lower.includes('chaufa') ||
            lower.includes('burger') ||
            lower.includes('!pedir') ||
            lower.includes('comida');

          if (isCallingRemy) {
            foodAudio.playRemySqueak();
            setRecentCheer({
              user: 'Remy',
              text: `¡${event.user.nickname || event.user.username} llamó a Remy! +15% Sazón 🧀✨`,
            });
            setBoostActiveUntil((prev) => Math.max(prev, Date.now() + 6000));
            setSpeedMultiplier((prev) => Math.min(2.5, prev + 0.2));
          } else if (isHungryComment) {
            setRecentCheer({
              user: event.user.nickname || event.user.username,
              text: `¡Tiene hambre! Manda una Rosa para atenderte con prioridad VIP 🍲✨`,
            });
            setBoostActiveUntil((prev) => Math.max(prev, Date.now() + 3000));
          } else {
            setRecentCheer({
              user: event.user.nickname || event.user.username,
              text: comment.length > 32 ? comment.substring(0, 32) + '...' : comment,
            });
            // Slight cooking boost
            setBoostActiveUntil((prev) => Math.max(prev, Date.now() + 4000));
            setSpeedMultiplier((prev) => Math.min(2.5, Math.max(1.5, prev)));
          }

          setTimeout(() => {
            setRecentCheer(null);
          }, 3500);
        }
      }
    },
    [config, recordCustomerOrder, isFireEmergency, rushHourActiveUntil]
  );

  // Subscribe to EventBus and SSE Stream
  useEffect(() => {
    const handleGameAction = (actionPayload: any) => {
      if (!actionPayload) return;
      const action = actionPayload.action;
      if (action === 'sabotage_fire') {
        setIsFireEmergency(true);
        setExtinguishProgress(0);
        foodAudio.playFireWoosh();
      } else if (action === 'extinguish_fire') {
        setExtinguishProgress((prev) => {
          const next = prev + 15;
          if (next >= 30) {
            setIsFireEmergency(false);
            foodAudio.playFanfare();
            try {
              confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
            } catch {}
          }
          return Math.min(30, next);
        });
      } else if (action === 'trigger_rush_hour') {
        setRushHourActiveUntil(Date.now() + 45000);
        foodAudio.playFanfare();
        try {
          confetti({
            particleCount: 120,
            spread: 100,
            origin: { y: 0.25 },
            colors: ['#facc15', '#f59e0b', '#fbbf24', '#ffffff'],
          });
        } catch {}
      }
    };

    // 1. Local Bus (Simulator & Web UI actions)
    const unsubBus = eventBus.subscribe((msg) => {
      if (msg.type === 'TIKTOK_EVENT_RECEIVED') {
        handleIncomingTikTokEvent(msg.payload);
      } else if (msg.type === 'GAME_ACTION_RECEIVED') {
        handleGameAction(msg.payload);
      }
    });

    // 2. SSE Server Stream (Real TikTok live events & remote actions from OBS)
    const unsubSSE = apiService.onSSEMessage((data) => {
      if (data.type === 'TIKTOK_EVENT' && data.payload) {
        handleIncomingTikTokEvent(data.payload);
      } else if (data.type === 'GAME_ACTION') {
        handleGameAction(data.payload);
      }
    });

    return () => {
      unsubBus();
      unsubSSE();
    };
  }, [handleIncomingTikTokEvent]);

  // Speed boost timer decay
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (boostActiveUntil > 0) {
        if (now > boostActiveUntil) {
          setSpeedMultiplier(1.0);
          setBoostActiveUntil(0);
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [boostActiveUntil]);

  // Main Cooking Loop (Pulls from queue and cooks active dish)
  useEffect(() => {
    // If chef is idle and queue has orders, pick the next one!
    if (!currentOrder && orderQueue.length > 0 && !isServing) {
      const nextOrder = orderQueue[0];
      setOrderQueue((prev) => prev.slice(1));
      setCurrentOrder({ ...nextOrder, status: 'cooking', cookProgress: 0 });
      setIsCooking(true);

      if (nextOrder.isVip) {
        setIsVipFlame(true);
        foodAudio.playFireWoosh();
      } else {
        setIsVipFlame(false);
        foodAudio.playSizzle();
      }
    }
  }, [currentOrder, orderQueue, isServing]);

  // Cooking progress tick
  useEffect(() => {
    if (!currentOrder || currentOrder.status !== 'cooking') return;
    if (isFireEmergency) return; // Si la parrilla está en llamas, la cocción se pausa hasta apagar el fuego

    const tickIntervalMs = 100;
    const progressPerTick = (tickIntervalMs / currentOrder.cookDurationMs) * 100 * speedMultiplier;

    const interval = setInterval(() => {
      setCurrentOrder((prev) => {
        if (!prev) return null;
        const nextProgress = Math.min(100, prev.cookProgress + progressPerTick);

        if (nextProgress >= 100) {
          clearInterval(interval);
          handleFinishCooking(prev);
          return { ...prev, cookProgress: 100, status: 'serving' };
        }
        return { ...prev, cookProgress: nextProgress };
      });
    }, tickIntervalMs);

    return () => clearInterval(interval);
  }, [currentOrder?.id, currentOrder?.status, currentOrder?.cookDurationMs, speedMultiplier, isFireEmergency]);

  // Finish cooking: Ring bell, update leaderboard, clear for next order
  const handleFinishCooking = useCallback(
    (finishedOrder: FoodOrder) => {
      setIsCooking(false);
      setIsServing(true);
      foodAudio.playBellDing();
      setCompletedOrder(finishedOrder);
      recordCustomerOrder(finishedOrder);

      // Activación de la presentación en toda la pantalla (Showcase) al terminar de cocinar
      if (config.foodRush.fullScreenShowcaseEnabled !== false) {
        setFullScreenOrder(finishedOrder);
      }

      // Keep serving celebration on screen briefly
      setTimeout(() => {
        setIsServing(false);
        setIsVipFlame(false);
        setCurrentOrder(null);
        setCompletedOrder(null);
      }, 1600);
    },
    [recordCustomerOrder, config.foodRush.fullScreenShowcaseEnabled]
  );

  // Top 3 Customers
  const top3 = topCustomers.slice(0, 3);

  // Mini-boost cuando el streamer o espectador interactúa con Remy
  const handleRemyBoost = useCallback(() => {
    setSpeedMultiplier((prev) => Math.min(3.0, prev + 0.15));
    setBoostActiveUntil(Date.now() + 8000);
    setRecentCheer({
      user: 'Remy',
      text: '¡Sazón Secreto activado! +15% velocidad 🧀⚡',
    });
    setTimeout(() => {
      setRecentCheer((curr) => (curr?.user === 'Remy' ? null : curr));
    }, 3000);
  }, []);

  // 9:16 vertical style wrapper vs full responsive wrapper
  const isVertical = aspectRatio === '9:16';

  // Quick action from clicking an item on the Menu Board
  const handleMenuItemClick = (item: LiveMenuItem) => {
    const dummyEvent: TikTokEvent = {
      id: `sim-click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'gift',
      source: 'simulation',
      user: {
        id: 'viewer_' + Math.floor(Math.random() * 900 + 100),
        username: 'espectador_' + (item.coins === 1 ? 'jugo' : 'chaufa'),
        nickname: item.coins === 1 ? 'Fan del Jugo' : 'Chaufero Pro',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`,
      },
      data: {
        giftName: item.triggerGift.split('(')[0].trim(),
        diamondCount: item.coins,
        repeatCount: 1,
      },
      timestamp: Date.now(),
    };
    handleIncomingTikTokEvent(dummyEvent);
  };

  return (
    <div
      className={`relative select-none overflow-hidden flex flex-col justify-between ${
        isVertical
          ? 'w-full max-w-[480px] aspect-[9/16] mx-auto bg-gradient-to-b from-[#0b0f19] via-[#111827] to-[#070a11] rounded-3xl border-2 border-slate-800/80 shadow-2xl'
          : 'w-full h-full min-h-[580px] bg-gradient-to-b from-[#0b0f19] via-[#111827] to-[#070a11] rounded-2xl border border-slate-800'
      }`}
    >
      {/* Background Decor: Street Food Scenery with Lanterns and atmospheric night market glow */}
      <StreetFoodScenery />

      {/* Floating Hearts from Likes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            className="absolute bottom-20 text-rose-500 animate-bounce"
            style={{
              left: `${h.x}%`,
              animation: 'floatUp 1.8s ease-out forwards',
            }}
          >
            <Heart className="w-6 h-6 fill-rose-500 filter drop-shadow-[0_0_8px_#f43f5e]" />
          </div>
        ))}
      </div>

      {/* BARRA SUPERIOR: META COMUNITARIA ("FIEBRE DE COCINA / RUSH HOUR") */}
      <div className="relative z-30 px-3 py-1.5 bg-black/60 backdrop-blur-md border-b border-amber-500/30">
        {isRushHour ? (
          <div className="w-full flex items-center justify-between px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-500/30 border border-yellow-300 shadow-[0_0_15px_#facc15] animate-pulse text-amber-200">
            <div className="flex items-center gap-2 font-black text-xs">
              <span className="text-base animate-spin">✨</span>
              <span className="tracking-wider">¡FIEBRE DORADA ACTIVA · PUNTOS X2!</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-black/70 font-black text-yellow-300 border border-yellow-400/60 font-mono text-xs">
              ⏱ {rushSecondsLeft}s
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 truncate">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Fiebre de Cocina:</span>
              <span className="text-white font-black">{rushCoins} / {config.foodRush.rushHourGoalCoins || 50} 🪙</span>
            </div>
            <div className="w-32 sm:w-40 h-2.5 rounded-full bg-slate-900 overflow-hidden border border-amber-500/40 shrink-0">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (rushCoins / (config.foodRush.rushHourGoalCoins || 50)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* TOP HEADER: Top 3 Best Customers Widget, Menu Toggle & Live Speed Gauge */}
      <header className="relative z-20 p-3 flex items-start justify-between gap-2 border-b border-slate-800/60 bg-black/40 backdrop-blur-md">
        {/* Top 3 Clientes del Día Widget */}
        <div className="flex-1 max-w-[260px]">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top Clientes del Día</span>
          </div>

          {top3.length === 0 ? (
            <div className="text-[10px] text-slate-400 italic font-mono bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
              ¡Envía una Rosa o Corazón para el #1!
            </div>
          ) : (
            <div className="space-y-1">
              {top3.map((customer, idx) => (
                <div
                  key={customer.username}
                  className={`flex items-center justify-between text-[11px] px-2 py-0.5 rounded-lg border backdrop-blur-sm ${
                    idx === 0
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-700/20 border-slate-600/50 text-slate-300'
                      : 'bg-amber-900/20 border-amber-800/40 text-amber-400/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-bold text-[10px]">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    {customer.avatarUrl ? (
                      <img
                        src={customer.avatarUrl}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover border border-amber-400/40"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-slate-800 text-[8px] flex items-center justify-center font-bold">
                        {customer.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold truncate max-w-[85px]">@{customer.username}</span>
                  </div>
                  <span className="font-mono font-extrabold text-[10px] text-amber-300 tabular-nums">
                    {customer.totalPoints.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Speed / Likes Booster Gauge & Quick Actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm ${
              speedMultiplier > 1.2
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
          >
            <Zap className={`w-3 h-3 ${speedMultiplier > 1.2 ? 'text-yellow-300 fill-yellow-300' : 'text-slate-400'}`} />
            <span>
              {speedMultiplier > 1.2 ? `BOOST x${speedMultiplier.toFixed(1)}!` : 'Velocidad x1.0'}
            </span>
          </div>

          {/* Likes Progress */}
          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
            <Heart className="w-2.5 h-2.5 text-rose-400" />
            <span>Likes: {likesCount}/{config.foodRush.likesThreshold}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Botón interactivo para saludar / recibir boost de la ratita Remy */}
            <button
              onClick={handleRemyBoost}
              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 hover:text-white transition-colors"
              title="Saludar a Remy y activar boost culinario"
            >
              <span>🐀</span>
              <span className="hidden sm:inline">Remy</span>
            </button>

            {/* Botón para alternar visibilidad de la Carta del Puesto */}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border ${
                isMenuOpen
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title="Mostrar u ocultar Carta del Puesto en vivo"
            >
              <ScrollText className="w-3 h-3" />
              <span>Carta</span>
            </button>

            {/* Sound Toggle Button */}
            <button
              onClick={() => setSoundMuted((m) => !m)}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 text-[10px]"
              title={soundMuted ? 'Activar sonido del juego' : 'Silenciar juego'}
            >
              {soundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* CARTA EN PANTALLA: Pizarra / Menú de Pedidos Flotante */}
      {isMenuOpen && config.foodRush.menuDisplayMode !== 'hidden' && (
        <div className="absolute top-20 right-3 z-30 max-w-[280px] sm:max-w-[320px] animate-in fade-in slide-in-from-top-4 duration-200">
          <FoodMenuBoard
            initialExpanded={true}
            isVertical={isVertical}
            themeId={config.foodRush.menuThemeId || 'peruvian_sazon'}
            onItemClick={handleMenuItemClick}
          />
        </div>
      )}

      {/* Comment cheer bubble popup if viewer cheered */}
      {recentCheer && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 max-w-[90%] animate-in fade-in zoom-in duration-150">
          <div className="px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-400/60 text-xs text-white shadow-xl flex items-center gap-2 backdrop-blur-md">
            <span className="text-cyan-300 font-bold">💬 @{recentCheer.user}:</span>
            <span className="text-slate-200 truncate font-medium">"{recentCheer.text}"</span>
          </div>
        </div>
      )}

      {/* MIDDLE ZONE: Chef Profesional Realista & Mesa de Preparación Culinaria */}
      <div className="relative flex-1 flex flex-col justify-end items-center px-3 sm:px-4 pb-2 z-10 w-full">
        <RealisticChefStation
          isCooking={isCooking}
          isVipFlame={isVipFlame}
          isServing={isServing}
          cookProgress={currentOrder?.cookProgress || 0}
          currentDish={currentOrder}
          speedMultiplier={speedMultiplier}
          isRushHour={isRushHour}
          isFireEmergency={isFireEmergency}
          extinguishProgress={extinguishProgress}
          onRemyClick={handleRemyBoost}
        />
      </div>

      {/* LOWER ZONE: Customer Line / Fila de Clientes & Order Queue */}
      <div className="relative z-20 p-3 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md">
        {/* Queue Header & Counter */}
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fila de Clientes</span>
            <span className="text-slate-500 font-mono">({orderQueue.length} en espera)</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>🌹 Flor: Solo Jugo</span>
            <span>·</span>
            <span className="text-amber-300 font-bold">💖 Chaufa VIP</span>
          </div>
        </div>

        {/* Visual Customer Waiting Queue (FIFO cards with avatar and username) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center min-h-[68px]">
          {/* Active Serving/Finished order highlight */}
          {completedOrder && (
            <div className="relative shrink-0 flex items-center gap-2 p-1.5 rounded-xl bg-amber-500/20 border-2 border-amber-400 animate-in zoom-in-90 duration-200 shadow-[0_0_15px_#f59e0b]">
              <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm">
                {completedOrder.dishEmoji}
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-[11px] font-extrabold text-amber-300">¡SERVIDO!</span>
                <span className="text-[10px] font-bold text-white truncate max-w-[80px]">
                  @{completedOrder.username}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">
                  +{completedOrder.pointsEarned} pts
                </span>
              </div>
            </div>
          )}

          {/* Cooking Order in front of line */}
          {currentOrder && (
            <div
              className={`relative shrink-0 flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all ${
                currentOrder.isVip
                  ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              }`}
            >
              {/* Customer Avatar */}
              <CustomerAvatar
                avatarUrl={currentOrder.avatarUrl}
                username={currentOrder.username}
                size="sm"
                isVip={currentOrder.isVip}
                className="border-2 border-white/80"
              />

              {/* Customer Name & Order Info */}
              <div className="flex flex-col pr-1 min-w-[70px] max-w-[100px]">
                <div className="flex items-center gap-1 truncate">
                  <span className="text-[11px] font-bold text-white truncate">
                    @{currentOrder.username}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold truncate">
                  <span>{currentOrder.dishEmoji}</span>
                  <span className="truncate">{currentOrder.dishName}</span>
                </div>
                <span className="text-[9px] font-mono text-cyan-300 font-semibold">
                  Cocinando...
                </span>
              </div>
            </div>
          )}

          {/* Queued Customers */}
          {orderQueue.length === 0 && !currentOrder && !completedOrder ? (
            <div className="w-full py-2 text-center text-slate-500 text-xs italic font-mono">
              Esperando pedidos... ¡Manda una Flor o Corazón para pedir!
            </div>
          ) : (
            orderQueue.map((order, idx) => (
              <div
                key={order.id}
                className={`relative shrink-0 flex items-center gap-2 p-1.5 rounded-xl border backdrop-blur-sm ${
                  order.isVip
                    ? 'bg-amber-950/30 border-amber-500/50'
                    : 'bg-slate-900/80 border-slate-700/80'
                }`}
              >
                {/* Position # */}
                <span className="text-[10px] font-mono font-bold text-slate-400 pl-0.5">
                  #{idx + 1}
                </span>

                {/* Avatar */}
                <CustomerAvatar
                  avatarUrl={order.avatarUrl}
                  username={order.username}
                  size="xs"
                  isVip={order.isVip}
                />

                {/* Info */}
                <div className="flex flex-col pr-1 min-w-[60px] max-w-[90px]">
                  <span className="text-[10px] font-bold text-slate-200 truncate">
                    @{order.username}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] text-amber-300 font-semibold truncate">
                    <span>{order.dishEmoji}</span>
                    <span className="truncate">{order.dishName}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SHOWCASE EN TODA LA PANTALLA: Muestra cinemática en toda la pantalla lo que pidió el espectador */}
      {fullScreenOrder && (
        <FullScreenOrderShowcase
          order={fullScreenOrder}
          onClose={() => setFullScreenOrder(null)}
          durationSec={config.foodRush.fullScreenDurationSec || 3.5}
          ttsEnabled={config.foodRush.ttsEnabled !== false}
        />
      )}
    </div>
  );
};

export default FoodRushGame;
