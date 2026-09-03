// TrashSubsystem.ts
// Authoritative TypeScript binding implementing rocket/filesystem/vfs.rocket trash lifecycle

import { PathEngine } from './PathEngine';
import { TrashRecord, VFSInode, VFSResult } from './types';
import { PermissionsEngine } from './PermissionsEngine';
import { UserManager } from '../users/UserManager';
import { TrashItem } from '../../types';

export class TrashSubsystem {
  private records: Map<string, TrashRecord> = new Map();
  private listeners: Set<(items: TrashRecord[]) => void> = new Set();

  constructor(initialRecords: TrashRecord[] = []) {
    for (const r of initialRecords) {
      this.records.set(r.trashId, r);
    }
  }

  public listTrash(): TrashItem[] {
    return this.getItems().map((r) => ({
      id: r.trashId,
      item: {
        id: `inode_${r.inodeSnapshot.inode}`,
        name: r.inodeSnapshot.name,
        type: (r.inodeSnapshot.nodeType === 'directory' ? 'folder' : 'file') as 'folder' | 'file',
        path: r.originalPath,
        content: r.inodeSnapshot.content,
        size: `${Math.ceil(r.inodeSnapshot.sizeBytes / 1024)} KB`,
        updatedAt: r.deletedAt,
        modified: r.deletedAt,
        permissions: PermissionsEngine.formatMode(
          r.originalMode,
          r.inodeSnapshot.nodeType === 'directory'
        ),
        owner: UserManager.getInstance().getUser(r.originalUid)?.username || 'ryan',
        group: UserManager.getInstance().getGroup(r.originalGid)?.name || 'users',
        rawMode: r.originalMode,
        uid: r.originalUid,
        gid: r.originalGid,
      },
      originalPath: r.originalPath,
      deletedAt: r.deletedAt,
    }));
  }

  public getItems(): TrashRecord[] {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  public getRecord(trashId: string): TrashRecord | undefined {
    return this.records.get(trashId);
  }

  public createTrashRecord(inode: VFSInode): TrashRecord {
    const record: TrashRecord = {
      trashId: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      inodeSnapshot: { ...inode },
      originalPath: inode.canonicalPath,
      deletedAt: new Date().toISOString(),
      originalUid: inode.uid,
      originalGid: inode.gid,
      originalMode: inode.mode,
    };

    this.records.set(record.trashId, record);
    this.notify();
    return record;
  }

  public removeRecord(trashId: string): boolean {
    const deleted = this.records.delete(trashId);
    if (deleted) this.notify();
    return deleted;
  }

  public emptyTrash(): void {
    this.records.clear();
    this.notify();
  }

  /**
   * Generates a conflict-safe path if a file already exists at the target path.
   * e.g. /home/ryan/Desktop/notes (1).txt
   */
  public generateConflictSafePath(existingPaths: Set<string>, targetPath: string): string {
    if (!existingPaths.has(targetPath)) {
      return targetPath;
    }

    const parent = PathEngine.getParentPath(targetPath);
    const basename = PathEngine.getBasename(targetPath);
    const ext = PathEngine.getExtension(basename);
    const nameWithoutExt = ext ? basename.slice(0, -ext.length) : basename;

    for (let counter = 1; counter < 1000; counter++) {
      const candidateName = `${nameWithoutExt} (${counter})${ext}`;
      const candidatePath = parent === '/' ? `/${candidateName}` : `${parent}/${candidateName}`;
      if (!existingPaths.has(candidatePath)) {
        return candidatePath;
      }
    }

    return `${targetPath}.restored_${Date.now()}`;
  }

  public subscribe(fn: (items: TrashRecord[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    const items = this.getItems();
    for (const fn of this.listeners) {
      try {
        fn(items);
      } catch {}
    }
  }
}
