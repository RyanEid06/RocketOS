// CoreProvider.ts
// Authoritative CoreProvider interface representing the operating system services the UI may request

import { SystemManifestInfo, PlatformCapabilities, SystemStatusInfo } from './types/system';
import { CoreFileStat, CoreDirEntry, CoreSearchOptions, CoreSearchResult, CoreFileAssociation } from './types/fs';
import { CoreUser, CoreGroup } from './types/users';
import { CoreProcess } from './types/processes';
import { CoreService } from './types/services';
import { CoreShellExecutionResult, CoreShellAst } from './types/shell';
import { CoreAppMetadata } from './types/apps';
import { CoreWorkspaceProfile } from './types/workspaces';
import { CoreDiagnostics } from './types/diagnostics';

export interface ICoreSystemAPI {
  getManifest(): Promise<SystemManifestInfo>;
  getCapabilities(): Promise<PlatformCapabilities>;
  getStatus(): Promise<SystemStatusInfo>;
}

export interface ICoreFileSystemAPI {
  stat(path: string): Promise<CoreFileStat>;
  list(path: string): Promise<CoreDirEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  createFile(path: string, content?: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copy(srcPath: string, dstPath: string): Promise<void>;
  move(srcPath: string, dstPath: string): Promise<void>;
  remove(path: string, recursive?: boolean): Promise<void>;
  trash(path: string): Promise<string>;
  restore(trashId: string): Promise<void>;
  search(query: string, options?: CoreSearchOptions): Promise<CoreSearchResult[]>;
}

export interface ICoreUsersAPI {
  current(): Promise<CoreUser>;
  list(): Promise<CoreUser[]>;
  groups(): Promise<CoreGroup[]>;
  checkPermission(path: string, mode: 'read' | 'write' | 'execute'): Promise<boolean>;
}

export interface ICoreProcessesAPI {
  list(): Promise<CoreProcess[]>;
  get(pid: number): Promise<CoreProcess | null>;
  launch(appId: string, name?: string, commandLine?: string): Promise<CoreProcess>;
  terminate(pid: number): Promise<boolean>;
}

export interface ICoreServicesAPI {
  list(): Promise<CoreService[]>;
  status(name: string): Promise<CoreService | null>;
  start(name: string): Promise<boolean>;
  stop(name: string): Promise<boolean>;
  restart(name: string): Promise<boolean>;
}

export interface ICoreShellAPI {
  execute(commandLine: string, env?: Record<string, string>): Promise<CoreShellExecutionResult>;
  complete(line: string): Promise<string[]>;
  parse(commandLine: string): Promise<CoreShellAst>;
}

export interface ICoreSearchAPI {
  query(keyword: string): Promise<CoreSearchResult[]>;
}

export interface ICoreAppsAPI {
  list(): Promise<CoreAppMetadata[]>;
  get(id: string): Promise<CoreAppMetadata | null>;
  fileAssociations(): Promise<CoreFileAssociation[]>;
}

export interface ICoreWorkspacesAPI {
  list(): Promise<CoreWorkspaceProfile[]>;
  getProfile(id: number): Promise<CoreWorkspaceProfile | null>;
}

export interface ICoreProvider {
  readonly providerType: 'rocket-core' | 'browser-fallback';
  readonly providerName: string;
  readonly isConnected: boolean;

  readonly system: ICoreSystemAPI;
  readonly fs: ICoreFileSystemAPI;
  readonly users: ICoreUsersAPI;
  readonly processes: ICoreProcessesAPI;
  readonly services: ICoreServicesAPI;
  readonly shell: ICoreShellAPI;
  readonly search: ICoreSearchAPI;
  readonly apps: ICoreAppsAPI;
  readonly workspaces: ICoreWorkspacesAPI;

  getDiagnostics(): Promise<CoreDiagnostics>;
}
