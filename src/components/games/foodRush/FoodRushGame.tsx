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
  processFoodRushEvent,
  processFoodRushAction,
  updateCustomerLeaderboard,
  FoodRushState,
} from './foodRushLogic';
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
      const remaining = Math.max(0, Math.ceil((gameStateRef.current.rushHourActiveUntil - Date.now()) / 1000));
      setRushSecondsLeft(remaining);
      if (remaining <= 0) {
        gameStateRef.current.rushHourActiveUntil = 0;
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

  // Referencia sincrónica autoritativa con el estado más reciente del juego
  // Garantiza que ráfagas de regalos o eventos consecutivos se procesen siempre sobre el estado más fresco
  const configRef = useRef(config);
  configRef.current = config;

  const gameStateRef = useRef<FoodRushState>({
    orderQueue: [],
    rushCoins: 0,
    rushHourActiveUntil: 0,
    isFireEmergency: Boolean(config.foodRush.fireSabotageActive),
    extinguishProgress: 0,
    speedMultiplier: 1.0,
    likesCount: 0,
    boostActiveUntil: 0,
    recentCheer: null,
    topCustomers: GameStorageService.getTopCustomers(),
    processedEventIds: [],
  });

  // Update Top Customers leaderboard in state & storage usando la función pura unificada
  const recordCustomerOrder = useCallback((order: FoodOrder) => {
    setTopCustomers((prev) => {
      const updated = updateCustomerLeaderboard(gameStateRef.current.topCustomers || prev, order);
      gameStateRef.current.topCustomers = updated;
      GameStorageService.saveTopCustomers(updated);
      return updated;
    });
  }, []);

  // Ingest TikTok Event into the Food Rush engine delegando a la función de producción compartida
  const handleIncomingTikTokEvent = useCallback(
    (event: TikTokEvent) => {
      if (!event || !event.type) return;

      // Lectura sincrónica del estado en memoria más reciente (evita stale closure ante ráfagas)
      const currentState = gameStateRef.current;
      const result = processFoodRushEvent(event, currentState, configRef.current.foodRush, Date.now());

      // Si el evento fue detectado como duplicado por ID, no producir acciones repetidas
      if (result.isDuplicate) {
        return;
      }

      // Actualizar sincrónicamente la referencia ANTES de despachar setState de React
      // Esto asegura que si varios eventos llegan consecutivamente en el mismo tick/microtarea,
      // el siguiente evento ya procesa sobre los pedidos y monedas agregados por el anterior
      gameStateRef.current = {
        ...gameStateRef.current,
        orderQueue: result.orderQueue,
        rushCoins: result.rushCoins,
        rushHourActiveUntil: result.rushHourActiveUntil,
        isFireEmergency: result.isFireEmergency,
        extinguishProgress: result.extinguishProgress,
        speedMultiplier: result.speedMultiplier,
        likesCount: result.likesCount,
        boostActiveUntil: result.boostActiveUntil,
        recentCheer: result.recentCheer,
        processedEventIds: result.processedEventIds || [],
      };

      setOrderQueue(result.orderQueue);
      setRushCoins(result.rushCoins);
      setRushHourActiveUntil(result.rushHourActiveUntil);
      setIsFireEmergency(result.isFireEmergency);
      setExtinguishProgress(result.extinguishProgress);
      setSpeedMultiplier(result.speedMultiplier);
      setLikesCount(result.likesCount);
      setBoostActiveUntil(result.boostActiveUntil);

      if (result.recentCheer) {
        setRecentCheer(result.recentCheer);
        setTimeout(() => {
          setRecentCheer((curr) => (curr?.text === result.recentCheer?.text ? null : curr));
        }, 3500);
      }

      // Animación de partículas de corazones flotantes por Likes
      if (event.type === 'like' && configRef.current.foodRush.likesBoostEnabled) {
        const heartId = 'heart-' + Math.random().toString(36).substring(2, 7);
        setFloatingHearts((prev) => [...prev.slice(-6), { id: heartId, x: 20 + Math.random() * 60 }]);
        setTimeout(() => {
          setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
        }, 1800);
      }

      // Reproducción de efectos de audio determinados por la lógica unificada
      if (result.audioEffects) {
        for (const fx of result.audioEffects) {
          if (fx === 'fireWoosh') foodAudio.playFireWoosh();
          else if (fx === 'chime') foodAudio.playChime();
          else if (fx === 'fanfare') foodAudio.playFanfare();
          else if (fx === 'sizzle') foodAudio.playSizzle();
          else if (fx === 'remySqueak') foodAudio.playRemySqueak();
        }
      }

      // Efectos visuales de confeti
      if (result.confettiEffect === 'extinguish') {
        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
        } catch {}
      } else if (result.confettiEffect === 'rushHour') {
        try {
          confetti({
            particleCount: 120,
            spread: 100,
            origin: { y: 0.25 },
            colors: ['#facc15', '#f59e0b', '#fbbf24', '#ffffff', '#eab308'],
          });
        } catch {}
      }
    },
    [] // Callback estable: no recrea en cada cambio de estado
  );

  const handleGameAction = useCallback((actionPayload: any) => {
    if (!actionPayload || !actionPayload.action) return;
    const action = actionPayload.action;

    const currentState = gameStateRef.current;
    const result = processFoodRushAction(action, currentState, Date.now());

    gameStateRef.current = {
      ...gameStateRef.current,
      rushHourActiveUntil: result.rushHourActiveUntil,
      isFireEmergency: result.isFireEmergency,
      extinguishProgress: result.extinguishProgress,
    };

    setIsFireEmergency(result.isFireEmergency);
    setExtinguishProgress(result.extinguishProgress);
    setRushHourActiveUntil(result.rushHourActiveUntil);

    if (result.audioEffects) {
      for (const fx of result.audioEffects) {
        if (fx === 'fireWoosh') foodAudio.playFireWoosh();
        else if (fx === 'fanfare') foodAudio.playFanfare();
      }
    }

    if (result.confettiEffect === 'extinguish') {
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.3 } });
      } catch {}
    } else if (result.confettiEffect === 'rushHour') {
      try {
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.25 },
          colors: ['#facc15', '#f59e0b', '#fbbf24', '#ffffff'],
        });
      } catch {}
    }
  }, []); // Callback estable

  // Referencias a los handlers para evitar resuscripciones innecesarias al EventBus y SSE
  const handleIncomingTikTokEventRef = useRef(handleIncomingTikTokEvent);
  handleIncomingTikTokEventRef.current = handleIncomingTikTokEvent;

  const handleGameActionRef = useRef(handleGameAction);
  handleGameActionRef.current = handleGameAction;

  // Subscripción única al montar el componente: NUNCA se resuscribe ante cambios de estado
  useEffect(() => {
    const unsubBus = eventBus.subscribe((msg) => {
      if (msg.type === 'TIKTOK_EVENT_RECEIVED') {
        handleIncomingTikTokEventRef.current(msg.payload);
      } else if (msg.type === 'GAME_ACTION_RECEIVED') {
        handleGameActionRef.current(msg.payload);
      }
    });

    const unsubSSE = apiService.onSSEMessage((data) => {
      if (data.type === 'TIKTOK_EVENT' && data.payload) {
        handleIncomingTikTokEventRef.current(data.payload);
      } else if (data.type === 'GAME_ACTION') {
        handleGameActionRef.current(data.payload);
      }
    });

    return () => {
      unsubBus();
      unsubSSE();
    };
  }, []); // Sin dependencias: previene pérdidas de paquetes o reconexiones durante ráfagas de eventos

  // Speed boost timer decay
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (gameStateRef.current.boostActiveUntil > 0) {
        if (now > gameStateRef.current.boostActiveUntil) {
          gameStateRef.current.speedMultiplier = 1.0;
          gameStateRef.current.boostActiveUntil = 0;
          setSpeedMultiplier(1.0);
          setBoostActiveUntil(0);
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Main Cooking Loop (Pulls from queue and cooks active dish sobre gameStateRef sincrónico)
  useEffect(() => {
    // If chef is idle and queue has orders, pick the next one!
    if (!currentOrder && !isServing && gameStateRef.current.orderQueue.length > 0) {
      const nextOrder = gameStateRef.current.orderQueue[0];
      const remaining = gameStateRef.current.orderQueue.slice(1);
      gameStateRef.current.orderQueue = remaining;
      setOrderQueue(remaining);
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
  }, [currentOrder, orderQueue.length, isServing]);

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
      if (configRef.current.foodRush.fullScreenShowcaseEnabled !== false) {
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
    [recordCustomerOrder]
  );

  // Top 3 Customers
  const top3 = topCustomers.slice(0, 3);

  // Mini-boost cuando el streamer o espectador interactúa con Remy
  const handleRemyBoost = useCallback(() => {
    const nextSpeed = Math.min(3.0, (gameStateRef.current.speedMultiplier || 1.0) + 0.15);
    const nextBoostUntil = Date.now() + 8000;
    gameStateRef.current.speedMultiplier = nextSpeed;
    gameStateRef.current.boostActiveUntil = nextBoostUntil;
    setSpeedMultiplier(nextSpeed);
    setBoostActiveUntil(nextBoostUntil);
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
          ? isPreview
            ? 'w-full max-w-[440px] max-h-full aspect-[9/16] mx-auto bg-gradient-to-b from-[#0b0f19] via-[#111827] to-[#070a11] rounded-2xl border-2 border-slate-800/80 shadow-2xl'
            : 'obs-canvas-9-16 bg-gradient-to-b from-[#0b0f19] via-[#111827] to-[#070a11] rounded-none border-0 shadow-none'
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
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-rose-500 filter drop-shadow-[0_0_8px_#f43f5e]" />
          </div>
        ))}
      </div>

      {/* BARRA SUPERIOR: META COMUNITARIA ("FIEBRE DE COCINA / RUSH HOUR") */}
      <div className="relative z-30 px-3 py-2 sm:px-6 sm:py-3 md:px-8 md:py-3.5 bg-black/60 backdrop-blur-md border-b border-amber-500/30">
        {isRushHour ? (
          <div className="w-full flex items-center justify-between px-3 py-1.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-amber-500/30 border border-yellow-300 shadow-[0_0_15px_#facc15] animate-pulse text-amber-200">
            <div className="flex items-center gap-2 md:gap-3 font-black text-xs sm:text-sm md:text-base lg:text-lg">
              <span className="text-base sm:text-xl md:text-2xl animate-spin">✨</span>
              <span className="tracking-wider">¡FIEBRE DORADA ACTIVA · PUNTOS X2!</span>
            </div>
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg bg-black/70 font-black text-yellow-300 border border-yellow-400/60 font-mono text-xs sm:text-sm md:text-base">
              ⏱ {rushSecondsLeft}s
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-3 md:gap-4 text-xs sm:text-sm md:text-base font-mono">
            <div className="flex items-center gap-2 md:gap-2.5 font-bold text-amber-300 truncate">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400 animate-pulse shrink-0" />
              <span className="font-bold text-xs sm:text-sm md:text-base">Fiebre de Cocina:</span>
              <span className="text-white font-black text-xs sm:text-sm md:text-base">{rushCoins} / {config.foodRush.rushHourGoalCoins || 50} 🪙</span>
            </div>
            <div className="w-36 sm:w-56 md:w-72 lg:w-96 h-3 sm:h-3.5 md:h-4.5 rounded-full bg-slate-900 overflow-hidden border border-amber-500/40 shrink-0">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (rushCoins / (config.foodRush.rushHourGoalCoins || 50)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* TOP HEADER: Top 3 Best Customers Widget, Menu Toggle & Live Speed Gauge */}
      <header className="relative z-20 p-3 sm:p-4 md:p-5 lg:p-6 flex items-start justify-between gap-2.5 sm:gap-4 md:gap-6 border-b border-slate-800/60 bg-black/40 backdrop-blur-md">
        {/* Top 3 Clientes del Día Widget */}
        <div className="flex-1 max-w-[280px] sm:max-w-[380px] md:max-w-[460px] lg:max-w-[540px]">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs sm:text-sm md:text-base font-black text-amber-300 mb-1 sm:mb-2">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-400" />
            <span>Top Clientes del Día</span>
          </div>

          {top3.length === 0 ? (
            <div className="text-[10px] sm:text-xs md:text-sm text-slate-400 italic font-mono bg-slate-900/60 px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-lg border border-slate-800">
              ¡Envía una Rosa o Corazón para el #1!
            </div>
          ) : (
            <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
              {top3.map((customer, idx) => (
                <div
                  key={customer.username}
                  className={`flex items-center justify-between text-[11px] sm:text-xs md:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border backdrop-blur-sm ${
                    idx === 0
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-700/20 border-slate-600/50 text-slate-300'
                      : 'bg-amber-900/20 border-amber-800/40 text-amber-400/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 truncate">
                    <span className="font-mono font-bold text-[10px] sm:text-xs md:text-sm">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    {customer.avatarUrl ? (
                      <img
                        src={customer.avatarUrl}
                        alt=""
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full object-cover border border-amber-400/40"
                      />
                    ) : (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-slate-800 text-[8px] sm:text-[9px] md:text-xs flex items-center justify-center font-bold">
                        {customer.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold truncate max-w-[95px] sm:max-w-[160px] md:max-w-[220px] lg:max-w-[280px]">@{customer.username}</span>
                  </div>
                  <span className="font-mono font-extrabold text-[10px] sm:text-xs md:text-sm text-amber-300 tabular-nums">
                    {customer.totalPoints.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Speed / Likes Booster Gauge & Quick Actions */}
        <div className="flex flex-col items-end gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          <div
            className={`px-2 py-1 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border text-[10px] sm:text-xs md:text-sm font-mono font-bold flex items-center gap-1 md:gap-1.5 shadow-sm ${
              speedMultiplier > 1.2
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
          >
            <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${speedMultiplier > 1.2 ? 'text-yellow-300 fill-yellow-300' : 'text-slate-400'}`} />
            <span>
              {speedMultiplier > 1.2 ? `BOOST x${speedMultiplier.toFixed(1)}!` : 'Velocidad x1.0'}
            </span>
          </div>

          {/* Likes Progress */}
          <div className="flex items-center gap-1 md:gap-1.5 text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-mono">
            <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-rose-400" />
            <span>Likes: {likesCount}/{config.foodRush.likesThreshold}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {/* Botón interactivo para saludar / recibir boost de la ratita Remy */}
            <button
              onClick={handleRemyBoost}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-1 bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 hover:text-white transition-colors"
              title="Saludar a Remy y activar boost culinario"
            >
              <span>🐀</span>
              <span className="hidden sm:inline">Remy</span>
            </button>

            {/* Botón para alternar visibilidad de la Carta del Puesto */}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold flex items-center gap-1 transition-colors border ${
                isMenuOpen
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title="Mostrar u ocultar Carta del Puesto en vivo"
            >
              <ScrollText className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              <span>Carta</span>
            </button>

            {/* Sound Toggle Button */}
            <button
              onClick={() => setSoundMuted((m) => !m)}
              className="p-1 sm:p-1.5 md:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 text-[10px] sm:text-xs"
              title={soundMuted ? 'Activar sonido del juego' : 'Silenciar juego'}
            >
              {soundMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* CARTA EN PANTALLA: Pizarra / Menú de Pedidos Flotante */}
      {isMenuOpen && config.foodRush.menuDisplayMode !== 'hidden' && (
        <div className="absolute top-20 sm:top-24 md:top-28 right-3 sm:right-5 md:right-8 z-30 max-w-[280px] sm:max-w-[340px] md:max-w-[420px] animate-in fade-in slide-in-from-top-4 duration-200">
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
        <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 z-40 max-w-[90%] animate-in fade-in zoom-in duration-150">
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-slate-950/90 border border-cyan-400/60 text-xs sm:text-sm text-white shadow-xl flex items-center gap-2 backdrop-blur-md">
            <span className="text-cyan-300 font-bold">💬 @{recentCheer.user}:</span>
            <span className="text-slate-200 truncate font-medium">"{recentCheer.text}"</span>
          </div>
        </div>
      )}

      {/* MIDDLE ZONE: Chef Profesional Realista & Mesa de Preparación Culinaria */}
      <div className="relative flex-1 flex flex-col justify-end items-center px-3 sm:px-4 md:px-6 lg:px-8 pb-2 md:pb-4 z-10 w-full">
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
      <div className="relative z-20 p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md">
        {/* Queue Header & Counter */}
        <div className="flex items-center justify-between text-xs sm:text-sm md:text-base mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 md:gap-2 font-bold text-slate-200">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-cyan-400" />
            <span>Fila de Clientes</span>
            <span className="text-slate-500 font-mono">({orderQueue.length} en espera)</span>
          </div>
          <div className="text-[10px] sm:text-xs md:text-sm text-slate-400 font-mono flex items-center gap-1.5">
            <span>🌹 Flor: Solo Jugo</span>
            <span>·</span>
            <span className="text-amber-300 font-bold">💖 Chaufa VIP</span>
          </div>
        </div>

        {/* Visual Customer Waiting Queue (FIFO cards with avatar and username) */}
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none items-center min-h-[68px] sm:min-h-[82px] md:min-h-[96px] lg:min-h-[108px]">
          {/* Active Serving/Finished order highlight */}
          {completedOrder && (
            <div className="relative shrink-0 flex items-center gap-2 md:gap-3 p-1.5 sm:p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-amber-500/20 border-2 border-amber-400 animate-in zoom-in-90 duration-200 shadow-[0_0_15px_#f59e0b]">
              <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm sm:text-base md:text-lg">
                {completedOrder.dishEmoji}
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-amber-300">¡SERVIDO!</span>
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-white truncate max-w-[80px] sm:max-w-[120px] md:max-w-[160px]">
                  @{completedOrder.username}
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-xs font-mono text-emerald-400 font-bold">
                  +{completedOrder.pointsEarned} pts
                </span>
              </div>
            </div>
          )}

          {/* Cooking Order in front of line */}
          {currentOrder && (
            <div
              className={`relative shrink-0 flex items-center gap-2 md:gap-3 p-1.5 sm:p-2 md:p-2.5 rounded-xl md:rounded-2xl border-2 transition-all ${
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
              <div className="flex flex-col pr-1 min-w-[70px] sm:min-w-[100px] md:min-w-[130px] max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                <div className="flex items-center gap-1 truncate">
                  <span className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate">
                    @{currentOrder.username}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs md:text-sm text-amber-300 font-bold truncate">
                  <span>{currentOrder.dishEmoji}</span>
                  <span className="truncate">{currentOrder.dishName}</span>
                </div>
                <span className="text-[9px] sm:text-[10px] md:text-xs font-mono text-cyan-300 font-semibold">
                  Cocinando...
                </span>
              </div>
            </div>
          )}

          {/* Queued Customers */}
          {orderQueue.length === 0 && !currentOrder && !completedOrder ? (
            <div className="w-full py-2 text-center text-slate-500 text-xs sm:text-sm italic font-mono">
              Esperando pedidos... ¡Manda una Flor o Corazón para pedir!
            </div>
          ) : (
            orderQueue.map((order, idx) => (
              <div
                key={order.id}
                className={`relative shrink-0 flex items-center gap-2 md:gap-2.5 p-1.5 sm:p-2 md:p-2.5 rounded-xl md:rounded-2xl border backdrop-blur-sm ${
                  order.isVip
                    ? 'bg-amber-950/30 border-amber-500/50'
                    : 'bg-slate-900/80 border-slate-700/80'
                }`}
              >
                {/* Position # */}
                <span className="text-[10px] sm:text-xs md:text-sm font-mono font-bold text-slate-400 pl-0.5">
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
                <div className="flex flex-col pr-1 min-w-[60px] sm:min-w-[80px] md:min-w-[110px] max-w-[90px] sm:max-w-[120px] md:max-w-[160px]">
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-200 truncate">
                    @{order.username}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] md:text-xs text-amber-300 font-semibold truncate">
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
