import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  WindowState,
  WindowSnapState,
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
import { WorkspaceSwitchBanner } from './components/desktop/WorkspaceSwitchBanner';
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
import { RocketGallery } from './components/apps/RocketGallery';

import { browserPersistenceProvider } from './platform/browser/BrowserPersistenceProvider';
import { settingsService } from './core/settings/SettingsService';
import { pinningService } from './core/pinning/PinningService';
import { clipboardService } from './core/clipboard/ClipboardService';
import { notificationService } from './core/notifications/NotificationService';
import { FileSystemService } from './core/filesystem/FileSystemService';
import { RocketFS } from './core/filesystem/RocketFS';
import { SchemaMigration } from './core/filesystem/SchemaMigration';
import { AppRegistry } from './core/apps/AppRegistry';
import { soundEngine } from './utils/audio';
import { ProcessManager } from './core/process/ProcessManager';
import { ServiceManager } from './core/services/ServiceManager';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { FileAssociations } from './core/filesystem/FileAssociations';

export default function App() {
  const [isBooted, setIsBooted] = useState<boolean>(true);
  const [fileSystem, setFileSystem] = useState<FSItem[]>(INITIAL_FILE_SYSTEM);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [activeEditorFile, setActiveEditorFile] = useState<FSItem | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>(() => settingsService.getSettings());

  // Virtual Desktops State
  const [currentWorkspace, setCurrentWorkspace] = useState<number>(1);
  const [showWorkspaceBanner, setShowWorkspaceBanner] = useState<boolean>(false);
  const bannerTimerRef = useRef<number | null>(null);

  // Pinned taskbar applications state
  const [pinnedAppIds, setPinnedAppIds] = useState<AppId[]>(() => pinningService.getPinned());

  // Windows State
  const [activeWindowId, setActiveWindowId] = useState<string | null>('win-1');
  const [highestZIndex, setHighestZIndex] = useState<number>(10);
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
      workspaceId: 1,
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
      workspaceId: 1,
    },
  ]);

  // Show Desktop state (minimize/restore all)
  const [windowsBeforeShowDesktop, setWindowsBeforeShowDesktop] = useState<string[] | null>(null);

  // 1. Initial State Restoration from IndexedDB / BrowserPersistenceProvider
  useEffect(() => {
    let mounted = true;

    // Boot core RocketOS background services
    ServiceManager.getInstance().bootCoreServices();

    // Register initial windows into authoritative ProcessManager
    windows.forEach((win) => {
      ProcessManager.getInstance().spawnProcess({
        appId: win.appId,
        name: win.title,
        workspaceId: win.workspaceId || 1,
        windowId: win.id,
      });
    });

    async function restoreSystemState() {
      try {
        const saved = await browserPersistenceProvider.loadState();
        if (!mounted || !saved) return;

        if (saved.settings) {
          settingsService.updateSettings(saved.settings);
          setSettings(saved.settings);
          soundEngine.setMasterSettings(saved.settings.volume, saved.settings.isMuted);
        }

        if (saved.pinnedAppIds && Array.isArray(saved.pinnedAppIds)) {
          pinningService.setPinned(saved.pinnedAppIds);
          setPinnedAppIds(saved.pinnedAppIds);
        }

        const rfs = RocketFS.getInstance();
        if (saved.fileSystem) {
          if (SchemaMigration.isV2Snapshot(saved.fileSystem)) {
            rfs.loadSnapshot(saved.fileSystem);
          } else if (Array.isArray(saved.fileSystem) && saved.fileSystem.length > 0) {
            const v2 = SchemaMigration.migrateV1ToV2(saved.fileSystem);
            rfs.loadSnapshot(v2);
          }
          setFileSystem(rfs.toFSItemTree());
          setTrashItems(rfs.getTrashSubsystem().listTrash());
        } else {
          setFileSystem(rfs.toFSItemTree());
        }

        if (saved.trashItems && Array.isArray(saved.trashItems)) {
          setTrashItems(saved.trashItems);
        }

        if (saved.activeWorkspace) {
          setCurrentWorkspace(saved.activeWorkspace);
        }
      } catch (err) {
        console.warn('Could not restore persistent state:', err);
      }
    }

    restoreSystemState();
    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to RocketFS changes
  useEffect(() => {
    return RocketFS.getInstance().subscribe(() => {
      const rfs = RocketFS.getInstance();
      setFileSystem(rfs.toFSItemTree());
      setTrashItems(rfs.getTrashSubsystem().listTrash());
    });
  }, []);

  // 2. Sync Master Audio Settings whenever settings change
  useEffect(() => {
    soundEngine.setMasterSettings(settings.volume, settings.isMuted);
  }, [settings.volume, settings.isMuted]);

  // 3. Debounced Persistent Saving of State Changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const rfs = RocketFS.getInstance();
      browserPersistenceProvider.saveState({
        settings,
        pinnedAppIds,
        fileSystem: rfs.snapshot(),
        trashItems: rfs.getTrashSubsystem().listTrash(),
        activeWorkspace: currentWorkspace,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [settings, pinnedAppIds, fileSystem, trashItems, currentWorkspace]);

  // Global ContextMenu handler to suppress Chrome's default menu across the desktop
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  // Update Settings handler
  const handleUpdateSettings = (newSettings: Partial<SystemSettings>) => {
    const updated = settingsService.updateSettings(newSettings);
    setSettings({ ...updated });
  };

  // Toggle Pinned status
  const handleTogglePin = (appId: AppId) => {
    const updated = pinningService.togglePin(appId);
    setPinnedAppIds(updated);
    soundEngine.playPin();
  };

  // Virtual Desktops: Switch Workspace
  const handleChangeWorkspace = (wsId: number) => {
    if (wsId === currentWorkspace) return;
    setCurrentWorkspace(wsId);
    soundEngine.playSnap();

    // Show workspace toast banner
    setShowWorkspaceBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setShowWorkspaceBanner(false);
    }, 1800);

    // If currently active window is not in the new workspace, select highest window on new workspace
    const currentActive = windows.find((w) => w.id === activeWindowId);
    if (currentActive && currentActive.workspaceId !== wsId && currentActive.workspaceId !== 0) {
      const windowsInNewWs = windows
        .filter((w) => (w.workspaceId || 1) === wsId || w.workspaceId === 0)
        .filter((w) => !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);

      if (windowsInNewWs.length > 0) {
        setActiveWindowId(windowsInNewWs[0].id);
      } else {
        setActiveWindowId(null);
      }
    }
  };

  // Move a window to another workspace
  const handleMoveWindowToWorkspace = (windowId: string, wsId: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, workspaceId: wsId } : w))
    );
    notificationService.notify(
      'Window Moved',
      `Window sent to Desktop ${wsId}`,
      'info'
    );
  };

  // Bring window to front
  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setHighestZIndex((prev) => {
      const nextZ = prev + 1;
      setWindows((wins) =>
        wins.map((w) => (w.id === id ? { ...w, zIndex: nextZ, isMinimized: false } : w))
      );
      return nextZ;
    });
  };

  // Close window
  const closeWindow = (id: string) => {
    soundEngine.playClose();
    ProcessManager.getInstance().onWindowClosed(id);
    setWindows((wins) => wins.filter((w) => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Minimize window
  const minimizeWindow = (id: string) => {
    soundEngine.playMinimize();
    setWindows((wins) => wins.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  // Maximize / restore window
  const toggleMaximizeWindow = (id: string) => {
    soundEngine.playSnap();
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
    snapState: WindowSnapState = 'none'
  ) => {
    setWindows((wins) =>
      wins.map((w) => {
        if (w.id !== id) return w;
        const currentRestore =
          w.snapState === 'none' && snapState !== 'none'
            ? { x: w.position.x, y: w.position.y, width: w.size.width, height: w.size.height }
            : w.restoreBounds;
        return {
          ...w,
          size: { width, height },
          position: { x, y },
          snapState,
          restoreBounds: currentRestore,
          isMaximized: false,
        };
      })
    );
  };

  // Toggle Show Desktop
  const toggleShowDesktop = () => {
    const visibleWins = windows.filter(
      (w) => (w.workspaceId || 1) === currentWorkspace || w.workspaceId === 0
    );
    const allMinimized = visibleWins.length > 0 && visibleWins.every((w) => w.isMinimized);

    if (allMinimized && windowsBeforeShowDesktop) {
      setWindows((prev) =>
        prev.map((w) =>
          windowsBeforeShowDesktop.includes(w.id) ? { ...w, isMinimized: false } : w
        )
      );
      setWindowsBeforeShowDesktop(null);
      soundEngine.playOpen();
    } else {
      const activeIds = visibleWins.filter((w) => !w.isMinimized).map((w) => w.id);
      setWindowsBeforeShowDesktop(activeIds);
      setWindows((prev) =>
        prev.map((w) =>
          (w.workspaceId || 1) === currentWorkspace || w.workspaceId === 0
            ? { ...w, isMinimized: true }
            : w
        )
      );
      setActiveWindowId(null);
      soundEngine.playMinimize();
    }
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

    // Check if an existing window of this app is open in current workspace
    const existing = windows.find(
      (w) =>
        w.appId === appId &&
        ((w.workspaceId || 1) === currentWorkspace || w.workspaceId === 0)
    );

    if (existing && !extraData?.path) {
      if (existing.isMinimized) {
        setWindows((wins) =>
          wins.map((w) => (w.id === existing.id ? { ...w, isMinimized: false } : w))
        );
      }
      focusWindow(existing.id);
      soundEngine.playOpen();
      return;
    }

    const appDef = AppRegistry.getApp(appId);
    const newId = `win-${Date.now()}`;
    const nextZ = highestZIndex + 1;
    setHighestZIndex(nextZ);

    let title = appDef.displayName;
    let icon = appDef.glyph;
    let width = appDef.constraints.defaultWidth;
    let height = appDef.constraints.defaultHeight;

    if (appId === 'explorer') {
      const p = extraData?.path || '/Desktop';
      title =
        p === '/ThisPC'
          ? 'This PC'
          : p === '/Trash'
          ? 'Recycle Bin'
          : `File Explorer - ${p}`;
      icon = p === '/Trash' ? '🗑️' : '📁';
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
      workspaceId: currentWorkspace,
      extraData,
    };

    // Register genuine RocketOS process
    ProcessManager.getInstance().spawnProcess({
      appId,
      name: title,
      workspaceId: currentWorkspace,
      windowId: newId,
      isBackgroundDaemon: false,
    });

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindowId(newId);
    soundEngine.playOpen();
  };

  // Open file based on FileAssociations
  const handleOpenFile = (file: FSItem) => {
    const targetAppId = FileAssociations.getDefaultAppId(file.name);
    if (targetAppId === 'gallery') {
      openApp('gallery', { file, path: file.path });
      return;
    }
    if (targetAppId === 'paint') {
      openApp('paint', { file, path: file.path });
      return;
    }
    if (targetAppId === 'notes') {
      openApp('notes', { file, path: file.path });
      return;
    }
    if (targetAppId === 'graphics') {
      openApp('graphics', { file, path: file.path });
      return;
    }
    setActiveEditorFile(file);
    const existingEditor = windows.find((w) => w.appId === 'editor');
    if (existingEditor) {
      if (existingEditor.isMinimized) {
        setWindows((wins) =>
          wins.map((w) => (w.id === existingEditor.id ? { ...w, isMinimized: false } : w))
        );
      }
      focusWindow(existingEditor.id);
    } else {
      openApp('editor', { file });
    }
  };

  // Save file content in file system
  const handleSaveFileContent = (path: string, newContent: string) => {
    const updated = FileSystemService.updateFileContent(fileSystem, path, newContent);
    setFileSystem(updated);
    if (activeEditorFile && activeEditorFile.path === path) {
      setActiveEditorFile({ ...activeEditorFile, content: newContent });
    }
    notificationService.notify('File Saved', `Saved changes to ${path}`, 'success');
  };

  // Create new item in file system
  const handleCreateItem = (
    parentPath: string,
    name: string,
    type: 'file' | 'folder',
    content?: string
  ) => {
    const { newTree } = FileSystemService.createItem(
      fileSystem,
      parentPath,
      name,
      type,
      content
    );
    setFileSystem(newTree);
    soundEngine.playPin();
  };

  // Rename item in file system
  const handleRenameItem = (itemId: string, newName: string) => {
    const { newTree } = FileSystemService.renameItem(fileSystem, itemId, newName);
    setFileSystem(newTree);
    notificationService.notify('Renamed', `Item renamed to ${newName}`, 'info');
  };

  // Delete item from file system and move to Recycle Bin
  const handleDeleteItem = (targetItem: FSItem) => {
    const { newTree, deletedItem } = FileSystemService.deleteItem(
      fileSystem,
      targetItem.id
    );
    if (!deletedItem) return;

    setFileSystem(newTree);
    soundEngine.playTrash();

    const newTrashItem: TrashItem = {
      id: `trash-${Date.now()}`,
      item: deletedItem,
      deletedAt: 'Just now',
      originalPath: deletedItem.path,
    };
    setTrashItems((prev) => [newTrashItem, ...prev]);
    notificationService.notify(
      'Moved to Recycle Bin',
      `"${deletedItem.name}" was moved to the Recycle Bin`,
      'info'
    );
  };

  // Restore item from Recycle Bin back into file system
  const handleRestoreTrashItem = (trashId: string) => {
    const tItem = trashItems.find((t) => t.id === trashId);
    if (!tItem) return;

    const parentPath = FileSystemService.getParentPath(tItem.originalPath);
    const restoredItem = { ...tItem.item, path: tItem.originalPath };

    const insertBack = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.path === parentPath && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), restoredItem],
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
    soundEngine.playOpen();
    notificationService.notify('Restored', `Restored ${restoredItem.name}`, 'success');
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = () => {
    setTrashItems([]);
    soundEngine.playTrash();
    notificationService.notify('Recycle Bin Emptied', 'All deleted items permanently cleared', 'warning');
  };

  // Clipboard: Copy Item
  const handleCopyItem = (item: FSItem) => {
    clipboardService.copyItem(item);
    notificationService.notify('Copied', `Copied "${item.name}" to clipboard`, 'info');
  };

  // Clipboard: Cut Item
  const handleCutItem = (item: FSItem) => {
    clipboardService.cutItem(item);
    notificationService.notify('Cut', `Cut "${item.name}" to clipboard`, 'info');
  };

  // Clipboard: Paste Item
  const handlePasteItem = (targetDirectoryPath: string) => {
    const clip = clipboardService.getClipboard();
    if (!clip?.item) return;

    const sourceItem = clip.item;
    const isCut = clip.op === 'cut';

    // Build unique duplicate name if same directory
    const extension = sourceItem.name.includes('.')
      ? '.' + sourceItem.name.split('.').pop()
      : '';
    const baseName = sourceItem.name.replace(extension, '');
    const finalName = isCut ? sourceItem.name : `${baseName}_copy${extension}`;

    // Deep clone the item with updated paths recursively
    const cloned = FileSystemService.deepCloneItem(sourceItem, targetDirectoryPath, finalName);

    // If it's a cut operation, remove original item first
    let currentTree = fileSystem;
    if (isCut) {
      const { newTree } = FileSystemService.deleteItem(currentTree, sourceItem.id);
      currentTree = newTree;
      clipboardService.clear();
    }

    // Insert into target directory
    const insertIntoTarget = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.path === targetDirectoryPath && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), cloned],
          };
        }
        if (item.children) {
          return { ...item, children: insertIntoTarget(item.children) };
        }
        return item;
      });
    };

    setFileSystem(insertIntoTarget(currentTree));
    soundEngine.playPin();
    notificationService.notify(
      'Pasted',
      `${isCut ? 'Moved' : 'Pasted'} "${finalName}" to ${targetDirectoryPath}`,
      'success'
    );
  };

  // Create default rocket file on Desktop
  const handleCreateDesktopFile = () => {
    handleCreateItem(
      '/Desktop',
      `module_${Date.now().toString().slice(-4)}.rocket`,
      'file',
      '// New Rocket module\nfn main() -> Int {\n    println("Hello from Rocket");\n    return 0;\n}\n'
    );
  };

  // Create folder on Desktop
  const handleCreateDesktopFolder = () => {
    handleCreateItem(
      '/Desktop',
      `New_Folder_${Date.now().toString().slice(-4)}`,
      'folder'
    );
  };

  // Get desktop files for the desktop surface
  const getDesktopItems = (): FSItem[] => {
    const desktopFolder =
      RocketFS.getInstance().findItemByPath('/Desktop') ||
      fileSystem[0]?.children?.find((c) => c.name === 'Desktop');
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
            onOpenFile={handleOpenFile}
            onOpenWith={(file, appId) => openApp(appId as any, { file, path: file.path })}
            onOpenTerminalAtPath={(path) => openApp('terminal', { cwd: path })}
            onCreateItem={handleCreateItem}
            onDeleteItem={handleDeleteItem}
            onRestoreTrashItem={handleRestoreTrashItem}
            onEmptyTrash={handleEmptyRecycleBin}
            onCopyItem={handleCopyItem}
            onCutItem={handleCutItem}
            onPasteItem={handlePasteItem}
            onRenameItem={handleRenameItem}
          />
        );
      case 'taskmanager':
        return (
          <TaskManagerApp
            windows={windows}
            onCloseWindow={closeWindow}
            onLaunchApp={(appId) => openApp(appId as any)}
          />
        );
      case 'paint':
        return <PaintApp initialFilePath={win.extraData?.path || win.extraData?.file?.path} />;
      case 'gallery':
        return (
          <RocketGallery
            initialFilePath={win.extraData?.path || win.extraData?.file?.path}
            onOpenInPaint={(path) => openApp('paint', { path })}
          />
        );
      case 'notes':
        return <NotesApp />;
      case 'rocket-studio':
        return <RocketStudio onLaunchApp={(appId, data) => openApp(appId as any, data)} />;
      case 'terminal':
        return (
          <TerminalApp
            fileSystem={fileSystem}
            currentPath={win.extraData?.cwd || '/home/ryan'}
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
            onUpdateSettings={handleUpdateSettings}
          />
        );
      case 'graphics':
        return <RaylibCanvasApp initialFilePath={win.extraData?.path} />;
      default:
        return <div className="p-4 text-slate-300">App content</div>;
    }
  };

  if (!isBooted) {
    return <BootSequence onBootComplete={() => setIsBooted(true)} />;
  }

  // Windows filtered for current workspace
  const visibleWindows = windows.filter(
    (w) => (w.workspaceId || 1) === currentWorkspace || w.workspaceId === 0
  );

  return (
    <div
      id="rocket-os-root"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none"
    >
      {/* Workspace Switch Transient Banner */}
      <WorkspaceSwitchBanner
        workspaceId={currentWorkspace}
        visible={showWorkspaceBanner}
      />

      {/* Desktop Surface */}
      <Desktop
        desktopFiles={getDesktopItems()}
        settings={settings}
        trashCount={trashItems.length}
        currentWorkspace={currentWorkspace}
        onOpenApp={openApp}
        onOpenFile={handleOpenFile}
        onDeleteFile={handleDeleteItem}
        onCopyFile={handleCopyItem}
        onReboot={() => setIsBooted(false)}
        onCreateDesktopFile={handleCreateDesktopFile}
        onCreateFolder={handleCreateDesktopFolder}
        onOpenTimeSettings={() => openApp('settings')}
      />

      {/* 5-App Circular Rotating Carousel Dock (Desktop furniture layered below windows) */}
      <CarouselDock
        settings={settings}
        onOpenApp={openApp}
        onOpenFile={handleOpenFile}
        onDeleteFile={handleDeleteItem}
        trashCount={trashItems.length}
        openWindows={windows}
        hasActiveWindows={visibleWindows.some((w) => !w.isMinimized)}
      />

      {/* Floating Windows (Workspace Isolated) */}
      {visibleWindows.map((win) => (
        <WindowFrame
          key={win.id}
          window={win}
          isActive={activeWindowId === win.id}
          isPinned={pinnedAppIds.includes(win.appId)}
          onTogglePin={() => handleTogglePin(win.appId)}
          onFocus={() => focusWindow(win.id)}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onToggleMaximize={() => toggleMaximizeWindow(win.id)}
          onUpdatePosition={(x, y) => updateWindowPosition(win.id, x, y)}
          onUpdateBounds={(w, h, x, y, snap) => updateWindowBounds(win.id, w, h, x, y, snap)}
          onMoveToWorkspace={(wsId) => handleMoveWindowToWorkspace(win.id, wsId)}
        >
          <AppErrorBoundary
            appId={win.appId}
            windowId={win.id}
            onCloseWindow={() => closeWindow(win.id)}
          >
            {renderWindowContent(win)}
          </AppErrorBoundary>
        </WindowFrame>
      ))}

      {/* Bottom Transparent Liquid Glass Taskbar with Workspace, Pinning, Search, Sound */}
      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        settings={settings}
        fileSystem={fileSystem}
        pinnedAppIds={pinnedAppIds}
        currentWorkspace={currentWorkspace}
        onChangeWorkspace={handleChangeWorkspace}
        onTogglePin={handleTogglePin}
        onUpdateSettings={handleUpdateSettings}
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
