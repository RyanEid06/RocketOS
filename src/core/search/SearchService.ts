// SearchService.ts
// Universal search service recursively indexing apps, files, folders, and settings

import { FSItem } from '../../types';
import { AppRegistry, AppDefinition } from '../apps/AppRegistry';
import { FileSystemService } from '../filesystem/FileSystemService';

export interface SettingSearchResult {
  id: string;
  title: string;
  category: string;
  description: string;
  action: () => void;
}

export interface UniversalSearchResults {
  apps: AppDefinition[];
  folders: FSItem[];
  files: FSItem[];
  settings: SettingSearchResult[];
}

export class SearchService {
  private static instance: SearchService | null = null;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public search(
    query: string,
    fileSystem: FSItem[],
    onOpenSettings?: () => void
  ): UniversalSearchResults {
    const q = query.trim().toLowerCase();

    if (!q) {
      return {
        apps: AppRegistry.getAllApps().slice(0, 6),
        folders: FileSystemService.recursiveSearch(fileSystem, '', 'folders').slice(0, 4),
        files: FileSystemService.recursiveSearch(fileSystem, '', 'files').slice(0, 5),
        settings: [],
      };
    }

    // 1. Applications search via AppRegistry
    const matchedApps = AppRegistry.searchApps(q);

    // 2. Recursive VFS search for folders
    const matchedFolders = FileSystemService.recursiveSearch(fileSystem, q, 'folders');

    // 3. Recursive VFS search for files (including inside content)
    const matchedFiles = FileSystemService.recursiveSearch(fileSystem, q, 'files');

    // 4. Quick settings & system actions search
    const settingItems: SettingSearchResult[] = [
      {
        id: 'set-wallpaper',
        title: 'Change Wallpaper',
        category: 'Personalization',
        description: 'Choose from 8 liquid glass desktop wallpapers',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-accent',
        title: 'Accent Color',
        category: 'Personalization',
        description: 'Change theme accents (Sky, Emerald, Indigo, Amber, Rose)',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-sound',
        title: 'Audio & Master Volume',
        category: 'Sound',
        description: 'Adjust master volume slider, mute controls, and system chimes',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-clock',
        title: 'Clock & Time Format',
        category: 'Time & Language',
        description: 'Toggle 12-hour or 24-hour clock and seconds display',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-nightlight',
        title: 'Night Light (Warm Screen Filter)',
        category: 'Display',
        description: 'Reduce blue light with warm 3400K display filter',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-motion',
        title: 'Reduced Motion',
        category: 'Accessibility',
        description: 'Minimize window and carousel dock transitions for comfort',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-contrast',
        title: 'High Contrast Mode',
        category: 'Accessibility',
        description: 'Boost window borders and text visibility',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-scale',
        title: 'Display & UI Scale',
        category: 'Display',
        description: 'Scale interface elements between 90%, 100%, 110%, 125%',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-transparency',
        title: 'Liquid Glass Transparency',
        category: 'Personalization',
        description: 'Enable or disable translucent background blur effects',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-processes',
        title: 'Task Manager / Kill Processes',
        category: 'Diagnostics',
        description: 'View active PID processes, CPU usage, and memory',
        action: () => onOpenSettings?.(),
      },
      {
        id: 'set-developer',
        title: 'Rocket Language Compiler & AST',
        category: 'Developer',
        description: 'Rocket Studio v1.0 syntax inspection and build output',
        action: () => onOpenSettings?.(),
      },
    ];

    const matchedSettings = settingItems.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );

    return {
      apps: matchedApps,
      folders: matchedFolders,
      files: matchedFiles,
      settings: matchedSettings,
    };
  }
}

export const searchService = SearchService.getInstance();
