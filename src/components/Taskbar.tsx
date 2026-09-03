import React, { useState, useEffect, useRef } from 'react';
import { WindowState, AppId, SystemSettings, SystemLanguage, FSItem } from '../types';
import {
  Folder,
  Terminal,
  Sparkles,
  Edit3,
  Activity,
  RotateCcw,
  Power,
  Clock,
  Wifi,
  Volume2,
  VolumeX,
  ChevronUp,
  Cpu,
  HelpCircle,
  Layers,
  FileCode,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Sliders,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Check,
  Rocket,
  Search,
  HardDrive,
  Trash2,
  ListTodo,
  Paintbrush,
  Globe,
  Pin,
  X,
  FileText,
  Monitor
} from 'lucide-react';
import { TRANSLATIONS, getLocaleCode } from '../utils/localization';
import { soundEngine } from '../utils/audio';

interface TaskbarProps {
  windows: WindowState[];
  activeWindowId: string | null;
  settings: SystemSettings;
  fileSystem: FSItem[];
  pinnedAppIds: AppId[];
  currentWorkspace: number;
  onChangeWorkspace: (wsId: number) => void;
  onTogglePin: (appId: AppId) => void;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onSelectWindow: (id: string) => void;
  onCloseWindow: (id: string) => void;
  onMinimizeWindow: (id: string) => void;
  onToggleShowDesktop: () => void;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile: (file: FSItem) => void;
  onReboot: () => void;
  onOpenExplorerPath: (path: string) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  windows,
  activeWindowId,
  settings,
  fileSystem,
  pinnedAppIds,
  currentWorkspace,
  onChangeWorkspace,
  onTogglePin,
  onUpdateSettings,
  onSelectWindow,
  onCloseWindow,
  onMinimizeWindow,
  onToggleShowDesktop,
  onOpenApp,
  onOpenFile,
  onReboot,
  onOpenExplorerPath,
}) => {
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [searchFlyoutOpen, setSearchFlyoutOpen] = useState<boolean>(false);
  const [controlCenterOpen, setControlCenterOpen] = useState<boolean>(false);
  const [calendarOpen, setCalendarOpen] = useState<boolean>(false);
  const [workspacesMenuOpen, setWorkspacesMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTab, setSearchTab] = useState<'all' | 'apps' | 'files' | 'folders'>('all');
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  // Taskbar right-click context menu
  const [taskbarContextMenu, setTaskbarContextMenu] = useState<{
    x: number;
    y: number;
    appId?: AppId;
    winId?: string;
  } | null>(null);

  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;
  const locale = getLocaleCode(settings.language);

  // Close context menu on global clicks
  useEffect(() => {
    const handleGlobalClick = () => {
      setTaskbarContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Keyboard shortcut Ctrl+K to toggle Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchFlyoutOpen((prev) => !prev);
        setStartMenuOpen(false);
        setCalendarOpen(false);
        setControlCenterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifications
  const [notifications] = useState<
    { id: string; title: string; desc: string; time: string; type: 'info' | 'success' | 'warn' }[]
  >([
    {
      id: 'notif-1',
      title: 'Operating System Ready',
      desc: 'Liquid Glass compositor active at 60 FPS',
      time: 'Just now',
      type: 'success',
    },
    {
      id: 'notif-2',
      title: 'Storage Mounted',
      desc: 'This PC and Recycle Bin initialized',
      time: '1m ago',
      type: 'info',
    },
  ]);

  // Update time based on user settings
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          second: settings.showSeconds ? '2-digit' : undefined,
          hour12: settings.timeFormat === '12h',
        })
      );
      setDateStr(
        now.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.timeFormat, settings.showSeconds, settings.language, locale]);

  // All applications list for Start Menu & Search
  const allApps: {
    id: AppId;
    title: string;
    desc: string;
    icon: React.ReactNode;
    glyph: string;
    action: () => void;
  }[] = [
    {
      id: 'thispc',
      title: t.thisPc,
      desc: 'Storage drives, RAM disk, and hardware specs',
      icon: <HardDrive className="w-5 h-5 text-sky-400" />,
      glyph: '💻',
      action: () => onOpenApp('explorer', { path: '/ThisPC' }),
    },
    {
      id: 'trash',
      title: t.recycleBin,
      desc: 'Deleted files & restore manager',
      icon: <Trash2 className="w-5 h-5 text-rose-300" />,
      glyph: '🗑️',
      action: () => onOpenApp('explorer', { path: '/Trash' }),
    },
    {
      id: 'notes',
      title: t.notes,
      desc: 'Interactive checklist and to-do notes',
      icon: <ListTodo className="w-5 h-5 text-emerald-400" />,
      glyph: '📝',
      action: () => onOpenApp('notes'),
    },
    {
      id: 'paint',
      title: t.paint,
      desc: '2D drawing studio & canvas artwork',
      icon: <Paintbrush className="w-5 h-5 text-amber-400" />,
      glyph: '🎨',
      action: () => onOpenApp('paint'),
    },
    {
      id: 'taskmanager',
      title: t.taskManager,
      desc: 'Live CPU, RAM and background processes',
      icon: <Activity className="w-5 h-5 text-rose-400" />,
      glyph: '📊',
      action: () => onOpenApp('taskmanager'),
    },
    {
      id: 'explorer',
      title: 'File Explorer',
      desc: 'Browse Desktop, Documents and Kernel files',
      icon: <Folder className="w-5 h-5 text-sky-400" />,
      glyph: '📁',
      action: () => onOpenApp('explorer', { path: '/Desktop' }),
    },
    {
      id: 'graphics',
      title: t.graphicsEngine,
      desc: 'Interactive 2D orbital simulation',
      icon: <Rocket className="w-5 h-5 text-purple-400" />,
      glyph: '🚀',
      action: () => onOpenApp('graphics'),
    },
    {
      id: 'terminal',
      title: t.terminal,
      desc: 'rsh v2.0 CLI shell and environment',
      icon: <Terminal className="w-5 h-5 text-emerald-300" />,
      glyph: '🖥️',
      action: () => onOpenApp('terminal'),
    },
    {
      id: 'editor',
      title: 'Rocket Editor',
      desc: 'rEdit code studio with execution',
      icon: <Edit3 className="w-5 h-5 text-indigo-400" />,
      glyph: '📝',
      action: () => onOpenApp('editor'),
    },
    {
      id: 'monitor',
      title: 'Hardware Monitor',
      desc: 'PML4 paging & register telemetry',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      glyph: '⚡',
      action: () => onOpenApp('monitor'),
    },
    {
      id: 'settings',
      title: t.settings,
      desc: 'Wallpapers, Clock & System options',
      icon: <SettingsIcon className="w-5 h-5 text-sky-300" />,
      glyph: '⚙️',
      action: () => onOpenApp('settings'),
    },
  ];

  // Helper to find app definition
  const getAppMeta = (appId: AppId) => {
    return allApps.find((a) => a.id === appId) || allApps[0];
  };

  // Compile full search results across Apps, Folders, and Files
  const searchResults = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return {
        apps: allApps.slice(0, 6),
        folders: fileSystem.filter((f) => f.type === 'folder').slice(0, 4),
        files: fileSystem.filter((f) => f.type === 'file').slice(0, 5),
      };
    }

    const matchedApps = allApps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );

    const matchedFolders = fileSystem.filter(
      (f) => f.type === 'folder' && (f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
    );

    const matchedFiles = fileSystem.filter(
      (f) =>
        f.type === 'file' &&
        (f.name.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q) ||
          (f.content && f.content.toLowerCase().includes(q)))
    );

    return {
      apps: matchedApps,
      folders: matchedFolders,
      files: matchedFiles,
    };
  }, [searchQuery, fileSystem, allApps]);

  // Combined Taskbar App Items:
  // Shows pinned apps + any other open windows that aren't already pinned
  const taskbarItems = React.useMemo(() => {
    const items: {
      appId: AppId;
      isPinned: boolean;
      window?: WindowState;
    }[] = [];

    // The default taskbar only shows active open apps, confined to their icons (similar to Windows)
    windows.forEach((win) => {
      items.push({
        appId: win.appId,
        isPinned: pinnedAppIds.includes(win.appId),
        window: win,
      });
    });

    return items;
  }, [pinnedAppIds, windows]);

  // Handle right-click on the taskbar background
  const handleTaskbarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskbarContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.max(20, e.clientY - 140),
    });
  };

  // Handle right-click on an app icon
  const handleIconContextMenu = (
    e: React.MouseEvent,
    appId: AppId,
    winId?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setTaskbarContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.max(20, e.clientY - 150),
      appId,
      winId,
    });
  };

  return (
    <>
      {/* Universal Search Flyout */}
      {searchFlyoutOpen && (
        <div
          onClick={() => setSearchFlyoutOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 sm:p-0"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-slate-900/90 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col mb-16 sm:mb-0 max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search className="w-5 h-5 text-sky-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search apps, files, folders in RocketOS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 bg-white/[0.03] border-b border-white/10 text-xs font-medium">
              {(['all', 'apps', 'files', 'folders'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSearchTab(tab)}
                  className={`px-3 py-1 rounded-xl transition-all capitalize cursor-pointer ${
                    searchTab === tab
                      ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[52vh]">
              {/* Apps Section */}
              {(searchTab === 'all' || searchTab === 'apps') &&
                searchResults.apps.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                      Applications ({searchResults.apps.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {searchResults.apps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            app.action();
                            setSearchFlyoutOpen(false);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 text-left transition-all cursor-pointer group"
                        >
                          <div className="p-2 rounded-xl bg-white/[0.08] border border-white/10 group-hover:scale-105 transition-transform shrink-0">
                            {app.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white group-hover:text-sky-300 truncate">
                              {app.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {app.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Folders Section */}
              {(searchTab === 'all' || searchTab === 'folders') &&
                searchResults.folders.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                      Folders ({searchResults.folders.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            onOpenExplorerPath(folder.path);
                            setSearchFlyoutOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 text-left transition-all cursor-pointer group"
                        >
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0 flex-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-white group-hover:text-amber-300 truncate">
                              {folder.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate ml-2">
                              {folder.path}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Files Section */}
              {(searchTab === 'all' || searchTab === 'files') &&
                searchResults.files.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Files ({searchResults.files.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => {
                            onOpenFile(file);
                            setSearchFlyoutOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 text-left transition-all cursor-pointer group"
                        >
                          {file.name.endsWith('.rocket') || file.name.endsWith('.rkt') ? (
                            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-white group-hover:text-emerald-300 truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate ml-2">
                              {file.path} • {file.size}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Empty state */}
              {searchResults.apps.length === 0 &&
                searchResults.folders.length === 0 &&
                searchResults.files.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <div className="text-xs font-medium text-slate-300">
                      No matching apps, files, or folders found
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Try searching for "notes", "paint", "kernel", or "explorer"
                    </div>
                  </div>
                )}
            </div>

            {/* Footer tip */}
            <div className="p-2.5 px-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-mono text-[9px] border border-white/10">Esc</kbd> to close</span>
              <span>Universal OS Search</span>
            </div>
          </div>
        </div>
      )}

      {/* Start Menu Flyout */}
      {startMenuOpen && (
        <div
          onClick={() => setStartMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-16 left-4 w-96 max-w-[calc(100vw-32px)] bg-slate-900/90 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header User Profile & Power */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
                  R
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">Rocket User</div>
                  <div className="text-[10px] text-sky-400 font-mono">Kernel Space v2.0</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  onReboot();
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                title={t.restart}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Apps List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[50vh]">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t.pinnedApps}
              </div>

              {allApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    app.action();
                    setStartMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/10 text-left transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-black/30 border border-white/10 group-hover:scale-105 transition-transform shrink-0">
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-white group-hover:text-sky-300 truncate">
                      {app.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{app.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Status */}
            <div className="p-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Kernel Ready
              </span>
              <button
                onClick={() => {
                  setStartMenuOpen(false);
                  onOpenApp('settings');
                }}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <SettingsIcon className="w-3 h-3" />
                Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Center Flyout */}
      {controlCenterOpen && (
        <div
          onClick={() => setControlCenterOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-16 right-4 w-80 max-w-[calc(100vw-32px)] bg-slate-900/90 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-4 flex flex-col gap-4 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span>{t.controlCenter}</span>
              <span className="text-[10px] font-mono text-sky-400">RocketOS</span>
            </div>

            {/* Quick Toggle Tiles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ wifiConnected: !settings.wifiConnected })}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                  settings.wifiConnected
                    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Wifi className="w-5 h-5" />
                <span className="text-xs font-semibold">{t.wifi}</span>
                <span className="text-[9px] font-mono text-slate-400">
                  {settings.wifiConnected ? 'Connected' : 'Offline'}
                </span>
              </button>

              <button
                onClick={() => onUpdateSettings({ nightLight: !settings.nightLight })}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                  settings.nightLight
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-semibold">{t.nightLight}</span>
                <span className="text-[9px] font-mono text-slate-400">
                  {settings.nightLight ? 'Active' : 'Off'}
                </span>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  {t.volume}
                </span>
                <span className="font-mono text-[10px]">{settings.isMuted ? 'Muted' : `${settings.volume}%`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.isMuted ? 0 : settings.volume}
                onChange={(e) =>
                  onUpdateSettings({ volume: parseInt(e.target.value), isMuted: false })
                }
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Calendar & Clock Settings Flyout */}
      {calendarOpen && (
        <div
          onClick={() => setCalendarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-16 right-4 w-84 max-w-[calc(100vw-32px)] bg-slate-900/90 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-4 flex flex-col gap-4 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="text-center pb-2 border-b border-white/10">
              <div className="text-3xl font-light text-white tracking-tight">{timeStr}</div>
              <div className="text-xs font-medium text-sky-300 mt-0.5">{dateStr}</div>
            </div>

            {/* Time Format Customization */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {t.timeSettings}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '12h' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    settings.timeFormat === '12h'
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {t.format12h}
                </button>
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '24h' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    settings.timeFormat === '24h'
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {t.format24h}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200">
                <span>{t.secondsToggle}</span>
                <input
                  type="checkbox"
                  checked={settings.showSeconds}
                  onChange={(e) => onUpdateSettings({ showSeconds: e.target.checked })}
                  className="w-4 h-4 accent-sky-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taskbar Right-Click Context Menu */}
      {taskbarContextMenu && (
        <div
          style={{ top: `${taskbarContextMenu.y}px`, left: `${taskbarContextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-1.5 text-slate-200 text-xs font-sans space-y-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {taskbarContextMenu.appId ? (
            /* Context Menu for specific Taskbar Icon */
            <>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                {getAppMeta(taskbarContextMenu.appId).title}
              </div>

              {/* Pin / Unpin option */}
              <button
                onClick={() => {
                  onTogglePin(taskbarContextMenu.appId!);
                  setTaskbarContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {pinnedAppIds.includes(taskbarContextMenu.appId)
                    ? 'Unpin from taskbar'
                    : 'Pin to taskbar'}
                </span>
              </button>

              {/* Close window if running */}
              {taskbarContextMenu.winId && (
                <button
                  onClick={() => {
                    onCloseWindow(taskbarContextMenu.winId!);
                    setTaskbarContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close window</span>
                </button>
              )}
            </>
          ) : (
            /* Context Menu for empty Taskbar area */
            <>
              <button
                onClick={() => {
                  onOpenApp('taskmanager');
                  setTaskbarContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>Task Manager</span>
              </button>

              <button
                onClick={() => {
                  onOpenApp('settings');
                  setTaskbarContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Taskbar & System Settings</span>
              </button>

              <div className="h-[1px] bg-white/10 my-1" />

              <button
                onClick={() => {
                  onToggleShowDesktop();
                  setTaskbarContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>Show Desktop</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Workspaces / Virtual Desktops Flyout */}
      {workspacesMenuOpen && (
        <div
          onClick={() => setWorkspacesMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs flex items-end justify-start p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-5 mb-14 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm text-white">Virtual Desktops & Workspaces</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Current: Desktop {currentWorkspace}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 1, name: 'Main Work', desc: 'Productivity & Office', icon: '💻' },
                { id: 2, name: 'Development', desc: 'Code & Terminal', icon: '⚡' },
                { id: 3, name: 'Creative', desc: 'Paint & 2D Engine', icon: '🎨' },
              ].map((ws) => {
                const count = windows.filter((w) => (w.workspaceId || 1) === ws.id).length;
                const isCurrent = currentWorkspace === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onChangeWorkspace(ws.id);
                      soundEngine.playSnap();
                      setWorkspacesMenuOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isCurrent
                        ? 'bg-sky-500/20 border-sky-400/60 ring-2 ring-sky-400/40 shadow-lg shadow-sky-950/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{ws.icon}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-300 font-mono">
                        {count} {count === 1 ? 'window' : 'windows'}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Desktop {ws.id}</div>
                      <div className="text-[10px] text-slate-400">{ws.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-[10px] text-slate-400 text-center font-mono">
              Click any workspace to switch • Windows can be assigned to different desktops
            </div>
          </div>
        </div>
      )}

      {/* Main Transparent Liquid Glass Taskbar */}
      <nav
        id="taskbar"
        onContextMenu={handleTaskbarContextMenu}
        className="fixed bottom-0 left-0 right-0 h-14 bg-slate-950/40 backdrop-blur-3xl border-t border-white/[0.12] shadow-[0_-8px_32px_rgba(0,0,0,0.4)] z-30 flex items-center justify-between px-3 sm:px-5 select-none"
      >
        {/* Left: Start Button, Universal Search, and Pinned/Running Apps */}
        <div className="flex items-center gap-2 h-full">
          {/* Start Menu Button */}
          <button
            id="start-button"
            onClick={() => {
              setControlCenterOpen(false);
              setCalendarOpen(false);
              setSearchFlyoutOpen(false);
              setWorkspacesMenuOpen(false);
              if (!startMenuOpen) soundEngine.playOpen();
              setStartMenuOpen(!startMenuOpen);
            }}
            className="w-10 h-10 rounded-2xl bg-white/[0.12] hover:bg-white/[0.22] active:scale-95 border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Start Menu"
          >
            <div className="grid grid-cols-2 gap-1 w-4 h-4 pointer-events-none">
              <div className="rounded-[2.5px] bg-white/95 shadow-xs" />
              <div className="rounded-[2.5px] bg-sky-400/90 shadow-xs" />
              <div className="rounded-[2.5px] bg-indigo-400/90 shadow-xs" />
              <div className="rounded-[2.5px] bg-white/70 shadow-xs" />
            </div>
          </button>

          {/* Windows-style Universal Search Button */}
          <button
            id="taskbar-search-trigger"
            onClick={() => {
              setSearchFlyoutOpen(!searchFlyoutOpen);
              setStartMenuOpen(false);
              setCalendarOpen(false);
              setControlCenterOpen(false);
              setWorkspacesMenuOpen(false);
            }}
            className="h-10 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-xl flex items-center gap-2 shrink-0 active:scale-95"
            title="Search files, folders, and apps (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-400 hidden sm:inline font-normal">Search...</span>
            <kbd className="hidden md:inline text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-slate-400 border border-white/10">
              Ctrl+K
            </kbd>
          </button>

          {/* Virtual Desktops / Workspaces Button */}
          <button
            id="taskbar-workspaces-trigger"
            onClick={() => {
              setWorkspacesMenuOpen(!workspacesMenuOpen);
              setStartMenuOpen(false);
              setCalendarOpen(false);
              setControlCenterOpen(false);
              setSearchFlyoutOpen(false);
              soundEngine.playPin();
            }}
            className={`h-10 px-2.5 rounded-2xl border transition-all cursor-pointer backdrop-blur-xl flex items-center gap-1.5 shrink-0 active:scale-95 ${
              workspacesMenuOpen
                ? 'bg-sky-500/25 border-sky-400/50 text-white'
                : 'bg-white/[0.08] hover:bg-white/[0.16] border-white/15 text-slate-300 hover:text-white'
            }`}
            title="Virtual Desktops & Task View"
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold hidden sm:inline">Desktop {currentWorkspace}</span>
          </button>

          {/* Subtle Vertical Separator */}
          {taskbarItems.length > 0 && (
            <div className="h-6 w-[1px] bg-white/15 mx-0.5 shrink-0" />
          )}

          {/* Pinned & Running Apps (NO scrollbar, perfectly aligned next to each other like Windows) */}
          <div className="flex items-center gap-1.5 h-full">
            {taskbarItems.map((item) => {
              const appMeta = getAppMeta(item.appId);
              const win = item.window;
              const isRunning = !!win;
              const isActive = win && activeWindowId === win.id && !win.isMinimized;
              const isMinimized = win && win.isMinimized;

              return (
                <div key={`${item.appId}-${win?.id || 'pinned'}`} className="relative group">
                  {/* Floating Tooltip displaying App Name & Status */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-950/95 backdrop-blur-md text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-white/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                    <span>{win ? win.icon : appMeta.glyph}</span>
                    <span>{win ? win.title : appMeta.title}</span>
                    {isMinimized && (
                      <span className="text-[10px] text-amber-300/90 font-mono">(Minimized)</span>
                    )}
                    {item.isPinned && !isRunning && (
                      <span className="text-[9px] text-sky-300/90 font-mono">Pinned</span>
                    )}
                  </div>

                  <button
                    id={`taskbar-icon-${item.appId}`}
                    onClick={() => {
                      if (win) {
                        if (activeWindowId === win.id && !win.isMinimized) {
                          soundEngine.playMinimize();
                          onMinimizeWindow(win.id);
                        } else {
                          soundEngine.playRestore();
                          onSelectWindow(win.id);
                        }
                      } else {
                        soundEngine.playOpen();
                        appMeta.action();
                      }
                    }}
                    onContextMenu={(e) => handleIconContextMenu(e, item.appId, win?.id)}
                    className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.22] border border-white/40 text-white shadow-md shadow-sky-950/40 scale-102'
                        : isMinimized
                        ? 'bg-white/[0.08] border border-white/10 hover:bg-white/[0.18] text-slate-300 opacity-90'
                        : isRunning
                        ? 'bg-white/[0.06] border border-white/10 hover:bg-white/[0.16] text-slate-200'
                        : 'bg-transparent border border-transparent hover:bg-white/[0.10] hover:border-white/15 text-slate-300'
                    }`}
                    title={win ? win.title : appMeta.title}
                  >
                    <span className="text-base select-none leading-none">
                      {win ? win.icon : appMeta.glyph}
                    </span>

                    {/* Window Status Indicator Bar / Dot */}
                    {isActive ? (
                      <div className="absolute bottom-1 w-4 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                    ) : isMinimized ? (
                      <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                    ) : isRunning ? (
                      <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-slate-300/80" />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Action Controls, Language Badge, Clock */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Settings Button */}
          <button
            onClick={() => {
              setStartMenuOpen(false);
              setCalendarOpen(false);
              setSearchFlyoutOpen(false);
              setControlCenterOpen(!controlCenterOpen);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              controlCenterOpen
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white/[0.06] border-white/10 hover:bg-white/[0.12] text-slate-300'
            }`}
            title="Quick Settings"
          >
            {settings.isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Language Pill */}
          <button
            onClick={() => {
              const langKeys: SystemLanguage[] = ['en', 'es', 'fr', 'de', 'ja'];
              const curIdx = langKeys.indexOf(settings.language);
              const nextLang = langKeys[(curIdx + 1) % langKeys.length];
              onUpdateSettings({ language: nextLang });
            }}
            className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 cursor-pointer transition-colors"
            title="Click to cycle system language"
          >
            <span>{TRANSLATIONS[settings.language].flag}</span>
            <span className="font-bold">{settings.language.toUpperCase()}</span>
          </button>

          {/* Interactive Clock & Calendar Trigger */}
          <button
            onClick={() => {
              setStartMenuOpen(false);
              setControlCenterOpen(false);
              setSearchFlyoutOpen(false);
              setCalendarOpen(!calendarOpen);
            }}
            className={`flex flex-col items-end px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
              calendarOpen
                ? 'bg-white/20 border-white/30 text-white'
                : 'border-transparent hover:bg-white/[0.08] text-slate-200'
            }`}
            title="Click to open Clock, Date & Format options"
          >
            <span className="font-semibold text-xs text-white tracking-wide">
              {timeStr || '12:00 PM'}
            </span>
            <span className="text-[10px] text-sky-300/80 font-medium">
              {dateStr}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
