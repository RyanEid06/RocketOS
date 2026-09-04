// ShortcutManager.ts
// Centralized customizable keyboard shortcuts manager for RocketOS

export interface ShortcutDefinition {
  id: string;
  category: 'System' | 'Window Management' | 'Workspace' | 'File Explorer';
  name: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  actionId: string;
}

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'cmd-palette',
    category: 'System',
    name: 'Command Palette / Universal Search',
    description: 'Launch Spotlight global search and app launcher',
    defaultKey: 'Super+Space',
    currentKey: 'Super+Space',
    actionId: 'TOGGLE_COMMAND_PALETTE',
  },
  {
    id: 'cmd-palette-alt',
    category: 'System',
    name: 'Command Palette (Secondary)',
    description: 'Alternative shortcut for Command Palette',
    defaultKey: 'Ctrl+K',
    currentKey: 'Ctrl+K',
    actionId: 'TOGGLE_COMMAND_PALETTE',
  },
  {
    id: 'show-desktop',
    category: 'System',
    name: 'Show Desktop',
    description: 'Minimize or restore all open windows to reveal desktop',
    defaultKey: 'Win+D',
    currentKey: 'Win+D',
    actionId: 'TOGGLE_SHOW_DESKTOP',
  },
  {
    id: 'quick-look',
    category: 'File Explorer',
    name: 'Quick Look Preview',
    description: 'Instant preview of selected desktop or explorer file',
    defaultKey: 'Space',
    currentKey: 'Space',
    actionId: 'QUICK_LOOK',
  },
  {
    id: 'rename-file',
    category: 'File Explorer',
    name: 'Rename File',
    description: 'Inline rename dialog for selected file or folder',
    defaultKey: 'F2',
    currentKey: 'F2',
    actionId: 'RENAME_FILE',
  },
  {
    id: 'delete-file',
    category: 'File Explorer',
    name: 'Move to Recycle Bin',
    description: 'Send selected file or directory to Recycle Bin',
    defaultKey: 'Delete',
    currentKey: 'Delete',
    actionId: 'DELETE_FILE',
  },
  {
    id: 'copy-file',
    category: 'File Explorer',
    name: 'Copy File',
    description: 'Copy selected file or folder to OS clipboard',
    defaultKey: 'Ctrl+C',
    currentKey: 'Ctrl+C',
    actionId: 'COPY_FILE',
  },
  {
    id: 'cut-file',
    category: 'File Explorer',
    name: 'Cut File',
    description: 'Cut selected file or folder to OS clipboard',
    defaultKey: 'Ctrl+X',
    currentKey: 'Ctrl+X',
    actionId: 'CUT_FILE',
  },
  {
    id: 'paste-file',
    category: 'File Explorer',
    name: 'Paste File',
    description: 'Paste file from OS clipboard into active folder',
    defaultKey: 'Ctrl+V',
    currentKey: 'Ctrl+V',
    actionId: 'PASTE_FILE',
  },
  {
    id: 'snap-left',
    category: 'Window Management',
    name: 'Snap Window Left',
    description: 'Dock active window to the left half of the display',
    defaultKey: 'Win+Left',
    currentKey: 'Win+Left',
    actionId: 'SNAP_LEFT',
  },
  {
    id: 'snap-right',
    category: 'Window Management',
    name: 'Snap Window Right',
    description: 'Dock active window to the right half of the display',
    defaultKey: 'Win+Right',
    currentKey: 'Win+Right',
    actionId: 'SNAP_RIGHT',
  },
  {
    id: 'snap-maximize',
    category: 'Window Management',
    name: 'Maximize Window',
    description: 'Expand active window to fill the entire desktop',
    defaultKey: 'Win+Up',
    currentKey: 'Win+Up',
    actionId: 'SNAP_MAXIMIZE',
  },
  {
    id: 'snap-restore',
    category: 'Window Management',
    name: 'Restore / Minimize Window',
    description: 'Restore window size or minimize to taskbar',
    defaultKey: 'Win+Down',
    currentKey: 'Win+Down',
    actionId: 'SNAP_RESTORE',
  },
  {
    id: 'ws-1',
    category: 'Workspace',
    name: 'Switch to Desktop 1 (General)',
    description: 'Switch to general workspace',
    defaultKey: 'Alt+1',
    currentKey: 'Alt+1',
    actionId: 'SWITCH_WS_1',
  },
  {
    id: 'ws-2',
    category: 'Workspace',
    name: 'Switch to Desktop 2 (Developer)',
    description: 'Switch to code development workspace',
    defaultKey: 'Alt+2',
    currentKey: 'Alt+2',
    actionId: 'SWITCH_WS_2',
  },
  {
    id: 'ws-3',
    category: 'Workspace',
    name: 'Switch to Desktop 3 (Creative & Art)',
    description: 'Switch to creative & multimedia workspace',
    defaultKey: 'Alt+3',
    currentKey: 'Alt+3',
    actionId: 'SWITCH_WS_3',
  },
  {
    id: 'ws-4',
    category: 'Workspace',
    name: 'Switch to Desktop 4 (System & Terminal)',
    description: 'Switch to system administration workspace',
    defaultKey: 'Alt+4',
    currentKey: 'Alt+4',
    actionId: 'SWITCH_WS_4',
  },
];

const STORAGE_KEY = 'rocket_keyboard_shortcuts_v1';

export class ShortcutManager {
  private static instance: ShortcutManager | null = null;
  private shortcuts: ShortcutDefinition[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadShortcuts();
  }

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  private loadShortcuts(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Record<string, string> = JSON.parse(saved);
        this.shortcuts = DEFAULT_SHORTCUTS.map((def) => ({
          ...def,
          currentKey: parsed[def.id] || def.defaultKey,
        }));
        return;
      } catch {
        // fallback
      }
    }
    this.shortcuts = [...DEFAULT_SHORTCUTS];
  }

  public getShortcuts(): ShortcutDefinition[] {
    return [...this.shortcuts];
  }

  public updateShortcut(id: string, newKey: string): { success: boolean; conflictWith?: string } {
    const trimmed = newKey.trim();
    if (!trimmed) return { success: false };

    // Conflict detection
    const existing = this.shortcuts.find(
      (s) => s.id !== id && s.currentKey.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return { success: false, conflictWith: existing.name };
    }

    this.shortcuts = this.shortcuts.map((s) => (s.id === id ? { ...s, currentKey: trimmed } : s));
    this.persist();
    this.notify();
    return { success: true };
  }

  public resetToDefaults(): void {
    this.shortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s, currentKey: s.defaultKey }));
    this.persist();
    this.notify();
  }

  private persist(): void {
    const mapping: Record<string, string> = {};
    this.shortcuts.forEach((s) => {
      mapping[s.id] = s.currentKey;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
