// AppRegistry.ts
// Central registry and metadata catalog for all installed applications in RocketOS

import { AppId } from '../../types';

export type AppCategory = 'system' | 'developer' | 'productivity' | 'graphics' | 'utilities';

export interface WindowConstraints {
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
}

export interface AppDefinition {
  id: AppId;
  displayName: string;
  description: string;
  glyph: string;
  category: AppCategory;
  isSingleton: boolean;
  constraints: WindowConstraints;
  supportedExtensions: string[];
  keywords: string[];
  isSystemApp: boolean;
}

export class AppRegistry {
  private static readonly APPS: Record<AppId, AppDefinition> = {
    explorer: {
      id: 'explorer',
      displayName: 'File Explorer',
      description: 'Browse Desktop, Documents, and Kernel files',
      glyph: '📁',
      category: 'system',
      isSingleton: false,
      constraints: { defaultWidth: 820, defaultHeight: 510, minWidth: 500, minHeight: 360 },
      supportedExtensions: [],
      keywords: ['files', 'folders', 'explorer', 'documents', 'downloads', 'vfs', 'browse'],
      isSystemApp: true,
    },
    thispc: {
      id: 'thispc',
      displayName: 'This PC',
      description: 'Storage drives, RAM disk, and hardware specs',
      glyph: '💻',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 800, defaultHeight: 480, minWidth: 480, minHeight: 340 },
      supportedExtensions: [],
      keywords: ['hardware', 'storage', 'disks', 'specs', 'cpu', 'ram', 'system'],
      isSystemApp: true,
    },
    trash: {
      id: 'trash',
      displayName: 'Recycle Bin',
      description: 'Deleted files & restore manager',
      glyph: '🗑️',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 760, defaultHeight: 480, minWidth: 480, minHeight: 340 },
      supportedExtensions: [],
      keywords: ['trash', 'recycle', 'delete', 'restore', 'bin', 'clean'],
      isSystemApp: true,
    },
    terminal: {
      id: 'terminal',
      displayName: 'Terminal (rsh v2.0)',
      description: 'rsh v2.0 CLI shell and environment',
      glyph: '🖥️',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 700, defaultHeight: 430, minWidth: 420, minHeight: 280 },
      supportedExtensions: ['.sh', '.rsh'],
      keywords: ['cli', 'terminal', 'shell', 'bash', 'command', 'rocketc', 'prompt'],
      isSystemApp: true,
    },
    'rocket-studio': {
      id: 'rocket-studio',
      displayName: 'Rocket Language Studio',
      description: 'Rocket language tour, compiler diagnostics, and AST inspector',
      glyph: '✨',
      category: 'developer',
      isSingleton: true,
      constraints: { defaultWidth: 860, defaultHeight: 540, minWidth: 600, minHeight: 400 },
      supportedExtensions: ['.rocket'],
      keywords: ['rocket', 'compiler', 'studio', 'ast', 'diagnostics', 'ide', 'language'],
      isSystemApp: false,
    },
    editor: {
      id: 'editor',
      displayName: 'Rocket Code Editor',
      description: 'rEdit code studio with syntax highlighting',
      glyph: '📝',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 740, defaultHeight: 490, minWidth: 440, minHeight: 320 },
      supportedExtensions: ['.rocket', '.txt', '.md', '.json', '.asm'],
      keywords: ['code', 'text', 'edit', 'editor', 'script', 'file', 'source'],
      isSystemApp: false,
    },
    taskmanager: {
      id: 'taskmanager',
      displayName: 'Task Manager',
      description: 'Live CPU, RAM and background processes',
      glyph: '📊',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 800, defaultHeight: 500, minWidth: 520, minHeight: 360 },
      supportedExtensions: [],
      keywords: ['processes', 'tasks', 'cpu', 'memory', 'kill', 'performance', 'usage'],
      isSystemApp: true,
    },
    monitor: {
      id: 'monitor',
      displayName: 'Hardware Monitor',
      description: 'PML4 paging & register telemetry',
      glyph: '⚡',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 680, defaultHeight: 440, minWidth: 460, minHeight: 320 },
      supportedExtensions: [],
      keywords: ['pml4', 'registers', 'paging', 'hardware', 'cpu', 'idt', 'telemetry'],
      isSystemApp: true,
    },
    settings: {
      id: 'settings',
      displayName: 'Settings',
      description: 'Wallpapers, Clock & System options',
      glyph: '⚙️',
      category: 'utilities',
      isSingleton: true,
      constraints: { defaultWidth: 780, defaultHeight: 520, minWidth: 500, minHeight: 380 },
      supportedExtensions: [],
      keywords: ['settings', 'preferences', 'wallpaper', 'accent', 'volume', 'clock', 'sound'],
      isSystemApp: true,
    },
    paint: {
      id: 'paint',
      displayName: 'Paint Studio',
      description: '2D drawing studio & canvas artwork',
      glyph: '🎨',
      category: 'graphics',
      isSingleton: false,
      constraints: { defaultWidth: 920, defaultHeight: 580, minWidth: 600, minHeight: 420 },
      supportedExtensions: ['.png', '.jpg', '.svg', '.paint'],
      keywords: ['paint', 'draw', 'canvas', 'brush', 'art', 'graphic', 'sketch'],
      isSystemApp: false,
    },
    notes: {
      id: 'notes',
      displayName: 'Notes & To-Do',
      description: 'Interactive checklist and to-do notes',
      glyph: '📝',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 780, defaultHeight: 500, minWidth: 480, minHeight: 340 },
      supportedExtensions: ['.txt', '.notes'],
      keywords: ['notes', 'todo', 'tasks', 'checklist', 'memo', 'scratchpad'],
      isSystemApp: false,
    },
    graphics: {
      id: 'graphics',
      displayName: 'Raylib 2D Engine',
      description: 'Interactive 2D orbital simulation',
      glyph: '🚀',
      category: 'graphics',
      isSingleton: true,
      constraints: { defaultWidth: 850, defaultHeight: 530, minWidth: 550, minHeight: 380 },
      supportedExtensions: [],
      keywords: ['raylib', 'physics', '2d', 'engine', 'graphics', 'orbit', 'simulation'],
      isSystemApp: false,
    },
  };

  public static getApp(id: AppId): AppDefinition {
    return this.APPS[id] || this.APPS.explorer;
  }

  public static getAllApps(): AppDefinition[] {
    return Object.values(this.APPS);
  }

  public static getAppsByCategory(category: AppCategory): AppDefinition[] {
    return Object.values(this.APPS).filter((app) => app.category === category);
  }

  public static getDefaultPinnedAppIds(): AppId[] {
    return ['explorer', 'terminal', 'notes', 'paint', 'rocket-studio'];
  }

  public static searchApps(query: string): AppDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllApps();
    return this.getAllApps().filter(
      (app) =>
        app.displayName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }

  public static getAppForFile(filename: string): AppId {
    const ext = filename.lastIndexOf('.') >= 0 ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
    // Check supported extensions
    for (const app of Object.values(this.APPS)) {
      if (app.supportedExtensions && app.supportedExtensions.includes(ext)) {
        return app.id;
      }
    }
    return 'editor';
  }

  public static getAppsForFile(filename: string): AppId[] {
    const ext = filename.lastIndexOf('.') >= 0 ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
    const apps: AppId[] = [];
    for (const app of Object.values(this.APPS)) {
      if (app.supportedExtensions && app.supportedExtensions.includes(ext)) {
        apps.push(app.id);
      }
    }
    if (!apps.includes('editor')) apps.push('editor');
    return apps;
  }
}
