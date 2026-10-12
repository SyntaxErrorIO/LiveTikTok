import React, { useState, useEffect, useRef } from 'react';
import {
  AppSettings,
  AutomationRule,
  OverlayEffect,
  TikTokEvent,
} from '../../types';
import { RuleEngine, EvaluationResult } from '../../services/ruleEngine';
import { tikTokService } from '../../services/tikTokService';
import { apiService, TestSuiteResult } from '../../services/apiService';
import { SimulatorPresetsBar } from './SimulatorPresetsBar';
import { SimulatorControlPanel } from './SimulatorControlPanel';
import { SimulatorTraceList } from './SimulatorTraceList';
import { SimulatorTestReport } from './SimulatorTestReport';

interface SimulatorViewProps {
  rules: AutomationRule[];
  effects: OverlayEffect[];
  settings: AppSettings;
  onRuleExecuted: () => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  rules,
  effects,
  settings,
  onRuleExecuted,
}) => {
  // Custom simulator form state
  const [senderUser, setSenderUser] = useState('carlos_gamer99');
  const [selectedPresetGift, setSelectedPresetGift] = useState('Galaxia');
  const [customDiamonds, setCustomDiamonds] = useState(1000);
  const [repeatStreak, setRepeatStreak] = useState(1);
  const [commentText, setCommentText] = useState('¡Hola streamer! !alerta');
  const [likeQuantity, setLikeQuantity] = useState(25);

  // Auto-streamer bot
  const [isBotRunning, setIsBotRunning] = useState(false);
  const botIntervalRef = useRef<number | null>(null);

  // Local evaluation traces
  const [traces, setTraces] = useState<EvaluationResult[]>([]);

  // Automated Unit Test Suite State
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showTestsModal, setShowTestsModal] = useState(false);

  const giftPresets = [
    { name: 'Rosa', diamonds: 1, icon: '🌹', color: '#f43f5e' },
    { name: 'Café', diamonds: 5, icon: '☕', color: '#d97706' },
    { name: 'Dona', diamonds: 30, icon: '🍩', color: '#ec4899' },
    { name: 'Corazón', diamonds: 100, icon: '💖', color: '#e11d48' },
    { name: 'Galaxia', diamonds: 1000, icon: '🌌', color: '#8b5cf6' },
    { name: 'León', diamonds: 29999, icon: '🦁', color: '#eab308' },
    { name: 'Universo', diamonds: 34999, icon: '🪐', color: '#06b6d4' },
  ];

  const handleSelectGiftPreset = (p: typeof giftPresets[0]) => {
    setSelectedPresetGift(p.name);
    setCustomDiamonds(p.diamonds);
  };

  const dispatchEvent = async (event: TikTokEvent) => {
    // Notify backend engine
    apiService.simulateEvent(event).catch(() => {});

    // Notify local tikTokService and run RuleEngine for instant trace visualizer
    tikTokService.injectManualEvent(event);
    const result = RuleEngine.evaluateEvent(event, rules, effects, settings);

    setTraces((prev) => [result, ...prev].slice(0, 50));
    onRuleExecuted();
  };

  const fireGiftEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'gift',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser.toUpperCase(),
        badgeLevel: 15,
        isFollower: true,
      },
      data: {
        giftName: selectedPresetGift,
        diamondCount: customDiamonds,
        repeatCount: repeatStreak,
      },
    };
    dispatchEvent(event);
  };

  const fireCommentEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'comment',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
        badgeLevel: 5,
        isSubscriber: true,
      },
      data: {
        comment: commentText,
      },
    };
    dispatchEvent(event);
  };

  const fireLikeEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'like',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
      },
      data: {
        likeCount: likeQuantity,
      },
    };
    dispatchEvent(event);
  };

  const fireFollowEvent = () => {
    const event: TikTokEvent = {
      id: 'sim-evt-' + Date.now(),
      type: 'follow',
      source: 'simulation',
      timestamp: Date.now(),
      user: {
        id: 'usr-' + senderUser,
        username: senderUser,
        nickname: senderUser,
        badgeLevel: 1,
      },
      data: {},
    };
    dispatchEvent(event);
  };

  const triggerPresetMock = (preset: 'galaxy' | 'lion' | 'universe' | 'comment_hype') => {
    if (preset === 'galaxy') {
      setSelectedPresetGift('Galaxia');
      setCustomDiamonds(1000);
      setRepeatStreak(1);
      dispatchEvent({
        id: 'sim-gal-' + Date.now(),
        type: 'gift',
        source: 'simulation',
        timestamp: Date.now(),
        user: { id: 'usr-vip-99', username: 'patrocinador_pro', nickname: 'Patrocinador Pro', badgeLevel: 25 },
        data: { giftName: 'Galaxia', diamondCount: 1000, repeatCount: 1 },
      });
    } else if (preset === 'lion') {
      setSelectedPresetGift('León');
      setCustomDiamonds(29999);
      setRepeatStreak(1);
      dispatchEvent({
        id: 'sim-lion-' + Date.now(),
        type: 'gift',
        source: 'simulation',
        timestamp: Date.now(),
        user: { id: 'usr-whale-1', username: 'mega_donador', nickname: 'Mega Donador', badgeLevel: 45 },
        data: { giftName: 'León', diamondCount: 29999, repeatCount: 1 },
      });
    } else if (preset === 'universe') {
      setSelectedPresetGift('Universo');
      setCustomDiamonds(34999);
      setRepeatStreak(1);
      dispatchEvent({
        id: 'sim-univ-' + Date.now(),
        type: 'gift',
        source: 'simulation',
        timestamp: Date.now(),
        user: { id: 'usr-whale-2', username: 'rey_del_directo', nickname: 'Rey del Directo', badgeLevel: 50 },
        data: { giftName: 'Universo', diamondCount: 34999, repeatCount: 1 },
      });
    } else if (preset === 'comment_hype') {
      setCommentText('!alerta streamers unidos');
      dispatchEvent({
        id: 'sim-com-' + Date.now(),
        type: 'comment',
        source: 'simulation',
        timestamp: Date.now(),
        user: { id: 'usr-fan-1', username: 'fan_tiktok', nickname: 'Fan TikTok' },
        data: { comment: '!alerta streamers unidos' },
      });
    }
  };

  const handleSimulateDisconnect = async () => {
    await apiService.simulateProviderDisconnect('Simulación manual de corte de conexión desde el banco de pruebas');
  };

  const handleRunUnitTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await apiService.runAutomatedTests();
      setTestResults(res);
      setShowTestsModal(true);
    } catch {
      alert('Error ejecutando las pruebas del motor.');
    } finally {
      setIsRunningTests(false);
    }
  };

  const toggleBot = () => {
    if (isBotRunning) {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
      setIsBotRunning(false);
    } else {
      setIsBotRunning(true);
      botIntervalRef.current = window.setInterval(() => {
        const rand = Math.random();
        if (rand < 0.5) fireLikeEvent();
        else if (rand < 0.8) fireCommentEvent();
        else fireGiftEvent();
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Presets Bar */}
      <SimulatorPresetsBar
        onTriggerPreset={triggerPresetMock}
        onSimulateDisconnect={handleSimulateDisconnect}
        onRunUnitTests={handleRunUnitTests}
        isRunningTests={isRunningTests}
        isBotRunning={isBotRunning}
        onToggleBot={toggleBot}
      />

      {/* Unit Test Results Modal / Drawer */}
      <SimulatorTestReport
        isOpen={showTestsModal}
        onClose={() => setShowTestsModal(false)}
        testResults={testResults}
      />

      {/* Main Workbench Layout: Left Controls (5 cols) & Right Trace Log (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <SimulatorControlPanel
            senderUser={senderUser}
            setSenderUser={setSenderUser}
            giftPresets={giftPresets}
            selectedPresetGift={selectedPresetGift}
            onSelectGiftPreset={handleSelectGiftPreset}
            customDiamonds={customDiamonds}
            setCustomDiamonds={setCustomDiamonds}
            repeatStreak={repeatStreak}
            setRepeatStreak={setRepeatStreak}
            onFireGift={fireGiftEvent}
            commentText={commentText}
            setCommentText={setCommentText}
            onFireComment={fireCommentEvent}
            onFireLike={fireLikeEvent}
            onFireFollow={fireFollowEvent}
          />
        </div>

        <SimulatorTraceList
          traces={traces}
          onClearTraces={() => setTraces([])}
        />
      </div>
    </div>
  );
};
