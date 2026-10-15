import React, { useState, useEffect } from 'react';
import { FoodOrder } from '../types';
import { foodAudio } from './foodAudio';
import { KitchenParticleCanvas } from './KitchenParticleCanvas';
import { CustomerAvatar } from '../common/CustomerAvatar';

export interface RealisticChefStationProps {
  isCooking: boolean;
  isVipFlame: boolean;
  isServing: boolean;
  cookProgress: number;
  currentDish?: FoodOrder | null;
  speedMultiplier: number;
  isRushHour?: boolean;
  isFireEmergency?: boolean;
  extinguishProgress?: number;
  onRemyClick?: () => void;
}

/**
 * Cocina de Chef Gourmet con Linguini y la Ratita Remy ("El Pequeño Chef").
 * Fusión exacta de las 3 referencias visuales:
 * - Imagen 1: Estanterías con cuencos de colores, tetera de cobre, gran olla azul hirviendo en el fogón
 *   con tapa levantada y caldo aromático, tabla de cortar con ajos, zanahorias, cebollinos y cuenco de huevos.
 * - Imagen 2: Cocina profesional gourmet, azulejos limpios, estantería con platos blancos, campana cloche de plata,
 *   ingredientes preparados (berenjena, tomate, pepino) y barra de utensilios colgados.
 * - Imagen 3: Personaje Linguini (joven chef de pelo rojizo rizado, ojos vivaces, gorro toque blanco alto tradicional,
 *   chaqueta blanca cruzada de alta cocina y pañuelo azul al cuello) junto a la pequeña ratita Remy.
 *
 * Funciones activas de la ratita Remy:
 * 1. "Sous-Chef bajo el gorro / Dirección culinaria": Tira de los mechones de pelo rojizo guiando a Linguini al cocinar.
 * 2. "Sazonado Maestro": Espolvorea ramitas de romero y polvito dorado al superar el 50% de cocción.
 * 3. "Brigada Extintora": En emergencias de fuego corre con agua para ayudar a extinguir las llamas con cada Like/bebida.
 * 4. "Presentación Cloche": Abre la campana de plata al servir la orden o platos VIP con destellos y estrellas.
 * 5. "Interactividad por Toque/Clic": Al hacer clic sobre Remy realiza una reverencia, degusta queso 🧀,
 *    emite un sonido simpático y otorga un boost temporal de velocidad culinaria.
 */
