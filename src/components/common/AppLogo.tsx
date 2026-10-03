import React from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  variant?: 'badge' | 'plain';
  showText?: boolean;
  text?: string;
  subtitle?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  text = 'Self Reporting',
  subtitle,
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 20
      : size === 'sm'
      ? 28
      : size === 'md'
      ? 34
      : size === 'lg'
      ? 44
      : 56;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
      >
        <img
          src="/logo.svg"
          alt="Logo"
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full object-contain block"
          loading="eager"
          decoding="sync"
        />
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-tight min-w-0">
          <span className="text-base font-bold tracking-tight text-[#111111] group-hover:text-black transition-colors truncate">
            {text}
          </span>
          {subtitle && (
            <span className="text-[10px] text-[#4B5563] tracking-wider uppercase font-medium">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

