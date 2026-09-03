/**
 * RocketOS Purpose-Built Workspace Profiles & Domain Logic
 * Directly aligned with rocket/shell/workspace_rules.rocket
 */

import { AppId } from '../../types';

export interface WorkspaceShortcutItem {
  id: string;
  title: string;
  appId: AppId;
  extraData?: Record<string, any>;
  sub: string;
  iconName: string;
}

export interface WorkspaceProfile {
  id: number;
  name: string;
  subtitle: string;
  iconName: string;
  shortcuts: WorkspaceShortcutItem[];
}

export const SYSTEM_SHORTCUTS_POOL: WorkspaceShortcutItem[] = [
  {
    id: 'app-thispc',
    title: 'This PC',
    appId: 'explorer',
    extraData: { path: '/ThisPC' },
    sub: 'Storage & Specs',
    iconName: 'HardDrive',
  },
  {
    id: 'app-explorer',
    title: 'File Explorer',
    appId: 'explorer',
    extraData: { path: '/Desktop' },
    sub: 'Browse Files',
    iconName: 'Folder',
  },
  {
    id: 'app-trash',
    title: 'Recycle Bin',
    appId: 'explorer',
    extraData: { path: '/Trash' },
    sub: 'Deleted Items',
    iconName: 'Trash2',
  },
  {
    id: 'app-notes',
    title: 'Notes & To-Do',
    appId: 'notes',
    sub: 'Checklists',
    iconName: 'ListTodo',
  },
  {
    id: 'app-settings',
    title: 'Settings',
    appId: 'settings',
    sub: 'Personalization',
    iconName: 'SettingsIcon',
  },
];

export const WORKSPACE_DEFAULTS: Record<number, { name: string; subtitle: string; iconName: string; shortcuts: WorkspaceShortcutItem[] }> = {
  1: {
    name: 'General System',
    subtitle: 'Primary system & everyday utilities',
    iconName: 'Layers',
    shortcuts: [],
  },
  2: {
    name: 'Development & Code',
    subtitle: 'Developer workstation & source repositories',
    iconName: 'Terminal',
    shortcuts: [
      {
        id: 'app-rocket-studio',
        title: 'Rocket Studio',
        appId: 'rocket-studio',
        sub: 'IDE & Compiler',
        iconName: 'Code2',
      },
      {
        id: 'app-editor',
        title: 'Rocket Editor',
        appId: 'editor',
        sub: 'rEdit Studio',
        iconName: 'Edit3',
      },
      {
        id: 'app-terminal',
        title: 'Terminal',
        appId: 'terminal',
        sub: 'rsh v2.0 CLI',
        iconName: 'Terminal',
      },
      {
        id: 'app-projects',
        title: 'Rocket Projects',
        appId: 'explorer',
        extraData: { path: '/home/ryan/Projects/Rocket' },
        sub: 'Source Repos',
        iconName: 'FolderCode',
      },
      {
        id: 'app-taskmanager',
        title: 'Task Manager',
        appId: 'taskmanager',
        sub: 'Processes & CPU',
        iconName: 'Activity',
      },
    ],
  },
  3: {
    name: 'Design & Art',
    subtitle: 'Creative studio & visual media',
    iconName: 'Paintbrush',
    shortcuts: [
      {
        id: 'app-paint',
        title: 'Rocket Paint',
        appId: 'paint',
        sub: 'Canvas Draw',
        iconName: 'Paintbrush',
      },
      {
        id: 'app-gallery',
        title: 'Rocket Gallery',
        appId: 'gallery',
        extraData: { path: '/home/ryan/Pictures' },
        sub: 'Image Viewer',
        iconName: 'ImageIcon',
      },
      {
        id: 'app-graphics',
        title: 'Graphics Engine',
        appId: 'graphics',
        sub: 'Orbit Physics',
        iconName: 'Rocket',
      },
      {
        id: 'app-pictures',
        title: 'Pictures Folder',
        appId: 'explorer',
        extraData: { path: '/home/ryan/Pictures' },
        sub: 'Artwork Library',
        iconName: 'FolderImage',
      },
    ],
  },
};

const STORAGE_KEY_PREFIX = 'rocket_workspace_shortcuts_';

export class WorkspaceRulesManager {
  private static instance: WorkspaceRulesManager;

  public static getInstance(): WorkspaceRulesManager {
    if (!WorkspaceRulesManager.instance) {
      WorkspaceRulesManager.instance = new WorkspaceRulesManager();
    }
    return WorkspaceRulesManager.instance;
  }

  /**
   * Retrieves the configured shortcuts for a specific workspace, falling back to defaults
   */
  public getShortcutsForWorkspace(workspaceId: number): WorkspaceShortcutItem[] {
    if (workspaceId === 1) {
      // Desktop 1 is intentionally kept clean without default left-column system shortcuts
      return [];
    }

    const config = WORKSPACE_DEFAULTS[workspaceId] || WORKSPACE_DEFAULTS[1];
    if (typeof window === 'undefined' || !window.localStorage) {
      return [...config.shortcuts];
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
      if (!stored) {
        return [...config.shortcuts];
      }
      const parsedIds: string[] = JSON.parse(stored);
      if (!Array.isArray(parsedIds) || parsedIds.length === 0) {
        return [...config.shortcuts];
      }

      // Resolve shortcut objects from known pool
      const pool = this.getAllKnownShortcuts();
      const resolved: WorkspaceShortcutItem[] = [];
      for (const id of parsedIds) {
        const found = pool.find((s) => s.id === id);
        if (found) {
          resolved.push(found);
        }
      }
      return resolved.length > 0 ? resolved : [...config.shortcuts];
    } catch {
      return [...config.shortcuts];
    }
  }

  /**
   * Persists customized shortcut list for a workspace
   */
  public saveShortcutsForWorkspace(workspaceId: number, shortcutIds: string[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${workspaceId}`, JSON.stringify(shortcutIds));
    } catch {
      // Ignore storage write errors
    }
  }

  /**
   * Resets a workspace to its factory default profile
   */
  public resetWorkspaceToDefault(workspaceId: number): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Returns complete WorkspaceProfile for the specified ID
   */
  public getProfile(workspaceId: number): WorkspaceProfile {
    const config = WORKSPACE_DEFAULTS[workspaceId] || WORKSPACE_DEFAULTS[1];
    return {
      id: workspaceId,
      name: config.name,
      subtitle: config.subtitle,
      iconName: config.iconName,
      shortcuts: this.getShortcutsForWorkspace(workspaceId),
    };
  }

  /**
   * Pool of all known shortcuts across all workspaces
   */
  public getAllKnownShortcuts(): WorkspaceShortcutItem[] {
    const map = new Map<string, WorkspaceShortcutItem>();
    SYSTEM_SHORTCUTS_POOL.forEach((s) => map.set(s.id, s));
    Object.values(WORKSPACE_DEFAULTS).forEach((w) => {
      w.shortcuts.forEach((s) => map.set(s.id, s));
    });
    return Array.from(map.values());
  }
}
