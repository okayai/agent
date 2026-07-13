import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Target, Terminal, Rocket, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

interface NavigationProps {
  className?: string;
}

export const Navigation = ({ className }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: '/', label: 'Bridge', icon: Home },
    { id: '/starmap', label: 'Star Map', icon: Map },
    { id: '/missions', label: 'Missions', icon: Target },
    { id: '/terminal', label: 'Terminal', icon: Terminal },
    { id: '/hangar', label: 'Hangar', icon: Rocket },
    { id: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 md:static md:top-0',
      'bg-card/80 backdrop-blur-xl border-t md:border-t-0 md:border-b border-border',
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - hidden on mobile */}
          <div className="hidden md:block cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" />
          </div>

          {/* Nav Items */}
          <div className="flex items-center justify-around w-full md:w-auto md:gap-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={cn(
                  'flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl transition-all duration-300',
                  'text-xs md:text-sm font-medium',
                  isActive(id)
                    ? 'text-primary bg-primary/10 md:bg-primary/15'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 md:w-4 md:h-4 transition-transform',
                  isActive(id) && 'scale-110'
                )} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Spacer for desktop */}
          <div className="hidden md:block w-[120px]" />
        </div>
      </div>
    </nav>
  );
};
