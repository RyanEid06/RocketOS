import { describe, it, expect } from 'vitest';
import { FileSystemService } from './FileSystemService';
import { FSItem } from '../../types';

describe('FileSystemService', () => {
  const initialTree: FSItem[] = [
    {
      id: 'root',
      name: '/',
      type: 'folder',
      path: '/',
      updatedAt: '2026-09-01 12:00:00',
      children: [
        {
          id: 'desktop-folder',
          name: 'Desktop',
          type: 'folder',
          path: '/Desktop',
          updatedAt: '2026-09-01 12:00:00',
          children: [
            {
              id: 'file-1',
              name: 'welcome.txt',
              type: 'file',
              path: '/Desktop/welcome.txt',
              updatedAt: '2026-09-01 12:00:00',
              content: 'Welcome to RocketOS!',
            },
          ],
        },
        {
          id: 'docs-folder',
          name: 'Documents',
          type: 'folder',
          path: '/Documents',
          updatedAt: '2026-09-01 12:00:00',
          children: [],
        },
      ],
    },
  ];

  it('normalizes paths correctly without duplicate slashes', () => {
    expect(FileSystemService.normalizePath('/Desktop//test/')).toBe('/Desktop/test');
    expect(FileSystemService.normalizePath('')).toBe('/');
    expect(FileSystemService.normalizePath('/')).toBe('/');
  });

  it('joins paths accurately', () => {
    expect(FileSystemService.joinPath('/Desktop', 'test.txt')).toBe('/Desktop/test.txt');
    expect(FileSystemService.joinPath('/', 'Documents')).toBe('/Documents');
  });

  it('creates new items in target folder', () => {
    const { newTree, createdItem } = FileSystemService.createItem(
      initialTree,
      '/Desktop',
      'script.rocket',
      'file',
      'fn main() {}'
    );

    expect(createdItem.name).toBe('script.rocket');
    expect(createdItem.path).toBe('/Desktop/script.rocket');

    const found = FileSystemService.findItemByPath(newTree, '/Desktop/script.rocket');
    expect(found).not.toBeNull();
    expect(found?.content).toBe('fn main() {}');
  });

  it('updates file content correctly', () => {
    const updated = FileSystemService.updateFileContent(
      initialTree,
      '/Desktop/welcome.txt',
      'Updated text content'
    );

    const file = FileSystemService.findItemByPath(updated, '/Desktop/welcome.txt');
    expect(file?.content).toBe('Updated text content');
  });

  it('renames an item and updates path', () => {
    const { newTree, renamedItem } = FileSystemService.renameItem(
      initialTree,
      'file-1',
      'hello.txt'
    );

    expect(renamedItem?.name).toBe('hello.txt');
    expect(renamedItem?.path).toBe('/Desktop/hello.txt');
  });

  it('deletes an item and returns the removed item', () => {
    const { newTree, deletedItem } = FileSystemService.deleteItem(initialTree, 'file-1');

    expect(deletedItem?.name).toBe('welcome.txt');
    const found = FileSystemService.findItemByPath(newTree, '/Desktop/welcome.txt');
    expect(found).toBeNull();
  });

  it('performs recursive search on file names and content', () => {
    const results = FileSystemService.recursiveSearch(initialTree, 'welcome');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('welcome.txt');
  });
});
