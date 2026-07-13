import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useSessionStorage } from '@/hooks/useSessionStorage';

// Types
export interface Mission {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: 'daily' | 'challenge' | 'boss';
  completed: boolean;
  completedAt?: string;
}

export interface Lesson {
  id: string;
  planetId: string;
  title: string;
  description: string;
  xp: number;
  duration: string;
  difficulty: number;
  completed: boolean;
  content: string[];
}

export interface Planet {
  id: string;
  name: string;
  description: string;
  icon: string;
  totalXp: number;
  lessons: Lesson[];
  unlocked: boolean;
  color: string;
  requiredPlanet?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface Customization {
  id: string;
  name: string;
  type: 'avatar' | 'ship' | 'keycap' | 'background';
  icon: string;
  unlocked: boolean;
  equipped: boolean;
}

export interface UserProgress {
  name: string;
  avatar: string;
  rank: string;
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  lastLoginDate: string;
  totalLessonsCompleted: number;
  totalTimeSpent: number;
  dailyMissions: Mission[];
  achievements: Achievement[];
  customizations: Customization[];
  completedLessonIds: string[];
  terminalCommands: string[];
}

interface UserContextType {
  user: UserProgress;
  planets: Planet[];
  currentPlanet: Planet | null;
  currentLesson: Lesson | null;
  setCurrentPlanet: (planet: Planet | null) => void;
  setCurrentLesson: (lesson: Lesson | null) => void;
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string) => void;
  completeMission: (missionId: string) => void;
  updateStreak: () => void;
  updateUserName: (name: string) => void;
  equipCustomization: (id: string) => void;
  unlockCustomization: (id: string) => void;
  addTerminalCommand: (command: string) => void;
  resetProgress: () => void;
  getPlanetProgress: (planetId: string) => number;
  unlockAchievement: (achievementId: string) => void;
}

const defaultMissions: Mission[] = [
  { id: 'daily-1', title: 'Speed Typing', description: 'Complete 3 typing exercises', xp: 50, type: 'daily', completed: false },
  { id: 'daily-2', title: 'Shortcut Master', description: 'Use 10 keyboard shortcuts', xp: 75, type: 'daily', completed: false },
  { id: 'daily-3', title: 'File Navigator', description: 'Complete file management lesson', xp: 100, type: 'daily', completed: false },
];

