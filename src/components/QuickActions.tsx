import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Gamepad2, Award } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

interface QuickActionsProps {
  className?: string;
}

export const QuickActions = ({ className }: QuickActionsProps) => {
  const navigate = useNavigate();
  const { planets, user } = useUser();

  // Find the first incomplete lesson to continue
  const findNextLesson = () => {
    for (const planet of planets) {
      if (!planet.unlocked) continue;
      const nextLesson = planet.lessons.find(l => !l.completed);
      if (nextLesson) {
        return { planet, lesson: nextLesson };
      }
    }
    return null;
  };

  const nextLesson = findNextLesson();

  const actions = [
    {
      id: 'continue',
      label: nextLesson ? 'Continue Learning' : 'All Complete!',
      description: nextLesson ? `${nextLesson.lesson.title}` : 'Review lessons',
      icon: Play,
      color: 'primary',
      onClick: () => nextLesson ? navigate(`/lesson/${nextLesson.lesson.id}`) : navigate('/starmap'),
    },
    {
      id: 'practice',
      label: 'Quick Practice',
      description: 'Terminal commands',
      icon: Gamepad2,
      color: 'warning',
      onClick: () => navigate('/terminal'),
    },
    {
      id: 'lessons',
      label: 'Browse Lessons',
      description: 'Explore all modules',
      icon: BookOpen,
      color: 'success',
      onClick: () => navigate('/starmap'),
    },
    {
      id: 'achievements',
      label: 'Achievements',
      description: `${user.achievements.filter(a => a.unlockedAt).length}/${user.achievements.length} earned`,
      icon: Award,
      color: 'accent',
      onClick: () => navigate('/profile'),
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {actions.map(({ id, label, description, icon: Icon, color, onClick }) => (
        <Button
          key={id}
          variant="outline"
          className={cn(
            'h-auto flex-col items-start gap-3 p-5 hover:border-primary/50',
            'bg-card hover:bg-secondary/50 transition-all duration-300'
          )}
          onClick={onClick}
        >
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            color === 'primary' && 'bg-primary/20 text-primary',
            color === 'warning' && 'bg-warning/20 text-warning',
            color === 'success' && 'bg-success/20 text-success',
            color === 'accent' && 'bg-accent/20 text-accent-foreground'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-display font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </Button>
      ))}
    </div>
  );
};
