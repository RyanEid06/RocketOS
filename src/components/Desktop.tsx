import React, { useState, useEffect, useRef } from 'react';
import { FSItem, AppId, SystemSettings } from '../types';
import {
  Folder,
  Terminal,
  Sparkles,
  Edit3,
  Activity,
  HardDrive,
  Download,
  FileText,
  FileCode,
  RotateCcw,
  Plus,
  Settings as SettingsIcon,
  Palette,
  Rocket,
  Trash2,
  ListTodo,
  Paintbrush,
  Copy,
  Info,
  RefreshCw,
  Sliders,
  Check,
  Cpu,
  Code2,
  FolderCode,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { TRANSLATIONS, getLocaleCode } from '../utils/localization';
import { WorkspaceRulesManager, WorkspaceShortcutItem } from '../core/workspace/WorkspaceRules';
import { SHELL_Z_LAYERS } from '../core/theme/tokens';

interface DesktopProps {
  desktopFiles: FSItem[];
  settings: SystemSettings;
  trashCount?: number;
  currentWorkspace?: number;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile: (file: FSItem) => void;
  onDeleteFile?: (file: FSItem) => void;
  onCopyFile?: (file: FSItem) => void;
  onReboot: () => void;
  onCreateDesktopFile: () => void;
  onCreateFolder?: () => void;
  onOpenTimeSettings?: () => void;
}

export const Desktop: React.FC<DesktopProps> = ({
  desktopFiles,
  settings,
  trashCount = 0,
  currentWorkspace = 1,
  onOpenApp,
  onOpenFile,
  onDeleteFile,
  onCopyFile,
  onReboot,
  onCreateDesktopFile,
  onCreateFolder,
  onOpenTimeSettings,
}) => {
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'desktop' | 'icon';
    targetItem?: FSItem | WorkspaceShortcutItem;
  } | null>(null);

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  // Marquee drag selection state
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const desktopRef = useRef<HTMLDivElement | null>(null);
  const t = TRANSLATIONS[settings.language] || TRANSLATIONS.en;
  const locale = getLocaleCode(settings.language);

  // Active purpose-built workspace profile (Desktop 1 is clean without system shortcuts)
  const workspaceProfile = WorkspaceRulesManager.getInstance().getProfile(currentWorkspace);
  const activeShortcuts = currentWorkspace === 1 ? [] : workspaceProfile.shortcuts;

  // Live updated clock respecting 12h/24h, seconds, and language
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
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.timeFormat, settings.showSeconds, settings.language, locale]);

  // Handle right-click on desktop canvas
  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 300);
    setContextMenu({ x, y, type: 'desktop' });
  };

  // Handle right-click on specific icon
  const handleIconContextMenu = (
    e: React.MouseEvent,
    targetItem: FSItem | WorkspaceShortcutItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIconId(targetItem.id);
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 240);
    setContextMenu({ x, y, type: 'icon', targetItem });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Marquee Drag Selection Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    handleCloseContextMenu();
    setSelectedIconId(null);
    setIsSelecting(true);
    setSelectionBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;
    setSelectionBox((prev) =>
      prev
        ? {
            ...prev,
            currentX: e.clientX,
            currentY: e.clientY,
          }
        : null
    );
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // Icon renderer matching WorkspaceProfile shortcuts
  const renderShortcutIcon = (iconName: string) => {
    switch (iconName) {
      case 'HardDrive':
        return <HardDrive className="w-8 h-8 text-sky-400 drop-shadow-md" />;
      case 'Folder':
        return <Folder className="w-8 h-8 text-sky-400 drop-shadow-md" />;
      case 'Trash2':
        return (
          <div className="relative">
            <Trash2 className="w-8 h-8 text-slate-300 drop-shadow-md" />
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center font-mono">
                {trashCount}
              </span>
            )}
          </div>
        );
      case 'ListTodo':
        return <ListTodo className="w-8 h-8 text-emerald-400 drop-shadow-md" />;
      case 'SettingsIcon':
        return <SettingsIcon className="w-8 h-8 text-sky-300 drop-shadow-md" />;
      case 'Code2':
        return <Code2 className="w-8 h-8 text-cyan-400 drop-shadow-md" />;
      case 'Edit3':
        return <Edit3 className="w-8 h-8 text-indigo-400 drop-shadow-md" />;
      case 'Terminal':
        return <Terminal className="w-8 h-8 text-slate-200 drop-shadow-md" />;
      case 'FolderCode':
        return <FolderCode className="w-8 h-8 text-emerald-400 drop-shadow-md" />;
      case 'Activity':
        return <Activity className="w-8 h-8 text-rose-400 drop-shadow-md" />;
      case 'Paintbrush':
        return <Paintbrush className="w-8 h-8 text-amber-400 drop-shadow-md" />;
      case 'ImageIcon':
        return <ImageIcon className="w-8 h-8 text-purple-400 drop-shadow-md" />;
      case 'Rocket':
        return <Rocket className="w-8 h-8 text-purple-400 drop-shadow-md" />;
      case 'FolderImage':
        return <Folder className="w-8 h-8 text-amber-400 drop-shadow-md" />;
      default:
        return <Sparkles className="w-8 h-8 text-sky-400 drop-shadow-md" />;
    }
  };

  // Dynamic Wallpaper styles (Refined & Modern Liquid Glass Archetype)
  const getWallpaperStyles = () => {
    switch (settings.wallpaper) {
      case 'liquid-aurora':
        return {
          bgClass: 'bg-[#080d1a]',
          gradClass:
            'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.35),rgba(255,255,255,0))]',
          ambientGlow:
            'before:absolute before:inset-0 before:bg-gradient-to-tr before:from-teal-500/10 before:via-indigo-500/10 before:to-purple-500/10 before:pointer-events-none',
        };
      case 'frosted-titanium':
        return {
          bgClass: 'bg-[#0b0f17]',
          gradClass:
            'bg-[radial-gradient(circle_at_50%_30%,rgba(30,41,59,0.5),rgba(11,15,23,0.9))]',
          ambientGlow: 'before:absolute before:inset-0 before:bg-white/[0.02]',
        };
      case 'deep-obsidian':
        return {
          bgClass: 'bg-[#05070b]',
          gradClass:
            'bg-gradient-to-br from-[#070b12] via-[#040608] to-[#020305]',
          ambientGlow: 'before:absolute before:inset-0 before:bg-sky-500/[0.02]',
        };
      case 'cyber-abyss':
        return {
          bgClass: 'bg-[#030712]',
          gradClass:
            'bg-gradient-to-br from-[#0f172a] via-[#091026] to-[#020617] opacity-90',
          ambientGlow: 'before:absolute before:inset-0 before:bg-cyan-500/5',
        };
      case 'solar-flare':
        return {
          bgClass: 'bg-[#0f0704]',
          gradClass:
            'bg-gradient-to-br from-[#2d1808] via-[#1a0c06] to-[#0a0503] opacity-90',
          ambientGlow: 'before:absolute before:inset-0 before:bg-amber-500/5',
        };
      case 'space-void':
        return {
          bgClass: 'bg-[#030305]',
          gradClass:
            'bg-gradient-to-br from-[#0d0d14] via-[#06060a] to-[#020204] opacity-95',
          ambientGlow: 'before:absolute before:inset-0 before:bg-purple-500/5',
        };
      case 'emerald-matrix':
        return {
          bgClass: 'bg-[#020b06]',
          gradClass:
            'bg-gradient-to-br from-[#062416] via-[#04160d] to-[#020b06] opacity-90',
          ambientGlow: 'before:absolute before:inset-0 before:bg-emerald-500/5',
        };
      case 'classic-blue':
      default:
        return {
          bgClass: 'bg-[#002d58]',
          gradClass:
            'bg-gradient-to-br from-[#004b93] via-[#002d58] to-[#011a33] opacity-85',
          ambientGlow: 'before:absolute before:inset-0 before:bg-sky-500/5',
        };
    }
  };

  const currentWp = getWallpaperStyles();

  // Calculate Marquee Box dimensions
  const marqueeStyle = selectionBox
    ? {
        left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
        top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
        width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
        height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
      }
    : null;

  return (
    <div
      ref={desktopRef}
      id="desktop-canvas"
      onContextMenu={handleDesktopContextMenu}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      draggable={false}
      className={`relative w-full h-full select-none overflow-hidden transition-colors duration-700 ${currentWp.bgClass} ${currentWp.ambientGlow}`}
    >
      {/* Night Light Amber Filter */}
      {settings.nightLight && (
        <div className="fixed inset-0 pointer-events-none z-[999] bg-amber-500/10 mix-blend-multiply" />
      )}

      {/* Atmospheric Background & Specular Sheen */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${currentWp.gradClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-40" />

      {/* Subtle Liquid Glass Specular Orb */}
      <div className="absolute top-[-10%] right-[15%] w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Interactive Liquid Glass Desktop Clock */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenTimeSettings) onOpenTimeSettings();
        }}
        className="absolute top-10 right-14 text-right select-none z-0 hidden md:block cursor-pointer group hover:scale-[1.02] transition-transform p-3 rounded-2xl hover:bg-white/[0.04] backdrop-blur-xs"
        title="Click to customize Clock and Language settings"
      >
        <div className="text-7xl lg:text-8xl font-extralight tracking-tighter text-white/90 drop-shadow-md">
          {timeStr}
        </div>
        <div className="text-sm lg:text-lg font-medium tracking-wide text-sky-200/80 mt-1 flex items-center justify-end gap-2">
          <span>{dateStr}</span>
          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
            {settings.timeFormat.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Marquee Selection Drag Box */}
      {isSelecting && marqueeStyle && (
        <div
          style={marqueeStyle}
          className="fixed pointer-events-none z-40 bg-sky-500/15 border border-sky-400/60 rounded-md backdrop-blur-xs shadow-sm"
        />
      )}

      {/* Purpose-Built Workspace Shortcuts Grid & Desktop Files */}
      <div
        style={{ zIndex: SHELL_Z_LAYERS.DESKTOP_ICONS }}
        className="absolute top-6 left-6 grid grid-flow-col grid-rows-6 auto-cols-max gap-3 select-none pointer-events-auto"
      >
        {/* Workspace Purpose-Built System Shortcuts */}
        {activeShortcuts.map((shortcut) => {
          const isSelected = selectedIconId === shortcut.id;
          return (
            <div
              key={shortcut.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIconId(shortcut.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenApp(shortcut.appId, shortcut.extraData);
              }}
              onContextMenu={(e) => handleIconContextMenu(e, shortcut)}
              className={`w-20 p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 group ${
                isSelected
                  ? 'bg-white/15 border border-white/20 shadow-md backdrop-blur-xs'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
              title={`${shortcut.title} - ${shortcut.sub}`}
            >
              <div className="mb-1.5 transition-transform duration-150 group-hover:scale-105">
                {renderShortcutIcon(shortcut.iconName)}
              </div>
              <span className="text-[11px] font-medium text-slate-100 line-clamp-2 leading-tight drop-shadow-md">
                {shortcut.title}
              </span>
            </div>
          );
        })}

        {/* User-created Desktop Files & Dropped Items */}
        {desktopFiles.map((file) => {
          const isSelected = selectedIconId === file.id;
          return (
            <div
              key={file.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIconId(file.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (file.type === 'folder') {
                  onOpenApp('explorer', { path: file.path });
                } else {
                  onOpenFile(file);
                }
              }}
              onContextMenu={(e) => handleIconContextMenu(e, file)}
              className={`w-20 p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 group ${
                isSelected
                  ? 'bg-white/15 border border-white/20 shadow-md backdrop-blur-xs'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
              title={file.name}
            >
              <div className="mb-1.5 transition-transform duration-150 group-hover:scale-105">
                {file.type === 'folder' ? (
                  <Folder className="w-8 h-8 text-amber-400 drop-shadow-md" />
                ) : file.name.endsWith('.rocket') ? (
                  <FileCode className="w-8 h-8 text-sky-400 drop-shadow-md" />
                ) : file.name.endsWith('.rnote') ? (
                  <FileText className="w-8 h-8 text-emerald-400 drop-shadow-md" />
                ) : file.name.endsWith('.rpaint') || file.name.endsWith('.png') || file.name.endsWith('.jpg') ? (
                  <ImageIcon className="w-8 h-8 text-purple-400 drop-shadow-md" />
                ) : (
                  <FileText className="w-8 h-8 text-slate-300 drop-shadow-md" />
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-100 truncate w-full leading-tight drop-shadow-md">
                {file.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Context Menu (Liquid Glass Aesthetic) */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-56 bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.5)] p-1.5 text-slate-200 text-xs font-sans space-y-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {contextMenu.type === 'icon' && contextMenu.targetItem ? (
            /* Icon Context Menu */
            <>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 truncate">
                {'title' in contextMenu.targetItem
                  ? contextMenu.targetItem.title
                  : contextMenu.targetItem.name}
              </div>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  if ('appId' in contextMenu.targetItem!) {
                    onOpenApp(
                      contextMenu.targetItem.appId,
                      'extraData' in contextMenu.targetItem
                        ? (contextMenu.targetItem as any).extraData
                        : undefined
                    );
                  } else if (contextMenu.targetItem!.type === 'folder') {
                    onOpenApp('explorer', { path: contextMenu.targetItem!.path });
                  } else {
                    onOpenFile(contextMenu.targetItem as FSItem);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Folder className="w-3.5 h-3.5 text-sky-400" />
                <span>Open</span>
              </button>

              {'name' in contextMenu.targetItem && (
                <>
                  <button
                    onClick={() => {
                      handleCloseContextMenu();
                      if (onCopyFile) onCopyFile(contextMenu.targetItem as FSItem);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy (Ctrl+C)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCloseContextMenu();
                      if (onDeleteFile) onDeleteFile(contextMenu.targetItem as FSItem);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Move to Recycle Bin (Del)</span>
                  </button>
                </>
              )}

              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('settings');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-slate-400"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Properties</span>
              </button>
            </>
          ) : (
            /* Desktop Canvas Context Menu */
            <>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Desktop Options
              </div>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onCreateDesktopFile();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.newFile} (.rocket)</span>
              </button>
              {onCreateFolder && (
                <button
                  onClick={() => {
                    handleCloseContextMenu();
                    onCreateFolder();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.newFolder}</span>
                </button>
              )}
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('terminal');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.terminal}</span>
              </button>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('taskmanager');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.taskManager}</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('settings');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Palette className="w-3.5 h-3.5 text-sky-300" />
                <span>Personalize & Wallpaper</span>
              </button>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('explorer', { path: '/ThisPC' });
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>System Specs ({t.thisPc})</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onReboot();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-950/60 text-rose-300 text-left cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restart}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
