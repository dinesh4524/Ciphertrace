import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  variant?: 'full' | 'compact' | 'monogram';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'Investigation Intelligence Platform',
  variant = 'full',
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-xs', sub: 'text-[9px]' },
    md: { icon: 34, text: 'text-sm', sub: 'text-[10px]' },
    lg: { icon: 44, text: 'text-base', sub: 'text-xs' },
    xl: { icon: 56, text: 'text-xl', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Scalable Vector Emblem Mark */}
      <div 
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Subtle Outer Shield Geometry */}
          <path 
            d="M50 8 L86 22 V52 C86 72 70 88 50 94 C30 88 14 72 14 52 V22 L50 8 Z" 
            fill="#163A5F" 
            stroke="#0E2640" 
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Inner Hexagonal Cryptographic Ring */}
          <polygon 
            points="50,22 75,36 75,64 50,78 25,64 25,36" 
            fill="#0F2844" 
            stroke="#2563EB" 
            strokeWidth="1.5" 
            strokeDasharray="4 2"
            opacity="0.85"
          />

          {/* Interconnecting Network Graph Edges */}
          <line x1="50" y1="22" x2="50" y2="50" stroke="#16805C" strokeWidth="2.5" />
          <line x1="25" y1="36" x2="50" y2="50" stroke="#16805C" strokeWidth="2" />
          <line x1="75" y1="36" x2="50" y2="50" stroke="#16805C" strokeWidth="2" />
          <line x1="25" y1="64" x2="50" y2="50" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 2" />
          <line x1="75" y1="64" x2="50" y2="50" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 2" />
          <line x1="50" y1="78" x2="50" y2="50" stroke="#B7791F" strokeWidth="2" strokeDasharray="2 2" />

          {/* Center Hub Node (Focal Point) */}
          <circle cx="50" cy="50" r="7" fill="#FFFFFF" stroke="#16805C" strokeWidth="3" />
          <circle cx="50" cy="50" r="3" fill="#163A5F" />

          {/* Peripheral Intelligence Nodes */}
          <circle cx="50" cy="22" r="4.5" fill="#16805C" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="75" cy="36" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="75" cy="64" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="50" cy="78" r="4.5" fill="#B7791F" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="25" cy="64" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="25" cy="36" r="4" fill="#16805C" stroke="#FFFFFF" strokeWidth="1.5" />
        </svg>

        {/* Live Active Status Pulse Beacon */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16805C] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16805C] border border-white"></span>
        </span>
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono font-bold tracking-wider text-[#172033] ${currentSize.text}`}>
              CIPHERTRACE
            </span>
            <span className="font-mono font-bold text-[#2563EB] text-sm">X</span>
            {variant === 'full' && (
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] font-bold">
                SEC-63
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`text-[#64748B] font-mono tracking-tight truncate ${currentSize.sub}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
