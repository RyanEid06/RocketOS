// fs.ts
// Filesystem types for CoreProvider

export type CoreNodeType = 'file' | 'directory' | 'symlink';

export interface CoreFileStat {
  id: string;
  name: string;
  path: string;
  type: CoreNodeType;
  sizeBytes: number;
  createdAt: number;
  modifiedAt: number;
  uid: number;
  gid: number;
  permissions: string; // e.g. "0755" or "rwxr-xr-x"
  isReadOnly?: boolean;
  isSystemNode?: boolean;
}

export interface CoreDirEntry {
  id: string;
  name: string;
  path: string;
  type: CoreNodeType;
  sizeBytes: number;
  modifiedAt: number;
}

export interface CoreSearchOptions {
  recursive?: boolean;
  maxResults?: number;
  typeFilter?: CoreNodeType;
  targetDirectory?: string;
}

export interface CoreSearchResult {
  id: string;
  name: string;
  path: string;
  type: CoreNodeType;
  snippet?: string;
  score: number;
  matchType: 'exact' | 'prefix' | 'fuzzy' | 'content';
}

export interface CoreFileAssociation {
  extension: string;
  defaultAppId: string;
  associatedAppIds: string[];
  mimeType: string;
  description: string;
}
