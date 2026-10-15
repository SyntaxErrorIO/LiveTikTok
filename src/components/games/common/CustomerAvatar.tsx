import React, { useState } from 'react';

interface CustomerAvatarProps {
  avatarUrl?: string;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isVip?: boolean;
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg',
};

const bgGradients = [
  'from-amber-600 to-rose-700',
  'from-cyan-600 to-blue-800',
  'from-emerald-600 to-teal-800',
  'from-purple-600 to-indigo-800',
  'from-rose-600 to-amber-700',
  'from-orange-600 to-red-800',
];

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  avatarUrl,
  username,
  size = 'md',
  className = '',
  isVip = false,
}) => {
  const [hasError, setHasError] = useState(false);

  // Deterministic palette based on username for consistent handsome fallback
  const charCode = (username || '?').charCodeAt(0) + (username || '?').length;
  const gradient = bgGradients[charCode % bgGradients.length];
  const initial = (username || '?')[0].toUpperCase();

  const baseSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-white select-none ${baseSize} ${className} ${
        isVip ? 'ring-2 ring-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'border border-slate-700'
      }`}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={`@${username}`}
          className="w-full h-full object-cover"
          loading="lazy"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center font-mono font-black drop-shadow`}
        >
          {initial}
        </div>
      )}

      {isVip && (
        <span
          className="absolute -top-1 -right-1 text-[10px] leading-none filter drop-shadow select-none pointer-events-none"
          title="VIP"
        >
          👑
        </span>
      )}
    </div>
  );
};
