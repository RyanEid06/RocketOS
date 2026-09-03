// workspaces.ts
// Virtual desktop workspace profiles

export interface CoreWorkspaceProfile {
  id: number;
  name: string;
  category: 'general' | 'developer' | 'art' | 'custom';
  description: string;
  wallpaperId: string;
  themeAccent: string;
  allowedAppCategories: string[];
  pinnedAppIds: string[];
  rules: {
    restrictAppsToCategory: boolean;
    autoTiling: boolean;
    isolateClipboard: boolean;
  };
}
