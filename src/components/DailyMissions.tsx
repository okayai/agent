import { Zap, CheckCircle2, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DailyMissionsProps {
  className?: string;
}

export const DailyMissions = ({ className }: DailyMissionsProps) => {
  const { user, completeMission } = useUser();
  const navigate = useNavigate();

  const completedCount = user.dailyMissions.filter(m => m.completed).length;

  const handleCompleteMission = (missionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeMission(missionId);
    const mission = user.dailyMissions.find(m => m.id === missionId);
    if (mission) {
      toast.success(`+${mission.xp} XP earned!`, {
        description: mission.title,
      });
    }
  };

  return (
    <div className={cn('cosmic-card rounded-2xl p-6', className)}>
      <div 
        className="flex items-center justify-between mb-5 cursor-pointer"
        onClick={() => navigate('/missions')}
      >
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Daily Missions
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedCount}/{user.dailyMissions.length} Complete
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>View All →</span>
        </div>
      </div>

      <div className="space-y-3">
        {user.dailyMissions.map((mission) => (
          <div
            key={mission.id}
            className={cn(
              'group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300',
              mission.completed 
                ? 'bg-success/10 border border-success/20' 
                : 'bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20'
            )}
          >
            {/* Icon */}
            <div 
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                mission.completed ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
              )}
            >
              {mission.completed ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                'font-medium text-sm',
                mission.completed && 'line-through opacity-70'
              )}>
                {mission.title}
              </h4>
              <p className="text-xs text-muted-foreground truncate">{mission.description}</p>
            </div>

            {/* XP Reward or Complete Button */}
            {mission.completed ? (
              <div className="flex items-center gap-1 text-sm font-mono font-semibold text-success">
                <Zap className="w-3.5 h-3.5" />
                +{mission.xp}
              </div>
            ) : (
              <Button 
                variant="engage" 
                size="sm"
                onClick={(e) => handleCompleteMission(mission.id, e)}
              >
                Done
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Bonus reward indicator */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Complete All Missions</p>
            <p className="text-xs text-muted-foreground">Bonus reward unlocked!</p>
          </div>
          <div className="flex items-center gap-2 text-primary font-mono font-bold">
            <Zap className="w-4 h-4" />
            +150 XP
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / user.dailyMissions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
