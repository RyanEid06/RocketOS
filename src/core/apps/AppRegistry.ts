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
    gallery: {
      id: 'gallery',
      displayName: 'Rocket Gallery',
      description: 'Image viewer and artwork library',
      glyph: '🖼️',
      category: 'graphics',
      isSingleton: false,
      constraints: { defaultWidth: 860, defaultHeight: 560, minWidth: 540, minHeight: 380 },
      supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.rpaint'],
      keywords: ['gallery', 'image', 'picture', 'photo', 'artwork', 'viewer'],
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
    sheet: {
      id: 'sheet',
      displayName: 'Rocket Sheet',
      description: 'Spreadsheet office tool with cell formulas and CSV export',
      glyph: '📊',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 880, defaultHeight: 540, minWidth: 540, minHeight: 380 },
      supportedExtensions: ['.csv', '.rcsv', '.tsv'],
      keywords: ['sheet', 'calc', 'excel', 'spreadsheet', 'csv', 'table', 'office', 'data'],
      isSystemApp: false,
    },
    docs: {
      id: 'docs',
      displayName: 'Rocket Docs & Markdown',
      description: 'Rich Markdown and documentation authoring with live preview & export',
      glyph: '📝',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 880, defaultHeight: 600, minWidth: 540, minHeight: 400 },
      supportedExtensions: ['.md', '.rmd', '.markdown', '.txt'],
      keywords: ['docs', 'markdown', 'writer', 'document', 'pdf', 'notes', 'word', 'authoring'],
      isSystemApp: false,
    },
    calculator: {
      id: 'calculator',
      displayName: 'Calculator (Dual-Engine)',
      description: 'Scientific & Programmer (Hex/Dec/Bin/Oct) calculator',
      glyph: '🧮',
      category: 'utilities',
      isSingleton: false,
      constraints: { defaultWidth: 460, defaultHeight: 580, minWidth: 380, minHeight: 480 },
      supportedExtensions: [],
      keywords: ['calculator', 'calc', 'math', 'programmer', 'hex', 'binary', 'scientific', 'trig'],
      isSystemApp: false,
    },
    'pdf-viewer': {
      id: 'pdf-viewer',
      displayName: 'Document & PDF Viewer',
      description: 'Zero-bloat offline PDF and vector specification reader',
      glyph: '📑',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 840, defaultHeight: 560, minWidth: 500, minHeight: 360 },
      supportedExtensions: ['.pdf', '.doc', '.spec'],
      keywords: ['pdf', 'document', 'reader', 'manual', 'viewer', 'spec', 'ebook'],
      isSystemApp: false,
    },
    backup: {
      id: 'backup',
      displayName: 'Backup & Restore Center',
      description: 'Create system snapshots, export filesystem, or restore OS',
      glyph: '💾',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 760, defaultHeight: 500, minWidth: 480, minHeight: 360 },
      supportedExtensions: ['.json', '.bak'],
      keywords: ['backup', 'restore', 'snapshot', 'export', 'import', 'recovery', 'reset'],
      isSystemApp: true,
    },
    repl: {
      id: 'repl',
      displayName: 'Rocket REPL & Inspector',
      description: 'Interactive Rocket 2.1 evaluation, AST viewer, and step debugger',
      glyph: '⚡',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 920, defaultHeight: 600, minWidth: 600, minHeight: 400 },
      supportedExtensions: ['.rocket'],
      keywords: ['repl', 'eval', 'debugger', 'ast', 'inspector', 'rocket', 'interactive', 'step'],
      isSystemApp: false,
    },
    widgets: {
      id: 'widgets',
      displayName: 'Widgets & Sticky Notes',
      description: 'Desktop widget shelf, sticky notes, and system resource monitors',
      glyph: '📌',
      category: 'utilities',
      isSingleton: true,
      constraints: { defaultWidth: 840, defaultHeight: 540, minWidth: 500, minHeight: 380 },
      supportedExtensions: [],
      keywords: ['widgets', 'sticky', 'notes', 'clock', 'gauges', 'shelf', 'desktop'],
      isSystemApp: false,
    },
    'rocket-drop': {
      id: 'rocket-drop',
      displayName: 'RocketDrop',
      description: 'Zero-config local mesh network file sharing and peer transfer',
      glyph: '📡',
      category: 'utilities',
      isSingleton: true,
      constraints: { defaultWidth: 780, defaultHeight: 520, minWidth: 480, minHeight: 360 },
      supportedExtensions: [],
      keywords: ['rocketdrop', 'share', 'drop', 'network', 'transfer', 'airdrop', 'peers', 'p2p'],
      isSystemApp: false,
    },
    rockpm: {
      id: 'rockpm',
      displayName: 'Package Manager',
      description: 'rockpm package catalog, dependency installer, and updates',
      glyph: '📦',
      category: 'developer',
      isSingleton: true,
      constraints: { defaultWidth: 840, defaultHeight: 560, minWidth: 520, minHeight: 380 },
      supportedExtensions: ['.toml'],
      keywords: ['rockpm', 'packages', 'install', 'modules', 'catalog', 'libraries', 'deps'],
      isSystemApp: false,
    },
    git: {
      id: 'git',
      displayName: 'Git Version Control',
      description: 'Staging area, visual diff viewer, and commit timeline',
      glyph: '🌿',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 920, defaultHeight: 600, minWidth: 580, minHeight: 400 },
      supportedExtensions: ['.git', '.diff', '.patch'],
      keywords: ['git', 'vcs', 'commit', 'branch', 'diff', 'merge', 'repo', 'version'],
      isSystemApp: false,
    },
    media: {
      id: 'media',
      displayName: 'Media & Audio Studio',
      description: 'Audio player, lossless waveform visualizer, voice recorder, and photo studio',
      glyph: '🎵',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 880, defaultHeight: 560, minWidth: 540, minHeight: 380 },
      supportedExtensions: ['.mp3', '.wav', '.ogg', '.flac', '.png', '.jpg'],
      keywords: ['media', 'music', 'audio', 'sound', 'player', 'record', 'voice', 'photo', 'art'],
      isSystemApp: false,
    },
    browser: {
      id: 'browser',
      displayName: 'Rocket Navigator',
      description: 'Sandboxed web browser and offline Rocket 2.1 documentation viewer',
      glyph: '🌐',
      category: 'utilities',
      isSingleton: false,
      constraints: { defaultWidth: 940, defaultHeight: 620, minWidth: 580, minHeight: 420 },
      supportedExtensions: ['.html', '.htm', '.url'],
      keywords: ['browser', 'web', 'internet', 'docs', 'html', 'navigator', 'search', 'std'],
      isSystemApp: false,
    },
    display: {
      id: 'display',
      displayName: 'Display & Accessibility',
      description: 'Resolution scaling, night light, color gamut calibration, and ergonomics',
      glyph: '🖥️',
      category: 'utilities',
      isSingleton: true,
      constraints: { defaultWidth: 820, defaultHeight: 560, minWidth: 520, minHeight: 380 },
      supportedExtensions: [],
      keywords: ['display', 'screen', 'resolution', 'scaling', 'dpi', 'nightlight', 'accessibility', 'contrast'],
      isSystemApp: true,
    },
    cron: {
      id: 'cron',
      displayName: 'Task Scheduler & Cron',
      description: 'Automated background tasks, timer routines, and daemon supervision',
      glyph: '⏱️',
      category: 'system',
      isSingleton: true,
      constraints: { defaultWidth: 880, defaultHeight: 580, minWidth: 540, minHeight: 400 },
      supportedExtensions: ['.cron'],
      keywords: ['cron', 'tasks', 'scheduler', 'timer', 'daemons', 'services', 'automated', 'jobs'],
      isSystemApp: true,
    },
    archive: {
      id: 'archive',
      displayName: 'Rocket Archiver',
      description: 'Inspect, extract, test, and mount .zip, .tar, and .iso disk archives',
      glyph: '🗜️',
      category: 'utilities',
      isSingleton: false,
      constraints: { defaultWidth: 860, defaultHeight: 560, minWidth: 520, minHeight: 380 },
      supportedExtensions: ['.zip', '.tar', '.gz', '.iso', '.img'],
      keywords: ['archive', 'zip', 'tar', 'extract', 'compress', 'unzip', 'iso', 'vdisk'],
      isSystemApp: false,
    },
    network: {
      id: 'network',
      displayName: 'NetPulse Network Suite',
      description: 'ICMP ping latency graph, port scanner, and HTTP REST API workbench',
      glyph: '📡',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 920, defaultHeight: 600, minWidth: 560, minHeight: 400 },
      supportedExtensions: [],
      keywords: ['network', 'ping', 'port', 'scan', 'http', 'api', 'rest', 'socket', 'curl'],
      isSystemApp: false,
    },
    clock: {
      id: 'clock',
      displayName: 'Clock & Focus',
      description: 'World clock timezones, millisecond stopwatch, timer, and Pomodoro focus',
      glyph: '⏰',
      category: 'utilities',
      isSingleton: false,
      constraints: { defaultWidth: 800, defaultHeight: 540, minWidth: 480, minHeight: 380 },
      supportedExtensions: [],
      keywords: ['clock', 'world', 'time', 'stopwatch', 'timer', 'pomodoro', 'focus', 'alarm'],
      isSystemApp: false,
    },
    hex: {
      id: 'hex',
      displayName: 'ByteForge Hex Editor',
      description: 'Raw binary hex matrix inspector, ASCII decode, and x86_64 disassembler',
      glyph: '👾',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 940, defaultHeight: 620, minWidth: 600, minHeight: 420 },
      supportedExtensions: ['.bin', '.sys', '.elf', '.dat', '.rom', '.hex'],
      keywords: ['hex', 'binary', 'disassembler', 'bytecode', 'bytes', 'elf', 'lowlevel', 'opcode'],
      isSystemApp: false,
    },
    snippets: {
      id: 'snippets',
      displayName: 'Regex & Snippet Lab',
      description: 'Real-time regex match and group tester with curated Rocket 2.1 code snippets',
      glyph: '⚡',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 900, defaultHeight: 580, minWidth: 540, minHeight: 400 },
      supportedExtensions: ['.regex', '.snippet'],
      keywords: ['regex', 'snippets', 'regexp', 'pattern', 'syntax', 'rocket', 'code', 'library'],
      isSystemApp: false,
    },
    'db-studio': {
      id: 'db-studio',
      displayName: 'DataStore Studio',
      description: 'Structured database table viewer, SQL query console, and CSV exporter',
      glyph: '🗄️',
      category: 'developer',
      isSingleton: false,
      constraints: { defaultWidth: 920, defaultHeight: 580, minWidth: 560, minHeight: 400 },
      supportedExtensions: ['.db', '.sqlite', '.sql'],
      keywords: ['database', 'sql', 'query', 'tables', 'datastore', 'sqlite', 'csv', 'records'],
      isSystemApp: false,
    },
    keyring: {
      id: 'keyring',
      displayName: 'Rocket Vault & Keyring',
      description: 'Encrypted secrets safe, entropy password generator, and SSH key pair studio',
      glyph: '🔐',
      category: 'utilities',
      isSingleton: true,
      constraints: { defaultWidth: 840, defaultHeight: 560, minWidth: 500, minHeight: 380 },
      supportedExtensions: ['.key', '.pem', '.env'],
      keywords: ['vault', 'keyring', 'password', 'ssh', 'secrets', 'keys', 'generator', 'credentials'],
      isSystemApp: false,
    },
    palette: {
      id: 'palette',
      displayName: 'ColorForge Studio',
      description: 'Precision color picker, WCAG 2.1 contrast ratio verification, and Tailwind tones',
      glyph: '🎨',
      category: 'graphics',
      isSingleton: false,
      constraints: { defaultWidth: 860, defaultHeight: 580, minWidth: 520, minHeight: 400 },
      supportedExtensions: ['.color', '.palette'],
      keywords: ['color', 'palette', 'contrast', 'wcag', 'picker', 'hex', 'rgb', 'tailwind', 'design'],
      isSystemApp: false,
    },
    'font-book': {
      id: 'font-book',
      displayName: 'FontBook & Glyphs',
      description: 'Modular typography scales, Unicode symbol catalog, and programming ligatures',
      glyph: '🔤',
      category: 'graphics',
      isSingleton: false,
      constraints: { defaultWidth: 880, defaultHeight: 580, minWidth: 540, minHeight: 400 },
      supportedExtensions: ['.ttf', '.otf', '.woff2'],
      keywords: ['font', 'typography', 'glyphs', 'unicode', 'scale', 'symbols', 'ligatures', 'text'],
      isSystemApp: false,
    },
    synth: {
      id: 'synth',
      displayName: 'AudioLab Synthesizer',
      description: 'Web Audio synthesizer, ADSR envelope shaping, and 8-bit retro sound FX generator',
      glyph: '🎹',
      category: 'productivity',
      isSingleton: false,
      constraints: { defaultWidth: 900, defaultHeight: 580, minWidth: 560, minHeight: 400 },
      supportedExtensions: ['.sfx', '.patch'],
      keywords: ['synth', 'audio', 'sound', 'piano', 'oscillator', 'sfx', 'retro', '8bit', 'music'],
      isSystemApp: false,
    },
    camera: {
      id: 'camera',
      displayName: 'Camera & Studio',
      description: 'High-definition webcam capture with live cyberpunk filters and photo library',
      glyph: '📷',
      category: 'utilities',
      isSingleton: false,
      constraints: { defaultWidth: 880, defaultHeight: 580, minWidth: 540, minHeight: 400 },
      supportedExtensions: [],
      keywords: ['camera', 'webcam', 'photo', 'video', 'capture', 'selfie', 'filter', 'snapshots'],
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
