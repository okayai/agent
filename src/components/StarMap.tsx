import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

interface StarMapProps {
  className?: string;
}

export const StarMap = ({ className }: StarMapProps) => {
  const navigate = useNavigate();
  const { planets, getPlanetProgress } = useUser();

  const planetPositions: Record<string, { x: number; y: number; size: number }> = {
    keythos: { x: 150, y: 120, size: 35 },
    systemprime: { x: 350, y: 80, size: 45 },
    shortcutaria: { x: 280, y: 220, size: 30 },
    folderis: { x: 480, y: 180, size: 40 },
    gigov: { x: 550, y: 100, size: 50 },
  };

  const orbits = [
    { from: 'keythos', to: 'systemprime' },
    { from: 'keythos', to: 'shortcutaria' },
    { from: 'systemprime', to: 'shortcutaria' },
    { from: 'systemprime', to: 'folderis' },
    { from: 'shortcutaria', to: 'folderis' },
    { from: 'folderis', to: 'gigov' },
  ];

  const mappedPlanets = planets.map(p => ({
    ...p,
    ...planetPositions[p.id],
  }));

  const getPlanetById = (id: string) => mappedPlanets.find(p => p.id === id);

  return (
    <div 
      className={cn('relative w-full h-[320px] overflow-hidden rounded-2xl cursor-pointer', className)}
      onClick={() => navigate('/starmap')}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-deep via-navy-medium to-navy-deep" />
      
      {/* Animated star particles */}
      <div className="absolute inset-0 star-field opacity-50" />

      <svg
        viewBox="0 0 650 320"
        className="relative w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Planet gradients */}
          {mappedPlanets.map((planet) => (
            <radialGradient key={`grad-${planet.id}`} id={`planet-grad-${planet.id}`}>
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
              strokeWidth="1"
              strokeOpacity="0.2"
              strokeDasharray="4 4"
              className="orbit-path"
            />
          );
        })}

        {/* Planets */}
        {mappedPlanets.map((planet) => {
          const progress = getPlanetProgress(planet.id);
          
          return (
            <g
              key={planet.id}
              className={cn(
                'cursor-pointer transition-transform duration-300',
                planet.unlocked ? 'hover:scale-110' : 'opacity-50'
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (planet.unlocked) {
                  navigate(`/planet/${planet.id}`);
                }
              }}
              style={{ transformOrigin: `${planet.x}px ${planet.y}px` }}
            >
              {/* Outer glow */}
              {planet.unlocked && (
                <circle
                  cx={planet.x}
                  cy={planet.y}
                  r={planet.size + 10}
                  fill={`url(#planet-grad-${planet.id})`}
                  opacity="0.3"
                  className="animate-pulse"
                />
              )}

              {/* Progress ring */}
              {planet.unlocked && progress > 0 && (
                <circle
                  cx={planet.x}
                  cy={planet.y}
                  r={planet.size + 3}
                  fill="none"
                  stroke={planet.color}
                  strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 2 * Math.PI * (planet.size + 3)} ${2 * Math.PI * (planet.size + 3)}`}
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
                filter={planet.unlocked ? 'url(#glow)' : undefined}
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
              {planet.unlocked && (
                <text
                  x={planet.x}
                  y={planet.y + 5}
                  textAnchor="middle"
                  fontSize={planet.size * 0.5}
                >
                  {planet.icon}
                </text>
              )}

              {/* Planet name */}
              <text
                x={planet.x}
                y={planet.y + planet.size + 20}
                textAnchor="middle"
                fill={planet.unlocked ? 'white' : '#6B7280'}
                fontSize="10"
                fontFamily="Space Grotesk"
                fontWeight="600"
                letterSpacing="0.1em"
              >
                {planet.name}
              </text>

              {/* Lock icon for locked planets */}
              {!planet.unlocked && (
                <text
                  x={planet.x}
                  y={planet.y + 5}
                  textAnchor="middle"
                  fill="#6B7280"
                  fontSize="16"
                >
                  🔒
                </text>
              )}
            </g>
          );
        })}

        {/* Your ship indicator */}
        <g className="animate-float">
          <circle cx="100" cy="160" r="8" fill="#00D4FF" filter="url(#glow)" />
          <text x="100" y="185" textAnchor="middle" fill="white" fontSize="9" fontFamily="Space Grotesk">
            YOU
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Unlocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span>Locked</span>
        </div>
      </div>

      {/* Click hint */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        Click to explore →
      </div>
    </div>
  );
};
