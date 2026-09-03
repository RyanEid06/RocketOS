import React, { useState, useEffect } from 'react';
import { SystemSettings, WallpaperId, AccentColor, SystemLanguage, AppId } from '../../types';
import { REPO_METADATA } from '../../data/languageAnalysis';
import { TRANSLATIONS } from '../../utils/localization';
import { AppRegistry } from '../../core/apps/AppRegistry';
import { AppSecurityManager } from '../../core/apps/AppSecurityManager';
import { FileAssociations } from '../../core/filesystem/FileAssociations';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { CrashRecoveryService } from '../../core/recovery/CrashRecoveryService';
import { UserManager } from '../../core/users/UserManager';
import { getCoreProvider } from '../../core-api';
import {
  Palette,
  Monitor,
  Cpu,
  Volume2,
  Wifi,
  Moon,
  Sun,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  HardDrive,
  Clock,
  Globe,
  Database,
  Trash2,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface SettingsAppProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onReboot?: () => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  settings,
  onUpdateSettings,
  onReboot,
}) => {
  const [activeTab, setActiveTab] = useState<'personalization' | 'display' | 'time' | 'network' | 'apps' | 'storage' | 'system'>('personalization');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [fsStats, setFsStats] = useState<{ totalInodes: number; totalBytes: number; trashCount: number }>({
    totalInodes: 0,
    totalBytes: 0,
    trashCount: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      try {
        const rfs = RocketFS.getInstance();
        const snap = rfs.snapshot();
        const inodesList = Object.values(snap.inodes);
        const bytes = inodesList.reduce((sum, n) => sum + (n.sizeBytes || 0), 0);
        const trashRecords = rfs.getTrashSubsystem().listTrash();
        setFsStats({
          totalInodes: inodesList.length,
          totalBytes: bytes,
          trashCount: trashRecords.length,
        });
      } catch {
        // ignore
      }
    };
    updateStats();
  }, [activeTab]);

  const wallpapers: { id: WallpaperId; name: string; desc: string; previewClass: string }[] = [
    {
      id: 'liquid-aurora',
      name: 'Liquid Aurora (Glass)',
      desc: 'Deep fluid obsidian with refraction gradients & teal glass sheen',
      previewClass: 'bg-gradient-to-br from-[#060814] via-[#09152b] to-[#04060e]',
    },
    {
      id: 'frosted-titanium',
      name: 'Frosted Titanium',
      desc: 'Precision matte aluminum with subtle neutral specular highlights',
      previewClass: 'bg-gradient-to-br from-[#181a20] via-[#0e1015] to-[#08090c]',
    },
    {
      id: 'deep-obsidian',
      name: 'Deep Obsidian OLED',
      desc: 'Pure dark minimal aesthetic designed for high contrast glass',
      previewClass: 'bg-gradient-to-br from-[#0a0a0c] via-[#050507] to-[#000000]',
    },
    {
      id: 'classic-blue',
      name: 'Classic Blue',
      desc: 'Deep sapphire technical workstation gradient',
      previewClass: 'bg-gradient-to-br from-[#005bb5] via-[#003870] to-[#001f40]',
    },
    {
      id: 'cyber-abyss',
      name: 'Cyber Abyss',
      desc: 'Deep navy cyberpunk grid with subtle cyan reflections',
      previewClass: 'bg-gradient-to-br from-[#0f172a] via-[#091026] to-[#020617]',
    },
    {
      id: 'solar-flare',
      name: 'Solar Flare',
      desc: 'Warm amber obsidian with volcanic atmosphere',
      previewClass: 'bg-gradient-to-br from-[#2d1808] via-[#1a0c06] to-[#0a0503]',
    },
    {
      id: 'space-void',
      name: 'Deep Space Void',
      desc: 'True OLED black with distant starfield dust',
      previewClass: 'bg-gradient-to-br from-[#0d0d14] via-[#06060a] to-[#020204]',
    },
    {
      id: 'emerald-matrix',
      name: 'Rocket Emerald',
      desc: 'Phosphor green terminal matrix inspired by rocketc',
      previewClass: 'bg-gradient-to-br from-[#062416] via-[#04160d] to-[#020b06]',
    },
  ];

  const accents: { id: AccentColor; name: string; class: string; borderClass: string }[] = [
    { id: 'sky', name: 'Sky Blue', class: 'bg-sky-500', borderClass: 'border-sky-400' },
    { id: 'emerald', name: 'Emerald', class: 'bg-emerald-500', borderClass: 'border-emerald-400' },
    { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500', borderClass: 'border-indigo-400' },
    { id: 'amber', name: 'Amber', class: 'bg-amber-500', borderClass: 'border-amber-400' },
    { id: 'rose', name: 'Rose', class: 'bg-rose-500', borderClass: 'border-rose-400' },
  ];

  const languages: { code: SystemLanguage; name: string; flag: string }[] = [
    { code: 'en', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  return (
    <div id="settings-app" className="flex h-full bg-slate-900 text-slate-100 font-sans text-xs select-none">
      {/* Sidebar Navigation */}
      <div className="w-56 bg-slate-950 border-r border-slate-800 p-3 space-y-1 shrink-0 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>Settings</span>
          </div>

          <button
            onClick={() => setActiveTab('personalization')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'personalization'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4 text-sky-400" />
            <span>Personalization</span>
          </button>

          <button
            onClick={() => setActiveTab('time')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'time'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Time & Language</span>
          </button>

          <button
            onClick={() => setActiveTab('display')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'display'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Moon className="w-4 h-4 text-amber-400" />
            <span>Display & Sound</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'network'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4 text-sky-400" />
            <span>Network & Devices</span>
          </button>

          <button
            onClick={() => setActiveTab('apps')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'apps'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-pink-400" />
            <span>Apps & Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'storage'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Storage & VFS</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer text-left ${
              activeTab === 'system'
                ? 'bg-sky-600/30 text-white font-semibold border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Kernel & Specs</span>
          </button>
        </div>

        {/* Quick Restart */}
        {onReboot && (
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={onReboot}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/80 rounded-xl transition-colors cursor-pointer font-medium text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart OS</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* 1. PERSONALIZATION TAB */}
        {activeTab === 'personalization' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-sky-400" />
                <span>Wallpaper & Visual Atmosphere</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Customize desktop background, liquid glass refraction, and accent highlights.
              </p>
            </div>

            {/* Wallpapers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallpapers.map((wp) => {
                const isSelected = settings.wallpaper === wp.id;
                return (
                  <div
                    key={wp.id}
                    onClick={() => onUpdateSettings({ wallpaper: wp.id })}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-500/30 shadow-lg'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl border border-white/20 ${wp.previewClass} shadow-md`}
                        />
                        <span className="font-bold text-white text-xs">{wp.name}</span>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-sky-500 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{wp.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div>
                <h3 className="text-xs font-bold text-white">Accent Highlight Color</h3>
                <p className="text-slate-400 text-[11px]">
                  Applied to active window titles, sliders, buttons, and badges.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {accents.map((acc) => {
                  const isSelected = settings.accentColor === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onUpdateSettings({ accentColor: acc.id })}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? `bg-slate-900 ${acc.borderClass} ring-1 ring-white/30 text-white`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${acc.class}`} />
                      <span className="font-medium text-xs">{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. TIME & LANGUAGE TAB */}
        {activeTab === 'time' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Time, Date & Language Configuration</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Configure digital clock display preferences, seconds accuracy, and interface locale.
              </p>
            </div>

            {/* Time Format */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">Clock Time Format</div>
                <div className="text-slate-400 text-xs">
                  Choose between 12-Hour format (with AM/PM) or military 24-Hour format.
                </div>
              </div>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '12h' })}
                  className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    settings.timeFormat === '12h'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  12-Hour (AM/PM)
                </button>
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '24h' })}
                  className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    settings.timeFormat === '24h'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  24-Hour (Military)
                </button>
              </div>
            </div>

            {/* Show Seconds */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">Display Seconds</div>
                <div className="text-slate-400 text-xs">
                  Render real-time seconds ticker in the bottom-right taskbar and calendar.
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ showSeconds: !settings.showSeconds })}
                className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                  settings.showSeconds
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {settings.showSeconds ? 'ENABLED (:ss)' : 'DISABLED'}
              </button>
            </div>

            {/* Multi-Language Selection */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <div className="font-bold text-white text-sm">System Language & Internationalization</div>
              </div>
              <p className="text-slate-400 text-xs">
                Select your preferred language. All system apps, desktop context menus, and taskbar items adapt instantly.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {languages.map((lang) => {
                  const isSelected = settings.language === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => onUpdateSettings({ language: lang.code })}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-white ring-1 ring-sky-400/40'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-semibold text-xs">{lang.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. DISPLAY & SOUND TAB */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-amber-400" />
                <span>Display & Audio Engine</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Adjust screen color temperature and system volume output.
              </p>
            </div>

            {/* Night Light */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Night Light (Blue Light Reduction)</span>
                </div>
                <div className="text-slate-400 text-xs max-w-md">
                  Applies a warm amber color filter across all desktop layers to reduce eye strain.
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ nightLight: !settings.nightLight })}
                className={`px-4 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  settings.nightLight
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {settings.nightLight ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Volume Control */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  <span>Master Audio Volume</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {settings.isMuted ? 'MUTED' : `${settings.volume}%`}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) =>
                    onUpdateSettings({ volume: parseInt(e.target.value, 10), isMuted: false })
                  }
                  className="flex-1 accent-sky-500 cursor-pointer"
                />
                <button
                  onClick={() => onUpdateSettings({ isMuted: !settings.isMuted })}
                  className={`px-3 py-1 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                    settings.isMuted
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {settings.isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. NETWORK TAB */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-400" />
                <span>Network & Hardware Adapters</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Manage virtual network links and low-latency loopback sockets.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">RocketOS Virtual Loopback (eth0)</div>
                    <div className="text-xs text-slate-400">Connected • 10 Gbps Virtual Bridged Interface</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ONLINE
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500">IP Address:</span>
                  <div className="font-mono text-slate-200 mt-0.5">192.168.1.42</div>
                </div>
                <div>
                  <span className="text-slate-500">Subnet Mask:</span>
                  <div className="font-mono text-slate-200 mt-0.5">255.255.255.0</div>
                </div>
                <div>
                  <span className="text-slate-500">Gateway:</span>
                  <div className="font-mono text-slate-200 mt-0.5">192.168.1.1</div>
                </div>
                <div>
                  <span className="text-slate-500">Latency:</span>
                  <div className="font-mono text-emerald-400 mt-0.5">4.2 ms</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. APPS & SANDBOX TAB */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-400" />
                <span>Installed Applications & Security Sandbox</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Authoritative RocketOS AppContract registrations, file associations, and sandboxed capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AppRegistry.getAllApps().map((app) => {
                const secContext = AppSecurityManager.getInstance().getContext(app.id as AppId);
                const drafts = CrashRecoveryService.getInstance().getRecoverableDrafts(app.id as AppId);
                const exts = FileAssociations.getAllAssociations().filter((a) =>
                  a.associatedAppIds.includes(app.id as AppId)
                ).map((a) => a.extension);

                return (
                  <div key={app.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{app.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">id: {app.id} • {app.category}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-950 text-pink-300 border border-pink-800">
                        Sandboxed
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs line-clamp-2">{app.description}</p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">File Associations:</span>
                        <span className="font-mono text-sky-300">
                          {exts.length > 0 ? exts.join(', ') : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Permissions Granted:</span>
                        <span className="font-mono text-emerald-400">
                          {secContext.grantedCapabilities.length} capabilities
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Crash Recovery State:</span>
                        <span className="font-mono text-slate-300">
                          {drafts.length > 0 ? `${drafts.length} draft(s) protected` : 'Clean'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. STORAGE & VFS TAB */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                <span>RocketOS Virtual Filesystem (VFS)</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Live POSIX-compliant virtual filesystem statistics, directory hierarchy, and trash management.
              </p>
            </div>

            {syncStatus && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{syncStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-slate-500 text-[11px] font-semibold">Total Inodes</div>
                <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{fsStats.totalInodes}</div>
                <div className="text-[10px] text-slate-400 mt-1">Hierarchical tree nodes</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-slate-500 text-[11px] font-semibold">Virtual Storage Used</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {(fsStats.totalBytes / 1024).toFixed(1)} KB
                </div>
                <div className="text-[10px] text-slate-400 mt-1">POSIX data payload</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-slate-500 text-[11px] font-semibold">Trash Subsystem</div>
                <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{fsStats.trashCount}</div>
                <div className="text-[10px] text-slate-400 mt-1">Tombstoned items</div>
              </div>
            </div>

            {/* Mount Points Overview */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="font-bold text-white text-sm">System Mount Hierarchy</div>
              <div className="divide-y divide-slate-800/80 text-xs font-mono">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sky-400">/home/ryan</span>
                  <span className="text-slate-400">User Home Directory (rwx)</span>
                  <span className="text-emerald-400">vfs_disk</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sky-400">/usr/share/rocket</span>
                  <span className="text-slate-400">Rocket Standard Library & Examples</span>
                  <span className="text-emerald-400">vfs_disk</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sky-400">/proc</span>
                  <span className="text-slate-400">Virtual Process State (/proc/&lt;pid&gt;)</span>
                  <span className="text-purple-400">procfs</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sky-400">/sys/devices</span>
                  <span className="text-slate-400">Kernel Hardware & Screen Abstractions</span>
                  <span className="text-purple-400">sysfs</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-sky-400">/dev</span>
                  <span className="text-slate-400">Virtual Character Nodes (null, zero, random)</span>
                  <span className="text-purple-400">devfs</span>
                </div>
              </div>
            </div>

            {/* VFS Maintenance Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  try {
                    const snap = RocketFS.getInstance().snapshot();
                    localStorage.setItem('rocketos_vfs_snapshot', JSON.stringify(snap));
                    setSyncStatus('Authoritative VFS snapshot written to persistent storage.');
                    setTimeout(() => setSyncStatus(null), 3500);
                  } catch (e: any) {
                    setSyncStatus(`Sync failed: ${e?.message || 'Storage error'}`);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-200 rounded-xl font-medium cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4 text-cyan-400" />
                <span>Save VFS Snapshot</span>
              </button>

              <button
                onClick={() => {
                  RocketFS.getInstance().getTrashSubsystem().emptyTrash();
                  setFsStats((prev) => ({ ...prev, trashCount: 0 }));
                  setSyncStatus('Trash subsystem emptied successfully.');
                  setTimeout(() => setSyncStatus(null), 3500);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-200 rounded-xl font-medium cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Empty Trash</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. SYSTEM TELEMETRY TAB */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <span>Compiler & Kernel Specifications</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Authentic technical specifications sourced from RyanEid06/Rocket repository.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-xs font-semibold">Active Core Provider</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${getCoreProvider().providerType === 'rocket-core' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                    {getCoreProvider().providerType === 'rocket-core' ? 'NATIVE ROCKET CORE' : 'BROWSER FALLBACK'}
                  </span>
                </div>
                <div className="text-white font-bold text-sm">{getCoreProvider().providerName}</div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>• Protocol: RocketOS Core Protocol v1</div>
                  <div>• Provider Type: <span className="font-mono text-sky-400">{getCoreProvider().providerType}</span></div>
                  <div>• Security: Localhost Isolated Token Session</div>
                  <div>• IPC Transport: 127.0.0.1:5180 HTTP/JSON</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-semibold">Compiler Architecture</div>
                <div className="text-white font-bold text-sm">rocketc 2.1.0 Self-Hosted</div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>• Backend: LLVM 22.1.6 Code Generation</div>
                  <div>• Host: x86_64-pc-windows-msvc (Tier-1)</div>
                  <div>• Pipeline: Stage0 C++20 -&gt; Stage1/2/3 Rocket</div>
                  <div>• Calling Convention: Platform Standard C ABI</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-slate-400 text-xs font-semibold">Memory Safety Model</div>
                <div className="text-white font-bold text-sm">Thread-Confined ARC</div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>• Zero lock contention on thread-local heap</div>
                  <div>• Atomic ARC promotion on thread publication</div>
                  <div>• Diagnostics: R4101–R4106 Concurrency Enforcement</div>
                  <div>• No runtime dlopen/dlsym (Ahead-of-Time bindings)</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>About RocketOS & RyanEid06/Rocket</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Rocket is a modern, high-performance systems programming language focused on speed, zero-overhead memory safety, and native LLVM code generation. RocketOS is the official desktop environment demonstrating Rocket programs, raylib 6.0 integration, and compiler toolchains.
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <span>Version: 2.1.0-native</span>
                <span>•</span>
                <span>Build: 2026.09.MSVC</span>
                <span>•</span>
                <a
                  href={REPO_METADATA.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
