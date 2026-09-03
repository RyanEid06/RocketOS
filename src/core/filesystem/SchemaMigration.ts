// SchemaMigration.ts
// Authoritative TypeScript binding implementing rocket/filesystem/migration.rocket
// Migrates legacy v1 FSItem trees to canonical v2 RocketFS Inode snapshots

import { FSItem } from '../../types';
import { PathEngine } from './PathEngine';
import { PermissionsEngine } from './PermissionsEngine';
import { RocketFSSnapshot, VFSInode } from './types';

export class SchemaMigration {
  public static isV2Snapshot(data: unknown): data is RocketFSSnapshot {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return obj.version === 2 && Array.isArray(obj.inodes);
  }

  public static migrateV1ToV2(v1Items: FSItem[]): RocketFSSnapshot {
    const inodes: VFSInode[] = [];
    const trash = [];
    let nextInode = 1;

    // Collect all legacy items recursively
    const flatLegacy: FSItem[] = [];
    function flatten(items: FSItem[]) {
      for (const item of items) {
        flatLegacy.push(item);
        if (item.children && Array.isArray(item.children)) {
          flatten(item.children);
        }
      }
    }
    flatten(v1Items);

    // Helper to map legacy path to modern Unix path
    function mapPath(p: string): string {
      const trimmed = p.trim();
      if (trimmed === '/Desktop' || trimmed.startsWith('/Desktop/')) {
        return `/home/ryan${trimmed}`;
      }
      if (trimmed === '/Documents' || trimmed.startsWith('/Documents/')) {
        return `/home/ryan${trimmed}`;
      }
      if (trimmed === '/Downloads' || trimmed.startsWith('/Downloads/')) {
        return `/home/ryan${trimmed}`;
      }
      if (trimmed === '/src' || trimmed.startsWith('/src/')) {
        return `/home/ryan/Projects/Rocket${trimmed.slice(4)}`;
      }
      if (trimmed === '/kernel' || trimmed.startsWith('/kernel/')) {
        return `/usr/src/rocketos${trimmed}`;
      }
      if (trimmed === '/drivers' || trimmed.startsWith('/drivers/')) {
        return `/etc/rocketos${trimmed}`;
      }
      if (!trimmed.startsWith('/')) {
        return `/home/ryan/${trimmed}`;
      }
      return trimmed;
    }

    // Assign inodes
    const pathToInodeMap = new Map<string, number>();

    // First ensure root / exists
    const rootInode: VFSInode = {
      inode: nextInode++,
      name: '/',
      canonicalPath: '/',
      parentInode: 1,
      nodeType: 'directory',
      uid: 0,
      gid: 0,
      mode: PermissionsEngine.DEFAULT_DIR_MODE,
      sizeBytes: 4096,
      mimeType: 'inode/directory',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      accessedAt: new Date().toISOString(),
      flags: 0,
      backend: 'vfs_disk',
      childrenInodes: [],
    };
    inodes.push(rootInode);
    pathToInodeMap.set('/', rootInode.inode);

    // Helper to ensure parent directories exist
    function ensureDirectoryExists(dirPath: string): number {
      const canonical = PathEngine.canonicalize(dirPath);
      if (pathToInodeMap.has(canonical)) {
        return pathToInodeMap.get(canonical)!;
      }

      const parentPath = PathEngine.getParentPath(canonical);
      const parentInodeId = ensureDirectoryExists(parentPath);

      const isRootHome = canonical === '/root';
      const isRyanHome = canonical === '/home/ryan';
      const isSystem = !canonical.startsWith('/home/ryan');

      const dirInode: VFSInode = {
        inode: nextInode++,
        name: PathEngine.getBasename(canonical),
        canonicalPath: canonical,
        parentInode: parentInodeId,
        nodeType: 'directory',
        uid: isSystem ? 0 : 1000,
        gid: isSystem ? 0 : 100,
        mode: isRootHome
          ? PermissionsEngine.ROOT_DIR_MODE
          : PermissionsEngine.DEFAULT_DIR_MODE,
        sizeBytes: 4096,
        mimeType: 'inode/directory',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        accessedAt: new Date().toISOString(),
        flags: 0,
        backend: 'vfs_disk',
        childrenInodes: [],
      };

      inodes.push(dirInode);
      pathToInodeMap.set(canonical, dirInode.inode);

      // Add as child to parent
      const parentNode = inodes.find((i) => i.inode === parentInodeId);
      if (parentNode && parentNode.childrenInodes) {
        parentNode.childrenInodes.push(dirInode.inode);
      }

      return dirInode.inode;
    }

    // Now migrate each flat item
    for (const item of flatLegacy) {
      const newPath = mapPath(item.path);
      const parentPath = PathEngine.getParentPath(newPath);
      const parentInodeId = ensureDirectoryExists(parentPath);

      if (item.type === 'folder') {
        ensureDirectoryExists(newPath);
      } else {
        const isSystem = !newPath.startsWith('/home/ryan');
        const content = item.content ?? '';
        const sizeBytes = content ? new TextEncoder().encode(content).length : 0;

        const fileInode: VFSInode = {
          inode: nextInode++,
          name: item.name,
          canonicalPath: newPath,
          parentInode: parentInodeId,
          nodeType: 'file',
          uid: isSystem ? 0 : 1000,
          gid: isSystem ? 0 : 100,
          mode: PermissionsEngine.DEFAULT_FILE_MODE,
          sizeBytes,
          mimeType: 'text/plain',
          createdAt: item.updatedAt || new Date().toISOString(),
          modifiedAt: item.updatedAt || new Date().toISOString(),
          accessedAt: item.updatedAt || new Date().toISOString(),
          flags: 0,
          backend: 'vfs_disk',
          content,
        };

        inodes.push(fileInode);
        pathToInodeMap.set(newPath, fileInode.inode);

        const parentNode = inodes.find((i) => i.inode === parentInodeId);
        if (parentNode && parentNode.childrenInodes) {
          if (!parentNode.childrenInodes.includes(fileInode.inode)) {
            parentNode.childrenInodes.push(fileInode.inode);
          }
        }
      }
    }

    return {
      version: 2,
      nextInode,
      inodes,
      trash,
    };
  }
}
