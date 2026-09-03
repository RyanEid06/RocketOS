import React from 'react';
import {
  Wifi,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Globe,
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SystemSettings, SystemLanguage } from '../../types';
import { TRANSLATIONS } from '../../utils/localization';
import { SystemManifest } from '../../core/manifest/SystemManifest';

interface QuickSettingsFlyoutProps {
  isOpen: boolean;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const QuickSettingsFlyout: React.FC<QuickSettingsFlyoutProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onClose,
}) => {
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;

  if (!isOpen) return null;

  const languages: { id: SystemLanguage; label: string }[] = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' },
    { id: 'ja', label: '日本語' },
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 right-4 z-50 w-[380px] max-w-[90vw] bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-5 text-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <span className="font-bold text-sm text-white">Quick Settings</span>
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
          className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Open Full Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* WiFi Tile */}
        <button
          type="button"
          onClick={() => onUpdateSettings({ wifiConnected: !settings.wifiConnected })}
          className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center gap-3 ${
            settings.wifiConnected
              ? 'bg-[var(--rkt-accent)]/20 border-[var(--rkt-accent)]/50 text-white shadow-lg shadow-[var(--rkt-accent)]/10'
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              settings.wifiConnected ? 'accent-bg text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Wifi className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs truncate">WiFi</div>
            <div className="text-[10px] opacity-75 truncate">
              {settings.wifiConnected ? 'Connected (Quantum-5G)' : 'Disconnected'}
            </div>
          </div>
        </button>

        {/* Night Light Tile */}
        <button
          type="button"
          onClick={() => onUpdateSettings({ nightLight: !settings.nightLight })}
          className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center gap-3 ${
            settings.nightLight
              ? 'bg-amber-500/20 border-amber-400/50 text-white shadow-lg shadow-amber-500/10'
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          <div
            className={`p-2 rounded-xl ${
              settings.nightLight ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {settings.nightLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs truncate">Night Light</div>
            <div className="text-[10px] opacity-75 truncate">
              {settings.nightLight ? 'Warm filter active' : 'Disabled'}
            </div>
          </div>
        </button>
      </div>

      {/* Master Volume Slider */}
      <div className="space-y-2 p-3 rounded-2xl bg-black/30 border border-white/5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => onUpdateSettings({ isMuted: !settings.isMuted })}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-sky-400"
            >
              {settings.isMuted || settings.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <span>Master Volume</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {settings.isMuted ? 'Muted' : `${settings.volume}%`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.isMuted ? 0 : settings.volume}
          onChange={(e) =>
            onUpdateSettings({ volume: parseInt(e.target.value, 10), isMuted: false })
          }
          className="w-full accent-[var(--rkt-accent)] cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
      </div>

      {/* Language Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Globe className="w-3.5 h-3.5" />
          <span>System Language</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {languages.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => onUpdateSettings({ language: lang.id })}
              className={`px-2.5 py-1 rounded-xl text-xs transition-colors cursor-pointer ${
                settings.language === lang.id
                  ? 'bg-[var(--rkt-accent)]/20 text-white font-bold border border-[var(--rkt-accent)]/40 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          <span>Protected Long Mode</span>
        </div>
        <div>{SystemManifest.VERSION.osVersion}</div>
      </div>
    </div>
  );
};
