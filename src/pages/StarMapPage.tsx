import { useNavigate } from 'react-router-dom';
import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  unlocked: boolean;
}

const StarMapPage = () => {
  const navigate = useNavigate();
  const { planets, getPlanetProgress } = useUser();

  const planetPositions: Record<string, { x: number; y: number; size: number }> = {
    keythos: { x: 150, y: 140, size: 40 },
    systemprime: { x: 350, y: 100, size: 50 },
    shortcutaria: { x: 280, y: 250, size: 35 },
    folderis: { x: 500, y: 200, size: 45 },
    gigov: { x: 580, y: 120, size: 55 },
  };

  const orbits = [
    { from: 'keythos', to: 'systemprime' },
    { from: 'keythos', to: 'shortcutaria' },
    { from: 'systemprime', to: 'shortcutaria' },
    { from: 'systemprime', to: 'folderis' },
    { from: 'shortcutaria', to: 'folderis' },
    { from: 'shortcutaria', to: 'gigov' },
    { from: 'folderis', to: 'gigov' },
  ];

  const mappedPlanets: Planet[] = planets.map(p => ({
    id: p.id,
    name: p.name,
    ...planetPositions[p.id],
    color: p.color,
    unlocked: p.unlocked,
  }));

  const getPlanetById = (id: string) => mappedPlanets.find(p => p.id === id);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold">Star Map</h1>
          </div>
          <p className="text-muted-foreground">
            Navigate the Digital Cosmos. Click a planet to explore its lessons.
          </p>
        </header>

        {/* Interactive Star Map */}
        <div className="cosmic-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy-medium to-navy-deep rounded-xl" />
            
            {/* Star particles */}
            <div className="absolute inset-0 star-field opacity-50" />

            <svg
              viewBox="0 0 700 400"
              className="relative w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="glow-map" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {mappedPlanets.map((planet) => (
                  <radialGradient key={`grad-${planet.id}`} id={`planet-grad-map-${planet.id}`}>
                    <stop offset="0%" stopColor={planet.color} stopOpacity="1" />
                    <stop offset="70%" stopColor={planet.color} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={planet.color} stopOpacity="0.2" />
                  </radialGradient>
                ))}
              </defs>

              {/* Orbit paths */}
              {orbits.map((orbit, i) => {
                const from = getPlanetById(orbit.from);
                const to = getPlanetById(orbit.to);
                if (!from || !to) return null;

                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="hsl(191, 100%, 50%)"
                    strokeWidth="1.5"
                    strokeOpacity="0.2"
                    strokeDasharray="6 6"
                    className="orbit-path"
                  />
                );
              })}

              {/* Planets */}
              {mappedPlanets.map((planet) => {
                const progress = getPlanetProgress(planet.id);
                const originalPlanet = planets.find(p => p.id === planet.id);
                
                return (
                  <g
                    key={planet.id}
                    className={cn(
                      'transition-transform duration-300',
                      planet.unlocked ? 'cursor-pointer hover:scale-110' : 'opacity-50'
                    )}
                    onClick={() => planet.unlocked && navigate(`/planet/${planet.id}`)}
                    style={{ transformOrigin: `${planet.x}px ${planet.y}px` }}
                  >
                    {/* Outer glow */}
                    {planet.unlocked && (
                      <circle
                        cx={planet.x}
                        cy={planet.y}
                        r={planet.size + 15}
                        fill={`url(#planet-grad-map-${planet.id})`}
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Progress ring */}
                    {planet.unlocked && progress > 0 && (
                      <circle
                        cx={planet.x}
                        cy={planet.y}
                        r={planet.size + 5}
                        fill="none"
                        stroke={planet.color}
                        strokeWidth="3"
                        strokeDasharray={`${(progress / 100) * 2 * Math.PI * (planet.size + 5)} ${2 * Math.PI * (planet.size + 5)}`}
                        transform={`rotate(-90 ${planet.x} ${planet.y})`}
                        opacity="0.8"
                      />
                    )}

                    {/* Planet body */}
                    <circle
                      cx={planet.x}
                      cy={planet.y}
                      r={planet.size}
                      fill={planet.unlocked ? planet.color : '#374151'}
                      filter={planet.unlocked ? 'url(#glow-map)' : undefined}
                      opacity={planet.unlocked ? 1 : 0.4}
                    />

                    {/* Planet highlight */}
                    <circle
                      cx={planet.x - planet.size * 0.3}
                      cy={planet.y - planet.size * 0.3}
                      r={planet.size * 0.25}
                      fill="white"
                      opacity={planet.unlocked ? 0.3 : 0.1}
                    />

                    {/* Planet icon */}
                    {planet.unlocked && originalPlanet && (
                      <text
                        x={planet.x}
                        y={planet.y + 6}
                        textAnchor="middle"
                        fontSize={planet.size * 0.6}
                      >
                        {originalPlanet.icon}
                      </text>
                    )}

                    {/* Lock icon for locked planets */}
                    {!planet.unlocked && (
                      <text
                        x={planet.x}
                        y={planet.y + 6}
                        textAnchor="middle"
                        fill="#6B7280"
                        fontSize="20"
                      >
                        🔒
                      </text>
                    )}

                    {/* Planet name */}
                    <text
                      x={planet.x}
                      y={planet.y + planet.size + 24}
                      textAnchor="middle"
                      fill={planet.unlocked ? 'white' : '#6B7280'}
                      fontSize="12"
                      fontFamily="Space Grotesk"
                      fontWeight="600"
                      letterSpacing="0.1em"
                    >
                      {planet.name}
                    </text>

                    {/* Progress text */}
                    {planet.unlocked && progress > 0 && (
                      <text
                        x={planet.x}
                        y={planet.y + planet.size + 40}
                        textAnchor="middle"
                        fill={planet.color}
                        fontSize="10"
                        fontFamily="JetBrains Mono"
                      >
                        {progress}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Your ship indicator */}
              <g className="animate-float">
                <circle cx="80" cy="200" r="10" fill="#00D4FF" filter="url(#glow-map)" />
                <text x="80" y="230" textAnchor="middle" fill="white" fontSize="10" fontFamily="Space Grotesk">
                  YOU
                </text>
              </g>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Unlocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span>Locked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-success" />
                <span>Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Planet List */}
        <section className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-semibold text-lg mb-4">All Planets</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planets.map(planet => {
              const progress = getPlanetProgress(planet.id);
              return (
                <button
                  key={planet.id}
                  onClick={() => planet.unlocked && navigate(`/planet/${planet.id}`)}
                  disabled={!planet.unlocked}
                  className={cn(
                    'cosmic-card rounded-xl p-5 text-left transition-all duration-300',
                    planet.unlocked 
                      ? 'hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: planet.unlocked ? `${planet.color}20` : undefined }}
                    >
                      {planet.unlocked ? planet.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold">{planet.name}</h3>
                      <p className="text-xs text-muted-foreground">{planet.lessons.length} Missions</p>
                      {planet.unlocked && progress > 0 && (
                        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress}%`, backgroundColor: planet.color }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StarMapPage;
