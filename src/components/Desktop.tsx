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
  Scissors,
  FileEdit,
  X,
  Shield,
  Calendar,
  Clock as ClockIcon,
  File,
  ClipboardPaste,
  Eye,
} from 'lucide-react';
import { TRANSLATIONS, getLocaleCode } from '../utils/localization';
import { WorkspaceRulesManager, WorkspaceShortcutItem } from '../core/workspace/WorkspaceRules';
import { SHELL_Z_LAYERS } from '../core/theme/tokens';
import { clipboardService } from '../core/clipboard/ClipboardService';
import { DesktopWidgets } from './desktop/DesktopWidgets';

interface DesktopProps {
  desktopFiles: FSItem[];
  settings: SystemSettings;
  trashCount?: number;
  currentWorkspace?: number;
  onOpenApp: (appId: AppId, extraData?: Record<string, any>) => void;
  onOpenFile: (file: FSItem) => void;
  onQuickLook?: (file: FSItem) => void;
  onDeleteFile?: (file: FSItem) => void;
  onCopyFile?: (file: FSItem) => void;
  onCutFile?: (file: FSItem) => void;
  onPasteFile?: (targetPath: string) => void;
  onRenameFile?: (itemId: string, newName: string) => void;
  onReboot: () => void;
  onCreateDesktopFile: (extension?: 'rocket' | 'txt') => void;
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
  onQuickLook,
  onDeleteFile,
  onCopyFile,
  onCutFile,
  onPasteFile,
  onRenameFile,
  onReboot,
  onCreateDesktopFile,
  onCreateFolder,
  onOpenTimeSettings,
}) => {
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [showDesktopIcons, setShowDesktopIcons] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rocket_show_desktop_icons');
      return saved === 'true'; // Defaults to false (clean desktop without clutter on left side)
    } catch {
      return false;
    }
  });

  // Spacebar Native Quick Look Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedIconId && onQuickLook) {
        // Prevent default page scroll
        const target = desktopFiles.find((f) => f.id === selectedIconId);
        if (target && target.type === 'file') {
          e.preventDefault();
          onQuickLook(target);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconId, desktopFiles, onQuickLook]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'desktop' | 'icon';
    targetItem?: FSItem | WorkspaceShortcutItem;
  } | null>(null);

  // Modals state for file operations
  const [propertiesItem, setPropertiesItem] = useState<FSItem | null>(null);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState<string>('');

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

      {/* Purpose-Built Workspace Shortcuts Grid & Desktop Files (Cleaned by default) */}
      {showDesktopIcons && (activeShortcuts.length > 0 || desktopFiles.length > 0) && (
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
      )}

      {/* Desktop Widget System (Clock, System Stats, Quick Sticky Notes) */}
      <DesktopWidgets onOpenApp={onOpenApp} />

      {/* Context Menu (Liquid Glass Aesthetic) */}
      {contextMenu && (
        <div
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: SHELL_Z_LAYERS.CONTEXT_MENU,
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed w-60 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_16px_36px_rgba(0,0,0,0.5)] p-1.5 text-slate-200 text-xs font-sans space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {contextMenu.type === 'icon' && contextMenu.targetItem ? (
            /* Icon Context Menu */
            <>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 truncate border-b border-white/10 mb-1">
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
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-white font-medium"
              >
                <Folder className="w-3.5 h-3.5 text-sky-400" />
                <span>Open</span>
              </button>

              {'name' in contextMenu.targetItem && (
                <>
                  {(contextMenu.targetItem.name.endsWith('.rocket') ||
                    contextMenu.targetItem.name.endsWith('.toml') ||
                    contextMenu.targetItem.name.endsWith('.json')) && (
                    <button
                      onClick={() => {
                        handleCloseContextMenu();
                        onOpenApp('editor', { file: contextMenu.targetItem, path: (contextMenu.targetItem as FSItem).path });
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-cyan-300"
                    >
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Edit with Code Studio</span>
                    </button>
                  )}

                  {(contextMenu.targetItem.name.endsWith('.txt') ||
                    contextMenu.targetItem.name.endsWith('.rnote') ||
                    contextMenu.targetItem.name.endsWith('.md')) && (
                    <button
                      onClick={() => {
                        handleCloseContextMenu();
                        onOpenApp('notes', { file: contextMenu.targetItem });
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-emerald-300"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Edit in Notes</span>
                    </button>
                  )}

                  <div className="h-px bg-white/10 my-1" />

                  {onQuickLook && 'content' in contextMenu.targetItem && (
                    <button
                      onClick={() => {
                        const target = contextMenu.targetItem as FSItem;
                        handleCloseContextMenu();
                        onQuickLook(target);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-amber-300 font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quick Look (Space)</span>
                    </button>
                  )}

                  {onRenameFile && (
                    <button
                      onClick={() => {
                        const target = contextMenu.targetItem as FSItem;
                        handleCloseContextMenu();
                        setRenameItem({ id: target.id, name: target.name });
                        setRenameName(target.name);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rename (F2)</span>
                    </button>
                  )}

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

                  {onCutFile && (
                    <button
                      onClick={() => {
                        handleCloseContextMenu();
                        onCutFile(contextMenu.targetItem as FSItem);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
                    >
                      <Scissors className="w-3.5 h-3.5 text-slate-300" />
                      <span>Cut (Ctrl+X)</span>
                    </button>
                  )}

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
                  const target = contextMenu.targetItem as FSItem;
                  handleCloseContextMenu();
                  setPropertiesItem(target);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors text-slate-300"
              >
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Properties</span>
              </button>
            </>
          ) : (
            /* Desktop Canvas Context Menu */
            <>
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 border-b border-white/10 mb-1">
                Desktop Options
              </div>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onCreateDesktopFile('rocket');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.newFile} (.rocket)</span>
              </button>
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onCreateDesktopFile('txt');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                <span>New Text Document (.txt)</span>
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
              {onPasteFile && (
                <button
                  disabled={!clipboardService.getClipboard()?.item}
                  onClick={() => {
                    handleCloseContextMenu();
                    onPasteFile('/Desktop');
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                    clipboardService.getClipboard()?.item
                      ? 'hover:bg-white/10 text-slate-200 cursor-pointer'
                      : 'opacity-40 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Paste{' '}
                    {clipboardService.getClipboard()?.item
                      ? `("${clipboardService.getClipboard()?.item?.name}")`
                      : ''}
                  </span>
                </button>
              )}
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  handleCloseContextMenu();
                  onOpenApp('terminal', { cwd: '/Desktop' });
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open Terminal Here</span>
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
                  onOpenApp('widgets');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Desktop Widgets & Stickies</span>
              </button>
              <button
                onClick={() => {
                  setShowDesktopIcons((prev) => {
                    const next = !prev;
                    try {
                      localStorage.setItem('rocket_show_desktop_icons', String(next));
                    } catch {}
                    return next;
                  });
                  handleCloseContextMenu();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Show Desktop Icons</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold ${showDesktopIcons ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'}`}>
                  {showDesktopIcons ? 'ON' : 'OFF'}
                </span>
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

      {/* Rename File Modal */}
      {renameItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: SHELL_Z_LAYERS.MODAL }}
          onClick={() => setRenameItem(null)}
        >
          <div
            className="w-full max-w-sm bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
                <Edit3 className="w-4 h-4" />
                <span>Rename Item</span>
              </div>
              <button
                onClick={() => setRenameItem(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (renameItem && renameName.trim() && onRenameFile) {
                  onRenameFile(renameItem.id, renameName.trim());
                  setRenameItem(null);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">New Name</label>
                <input
                  type="text"
                  autoFocus
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/20 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRenameItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameName.trim() || renameName === renameItem.name}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-500/20"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Properties Modal */}
      {propertiesItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ zIndex: SHELL_Z_LAYERS.MODAL }}
          onClick={() => setPropertiesItem(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  {propertiesItem.type === 'folder' ? (
                    <Folder className="w-5 h-5" />
                  ) : propertiesItem.name.endsWith('.rocket') ? (
                    <Code2 className="w-5 h-5" />
                  ) : (
                    <File className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white truncate max-w-[240px]">
                    {propertiesItem.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {propertiesItem.type === 'folder'
                      ? 'Directory'
                      : propertiesItem.name.endsWith('.rocket')
                      ? 'Rocket Source File (.rocket)'
                      : propertiesItem.name.endsWith('.toml')
                      ? 'TOML Configuration File'
                      : 'Standard Document'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPropertiesItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Canonical Location:</span>
                <span className="font-mono text-slate-200">{propertiesItem.path}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">File Size:</span>
                <span className="font-mono text-slate-200">
                  {propertiesItem.size ||
                    (propertiesItem.content ? `${propertiesItem.content.length} B` : '4.0 KB')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Owner / Group:</span>
                <span className="text-emerald-400 font-mono">ryan (1000) / users (100)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">UNIX Mode & Permissions:</span>
                <span className="text-sky-300 font-mono">
                  {propertiesItem.type === 'folder' ? '0755 (drwxr-xr-x)' : '0644 (-rw-r--r--)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Security Ring:</span>
                <span className="text-purple-400 font-mono">Ring 3 (User-Space ARC Confined)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Last Modified:</span>
                <span className="text-slate-300">{propertiesItem.updatedAt || 'Recently'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setPropertiesItem(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
