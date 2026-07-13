import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StarField } from '@/components/StarField';
import { useUser } from '@/context/UserContext';
import { ArrowLeft, ArrowRight, CheckCircle2, Zap, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const LessonPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { planets, completeLesson, currentLesson, setCurrentLesson } = useUser();

  const [currentStep, setCurrentStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingChallenge, setIsTypingChallenge] = useState(false);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  // Find the lesson
  const lesson = planets.flatMap(p => p.lessons).find(l => l.id === lessonId) || currentLesson;
  const planet = planets.find(p => p.id === lesson?.planetId);

  useEffect(() => {
    if (!lesson) {
      navigate('/starmap');
    }
  }, [lesson, navigate]);

  if (!lesson || !planet) {
    return null;
  }

  const content = lesson.content;
  const totalSteps = content.length;
  const isLastStep = currentStep === totalSteps - 1;
  const currentContent = content[currentStep];

  // Check if current step is a typing challenge
  const typingTarget = currentContent.startsWith('Type:') 
    ? currentContent.replace('Type:', '').trim() 
    : null;

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!typingTarget || challengeComplete) return;

    // Start timer on first keypress
    if (!startTime) {
      setStartTime(Date.now());
    }

    if (e.key === 'Backspace') {
      setTypedText(prev => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      const newText = typedText + e.key;
      setTypedText(newText);

      // Check if complete
      if (newText === typingTarget) {
        setChallengeComplete(true);
        const timeInMinutes = (Date.now() - (startTime || Date.now())) / 60000;
        const wordCount = typingTarget.split(' ').length;
        const calculatedWpm = Math.round(wordCount / timeInMinutes);
        setWpm(calculatedWpm);
        toast.success('Perfect! Challenge complete!');
      }
    }
  }, [typingTarget, typedText, challengeComplete, startTime]);

  useEffect(() => {
    if (typingTarget) {
      setIsTypingChallenge(true);
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    } else {
      setIsTypingChallenge(false);
      setChallengeComplete(false);
      setTypedText('');
      setStartTime(null);
    }
  }, [currentStep, typingTarget, handleKeyPress]);

  const handleNext = () => {
    if (isTypingChallenge && !challengeComplete) {
      toast.error('Complete the typing challenge first!');
      return;
    }

    if (isLastStep) {
      // Complete the lesson
      completeLesson(lesson.id);
      setCurrentLesson(null);
      toast.success(`Lesson Complete! +${lesson.xp} XP`, {
        description: lesson.title,
      });
      navigate(`/planet/${planet.id}`);
    } else {
      setCurrentStep(prev => prev + 1);
      setTypedText('');
      setChallengeComplete(false);
      setStartTime(null);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setTypedText('');
      setChallengeComplete(false);
      setStartTime(null);
    }
  };

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress on this lesson will be lost.')) {
      setCurrentLesson(null);
      navigate(`/planet/${planet.id}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />

      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm font-medium">{lesson.title}</p>
              <p className="text-xs text-muted-foreground">{planet.name}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-warning" />
              +{lesson.xp} XP
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1}/{totalSteps}
              </span>
              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 pt-24 pb-32 max-w-3xl">
        <div className="cosmic-card rounded-2xl p-8 animate-fade-in" key={currentStep}>
          {/* Lesson Content */}
          {!isTypingChallenge ? (
            <div className="text-center">
              <div className="text-6xl mb-6">{planet.icon}</div>
              <p className="text-xl font-display leading-relaxed">{currentContent}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Keyboard className="w-6 h-6 text-primary" />
                <h2 className="font-display text-xl font-semibold">Typing Challenge</h2>
              </div>

              {/* Target Text */}
              <div className="bg-secondary/50 rounded-xl p-6 mb-6 font-mono text-lg text-center">
                {typingTarget?.split('').map((char, i) => (
                  <span
                    key={i}
                    className={cn(
                      i < typedText.length
                        ? typedText[i] === char
                          ? 'text-success'
                          : 'text-destructive bg-destructive/20'
                        : i === typedText.length
                        ? 'bg-primary/30'
                        : 'text-muted-foreground'
                    )}
                  >
                    {char}
                  </span>
                ))}
              </div>

              {/* Typed Text Display */}
              <div className="bg-card rounded-xl p-4 border border-border min-h-[60px] font-mono text-center">
                {typedText || <span className="text-muted-foreground">Start typing...</span>}
                <span className="animate-pulse">|</span>
              </div>

              {/* Stats */}
              {challengeComplete && (
                <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-xl text-center animate-scale-in">
                  <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="font-display font-semibold text-success">Challenge Complete!</p>
                  <p className="text-sm text-muted-foreground">Speed: {wpm} WPM</p>
                </div>
              )}

              {!challengeComplete && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Type the text above exactly as shown
                </p>
              )}
            </div>
          )}
        </div>

        {/* A.L.I. Assistant */}
        <div className="mt-6 flex items-start gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
            🤖
          </div>
          <div className="cosmic-card rounded-xl rounded-tl-none p-4 flex-1">
            <p className="text-sm font-medium text-primary mb-1">A.L.I. Assistant</p>
            <p className="text-sm text-muted-foreground">
              {isTypingChallenge
                ? challengeComplete
                  ? "Excellent work, Navigator! You've mastered this challenge. Click 'Next' to continue."
                  : "Focus on accuracy first, then build up your speed. You can do this!"
                : "Take your time to understand this concept. When ready, click 'Next' to continue."}
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="engage"
            onClick={handleNext}
            disabled={isTypingChallenge && !challengeComplete}
          >
            {isLastStep ? (
              <>
                Complete
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default LessonPage;
