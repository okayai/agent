import { StarField } from '@/components/StarField';
import { Logo } from '@/components/Logo';
import { Navigation } from '@/components/Navigation';
import { UserStats } from '@/components/UserStats';
import { StarMap } from '@/components/StarMap';
import { PlanetCard } from '@/components/PlanetCard';
import { DailyMissions } from '@/components/DailyMissions';
import { QuickActions } from '@/components/QuickActions';
import { KeyboardHint } from '@/components/KeyboardHint';
import { Sparkles, Compass } from 'lucide-react';
import { useUser } from '@/context/UserContext';

const Index = () => {
  const { planets } = useUser();

  // Get first 3 planets for display
  const displayPlanets = planets.slice(0, 3);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Animated star background */}
      <StarField />

      {/* Navigation */}
      <Navigation />

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Compass className="w-6 h-6 text-primary" />
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                Welcome to the Bridge
              </h1>
            </div>
            <p className="text-muted-foreground">
              Your cosmic journey awaits, Navigator. What will you explore today?
            </p>
          </div>
          
          <div className="hidden lg:block">
            <Logo size="lg" />
          </div>
        </header>

        {/* Quick Actions */}
        <section className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <QuickActions />
        </section>

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - User stats */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <UserStats />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <DailyMissions />
            </div>
          </aside>

          {/* Right column - Star Map and Planets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Star Map */}
            <section className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Star Map
                </h2>
                <KeyboardHint keys={['M']} label="Toggle map" />
              </div>
              <StarMap className="cosmic-card" />
            </section>

            {/* Available Planets */}
            <section className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-lg">Learning Modules</h2>
                <span className="text-sm text-muted-foreground">
                  {planets.filter(p => p.unlocked).length} of {planets.length} unlocked
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {displayPlanets.slice(0, 2).map((planet) => (
                  <PlanetCard key={planet.id} planetId={planet.id} />
                ))}
              </div>
              {displayPlanets[2] && (
                <div className="mt-4">
                  <PlanetCard planetId={displayPlanets[2].id} />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer hint */}
        <footer className="mt-12 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm text-muted-foreground">
            Press <kbd className="keyboard-key">?</kbd> for keyboard shortcuts • 
            Data stored in session storage
          </p>
        </footer>
      </main>

      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50 opacity-[0.02]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary to-transparent h-[200%] animate-scan" />
      </div>
    </div>
  );
};

export default Index;
