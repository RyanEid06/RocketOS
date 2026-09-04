import React, { useState, useEffect, useRef } from 'react';
import { WindowState, AppId, SystemSettings, FSItem } from '../types';
import { SHELL_Z_LAYERS } from '../core/theme/tokens';
import {
  Folder,
  Terminal,
  Sparkles,
  Edit3,
  Activity,
  HardDrive,
  Trash2,
  ListTodo,
  Paintbrush,
  Pin,
  X,
  Plus,
  Wifi,
  Volume2,
  VolumeX,
  Layers,
  Search,
  Bell,
  BellOff,
  Sliders,
  Cpu,
  Zap,
  Radio,
  Package,
  StickyNote,
  GitBranch,
  Music,
  Globe,
  Monitor,
  Clock,
  Info,
  Minimize2,
  Shield,
  FileText,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { notificationService, SystemNotification } from '../core/notifications/NotificationService';
import { AppRegistry } from '../core/apps/AppRegistry';
import { ProcessManager } from '../core/process/ProcessManager';
import { StartMenu } from './taskbar/StartMenu';
import { SearchFlyout } from './taskbar/SearchFlyout';
import { QuickSettingsFlyout } from './taskbar/QuickSettingsFlyout';
import { ClockCalendarFlyout } from './taskbar/ClockCalendarFlyout';
import { WorkspaceSwitcher } from './taskbar/WorkspaceSwitcher';
import { NotificationFlyout } from './taskbar/NotificationFlyout';

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
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [searchFlyoutOpen, setSearchFlyoutOpen] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [workspacesMenuOpen, setWorkspacesMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(() =>
    notificationService.getNotifications()
  );

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Taskbar right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y?: number;
    isTaskbarBg?: boolean;
    appId?: AppId;
    winId?: string;
  } | null>(null);

  // App details diagnostics modal
  const [appDetailsAppId, setAppDetailsAppId] = useState<AppId | null>(null);

  // Window hover preview
  const [hoveredAppId, setHoveredAppId] = useState<AppId | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const handleItemMouseEnter = (appId: AppId) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredAppId(appId);
    }, 200);
  };

  const handleItemMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredAppId(null);
    }, 250);
  };

  const taskbarRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to notification updates
  useEffect(() => {
    return notificationService.subscribe((items) => {
      setNotifications(items);
    });
  }, []);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hourOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        second: settings.showSeconds ? '2-digit' : undefined,
        hour12: settings.timeFormat === '12h',
      };
      setTimeStr(now.toLocaleTimeString([], hourOptions));
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.showSeconds, settings.timeFormat]);

  // Global click to dismiss flyouts
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (taskbarRef.current && !taskbarRef.current.contains(e.target as Node)) {
        setStartMenuOpen(false);
        setSearchFlyoutOpen(false);
        setControlCenterOpen(false);
        setCalendarOpen(false);
        setWorkspacesMenuOpen(false);
        setNotificationsOpen(false);
        setContextMenu(null);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const closeAllFlyouts = () => {
    setStartMenuOpen(false);
    setSearchFlyoutOpen(false);
    setControlCenterOpen(false);
    setCalendarOpen(false);
    setWorkspacesMenuOpen(false);
    setNotificationsOpen(false);
    setContextMenu(null);
  };

  const getAppIcon = (appId: AppId) => {
    switch (appId) {
      case 'explorer':
        return <Folder className="w-5 h-5 text-sky-400" />;
      case 'thispc':
        return <HardDrive className="w-5 h-5 text-sky-400" />;
      case 'trash':
        return <Trash2 className="w-5 h-5 text-rose-400" />;
      case 'terminal':
        return <Terminal className="w-5 h-5 text-emerald-400" />;
      case 'rocket-studio':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'editor':
        return <Edit3 className="w-5 h-5 text-amber-400" />;
      case 'taskmanager':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'monitor':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'settings':
        return <Sliders className="w-5 h-5 text-slate-300" />;
      case 'paint':
        return <Paintbrush className="w-5 h-5 text-rose-400" />;
      case 'notes':
        return <ListTodo className="w-5 h-5 text-amber-400" />;
      case 'graphics':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'repl':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'widgets':
        return <StickyNote className="w-5 h-5 text-amber-400" />;
      case 'rocket-drop':
        return <Radio className="w-5 h-5 text-sky-400" />;
      case 'rockpm':
        return <Package className="w-5 h-5 text-emerald-400" />;
      case 'git':
        return <GitBranch className="w-5 h-5 text-orange-400" />;
      case 'media':
        return <Music className="w-5 h-5 text-pink-400" />;
      case 'browser':
        return <Globe className="w-5 h-5 text-sky-400" />;
      case 'display':
        return <Monitor className="w-5 h-5 text-violet-400" />;
      case 'cron':
        return <Clock className="w-5 h-5 text-emerald-400" />;
      case 'calculator':
        return <Cpu className="w-5 h-5 text-teal-400" />;
      case 'pdf-viewer':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'backup':
        return <HardDrive className="w-5 h-5 text-indigo-400" />;
      default:
        return <Folder className="w-5 h-5 text-sky-400" />;
    }
  };

  // Build the list of taskbar icons:
  // 1. Pinned apps
  // 2. Any currently open window whose appId is NOT already pinned
  const displayedTaskbarItems: {
    appId: AppId;
    isPinned: boolean;
    runningWindows: WindowState[];
    isActive: boolean;
  }[] = [];

  pinnedAppIds.forEach((appId) => {
    const matchingWindows = windows.filter((w) => w.appId === appId);
    const isActive = matchingWindows.some((w) => w.id === activeWindowId && !w.isMinimized);
    displayedTaskbarItems.push({
      appId,
      isPinned: true,
      runningWindows: matchingWindows,
      isActive,
    });
  });

  windows.forEach((w) => {
    if (!pinnedAppIds.includes(w.appId)) {
      const existing = displayedTaskbarItems.find((item) => item.appId === w.appId);
      if (existing) {
        if (!existing.runningWindows.some((win) => win.id === w.id)) {
          existing.runningWindows.push(w);
        }
        if (w.id === activeWindowId && !w.isMinimized) {
          existing.isActive = true;
        }
      } else {
        displayedTaskbarItems.push({
          appId: w.appId,
          isPinned: false,
          runningWindows: [w],
          isActive: w.id === activeWindowId && !w.isMinimized,
        });
      }
    }
  });

  const handleTaskbarItemClick = (item: typeof displayedTaskbarItems[0]) => {
    if (item.runningWindows.length === 0) {
      onOpenApp(item.appId);
      return;
    }

    const activeWin = item.runningWindows.find((w) => w.id === activeWindowId);
    if (activeWin) {
      if (activeWin.isMinimized) {
        onSelectWindow(activeWin.id);
      } else {
        onMinimizeWindow(activeWin.id);
      }
    } else {
      // Focus highest window
      const highest = [...item.runningWindows].sort((a, b) => b.zIndex - a.zIndex)[0];
      if (highest) {
        onSelectWindow(highest.id);
      }
    }
  };

  const handleTaskbarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, isTaskbarBg: true });
    soundEngine.playClick();
  };

  const handleAppContextMenu = (e: React.MouseEvent, appId: AppId, winId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, appId, winId, isTaskbarBg: false });
    soundEngine.playClick();
  };

  const isMutedEffective = settings.isMuted || settings.volume === 0;

  return (
    <div
      ref={taskbarRef}
      id="taskbar"
      onContextMenu={handleTaskbarContextMenu}
      style={{ zIndex: SHELL_Z_LAYERS.TASKBAR }}
      className="fixed bottom-0 left-0 right-0 h-12 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 px-3 flex items-center justify-between select-none shadow-2xl"
    >
      {/* Left Section: Start Button, Workspaces, Search Launcher */}
      <div className="flex items-center gap-1.5">
        {/* Start Button - Microsoft 4-Square style with RocketOS Liquid Glass aesthetic */}
        <button
          id="start-menu-button"
          type="button"
          onClick={() => {
            const next = !startMenuOpen;
            closeAllFlyouts();
            if (next) {
              setStartMenuOpen(true);
              soundEngine.playOpen();
            }
          }}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer group shrink-0 ${
            startMenuOpen
              ? 'bg-white/15 shadow-sm'
              : 'hover:bg-white/10 opacity-90 hover:opacity-100'
          }`}
          title="Start Menu"
        >
          <div className="w-[21px] h-[21px] grid grid-cols-2 gap-[2px] transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
            <div
              className={`rounded-[2px] transition-all duration-150 ${
                startMenuOpen
                  ? 'bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'bg-sky-400 group-hover:bg-sky-300 group-hover:shadow-[0_0_6px_rgba(56,189,248,0.5)]'
              }`}
            />
            <div
              className={`rounded-[2px] transition-all duration-150 ${
                startMenuOpen
                  ? 'bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'bg-sky-400 group-hover:bg-sky-300 group-hover:shadow-[0_0_6px_rgba(56,189,248,0.5)]'
              }`}
            />
            <div
              className={`rounded-[2px] transition-all duration-150 ${
                startMenuOpen
                  ? 'bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'bg-sky-400 group-hover:bg-sky-300 group-hover:shadow-[0_0_6px_rgba(56,189,248,0.5)]'
              }`}
            />
            <div
              className={`rounded-[2px] transition-all duration-150 ${
                startMenuOpen
                  ? 'bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'bg-sky-400 group-hover:bg-sky-300 group-hover:shadow-[0_0_6px_rgba(56,189,248,0.5)]'
              }`}
            />
          </div>
        </button>

        {/* Virtual Desktop Workspaces Switcher Button */}
        <button
          type="button"
          onClick={() => {
            const next = !workspacesMenuOpen;
            closeAllFlyouts();
            if (next) {
              setWorkspacesMenuOpen(true);
              soundEngine.playOpen();
            }
          }}
          className={`h-9 px-2.5 rounded-2xl flex items-center gap-1.5 border transition-all cursor-pointer text-xs font-semibold ${
            workspacesMenuOpen
              ? 'bg-purple-500/30 text-purple-300 border-purple-400/50 shadow-md shadow-purple-500/10'
              : 'hover:bg-white/10 border-transparent text-slate-300 hover:text-white'
          }`}
          title="Virtual Desktops"
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-[11px]">#{currentWorkspace}</span>
        </button>

        {/* Universal Search Button */}
        <button
          type="button"
          onClick={() => {
            const next = !searchFlyoutOpen;
            closeAllFlyouts();
            if (next) {
              setSearchFlyoutOpen(true);
              soundEngine.playOpen();
            }
          }}
          className={`h-9 px-3 rounded-2xl flex items-center gap-2 border transition-all cursor-pointer ${
            searchFlyoutOpen
              ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-md'
              : 'hover:bg-white/10 border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Universal Search"
        >
          <Search className="w-4 h-4 text-sky-400" />
          <span className="text-xs hidden md:inline font-medium">Search...</span>
        </button>
      </div>

      {/* Center Section: Pinned and Running App Icons */}
      <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-0.5 overflow-x-auto custom-scrollbar">
        {displayedTaskbarItems.map((item) => {
          const app = AppRegistry.getApp(item.appId);
          const isRunning = item.runningWindows.length > 0;
          const isHovered = hoveredAppId === item.appId && isRunning;

          return (
            <div
              key={item.appId}
              className="relative"
              onMouseEnter={() => handleItemMouseEnter(item.appId)}
              onMouseLeave={handleItemMouseLeave}
            >
              <button
                type="button"
                onClick={() => handleTaskbarItemClick(item)}
                onContextMenu={(e) =>
                  handleAppContextMenu(e, item.appId, item.runningWindows[0]?.id)
                }
                className={`relative h-9 px-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer group ${
                  item.isActive
                    ? 'bg-white/20 shadow-md backdrop-blur-md scale-105 border border-white/25'
                    : isRunning
                    ? 'bg-white/10 hover:bg-white/15 border border-white/10'
                    : 'hover:bg-white/10 opacity-80 hover:opacity-100 border border-transparent'
                }`}
                title={`${app.displayName}${isRunning ? ' (Running)' : ''}${item.isPinned ? ' (Pinned)' : ''}`}
              >
                <div className="w-6 h-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {getAppIcon(item.appId)}
                </div>

                {/* Running indicator pip under icon */}
                {isRunning && (
                  <div className="absolute bottom-1 flex items-center gap-0.5">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        item.isActive
                          ? 'accent-bg w-3 shadow-[0_0_8px_var(--rkt-accent)]'
                          : 'bg-white/70 w-1.5'
                      }`}
                    />
                    {item.runningWindows.length > 1 && (
                      <div className="w-1 h-1 rounded-full bg-white/70" />
                    )}
                  </div>
                )}
              </button>

              {/* Window Hover Preview Thumbnail Flyout */}
              {isHovered && (
                <div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.runningWindows.map((rw) => (
                    <div
                      key={rw.id}
                      onClick={() => {
                        onSelectWindow(rw.id);
                        setHoveredAppId(null);
                      }}
                      className="w-44 p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-sky-400/50 cursor-pointer transition-all flex flex-col gap-2 group/win"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover/win:text-white">
                        <span className="truncate max-w-[110px]">{rw.title}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseWindow(rw.id);
                          }}
                          className="w-4 h-4 rounded-full hover:bg-red-500/30 text-slate-400 hover:text-red-400 flex items-center justify-center text-[10px]"
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="h-16 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-[11px] text-slate-500 font-mono">
                        {rw.isMinimized ? '(Minimized)' : 'Active Window'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Section: System Tray (WiFi, Volume, Clock, Notifications, Show Desktop) */}
      <div className="flex items-center gap-1.5">
        {/* Quick Settings (WiFi + Volume) */}
        <button
          type="button"
          onClick={() => {
            const next = !controlCenterOpen;
            closeAllFlyouts();
            if (next) {
              setControlCenterOpen(true);
              soundEngine.playOpen();
            }
          }}
          onContextMenu={handleTaskbarContextMenu}
          className={`h-9 px-2.5 rounded-2xl flex items-center gap-2 border transition-all cursor-pointer ${
            controlCenterOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'hover:bg-white/10 border-transparent text-slate-300 hover:text-white'
          }`}
          title="Quick Settings"
        >
          <Wifi
            className={`w-3.5 h-3.5 ${
              settings.wifiConnected ? 'text-sky-400' : 'text-slate-500'
            }`}
          />
          {isMutedEffective ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-slate-200" />
          )}
        </button>

        {/* Live Clock & Calendar */}
        <button
          type="button"
          onClick={() => {
            const next = !calendarOpen;
            closeAllFlyouts();
            if (next) {
              setCalendarOpen(true);
              soundEngine.playOpen();
            }
          }}
          onContextMenu={handleTaskbarContextMenu}
          className={`h-9 px-3 rounded-2xl flex flex-col justify-center text-right border transition-all cursor-pointer ${
            calendarOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'hover:bg-white/10 border-transparent text-slate-300 hover:text-white'
          }`}
          title="Clock & Calendar"
        >
          <span className="font-mono text-xs font-semibold leading-tight text-white">
            {timeStr}
          </span>
          <span className="text-[10px] text-slate-400 leading-tight">{dateStr}</span>
        </button>

        {/* Notifications Tray Icon */}
        <button
          type="button"
          onClick={() => {
            const next = !notificationsOpen;
            closeAllFlyouts();
            if (next) {
              setNotificationsOpen(true);
              soundEngine.playOpen();
            }
          }}
          onContextMenu={handleTaskbarContextMenu}
          className={`h-9 w-9 rounded-2xl flex items-center justify-center border relative transition-all cursor-pointer ${
            notificationsOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'hover:bg-white/10 border-transparent text-slate-300 hover:text-white'
          }`}
          title={settings.focusMode ? 'Notification Center (Do Not Disturb Active)' : 'Notification Center'}
        >
          {settings.focusMode ? (
            <BellOff className="w-4 h-4 text-purple-400" />
          ) : (
            <Bell className="w-4 h-4 text-slate-300" />
          )}
          {notifications.some((n) => !n.isRead) && !settings.focusMode && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          )}
          {notifications.some((n) => !n.isRead) && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400" />
          )}
        </button>

        {/* Show Desktop Sliver */}
        <div
          onClick={onToggleShowDesktop}
          onContextMenu={handleTaskbarContextMenu}
          className="w-2.5 h-8 ml-1 rounded-full bg-white/10 hover:bg-sky-400 transition-colors cursor-pointer"
          title="Show Desktop"
        />
      </div>

      {/* Flyout Subcomponents */}
      <StartMenu
        isOpen={startMenuOpen}
        settings={settings}
        pinnedAppIds={pinnedAppIds}
        onClose={() => setStartMenuOpen(false)}
        onOpenApp={onOpenApp}
        onTogglePin={onTogglePin}
        onReboot={onReboot}
        onOpenSearch={() => {
          setStartMenuOpen(false);
          setSearchFlyoutOpen(true);
        }}
      />

      <SearchFlyout
        isOpen={searchFlyoutOpen}
        fileSystem={fileSystem}
        onClose={() => setSearchFlyoutOpen(false)}
        onOpenApp={onOpenApp}
        onOpenFile={onOpenFile}
        onOpenExplorerPath={onOpenExplorerPath}
      />

      <QuickSettingsFlyout
        isOpen={controlCenterOpen}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onOpenSettings={() => onOpenApp('settings')}
        onClose={() => setControlCenterOpen(false)}
      />

      <ClockCalendarFlyout
        isOpen={calendarOpen}
        timeStr={timeStr}
        dateStr={dateStr}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onOpenSettings={() => onOpenApp('settings')}
      />

      <WorkspaceSwitcher
        isOpen={workspacesMenuOpen}
        currentWorkspace={currentWorkspace}
        windows={windows}
        onChangeWorkspace={onChangeWorkspace}
        onClose={() => setWorkspacesMenuOpen(false)}
      />

      <NotificationFlyout
        isOpen={notificationsOpen}
        notifications={notifications}
        focusMode={settings.focusMode}
        onToggleFocusMode={() => onUpdateSettings({ focusMode: !settings.focusMode })}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Right Click Context Menu (Taskbar Background or App Icon) */}
      {contextMenu && (
        <>
          <div
            style={{ zIndex: SHELL_Z_LAYERS.CONTEXT_MENU - 1 }}
            className="fixed inset-0 bg-transparent"
            onMouseDown={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{
              zIndex: SHELL_Z_LAYERS.CONTEXT_MENU,
              bottom: '54px',
              left: `${Math.min(Math.max(12, contextMenu.x - 40), Math.max(12, window.innerWidth - 270))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed w-64 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-2 text-slate-200 text-xs space-y-1 select-none animate-in fade-in zoom-in-95 duration-100"
          >
          {/* Taskbar Background Right-Click Menu */}
          {contextMenu.isTaskbarBg ? (
            <>
              <div className="px-2 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="uppercase tracking-wider">RocketOS Taskbar</span>
                <span className="text-[10px] text-sky-400 font-mono">Workspace {currentWorkspace}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenApp('taskmanager');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-white font-medium"
              >
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Task Manager</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenApp('settings');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Sliders className="w-4 h-4 text-slate-300" />
                <span>Taskbar & System Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenApp('display');
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Monitor className="w-4 h-4 text-violet-400" />
                <span>Display & Calibration</span>
              </button>

              <div className="border-t border-white/10 my-1" />

              <button
                type="button"
                onClick={() => {
                  onToggleShowDesktop();
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Show / Restore Desktop</span>
              </button>

              {windows.filter((w) => !w.isMinimized).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    windows.forEach((w) => {
                      if (!w.isMinimized) onMinimizeWindow(w.id);
                    });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-amber-400" />
                  <span>Minimize All Windows</span>
                </button>
              )}
            </>
          ) : (
            /* App Icon Right-Click Menu */
            contextMenu.appId && (
              <>
                {(() => {
                  const appDef = AppRegistry.getApp(contextMenu.appId!);
                  const matchingWindows = windows.filter((w) => w.appId === contextMenu.appId);
                  const isRunning = matchingWindows.length > 0;
                  return (
                    <div className="px-2.5 py-2 border-b border-white/10 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg">{appDef.glyph}</span>
                        <div className="truncate">
                          <div className="font-semibold text-white truncate text-xs">
                            {appDef.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isRunning
                              ? `${matchingWindows.length} window${matchingWindows.length > 1 ? 's' : ''} open`
                              : 'Pinned Application'}
                          </div>
                        </div>
                      </div>
                      {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />
                      )}
                    </div>
                  );
                })()}

                {/* App Details & Properties */}
                <button
                  type="button"
                  onClick={() => {
                    setAppDetailsAppId(contextMenu.appId!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                >
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>App Details & Diagnostics</span>
                </button>

                {/* New Window */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenApp(contextMenu.appId!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>New Window</span>
                </button>

                {/* Pin / Unpin */}
                <button
                  type="button"
                  onClick={() => {
                    onTogglePin(contextMenu.appId!);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                >
                  <Pin className="w-4 h-4 text-amber-400" />
                  <span>
                    {pinnedAppIds.includes(contextMenu.appId)
                      ? 'Unpin from Taskbar'
                      : 'Pin to Taskbar'}
                  </span>
                </button>

                {/* Running Window Controls: Minimize / Restore & Close */}
                {contextMenu.winId && (
                  <>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        const win = windows.find((w) => w.id === contextMenu.winId);
                        if (win) {
                          if (win.isMinimized) onSelectWindow(win.id);
                          else onMinimizeWindow(win.id);
                        }
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                    >
                      <Layers className="w-4 h-4 text-slate-300" />
                      <span>
                        {windows.find((w) => w.id === contextMenu.winId)?.isMinimized
                          ? 'Restore Window'
                          : 'Minimize Window'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCloseWindow(contextMenu.winId!);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4 text-rose-400" />
                      <span>Close Window</span>
                    </button>
                  </>
                )}

                {/* Close All Windows for this App */}
                {(() => {
                  const appWins = windows.filter((w) => w.appId === contextMenu.appId);
                  if (appWins.length > 1) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          appWins.forEach((w) => onCloseWindow(w.id));
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors border-t border-white/5 pt-1.5"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Close All ({appWins.length}) Windows</span>
                      </button>
                    );
                  }
                  return null;
                })()}
              </>
            )
          )}
        </div>
      </>
    )}

      {/* App Details & Diagnostics Modal */}
      {appDetailsAppId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAppDetailsAppId(null)}
        >
          {(() => {
            const app = AppRegistry.getApp(appDetailsAppId);
            const matchingWindows = windows.filter((w) => w.appId === appDetailsAppId);
            const primaryProcess = ProcessManager.getInstance().findActiveByAppId(appDetailsAppId);

            return (
              <div
                className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl shadow-2xl p-6 text-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                      {app.glyph}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{app.displayName}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                          {app.category}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-sky-400">{app.id}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppDetailsAppId(null)}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">{app.description}</p>

                {/* Process Diagnostics */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Runtime Process State</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Process ID (PID)</span>
                      <span className="font-mono font-semibold text-white">
                        {primaryProcess ? `PID ${primaryProcess.pid}` : 'Not Running'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Lifecycle Status</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {primaryProcess ? primaryProcess.state : 'STOPPED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Resident Memory</span>
                      <span className="font-mono font-semibold text-white">
                        {primaryProcess
                          ? `${(primaryProcess.accounting.memoryRssBytes / (1024 * 1024)).toFixed(1)} MB`
                          : '0.0 MB'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">CPU Usage</span>
                      <span className="font-mono font-semibold text-white">
                        {primaryProcess
                          ? `${(primaryProcess.accounting.cpuPercentTenth / 10).toFixed(1)}%`
                          : '0.0%'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Windows & Sandbox Capabilities */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold">Active Windows:</span>
                    <span className="font-mono text-sky-400">{matchingWindows.length} open</span>
                  </div>
                  {matchingWindows.length > 0 && (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                      {matchingWindows.map((win) => (
                        <div
                          key={win.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
                        >
                          <span className="truncate max-w-[200px] text-white text-xs">
                            {win.title}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectWindow(win.id);
                                setAppDetailsAppId(null);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] cursor-pointer"
                            >
                              Focus
                            </button>
                            <button
                              type="button"
                              onClick={() => onCloseWindow(win.id)}
                              className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => onTogglePin(appDetailsAppId)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {pinnedAppIds.includes(appDetailsAppId) ? 'Unpin' : 'Pin to Taskbar'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {primaryProcess && (
                      <button
                        type="button"
                        onClick={() => {
                          ProcessManager.getInstance().kill(primaryProcess.pid);
                          matchingWindows.forEach((w) => onCloseWindow(w.id));
                          soundEngine.playTrash();
                          setAppDetailsAppId(null);
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Force Kill Process
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenApp(appDetailsAppId);
                        setAppDetailsAppId(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      Open Application
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
