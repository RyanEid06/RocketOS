// MountManager.ts
// Authoritative Virtual Disk Mounting subsystem for RocketOS (ISO, ZIP, and VFS images)

import { RocketFS } from './RocketFS';
import { NotificationService } from '../notifications/NotificationService';
import { soundEngine } from '../../utils/audio';

export interface VirtualDiskEntry {
  subPath: string; // e.g. "README.txt", "boot/kernel.bin", "setup.rocket"
  name: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  content?: string;
}

export interface MountedDisk {
  id: string;
  label: string;
  sourcePath: string;
  mountPoint: string;
  fileSystemType: 'iso9660' | 'zip' | 'vfat';
  sizeBytes: number;
  isReadOnly: boolean;
  mountedAt: string;
  entries: VirtualDiskEntry[];
}

export class MountManager {
  private static instance: MountManager | null = null;
  private mounts: Map<string, MountedDisk> = new Map(); // key: mountPoint
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.mountDefaultRecoveryMedia();
  }

  public static getInstance(): MountManager {
    if (!MountManager.instance) {
      MountManager.instance = new MountManager();
    }
    return MountManager.instance;
  }

  private mountDefaultRecoveryMedia() {
    // Automatically prepare a simulated RocketOS Installation & Toolchain ISO image
    const entries: VirtualDiskEntry[] = [
      {
        subPath: 'README.md',
        name: 'README.md',
        type: 'file',
        sizeBytes: 412,
        content: `# RocketOS v2.1.0 ISO Recovery Media\n\nOfficial Live Environment and LLVM Toolchain Distribution.\n\n- rocketc 2.1.0 (LLVM 22.1.6 backend)\n- raylib 6.0 embedded runtime\n- Thread-Confined ARC memory verification suite\n`,
      },
      {
        subPath: 'boot',
        name: 'boot',
        type: 'directory',
        sizeBytes: 4096,
      },
      {
        subPath: 'boot/rocket_kernel.sys',
        name: 'rocket_kernel.sys',
        type: 'file',
        sizeBytes: 819200,
        content: '[ROCKET_BOOT_IMAGE_ABI_V1_LLVM_NATIVE_CHECKSUM_OK]',
      },
      {
        subPath: 'tools',
        name: 'tools',
        type: 'directory',
        sizeBytes: 4096,
      },
      {
        subPath: 'tools/install.rocket',
        name: 'install.rocket',
        type: 'file',
        sizeBytes: 310,
        content: `fn main() -> Int:\n    print("RocketOS Automated Installer v2.1")\n    print("All partitions healthy and verified.")\n    return 0\n`,
      },
    ];

    this.mountVirtualEntries(
      'rocket-iso-default',
      'RocketOS_v2.1_x86_64.iso',
      '/media/iso/RocketOS_v2.1.iso',
      '/mnt/cdrom',
      'iso9660',
      1024 * 1024 * 650, // 650 MB
      true,
      entries
    );
  }

  public getMounts(): MountedDisk[] {
    return Array.from(this.mounts.values());
  }

  public getMount(mountPoint: string): MountedDisk | undefined {
    return this.mounts.get(mountPoint);
  }

  public mountVirtualDisk(
    sourcePath: string,
    fileContent?: string,
    customMountPoint?: string
  ): { success: boolean; mountPoint: string; error?: string } {
    const filename = sourcePath.split('/').pop() || 'disk.iso';
    const cleanName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isIso = filename.toLowerCase().endsWith('.iso');
    const isZip = filename.toLowerCase().endsWith('.zip');

    const mountPoint = customMountPoint || `/mnt/${cleanName}`;
    if (this.mounts.has(mountPoint)) {
      return { success: false, mountPoint, error: `Mount point '${mountPoint}' already mounted.` };
    }

    const entries: VirtualDiskEntry[] = [];

    if (isZip) {
      // Simulate ZIP archive extraction
      entries.push({
        subPath: 'archive_manifest.json',
        name: 'archive_manifest.json',
        type: 'file',
        sizeBytes: 156,
        content: JSON.stringify({ archive: filename, compressed: true, entries: 3 }, null, 2),
      });
      entries.push({
        subPath: 'extracted_content.txt',
        name: 'extracted_content.txt',
        type: 'file',
        sizeBytes: (fileContent?.length || 200),
        content: fileContent || 'Extracted archive contents from ZIP volume.',
      });
    } else {
      // ISO 9660 Volume
      entries.push({
        subPath: 'VOLUME.TXT',
        name: 'VOLUME.TXT',
        type: 'file',
        sizeBytes: 256,
        content: `Volume ID: ${cleanName.toUpperCase()}\nFormat: ISO 9660 Joliet Level 3\nAuthor: Rocket Toolchain\n`,
      });
      entries.push({
        subPath: 'autorun.rocket',
        name: 'autorun.rocket',
        type: 'file',
        sizeBytes: 180,
        content: `fn main() -> Int:\n    print("Mounted virtual disc: ${filename}")\n    return 0\n`,
      });
    }

    const diskId = `vdisk-${Date.now()}`;
    const mounted = this.mountVirtualEntries(
      diskId,
      filename,
      sourcePath,
      mountPoint,
      isIso ? 'iso9660' : 'zip',
      fileContent ? fileContent.length : 1024 * 1024 * 45,
      true,
      entries
    );

    if (mounted) {
      try {
        soundEngine.playSuccess();
        NotificationService.getInstance().sendNotification({
          title: 'Virtual Disk Mounted',
          body: `Mounted ${filename} successfully at ${mountPoint}`,
          severity: 'info',
          sourceAppId: 'explorer',
          action: {
            label: 'Open Mount',
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('rocket:open_explorer_path', { detail: { path: mountPoint } })
              );
            },
          },
        });
      } catch {
        // ignore
      }
      return { success: true, mountPoint };
    }

    return { success: false, mountPoint, error: 'Failed to inject virtual inodes into RocketFS.' };
  }

  private mountVirtualEntries(
    id: string,
    label: string,
    sourcePath: string,
    mountPoint: string,
    fileSystemType: 'iso9660' | 'zip' | 'vfat',
    sizeBytes: number,
    isReadOnly: boolean,
    entries: VirtualDiskEntry[]
  ): boolean {
    const rfs = RocketFS.getInstance();

    // Ensure /mnt exists
    rfs.createDirectory('/mnt');
    // Ensure mountPoint directory exists
    rfs.createDirectory(mountPoint);

    // Populate entries into RocketFS
    entries.forEach((entry) => {
      const fullPath = `${mountPoint}/${entry.subPath}`;
      if (entry.type === 'directory') {
        rfs.createDirectory(fullPath);
      } else {
        // If nested directory, make sure parent exists
        const parts = entry.subPath.split('/');
        if (parts.length > 1) {
          parts.pop();
          const subDir = `${mountPoint}/${parts.join('/')}`;
          rfs.createDirectory(subDir);
        }
        rfs.writeFile(fullPath, entry.content || '');
      }
    });

    const mountedDisk: MountedDisk = {
      id,
      label,
      sourcePath,
      mountPoint,
      fileSystemType,
      sizeBytes,
      isReadOnly,
      mountedAt: new Date().toISOString(),
      entries,
    };

    this.mounts.set(mountPoint, mountedDisk);
    this.notify();
    return true;
  }

  public unmount(mountPoint: string): { success: boolean; error?: string } {
    const disk = this.mounts.get(mountPoint);
    if (!disk) {
      return { success: false, error: `No virtual disk mounted at '${mountPoint}'.` };
    }

    const rfs = RocketFS.getInstance();
    // Recursively delete files under mountPoint
    rfs.delete(mountPoint, undefined, true);

    this.mounts.delete(mountPoint);
    this.notify();

    try {
      soundEngine.playSnap();
      NotificationService.getInstance().notify(
        'Virtual Disk Unmounted',
        `Unmounted ${disk.label} from ${mountPoint}`,
        'info'
      );
    } catch {
      // ignore
    }

    return { success: true };
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const mountManager = MountManager.getInstance();
