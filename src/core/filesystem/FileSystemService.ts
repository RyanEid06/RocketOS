// FileSystemService.ts
// Bridge between React UI components and the authoritative RocketFS engine

import { FSItem } from '../../types';
import { PathEngine } from './PathEngine';
import { RocketFS } from './RocketFS';

export interface FileOperationResult {
  success: boolean;
  message?: string;
  item?: FSItem;
}

export class FileSystemService {
  public static normalizePath(rawPath: string): string {
    try {
      return PathEngine.canonicalize(rawPath);
    } catch {
      return '/';
    }
  }

  public static getParentPath(path: string): string {
    return PathEngine.getParentPath(path);
  }

  public static getBasename(path: string): string {
    return PathEngine.getBasename(path);
  }

  public static getExtension(filename: string): string {
    return PathEngine.getExtension(filename);
  }

  public static joinPath(base: string, child: string): string {
    try {
      return PathEngine.joinPaths(base, child);
    } catch {
      return '/';
    }
  }

  public static isChildOf(parentPath: string, childPath: string): boolean {
    return PathEngine.isChildOf(parentPath, childPath);
  }

  public static getNowTimestamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // Find item by canonical path
  public static findItemByPath(items: FSItem[], path: string): FSItem | null {
    // Check RocketFS directly first if available
    const rfsItem = RocketFS.getInstance().findItemByPath(path);
    if (rfsItem) return rfsItem;

    const norm = this.normalizePath(path);
    for (const item of items) {
      if (this.normalizePath(item.path) === norm) return item;
      if (item.children) {
        const found = this.findItemByPath(item.children, norm);
        if (found) return found;
      }
    }
    return null;
  }

  // Find item by unique ID
  public static findItemById(items: FSItem[], id: string): FSItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // Recursive search through all levels of the tree
  public static recursiveSearch(
    items: FSItem[],
    query: string,
    filter: 'all' | 'files' | 'folders' = 'all'
  ): FSItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const results: FSItem[] = [];

