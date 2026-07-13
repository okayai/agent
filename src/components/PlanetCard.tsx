import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Clock, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

interface PlanetCardProps {
  planetId: string;
  className?: string;
}

export const PlanetCard = ({ planetId, className }: PlanetCardProps) => {
  const navigate = useNavigate();
  const { planets, getPlanetProgress } = useUser();

  const planet = planets.find(p => p.id === planetId);
  if (!planet) return null;

  const progress = getPlanetProgress(planetId);
  const totalDuration = planet.lessons.reduce((acc, l) => {
    const mins = parseInt(l.duration);
    return acc + (isNaN(mins) ? 5 : mins);
  }, 0);

  return (
    <div 
      className={cn(
        'group relative cosmic-card rounded-2xl p-6 transition-all duration-500',
        planet.unlocked 
          ? 'hover:scale-[1.02] hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] cursor-pointer' 
          : 'opacity-60',
        className
      )}
      onClick={() => planet.unlocked && navigate(`/planet/${planet.id}`)}
    >
      {/* Glow effect on hover */}
      {planet.unlocked && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl"
          style={{ background: `radial-gradient(circle at center, ${planet.color}40, transparent 70%)` }}
        />
      )}

      <div className="flex gap-5">
        {/* Planet Icon */}
        <div className="relative shrink-0">
          <div 
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl',
              'bg-gradient-to-br from-secondary to-muted',
              planet.unlocked && 'planet-glow'
            )}
            style={{ 
              boxShadow: planet.unlocked ? `0 0 30px ${planet.color}30` : 'none',
            }}
          >
            {planet.unlocked ? planet.icon : <Lock className="w-8 h-8 text-muted-foreground" />}
          </div>
          {progress > 0 && planet.unlocked && (
            <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {progress}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-display font-semibold text-lg truncate">{planet.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{planet.description}</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {planet.lessons.length} Missions
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              ~{totalDuration} min
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-warning" />
              +{planet.totalXp} XP
            </span>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Difficulty:</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    i < Math.ceil(planet.lessons.reduce((a, l) => a + l.difficulty, 0) / planet.lessons.length) 
                      ? 'bg-primary' 
                      : 'bg-secondary'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && planet.unlocked && (
        <div className="mt-4">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="mt-5">
        <Button 
          variant={planet.unlocked ? 'engage' : 'secondary'} 
          className="w-full"
          disabled={!planet.unlocked}
        >
          {planet.unlocked 
            ? progress > 0 
              ? progress === 100 
                ? 'Completed ✓' 
                : 'Continue' 
              : 'Engage' 
            : 'Locked'}
        </Button>
      </div>
    </div>
  );
};
