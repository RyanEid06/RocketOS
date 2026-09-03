import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FSItem, TrashItem } from '../../types';
import {
  Folder,
  FileText,
  Code2,
  FileBox,
  Monitor,
  Download,
  Cpu,
  Sparkles,
  Layers,
} from 'lucide-react';
import { FileSystemService } from '../../core/filesystem/FileSystemService';
import { clipboardService, ClipboardItem } from '../../core/clipboard/ClipboardService';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { FileExplorerSidebar } from './file-explorer/FileExplorerSidebar';
import { FileExplorerToolbar } from './file-explorer/FileExplorerToolbar';
import { FileExplorerDriveView } from './file-explorer/FileExplorerDriveView';
import { FileExplorerTrashView } from './file-explorer/FileExplorerTrashView';
import { FileExplorerContextMenu } from './file-explorer/FileExplorerContextMenu';
import { FileExplorerPropertiesModal } from './file-explorer/FileExplorerPropertiesModal';

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
  onCutItem?: (item: FSItem) => void;
  onPasteItem?: (targetPath: string) => void;
  onRenameItem?: (itemId: string, newName: string) => void;
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
  onCutItem,
  onPasteItem,
  onRenameItem,
}) => {
  const [activePath, setActivePath] = useState<string>(() => FileSystemService.normalizePath(currentPath));
  const [history, setHistory] = useState<string[]>([activePath]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreatingNew, setIsCreatingNew] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [renamingItem, setRenamingItem] = useState<{ id: string; name: string } | null>(null);
  const [propertiesItem, setPropertiesItem] = useState<FSItem | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(() => clipboardService.getClipboard());

  const [itemContextMenu, setItemContextMenu] = useState<{
    x: number;
    y: number;
    item: FSItem;
  } | null>(null);

  const explorerRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to clipboard changes
  useEffect(() => {
    return clipboardService.subscribe((item) => {
      setClipboard(item);
    });
  }, []);

  // Synchronize when currentPath prop changes externally
  useEffect(() => {
    if (currentPath) {
      const normalized = FileSystemService.normalizePath(currentPath);
      if (normalized !== activePath) {
        navigateTo(normalized);
      }
    }
  }, [currentPath]);

  const navigateTo = (path: string) => {
    const target = FileSystemService.normalizePath(path);
    if (target === activePath) return;

    // Check if path exists in fileSystem or is special path
    if (target !== '/ThisPC' && target !== '/Trash') {
      const exists = FileSystemService.findItemByPath(fileSystem, target);
      if (!exists && target !== '/') {
        // Fallback safely to /Desktop if invalid path given
        const fallback = '/Desktop';
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(fallback);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setActivePath(fallback);
        setSelectedIds(new Set());
        return;
      }
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(target);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActivePath(target);
    setSelectedIds(new Set());
    setIsCreatingNew(null);
    setRenamingItem(null);
    setItemContextMenu(null);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setActivePath(prev);
      setSelectedIds(new Set());
      setItemContextMenu(null);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setActivePath(next);
      setSelectedIds(new Set());
      setItemContextMenu(null);
    }
  };

  const handleUp = () => {
    if (activePath === '/' || activePath === '/ThisPC' || activePath === '/Trash') {
      navigateTo('/ThisPC');
      return;
    }
    const parentPath = FileSystemService.getParentPath(activePath);
    navigateTo(parentPath);
  };

  const currentFolder = useMemo(() => {
    if (activePath === '/ThisPC' || activePath === '/Trash') return null;
    const rfsItem = RocketFS.getInstance().findItemByPath(activePath);
    if (rfsItem) return rfsItem;
    const found = FileSystemService.findItemByPath(fileSystem, activePath);
    return found || fileSystem[0] || null;
  }, [fileSystem, activePath]);

  const itemsToDisplay = useMemo(() => {
    if (!currentFolder) return [];
    const list = currentFolder.children || [];
    if (!searchQuery.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentFolder, searchQuery]);

  const primarySelectedItem = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstId = Array.from(selectedIds)[0];
    return itemsToDisplay.find((i) => i.id === firstId) || null;
  }, [itemsToDisplay, selectedIds]);

  // Keyboard shortcuts (Ctrl+A selects all, Ctrl+C copies, Ctrl+X cuts, Ctrl+V pastes, Delete moves to trash, F2 renames)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        // FIXED: Select ALL items in current directory
        if (itemsToDisplay.length > 0) {
          setSelectedIds(new Set(itemsToDisplay.map((i) => i.id)));
        }
      } else if (isCtrl && e.key.toLowerCase() === 'c') {
        if (primarySelectedItem) {
          e.preventDefault();
          clipboardService.copyItem(primarySelectedItem);
          onCopyItem?.(primarySelectedItem);
        }
      } else if (isCtrl && e.key.toLowerCase() === 'x') {
        if (primarySelectedItem && activePath !== '/Trash' && activePath !== '/ThisPC') {
          e.preventDefault();
          clipboardService.cutItem(primarySelectedItem);
          onCutItem?.(primarySelectedItem);
        }
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
        const clip = clipboardService.getClipboard();
        if (clip?.item && activePath !== '/Trash' && activePath !== '/ThisPC') {
          e.preventDefault();
          onPasteItem?.(activePath);
        }
      } else if (e.key === 'Delete') {
        if (selectedIds.size > 0 && onDeleteItem && activePath !== '/Trash') {
          e.preventDefault();
          itemsToDisplay
            .filter((item) => selectedIds.has(item.id))
            .forEach((item) => onDeleteItem(item));
          setSelectedIds(new Set());
        }
      } else if (e.key === 'F2') {
        if (primarySelectedItem && activePath !== '/Trash' && activePath !== '/ThisPC') {
          e.preventDefault();
          setRenamingItem({ id: primarySelectedItem.id, name: primarySelectedItem.name });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemsToDisplay, selectedIds, primarySelectedItem, activePath, onDeleteItem, onCopyItem, onCutItem, onPasteItem]);

  const getFileIcon = (item: FSItem) => {
    if (item.type === 'folder') {
      if (item.name === 'Desktop') return <Monitor className="w-5 h-5 text-sky-400" />;
      if (item.name === 'Downloads') return <Download className="w-5 h-5 text-emerald-400" />;
      if (item.name === 'Documents') return <FileText className="w-5 h-5 text-amber-400" />;
      if (item.name === 'kernel') return <Cpu className="w-5 h-5 text-rose-400" />;
      if (item.name === 'drivers') return <Layers className="w-5 h-5 text-purple-400" />;
      return <Folder className="w-5 h-5 text-sky-400 fill-sky-400/20" />;
    }
    if (item.name.endsWith('.rocket') || item.name.endsWith('.rkt')) {
      return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
    if (item.name.endsWith('.asm')) {
      return <Code2 className="w-5 h-5 text-amber-400" />;
    }
    if (item.name.endsWith('.bin') || item.name.endsWith('.iso') || item.name.endsWith('.sys')) {
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
        ? '// RocketOS Module\nfn main() -> Int:\n    print("Hello from Rocket")\n    return 0\n'
        : undefined
    );
    setIsCreatingNew(null);
    setNewItemName('');
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renamingItem.name.trim()) return;
    onRenameItem?.(renamingItem.id, renamingItem.name.trim());
    setRenamingItem(null);
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: FSItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(new Set([item.id]));
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 240);
    setItemContextMenu({ x, y, item });
  };

  const handleItemClick = (e: React.MouseEvent, item: FSItem) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Toggle in set
      const next = new Set(selectedIds);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([item.id]));
    }
  };

  return (
    <div
      ref={explorerRef}
      id="file-explorer"
      onClick={() => {
        setItemContextMenu(null);
        setSelectedIds(new Set());
      }}
      className="flex flex-col h-full bg-slate-900 text-slate-100 select-none text-xs font-sans"
    >
      {/* Top Toolbar */}
      <FileExplorerToolbar
        activePath={activePath}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        searchQuery={searchQuery}
        viewMode={viewMode}
        clipboard={clipboard}
        hasSelection={selectedIds.size > 0}
        onBack={handleBack}
        onForward={handleForward}
        onUp={handleUp}
        onSearchChange={setSearchQuery}
        onToggleViewMode={setViewMode}
        onStartCreate={setIsCreatingNew}
        onCopySelection={() => {
          if (primarySelectedItem) {
            clipboardService.copyItem(primarySelectedItem);
            onCopyItem?.(primarySelectedItem);
          }
        }}
        onCutSelection={() => {
          if (primarySelectedItem) {
            clipboardService.cutItem(primarySelectedItem);
            onCutItem?.(primarySelectedItem);
          }
        }}
        onPaste={() => onPasteItem?.(activePath)}
        onDeleteSelection={() => {
          itemsToDisplay
            .filter((i) => selectedIds.has(i.id))
            .forEach((i) => onDeleteItem?.(i));
          setSelectedIds(new Set());
        }}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <FileExplorerSidebar
          activePath={activePath}
          trashItems={trashItems}
          onNavigate={navigateTo}
          onOpenTerminal={onOpenTerminalAtPath}
        />

        {/* Center Content View */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
          {activePath === '/ThisPC' ? (
            <FileExplorerDriveView onNavigate={navigateTo} />
          ) : activePath === '/Trash' ? (
            <FileExplorerTrashView
              trashItems={trashItems}
              onEmptyTrash={onEmptyTrash}
              onRestoreTrashItem={onRestoreTrashItem}
              getFileIcon={getFileIcon}
            />
          ) : (
            <div>
              {/* New Item Form */}
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
                    placeholder={isCreatingNew === 'file' ? 'filename.rocket' : 'folder_name'}
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

              {/* Rename Form */}
              {renamingItem && (
                <form
                  onSubmit={handleRenameSubmit}
                  className="mb-4 p-3 bg-slate-800/80 border border-blue-400/50 rounded-xl flex items-center gap-2 shadow-md"
                >
                  <span className="text-xs font-bold text-blue-300">Rename:</span>
                  <input
                    type="text"
                    autoFocus
                    value={renamingItem.name}
                    onChange={(e) => setRenamingItem({ ...renamingItem, name: e.target.value })}
                    className="px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingItem(null)}
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
                    const isSelected = selectedIds.has(item.id);
                    const isCutItem = clipboard?.op === 'cut' && clipboard.item?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/rocket-fs-item', JSON.stringify(item));
                          e.dataTransfer.setData('text/plain', item.content || item.name);
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={(e) => handleItemClick(e, item)}
                        onDoubleClick={() => {
                          if (item.type === 'folder') {
                            navigateTo(item.path);
                          } else {
                            onOpenFile(item);
                          }
                        }}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isCutItem ? 'opacity-40 border-dashed border-amber-400/50' : ''
                        } ${
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
                        const isSelected = selectedIds.has(item.id);
                        const isCutItem = clipboard?.op === 'cut' && clipboard.item?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/rocket-fs-item', JSON.stringify(item));
                              e.dataTransfer.setData('text/plain', item.content || item.name);
                              e.dataTransfer.effectAllowed = 'copyMove';
                            }}
                            onClick={(e) => handleItemClick(e, item)}
                            onDoubleClick={() => {
                              if (item.type === 'folder') {
                                navigateTo(item.path);
                              } else {
                                onOpenFile(item);
                              }
                            }}
                            onContextMenu={(e) => handleItemContextMenu(e, item)}
                            className={`transition-colors cursor-pointer ${
                              isCutItem ? 'opacity-40 italic' : ''
                            } ${
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

      {/* Context Menu */}
      {itemContextMenu && (
        <FileExplorerContextMenu
          x={itemContextMenu.x}
          y={itemContextMenu.y}
          item={itemContextMenu.item}
          onOpen={(item) => {
            if (item.type === 'folder') {
              navigateTo(item.path);
            } else {
              onOpenFile(item);
            }
          }}
          onCopy={(item) => {
            clipboardService.copyItem(item);
            onCopyItem?.(item);
          }}
          onCut={(item) => {
            clipboardService.cutItem(item);
            onCutItem?.(item);
          }}
          onRename={(item) => {
            setRenamingItem({ id: item.id, name: item.name });
          }}
          onDelete={(item) => {
            onDeleteItem?.(item);
            setSelectedIds(new Set());
          }}
          onProperties={(item) => {
            setPropertiesItem(item);
          }}
          onClose={() => setItemContextMenu(null)}
        />
      )}

      {/* Properties Modal */}
      {propertiesItem && (
        <FileExplorerPropertiesModal
          item={propertiesItem}
          onClose={() => setPropertiesItem(null)}
        />
      )}

      {/* Status Bar */}
      <footer className="h-7 bg-slate-950 border-t border-white/10 px-4 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div>
          {activePath === '/ThisPC'
            ? '2 Drives Connected • 528 GB Total'
            : activePath === '/Trash'
            ? `${trashItems.length} Deleted items in bin`
            : `${itemsToDisplay.length} Items (${selectedIds.size} selected) • RocketFS VFS`}
        </div>
        <div className="font-mono text-slate-500">Path: {activePath}</div>
      </footer>
    </div>
  );
};
