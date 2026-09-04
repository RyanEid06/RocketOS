import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Terminal,
  Folder,
  FileCode2,
  FileText,
  Image as ImageIcon,
  Calculator,
  Settings as SettingsIcon,
  Sparkles,
  ArrowRight,
  Power,
  RotateCcw,
  Moon,
  Volume2,
  VolumeX,
  Trash2,
  Maximize2,
  Shield,
  Layers,
  Cpu,
  Sliders,
  Check,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { AppId, FSItem, SystemSettings, WindowState } from '../../types';
import { AppRegistry, AppDefinition } from '../../core/apps/AppRegistry';
import { FileSystemService } from '../../core/filesystem/FileSystemService';
import { searchService, SettingSearchResult } from '../../core/search/SearchService';
import { soundEngine } from '../../utils/audio';
import { clipboardService } from '../../core/clipboard/ClipboardService';
import { notificationService } from '../../core/notifications/NotificationService';
import { SHELL_Z_LAYERS } from '../../core/theme/tokens';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  fileSystem: FSItem[];
  windows: WindowState[];
  settings: SystemSettings;
  currentWorkspace: number;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile: (file: FSItem) => void;
  onOpenExplorerPath: (path: string) => void;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onChangeWorkspace: (wsId: number) => void;
  onEmptyTrash?: () => void;
  onReboot: () => void;
}

