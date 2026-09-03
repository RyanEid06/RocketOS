// apps.ts
// Application metadata types

export type AppCategory = 'system' | 'developer' | 'productivity' | 'media' | 'utilities';

export interface CoreAppMetadata {
  id: string;
  displayName: string;
  description: string;
  glyph: string;
  category: AppCategory;
  isSingleton: boolean;
  defaultBounds: { width: number; height: number };
  minBounds: { width: number; height: number };
  supportedExtensions: string[];
  keywords: string[];
  executablePath?: string;
  version: string;
}
