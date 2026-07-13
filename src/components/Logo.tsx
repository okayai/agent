import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className, size = 'md' }: LogoProps) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo Icon - Constellation forming a key */}
      <div className={cn('relative', sizes[size])}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Constellation lines */}
          <path
            d="M8 12L24 8L40 12M8 12L12 24L8 36M40 12L36 24L40 36M8 36L24 40L40 36M12 24H36M24 8V40"
            stroke="url(#gradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-60"
          />
          
          {/* Star nodes */}
          <circle cx="24" cy="8" r="3" fill="url(#gradient)" className="animate-pulse" />
          <circle cx="8" cy="12" r="2.5" fill="hsl(191, 100%, 50%)" />
          <circle cx="40" cy="12" r="2.5" fill="hsl(191, 100%, 50%)" />
          <circle cx="12" cy="24" r="2" fill="hsl(191, 90%, 76%)" />
          <circle cx="36" cy="24" r="2" fill="hsl(191, 90%, 76%)" />
          <circle cx="24" cy="24" r="4" fill="url(#gradient)" className="animate-pulse" />
          <circle cx="8" cy="36" r="2.5" fill="hsl(191, 100%, 50%)" />
          <circle cx="40" cy="36" r="2.5" fill="hsl(191, 100%, 50%)" />
          <circle cx="24" cy="40" r="3" fill="url(#gradient)" className="animate-pulse" />
          
          <defs>
            <linearGradient id="gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="hsl(191, 100%, 50%)" />
              <stop offset="1" stopColor="hsl(191, 90%, 76%)" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Glow effect */}
        <div className="absolute inset-0 blur-lg opacity-30 bg-primary rounded-full" />
      </div>

      {/* Logo Text */}
      <div className="flex flex-col">
        <span className={cn('font-display font-bold tracking-wider text-gradient-cosmic', textSizes[size])}>
          SILULO
        </span>
        {size === 'lg' && (
          <span className="text-xs text-muted-foreground tracking-widest uppercase">
            Digital Odyssey
          </span>
        )}
      </div>
    </div>
  );
};
