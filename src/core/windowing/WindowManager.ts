// WindowManager.ts
// Pure state machine managing window lifecycle, z-order, workspaces, and snapping

import { WindowState, AppId } from '../../types';
import { AppRegistry } from '../apps/AppRegistry';
import { persistenceProvider } from '../../platform/browser/BrowserPersistenceProvider';
import { PERSISTENCE_KEYS } from '../persistence/PersistenceProvider';
import { soundEngine } from '../../utils/audio';

export type WindowManagerListener = (windows: WindowState[], activeId: string | null, workspace: number) => void;

export class WindowManager {
  private static instance: WindowManager | null = null;

  private windows: WindowState[] = [];
  private activeWindowId: string | null = null;
  private highestZIndex = 10;
  private currentWorkspace = 1;
  private windowsBeforeShowDesktop: string[] | null = null;
  private listeners: Set<WindowManagerListener> = new Set();
  private isLoaded = false;

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public async init(defaultWindows?: WindowState[]): Promise<void> {
    if (!this.isLoaded) {
      try {
        const savedSession = await persistenceProvider.getItem<{
          windows: WindowState[];
          activeWindowId: string | null;
          currentWorkspace: number;
        }>(PERSISTENCE_KEYS.WINDOW_SESSION);

        if (savedSession && Array.isArray(savedSession.windows) && savedSession.windows.length > 0) {
          this.windows = savedSession.windows;
          this.activeWindowId = savedSession.activeWindowId;
          this.currentWorkspace = savedSession.currentWorkspace || 1;
          this.highestZIndex = Math.max(10, ...this.windows.map((w) => w.zIndex || 10));
        } else if (defaultWindows) {
          this.windows = defaultWindows;
          this.activeWindowId = defaultWindows[0]?.id || null;
          this.highestZIndex = Math.max(10, ...this.windows.map((w) => w.zIndex || 10));
        }
      } catch {
        if (defaultWindows) this.windows = defaultWindows;
      }
      this.isLoaded = true;
      this.notifyListeners();
    }
  }

  public getWindows(): WindowState[] {
    return [...this.windows];
  }

  public getActiveWindowId(): string | null {
    return this.activeWindowId;
  }

  public getCurrentWorkspace(): number {
    return this.currentWorkspace;
  }

  // Returns windows that belong to the current workspace
  public getVisibleWindowsForWorkspace(workspaceId = this.currentWorkspace): WindowState[] {
    return this.windows.filter((w) => (w.workspaceId || 1) === workspaceId || w.workspaceId === 0);
  }

  public openApp(appId: AppId, extraData?: Record<string, any>): string {
    // Route pseudo-apps to explorer
    if (appId === 'thispc') {
      return this.openApp('explorer', { path: '/ThisPC' });
    }
    if (appId === 'trash') {
      return this.openApp('explorer', { path: '/Trash' });
    }

    const appDef = AppRegistry.getApp(appId);

    // Singleton check: if already open and no distinct path requested, focus it
    if (appDef.isSingleton || (!extraData?.path && !extraData?.file)) {
      const existing = this.windows.find((w) => w.appId === appId);
      if (existing) {
        if (existing.isMinimized) {
          existing.isMinimized = false;
        }
        // If window is in another workspace, switch or pull it over
        if (existing.workspaceId && existing.workspaceId !== this.currentWorkspace) {
          existing.workspaceId = this.currentWorkspace;
        }
        this.focusWindow(existing.id);
        soundEngine.playOpen();
        return existing.id;
      }
    }

    const newId = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextZ = ++this.highestZIndex;

    let title = appDef.displayName;
    let icon = appDef.glyph;
    let width = appDef.constraints.defaultWidth;
    let height = appDef.constraints.defaultHeight;

    if (appId === 'explorer') {
      const p = extraData?.path || '/Desktop';
      title = p === '/ThisPC' ? 'This PC' : p === '/Trash' ? 'Recycle Bin' : `File Explorer - ${p}`;
      icon = p === '/Trash' ? '🗑️' : p === '/ThisPC' ? '💻' : '📁';
    }

    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const posX = Math.min(screenW - width - 20, Math.max(20, 60 + (this.windows.length * 28) % 220));
    const posY = Math.min(screenH - height - 70, Math.max(20, 40 + (this.windows.length * 28) % 180));

    const newWindow: WindowState = {
      id: newId,
      appId,
      title,
      icon,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZ,
      workspaceId: this.currentWorkspace,
      position: { x: posX, y: posY },
      size: { width, height },
      extraData,
    };

    this.windows.push(newWindow);
    this.activeWindowId = newId;
    soundEngine.playOpen();
    this.notifyListeners();
    this.persist();
    return newId;
  }

  public focusWindow(id: string): void {
    const win = this.windows.find((w) => w.id === id);
    if (!win) return;

    this.activeWindowId = id;
    this.highestZIndex += 1;
    win.zIndex = this.highestZIndex;
    win.isMinimized = false;
    this.notifyListeners();
    this.persist();
  }

  public closeWindow(id: string): void {
    this.windows = this.windows.filter((w) => w.id !== id);
    if (this.activeWindowId === id) {
      // Focus highest remaining window in workspace
      const remainingInWs = this.getVisibleWindowsForWorkspace().filter((w) => !w.isMinimized);
      if (remainingInWs.length > 0) {
        remainingInWs.sort((a, b) => b.zIndex - a.zIndex);
        this.activeWindowId = remainingInWs[0].id;
      } else {
        this.activeWindowId = null;
      }
    }
    this.notifyListeners();
    this.persist();
  }