const defaultAchievements: Achievement[] = [
  { id: 'first-lesson', name: 'First Steps', description: 'Complete your first lesson', icon: '🚀' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥' },
  { id: 'level-5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'planet-complete', name: 'Planet Conqueror', description: 'Complete all lessons on a planet', icon: '🌍' },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Type 50 WPM in a lesson', icon: '⚡' },
  { id: 'terminal-master', name: 'Terminal Master', description: 'Execute 20 terminal commands', icon: '💻' },
];

const defaultCustomizations: Customization[] = [
  { id: 'avatar-astronaut', name: 'Astronaut', type: 'avatar', icon: '🧑‍🚀', unlocked: true, equipped: true },
  { id: 'avatar-hacker', name: 'Hacker', type: 'avatar', icon: '👨‍💻', unlocked: false, equipped: false },
  { id: 'avatar-executive', name: 'Executive', type: 'avatar', icon: '👔', unlocked: false, equipped: false },
  { id: 'avatar-alien', name: 'Alien', type: 'avatar', icon: '👽', unlocked: false, equipped: false },
  { id: 'ship-blue', name: 'Nebula Blue', type: 'ship', icon: '🔵', unlocked: true, equipped: true },
  { id: 'ship-gold', name: 'Solar Gold', type: 'ship', icon: '🟡', unlocked: false, equipped: false },
  { id: 'ship-red', name: 'Mars Red', type: 'ship', icon: '🔴', unlocked: false, equipped: false },
];

const defaultPlanets: Planet[] = [
  {
    id: 'keythos',
    name: 'KEY-THOS',
    description: 'Master the fundamentals of keyboard navigation and typing techniques.',
    icon: '⌨️',
    totalXp: 500,
    color: '#00D4FF',
    unlocked: true,
    lessons: [
      { id: 'keythos-1', planetId: 'keythos', title: 'Home Row Basics', description: 'Learn the ASDF JKL; home row position', xp: 50, duration: '5 min', difficulty: 1, completed: false, content: ['Place your fingers on ASDF with your left hand', 'Place your fingers on JKL; with your right hand', 'Keep your wrists relaxed and elevated', 'Type: asdf jkl; asdf jkl;'] },
      { id: 'keythos-2', planetId: 'keythos', title: 'Top Row Typing', description: 'Master QWERTY and UIOP keys', xp: 75, duration: '8 min', difficulty: 1, completed: false, content: ['Reach up from home row for Q W E R T', 'Reach up for Y U I O P', 'Return to home row after each reach', 'Type: qwer tyui qwer tyui'] },
      { id: 'keythos-3', planetId: 'keythos', title: 'Bottom Row Mastery', description: 'Conquer ZXCV and NM keys', xp: 75, duration: '8 min', difficulty: 2, completed: false, content: ['Reach down from home row for Z X C V B', 'Reach down for N M , . /', 'Maintain proper finger positioning', 'Type: zxcv nm,. zxcv nm,.'] },
      { id: 'keythos-4', planetId: 'keythos', title: 'Number Row', description: 'Type numbers 1-0 efficiently', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Numbers are above the top row', 'Use the finger directly below each number', '1 uses pinky, 5 uses index finger', 'Type: 12345 67890 12345 67890'] },
      { id: 'keythos-5', planetId: 'keythos', title: 'Shift Key Techniques', description: 'Learn capital letters and symbols', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Use opposite hand Shift for capitals', 'Hold Shift while pressing the letter', 'Release Shift immediately after', 'Type: AsDf JkL; AsDf JkL;'] },
      { id: 'keythos-6', planetId: 'keythos', title: 'Speed Challenge', description: 'Test your typing speed', xp: 100, duration: '5 min', difficulty: 3, completed: false, content: ['Type the following passage as quickly as possible', 'Focus on accuracy first, then speed', 'The quick brown fox jumps over the lazy dog', 'Type: The quick brown fox jumps over the lazy dog'] },
    ],
  },
  {
    id: 'systemprime',
    name: 'SYS-TEMPRIME',
    description: 'Explore operating system fundamentals and essential computer operations.',
    icon: '🖥️',
    totalXp: 750,
    color: '#88E1F9',
    unlocked: true,
    lessons: [
      { id: 'sys-1', planetId: 'systemprime', title: 'Desktop Navigation', description: 'Learn to navigate your desktop environment', xp: 75, duration: '8 min', difficulty: 1, completed: false, content: ['The desktop is your main workspace', 'Icons represent files and applications', 'Double-click to open items', 'Right-click for context menus'] },
      { id: 'sys-2', planetId: 'systemprime', title: 'Window Management', description: 'Master window controls and multitasking', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Minimize: hides window to taskbar', 'Maximize: fills the screen', 'Close: ends the application', 'Drag title bar to move windows'] },
      { id: 'sys-3', planetId: 'systemprime', title: 'File Explorer Basics', description: 'Navigate folders and files', xp: 100, duration: '12 min', difficulty: 2, completed: false, content: ['File Explorer shows your files', 'Folders organize your files', 'Double-click folders to open', 'Use back button to return'] },
      { id: 'sys-4', planetId: 'systemprime', title: 'Creating & Organizing', description: 'Create folders and organize files', xp: 125, duration: '15 min', difficulty: 2, completed: false, content: ['Right-click > New > Folder', 'Name folders descriptively', 'Drag files into folders', 'Use subfolders for organization'] },
      { id: 'sys-5', planetId: 'systemprime', title: 'Copy, Cut & Paste', description: 'Move and duplicate files', xp: 150, duration: '12 min', difficulty: 2, completed: false, content: ['Ctrl+C copies selected items', 'Ctrl+X cuts (moves) items', 'Ctrl+V pastes items', 'Right-click for menu options'] },
      { id: 'sys-6', planetId: 'systemprime', title: 'Search & Find', description: 'Find files and applications quickly', xp: 100, duration: '8 min', difficulty: 1, completed: false, content: ['Windows key opens Start menu', 'Type to search instantly', 'Use File Explorer search bar', 'Ctrl+F searches within apps'] },
      { id: 'sys-7', planetId: 'systemprime', title: 'System Settings', description: 'Customize your computer', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Settings app controls your PC', 'Personalization changes appearance', 'Display settings adjust screen', 'Sound settings control audio'] },
    ],
  },
  {
    id: 'shortcutaria',
    name: 'SHORTCUTARIA',
    description: 'Unlock the power of keyboard shortcuts to boost your productivity.',
    icon: '⚡',
    totalXp: 600,
    color: '#F59E0B',
    unlocked: false,
    requiredPlanet: 'keythos',
    lessons: [
      { id: 'short-1', planetId: 'shortcutaria', title: 'Essential Shortcuts', description: 'Learn Ctrl+C, Ctrl+V, Ctrl+Z', xp: 75, duration: '8 min', difficulty: 1, completed: false, content: ['Ctrl+C: Copy selected content', 'Ctrl+V: Paste copied content', 'Ctrl+Z: Undo last action', 'Ctrl+Y: Redo undone action'] },
      { id: 'short-2', planetId: 'shortcutaria', title: 'Navigation Shortcuts', description: 'Move faster with keyboard', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Alt+Tab: Switch windows', 'Win+D: Show desktop', 'Win+E: Open File Explorer', 'Win+L: Lock computer'] },
      { id: 'short-3', planetId: 'shortcutaria', title: 'Text Editing Power', description: 'Edit text like a pro', xp: 100, duration: '12 min', difficulty: 2, completed: false, content: ['Ctrl+A: Select all', 'Ctrl+B: Bold text', 'Ctrl+I: Italic text', 'Ctrl+U: Underline text'] },
      { id: 'short-4', planetId: 'shortcutaria', title: 'Browser Mastery', description: 'Navigate browsers efficiently', xp: 125, duration: '15 min', difficulty: 2, completed: false, content: ['Ctrl+T: New tab', 'Ctrl+W: Close tab', 'Ctrl+Tab: Next tab', 'Ctrl+L: Focus address bar'] },
      { id: 'short-5', planetId: 'shortcutaria', title: 'Advanced Shortcuts', description: 'Power user techniques', xp: 100, duration: '10 min', difficulty: 3, completed: false, content: ['Win+Shift+S: Screenshot', 'Ctrl+Shift+Esc: Task Manager', 'Win+Arrow: Snap windows', 'Alt+F4: Close application'] },
      { id: 'short-6', planetId: 'shortcutaria', title: 'Shortcut Challenge', description: 'Test your shortcut knowledge', xp: 100, duration: '5 min', difficulty: 3, completed: false, content: ['Complete the shortcut challenge', 'Type the correct shortcut for each action', 'Speed and accuracy both matter', 'Good luck, Navigator!'] },
    ],
  },
  {
    id: 'folderis',
    name: 'FOLDERIS',
    description: 'Master file management and organizational strategies.',
    icon: '📁',
    totalXp: 650,
    color: '#10B981',
    unlocked: false,
    requiredPlanet: 'systemprime',
    lessons: [
      { id: 'folder-1', planetId: 'folderis', title: 'Folder Hierarchy', description: 'Understand folder structures', xp: 75, duration: '8 min', difficulty: 1, completed: false, content: ['Folders contain files and subfolders', 'Create logical hierarchies', 'Use descriptive folder names', 'Avoid deeply nested structures'] },
      { id: 'folder-2', planetId: 'folderis', title: 'File Naming Best Practices', description: 'Name files effectively', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Use descriptive names', 'Include dates: YYYY-MM-DD', 'Avoid special characters', 'Use underscores or hyphens'] },
      { id: 'folder-3', planetId: 'folderis', title: 'Cloud Storage Basics', description: 'Use cloud services safely', xp: 125, duration: '12 min', difficulty: 2, completed: false, content: ['Cloud stores files online', 'Syncs across devices', 'OneDrive, Google Drive, Dropbox', 'Backup important files'] },
      { id: 'folder-4', planetId: 'folderis', title: 'File Types & Extensions', description: 'Understand file formats', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['.txt: Plain text files', '.docx: Word documents', '.pdf: Portable documents', '.jpg/.png: Image files'] },
      { id: 'folder-5', planetId: 'folderis', title: 'Backup Strategies', description: 'Protect your data', xp: 150, duration: '15 min', difficulty: 3, completed: false, content: ['3-2-1 backup rule', '3 copies of data', '2 different storage types', '1 offsite backup'] },
      { id: 'folder-6', planetId: 'folderis', title: 'Clean Up & Archive', description: 'Maintain organized files', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Delete unnecessary files', 'Archive old projects', 'Empty Recycle Bin regularly', 'Review files monthly'] },
    ],
  },
  {
    id: 'gigov',
    name: 'GIGO-V',
    description: 'Understand core computing concepts and digital literacy principles.',
    icon: '🧠',
    totalXp: 800,
    color: '#8B5CF6',
    unlocked: false,
    requiredPlanet: 'shortcutaria',
    lessons: [
      { id: 'gigo-1', planetId: 'gigov', title: 'GIGO Principle', description: 'Garbage In, Garbage Out', xp: 100, duration: '10 min', difficulty: 2, completed: false, content: ['Quality input = Quality output', 'Verify data before entering', 'Check sources for accuracy', 'Double-check important entries'] },
      { id: 'gigo-2', planetId: 'gigov', title: 'Digital Security Basics', description: 'Stay safe online', xp: 150, duration: '15 min', difficulty: 2, completed: false, content: ['Use strong passwords', 'Enable two-factor authentication', 'Be cautious of phishing', 'Keep software updated'] },
      { id: 'gigo-3', planetId: 'gigov', title: 'Internet Safety', description: 'Navigate the web safely', xp: 125, duration: '12 min', difficulty: 2, completed: false, content: ['Check URL for HTTPS', 'Avoid suspicious links', 'Verify email senders', 'Use privacy settings'] },
      { id: 'gigo-4', planetId: 'gigov', title: 'Data Privacy', description: 'Protect your information', xp: 150, duration: '15 min', difficulty: 3, completed: false, content: ['Limit personal info sharing', 'Review privacy policies', 'Use private browsing', 'Clear cookies regularly'] },
      { id: 'gigo-5', planetId: 'gigov', title: 'Digital Footprint', description: 'Manage your online presence', xp: 125, duration: '12 min', difficulty: 2, completed: false, content: ['Everything online leaves traces', 'Search yourself regularly', 'Think before posting', 'Professional online image'] },
      { id: 'gigo-6', planetId: 'gigov', title: 'Final Assessment', description: 'Complete your training', xp: 150, duration: '20 min', difficulty: 3, completed: false, content: ['Review all concepts', 'Complete final challenge', 'Earn your certificate', 'Graduate as a Navigator!'] },
    ],
  },
];

const defaultUser: UserProgress = {
  name: 'Navigator',
  avatar: '🧑‍🚀',
  rank: 'Cadet',
  level: 1,
  xp: 0,
  xpToNext: 500,
  streak: 0,
  lastLoginDate: '',
  totalLessonsCompleted: 0,
  totalTimeSpent: 0,
  dailyMissions: defaultMissions,
  achievements: defaultAchievements,
  customizations: defaultCustomizations,
  completedLessonIds: [],
  terminalCommands: [],
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const ranks = ['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Admiral'];

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useSessionStorage<UserProgress>('silulo-user', defaultUser);
  const [planets, setPlanets] = useSessionStorage<Planet[]>('silulo-planets', defaultPlanets);
  const [currentPlanet, setCurrentPlanet] = useSessionStorage<Planet | null>('silulo-current-planet', null);
  const [currentLesson, setCurrentLesson] = useSessionStorage<Lesson | null>('silulo-current-lesson', null);

  // Check and update streak on load
  useEffect(() => {
    updateStreak();
  }, []);

  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    const lastLogin = user.lastLoginDate;
    
    if (lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      setUser(prev => ({
        ...prev,
        lastLoginDate: today,
        streak: lastLogin === yesterday.toDateString() ? prev.streak + 1 : 1,
      }));
    }
  }, [user.lastLoginDate, setUser]);

  const getRankForLevel = (level: number): string => {
    if (level <= 2) return ranks[0];
    if (level <= 5) return ranks[1];
    if (level <= 10) return ranks[2];
    if (level <= 15) return ranks[3];
    if (level <= 25) return ranks[4];
    return ranks[5];
  };

  const addXp = useCallback((amount: number) => {
    setUser(prev => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let newXpToNext = prev.xpToNext;

      while (newXp >= newXpToNext) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = Math.floor(500 * Math.pow(1.2, newLevel - 1));
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        xpToNext: newXpToNext,
        rank: getRankForLevel(newLevel),
      };
    });
  }, [setUser]);

  const completeLesson = useCallback((lessonId: string) => {
    // Find the lesson and its XP
    let lessonXp = 0;
    let planetId = '';
    
    planets.forEach(planet => {
      const lesson = planet.lessons.find(l => l.id === lessonId);
      if (lesson && !lesson.completed) {
        lessonXp = lesson.xp;
        planetId = planet.id;
      }
    });

    if (lessonXp === 0) return;

    // Update planets
    setPlanets(prev => prev.map(planet => ({
      ...planet,
      lessons: planet.lessons.map(lesson =>
        lesson.id === lessonId ? { ...lesson, completed: true } : lesson
      ),
    })));

    // Update user
    setUser(prev => ({
      ...prev,
      completedLessonIds: [...prev.completedLessonIds, lessonId],
      totalLessonsCompleted: prev.totalLessonsCompleted + 1,
    }));

    // Add XP
    addXp(lessonXp);

    // Check for first lesson achievement
    if (user.totalLessonsCompleted === 0) {
      unlockAchievement('first-lesson');
    }

    // Check for planet completion
    const planet = planets.find(p => p.id === planetId);
    if (planet) {
      const allCompleted = planet.lessons.every(l => l.id === lessonId || l.completed);
      if (allCompleted) {
        unlockAchievement('planet-complete');
        // Unlock next planet
        const nextPlanet = planets.find(p => p.requiredPlanet === planetId);
        if (nextPlanet) {
          setPlanets(prev => prev.map(p =>
            p.id === nextPlanet.id ? { ...p, unlocked: true } : p
          ));
        }
      }
    }
  }, [planets, user.totalLessonsCompleted, addXp, setPlanets, setUser]);

  const completeMission = useCallback((missionId: string) => {
    setUser(prev => {
      const mission = prev.dailyMissions.find(m => m.id === missionId);
      if (!mission || mission.completed) return prev;

      const updatedMissions = prev.dailyMissions.map(m =>
        m.id === missionId ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
      );

      return {
        ...prev,
        dailyMissions: updatedMissions,
      };
    });

    // Add XP for the mission
    const mission = user.dailyMissions.find(m => m.id === missionId);
    if (mission) {
      addXp(mission.xp);
    }
  }, [user.dailyMissions, addXp, setUser]);

  const updateUserName = useCallback((name: string) => {
    setUser(prev => ({ ...prev, name }));
  }, [setUser]);

  const equipCustomization = useCallback((id: string) => {
    setUser(prev => {
      const item = prev.customizations.find(c => c.id === id);
      if (!item || !item.unlocked) return prev;

      return {
        ...prev,
        customizations: prev.customizations.map(c => ({
          ...c,
          equipped: c.type === item.type ? c.id === id : c.equipped,
        })),
        avatar: item.type === 'avatar' ? item.icon : prev.avatar,
      };
    });
  }, [setUser]);

  const unlockCustomization = useCallback((id: string) => {
    setUser(prev => ({
      ...prev,
      customizations: prev.customizations.map(c =>
        c.id === id ? { ...c, unlocked: true } : c
      ),
    }));
  }, [setUser]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setUser(prev => {
      const achievement = prev.achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.unlockedAt) return prev;

      return {
        ...prev,
        achievements: prev.achievements.map(a =>
          a.id === achievementId ? { ...a, unlockedAt: new Date().toISOString() } : a
        ),
      };
    });
  }, [setUser]);

  const addTerminalCommand = useCallback((command: string) => {
    setUser(prev => {
      const newCommands = [...prev.terminalCommands, command];
      
      // Check terminal master achievement
      if (newCommands.length === 20) {
        setTimeout(() => unlockAchievement('terminal-master'), 100);
      }

      return {
        ...prev,
        terminalCommands: newCommands,
      };
    });
  }, [setUser, unlockAchievement]);

  const resetProgress = useCallback(() => {
    setUser(defaultUser);
    setPlanets(defaultPlanets);
    setCurrentPlanet(null);
    setCurrentLesson(null);
    sessionStorage.clear();
  }, [setUser, setPlanets, setCurrentPlanet, setCurrentLesson]);

  const getPlanetProgress = useCallback((planetId: string) => {
    const planet = planets.find(p => p.id === planetId);
    if (!planet) return 0;
    const completed = planet.lessons.filter(l => l.completed).length;
    return Math.round((completed / planet.lessons.length) * 100);
  }, [planets]);

  // Check for level 5 achievement
  useEffect(() => {
    if (user.level >= 5) {
      unlockAchievement('level-5');
    }
  }, [user.level, unlockAchievement]);

  // Check for streak achievement
  useEffect(() => {
    if (user.streak >= 7) {
      unlockAchievement('streak-7');
    }
  }, [user.streak, unlockAchievement]);

  return (
    <UserContext.Provider
      value={{
        user,
        planets,
        currentPlanet,
        currentLesson,
        setCurrentPlanet,
        setCurrentLesson,
        addXp,
        completeLesson,
        completeMission,
        updateStreak,
        updateUserName,
        equipCustomization,
        unlockCustomization,
        addTerminalCommand,
        resetProgress,
        getPlanetProgress,
        unlockAchievement,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
