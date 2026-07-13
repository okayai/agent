import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { Rocket, Lock, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const HangarPage = () => {
  const { user, equipCustomization, unlockCustomization, addXp } = useUser();

  const avatars = user.customizations.filter(c => c.type === 'avatar');
  const ships = user.customizations.filter(c => c.type === 'ship');

  const handleEquip = (id: string) => {
    equipCustomization(id);
    toast.success('Equipped!');
  };

  const handleUnlock = (id: string) => {
    // Simulate unlocking with XP cost
    if (user.xp >= 100) {
      unlockCustomization(id);
      addXp(-100);
      toast.success('Unlocked new customization!');
    } else {
      toast.error('Not enough XP! Need 100 XP to unlock.');
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24 max-w-4xl">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">Hangar</h1>
          </div>
          <p className="text-muted-foreground">
            Customize your Navigator avatar and ship.
          </p>
        </header>

        {/* Current Setup Preview */}
        <section className="cosmic-card rounded-2xl p-8 mb-8 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-5xl mb-2 mx-auto border-4 border-primary/30">
                {user.avatar}
              </div>
              <p className="text-sm text-muted-foreground">Your Avatar</p>
            </div>
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <div>
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-5xl mb-2 mx-auto border-4 border-primary/30">
                {ships.find(s => s.equipped)?.icon || '🔵'}
              </div>
              <p className="text-sm text-muted-foreground">Your Ship</p>
            </div>
          </div>
          <p className="mt-6 text-lg font-display font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.rank} • Level {user.level}</p>
        </section>

        {/* Avatars */}
        <section className="mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h2 className="font-display font-semibold text-lg mb-4">Avatars</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                className={cn(
                  'cosmic-card rounded-xl p-4 text-center transition-all duration-300',
                  avatar.equipped && 'border-2 border-primary',
                  !avatar.unlocked && 'opacity-60'
                )}
              >
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 mx-auto',
                  avatar.unlocked ? 'bg-secondary' : 'bg-muted'
                )}>
                  {avatar.unlocked ? avatar.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                </div>
                <p className="font-medium text-sm mb-2">{avatar.name}</p>
                {avatar.equipped ? (
                  <div className="flex items-center justify-center gap-1 text-xs text-success">
                    <Check className="w-3 h-3" />
                    Equipped
                  </div>
                ) : avatar.unlocked ? (
                  <Button size="sm" variant="outline" onClick={() => handleEquip(avatar.id)}>
                    Equip
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleUnlock(avatar.id)}>
                    🔒 100 XP
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Ships */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-semibold text-lg mb-4">Ship Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ships.map((ship) => (
              <div
                key={ship.id}
                className={cn(
                  'cosmic-card rounded-xl p-4 text-center transition-all duration-300',
                  ship.equipped && 'border-2 border-primary',
                  !ship.unlocked && 'opacity-60'
                )}
              >
                <div className={cn(
                  'w-20 h-20 rounded-xl flex items-center justify-center text-4xl mb-3 mx-auto',
                  ship.unlocked ? 'bg-secondary' : 'bg-muted'
                )}>
                  {ship.unlocked ? ship.icon : <Lock className="w-8 h-8 text-muted-foreground" />}
                </div>
                <p className="font-medium text-sm mb-2">{ship.name}</p>
                {ship.equipped ? (
                  <div className="flex items-center justify-center gap-1 text-xs text-success">
                    <Check className="w-3 h-3" />
                    Equipped
                  </div>
                ) : ship.unlocked ? (
                  <Button size="sm" variant="outline" onClick={() => handleEquip(ship.id)}>
                    Equip
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleUnlock(ship.id)}>
                    🔒 100 XP
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <div className="mt-8 p-4 bg-secondary/30 rounded-xl text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <p>Complete lessons and missions to earn XP and unlock more customizations!</p>
          <p className="mt-1">Your current XP: <span className="text-primary font-mono font-bold">{user.xp}</span></p>
        </div>
      </main>
    </div>
  );
};

export default HangarPage;
