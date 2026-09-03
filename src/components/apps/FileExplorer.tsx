import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FSItem, TrashItem } from '../../types';
import {
  Folder,
  FileText,
  Code2,
  FileCode,
  HardDrive,
  Download,
  Monitor,
  FileBox,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Search,
  Grid,
  List,
  Plus,
  ChevronRight,
  Sparkles,
  Terminal as TerminalIcon,
  Cpu,
  Trash2,
  RotateCcw,
  Copy,
  ClipboardPaste,
  Server,
  Layers,
  Check,
  Info
} from 'lucide-react';

interface FileExplorerProps {
  fileSystem: FSItem[];
  currentPath?: string;
  trashItems?: TrashItem[];
  copiedItem?: FSItem | null;
  onOpenFile: (file: FSItem) => void;
  onOpenTerminalAtPath?: (path: string) => void;
  onCreateItem: (parentPath: string, name: string, type: 'file' | 'folder', content?: string) => void;
  onDeleteItem?: (item: FSItem) => void;
  onRestoreTrashItem?: (trashId: string) => void;
  onEmptyTrash?: () => void;
  onCopyItem?: (item: FSItem) => void;
  onPasteItem?: (targetPath: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fileSystem,
  currentPath = '/Desktop',
  trashItems = [],
  copiedItem = null,
  onOpenFile,
  onOpenTerminalAtPath,
  onCreateItem,
  onDeleteItem,
  onRestoreTrashItem,
  onEmptyTrash,
  onCopyItem,
  onPasteItem,
}) => {
  const [activePath, setActivePath] = useState<string>(currentPath);
  const [history, setHistory] = useState<string[]>([currentPath]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');

  const [itemContextMenu, setItemContextMenu] = useState<{
    x: number;
    y: number;
    item: FSItem;
  } | null>(null);

  const explorerRef = useRef<HTMLDivElement | null>(null);

  // Synchronize when currentPath prop changes externally
  useEffect(() => {
    if (currentPath && currentPath !== activePath) {
      navigateTo(currentPath);
    }
  }, [currentPath]);

  // Recursively find a folder in the file system tree
  const findFolderByPath = (items: FSItem[], path: string): FSItem | null => {
    for (const item of items) {
      if (item.path === path && item.type === 'folder') return item;
      if (item.children) {
        const found = findFolderByPath(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const navigateTo = (path: string) => {
    if (path === activePath) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActivePath(path);
    setSelectedId(null);
    setIsCreatingNew(null);
    setItemContextMenu(null);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setActivePath(history[historyIndex - 1]);
      setSelectedId(null);
      setItemContextMenu(null);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setActivePath(history[historyIndex + 1]);
      setSelectedId(null);
      setItemContextMenu(null);
    }
  };

  const handleUp = () => {
    if (activePath === '/' || activePath === '/ThisPC' || activePath === '/Trash') {
      navigateTo('/ThisPC');
      return;
    }
    const parts = activePath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    navigateTo(parentPath);
  };

  const currentFolder = useMemo(() => {
    return findFolderByPath(fileSystem, activePath) || fileSystem[0];
  }, [fileSystem, activePath]);

  const itemsToDisplay = useMemo(() => {
    const list = currentFolder.children || [];
    if (!searchQuery.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentFolder, searchQuery]);

  const selectedItem = useMemo(() => {
    return itemsToDisplay.find((i) => i.id === selectedId) || null;
  }, [itemsToDisplay, selectedId]);

  // Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedItem && onCopyItem) {
          e.preventDefault();
          onCopyItem(selectedItem);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedItem && onPasteItem && activePath !== '/Trash' && activePath !== '/ThisPC') {
          e.preventDefault();
          onPasteItem(activePath);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (itemsToDisplay.length > 0) {
          setSelectedId(itemsToDisplay[0].id);
        }
      } else if (e.key === 'Delete') {
        if (selectedItem && onDeleteItem && activePath !== '/Trash') {
          e.preventDefault();
          onDeleteItem(selectedItem);
          setSelectedId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, copiedItem, onCopyItem, onPasteItem, onDeleteItem, activePath, itemsToDisplay]);

  const getFileIcon = (item: FSItem) => {
    if (item.type === 'folder') {
      if (item.name === 'Desktop') return <Monitor className="w-5 h-5 text-sky-400" />;
      if (item.name === 'Downloads') return <Download className="w-5 h-5 text-emerald-400" />;
      if (item.name === 'Documents') return <FileText className="w-5 h-5 text-amber-400" />;
      if (item.name === 'kernel' || item.name === 'drivers') return <Cpu className="w-5 h-5 text-rose-400" />;
      return <Folder className="w-5 h-5 text-sky-400 fill-sky-400/20" />;
    }
    if (item.name.endsWith('.rocket') || item.name.endsWith('.rkt')) {
      return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
    if (item.name.endsWith('.asm')) {
      return <Code2 className="w-5 h-5 text-amber-400" />;
    }
    if (item.name.endsWith('.bin') || item.name.endsWith('.iso')) {
      return <FileBox className="w-5 h-5 text-purple-400" />;
    }
    return <FileText className="w-5 h-5 text-slate-300" />;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !isCreatingNew) return;
    onCreateItem(
      activePath,
      newItemName.trim(),
      isCreatingNew,
      isCreatingNew === 'file'
        ? '// RocketOS Module\nfn main() -> Int {\n    println("Hello from Rocket");\n    return 0;\n}\n'
        : undefined
    );
    setIsCreatingNew(null);
    setNewItemName('');
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: FSItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(item.id);
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setItemContextMenu({ x, y, item });
  };

  return (
    <div
      ref={explorerRef}
      id="file-explorer"
      onClick={() => setItemContextMenu(null)}
      className="flex flex-col h-full bg-slate-900 text-slate-100 select-none text-xs font-sans"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 border-b border-white/10 bg-slate-900/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 cursor-pointer transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 cursor-pointer transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleUp}
            disabled={activePath === '/ThisPC'}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 cursor-pointer transition-colors"
            title="Up to Parent Directory"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Path Breadcrumb Bar */}
        <div className="flex-1 min-w-[180px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-200 text-xs overflow-x-auto shadow-inner">
          {activePath === '/ThisPC' ? (
            <HardDrive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          ) : activePath === '/Trash' ? (
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          )}

          <span
            onClick={() => navigateTo('/ThisPC')}
            className="hover:underline cursor-pointer text-sky-400 font-bold"
          >
            This PC
          </span>

          {activePath !== '/ThisPC' &&
            activePath
              .split('/')
              .filter(Boolean)
              .map((part, index, arr) => {
                const stepPath = '/' + arr.slice(0, index + 1).join('/');
                return (
                  <React.Fragment key={stepPath}>
                    <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span
                      onClick={() => navigateTo(stepPath)}
                      className="hover:underline cursor-pointer font-medium text-slate-200 truncate"
                    >
                      {part}
                    </span>
                  </React.Fragment>
                );
              })}
        </div>

        {/* Search Box */}
        <div className="relative w-44 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-black/40 rounded-xl border border-white/10 text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {/* Actions: View Mode, Copy/Paste, Delete, New Item */}
        <div className="flex items-center gap-1.5">
          {selectedItem && onDeleteItem && activePath !== '/Trash' && (
            <button
              onClick={() => {
                onDeleteItem(selectedItem);
                setSelectedId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all"
              title="Move to Recycle Bin (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {selectedItem && onCopyItem && (
            <button
              onClick={() => onCopyItem(selectedItem)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
              title="Copy (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {copiedItem && onPasteItem && activePath !== '/Trash' && activePath !== '/ThisPC' && (
            <button
              onClick={() => onPasteItem(activePath)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold cursor-pointer"
              title="Paste (Ctrl+V)"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'grid' ? 'bg-sky-500 text-white shadow-xs' : 'hover:bg-white/10 text-slate-400'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              viewMode === 'list' ? 'bg-sky-500 text-white shadow-xs' : 'hover:bg-white/10 text-slate-400'
            }`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {activePath !== '/ThisPC' && activePath !== '/Trash' && (
            <button
              onClick={() => {
                setIsCreatingNew('file');
                setNewItemName('new_module.rocket');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer shadow-md transition-colors"
              title="Create new file"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Sidebar + File Grid/List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-48 bg-slate-950/70 border-r border-white/10 p-3 overflow-y-auto flex flex-col gap-5 shrink-0">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">
              System
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => navigateTo('/ThisPC')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/ThisPC'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span className="truncate">This PC</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/Trash')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    activePath === '/Trash'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span className="truncate">Recycle Bin</span>
                  </div>
                  {trashItems.length > 0 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                      {trashItems.length}
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">
              Quick Access
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => navigateTo('/Desktop')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/Desktop'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span className="truncate">Desktop</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/Downloads')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/Downloads'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span className="truncate">Downloads</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/Documents')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/Documents'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="truncate">Documents</span>
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">
              Kernel Filesystem
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => navigateTo('/kernel')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/kernel'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Cpu className="w-4 h-4 text-rose-400" />
                  <span className="truncate">Kernel (/kernel)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/drivers')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activePath === '/drivers'
                      ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="truncate">Drivers (/drivers)</span>
                </button>
              </li>
            </ul>
          </section>

          {onOpenTerminalAtPath && (
            <div className="pt-3 border-t border-white/10 mt-auto">
              <button
                onClick={() => onOpenTerminalAtPath(activePath)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer text-xs font-semibold"
              >
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open Terminal Here</span>
              </button>
            </div>
          )}
        </aside>

        {/* View Switcher: THIS PC vs TRASH CAN vs NORMAL FOLDER */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
          {/* 1. THIS PC VIEW */}
          {activePath === '/ThisPC' ? (
            <div className="space-y-6">
              {/* Devices and Drives */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Devices and Drives
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Drive C */}
                  <div
                    onClick={() => navigateTo('/')}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-sky-400/50 cursor-pointer group transition-all shadow-md flex items-center gap-4"
                  >
                    <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform">
                      <HardDrive className="w-7 h-7" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white group-hover:text-sky-300">
                          Local Disk (C:)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">427 GB free / 512 GB</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full w-[17%]" />
                      </div>
                      <div className="text-[10px] text-slate-500">NVMe High-Speed Solid State Drive</div>
                    </div>
                  </div>

                  {/* Drive D */}
                  <div
                    onClick={() => navigateTo('/kernel')}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-emerald-400/50 cursor-pointer group transition-all shadow-md flex items-center gap-4"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                      <Server className="w-7 h-7" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white group-hover:text-emerald-300">
                          RocketFS RAM Disk (D:)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">13.9 GB free / 16.0 GB</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full w-[13%]" />
                      </div>
                      <div className="text-[10px] text-slate-500">LPDDR5 Virtual Memory Mount</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Folders */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Folders & Locations
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => navigateTo('/Desktop')}
                    className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <Monitor className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="font-semibold text-white">Desktop</div>
                      <div className="text-[10px] text-slate-400">Active Workspace</div>
                    </div>
                  </div>
                  <div
                    onClick={() => navigateTo('/Documents')}
                    className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">Documents</div>
                      <div className="text-[10px] text-slate-400">Source Files</div>
                    </div>
                  </div>
                  <div
                    onClick={() => navigateTo('/Downloads')}
                    className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <Download className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">Downloads</div>
                      <div className="text-[10px] text-slate-400">Packages & Media</div>
                    </div>
                  </div>
                  <div
                    onClick={() => navigateTo('/kernel')}
                    className="p-3.5 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <Cpu className="w-5 h-5 text-rose-400" />
                    <div>
                      <div className="font-semibold text-white">Kernel & Boot</div>
                      <div className="text-[10px] text-slate-400">Stage-3 & Drivers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activePath === '/Trash' ? (
            /* 2. RECYCLE BIN VIEW */
            <div className="space-y-4">
              {/* Trash Header Controls */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white text-xs">
                    Recycle Bin ({trashItems.length} items)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onEmptyTrash}
                    disabled={trashItems.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Empty Recycle Bin
                  </button>
                </div>
              </div>

              {trashItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <div className="p-4 rounded-full bg-white/5 border border-white/10">
                    <Trash2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="font-semibold text-sm text-slate-300">The Recycle Bin is empty</div>
                  <p className="text-[11px] text-slate-500">Deleted files and folders will appear here</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/30 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                        <th className="py-2.5 px-4">Item Name</th>
                        <th className="py-2.5 px-4">Original Location</th>
                        <th className="py-2.5 px-4">Deleted At</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {trashItems.map((t) => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-4 flex items-center gap-2 text-white font-medium">
                            {getFileIcon(t.item)}
                            <span>{t.item.name}</span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                            {t.originalPath}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                            {t.deletedAt}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {onRestoreTrashItem && (
                              <button
                                onClick={() => onRestoreTrashItem(t.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-semibold cursor-pointer ml-auto"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* 3. NORMAL FOLDER VIEW */
            <div>
              {/* New Item Modal / Form if active */}
              {isCreatingNew && (
                <form
                  onSubmit={handleCreateSubmit}
                  className="mb-4 p-3 bg-slate-800/80 border border-sky-400/50 rounded-xl flex items-center gap-2 shadow-md"
                >
                  <span className="text-xs font-bold text-sky-300">
                    Create {isCreatingNew === 'file' ? 'File' : 'Folder'}:
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="filename.rocket"
                    className="px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(null)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {itemsToDisplay.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Folder className="w-10 h-10 stroke-1 text-slate-600" />
                  <div className="font-medium text-sm text-slate-400">This folder is empty</div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {itemsToDisplay.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/rocket-fs-item',
                            JSON.stringify(item)
                          );
                          e.dataTransfer.setData('text/plain', item.content || item.name);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                        }}
                        onDoubleClick={() => {
                          if (item.type === 'folder') {
                            navigateTo(item.path);
                          } else {
                            onOpenFile(item);
                          }
                        }}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-white/[0.18] border-white/40 shadow-xl shadow-black/25 backdrop-blur-md scale-[1.02]'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center text-slate-300 drop-shadow-md">
                          {getFileIcon(item)}
                        </div>
                        <span className="text-xs font-semibold text-slate-100 truncate max-w-full text-center">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {item.type === 'folder' ? 'Folder' : item.size || '0 B'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-white/10 rounded-2xl overflow-hidden shadow-lg bg-slate-900/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/30 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4">Modified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {itemsToDisplay.map((item) => {
                        const isSelected = selectedId === item.id;
                        return (
                          <tr
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/rocket-fs-item',
                                JSON.stringify(item)
                              );
                              e.dataTransfer.setData('text/plain', item.content || item.name);
                              e.dataTransfer.effectAllowed = 'copyMove';
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                            }}
                            onDoubleClick={() => {
                              if (item.type === 'folder') {
                                navigateTo(item.path);
                              } else {
                                onOpenFile(item);
                              }
                            }}
                            onContextMenu={(e) => handleItemContextMenu(e, item)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-sky-500/20 font-medium text-white' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="py-2.5 px-4 flex items-center gap-2.5 text-slate-200">
                              {getFileIcon(item)}
                              <span className="truncate font-medium">{item.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 capitalize">
                              {item.type === 'folder' ? 'Folder' : item.name.split('.').pop() || 'File'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 font-mono">{item.size || '--'}</td>
                            <td className="py-2.5 px-4 text-slate-500 font-mono">{item.updatedAt}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Item Right-Click Context Menu */}
      {itemContextMenu && (
        <div
          style={{ top: `${itemContextMenu.y}px`, left: `${itemContextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-48 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl p-1.5 text-slate-200 text-xs space-y-1"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 truncate">
            {itemContextMenu.item.name}
          </div>
          <button
            onClick={() => {
              if (itemContextMenu.item.type === 'folder') {
                navigateTo(itemContextMenu.item.path);
              } else {
                onOpenFile(itemContextMenu.item);
              }
              setItemContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>Open</span>
          </button>
          {onCopyItem && (
            <button
              onClick={() => {
                onCopyItem(itemContextMenu.item);
                setItemContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Copy (Ctrl+C)</span>
            </button>
          )}
          {onDeleteItem && activePath !== '/Trash' && (
            <button
              onClick={() => {
                onDeleteItem(itemContextMenu.item);
                setItemContextMenu(null);
                setSelectedId(null);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 text-left cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Move to Recycle Bin</span>
            </button>
          )}
        </div>
      )}

      {/* Footer / Status Bar */}
      <footer className="h-7 bg-slate-950 border-t border-white/10 px-4 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div>
          {activePath === '/ThisPC'
            ? '2 Drives Connected • 528 GB Total'
            : activePath === '/Trash'
            ? `${trashItems.length} Deleted items in bin`
            : `${itemsToDisplay.length} Items • RocketFS POSIX Virtual VFS`}
        </div>
        <div className="font-mono text-slate-500">Path: {activePath}</div>
      </footer>
    </div>
  );
};
