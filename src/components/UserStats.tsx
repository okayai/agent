import { Zap, Flame, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

interface UserStatsProps {
  className?: string;
}

export const UserStats = ({ className }: UserStatsProps) => {
  const { user } = useUser();

  const xpProgress = (user.xp / user.xpToNext) * 100;
  const unlockedAchievements = user.achievements.filter(a => a.unlockedAt).length;

  return (
    <div className={cn('cosmic-card rounded-2xl p-6 space-y-5', className)}>
      {/* Avatar and Name */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-3xl border-2 border-primary/30">
            {user.avatar}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            Lv.{user.level}
          </div>
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg">{user.name}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Star className="w-3 h-3 text-primary" />
            {user.rank}
          </p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Experience</span>
          <span className="text-primary font-mono">{user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 relative"
            style={{ width: `${xpProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{user.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{unlockedAchievements}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Daily Mission
          </span>
          <span className="text-xs text-muted-foreground">
            {user.dailyMissions.filter(m => m.completed).length}/{user.dailyMissions.length} Complete
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(user.dailyMissions.filter(m => m.completed).length / user.dailyMissions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
