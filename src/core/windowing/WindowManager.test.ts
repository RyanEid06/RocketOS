import { describe, it, expect, beforeEach } from 'vitest';
import { WindowManager } from './WindowManager';

describe('WindowManager', () => {
  let wm: WindowManager;

  beforeEach(() => {
    wm = new WindowManager();
  });

  it('opens a new window and assigns appropriate zIndex', () => {
    const win = wm.openWindow('notes', 'Notes', '📝', { width: 500, height: 400 });
    expect(win.appId).toBe('notes');
    expect(win.title).toBe('Notes');
    expect(win.zIndex).toBeGreaterThan(0);
    expect(wm.getActiveWindowId()).toBe(win.id);
  });

  it('brings window to front when focused', () => {
    const win1 = wm.openWindow('notes', 'Notes', '📝');
    const win2 = wm.openWindow('editor', 'Editor', '📄');

    expect(wm.getActiveWindowId()).toBe(win2.id);

    wm.focusWindow(win1.id);
    expect(wm.getActiveWindowId()).toBe(win1.id);
    expect(wm.getWindow(win1.id)?.zIndex).toBeGreaterThan(wm.getWindow(win2.id)!.zIndex);
  });

  it('minimizes and restores windows', () => {
    const win = wm.openWindow('notes', 'Notes', '📝');
    expect(win.isMinimized).toBe(false);

    wm.minimizeWindow(win.id);
    expect(wm.getWindow(win.id)?.isMinimized).toBe(true);

    wm.restoreWindow(win.id);
    expect(wm.getWindow(win.id)?.isMinimized).toBe(false);
  });

  it('switches workspaces and filters windows by workspace', () => {
    const win1 = wm.openWindow('notes', 'Notes 1', '📝', undefined, undefined, 1);
    const win2 = wm.openWindow('editor', 'Editor 2', '📄', undefined, undefined, 2);

    expect(wm.getWindowsForWorkspace(1).map((w) => w.id)).toContain(win1.id);
    expect(wm.getWindowsForWorkspace(1).map((w) => w.id)).not.toContain(win2.id);

    wm.setActiveWorkspace(2);
    expect(wm.getActiveWorkspace()).toBe(2);
    expect(wm.getWindowsForWorkspace(2).map((w) => w.id)).toContain(win2.id);
  });

  it('moves window to another workspace', () => {
    const win = wm.openWindow('notes', 'Notes', '📝', undefined, undefined, 1);
    wm.moveWindowToWorkspace(win.id, 3);
    expect(wm.getWindow(win.id)?.workspaceId).toBe(3);
  });

  it('toggles maximize state and snaps bounds', () => {
    const win = wm.openWindow('notes', 'Notes', '📝');
    expect(win.isMaximized).toBe(false);

    wm.toggleMaximize(win.id);
    expect(wm.getWindow(win.id)?.isMaximized).toBe(true);

    wm.snapWindow(win.id, 'left');
    expect(wm.getWindow(win.id)?.snapState).toBe('left');
  });
});
