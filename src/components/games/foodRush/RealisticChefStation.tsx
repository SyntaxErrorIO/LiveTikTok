import React from 'react';
import { FoodOrder } from '../types';

interface RealisticChefStationProps {
  isCooking: boolean;
  isVipFlame: boolean;
  isServing: boolean;
  cookProgress: number;
  currentDish?: FoodOrder | null;
  speedMultiplier: number;
}

/**
 * Chef Realista y Mesa de Preparación Culinaria Profesional.
 * Sustituye completamente el diseño animado/infantil por un entorno realista:
 * - Chef con proporciones realistas, uniforme negro moderno, bandana culinaria y brazos en acción.
 * - Mesa de preparación culinaria en acero inoxidable pulido y madera rústica con mise en place:
 *   fogón wok de fuego vivo, tabla de cortar con cebollita china picada, cuchillo de chef,
 *   cuencos metálicos de especias, botellas aceiteras de acero, vapor y comanda real del espectador.
 */
export const RealisticChefStation: React.FC<RealisticChefStationProps> = ({
  isCooking,
  isVipFlame,
  isServing,
  cookProgress,
  currentDish,
  speedMultiplier,
}) => {
  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* ============================================================== */}
      {/* ILUMINACIÓN AMBIENTAL DE COCINA (Foco Cenital & Resplandor Wok) */}
      {/* ============================================================== */}
      <div className="absolute -top-16 inset-x-0 h-48 pointer-events-none flex justify-center">
        {/* Foco de luz de cocina caliente */}
        <div className="w-72 h-44 bg-gradient-to-b from-amber-400/25 via-amber-600/10 to-transparent blur-3xl" />
        {/* Resplandor del fuego del wok al saltear */}
        {isCooking && (
          <div
            className={`absolute bottom-0 w-80 h-32 rounded-full blur-2xl transition-all duration-200 ${
              isVipFlame
                ? 'bg-gradient-to-t from-red-600/60 via-amber-500/50 to-yellow-300/30 animate-pulse'
                : 'bg-gradient-to-t from-orange-600/35 via-amber-500/25 to-transparent'
            }`}
          />
        )}
      </div>

      {/* ============================================================== */}
      {/* LLAMARADA REALISTA FLAMBÉ VIP CUANDO SE COCINA CON ALTO REGALO */}
      {/* ============================================================== */}
      {isVipFlame && (
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="relative w-44 h-48 flex items-center justify-center">
            {/* SVG Fuego Realista Flambeado */}
            <svg viewBox="0 0 160 200" className="w-full h-full filter drop-shadow-[0_0_24px_rgba(245,158,11,0.9)] animate-pulse">
              <defs>
                <linearGradient id="realFlameExt" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.9" />
                  <stop offset="25%" stopColor="#dc2626" />
                  <stop offset="55%" stopColor="#ea580c" />
                  <stop offset="85%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>
                <linearGradient id="realFlameInt" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.7" />
                  <stop offset="30%" stopColor="#f97316" />
                  <stop offset="70%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>

              {/* Lenguas de fuego envolventes exteriores */}
              <path
                d="M80 10 C96 40, 130 50, 120 100 C145 80, 138 140, 115 160 C90 180, 60 180, 42 160 C20 135, 15 85, 40 100 C30 50, 64 40, 80 10 Z"
                fill="url(#realFlameExt)"
                opacity="0.95"
              />
              {/* Núcleo ardiente de alta temperatura */}
              <path
                d="M80 50 C92 75, 112 85, 105 125 C120 110, 114 150, 100 165 C85 178, 65 178, 55 165 C42 148, 38 112, 54 125 C48 85, 70 75, 80 50 Z"
                fill="url(#realFlameInt)"
              />
              {/* Chispas y brasas saltando */}
              <circle cx="82" cy="22" r="2.5" fill="#fef08a" />
              <circle cx="118" cy="48" r="2" fill="#fed7aa" />
              <circle cx="45" cy="62" r="2.2" fill="#fef08a" />
              <circle cx="95" cy="35" r="1.8" fill="#ffffff" />
            </svg>

            {/* Placa VIP Flambé con tipografía moderna */}
            <div className="absolute -top-4 px-3 py-0.5 rounded-full bg-black/90 border border-amber-400/80 text-[10px] font-black tracking-widest text-amber-300 uppercase shadow-2xl backdrop-blur-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>FUEGO VIVO AL WOK · VIP</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VAPOR REALISTA DE COCCIÓN SALIENDO DEL WOK                     */}
      {/* ============================================================== */}
      {isCooking && (
        <div className="absolute -top-12 left-1/2 -translate-x-12 flex gap-2 pointer-events-none z-20">
          <div className="w-4 h-16 bg-gradient-to-t from-slate-200/40 via-slate-100/20 to-transparent rounded-full blur-[3px] animate-pulse" />
          <div className="w-6 h-20 bg-gradient-to-t from-slate-200/50 via-slate-100/25 to-transparent rounded-full blur-[4px] animate-pulse delay-100" />
          <div className="w-4 h-14 bg-gradient-to-t from-slate-200/35 via-slate-100/15 to-transparent rounded-full blur-[3px] animate-pulse delay-200" />
        </div>
      )}

      {/* ============================================================== */}
      {/* CHEF PROFESIONAL REALISTA (Detalle anatómico, chaqueta, bandana) */}
      {/* ============================================================== */}
      <div
        className={`relative z-10 transition-transform duration-200 ${
          isVipFlame
            ? 'scale-[1.04] translate-y-[-2px]'
            : isCooking
            ? 'translate-y-[-2px] rotate-[-0.8deg]'
            : isServing
            ? 'scale-[1.02] translate-y-[-3px]'
            : 'translate-y-0'
        }`}
      >
        <svg
          viewBox="0 0 240 260"
          className="w-56 h-60 sm:w-64 sm:h-68 filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.85)]"
        >
          <defs>
            {/* Piel realista con sombra y volumen */}
            <radialGradient id="skinGradReal" cx="45%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#ffd8b3" />
              <stop offset="50%" stopColor="#f6ba89" />
              <stop offset="85%" stopColor="#d48c59" />
              <stop offset="100%" stopColor="#a35d30" />
            </radialGradient>
            {/* Piel brazos con musculatura sutil */}
            <linearGradient id="armSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd8b3" />
              <stop offset="60%" stopColor="#f6ba89" />
              <stop offset="100%" stopColor="#b36938" />
            </linearGradient>
            {/* Chaqueta de chef negra profesional moderna */}
            <linearGradient id="chefJacketDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2a2e39" />
              <stop offset="40%" stopColor="#181a20" />
              <stop offset="85%" stopColor="#0f1115" />
              <stop offset="100%" stopColor="#08090b" />
            </linearGradient>
            {/* Delantal de cuero / lona encerada de cocina */}
            <linearGradient id="apronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#241b16" />
              <stop offset="50%" stopColor="#191310" />
              <stop offset="100%" stopColor="#0e0a08" />
            </linearGradient>
            {/* Acero inoxidable para espátula y cazos */}
            <linearGradient id="steelGloss" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="35%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            {/* Sombra proyectada */}
            <filter id="chefShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Sombra suave de base */}
          <ellipse cx="120" cy="245" rx="80" ry="14" fill="#000000" opacity="0.65" filter="blur(6px)" />

          {/* ======================================= */}
          {/* 1. TORSO Y UNIFORME DE CHEF PROFESIONAL */}
          {/* ======================================= */}
          <g filter="url(#chefShadow)">
            {/* Chaqueta de Chef Negra con corte cruzado moderno */}
            <path
              d="M78 116 L162 116 L178 240 L62 240 Z"
              fill="url(#chefJacketDark)"
              stroke="#374151"
              strokeWidth="1.5"
            />
            {/* Cuello Mao de la Chaqueta */}
            <path
              d="M102 114 C102 108, 138 108, 138 114 L142 126 L98 126 Z"
              fill="#1e222a"
              stroke="#4b5563"
              strokeWidth="1"
            />
            {/* Ribete rojo sutil en cuello */}
            <path d="M100 126 L140 126" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />

            {/* Delantal de cocina frontal con tirantes de cuero */}
            <path
              d="M88 140 L152 140 L158 240 L82 240 Z"
              fill="url(#apronGrad)"
              stroke="#3e2d24"
              strokeWidth="1.5"
            />
            {/* Costuras doradas y remaches del delantal */}
            <path d="M92 146 L148 146" stroke="#b45309" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="94" cy="144" r="2" fill="#f59e0b" />
            <circle cx="146" cy="144" r="2" fill="#f59e0b" />

            {/* Paño de cocina blanco doblado colgado del delantal */}
            <path
              d="M80 180 L94 182 L90 226 L78 224 Z"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <path d="M84 196 L88 196" stroke="#ef4444" strokeWidth="1.5" />
          </g>

          {/* ======================================= */}
          {/* 2. CUELLO Y CABEZA DEL CHEF REALISTA     */}
          {/* ======================================= */}
          {/* Cuello anatómico */}
          <path d="M108 102 L132 102 L134 118 L106 118 Z" fill="url(#skinGradReal)" />
          {/* Sombra bajo la barbilla */}
          <path d="M108 102 C116 108, 124 108, 132 102 L134 108 L106 108 Z" fill="#8c471c" opacity="0.6" />

          {/* Cabeza / Rostro estructurado realista */}
          <path
            d="M100 58 C96 68, 96 82, 102 94 C108 104, 114 106, 120 106 C126 106, 132 104, 138 94 C144 82, 144 68, 140 58 C136 46, 104 46, 100 58 Z"
            fill="url(#skinGradReal)"
            stroke="#b36938"
            strokeWidth="1"
          />

          {/* Orejas realistas con sombras */}
          <path d="M98 68 C94 68, 94 80, 98 82 Z" fill="#d48c59" stroke="#9a4d22" strokeWidth="1" />
          <path d="M142 68 C146 68, 146 80, 142 82 Z" fill="#d48c59" stroke="#9a4d22" strokeWidth="1" />

          {/* Pelo / Barba estilizada moderna de chef profesional */}
          <path
            d="M103 86 C106 98, 114 104, 120 104 C126 104, 134 98, 137 86 C134 89, 128 92, 120 92 C112 92, 106 89, 103 86 Z"
            fill="#1e1b18"
            opacity="0.85"
          />
          {/* Bigote fino y cuidado */}
          <path
            d="M112 85 C116 83, 119 84, 120 85 C121 84, 124 83, 128 85 C124 87, 122 87, 120 86 C118 87, 116 87, 112 85 Z"
            fill="#1c1917"
          />
          {/* Labios sutiles */}
          <path d="M116 88 Q120 90 124 88" stroke="#9a4d22" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Ojos concentrados en la mesa de cocina */}
          <g>
            {/* Ojo izquierdo */}
            <ellipse cx="112" cy="71" rx="4.5" ry="2.5" fill="#f8fafc" />
            <circle cx="112" cy="72" r="2.2" fill="#362214" />
            <circle cx="112.5" cy="71.5" r="0.8" fill="#ffffff" />
            {/* Párpado y ceja izquierda definida */}
            <path d="M107 66 Q112 63 117 66" stroke="#261a12" strokeWidth="2.2" fill="none" strokeLinecap="round" />

            {/* Ojo derecho */}
            <ellipse cx="128" cy="71" rx="4.5" ry="2.5" fill="#f8fafc" />
            <circle cx="128" cy="72" r="2.2" fill="#362214" />
            <circle cx="128.5" cy="71.5" r="0.8" fill="#ffffff" />
            {/* Párpado y ceja derecha */}
            <path d="M123 66 Q128 63 133 66" stroke="#261a12" strokeWidth="2.2" fill="none" strokeLinecap="round" />

            {/* Tabique de la nariz realista con sombra lateral */}
            <path d="M120 67 L118 78 L122 79" stroke="#9a4d22" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* ======================================= */}
          {/* 3. BANDANA CULINARIA / GORRO PROFESIONAL */}
          {/* ======================================= */}
          {/* Bandana negra moderna con nudo posterior */}
          <path
            d="M98 58 C98 44, 106 38, 120 38 C134 38, 142 44, 142 58 L144 62 L96 62 Z"
            fill="#181a20"
            stroke="#374151"
            strokeWidth="1.5"
          />
          {/* Cinta frontal con insignia dorada de Maestro Wok */}
          <rect x="96" y="56" width="48" height="8" rx="2" fill="#0f1115" stroke="#4b5563" strokeWidth="1" />
          <circle cx="120" cy="60" r="2.2" fill="#f59e0b" />

          {/* ======================================= */}
          {/* 4. BRAZOS REALISTAS MANIPULANDO LA MESA  */}
          {/* ======================================= */}
          {/* Brazo Izquierdo (Sujeta la espátula / chao metálico hacia el wok) */}
          <g
            className={`transition-transform duration-150 origin-[82px_124px] ${
              isCooking ? 'rotate-12 translate-y-[-2px]' : ''
            }`}
          >
            {/* Manga remangada negra */}
            <path d="M78 120 L66 142 L80 148 L90 126 Z" fill="#181a20" stroke="#374151" strokeWidth="1.2" />
            {/* Antebrazo realista descubierto con musculatura */}
            <path d="M68 142 L52 182 L64 186 L78 148 Z" fill="url(#armSkinGrad)" />
            {/* Mano firme sujetando mango de espátula */}
            <circle cx="56" cy="188" r="7" fill="url(#skinGradReal)" />
            {/* Mango de madera de la espátula de wok */}
            <line x1="56" y1="188" x2="48" y2="216" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
            {/* Cuello y pala metálica de la espátula de acero */}
            <line x1="48" y1="216" x2="42" y2="236" stroke="url(#steelGloss)" strokeWidth="3" />
            <path
              d="M34 234 L50 236 L48 248 L32 246 Z"
              fill="url(#steelGloss)"
              stroke="#64748b"
              strokeWidth="1"
            />
          </g>

          {/* Brazo Derecho (Sujeta y saltea el Wok en el fogón) */}
          <g
            className={`transition-transform duration-150 origin-[158px_124px] ${
              isCooking ? '-rotate-12 translate-y-[-4px]' : ''
            }`}
          >
            {/* Manga remangada derecha */}
            <path d="M162 120 L174 142 L160 148 L150 126 Z" fill="#181a20" stroke="#374151" strokeWidth="1.2" />
            {/* Antebrazo derecho */}
            <path d="M172 142 L188 182 L176 186 L162 148 Z" fill="url(#armSkinGrad)" />
            {/* Mano sujetando el mango del wok */}
            <circle cx="184" cy="188" r="7" fill="url(#skinGradReal)" />
            {/* Mango ergonómico del wok de hierro */}
            <line x1="184" y1="188" x2="198" y2="210" stroke="#1c1917" strokeWidth="5.5" strokeLinecap="round" />
            {/* Wok de hierro fundido profesional sobre la mesa */}
            <path
              d="M170 216 C160 238, 220 248, 230 220 Z"
              fill="#18181b"
              stroke="#3f3f46"
              strokeWidth="2"
            />
            {/* Interior del wok caliente con reflejos de aceite */}
            <ellipse
              cx="200"
              cy="222"
              rx="24"
              ry="10"
              fill={isVipFlame ? '#ea580c' : '#27272a'}
              stroke="#52525b"
              strokeWidth="1"
            />
          </g>
        </svg>
      </div>

      {/* ============================================================== */}
      {/* MESA DE PREPARACIÓN PROFESIONAL ("DONDE SE ESTÁ PREPARANDO")    */}
      {/* Acero inoxidable, tabla de cortar con ingredientes, fogón y comanda */}
      {/* ============================================================== */}
      <div className="relative w-full z-20 -mt-8">
        {/* Superficie Superior de la Mesa: Acero Inoxidable y Madera de Corte */}
        <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-gradient-to-b from-[#242833] via-[#1a1d26] to-[#0f1118] shadow-[0_16px_36px_rgba(0,0,0,0.95)]">
          {/* Brillo biselado del borde de acero */}
          <div className="h-1 w-full bg-gradient-to-r from-slate-600 via-slate-300 to-slate-600 opacity-70" />

          {/* BANDEJA DE PREPARACIÓN CULINARIA EN VIVO (Mise en Place) */}
          <div className="p-3 sm:p-4 grid grid-cols-12 gap-2 sm:gap-3 items-center">
            {/* 1. SECTOR IZQUIERDO: Tabla de cortar con cuchillo e ingredientes (4 cols) */}
            <div className="col-span-4 flex flex-col gap-1.5">
              <div className="text-[10px] font-black text-amber-300 font-mono tracking-wider flex items-center gap-1">
                <span>🔪 PREP DE MESA</span>
              </div>

              {/* Tabla de picar rústica de madera con cebollita y cuchillo */}
              <div className="relative h-20 sm:h-22 rounded-xl bg-gradient-to-r from-[#593922] via-[#784c28] to-[#4a2e19] p-2 border border-[#966336] shadow-inner flex flex-col justify-between overflow-hidden">
                {/* Vetas de madera realista */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(90deg,_transparent,_transparent_8px,_rgba(0,0,0,0.4)_9px)]" />

                {/* Ingredientes picados sobre la tabla */}
                <div className="relative z-10 flex items-center gap-1.5 flex-wrap">
                  {/* Cebollita china fresca recién picada */}
                  <div className="flex gap-1 flex-wrap max-w-[70px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 border border-emerald-300 inline-block" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  {/* Trocitos de carne / ají picado */}
                  <div className="flex gap-1">
                    <span className="w-3 h-2 rounded-sm bg-red-600 border border-red-400" />
                    <span className="w-2.5 h-2 rounded-sm bg-amber-800" />
                  </div>
                </div>

                {/* Cuchillo de Chef profesional de acero apoyado en diagonal */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-10 sm:w-14 h-3 bg-gradient-to-r from-slate-200 via-white to-slate-400 rounded-l-sm shadow-md border-r-2 border-slate-900" />
                    <div className="w-4 h-2 bg-black rounded-r-sm" />
                  </div>
                  <span className="text-[8px] font-mono text-amber-200/80 font-bold">Mise en place</span>
                </div>
              </div>

              {/* Botellas aceiteras y cuencos de especias de acero en la mesa */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="w-4 h-7 rounded-t-md bg-gradient-to-b from-slate-300 to-slate-600 border border-slate-400 flex flex-col items-center justify-start shadow-sm" title="Aceite de Wok">
                  <div className="w-1 h-2 bg-slate-900 rounded-t-xs -mt-1.5" />
                </div>
                <div className="w-4 h-8 rounded-t-md bg-gradient-to-b from-amber-950 to-black border border-amber-800 flex flex-col items-center justify-start shadow-sm" title="Salsa de Soya / Sillao">
                  <div className="w-1 h-2 bg-red-600 rounded-t-xs -mt-1.5" />
                </div>
                <div className="w-5 h-3.5 rounded-b-md bg-slate-300 border border-slate-400 shadow-sm" title="Especias y Sal" />
                <div className="w-5 h-3.5 rounded-b-md bg-amber-200 border border-amber-400 shadow-sm" title="Huevo batido" />
              </div>
            </div>

            {/* 2. SECTOR CENTRAL: Fogón Wok con llama real y cocción activa (5 cols) */}
            <div className="col-span-5 flex flex-col items-center justify-center px-1">
              {currentDish ? (
                <div className="w-full flex flex-col items-center gap-2">
                  {/* Comanda / Ticket del espectador fijado a la mesa */}
                  <div className="w-full p-2 rounded-xl bg-slate-950/90 border border-amber-500/50 backdrop-blur-md shadow-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar del espectador que ordenó */}
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400 shrink-0 bg-slate-800">
                        {currentDish.avatarUrl ? (
                          <img src={currentDish.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-amber-300">
                            {currentDish.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

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

                  {/* Barra de progreso de cocción en la mesa */}
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                      <span className="flex items-center gap-1 text-cyan-300 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        Cocinando al Wok...
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
                /* Estado en reposo: Fogón encendido esperando la próxima orden de TikTok */
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-black mb-1 animate-pulse">
                    <span>🔥 WOK ENCENDIDO A FUEGO VIVO</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Mesa lista · Esperando orden de espectador
                  </span>
                </div>
              )}
            </div>

            {/* 3. SECTOR DERECHO: Campana de servicio, platos listos y timbre (3 cols) */}
            <div className="col-span-3 flex flex-col items-end justify-between h-full gap-2 pl-1 border-l border-slate-800">
              {/* Timbre de Servicio Dorado de Cocina */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-5 rounded-t-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border border-amber-200 shadow-md relative">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                </div>
                <div className="w-10 h-1.5 bg-slate-700 rounded-sm shadow-sm" />
                <span className="text-[8px] font-black font-mono text-amber-300 mt-0.5 tracking-tight">
                  SERVICIO
                </span>
              </div>

              {/* Pilas de platos cerámicos calientes listos en la mesa */}
              <div className="flex flex-col items-center opacity-85">
                <div className="w-12 h-2 rounded-full bg-slate-200 border border-slate-400 shadow-sm" />
                <div className="w-12 h-2 rounded-full bg-slate-300 border border-slate-400 -mt-1 shadow-sm" />
                <div className="w-12 h-2 rounded-full bg-slate-400 border border-slate-500 -mt-1 shadow-sm" />
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">Platos listos</span>
              </div>
            </div>
          </div>

          {/* FRENTE DE LA MESA: Acero Inoxidable Industrial con Indicadores LED */}
          <div className="bg-[#12141c] border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Mesa de Salteado en Vivo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">
                {speedMultiplier > 1.2 ? `⚡ Turbo x${speedMultiplier.toFixed(1)}` : '🔥 280°C Wok'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