    const traverse = (node: FSItem) => {
      const matchesType =
        filter === 'all' ||
        (filter === 'files' && node.type === 'file') ||
        (filter === 'folders' && node.type === 'folder');

      const matchesQuery =
        node.name.toLowerCase().includes(q) ||
        node.path.toLowerCase().includes(q) ||
        (node.type === 'file' && node.content && node.content.toLowerCase().includes(q));

      if (node.path !== '/' && matchesType && matchesQuery) {
        results.push(node);
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    for (const item of items) {
      traverse(item);
    }

    return results;
  }

  public static deepCloneItem(item: FSItem, targetParentPath: string, newName?: string): FSItem {
    const name = newName || item.name;
    const newPath = this.joinPath(targetParentPath, name);
    const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = this.getNowTimestamp();

    if (item.type === 'file') {
      return {
        ...item,
        id: newId,
        name,
        path: newPath,
        updatedAt: timestamp,
      };
    }

    const clonedChildren: FSItem[] = (item.children || []).map((child) =>
      this.deepCloneItem(child, newPath)
    );

    return {
      ...item,
      id: newId,
      name,
      path: newPath,
      updatedAt: timestamp,
      children: clonedChildren,
    };
  }

  public static createItem(
    tree: FSItem[],
    parentPath: string,
    name: string,
    type: 'file' | 'folder',
    content = ''
  ): { newTree: FSItem[]; createdItem: FSItem } {
    const normParent = this.normalizePath(parentPath);
    const newPath = this.joinPath(normParent, name);

    // Also persist through authoritative RocketFS
    const rfs = RocketFS.getInstance();
    if (type === 'file') {
      rfs.createFile(newPath, content);
    } else {
      rfs.createDirectory(newPath);
    }

    const newItem: FSItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      type,
      path: newPath,
      size: type === 'file' ? `${content.length} B` : undefined,
      updatedAt: this.getNowTimestamp(),
      content: type === 'file' ? content : undefined,
      children: type === 'folder' ? [] : undefined,
    };

    const insert = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (this.normalizePath(item.path) === normParent && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), newItem],
          };
        }
        if (item.children) {
          return { ...item, children: insert(item.children) };
        }
        return item;
      });
    };

    return { newTree: insert(tree), createdItem: newItem };
  }

  public static deleteItem(
    tree: FSItem[],
    targetIdOrPath: string
  ): { newTree: FSItem[]; deletedItem: FSItem | null } {
    let deleted: FSItem | null = null;

    // Persist through RocketFS
    const rfs = RocketFS.getInstance();
    rfs.delete(targetIdOrPath, undefined, true);

    const remove = (items: FSItem[]): FSItem[] => {
      return items
        .filter((item) => {
          if (item.id === targetIdOrPath || this.normalizePath(item.path) === this.normalizePath(targetIdOrPath)) {
            deleted = item;
            return false;
          }
          return true;
        })
        .map((item) => {
          if (item.children) {
            return { ...item, children: remove(item.children) };
          }
          return item;
        });
    };

    return { newTree: remove(tree), deletedItem: deleted };
  }

  public static renameItem(
    tree: FSItem[],
    targetId: string,
    newName: string
  ): { newTree: FSItem[]; renamedItem: FSItem | null } {
    const cleanName = newName.trim().replace(/[\/\\]/g, '');
    if (!cleanName) return { newTree: tree, renamedItem: null };

    let renamed: FSItem | null = null;

    const updatePathsRecursively = (item: FSItem, newParentPath: string): FSItem => {
      const updatedPath = this.joinPath(newParentPath, item.name);
      return {
        ...item,
        path: updatedPath,
        children: item.children
          ? item.children.map((c) => updatePathsRecursively(c, updatedPath))
          : undefined,
      };
    };

    const walk = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (item.id === targetId) {
          const parentPath = this.getParentPath(item.path);
          const newPath = this.joinPath(parentPath, cleanName);

          // Persist through RocketFS
          RocketFS.getInstance().rename(item.path, cleanName);

          renamed = {
            ...item,
            name: cleanName,
            path: newPath,
            updatedAt: this.getNowTimestamp(),
            children: item.children
              ? item.children.map((c) => updatePathsRecursively(c, newPath))
              : undefined,
          };
          return renamed;
        }
        if (item.children) {
          return { ...item, children: walk(item.children) };
        }
        return item;
      });
    };

    return { newTree: walk(tree), renamedItem: renamed };
  }

  public static moveItem(
    tree: FSItem[],
    targetItem: FSItem,
    destinationParentPath: string
  ): { newTree: FSItem[]; movedItem: FSItem } {
    const rfs = RocketFS.getInstance();
    rfs.move(targetItem.path, destinationParentPath);

    const { newTree: treeWithoutItem, deletedItem } = this.deleteItem(tree, targetItem.id);
    const itemToMove = deletedItem || targetItem;
    const cloned = this.deepCloneItem(itemToMove, destinationParentPath, itemToMove.name);

    const insert = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (this.normalizePath(item.path) === this.normalizePath(destinationParentPath) && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), cloned],
          };
        }
        if (item.children) {
          return { ...item, children: insert(item.children) };
        }
        return item;
      });
    };

    return { newTree: insert(treeWithoutItem), movedItem: cloned };
  }

  public static updateFileContent(
    tree: FSItem[],
    path: string,
    newContent: string
  ): FSItem[] {
    const norm = this.normalizePath(path);

    // Persist to RocketFS
    RocketFS.getInstance().writeFile(norm, newContent);

    const walk = (items: FSItem[]): FSItem[] => {
      return items.map((item) => {
        if (this.normalizePath(item.path) === norm && item.type === 'file') {
          return {
            ...item,
            content: newContent,
            size: `${newContent.length} B`,
            updatedAt: this.getNowTimestamp(),
          };
        }
        if (item.children) {
          return { ...item, children: walk(item.children) };
        }
        return item;
      });
    };
    return walk(tree);
  }
}