  public minimizeWindow(id: string): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.isMinimized = true;
      if (this.activeWindowId === id) {
        const remainingInWs = this.getVisibleWindowsForWorkspace().filter((w) => !w.isMinimized);
        if (remainingInWs.length > 0) {
          remainingInWs.sort((a, b) => b.zIndex - a.zIndex);
          this.activeWindowId = remainingInWs[0].id;
        } else {
          this.activeWindowId = null;
        }
      }
      soundEngine.playMinimize();
      this.notifyListeners();
      this.persist();
    }
  }

  public toggleMaximizeWindow(id: string): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.isMaximized = !win.isMaximized;
      if (!win.isMaximized) {
        soundEngine.playRestore();
      } else {
        soundEngine.playSnap();
      }
      this.focusWindow(id);
    }
  }

  public toggleMaximize(id: string): void {
    this.toggleMaximizeWindow(id);
  }

  public restoreWindow(id: string): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.isMinimized = false;
      this.focusWindow(id);
    }
  }

  public snapWindow(id: string, snapState: 'left' | 'right' | 'none'): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.snapState = snapState;
      this.notifyListeners();
      this.persist();
    }
  }

  public updatePosition(id: string, x: number, y: number): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.position = { x, y };
      this.notifyListeners();
      this.persist();
    }
  }

  public updateBounds(
    id: string,
    width: number,
    height: number,
    x: number,
    y: number,
    snapState: 'left' | 'right' | 'none' = 'none'
  ): void {
    const win = this.windows.find((w) => w.id === id);
    if (win) {
      win.size = { width, height };
      win.position = { x, y };
      win.snapState = snapState;
      win.isMaximized = false;
      this.notifyListeners();
      this.persist();
    }
  }

  public switchWorkspace(workspaceId: number): void {
    if (this.currentWorkspace === workspaceId) return;
    this.currentWorkspace = workspaceId;
    soundEngine.playWorkspaceSwitch();

    // Check if current active window is visible in new workspace
    const activeWin = this.windows.find((w) => w.id === this.activeWindowId);
    if (activeWin && (activeWin.workspaceId || 1) !== workspaceId && activeWin.workspaceId !== 0) {
      const candidates = this.getVisibleWindowsForWorkspace(workspaceId).filter((w) => !w.isMinimized);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.zIndex - a.zIndex);
        this.activeWindowId = candidates[0].id;
      } else {
        this.activeWindowId = null;
      }
    }
    this.notifyListeners();
    this.persist();
  }

  public setActiveWorkspace(workspaceId: number): void {
    this.switchWorkspace(workspaceId);
  }

  public moveWindowToWorkspace(winId: string, workspaceId: number): void {
    const win = this.windows.find((w) => w.id === winId);
    if (win) {
      win.workspaceId = workspaceId;
      this.notifyListeners();
      this.persist();
    }
  }

  public toggleShowDesktop(): void {
    const wsWindows = this.getVisibleWindowsForWorkspace();
    const allMinimized = wsWindows.length > 0 && wsWindows.every((w) => w.isMinimized);

    if (allMinimized && this.windowsBeforeShowDesktop) {
      this.windows = this.windows.map((w) =>
        this.windowsBeforeShowDesktop!.includes(w.id) ? { ...w, isMinimized: false } : w
      );
      this.windowsBeforeShowDesktop = null;
      soundEngine.playRestore();
    } else {
      const activeIds = wsWindows.filter((w) => !w.isMinimized).map((w) => w.id);
      this.windowsBeforeShowDesktop = activeIds;
      this.windows = this.windows.map((w) =>
        wsWindows.some((ws) => ws.id === w.id) ? { ...w, isMinimized: true } : w
      );
      this.activeWindowId = null;
      soundEngine.playMinimize();
    }
    this.notifyListeners();
    this.persist();
  }

  public subscribe(listener: WindowManagerListener): () => void {
    this.listeners.add(listener);
    listener(this.windows, this.activeWindowId, this.currentWorkspace);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getWindow(id: string): WindowState | undefined {
    return this.windows.find((w) => w.id === id);
  }

  public getActiveWorkspace(): number {
    return this.currentWorkspace;
  }

  public getWindowsForWorkspace(workspaceId: number): WindowState[] {
    return this.getVisibleWindowsForWorkspace(workspaceId);
  }

  public openWindow(
    appId: AppId,
    title?: string,
    icon?: string,
    size?: { width: number; height: number },
    position?: { x: number; y: number },
    workspaceId = this.currentWorkspace,
    extraData?: Record<string, any>
  ): WindowState {
    const appDef = AppRegistry.getApp(appId);
    const newId = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextZ = ++this.highestZIndex;

    const newWindow: WindowState = {
      id: newId,
      appId,
      title: title || appDef.displayName,
      icon: icon || appDef.glyph,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZ,
      workspaceId,
      position: position || { x: 50, y: 50 },
      size: size || {
        width: appDef.constraints.defaultWidth,
        height: appDef.constraints.defaultHeight,
      },
      extraData,
    };

    this.windows.push(newWindow);
    this.activeWindowId = newId;
    this.notifyListeners();
    this.persist();
    return newWindow;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.windows, this.activeWindowId, this.currentWorkspace);
      } catch {}
    }
  }

  private persist(): void {
    persistenceProvider
      .setItem(PERSISTENCE_KEYS.WINDOW_SESSION, {
        windows: this.windows,
        activeWindowId: this.activeWindowId,
        currentWorkspace: this.currentWorkspace,
      })
      .catch(() => {});
  }
}

export const windowManager = WindowManager.getInstance();
