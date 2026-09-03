export type FileType = 'file' | 'folder';

export interface FSItem {
  id: string;
  name: string;
  type: FileType;
  path: string;
  content?: string;
  size?: string;
  updatedAt: string;
  icon?: string;
  children?: FSItem[];
}

export type AppId =
  | 'explorer'
  | 'terminal'
  | 'rocket-studio'
  | 'editor'
  | 'monitor'
  | 'settings'
  | 'graphics'
  | 'taskmanager'
  | 'paint'
  | 'notes'
  | 'trash'
  | 'thispc';

export type WallpaperId =
  | 'liquid-aurora'
  | 'frosted-titanium'
  | 'deep-obsidian'
  | 'classic-blue'
  | 'cyber-abyss'
  | 'solar-flare'
  | 'space-void'
  | 'emerald-matrix';
export type AccentColor = 'sky' | 'emerald' | 'indigo' | 'amber' | 'rose';
export type SystemLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja';

export interface SystemSettings {
  wallpaper: WallpaperId;
  accentColor: AccentColor;
  nightLight: boolean;
  volume: number;
  isMuted: boolean;
  wifiConnected: boolean;
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  language: SystemLanguage;
}

export interface TrashItem {
  id: string;
  item: FSItem;
  deletedAt: string;
  originalPath: string;
}

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: 'yellow' | 'emerald' | 'sky' | 'purple' | 'rose';
  category: 'all' | 'todo' | 'notes' | 'ideas';
  tasks: TodoTask[];
  updatedAt: string;
}

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  isMinimized: boolean;
  isMaximized: boolean;
  snapState?: 'left' | 'right' | 'none';
  workspaceId?: number;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  extraData?: Record<string, any>;
}

export interface BootStep {
  stage: string;
  message: string;
  durationMs: number;
  status: 'pending' | 'active' | 'done' | 'warn';
  sourceLanguage: 'Assembly' | 'Rocket' | 'Hardware';
}

export interface LanguageWeakness {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Design Consideration' | 'Accepted Trade-off';
  category:
    | 'Target & Platform'
    | 'Memory & Concurrency'
    | 'FFI & Foreign ABIs'
    | 'Build & Tooling'
    | 'Graphics & Raylib'
    | 'Grammar & Syntax'
    | 'Runtime & Allocation'
    | 'Hardware & Concurrency';
  summary: string;
  issueDescription: string;
  solutionInRocket: string;
  asmRequirement?: string;
  codeExampleBad: string;
  codeExampleGood: string;
  repoReference?: string;
}

export interface Rocket3Packet {
  id: string;
  name: string;
  feature: string;
  status: 'COMPLETE' | 'CURRENT' | 'NEXT' | 'RED';
  description: string;
}
