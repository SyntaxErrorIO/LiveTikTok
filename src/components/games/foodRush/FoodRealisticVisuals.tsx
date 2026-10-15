import React from 'react';

/**
 * Visuales realistas y modernos para los platos del juego interactivo de TikTok LIVE.
 * Diseñados con vectores SVG de alta definición, efectos de vapor, escarcha, fuego y reflejos.
 */

export const RealisticChaufa: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'lg' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-52 h-52',
    xl: 'w-72 h-72',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeMap[size]}`}>
      {/* Resplandor cálido de fondo (wok & fuego) */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-600/40 via-red-600/20 to-transparent rounded-full blur-2xl animate-pulse" />

      {/* Columnas de Vapor animado */}
      <div className="absolute -top-8 inset-x-0 flex justify-center gap-3 pointer-events-none z-20">
        <div className="w-3 h-12 bg-gradient-to-t from-white/40 via-slate-100/20 to-transparent rounded-full blur-[2px] animate-pulse" />
        <div className="w-4 h-16 bg-gradient-to-t from-white/50 via-slate-200/25 to-transparent rounded-full blur-[3px] animate-pulse delay-150" />
        <div className="w-3 h-10 bg-gradient-to-t from-white/35 via-slate-100/15 to-transparent rounded-full blur-[2px] animate-pulse delay-300" />
      </div>

      {/* SVG Plato de Chaufa de Alta Fidelidad */}
      <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]">
        <defs>
          {/* Degradado Cuenco Cerámica Oscura */}
          <radialGradient id="bowlGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2c3038" />
            <stop offset="60%" stopColor="#181a20" />
            <stop offset="100%" stopColor="#0a0b0d" />
          </radialGradient>
          {/* Borde Dorado Cuenco */}
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="30%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          {/* Arroz Chaufa Dorado al Wok */}
          <radialGradient id="riceGrad" cx="45%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="40%" stopColor="#78350f" />
            <stop offset="85%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#261005" />
          </radialGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="100" cy="175" rx="72" ry="14" fill="#000000" opacity="0.6" filter="blur(4px)" />

        {/* Plato / Cuenco Base Exterior */}
        <ellipse cx="100" cy="140" rx="78" ry="38" fill="url(#bowlGrad)" stroke="#374151" strokeWidth="2" />
        {/* Cuerpo del cuenco */}
        <path
          d="M22 135 C24 165, 55 178, 100 178 C145 178, 176 165, 178 135 Z"
          fill="url(#bowlGrad)"
          stroke="#1f2937"
          strokeWidth="1.5"
        />

        {/* Borde Dorado Elegante del Cuenco */}
        <ellipse cx="100" cy="132" rx="78" ry="34" fill="none" stroke="url(#goldRim)" strokeWidth="3.5" />

        {/* Montaña de Arroz Chaufa */}
        <ellipse cx="100" cy="126" rx="70" ry="30" fill="url(#riceGrad)" />
        <ellipse cx="100" cy="118" rx="58" ry="24" fill="#78350f" opacity="0.9" />

        {/* Textura y Granos de Arroz Chaufa al Wok */}
        <g fill="#d97706" opacity="0.75">
          <ellipse cx="80" cy="115" rx="3.5" ry="1.8" transform="rotate(-15 80 115)" />
          <ellipse cx="95" cy="110" rx="3.5" ry="1.8" transform="rotate(25 95 110)" />
          <ellipse cx="112" cy="114" rx="3.5" ry="1.8" transform="rotate(-30 112 114)" />
          <ellipse cx="125" cy="120" rx="3.5" ry="1.8" transform="rotate(10 125 120)" />
          <ellipse cx="70" cy="122" rx="3.5" ry="1.8" transform="rotate(40 70 122)" />
          <ellipse cx="88" cy="125" rx="3.5" ry="1.8" transform="rotate(-10 88 125)" />
          <ellipse cx="105" cy="122" rx="3.5" ry="1.8" transform="rotate(15 105 122)" />
          <ellipse cx="118" cy="128" rx="3.5" ry="1.8" transform="rotate(-20 118 128)" />
          <ellipse cx="62" cy="130" rx="3.5" ry="1.8" transform="rotate(5 62 130)" />
          <ellipse cx="138" cy="127" rx="3.5" ry="1.8" transform="rotate(35 138 127)" />
        </g>

        {/* Trozos de Pollo Saltado / Carne sellada */}
        <g>
          <rect x="74" y="118" width="13" height="9" rx="3" fill="#b45309" stroke="#78350f" strokeWidth="1" />
          <rect x="108" y="112" width="14" height="10" rx="3" fill="#92400e" stroke="#78350f" strokeWidth="1" />
          <rect x="90" y="126" width="12" height="8" rx="2.5" fill="#b45309" stroke="#451a03" strokeWidth="1" />
          <rect x="122" y="121" width="11" height="8" rx="2.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
        </g>

        {/* Trocitos de Tortilla de Huevo dorada */}
        <g fill="#fde047">
          <polygon points="85,112 92,110 90,115" />
          <polygon points="102,120 108,118 106,124" />
          <polygon points="116,110 122,108 120,114" />
          <polygon points="76,126 82,124 80,129" />
        </g>

        {/* Cebollita China / Scallions fresca recién picada */}
        <g fill="#22c55e" stroke="#15803d" strokeWidth="0.8">
          <circle cx="82" cy="112" r="2.5" />
          <circle cx="98" cy="116" r="2.8" />
          <circle cx="114" cy="118" r="2.6" />
          <circle cx="72" cy="120" r="2.2" />
          <circle cx="128" cy="116" r="2.5" />
          <circle cx="89" cy="121" r="2.6" />
          <circle cx="106" cy="127" r="2.4" />
          <circle cx="120" cy="125" r="2.2" />
          <circle cx="96" cy="107" r="2.3" />
        </g>

        {/* Tiras de Pimiento Rojo / Ají dulce */}
        <g fill="#ef4444">
          <rect x="85" y="114" width="7" height="2" rx="1" transform="rotate(25 85 114)" />
          <rect x="110" y="123" width="8" height="2.2" rx="1" transform="rotate(-30 110 123)" />
          <rect x="100" y="112" width="6" height="2" rx="1" transform="rotate(70 100 112)" />
        </g>

        {/* Wantán Crocante al costado del plato */}
        <g transform="translate(132, 102) rotate(22)">
          <polygon points="0,0 24,12 10,24" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          {/* Burbujitas de fritura del wantan */}
          <circle cx="8" cy="10" r="1.5" fill="#fef08a" />
          <circle cx="14" cy="12" r="1.2" fill="#fef08a" />
          <circle cx="7" cy="16" r="1.4" fill="#fef08a" />
        </g>

        {/* Palillos de Bambú / Chopsticks apoyados con elegancia */}
        <g opacity="0.95">
          <line x1="38" y1="96" x2="162" y2="152" stroke="#d4a373" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="38" y1="96" x2="52" y2="102" stroke="#a98467" strokeWidth="4" strokeLinecap="round" />
          <line x1="42" y1="102" x2="165" y2="157" stroke="#e6ccb2" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

export const RealisticJugo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'lg' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-52 h-52',
    xl: 'w-72 h-72',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeMap[size]}`}>
      {/* Resplandor frío y refrescante (Cítrico / Neón Helado) */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 via-amber-400/25 to-transparent rounded-full blur-2xl animate-pulse" />

      {/* SVG Vaso de Jugo Helado de Alta Fidelidad */}
      <svg viewBox="0 0 200 220" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
        <defs>
          {/* Degradado Jugo Frutal Tropical Fresco */}
          <linearGradient id="juiceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="40%" stopColor="#f97316" />
            <stop offset="80%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          {/* Brillo de Cristal / Reflejo */}
          <linearGradient id="glassGloss" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
          </linearGradient>
          {/* Cubo de hielo */}
          <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="100" cy="198" rx="46" ry="10" fill="#000000" opacity="0.5" filter="blur(3px)" />

        {/* Cañita / Sorbete rayado (sale del vaso hacia arriba a la derecha) */}
        <g transform="rotate(18 110 50)">
          <rect x="106" y="-10" width="10" height="150" rx="5" fill="#f43f5e" />
          {/* Rayas blancas del sorbete */}
          <path d="M106 10 L116 16 M106 30 L116 36 M106 50 L116 56 M106 70 L116 76" stroke="#ffffff" strokeWidth="4" />
        </g>

        {/* Silueta y Líquido del Vaso */}
        <path
          d="M62 60 L70 185 C70 192, 130 192, 130 185 L138 60 Z"
          fill="url(#juiceGrad)"
          stroke="#38bdf8"
          strokeWidth="1.5"
          opacity="0.95"
        />

        {/* Superficie del jugo */}
        <ellipse cx="100" cy="62" rx="38" ry="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />

        {/* Cubos de Hielo dentro del Jugo */}
        <g>
          {/* Hielo 1 */}
          <rect x="78" y="70" width="22" height="22" rx="4" fill="url(#iceGrad)" stroke="#ffffff" strokeWidth="1" opacity="0.85" />
          {/* Hielo 2 */}
          <rect x="102" y="85" width="20" height="20" rx="4" fill="url(#iceGrad)" stroke="#ffffff" strokeWidth="1" opacity="0.8" transform="rotate(15 102 85)" />
          {/* Hielo 3 */}
          <rect x="84" y="115" width="24" height="22" rx="4" fill="url(#iceGrad)" stroke="#ffffff" strokeWidth="1" opacity="0.75" transform="rotate(-10 84 115)" />
        </g>

        {/* Burbujitas efervescentes refrescantes */}
        <g fill="#ffffff" opacity="0.8">
          <circle cx="82" cy="155" r="2" />
          <circle cx="118" cy="165" r="2.5" />
          <circle cx="95" cy="140" r="1.8" />
          <circle cx="106" cy="125" r="2.2" />
          <circle cx="88" cy="95" r="2" />
          <circle cx="114" cy="78" r="1.5" />
        </g>

        {/* Cuerpo del Vaso de Cristal transparente exterior */}
        <path
          d="M60 55 L68 188 C69 196, 131 196, 132 188 L140 55 Z"
          fill="url(#glassGloss)"
          stroke="#bae6fd"
          strokeWidth="2.5"
        />

        {/* Base pesada de cristal del vaso */}
        <path
          d="M68 180 C68 194, 132 194, 132 180 C132 190, 68 190, 68 180 Z"
          fill="#38bdf8"
          opacity="0.5"
        />

        {/* Gotitas de condensación fría en el cristal */}
        <g fill="#ffffff" opacity="0.7">
          <ellipse cx="66" cy="90" rx="1.5" ry="3" />
          <ellipse cx="67" cy="130" rx="1.2" ry="2.5" />
          <ellipse cx="133" cy="105" rx="1.5" ry="3" />
          <ellipse cx="132" cy="145" rx="1.2" ry="2.2" />
          <circle cx="98" cy="170" r="1.5" />
        </g>

        {/* Rodaja de Naranja / Limón en el borde del vaso */}
        <g transform="translate(56, 42) rotate(-22)">
          {/* Cáscara */}
          <circle cx="0" cy="0" r="22" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
          {/* Parte blanca */}
          <circle cx="0" cy="0" r="19" fill="#fef08a" />
          {/* Gajos de naranja */}
          <circle cx="0" cy="0" r="16" fill="#ea580c" />
          {/* Rayos divisorios */}
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="0" y1="-15" x2="0" y2="15" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="-10" y1="-10" x2="10" y2="10" stroke="#fef08a" strokeWidth="1.5" />
          <line x1="10" y1="-10" x2="-10" y2="10" stroke="#fef08a" strokeWidth="1.5" />
          {/* Corte para encajar en el borde */}
          <rect x="-3" y="0" width="6" height="22" fill="#38bdf8" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
};

