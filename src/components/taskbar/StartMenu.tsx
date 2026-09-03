import React, { useState, useEffect } from 'react';
import {
  Folder,
  Terminal,
  Sparkles,
  Edit3,
  Activity,
  RotateCcw,
  Power,
  Settings as SettingsIcon,
  Search,
  HardDrive,
  Trash2,
  ListTodo,
  Paintbrush,
  Pin,
  X,
  Cpu,
  Shield,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Image,
  Rocket,
} from 'lucide-react';
import { AppId, SystemSettings } from '../../types';
import { TRANSLATIONS } from '../../utils/localization';
import { AppRegistry, AppDefinition } from '../../core/apps/AppRegistry';
import { UserManager } from '../../core/users/UserManager';
import { SystemUser } from '../../core/filesystem/types';

interface StartMenuProps {
  isOpen: boolean;
  settings: SystemSettings;
  pinnedAppIds: AppId[];
  onClose: () => void;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onTogglePin: (appId: AppId) => void;
  onReboot: () => void;
  onOpenSearch: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  settings,
  pinnedAppIds,
  onClose,
  onOpenApp,
  onTogglePin,
  onReboot,
  onOpenSearch,
}) => {
  const [filterText, setFilterText] = useState('');
  const [viewMode, setViewMode] = useState<'pinned' | 'all'>('pinned');
  const [currentUser, setCurrentUser] = useState<SystemUser>(() =>
    UserManager.getInstance().getCurrentUser()
  );

  useEffect(() => {
    return UserManager.getInstance().subscribe(setCurrentUser);
  }, []);

  // Reset filter and view mode when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setFilterText('');
      setViewMode('pinned');
    }
  }, [isOpen]);

  const handleToggleElevation = () => {
    if (currentUser.uid === 0) {
      UserManager.getInstance().dropToNormalUser();
    } else {
      UserManager.getInstance().elevateToRoot();
    }
  };

  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  if (!isOpen) return null;

  const allApps = AppRegistry.getAllApps();
  const filteredApps = filterText
    ? AppRegistry.searchApps(filterText)
    : allApps;

  const isRoot = currentUser.uid === 0;

  const getAppIcon = (id: AppId) => {
    switch (id) {
      case 'explorer':
        return <Folder className="w-4 h-4 text-sky-400" />;
      case 'thispc':
        return <HardDrive className="w-4 h-4 text-sky-400" />;
      case 'trash':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'terminal':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'rocket-studio':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-indigo-400" />;
      case 'taskmanager':
        return <Activity className="w-4 h-4 text-rose-400" />;
      case 'monitor':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      case 'settings':
        return <SettingsIcon className="w-4 h-4 text-slate-300" />;
      case 'paint':
        return <Paintbrush className="w-4 h-4 text-amber-400" />;
      case 'gallery':
        return <Image className="w-4 h-4 text-pink-400" />;
      case 'notes':
        return <ListTodo className="w-4 h-4 text-emerald-400" />;
      case 'graphics':
        return <Rocket className="w-4 h-4 text-purple-400" />;
      default:
        return <Folder className="w-4 h-4 text-sky-400" />;
    }
  };

  const isSearching = filterText.trim().length > 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-14 left-3 z-[60] w-[330px] max-w-[92vw] h-[490px] max-h-[calc(100vh-80px)] bg-slate-950/90 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl flex flex-col text-slate-100 select-none animate-in fade-in slide-in-from-bottom-3 duration-150 overflow-hidden"
    >
      {/* Top Search Bar */}
      <div className="p-3 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 border border-white/10 focus-within:border-sky-400/60 rounded-xl transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Type to search apps..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            autoFocus
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 custom-scrollbar">
        {/* Search Results Mode */}
        {isSearching ? (
          <div>
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Search Results ({filteredApps.length})
            </div>
            {filteredApps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No applications matching "{filterText}"
              </div>
            ) : (
              filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                  onClick={() => {
                    onOpenApp(app.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {getAppIcon(app.id)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {app.displayName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{app.description}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(app.id);
                    }}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                      pinnedAppIds.includes(app.id)
                        ? 'text-sky-400 hover:bg-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={pinnedAppIds.includes(app.id) ? 'Unpin' : 'Pin to Start'}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : viewMode === 'pinned' ? (
          /* Pinned Mode */
          <div className="space-y-3">
            {/* Header: Pinned Apps + All Apps toggle */}
            <div className="flex items-center justify-between px-2 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t.pinnedApps || 'Pinned'}
              </span>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer transition-colors"
              >
                <span>All Apps</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Curated Pinned Apps List */}
            <div className="space-y-0.5">
              {pinnedAppIds.map((appId) => {
                const app = AppRegistry.getApp(appId);
                return (
                  <div
                    key={appId}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                    onClick={() => {
                      onOpenApp(appId);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        {getAppIcon(appId)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                          {app.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{app.description}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(appId);
                      }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      title="Unpin from Start"
                    >
                      <Pin className="w-3 h-3 text-sky-400" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Access Section */}
            <div className="pt-2 border-t border-white/5 px-1 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                Quick Access
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenApp('gallery');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                    <Image className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-200 group-hover:text-white truncate">
                      Gallery
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenApp('terminal');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Terminal className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-200 group-hover:text-white truncate">
                      rsh Terminal
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* All Apps Mode */
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 hover:text-white cursor-pointer" onClick={() => setViewMode('pinned')}>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Back to Pinned</span>
            </div>

            <div className="space-y-0.5 pt-1">
              {allApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                  onClick={() => {
                    onOpenApp(app.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {getAppIcon(app.id)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {app.displayName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{app.description}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(app.id);
                    }}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                      pinnedAppIds.includes(app.id)
                        ? 'text-sky-400 hover:bg-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={pinnedAppIds.includes(app.id) ? 'Unpin' : 'Pin to Start'}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick User / Power Footer (Windows Start Menu Architecture + RocketOS Styling) */}
      <div className="p-2.5 border-t border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
        {/* User profile & elevation */}
        <div
          onClick={handleToggleElevation}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group"
          title={isRoot ? 'Click to drop root privileges' : 'Click to elevate to root (sudo)'}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm ${
              isRoot
                ? 'bg-gradient-to-tr from-rose-500 to-amber-600'
                : 'bg-gradient-to-tr from-sky-500 to-indigo-600'
            }`}
          >
            {isRoot ? '⚡' : currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                {currentUser.username}
              </span>
              {isRoot && (
                <span className="text-[9px] font-mono px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ROOT
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400">
              {isRoot ? 'Drop Root' : 'Elevate (sudo)'}
            </span>
          </div>
        </div>

        {/* Action icons: Settings, Full Search, Power/Reboot */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Search Files & System (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenApp('settings');
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onReboot}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Restart RocketOS"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
