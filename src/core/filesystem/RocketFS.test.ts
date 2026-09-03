import { describe, it, expect, beforeEach } from 'vitest';
import { RocketFS } from './RocketFS';
import { UserManager } from '../users/UserManager';
import { FileAssociations } from './FileAssociations';

describe('RocketFS & File Associations', () => {
  let fs: RocketFS;

  beforeEach(() => {
    fs = RocketFS.getInstance();
  });

  it('initializes authoritative root and user directories', () => {
    const rootLookup = fs.lookup('/home/ryan', UserManager.ROOT_USER);
    expect(rootLookup.success).toBe(true);
    expect(rootLookup.data.nodeType).toBe('directory');
  });

  it('reads pre-seeded files in virtual filesystem', () => {
    const readRes = fs.readFile('/usr/share/rocket/examples/graphics.rocket', UserManager.ROOT_USER);
    expect(readRes.success).toBe(true);
    expect(readRes.data).toContain('import rocket.raylib');
  });

  it('resolves default file associations accurately', () => {
    expect(FileAssociations.getDefaultAppId('graphics.rocket')).toBe('editor');
    expect(FileAssociations.getDefaultAppId('document.txt')).toBe('notes');
    expect(FileAssociations.getDefaultAppId('drawing.rpaint')).toBe('paint');
    expect(FileAssociations.getDefaultAppId('sketch.png')).toBe('gallery');
  });

  it('writes and updates documents in user directory', () => {
    const user = UserManager.getInstance().getCurrentUser();
    const testPath = '/home/ryan/Documents/test_suite.txt';
    const writeRes = fs.writeFile(testPath, 'Hello from Vitest pipeline', user);
    expect(writeRes.success).toBe(true);

    const readRes = fs.readFile(testPath, user);
    expect(readRes.success).toBe(true);
    expect(readRes.data).toBe('Hello from Vitest pipeline');
  });
});