export const RealisticLomo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'lg' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-52 h-52',
    xl: 'w-72 h-72',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeMap[size]}`}>
      {/* Resplandor de Fuego y Sartén */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-600/40 via-amber-500/30 to-transparent rounded-full blur-2xl animate-pulse" />

      {/* Llamas de fuego flambeado saltando */}
      <div className="absolute -top-6 inset-x-0 flex justify-center gap-2 pointer-events-none z-20">
        <span className="text-2xl animate-bounce">🔥</span>
        <span className="text-3xl animate-pulse">🔥</span>
        <span className="text-2xl animate-bounce delay-100">🔥</span>
      </div>

      <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]">
        {/* Sartén de hierro fundido */}
        <ellipse cx="100" cy="140" rx="76" ry="34" fill="#1c1917" stroke="#44403c" strokeWidth="3" />
        <ellipse cx="100" cy="138" rx="68" ry="28" fill="#292524" />

        {/* Papas fritas doradas y crujientes */}
        <g fill="#facc15" stroke="#ca8a04" strokeWidth="1">
          <rect x="68" y="125" width="28" height="6" rx="2" transform="rotate(18 68 125)" />
          <rect x="88" y="132" width="26" height="6" rx="2" transform="rotate(-15 88 132)" />
          <rect x="110" y="128" width="28" height="6" rx="2" transform="rotate(10 110 128)" />
          <rect x="80" y="140" width="24" height="6" rx="2" transform="rotate(-5 80 140)" />
        </g>

        {/* Tiras de Carne de Lomo Sellada al Fuego */}
        <g fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.2">
          <rect x="82" y="122" width="22" height="11" rx="3" transform="rotate(-10 82 122)" />
          <rect x="105" y="124" width="24" height="12" rx="3" transform="rotate(20 105 124)" />
          <rect x="94" y="136" width="20" height="10" rx="3" transform="rotate(-8 94 136)" />
        </g>

        {/* Cebolla morada en pluma y gajos de tomate */}
        <g>
          {/* Cebolla morada */}
          <path d="M72 132 Q85 126 95 132" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M102 135 Q115 128 126 134" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Tomates jugosos */}
          <ellipse cx="90" cy="128" rx="6" ry="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
          <ellipse cx="118" cy="132" rx="6" ry="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
          {/* Cilantro verde fresco */}
          <circle cx="98" cy="126" r="2.5" fill="#22c55e" />
          <circle cx="106" cy="138" r="2.2" fill="#22c55e" />
          <circle cx="84" cy="136" r="2.4" fill="#22c55e" />
        </g>
      </svg>
    </div>
  );
};

export const RealisticBanquete: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'lg' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-52 h-52',
    xl: 'w-72 h-72',
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeMap[size]}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/40 via-amber-400/30 to-transparent rounded-full blur-2xl animate-pulse" />
      <div className="absolute -top-6 inset-x-0 flex justify-center gap-2 pointer-events-none z-20">
        <span className="text-3xl animate-bounce">👑</span>
        <span className="text-2xl animate-pulse">✨</span>
      </div>
      <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]">
        {/* Bandeja de Plata/Oro Real */}
        <ellipse cx="100" cy="142" rx="84" ry="32" fill="#ca8a04" stroke="#fef08a" strokeWidth="3.5" />
        <ellipse cx="100" cy="139" rx="76" ry="26" fill="#eab308" />

        {/* Langosta / Mariscos dorados imperiales */}
        <path
          d="M85 120 C80 110, 95 105, 105 108 C115 110, 125 120, 120 135 C115 145, 95 145, 88 135 Z"
          fill="#dc2626"
          stroke="#991b1b"
          strokeWidth="2"
        />
        {/* Tenazas doradas */}
        <path d="M78 115 Q65 105 72 95 Q82 102 82 112" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
        <path d="M125 115 Q138 105 131 95 Q121 102 121 112" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />

        {/* Guarnición de dumplings dorados */}
        <ellipse cx="65" cy="140" rx="9" ry="6" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
        <ellipse cx="138" cy="140" rx="9" ry="6" fill="#fef08a" stroke="#d97706" strokeWidth="1" />
      </svg>
    </div>
  );
};

/**
 * Selector automático para renderizar la ilustración realista según el plato pedido
 */
export const RealisticFoodItem: React.FC<{
  dishName: string;
  dishEmoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ dishName, dishEmoji = '🍲', size = 'lg' }) => {
  const lower = dishName.toLowerCase();

  if (lower.includes('jugo') || lower.includes('refresco') || lower.includes('bebida') || dishEmoji.includes('🥤')) {
    return <RealisticJugo size={size} />;
  }
  if (lower.includes('chaufa') || lower.includes('arroz') || dishEmoji.includes('🍲')) {
    return <RealisticChaufa size={size} />;
  }
  if (lower.includes('lomo') || lower.includes('saltado') || lower.includes('wok') || dishEmoji.includes('🥩')) {
    return <RealisticLomo size={size} />;
  }
  if (lower.includes('banquete') || lower.includes('imperial') || lower.includes('dragón') || dishEmoji.includes('🦞') || dishEmoji.includes('👑')) {
    return <RealisticBanquete size={size} />;
  }

  // Por defecto si es otro plato delicioso
  return <RealisticChaufa size={size} />;
};
