import { useState } from 'react';
import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { User, Trophy, Flame, Star, Zap, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { user, planets, resetProgress, updateUserName, getPlanetProgress } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.name);

  const unlockedAchievements = user.achievements.filter(a => a.unlockedAt);
  const totalLessons = planets.reduce((acc, p) => acc + p.lessons.length, 0);
  const completedLessons = user.completedLessonIds.length;

  const handleSaveName = () => {
    if (newName.trim()) {
      updateUserName(newName.trim());
      setIsEditing(false);
      toast.success('Name updated!');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
      resetProgress();
      toast.success('Progress reset. Starting fresh!');
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24 max-w-4xl">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">Profile</h1>
          </div>
          <p className="text-muted-foreground">
            Your Navigator credentials and achievements.
          </p>
        </header>

        {/* Profile Card */}
        <section className="cosmic-card rounded-2xl p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center text-6xl border-4 border-primary/30">
                {user.avatar}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                Lv.{user.level}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="max-w-[200px]"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName}>
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <h2 className="font-display text-2xl font-bold">{user.name}</h2>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
              
              <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                <Star className="w-4 h-4 text-primary" />
                {user.rank}
              </p>

              {/* XP Bar */}
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="text-primary font-mono">{user.xp} / {user.xpToNext} XP</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{ width: `${(user.xp / user.xpToNext) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-display font-bold">{user.xp + (user.level - 1) * 500}</p>
            <p className="text-xs text-muted-foreground">Total XP Earned</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <Flame className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-display font-bold">{user.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-display font-bold">{completedLessons}/{totalLessons}</p>
            <p className="text-xs text-muted-foreground">Lessons Complete</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <Trophy className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-display font-bold">{unlockedAchievements.length}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
        </section>

        {/* Achievements */}
        <section className="cosmic-card rounded-2xl p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Achievements ({unlockedAchievements.length}/{user.achievements.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {user.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  'p-4 rounded-xl transition-all',
                  achievement.unlockedAt 
                    ? 'bg-success/10 border border-success/20' 
                    : 'bg-secondary/50 opacity-50'
                )}
              >
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <p className="font-medium text-sm">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planet Progress */}
        <section className="cosmic-card rounded-2xl p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <h2 className="font-display font-semibold text-lg mb-4">Planet Progress</h2>
          <div className="space-y-4">
            {planets.map((planet) => {
              const progress = getPlanetProgress(planet.id);
              return (
                <div key={planet.id} className={cn(!planet.unlocked && 'opacity-50')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{planet.icon}</span>
                      <span className="font-medium">{planet.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: planet.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Reset Button */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Progress
          </Button>
          <p className="text-xs text-muted-foreground mt-2">This will clear all your data and start fresh.</p>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
