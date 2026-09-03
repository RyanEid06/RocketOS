import React, { useState, useEffect } from 'react';
import {
  WindowState,
  AppId,
  FSItem,
  SystemSettings,
  TrashItem,
} from './types';
import { INITIAL_FILE_SYSTEM } from './data/initialFileSystem';
import { BootSequence } from './components/BootSequence';
import { Desktop } from './components/Desktop';
import { WindowFrame } from './components/WindowFrame';
import { Taskbar } from './components/Taskbar';
import { CarouselDock } from './components/CarouselDock';
import { FileExplorer } from './components/apps/FileExplorer';
import { RocketStudio } from './components/apps/RocketStudio';
import { TerminalApp } from './components/apps/TerminalApp';
import { TextEditorApp } from './components/apps/TextEditorApp';
import { SystemMonitorApp } from './components/apps/SystemMonitorApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { RaylibCanvasApp } from './components/apps/RaylibCanvasApp';
import { TaskManagerApp } from './components/apps/TaskManagerApp';
import { PaintApp } from './components/apps/PaintApp';
import { NotesApp } from './components/apps/NotesApp';

export default function App() {
  const [isBooted, setIsBooted] = useState<boolean>(true);
  const [fileSystem, setFileSystem] = useState<FSItem[]>(INITIAL_FILE_SYSTEM);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([
    {
      id: 'trash-sample-1',
      originalPath: '/Documents/old_stage2_notes.txt',
      deletedAt: 'Yesterday, 18:22',
      item: {
        id: 'old-notes-item',
        name: 'old_stage2_notes.txt',
        type: 'file',
        path: '/Documents/old_stage2_notes.txt',
        size: '142 B',
        updatedAt: '2026-09-02',
        content: 'Draft notes on 32-bit protected mode transitioning to 64-bit long mode.',
      },
    },
  ]);
  const [copiedItem, setCopiedItem] = useState<FSItem | null>(null);

  const [activeWindowId, setActiveWindowId] = useState<string | null>('win-1');
  const [highestZIndex, setHighestZIndex] = useState<number>(10);
  const [activeEditorFile, setActiveEditorFile] = useState<FSItem | null>(null);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    wallpaper: 'liquid-aurora',
    accentColor: 'sky',
    nightLight: false,
    volume: 85,
    isMuted: false,
    wifiConnected: true,
    timeFormat: '12h',
    showSeconds: true,
    language: 'en',
  });

  // Default initial open windows
  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: 'win-1',
      appId: 'notes',
      title: 'Notes & To-Do Checklist',
      icon: '📝',
      isMinimized: false,
      isMaximized: false,
      zIndex: 9,
      position: { x: 90, y: 50 },
      size: { width: 780, height: 500 },
    },
    {
      id: 'win-2',
      appId: 'graphics',
      title: 'Raylib 2D Engine Canvas',
      icon: '🚀',
      isMinimized: false,
      isMaximized: false,
      zIndex: 8,
      position: { x: 180, y: 110 },
      size: { width: 840, height: 520 },
    },
  ]);

  // Pinned taskbar applications state
  const [pinnedAppIds, setPinnedAppIds] = useState<AppId[]>([
    'explorer',
    'terminal',
    'notes',
    'paint',
  ]);

  const togglePin = (appId: AppId) => {
    setPinnedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  // Show Desktop state (minimize/restore all)
  const [windowsBeforeShowDesktop, setWindowsBeforeShowDesktop] = useState<string[] | null>(null);

  const toggleShowDesktop = () => {
    const allMinimized = windows.length > 0 && windows.every((w) => w.isMinimized);
    if (allMinimized && windowsBeforeShowDesktop) {
      setWindows((prev) =>
        prev.map((w) =>
          windowsBeforeShowDesktop.includes(w.id) ? { ...w, isMinimized: false } : w
        )
      );
      setWindowsBeforeShowDesktop(null);
    } else {
      const activeIds = windows.filter((w) => !w.isMinimized).map((w) => w.id);
      setWindowsBeforeShowDesktop(activeIds);
      setWindows((prev) => prev.map((w) => ({ ...w, isMinimized: true })));
      setActiveWindowId(null);
    }
  };

  // Global ContextMenu handler to suppress Chrome's default menu across the desktop
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // If user right-clicks on an input or textarea, let native selection menu work
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  // Bring window to front
  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setHighestZIndex((prev) => {
      const nextZ = prev + 1;
      setWindows((wins) =>
        wins.map((w) =>
          w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w
        )
      );
      return nextZ;
    });
  };

  // Close window
  const closeWindow = (id: string) => {
    setWindows((wins) => wins.filter((w) => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Minimize window
  const minimizeWindow = (id: string) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Maximize / restore window
  const toggleMaximizeWindow = (id: string) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    focusWindow(id);
  };

  // Update window position
  const updateWindowPosition = (id: string, x: number, y: number) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, position: { x, y } } : w))
    );
  };

  // Update window bounds and snap
  const updateWindowBounds = (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number,
    snapState: 'left' | 'right' | 'none' = 'none'
  ) => {
    setWindows((wins) =>
      wins.map((w) =>
        w.id === id
          ? {
              ...w,
              size: { width, height },
              position: { x, y },
              snapState,
              isMaximized: false,
            }
          : w
      )
    );
  };

  // Launch or bring to front an application
  const openApp = (appId: AppId, extraData?: Record<string, any>) => {
    // If it's ThisPC or Trash, route to explorer with that path
    if (appId === 'thispc') {
      openApp('explorer', { path: '/ThisPC' });
      return;
    }
    if (appId === 'trash') {
      openApp('explorer', { path: '/Trash' });
      return;
    }

    // Check if an existing window of this app is open (unless it's an explorer navigating to a new path)
    const existing = windows.find((w) => w.appId === appId);
    if (existing && !extraData?.path) {
      if (existing.isMinimized) {
        setWindows((wins) =>
          wins.map((w) => (w.id === existing.id ? { ...w, isMinimized: false } : w))
        );
      }
      focusWindow(existing.id);
      return;
    }

    const newId = `win-${Date.now()}`;
    const nextZ = highestZIndex + 1;
    setHighestZIndex(nextZ);

    let title = 'Application';
    let icon = '📦';
    let width = 780;
    let height = 500;

    switch (appId) {
      case 'explorer':
        const p = extraData?.path || '/Desktop';
        title = p === '/ThisPC' ? 'This PC' : p === '/Trash' ? 'Recycle Bin' : `File Explorer - ${p}`;
        icon = p === '/Trash' ? '🗑️' : '📁';
        width = 820;
        height = 510;
        break;
      case 'taskmanager':
        title = 'Task Manager';
        icon = '📊';
        width = 800;
        height = 500;
        break;
      case 'paint':
        title = 'Paint Studio';
        icon = '🎨';
        width = 920;
        height = 580;
        break;
      case 'notes':
        title = 'Notes & To-Do Checklist';
        icon = '📝';
        width = 780;
        height = 500;
        break;
      case 'rocket-studio':
        title = 'Rocket Language Studio';
        icon = '✨';
        width = 860;
        height = 540;
        break;
      case 'terminal':
        title = 'Terminal (rsh v2.0)';
        icon = '🖥️';
        width = 700;
        height = 430;
        break;
      case 'editor':
        title = 'Rocket Code Editor (rEdit)';
        icon = '📝';
        width = 740;
        height = 490;
        break;
      case 'monitor':
        title = 'Hardware & PML4 Monitor';
        icon = '⚡';
        width = 680;
        height = 440;
        break;
      case 'settings':
        title = 'Settings';
        icon = '⚙️';
        width = 780;
        height = 520;
        break;
      case 'graphics':
        title = 'Raylib 2D Engine Canvas';
        icon = '🚀';
        width = 850;
        height = 530;
        break;
    }

    const newWindow: WindowState = {
      id: newId,
      appId,
      title,
      icon,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZ,
      position: {
        x: Math.min(window.innerWidth - width - 20, 60 + (windows.length * 25) % 200),
        y: Math.min(window.innerHeight - height - 60, 40 + (windows.length * 25) % 150),
      },
      size: { width, height },
      extraData,
    };

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindowId(newId);
  };

  // Open file in Text Editor
  const handleOpenFile = (file: FSItem) => {
    setActiveEditorFile(file);
    const existingEditor = windows.find((w) => w.appId === 'editor');
    if (existingEditor) {
      focusWindow(existingEditor.id);
    } else {
      openApp('editor', { file });
    }
  };

  // Save file content in file system
  const handleSaveFileContent = (path: string, newContent: string) => {
    const updateInTree = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.path === path) {
          return { ...item, content: newContent, size: `${newContent.length} B` };
        }
        if (item.children) {
          return { ...item, children: updateInTree(item.children) };
        }
        return item;
      });
    };
    setFileSystem(updateInTree(fileSystem));
    if (activeEditorFile && activeEditorFile.path === path) {
      setActiveEditorFile({ ...activeEditorFile, content: newContent });
    }
  };

  // Create new item in file system
  const handleCreateItem = (
    parentPath: string,
    name: string,
    type: 'file' | 'folder',
    content?: string
  ) => {
    const newItemPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
    const newItem: FSItem = {
      id: `item-${Date.now()}`,
      name,
      type,
      path: newItemPath,
      size: type === 'file' ? '0 B' : undefined,
      updatedAt: '2026-09-03',
      content: content || '',
      children: type === 'folder' ? [] : undefined,
    };

    const insertIntoTree = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.path === parentPath && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), newItem],
          };
        }
        if (item.children) {
          return { ...item, children: insertIntoTree(item.children) };
        }
        return item;
      });
    };

    setFileSystem(insertIntoTree(fileSystem));
  };

  // Delete item from file system and move to Recycle Bin
  const handleDeleteItem = (targetItem: FSItem) => {
    const removeFromTree = (items: FSItem[]): FSItem[] => {
      return items
        .filter((item) => item.id !== targetItem.id && item.path !== targetItem.path)
        .map((item) => {
          if (item.children) {
            return { ...item, children: removeFromTree(item.children) };
          }
          return item;
        });
    };

    setFileSystem(removeFromTree(fileSystem));

    const newTrashItem: TrashItem = {
      id: `trash-${Date.now()}`,
      item: targetItem,
      deletedAt: 'Just now',
      originalPath: targetItem.path,
    };
    setTrashItems((prev) => [newTrashItem, ...prev]);
  };

  // Restore item from Recycle Bin back into file system
  const handleRestoreTrashItem = (trashId: string) => {
    const tItem = trashItems.find((t) => t.id === trashId);
    if (!tItem) return;

    // Determine parent directory path
    const parts = tItem.originalPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/');

    // Insert back into tree
    const insertBack = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.path === parentPath && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), tItem.item],
          };
        }
        if (item.children) {
          return { ...item, children: insertBack(item.children) };
        }
        return item;
      });
    };

    setFileSystem(insertBack(fileSystem));
    setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = () => {
    setTrashItems([]);
  };

  // Copy Item
  const handleCopyItem = (item: FSItem) => {
    setCopiedItem(item);
  };

  // Paste Item
  const handlePasteItem = (targetDirectoryPath: string) => {
    if (!copiedItem) return;
    const extension = copiedItem.name.includes('.')
      ? '.' + copiedItem.name.split('.').pop()
      : '';
    const baseName = copiedItem.name.replace(extension, '');
    const duplicateName = `${baseName}_copy${extension}`;

    handleCreateItem(
      targetDirectoryPath,
      duplicateName,
      copiedItem.type,
      copiedItem.content
    );
  };

  // Create a default rocket file on Desktop
  const handleCreateDesktopFile = () => {
    handleCreateItem(
      '/Desktop',
      `module_${Date.now().toString().slice(-4)}.rocket`,
      'file',
      '// New Rocket module\nfn main() -> Int {\n    println("Hello from Rocket");\n    return 0;\n}\n'
    );
  };

  // Create a folder on Desktop
  const handleCreateDesktopFolder = () => {
    handleCreateItem(
      '/Desktop',
      `New_Folder_${Date.now().toString().slice(-4)}`,
      'folder'
    );
  };

  // Get desktop files for the desktop surface
  const getDesktopItems = (): FSItem[] => {
    const desktopFolder = fileSystem[0]?.children?.find((c) => c.name === 'Desktop');
    return desktopFolder?.children || [];
  };

  // Render individual window content
  const renderWindowContent = (win: WindowState) => {
    switch (win.appId) {
      case 'explorer':
        return (
          <FileExplorer
            fileSystem={fileSystem}
            currentPath={win.extraData?.path || '/Desktop'}
            trashItems={trashItems}
            copiedItem={copiedItem}
            onOpenFile={handleOpenFile}
            onOpenTerminalAtPath={(path) => openApp('terminal', { cwd: path })}
            onCreateItem={handleCreateItem}
            onDeleteItem={handleDeleteItem}
            onRestoreTrashItem={handleRestoreTrashItem}
            onEmptyTrash={handleEmptyRecycleBin}
            onCopyItem={handleCopyItem}
            onPasteItem={handlePasteItem}
          />
        );
      case 'taskmanager':
        return <TaskManagerApp windows={windows} onCloseWindow={closeWindow} />;
      case 'paint':
        return <PaintApp />;
      case 'notes':
        return <NotesApp />;
      case 'rocket-studio':
        return <RocketStudio />;
      case 'terminal':
        return (
          <TerminalApp
            fileSystem={fileSystem}
            currentPath={win.extraData?.cwd || '/Desktop'}
            onReboot={() => setIsBooted(false)}
            onOpenFile={handleOpenFile}
          />
        );
      case 'editor':
        return (
          <TextEditorApp
            file={activeEditorFile || win.extraData?.file}
            onSaveFile={handleSaveFileContent}
          />
        );
      case 'monitor':
        return <SystemMonitorApp />;
      case 'settings':
        return (
          <SettingsApp
            settings={settings}
            onUpdateSettings={(newSettings) =>
              setSettings((prev) => ({ ...prev, ...newSettings }))
            }
          />
        );
      case 'graphics':
        return <RaylibCanvasApp />;
      default:
        return <div className="p-4 text-slate-300">App content</div>;
    }
  };

  if (!isBooted) {
    return <BootSequence onBootComplete={() => setIsBooted(true)} />;
  }

  return (
    <div id="rocket-os-root" className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Desktop Surface */}
      <Desktop
        desktopFiles={getDesktopItems()}
        settings={settings}
        trashCount={trashItems.length}
        onOpenApp={openApp}
        onOpenFile={handleOpenFile}
        onDeleteFile={handleDeleteItem}
        onCopyFile={handleCopyItem}
        onReboot={() => setIsBooted(false)}
        onCreateDesktopFile={handleCreateDesktopFile}
        onCreateFolder={handleCreateDesktopFolder}
        onOpenTimeSettings={() => openApp('settings')}
      />

      {/* Floating Windows */}
      {windows.map((win) => (
        <WindowFrame
          key={win.id}
          window={win}
          isActive={activeWindowId === win.id}
          isPinned={pinnedAppIds.includes(win.appId)}
          onTogglePin={() => togglePin(win.appId)}
          onFocus={() => focusWindow(win.id)}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onToggleMaximize={() => toggleMaximizeWindow(win.id)}
          onUpdatePosition={(x, y) => updateWindowPosition(win.id, x, y)}
          onUpdateBounds={(w, h, x, y, snap) => updateWindowBounds(win.id, w, h, x, y, snap)}
        >
          {renderWindowContent(win)}
        </WindowFrame>
      ))}

      {/* 5-App Circular Rotating Carousel Dock (Bottom Middle with Cursor Tracking & Magnification) */}
      <CarouselDock
        settings={settings}
        onOpenApp={openApp}
        trashCount={trashItems.length}
      />

      {/* Bottom Transparent Liquid Glass Taskbar */}
      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        settings={settings}
        fileSystem={fileSystem}
        pinnedAppIds={pinnedAppIds}
        onTogglePin={togglePin}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onSelectWindow={(id) => {
          const win = windows.find((w) => w.id === id);
          if (win?.isMinimized) {
            focusWindow(id);
          } else if (activeWindowId === id) {
            minimizeWindow(id);
          } else {
            focusWindow(id);
          }
        }}
        onCloseWindow={closeWindow}
        onMinimizeWindow={minimizeWindow}
        onToggleShowDesktop={toggleShowDesktop}
        onOpenApp={openApp}
        onOpenFile={handleOpenFile}
        onReboot={() => setIsBooted(false)}
        onOpenExplorerPath={(path) => openApp('explorer', { path })}
      />
    </div>
  );
}