type PaletteCategory = 'all' | 'apps' | 'files' | 'commands' | 'settings' | 'calc';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'commands';
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  fileSystem,
  windows,
  settings,
  currentWorkspace,
  onOpenApp,
  onOpenFile,
  onOpenExplorerPath,
  onUpdateSettings,
  onChangeWorkspace,
  onEmptyTrash,
  onReboot,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
      soundEngine.play('navigate');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // System commands definition
  const systemCommands: CommandItem[] = useMemo(() => [
    {
      id: 'cmd-reboot',
      title: 'Reboot RocketOS',
      description: 'Restart kernel and boot sequence',
      category: 'commands',
      icon: <RotateCcw className="w-4 h-4 text-rose-400" />,
      keywords: ['restart', 'reboot', 'reset', 'shutdown', 'power'],
      action: () => {
        onClose();
        onReboot();
      },
    },
    {
      id: 'cmd-terminal',
      title: 'Open Rocket Terminal',
      description: 'Launch Rocket shell (sh/bash) session',
      category: 'commands',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      keywords: ['cli', 'bash', 'sh', 'console', 'command'],
      action: () => {
        onClose();
        onOpenApp('terminal');
      },
    },
    {
      id: 'cmd-files',
      title: 'Open File Explorer',
      description: 'Browse RocketFS root virtual directories',
      category: 'commands',
      icon: <Folder className="w-4 h-4 text-sky-400" />,
      keywords: ['explorer', 'files', 'finder', 'directory', 'folder'],
      action: () => {
        onClose();
        onOpenApp('explorer');
      },
    },
    {
      id: 'cmd-editor',
      title: 'Open Rocket Code Studio',
      description: 'Rocket 2.1 IDE with syntax compiler and run engine',
      category: 'commands',
      icon: <FileCode2 className="w-4 h-4 text-cyan-400" />,
      keywords: ['ide', 'code', 'editor', 'compiler', 'rocketc'],
      action: () => {
        onClose();
        onOpenApp('editor');
      },
    },
    {
      id: 'cmd-nightlight',
      title: settings.nightLight ? 'Disable Night Light' : 'Enable Night Light',
      description: 'Toggle warm 3400K blue light screen filter',
      category: 'commands',
      icon: <Moon className="w-4 h-4 text-amber-400" />,
      keywords: ['night', 'light', 'warm', 'screen', 'blue', 'eye'],
      action: () => {
        onUpdateSettings({ nightLight: !settings.nightLight });
        notificationService.sendNotification({
          title: 'Display Settings',
          message: settings.nightLight ? 'Night Light disabled' : 'Night Light filter enabled (3400K)',
          type: 'info',
        });
        onClose();
      },
    },
    {
      id: 'cmd-mute',
      title: settings.volume === 0 ? 'Unmute Audio' : 'Mute Master Audio',
      description: 'Toggle audio synthesizer output volume',
      category: 'commands',
      icon: settings.volume === 0 ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />,
      keywords: ['mute', 'unmute', 'sound', 'volume', 'audio'],
      action: () => {
        const newVol = settings.volume === 0 ? 80 : 0;
        onUpdateSettings({ volume: newVol });
        notificationService.sendNotification({
          title: 'Audio Engine',
          message: newVol === 0 ? 'Master audio muted' : `Volume set to ${newVol}%`,
          type: 'info',
        });
        onClose();
      },
    },
    {
      id: 'cmd-trash',
      title: 'Empty Trash Can',
      description: 'Permanently purge deleted files from VFS trash',
      category: 'commands',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      keywords: ['trash', 'empty', 'delete', 'clean', 'purge'],
      action: () => {
        if (onEmptyTrash) onEmptyTrash();
        notificationService.sendNotification({
          title: 'RocketFS Storage',
          message: 'Trash bin purged successfully',
          type: 'success',
        });
        onClose();
      },
    },
    {
      id: 'cmd-ws-1',
      title: 'Switch to Workspace 1 (Primary)',
      description: 'Activate Virtual Desktop 1',
      category: 'commands',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      keywords: ['workspace', 'desktop 1', 'ws1', 'desktop'],
      action: () => {
        onChangeWorkspace(1);
        onClose();
      },
    },
    {
      id: 'cmd-ws-2',
      title: 'Switch to Workspace 2 (Development)',
      description: 'Activate Virtual Desktop 2',
      category: 'commands',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      keywords: ['workspace', 'desktop 2', 'ws2', 'dev'],
      action: () => {
        onChangeWorkspace(2);
        onClose();
      },
    },
    {
      id: 'cmd-ws-3',
      title: 'Switch to Workspace 3 (Tools & Media)',
      description: 'Activate Virtual Desktop 3',
      category: 'commands',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      keywords: ['workspace', 'desktop 3', 'ws3', 'tools'],
      action: () => {
        onChangeWorkspace(3);
        onClose();
      },
    },
    {
      id: 'cmd-settings',
      title: 'System Settings & Control Panel',
      description: 'Display, theme, wallpaper, sound, and kernel settings',
      category: 'commands',
      icon: <SettingsIcon className="w-4 h-4 text-slate-300" />,
      keywords: ['settings', 'preferences', 'theme', 'wallpaper', 'network', 'control'],
      action: () => {
        onClose();
        onOpenApp('settings');
      },
    },
  ], [settings, onReboot, onOpenApp, onUpdateSettings, onChangeWorkspace, onEmptyTrash, onClose]);

  // Evaluate simple safe math expressions
  const mathResult = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    // Check if query looks like a calculation (numbers and operators)
    const isMathPattern = /^[\d\s\+\-\*\/\^\(\)\.\%eE\,xX]+$/.test(q) ||
      /^(sqrt|abs|sin|cos|tan|log|pi|min|max)/i.test(q) ||
      /^0x[0-9a-fA-F]+/i.test(q);

    if (!isMathPattern || q.length < 2) return null;

    try {
      // Clean safe expression
      let sanitized = q
        .replace(/x/gi, '*')
        .replace(/\^/g, '**')
        .replace(/pi/gi, 'Math.PI')
        .replace(/sqrt\(/gi, 'Math.sqrt(')
        .replace(/sin\(/gi, 'Math.sin(')
        .replace(/cos\(/gi, 'Math.cos(')
        .replace(/tan\(/gi, 'Math.tan(')
        .replace(/abs\(/gi, 'Math.abs(')
        .replace(/log\(/gi, 'Math.log(');

      // Handle percentage e.g. 50% of 200 or 50%
      const pctMatch = sanitized.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
      if (pctMatch) {
        const p = parseFloat(pctMatch[1]);
        const total = parseFloat(pctMatch[2]);
        const val = (p / 100) * total;
        return { expr: q, value: val.toLocaleString() };
      }

      // Safe evaluation using Function with no globals
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return {
          expr: q,
          value: Number.isInteger(val) ? val.toString() : val.toFixed(4).replace(/\.?0+$/, ''),
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [query]);

  // Gather universal search results
  const rawResults = useMemo(() => {
    return searchService.search(query, fileSystem, () => {
      onOpenApp('settings');
      onClose();
    });
  }, [query, fileSystem, onOpenApp, onClose]);

  // Match system commands
  const matchedCommands = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^>\s*/, '');
    if (!q) return systemCommands.slice(0, 5);
    return systemCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q))
    );
  }, [query, systemCommands]);

  // Combine results into unified list
  interface UnifiedItem {
    id: string;
    type: 'calc' | 'app' | 'file' | 'folder' | 'command' | 'setting';
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    action: () => void;
  }

  const unifiedList: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];

    // 1. Math calculation card if valid
    if (mathResult && (activeCategory === 'all' || activeCategory === 'calc')) {
      list.push({
        id: 'math-calc',
        type: 'calc',
        title: `= ${mathResult.value}`,
        subtitle: `Calculation: ${mathResult.expr} (Press Enter to copy)`,
        icon: <Calculator className="w-4 h-4 text-emerald-400" />,
        action: () => {
          clipboardService.copyText(mathResult.value);
          notificationService.sendNotification({
            title: 'Calculator',
            message: `Copied "${mathResult.value}" to clipboard`,
            type: 'info',
          });
          soundEngine.play('click');
          onClose();
        },
      });
    }

    // 2. Apps
    if (activeCategory === 'all' || activeCategory === 'apps') {
      for (const app of rawResults.apps) {
        list.push({
          id: `app-${app.id}`,
          type: 'app',
          title: app.name,
          subtitle: `${app.category} • ${app.description}`,
          icon: <Sparkles className="w-4 h-4 text-sky-400" />,
          action: () => {
            onOpenApp(app.id as AppId);
            onClose();
          },
        });
      }
    }

    // 3. System Commands
    if (activeCategory === 'all' || activeCategory === 'commands') {
      for (const cmd of matchedCommands) {
        list.push({
          id: cmd.id,
          type: 'command',
          title: cmd.title,
          subtitle: cmd.description,
          icon: cmd.icon,
          action: cmd.action,
        });
      }
    }

    // 4. Files
    if (activeCategory === 'all' || activeCategory === 'files') {
      for (const file of rawResults.files) {
        const isRocket = file.name.endsWith('.rocket');
        const isImg = file.name.endsWith('.png') || file.name.endsWith('.svg') || file.name.endsWith('.jpg');
        list.push({
          id: `file-${file.id}`,
          type: 'file',
          title: file.name,
          subtitle: `${file.path} • ${file.size || 'Text file'}`,
          icon: isRocket ? (
            <FileCode2 className="w-4 h-4 text-cyan-400" />
          ) : isImg ? (
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          ) : (
            <FileText className="w-4 h-4 text-slate-400" />
          ),
          action: () => {
            onOpenFile(file);
            onClose();
          },
        });
      }

      for (const folder of rawResults.folders) {
        list.push({
          id: `folder-${folder.id}`,
          type: 'folder',
          title: folder.name,
          subtitle: `Directory • ${folder.path}`,
          icon: <Folder className="w-4 h-4 text-amber-400" />,
          action: () => {
            onOpenExplorerPath(folder.path);
            onClose();
          },
        });
      }
    }

    // 5. Settings
    if (activeCategory === 'all' || activeCategory === 'settings') {
      for (const s of rawResults.settings) {
        list.push({
          id: s.id,
          type: 'setting',
          title: s.title,
          subtitle: `${s.category} • ${s.description}`,
          icon: <SettingsIcon className="w-4 h-4 text-purple-400" />,
          action: () => {
            s.action();
            onClose();
          },
        });
      }
    }

    return list;
  }, [mathResult, activeCategory, rawResults, matchedCommands, onOpenApp, onOpenFile, onOpenExplorerPath, onClose]);

  // Adjust selection bounds
  useEffect(() => {
    if (selectedIndex >= unifiedList.length) {
      setSelectedIndex(Math.max(0, unifiedList.length - 1));
    }
  }, [unifiedList.length, selectedIndex]);

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, unifiedList.length));
      soundEngine.play('navigate');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + unifiedList.length) % Math.max(1, unifiedList.length));
      soundEngine.play('navigate');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = unifiedList[selectedIndex];
      if (selected) {
        selected.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150 select-none"
      style={{ zIndex: SHELL_Z_LAYERS.MODAL + 100 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-slate-950/40">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type an app, file, setting, math expression, or '> command'..."
            className="w-full bg-transparent text-base text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-white/10 text-slate-400 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-black/20 text-xs overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'apps', label: 'Apps' },
              { id: 'commands', label: 'Commands' },
              { id: 'files', label: 'Files' },
              { id: 'settings', label: 'Settings' },
              { id: 'calc', label: 'Calculator' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-xl capitalize transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/40 shadow-sm shadow-sky-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-slate-400 hidden sm:block">
            Use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">↑</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">↓</kbd> to navigate,{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">↵</kbd> to open
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listContainerRef}
          className="max-h-[360px] overflow-y-auto p-2 space-y-1 divide-y divide-transparent"
        >
          {unifiedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            unifiedList.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 border border-sky-400/40 text-white shadow-md shadow-sky-500/10'
                      : 'hover:bg-white/5 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-500/30 border-sky-400/50 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.type === 'calc' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Calculation
                          </span>
                        )}
                        {item.type === 'command' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Command
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-400 shrink-0 font-medium pl-2">
                      <span>Execute</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Palette Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 bg-slate-950/60 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              <strong className="text-slate-200">RocketOS</strong> Spotlight
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline">Press <strong className="text-slate-300">Alt + Space</strong> or <strong className="text-slate-300">Ctrl + K</strong> anytime</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span>{unifiedList.length} items</span>
          </div>
        </div>
      </div>
    </div>
  );
};
