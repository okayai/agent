import { useState, useRef, useEffect } from 'react';
import { StarField } from '@/components/StarField';
import { Navigation } from '@/components/Navigation';
import { useUser } from '@/context/UserContext';
import { Terminal, ChevronRight, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success';
  content: string;
  timestamp: Date;
}

const commands: Record<string, { description: string; action: (args: string[]) => string }> = {
  help: {
    description: 'Show available commands',
    action: () => `Available commands:
  help          - Show this help message
  clear         - Clear the terminal
  whoami        - Display current user info
  status        - Show your learning progress
  xp            - Display current XP and level
  streak        - Show your current streak
  planets       - List all planets
  missions      - Show daily missions status
  achievements  - List your achievements
  time          - Display current time
  echo [text]   - Echo back text
  ascii         - Display ASCII art
  matrix        - Toggle matrix mode
  motivate      - Get a motivational quote`,
  },
  clear: {
    description: 'Clear the terminal',
    action: () => 'CLEAR',
  },
  whoami: {
    description: 'Display current user',
    action: () => '', // Will be filled dynamically
  },
  status: {
    description: 'Show learning progress',
    action: () => '', // Will be filled dynamically
  },
  xp: {
    description: 'Display XP and level',
    action: () => '', // Will be filled dynamically
  },
  streak: {
    description: 'Show current streak',
    action: () => '', // Will be filled dynamically
  },
  planets: {
    description: 'List all planets',
    action: () => '', // Will be filled dynamically
  },
  missions: {
    description: 'Show missions status',
    action: () => '', // Will be filled dynamically
  },
  achievements: {
    description: 'List achievements',
    action: () => '', // Will be filled dynamically
  },
  time: {
    description: 'Display current time',
    action: () => new Date().toLocaleString(),
  },
  echo: {
    description: 'Echo text',
    action: (args) => args.join(' ') || 'Usage: echo [text]',
  },
  ascii: {
    description: 'Display ASCII art',
    action: () => `
   _____ _____ _      _    _ _      ____  
  / ____|_   _| |    | |  | | |    / __ \\ 
 | (___   | | | |    | |  | | |   | |  | |
  \\___ \\  | | | |    | |  | | |   | |  | |
  ____) |_| |_| |____| |__| | |___| |__| |
 |_____/|_____|______|\\____/|______\\____/ 
                                          
  Welcome to the Digital Cosmos, Navigator!
  `,
  },
  matrix: {
    description: 'Toggle matrix mode',
    action: () => 'MATRIX',
  },
  motivate: {
    description: 'Get motivation',
    action: () => {
      const quotes = [
        '"The only way to do great work is to love what you do." - Steve Jobs',
        '"Code is like humor. When you have to explain it, it\'s bad." - Cory House',
        '"First, solve the problem. Then, write the code." - John Johnson',
        '"The best error message is the one that never shows up." - Thomas Fuchs',
        '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler',
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    },
  },
};

const TerminalPage = () => {
  const { user, planets, addTerminalCommand, addXp } = useUser();
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', content: 'SILULO Terminal v1.0.0', timestamp: new Date() },
    { type: 'output', content: 'Type "help" for available commands.', timestamp: new Date() },
    { type: 'output', content: '', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [matrixMode, setMatrixMode] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    addTerminalCommand(cmd);
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Add input line
    setLines(prev => [...prev, { type: 'input', content: `> ${cmd}`, timestamp: new Date() }]);

    if (!command) return;

    let output = '';
    let type: 'output' | 'error' | 'success' = 'output';

    // Dynamic commands that need user context
    if (command === 'whoami') {
      output = `Navigator: ${user.name}
Rank: ${user.rank}
Level: ${user.level}
Status: Active`;
      type = 'success';
    } else if (command === 'status') {
      output = `=== Learning Status ===
Lessons Completed: ${user.totalLessonsCompleted}
Current Streak: ${user.streak} days
Total XP: ${user.xp}
Level: ${user.level} (${user.rank})`;
      type = 'success';
    } else if (command === 'xp') {
      output = `XP: ${user.xp} / ${user.xpToNext}
Level: ${user.level}
Progress: ${Math.round((user.xp / user.xpToNext) * 100)}%`;
      type = 'success';
    } else if (command === 'streak') {
      const flames = '🔥'.repeat(Math.min(user.streak, 10));
      output = `Current Streak: ${user.streak} days ${flames}`;
      type = 'success';
    } else if (command === 'planets') {
      output = planets.map(p => 
        `${p.unlocked ? '🟢' : '🔒'} ${p.name} - ${p.lessons.filter(l => l.completed).length}/${p.lessons.length} lessons`
      ).join('\n');
      type = 'output';
    } else if (command === 'missions') {
      const completed = user.dailyMissions.filter(m => m.completed).length;
      output = `Daily Missions: ${completed}/${user.dailyMissions.length}\n` +
        user.dailyMissions.map(m => 
          `${m.completed ? '✅' : '⬜'} ${m.title} (+${m.xp} XP)`
        ).join('\n');
      type = 'output';
    } else if (command === 'achievements') {
      const unlocked = user.achievements.filter(a => a.unlockedAt);
      output = `Achievements: ${unlocked.length}/${user.achievements.length}\n` +
        user.achievements.map(a => 
          `${a.unlockedAt ? '🏆' : '🔒'} ${a.icon} ${a.name}`
        ).join('\n');
      type = 'output';
    } else if (command === 'clear') {
      setLines([]);
      return;
    } else if (command === 'matrix') {
      setMatrixMode(prev => !prev);
      output = matrixMode ? 'Matrix mode disabled.' : 'Matrix mode enabled. 🟢';
      type = 'success';
    } else if (commands[command]) {
      output = commands[command].action(args);
      type = 'success';
    } else {
      output = `Command not found: ${command}\nType "help" for available commands.`;
      type = 'error';
    }

    setLines(prev => [...prev, { type, content: output, timestamp: new Date() }]);

    // Small XP reward for using terminal
    if (commands[command] && command !== 'help') {
      addXp(5);
      toast.success('+5 XP for using terminal!', { duration: 1500 });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pb-24 md:pb-8 pt-6 md:pt-24 max-w-4xl">
        <header className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="w-6 h-6 text-primary" />
              <h1 className="font-display text-2xl md:text-3xl font-bold">Terminal</h1>
            </div>
            <p className="text-muted-foreground">
              Practice commands and earn XP. Type "help" to start.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLines([])}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => executeCommand('help')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Show help"
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Terminal Window */}
        <div 
          className={cn(
            'cosmic-card rounded-2xl overflow-hidden animate-fade-in',
            matrixMode && 'border-green-500/50'
          )}
          style={{ animationDelay: '0.1s' }}
        >
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
            </div>
            <span className="text-xs text-muted-foreground font-mono ml-2">silulo@navigator:~</span>
          </div>

          {/* Terminal Body */}
          <div 
            ref={terminalRef}
            className={cn(
              'h-[400px] md:h-[500px] overflow-y-auto p-4 font-mono text-sm',
              matrixMode ? 'bg-black text-green-500' : 'bg-navy-deep'
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((line, i) => (
              <div 
                key={i} 
                className={cn(
                  'whitespace-pre-wrap mb-1',
                  line.type === 'input' && (matrixMode ? 'text-green-300' : 'text-primary'),
                  line.type === 'error' && 'text-destructive',
                  line.type === 'success' && (matrixMode ? 'text-green-400' : 'text-success'),
                  line.type === 'output' && (matrixMode ? 'text-green-500' : 'text-foreground')
                )}
              >
                {line.content}
              </div>
            ))}

            {/* Input Line */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <ChevronRight className={cn(
                'w-4 h-4 flex-shrink-0',
                matrixMode ? 'text-green-500' : 'text-primary'
              )} />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  'flex-1 bg-transparent outline-none font-mono',
                  matrixMode ? 'text-green-300 caret-green-500' : 'text-foreground caret-primary'
                )}
                placeholder="Type a command..."
                autoFocus
              />
            </form>
          </div>
        </div>

        {/* Command Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-primary">{user.terminalCommands.length}</p>
            <p className="text-xs text-muted-foreground">Commands Executed</p>
          </div>
          <div className="cosmic-card rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-success">
              {user.terminalCommands.length >= 20 ? '✅' : `${user.terminalCommands.length}/20`}
            </p>
            <p className="text-xs text-muted-foreground">Terminal Master</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TerminalPage;
