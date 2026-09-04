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
  | 'gallery'
  | 'notes'
  | 'trash'
  | 'thispc'
  | 'sheet'
  | 'docs'
  | 'calculator'
  | 'pdf-viewer'
  | 'backup'
  | 'repl'
  | 'widgets'
  | 'rocket-drop'
  | 'rockpm'
  | 'git'
  | 'media'
  | 'browser'
  | 'display'
  | 'cron'
  | 'archive'
  | 'network'
  | 'clock'
  | 'hex'
  | 'snippets'
  | 'db-studio'
  | 'keyring'
  | 'palette'
  | 'font-book'
  | 'synth'
  | 'camera';

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
  reduceMotion?: boolean;
  highContrast?: boolean;
  uiScale?: number; // 100, 110, 125
  textScale?: number; // 100, 110, 125
  transparency?: boolean;
  soundEffects?: boolean;
  brightness?: number; // 50 - 100
  focusMode?: boolean; // Do Not Disturb
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

export type NoteColor = 'yellow' | 'emerald' | 'sky' | 'purple' | 'rose' | 'amber' | 'indigo' | 'slate';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  category: 'all' | 'todo' | 'notes' | 'ideas';
  tasks: TodoTask[];
  updatedAt: string;
}

export type WindowSnapState =
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'none';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  isMinimized: boolean;
  isMaximized: boolean;
  snapState?: WindowSnapState;
  restoreBounds?: WindowBounds;
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
