// RocketOS Virtual Filesystem Types
// Mirror of rocket/filesystem/types.rocket, rocket/users/user.rocket, and rocket/filesystem/associations.rocket

export type VFSNodeType = 'file' | 'directory' | 'symlink' | 'device' | 'virtual';

export type VFSStorageBackend = 'vfs_disk' | 'proc' | 'sys' | 'dev' | 'trash';

export type VFSErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'NOT_A_DIRECTORY'
  | 'IS_A_DIRECTORY'
  | 'DIRECTORY_NOT_EMPTY'
  | 'INVALID_PATH'
  | 'READ_ONLY'
  | 'NO_SPACE'
  | 'INVALID_OPERATION';

export interface Permissions {
  ownerRead: boolean;
  ownerWrite: boolean;
  ownerExec: boolean;
  groupRead: boolean;
  groupWrite: boolean;
  groupExec: boolean;
  otherRead: boolean;
  otherWrite: boolean;
  otherExec: boolean;
  rawMode: number;
}

export interface VFSInode {
  inode: number;
  name: string;
  canonicalPath: string;
  parentInode: number;
  nodeType: VFSNodeType;
  uid: number;
  gid: number;
  mode: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  flags: number;
  backend: VFSStorageBackend;
  content?: string;
  childrenInodes?: number[];
  virtualGenerator?: () => string;
}

export interface VFSStat {
  inode: number;
  name: string;
  path: string;
  nodeType: VFSNodeType;
  uid: number;
  gid: number;
  mode: number;
  modeFormatted: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  backend: VFSStorageBackend;
  isReadOnly: boolean;
}

export interface TrashRecord {
  trashId: string;
  inodeSnapshot: VFSInode;
  originalPath: string;
  deletedAt: string;
  originalUid: number;
  originalGid: number;
  originalMode: number;
}

export interface SystemUser {
  uid: number;
  username: string;
  displayName: string;
  homeDirectory: string;
  primaryGid: number;
  supplementaryGids: number[];
  shell: string;
  isAdmin: boolean;
}

export interface SystemGroup {
  gid: number;
  name: string;
  description: string;
}

export interface FileAssociation {
  extension: string;
  mimeType: string;
  defaultAppId: string;
  associatedAppIds: string[];
  friendlyName: string;
}

export interface VFSResult<T> {
  success: boolean;
  data?: T;
  error?: VFSErrorCode;
  message?: string;
}

export interface RocketFSSnapshot {
  version: 2;
  nextInode: number;
  inodes: VFSInode[];
  trash: TrashRecord[];
}
