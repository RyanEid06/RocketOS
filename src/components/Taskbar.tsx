import React, { useState, useEffect, useRef } from 'react';
import { WindowState, AppId, SystemSettings, FSItem } from '../types';
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
  Sliders,
  Cpu,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { notificationService, SystemNotification } from '../core/notifications/NotificationService';
import { AppRegistry } from '../core/apps/AppRegistry';
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
    y: number;
    appId?: AppId;
    winId?: string;
  } | null>(null);

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
      default:
        return <Folder className="w-5 h-5 text-sky-400" />;
    }
  };

  // Build the list of taskbar icons:
  // 1. Pinned apps
  // 2. Any currently open window whose appId is NOT already pinned
  const runningWindowsInWorkspace = windows.filter(
    (w) => (w.workspaceId || 1) === currentWorkspace || w.workspaceId === 0
  );

  const displayedTaskbarItems: {
    appId: AppId;
    isPinned: boolean;
    runningWindows: WindowState[];
    isActive: boolean;
  }[] = [];

  pinnedAppIds.forEach((appId) => {
    const matchingWindows = runningWindowsInWorkspace.filter((w) => w.appId === appId);
    const isActive = matchingWindows.some((w) => w.id === activeWindowId && !w.isMinimized);
    displayedTaskbarItems.push({
      appId,
      isPinned: true,
      runningWindows: matchingWindows,
      isActive,
    });
  });

  runningWindowsInWorkspace.forEach((w) => {
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

  const handleContextMenu = (e: React.MouseEvent, appId: AppId, winId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.max(10, e.clientY - 120);
    setContextMenu({ x, y, appId, winId });
  };

  const isMutedEffective = settings.isMuted || settings.volume === 0;

  return (
    <div
      ref={taskbarRef}
      id="taskbar"
      className="fixed bottom-0 left-0 right-0 h-12 z-50 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 px-3 flex items-center justify-between select-none shadow-2xl"
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
              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
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
              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400 hover:text-slate-200'
          }`}
          title="Universal Search"
        >
          <Search className="w-4 h-4 text-sky-400" />
          <span className="text-xs hidden md:inline font-medium">Search...</span>
        </button>
      </div>

      {/* Center Section: Pinned and Running App Icons */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[50vw] px-2 py-0.5 custom-scrollbar">
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
                  handleContextMenu(e, item.appId, item.runningWindows[0]?.id)
                }
                className={`relative h-9 px-2.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer group ${
                  item.isActive
                    ? 'bg-white/20 shadow-md backdrop-blur-md scale-105 border border-white/25'
                    : isRunning
                    ? 'bg-white/10 hover:bg-white/15'
                    : 'hover:bg-white/5 opacity-80 hover:opacity-100'
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
          className={`h-9 px-2.5 rounded-2xl flex items-center gap-2 border transition-all cursor-pointer ${
            controlCenterOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
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
          className={`h-9 px-3 rounded-2xl flex flex-col justify-center text-right border transition-all cursor-pointer ${
            calendarOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
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
          className={`h-9 w-9 rounded-2xl flex items-center justify-center border relative transition-all cursor-pointer ${
            notificationsOpen
              ? 'bg-white/15 text-white border-white/20 shadow-md'
              : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'
          }`}
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          {notifications.some((n) => !n.isRead) && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          )}
          {notifications.some((n) => !n.isRead) && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400" />
          )}
        </button>

        {/* Show Desktop Sliver */}
        <div
          onClick={onToggleShowDesktop}
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
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-1.5 text-slate-200 text-xs space-y-1 select-none"
        >
          {contextMenu.appId && (
            <>
              <button
                type="button"
                onClick={() => {
                  onOpenApp(contextMenu.appId!);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>New Window</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTogglePin(contextMenu.appId!);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {pinnedAppIds.includes(contextMenu.appId)
                    ? 'Unpin from Taskbar'
                    : 'Pin to Taskbar'}
                </span>
              </button>
            </>
          )}

          {contextMenu.winId && (
            <button
              type="button"
              onClick={() => {
                onCloseWindow(contextMenu.winId!);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors border-t border-white/5 pt-1.5"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Close Window</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