export const RealisticChefStation: React.FC<RealisticChefStationProps> = ({
  isCooking,
  isVipFlame,
  isServing,
  cookProgress,
  currentDish,
  speedMultiplier,
  isRushHour = false,
  isFireEmergency = false,
  extinguishProgress = 0,
  onRemyClick,
}) => {
  // Estado de interactividad con Remy
  const [remySpeech, setRemySpeech] = useState<string | null>(null);
  const [remyTrickAnimation, setRemyTrickAnimation] = useState<string | null>(null);
  const [cheerHearts, setCheerHearts] = useState<{ id: number; x: number }[]>([]);

  // Disparar acción interactiva al hacer clic en Remy
  const handleRemyInteraction = () => {
    foodAudio.playRemySqueak();

    // Mensajes divertidos y motivadores de la ratita chef
    const phrases = [
      '¡Un toque más de romero! 🌿',
      '¡C\'est délicieux! 🧀✨',
      '¡Revolviendo a máxima velocidad! 👨‍🍳',
      '¡Gran trabajo equipo! 🐀💫',
      '¡Cuidado con la sal! 🧂',
      '¡Ratatouille especial en camino! 🍲',
    ];
    const chosen = phrases[Math.floor(Math.random() * phrases.length)];
    setRemySpeech(chosen);

    // Animación de truco
    const tricks = ['cheese', 'bow', 'jump'];
    const chosenTrick = tricks[Math.floor(Math.random() * tricks.length)];
    setRemyTrickAnimation(chosenTrick);

    // Corazones / chispas flotantes
    const newHearts = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      x: 35 + Math.random() * 30,
    }));
    setCheerHearts(newHearts);

    if (onRemyClick) {
      onRemyClick();
    }

    setTimeout(() => {
      setRemySpeech(null);
      setRemyTrickAnimation(null);
    }, 2800);
  };

  // Reacciones automáticas de Remy según eventos de juego
  useEffect(() => {
    if (isFireEmergency) {
      setRemySpeech('¡Rápido, traigan agua y Likes! 🚨💧');
      const t = setTimeout(() => setRemySpeech(null), 3000);
      return () => clearTimeout(t);
    } else if (isRushHour) {
      setRemySpeech('¡FIEBRE DORADA! ¡Doble sazón! ✨');
      const t = setTimeout(() => setRemySpeech(null), 3000);
      return () => clearTimeout(t);
    } else if (isServing) {
      setRemySpeech('¡Voilà! ¡Servido a la perfección! 🍽️');
      const t = setTimeout(() => setRemySpeech(null), 3000);
      return () => clearTimeout(t);
    }
  }, [isFireEmergency, isRushHour, isServing]);

  // Determinar función activa actual de Remy para el badge
  const remyCurrentRole = isFireEmergency
    ? '🚨 Brigada Extintora en Acción'
    : isServing
    ? '✨ Presentando Plato con Cloche'
    : isCooking && cookProgress >= 50
    ? '🌿 Sazonando Caldo con Romero'
    : isCooking
    ? '👨‍🍳 Guiando bajo el Gorro de Chef'
    : '🧀 En Reposo · Degustando Queso';

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* ============================================================== */}
      {/* 1. ILUMINACIÓN AMBIENTAL DE COCINA Y RESPLANDOR DEL FOGÓN       */}
      {/* ============================================================== */}
      <div className="absolute -top-16 inset-x-0 h-52 pointer-events-none flex justify-center">
        {/* Foco de luz cálida de cocina de restaurante */}
        <div className="w-80 h-48 bg-gradient-to-b from-amber-400/20 via-orange-500/10 to-transparent blur-3xl" />
        {/* Resplandor del fuego del fogón */}
        {isCooking && (
          <div
            className={`absolute bottom-0 w-88 h-36 rounded-full blur-2xl transition-all duration-200 ${
              isVipFlame
                ? 'bg-gradient-to-t from-red-600/60 via-amber-500/50 to-yellow-300/30 animate-pulse'
                : 'bg-gradient-to-t from-blue-600/30 via-amber-500/25 to-transparent'
            }`}
          />
        )}
      </div>

      {/* Sistema de Partículas Liviano Acelerado por GPU para Vapor, Chispas y Llamas */}
      <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none z-30">
        <KitchenParticleCanvas
          isCooking={isCooking}
          isVipFlame={isVipFlame}
          isRushHour={isRushHour}
          isFireEmergency={isFireEmergency}
          isServing={isServing}
          className="w-72 h-44"
        />
      </div>

      {/* ============================================================== */}
      {/* 2. FIEBRE DORADA / RUSH HOUR AURA                             */}
      {/* ============================================================== */}
      {isRushHour && (
        <div className="absolute -top-24 inset-x-0 flex flex-col items-center pointer-events-none z-30">
          <div className="px-3.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 border-2 border-white text-slate-950 font-black text-xs tracking-wider shadow-[0_0_24px_#facc15] animate-bounce flex items-center gap-1.5">
            <span>✨ FIEBRE DORADA DE CHEF · PUNTOS X2 ✨</span>
          </div>
          <div className="w-88 h-40 bg-gradient-to-t from-yellow-400/40 via-amber-500/25 to-transparent blur-2xl rounded-full" />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. EVENTO DE SABOTAJE: ¡COCINA EN LLAMAS!                       */}
      {/* ============================================================== */}
      {isFireEmergency && (
        <div className="absolute -top-36 inset-x-2 z-40 flex flex-col items-center animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm p-3 rounded-2xl bg-black/95 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.9)] backdrop-blur-xl flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-red-400 font-black text-xs uppercase animate-pulse">
              <span className="text-xl">🚨</span>
              <span>¡EMERGENCIA: FUEGO EN LA COCINA!</span>
              <span className="text-xl">🚨</span>
            </div>
            <p className="text-[11px] text-slate-200 text-center font-medium">
              ¡Remy y Linguini necesitan ayuda! Envíen <span className="text-cyan-300 font-bold">Likes</span> o regalos de <span className="text-cyan-300 font-bold">Bebida / Jugo</span> para apagar el fuego.
            </p>
            {/* Barra de extinción */}
            <div className="w-full h-3 rounded-full bg-slate-900 border border-cyan-500/60 overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-teal-300 transition-all duration-150 rounded-full"
                style={{ width: `${Math.min(100, (extinguishProgress / 30) * 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white drop-shadow">
                {Math.round((extinguishProgress / 30) * 100)}% Extinguido
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. GLOBO DE DIÁLOGO DE LA RATITA REMY                           */}
      {/* ============================================================== */}
      {remySpeech && (
        <div className="absolute -top-20 z-40 animate-in fade-in zoom-in-90 duration-150 pointer-events-none">
          <div className="relative px-3 py-1.5 rounded-2xl bg-white text-slate-900 border-2 border-amber-400 shadow-[0_8px_20px_rgba(0,0,0,0.5)] flex items-center gap-1.5 font-bold text-xs">
            <span className="text-sm">🐀</span>
            <span>{remySpeech}</span>
            {/* Triángulo inferior del bocadillo de cómic */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
          </div>
        </div>
      )}

      {/* Chispitas y corazones al interactuar con Remy */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {cheerHearts.map((h) => (
          <span
            key={h.id}
            className="absolute bottom-28 text-base animate-bounce duration-700"
            style={{ left: `${h.x}%` }}
          >
            🧀✨
          </span>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 5. PERSONAJE LINGUINI Y RATITA REMY (Ilustración Vectorial SVG)  */}
      {/* ============================================================== */}
      <div
        className={`relative z-10 transition-transform duration-200 ${
          isVipFlame
            ? 'scale-[1.04] translate-y-[-2px]'
            : isCooking
            ? 'translate-y-[-2px] rotate-[-0.6deg]'
            : isServing
            ? 'scale-[1.02] translate-y-[-3px]'
            : 'translate-y-0'
        }`}
      >
        <svg
          viewBox="0 0 280 290"
          className="w-64 h-68 sm:w-72 sm:h-76 filter drop-shadow-[0_16px_30px_rgba(0,0,0,0.85)]"
        >
          <defs>
            {/* Piel cálida con volumen de Linguini */}
            <radialGradient id="linguiniSkin" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#ffecd6" />
              <stop offset="50%" stopColor="#f7caa4" />
              <stop offset="85%" stopColor="#e29f6d" />
              <stop offset="100%" stopColor="#bf733e" />
            </radialGradient>
            {/* Piel brazos */}
            <linearGradient id="linguiniArms" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffecd6" />
              <stop offset="60%" stopColor="#f7caa4" />
              <stop offset="100%" stopColor="#cb7e4c" />
            </linearGradient>

            {/* Cabello rizado pelirrojo / castaño rojizo de Linguini (Imagen 3) */}
            <linearGradient id="redHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="40%" stopColor="#c2410c" />
              <stop offset="80%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>

            {/* Chaqueta blanca inmaculada de chef con sombras de tela */}
            <linearGradient id="whiteChefCoat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f8fafc" />
              <stop offset="90%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Olla azul esmaltada (Idéntica a la Imagen 1) */}
            <linearGradient id="bluePotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="90%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Caldo aromático burbujeante */}
            <radialGradient id="soupBrothGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            {/* Pelaje azul-grisáceo de la ratita Remy */}
            <linearGradient id="remyFurGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="90%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Orejitas y hocico rosado de Remy */}
            <radialGradient id="remyPink" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="70%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#db2777" />
            </radialGradient>

            {/* Acero inoxidable para utensilios y campana cloche */}
            <linearGradient id="silverClocheGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="30%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="85%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <filter id="chefGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Sombra de base bajo el chef */}
          <ellipse cx="140" cy="275" rx="85" ry="12" fill="#000000" opacity="0.6" filter="blur(6px)" />

          {/* ============================================================== */}
          {/* A. CUERPO Y UNIFORME BLANCO DE CHEF DE ALTA COCINA (Linguini)   */}
          {/* ============================================================== */}
          <g filter="url(#chefGlow)">
            {/* Chaqueta de Chef Blanca Cruzada con pliegues realistas */}
            <path
              d="M92 140 L188 140 L204 270 L76 270 Z"
              fill="url(#whiteChefCoat)"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            {/* Doble botonadura clásica francesa con botones de nudo de tela */}
            <g fill="#94a3b8">
              {/* Fila izquierda */}
              <circle cx="120" cy="162" r="3" />
              <circle cx="120" cy="186" r="3" />
              <circle cx="120" cy="210" r="3" />
              {/* Fila derecha */}
              <circle cx="152" cy="162" r="3" />
              <circle cx="152" cy="186" r="3" />
              <circle cx="152" cy="210" r="3" />
            </g>
            {/* Solapa cruzada del uniforme */}
            <path d="M142 140 L158 240" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />

            {/* Pañuelo / Foulard azul marino al cuello (Imagen 1 y 3) */}
            <path
              d="M122 136 C124 130, 156 130, 158 136 L164 148 L116 148 Z"
              fill="#1e3a8a"
              stroke="#172554"
              strokeWidth="1"
            />
            {/* Nudo decorativo del pañuelo azul marino */}
            <circle cx="140" cy="144" r="3.5" fill="#2563eb" />
            <path d="M140 146 L134 156 L140 154 L146 156 Z" fill="#1d4ed8" />
          </g>

          {/* ============================================================== */}
          {/* B. CUELLO, ROSTRO Y CABELLO PELIRROJO RIZADO (Linguini)         */}
          {/* ============================================================== */}
          {/* Cuello esbelto */}
          <path d="M128 122 L152 122 L154 138 L126 138 Z" fill="url(#linguiniSkin)" />
          <path d="M128 122 C136 128, 144 128, 152 122 L154 127 L126 127 Z" fill="#c2410c" opacity="0.4" />

          {/* Forma del rostro de Linguini: mandíbula alargada y simpática */}
          <path
            d="M118 78 C114 88, 114 102, 122 116 C128 126, 134 128, 140 128 C146 128, 152 126, 158 116 C166 102, 166 88, 162 78 C158 66, 122 66, 118 78 Z"
            fill="url(#linguiniSkin)"
            stroke="#c2410c"
            strokeWidth="1"
          />

          {/* Orejas expresivas */}
          <path d="M116 88 C110 88, 110 102, 116 104 Z" fill="#f7caa4" stroke="#c2410c" strokeWidth="1" />
          <path d="M164 88 C170 88, 170 102, 164 104 Z" fill="#f7caa4" stroke="#c2410c" strokeWidth="1" />

          {/* Cabello rizado pelirrojo voluminoso a los costados y frente (Imagen 3) */}
          <g fill="url(#redHairGrad)">
            {/* Rizos lado izquierdo */}
            <circle cx="114" cy="74" r="8" />
            <circle cx="110" cy="84" r="7" />
            <circle cx="112" cy="94" r="6" />
            {/* Rizos lado derecho */}
            <circle cx="166" cy="74" r="8" />
            <circle cx="170" cy="84" r="7" />
            <circle cx="168" cy="94" r="6" />
            {/* Mechones frontales rizados desordenados */}
            <path d="M116 70 C122 62, 134 66, 130 76 C136 64, 150 64, 148 74 C152 66, 164 68, 160 76 Z" />
          </g>

          {/* Pecas encantadoras en las mejillas de Linguini (Imagen 3) */}
          <g fill="#c2410c" opacity="0.65">
            <circle cx="126" cy="98" r="0.8" />
            <circle cx="129" cy="99" r="0.8" />
            <circle cx="127" cy="101" r="0.8" />
            <circle cx="151" cy="98" r="0.8" />
            <circle cx="154" cy="99" r="0.8" />
            <circle cx="152" cy="101" r="0.8" />
          </g>

          {/* Ojos grandes, vivaces y expresivos de Linguini (Imagen 3) */}
          <g>
            {/* Ojo izquierdo */}
            <ellipse cx="128" cy="88" rx="5.5" ry="4" fill="#ffffff" stroke="#c2410c" strokeWidth="0.8" />
            <circle cx="128" cy="88.5" r="3" fill="#5c2c16" />
            <circle cx="129" cy="87.5" r="1.2" fill="#ffffff" />
            {/* Ceja izquierda arqueada expresiva */}
            <path
              d="M122 81 Q128 77 134 81"
              stroke="#9a3412"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />

            {/* Ojo derecho */}
            <ellipse cx="152" cy="88" rx="5.5" ry="4" fill="#ffffff" stroke="#c2410c" strokeWidth="0.8" />
            <circle cx="152" cy="88.5" r="3" fill="#5c2c16" />
            <circle cx="153" cy="87.5" r="1.2" fill="#ffffff" />
            {/* Ceja derecha */}
            <path
              d="M146 81 Q152 77 158 81"
              stroke="#9a3412"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />

            {/* Nariz característica de Linguini (ligeramente curvada y simpática) */}
            <path
              d="M140 82 L138 96 Q140 100 144 98"
              stroke="#c2410c"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Sonrisa cálida y entusiasta */}
            <path
              d="M132 108 Q140 116 148 108"
              stroke="#9a3412"
              strokeWidth="2"
              fill="#ffffff"
              strokeLinecap="round"
            />
          </g>

          {/* ============================================================== */}
          {/* C. ALTO GORRO DE CHEF BLANCO TRADICIONAL (Toque Blanche)        */}
          {/* ============================================================== */}
          <g className={`transition-transform duration-150 ${isCooking ? 'animate-pulse' : ''}`}>
            {/* Base / Banda del gorro */}
            <rect x="114" y="62" width="52" height="12" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Alto cuerpo abombado y plisado tradicional francés */}
            <path
              d="M116 62 C108 30, 114 8, 140 8 C166 8, 172 30, 164 62 Z"
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {/* Pliegues verticales del gorro */}
            <path d="M128 20 Q130 42 126 62" stroke="#e2e8f0" strokeWidth="2" fill="none" />
            <path d="M140 12 Q140 38 140 62" stroke="#e2e8f0" strokeWidth="2" fill="none" />
            <path d="M152 20 Q150 42 154 62" stroke="#e2e8f0" strokeWidth="2" fill="none" />
          </g>

          {/* ============================================================== */}
          {/* D. LA RATITA REMY ("Y ESA RATA QUE REALIZA ALGUNAS FUNCIONES")  */}
          {/* ============================================================== */}
          {/* Remy interactivo: responde a eventos de cocción, fuego y clic */}
          <g
            id="interactive-remy"
            className="cursor-pointer transition-transform duration-200"
            onClick={handleRemyInteraction}
          >
            {/* Posición de Remy:
                - Cuando cocina: Asomándose bajo el gorro tirando de los mechones de pelo rojizo!
                - Cuando hay fuego: Bajando en alerta a la mesa.
                - En reposo: Asomado con simpatía saludando al público.
            */}
            <g
              transform={
                isFireEmergency
                  ? 'translate(196, 170) scale(1.15)'
                  : isCooking
                  ? 'translate(126, 32) scale(1.05)'
                  : 'translate(150, 40) scale(1.0)'
              }
            >
              {/* Resplandor interactivo de toque */}
              <circle cx="14" cy="16" r="18" fill="#38bdf8" opacity="0.15" className="animate-ping" />

              {/* Colita curva rosada de Remy */}
              <path
                d="M4 22 C-4 28, -6 18, -10 24"
                stroke="#f472b6"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />

              {/* Cuerpo de la ratita */}
              <ellipse cx="14" cy="18" rx="10" ry="8" fill="url(#remyFurGrad)" stroke="#334155" strokeWidth="0.8" />

              {/* Orejita izquierda grande y rosada */}
              <ellipse cx="8" cy="8" rx="4.5" ry="6" fill="url(#remyPink)" stroke="#475569" strokeWidth="0.8" />
              {/* Orejita derecha */}
              <ellipse cx="20" cy="8" rx="4.5" ry="6" fill="url(#remyPink)" stroke="#475569" strokeWidth="0.8" />

              {/* Cabecita simpática de Remy */}
              <circle cx="14" cy="14" r="7.5" fill="url(#remyFurGrad)" />

              {/* Ojitos negros vivaces y brillantes */}
              <ellipse cx="11.5" cy="13" rx="1.5" ry="2" fill="#0f172a" />
              <circle cx="12" cy="12.5" r="0.6" fill="#ffffff" />
              <ellipse cx="16.5" cy="13" rx="1.5" ry="2" fill="#0f172a" />
              <circle cx="17" cy="12.5" r="0.6" fill="#ffffff" />

              {/* Hocico y naricita rosada tierna */}
              <ellipse cx="14" cy="17" rx="3" ry="2" fill="#fbcfe8" />
              <circle cx="14" cy="16.5" r="1.2" fill="#db2777" />

              {/* Bigotitos finos */}
              <line x1="10" y1="17" x2="4" y2="16" stroke="#cbd5e1" strokeWidth="0.6" />
              <line x1="10" y1="18" x2="4" y2="19" stroke="#cbd5e1" strokeWidth="0.6" />
              <line x1="18" y1="17" x2="24" y2="16" stroke="#cbd5e1" strokeWidth="0.6" />
              <line x1="18" y1="18" x2="24" y2="19" stroke="#cbd5e1" strokeWidth="0.6" />

              {/* Patitas delanteras sujetando mechones de pelo rojizo al cocinar */}
              {isCooking ? (
                <g>
                  {/* Patita izquierda tirando mechón */}
                  <ellipse cx="9" cy="20" rx="2" ry="1.5" fill="#fbcfe8" />
                  <path d="M9 20 L-2 36" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Patita derecha tirando mechón */}
                  <ellipse cx="19" cy="20" rx="2" ry="1.5" fill="#fbcfe8" />
                  <path d="M19 20 L30 36" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Sazonador de romero si cookProgress >= 50 */}
                  {cookProgress >= 50 && (
                    <g transform="translate(18, 12)">
                      <line x1="0" y1="0" x2="8" y2="-6" stroke="#15803d" strokeWidth="1.8" />
                      <circle cx="8" cy="-6" r="1.5" fill="#4ade80" />
                      <circle cx="5" cy="-3" r="1.2" fill="#86efac" />
                      {/* Chispas doradas de sazón */}
                      <circle cx="10" cy="-2" r="1" fill="#facc15" className="animate-ping" />
                    </g>
                  )}
                </g>
              ) : (
                /* En reposo: sosteniendo un delicioso trozo de queso suizo 🧀 */
                <g>
                  <ellipse cx="12" cy="21" rx="1.8" ry="1.2" fill="#fbcfe8" />
                  <ellipse cx="16" cy="21" rx="1.8" ry="1.2" fill="#fbcfe8" />
                  <polygon points="11,20 17,20 14,26" fill="#facc15" stroke="#eab308" strokeWidth="0.5" />
                  <circle cx="14" cy="22" r="0.8" fill="#ca8a04" />
                </g>
              )}
            </g>
          </g>

          {/* ============================================================== */}
          {/* E. BRAZOS ANIMADOS: REVOLVIENDO LA OLLA Y SOSTENIENDO LA TAPA   */}
          {/* ============================================================== */}
          {/* Brazo Izquierdo: Sostiene la tapa azul levantada (Imagen 1) */}
          <g
            className={`transition-transform duration-200 origin-[100px_144px] ${
              isCooking ? 'rotate-[-6deg]' : ''
            }`}
          >
            {/* Manga blanca remangada */}
            <path d="M96 142 L80 168 L94 174 L106 148 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
            {/* Antebrazo con piel */}
            <path d="M82 168 L68 206 L78 210 L92 174 Z" fill="url(#linguiniArms)" />
            {/* Mano sujetando el asa de la tapa */}
            <circle cx="72" cy="212" r="6.5" fill="url(#linguiniSkin)" />

            {/* TAPA AZUL ELEVADA DE LA OLLA (Idéntica a la Imagen 1) */}
            <g transform="translate(46, 196) rotate(-22)">
              <ellipse cx="32" cy="14" rx="28" ry="7" fill="url(#bluePotGrad)" stroke="#1e40af" strokeWidth="1.5" />
              {/* Pomo redondo superior de la tapa */}
              <circle cx="32" cy="7" r="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
            </g>
          </g>

          {/* Brazo Derecho: Cucharón dentro de la olla grande (Imagen 1) */}
          <g
            className={`transition-transform duration-150 origin-[180px_144px] ${
              isCooking ? 'rotate-[12deg] translate-y-[-4px]' : ''
            }`}
          >
            {/* Manga blanca remangada derecha */}
            <path d="M184 142 L198 168 L186 174 L174 148 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
            {/* Antebrazo derecho */}
            <path d="M196 168 L206 206 L196 210 L184 174 Z" fill="url(#linguiniArms)" />
            {/* Mano que empuña el cucharón */}
            <circle cx="202" cy="210" r="6.5" fill="url(#linguiniSkin)" />
            {/* Mango del cucharón de madera / acero */}
            <line x1="202" y1="210" x2="164" y2="242" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
            {/* Pala del cucharón sumergida en el caldo */}
            <ellipse cx="162" cy="244" rx="6" ry="4" fill="#b45309" />
          </g>

          {/* ============================================================== */}
          {/* F. GRAN OLLA AZUL ESMALTADA EN EL FOGÓN (De la Imagen 1)        */}
          {/* ============================================================== */}
          <g transform="translate(90, 216)">
            {/* Asas laterales de la olla azul */}
            <path d="M-8 14 C-14 14, -14 28, -8 28" stroke="#1d4ed8" strokeWidth="3" fill="none" />
            <path d="M108 14 C114 14, 114 28, 108 28" stroke="#1d4ed8" strokeWidth="3" fill="none" />

            {/* Cuerpo de la gran olla azul esmaltada */}
            <path
              d="M0 10 L100 10 L94 62 C92 68, 8 68, 6 62 Z"
              fill="url(#bluePotGrad)"
              stroke="#1e3a8a"
              strokeWidth="2"
            />
            {/* Reborde superior de la olla */}
            <ellipse cx="50" cy="10" rx="50" ry="10" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />

            {/* Caldo burbujeante dentro de la olla con ingredientes visibles (Imagen 1) */}
            <ellipse cx="50" cy="10" rx="44" ry="7.5" fill="url(#soupBrothGrad)" />
            {/* Rodajitas de verduras y especias flotando en el caldo */}
            <circle cx="34" cy="9" r="2.2" fill="#22c55e" />
            <circle cx="62" cy="11" r="2.5" fill="#f97316" />
            <circle cx="48" cy="8" r="1.8" fill="#fef08a" />
            <circle cx="72" cy="9" r="2" fill="#ef4444" />
            <circle cx="26" cy="11" r="1.6" fill="#facc15" />

            {/* FOGÓN DE GAS CON LLAMA VIVA EN LA BASE (Imagen 1) */}
            <g transform="translate(10, 64)">
              <ellipse cx="40" cy="6" rx="42" ry="5" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
              {/* Llamas de gas (azules/doradas) */}
              {isCooking && (
                <g fill={isVipFlame ? '#ef4444' : '#38bdf8'} className="animate-pulse">
                  <polygon points="15,4 18,-4 21,4" />
                  <polygon points="28,4 32,-6 36,4" />
                  <polygon points="44,4 48,-7 52,4" />
                  <polygon points="58,4 62,-5 66,4" />
                </g>
              )}
            </g>
          </g>

          {/* ============================================================== */}
          {/* G. VAPOR ASCENDENTE DEL GUISO Y CALDO (Imagen 1)                */}
          {/* ============================================================== */}
          {isCooking && (
            <g className="animate-pulse pointer-events-none">
              <path
                d="M130 205 Q124 180 134 165"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
              />
              <path
                d="M145 200 Q152 175 142 155"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M160 208 Q168 185 158 170"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
              />
            </g>
          )}
        </svg>
      </div>

      {/* ============================================================== */}
      {/* 6. MESA DE PREPARACIÓN GOURMET (Detalles de Imágenes 1 y 2)     */}
      {/* Acero inoxidable, tabla de corte con ajos, zanahorias y campana */}
      {/* ============================================================== */}
      <div className="relative w-full z-20 -mt-10">
        {/* Superficie de la Mesa Gourmet de Trabajo */}
        <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-gradient-to-b from-[#252a36] via-[#1a1e29] to-[#0f121a] shadow-[0_16px_36px_rgba(0,0,0,0.95)]">
          {/* Brillo biselado del borde de acero inoxidable */}
          <div className="h-1 w-full bg-gradient-to-r from-slate-500 via-slate-200 to-slate-500 opacity-80" />

          {/* BANDEJA DE PREPARACIÓN CULINARIA EN VIVO (Mise en Place) */}
          <div className="p-3 sm:p-4 grid grid-cols-12 gap-2 sm:gap-3 items-center">
            {/* SECTOR 1 (IZQUIERDO): Tabla de corte con ajos, zanahorias, cebollinos y huevos (Imagen 1) */}
            <div className="col-span-4 flex flex-col gap-1.5">
              <div className="text-[10px] font-black text-amber-300 font-mono tracking-wider flex items-center justify-between">
                <span>🔪 PREP DE MESA</span>
                <span className="text-[8px] text-slate-400">Mise en place</span>
              </div>

              {/* Tabla de picar de madera de olivo con ingredientes frescos */}
              <div className="relative h-20 sm:h-22 rounded-xl bg-gradient-to-r from-[#6b4226] via-[#855230] to-[#5a361e] p-2 border border-[#a86e42] shadow-inner flex flex-col justify-between overflow-hidden">
                {/* Vetas de madera realista */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(90deg,_transparent,_transparent_8px,_rgba(0,0,0,0.4)_9px)]" />

                {/* Ingredientes frescos sobre la tabla (Imagen 1 y 2) */}
                <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
                  {/* Diente de ajo pelado blanco (Imagen 1) */}
                  <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300 shadow-sm inline-block" title="Ajo fresco" />
                  {/* Rodajas de zanahoria naranja vivo (Imagen 1) */}
                  <div className="flex gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-amber-300" title="Zanahoria" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600 border border-amber-300" />
                  </div>
                  {/* Cebollinos verdes picados (Imagen 1) */}
                  <div className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                    <span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" />
                  </div>
                  {/* Berenjena y tomate fresco (Imagen 2) */}
                  <span className="w-3.5 h-2.5 rounded-full bg-purple-900 border border-purple-700" title="Berenjena" />
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-400" title="Tomate" />
                </div>

                {/* Cuchillo de Chef profesional apoyado sobre la tabla */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-10 sm:w-14 h-3 bg-gradient-to-r from-slate-200 via-white to-slate-400 rounded-l-sm shadow-md border-r-2 border-slate-900" />
                    <div className="w-4 h-2 bg-black rounded-r-sm" />
                  </div>
                  {/* Cuenco pequeño con huevos frescos (Imagen 1) */}
                  <div className="flex items-center gap-0.5 bg-rose-900/60 px-1 py-0.5 rounded border border-rose-700">
                    <span className="w-2 h-2.5 rounded-full bg-amber-100" />
                    <span className="w-2 h-2.5 rounded-full bg-amber-200" />
                  </div>
                </div>
              </div>

              {/* Botellas de aceite y condimentos de cocina */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="w-4 h-7 rounded-t-md bg-gradient-to-b from-emerald-800 to-black border border-emerald-600 flex flex-col items-center shadow-sm" title="Aceite de Oliva Virgen">
                  <div className="w-1 h-2 bg-slate-200 rounded-t-xs -mt-1" />
                </div>
                <div className="w-4 h-6 rounded-t-md bg-gradient-to-b from-rose-900 to-black border border-rose-800 flex flex-col items-center shadow-sm" title="Vinagre Balsámico">
                  <div className="w-1 h-2 bg-amber-200 rounded-t-xs -mt-1" />
                </div>
                <div className="w-5 h-4 rounded-md bg-slate-300 border border-slate-400 shadow-sm" title="Sal Marina" />
                <div className="w-5 h-4 rounded-md bg-amber-900 border border-amber-700 shadow-sm" title="Pimienta Negra" />
              </div>
            </div>

            {/* SECTOR 2 (CENTRAL): Comanda activa del espectador y progreso de cocción */}
            <div className="col-span-5 flex flex-col items-center justify-center px-1">
              {currentDish ? (
                <div className="w-full flex flex-col items-center gap-2">
                  {/* Ticket comanda con avatar del espectador */}
                  <div className="w-full p-2 rounded-xl bg-slate-950/90 border border-amber-500/50 backdrop-blur-md shadow-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CustomerAvatar
                        avatarUrl={currentDish.avatarUrl}
                        username={currentDish.username}
                        size="sm"
                        isVip={currentDish.isVip}
                      />

                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-extrabold text-white truncate">
                          @{currentDish.username}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold truncate">
                          <span>{currentDish.dishEmoji}</span>
                          <span className="truncate">{currentDish.dishName}</span>
                        </div>
                      </div>
                    </div>

                    {currentDish.isVip && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600/30 border border-red-500/80 text-[8px] font-black text-red-300 shrink-0">
                        VIP
                      </span>
                    )}
                  </div>

                  {/* Barra de progreso de preparación culinaria */}
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                      <span className="flex items-center gap-1 text-cyan-300 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        Cocinando en olla gourmet...
                      </span>
                      <span className="text-amber-400 font-bold">{Math.round(currentDish.cookProgress)}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-700/80 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-100 rounded-full ${
                          currentDish.isVip
                            ? 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_#f59e0b]'
                            : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300'
                        }`}
                        style={{ width: `${currentDish.cookProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Estado en reposo: Caldo listo a fuego lento */
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-black mb-1 animate-pulse">
                    <span>🍲 CALDO GOURMET A FUEGO LENTO</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Linguini y Remy listos · Esperando orden de TikTok
                  </span>
                </div>
              )}
            </div>

            {/* SECTOR 3 (DERECHO): Campana de servicio de plata (Cloche de la Imagen 2) y timbre */}
            <div className="col-span-3 flex flex-col items-end justify-between h-full gap-2 pl-1 border-l border-slate-800">
              {/* Campana de plata (Cloche Gourmet de la Imagen 2) */}
              <div
                className={`flex flex-col items-center transition-transform duration-300 ${
                  isServing ? 'scale-110 -translate-y-1' : ''
                }`}
                title="Campana de Servicio Cloche"
              >
                {/* Asa esférica de la campana */}
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400 shadow-sm -mb-0.5" />
                {/* Cúpula plateada brillante */}
                <div className="w-12 h-6 rounded-t-full bg-gradient-to-r from-slate-400 via-white to-slate-400 border border-slate-300 shadow-md relative">
                  <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/70 blur-[0.5px]" />
                </div>
                {/* Plato base plateado */}
                <div className="w-14 h-1.5 rounded-full bg-slate-400 border border-slate-300 -mt-0.5 shadow-sm" />
                <span className="text-[8px] font-black font-mono text-slate-300 mt-0.5">
                  {isServing ? '¡PLATO LISTO!' : 'CLOCHE'}
                </span>
              </div>

              {/* Botón interactivo para acariciar/activar a la ratita Remy */}
              <button
                type="button"
                onClick={handleRemyInteraction}
                className="w-full py-1 px-1.5 rounded-lg bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-500/50 hover:border-cyan-300 text-[9px] font-bold text-cyan-300 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                title="Toca a Remy para recibir ánimo y un boost"
              >
                <span>🐀</span>
                <span>Tocar a Remy</span>
              </button>
            </div>
          </div>

          {/* BARRA INFERIOR DE LA MESA: Indicador de la Función Activa de Remy */}
          <div className="bg-[#10131a] border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-slate-200">
                Mesa de Salteado en Vivo · {remyCurrentRole}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">
                {speedMultiplier > 1.2 ? `⚡ Turbo x${speedMultiplier.toFixed(1)}` : '🔥 Fuego Gourmet'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
