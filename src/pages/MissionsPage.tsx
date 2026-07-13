import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { Zap, Target, CheckCircle2, Clock, Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MissionsPage = () => {
  const { user, completeMission } = useUser();

  const completedCount = user.dailyMissions.filter(m => m.completed).length;
  const allCompleted = completedCount === user.dailyMissions.length;

  const handleCompleteMission = (missionId: string) => {
    completeMission(missionId);
    const mission = user.dailyMissions.find(m => m.id === missionId);
    if (mission) {
      toast.success(`Mission Complete! +${mission.xp} XP`, {
        description: mission.title,
      });
    }
  };

  const claimBonusReward = () => {
    if (allCompleted) {
      toast.success('Bonus Reward Claimed! +150 XP', {
        description: 'All daily missions completed!',
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24 max-w-4xl">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">Missions</h1>
          </div>
          <p className="text-muted-foreground">
            Complete missions to earn XP and unlock rewards.
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold">{user.xp}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-5 h-5 text-warning" />
            </div>
            <p className="text-2xl font-display font-bold">{user.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-success" />
            </div>
            <p className="text-2xl font-display font-bold">{user.totalLessonsCompleted}</p>
            <p className="text-xs text-muted-foreground">Lessons Done</p>
          </div>
        </div>

        {/* Daily Missions */}
        <section className="cosmic-card rounded-2xl p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Daily Missions
              </h2>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{user.dailyMissions.length} Complete
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Resets at midnight</span>
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
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                    mission.completed ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                  )}
                >
                  {mission.completed ? <CheckCircle2 className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'font-medium',
                    mission.completed && 'line-through opacity-70'
                  )}>
                    {mission.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{mission.description}</p>
                </div>

                {/* XP Reward */}
                <div className={cn(
                  'flex items-center gap-1 text-sm font-mono font-semibold mr-2',
                  mission.completed ? 'text-success' : 'text-primary'
                )}>
                  <Zap className="w-4 h-4" />
                  +{mission.xp}
                </div>

                {/* Complete Button */}
                {!mission.completed && (
                  <Button 
                    variant="engage" 
                    size="sm"
                    onClick={() => handleCompleteMission(mission.id)}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bonus Reward */}
        <section className="cosmic-card rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Daily Bonus
              </h2>
              <p className="text-sm text-muted-foreground">Complete all missions for bonus XP!</p>
            </div>
            <div className="flex items-center gap-2 text-warning font-mono font-bold">
              <Zap className="w-5 h-5" />
              +150 XP
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary">{completedCount}/{user.dailyMissions.length}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-warning rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / user.dailyMissions.length) * 100}%` }}
              />
            </div>
          </div>

          <Button 
            variant={allCompleted ? "cosmic" : "secondary"}
            className="w-full"
            disabled={!allCompleted}
            onClick={claimBonusReward}
          >
            {allCompleted ? 'Claim Bonus Reward!' : 'Complete All Missions First'}
          </Button>
        </section>
      </main>
    </div>
  );
};

export default MissionsPage;
