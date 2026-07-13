import { useParams, useNavigate } from 'react-router-dom';
import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { ArrowLeft, CheckCircle2, Clock, Lock, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const PlanetPage = () => {
  const { planetId } = useParams();
  const navigate = useNavigate();
  const { planets, setCurrentLesson, getPlanetProgress } = useUser();

  const planet = planets.find(p => p.id === planetId);

  if (!planet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Planet not found</p>
      </div>
    );
  }

  const progress = getPlanetProgress(planet.id);
  const completedCount = planet.lessons.filter(l => l.completed).length;

  const handleStartLesson = (lessonId: string) => {
    const lesson = planet.lessons.find(l => l.id === lessonId);
    if (lesson) {
      setCurrentLesson(lesson);
      navigate(`/lesson/${lessonId}`);
    }
  };

  // Check if a lesson is available (previous lesson must be completed or it's the first)
  const isLessonAvailable = (index: number) => {
    if (index === 0) return true;
    return planet.lessons[index - 1].completed;
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/starmap')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 animate-fade-in"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Star Map
        </button>

        {/* Planet Header */}
        <header 
          className="cosmic-card rounded-2xl p-8 mb-8 animate-fade-in"
          style={{ 
            animationDelay: '0.1s',
            background: `linear-gradient(135deg, ${planet.color}15, transparent)` 
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div 
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
              style={{ backgroundColor: `${planet.color}20` }}
            >
              {planet.icon}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-3xl font-bold mb-2">{planet.name}</h1>
              <p className="text-muted-foreground mb-4">{planet.description}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {planet.lessons.length} Missions
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-warning" />
                  {planet.totalXp} Total XP
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {completedCount} Completed
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Planet Progress</span>
              <span style={{ color: planet.color }}>{progress}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: planet.color }}
              />
            </div>
          </div>
        </header>

        {/* Lessons List */}
        <section className="space-y-4">
          <h2 className="font-display font-semibold text-lg mb-4">Missions</h2>
          {planet.lessons.map((lesson, index) => {
            const available = isLessonAvailable(index);
            
            return (
              <div
                key={lesson.id}
                className={cn(
                  'cosmic-card rounded-xl p-5 transition-all duration-300 animate-fade-in',
                  lesson.completed && 'border border-success/30',
                  available && !lesson.completed && 'hover:scale-[1.01] hover:shadow-lg cursor-pointer',
                  !available && 'opacity-50'
                )}
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div 
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-display font-bold',
                      lesson.completed && 'bg-success/20 text-success',
                      available && !lesson.completed && 'bg-primary/20 text-primary',
                      !available && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {lesson.completed ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : available ? (
                      index + 1
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      'font-display font-semibold',
                      lesson.completed && 'line-through opacity-70'
                    )}>
                      {lesson.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lesson.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-warning" />
                        +{lesson.xp} XP
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              i < lesson.difficulty ? 'bg-primary' : 'bg-secondary'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    variant={lesson.completed ? 'secondary' : 'engage'}
                    size="sm"
                    disabled={!available}
                    onClick={() => available && handleStartLesson(lesson.id)}
                  >
                    {lesson.completed ? 'Review' : available ? 'Start' : 'Locked'}
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Completion Message */}
        {progress === 100 && (
          <div className="mt-8 p-6 bg-success/10 border border-success/30 rounded-2xl text-center animate-fade-in">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-display font-semibold text-lg text-success">Planet Conquered!</h3>
            <p className="text-sm text-muted-foreground">You've completed all missions on {planet.name}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanetPage;
