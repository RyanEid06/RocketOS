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
  UserCheck,
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
  const [currentUser, setCurrentUser] = useState<SystemUser>(() =>
    UserManager.getInstance().getCurrentUser()
  );

  useEffect(() => {
    return UserManager.getInstance().subscribe(setCurrentUser);
  }, []);

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

  const getAppIconComponent = (id: AppId) => {
    switch (id) {
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
        return <SettingsIcon className="w-5 h-5 text-slate-300" />;
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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 left-4 z-50 w-[460px] max-w-[90vw] bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      {/* User Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-lg ${
              isRoot
                ? 'bg-gradient-to-tr from-rose-500 to-amber-600 shadow-rose-500/30'
                : 'bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-sky-500/20'
            }`}
          >
            {isRoot ? '⚡' : currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{currentUser.username}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                  isRoot
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
              >
                {isRoot ? 'ROOT (UID 0)' : `UID ${currentUser.uid}`}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {isRoot ? 'System Administrator • Full Access' : 'Standard User • Group: users, admin'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleElevation}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer border ${
              isRoot
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/30'
            }`}
            title={isRoot ? 'Drop root privileges back to ryan' : 'Elevate privileges to root (sudo)'}
          >
            {isRoot ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            <span>{isRoot ? 'Drop Root' : 'Elevate (sudo)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenApp('settings');
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReboot}
            className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Restart RocketOS"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Search Bar inside Start Menu */}
      <div
        onClick={onOpenSearch}
        className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/40 border border-white/10 hover:border-sky-400/50 rounded-2xl cursor-pointer text-slate-400 hover:text-slate-200 transition-colors shadow-inner"
      >
        <Search className="w-4 h-4 text-slate-400" />
        <span className="text-xs">Type here to search apps, files, settings...</span>
      </div>

      {/* Pinned Applications Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.pinnedApps || 'Pinned Applications'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {pinnedAppIds.length} Pinned
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {pinnedAppIds.map((appId) => {
            const app = AppRegistry.getApp(appId);
            return (
              <button
                key={appId}
                type="button"
                onClick={() => {
                  onOpenApp(appId);
                  onClose();
                }}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                  {getAppIconComponent(appId)}
                </div>
                <span className="text-[11px] font-medium text-slate-200 group-hover:text-white truncate max-w-[85px] text-center">
                  {app.displayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent / Recommended Files & Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recent & Recommended
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Quick Open</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenApp('notes');
              onClose();
            }}
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ListTodo className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                Checklist & Notes
              </div>
              <div className="text-[9px] text-slate-400 truncate">Productivity scratchpad</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenApp('editor');
              onClose();
            }}
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                Rocket Editor
              </div>
              <div className="text-[9px] text-slate-400 truncate">rEdit script workspace</div>
            </div>
          </button>
        </div>
      </div>

      {/* All Applications Quick List */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.allApps || 'All Applications'}
          </span>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter..."
            className="w-24 px-2 py-0.5 bg-black/30 border border-white/10 rounded-lg text-[10px] text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[var(--rkt-accent)]"
          />
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <button
                type="button"
                onClick={() => {
                  onOpenApp(app.id);
                  onClose();
                }}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center shrink-0">
                  {getAppIconComponent(app.id)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {app.displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{app.description}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onTogglePin(app.id)}
                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                  pinnedAppIds.includes(app.id)
                    ? 'accent-text hover:bg-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={pinnedAppIds.includes(app.id) ? 'Unpin' : 'Pin to Taskbar'}
              >
                <Pin className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
