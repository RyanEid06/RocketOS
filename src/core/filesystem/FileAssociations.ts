// FileAssociations.ts
// Authoritative TypeScript binding implementing rocket/filesystem/associations.rocket
// Extended with dynamic user overrides and virtual disk / media associations.

import { AppId } from '../../types';
import { FileAssociation } from './types';

const STORAGE_KEY = 'rocket_user_file_associations_v1';

export class FileAssociations {
  private static userOverrides: Map<string, AppId> = new Map();
  private static initialized = false;

  private static readonly ASSOCIATIONS: FileAssociation[] = [
    {
      extension: '.rocket',
      mimeType: 'text/x-rocket',
      defaultAppId: 'editor',
      associatedAppIds: ['editor', 'rocket-studio'],
      friendlyName: 'Rocket Source Code',
    },
    {
      extension: '.txt',
      mimeType: 'text/plain',
      defaultAppId: 'notes',
      associatedAppIds: ['notes', 'editor'],
      friendlyName: 'Text Document',
    },
    {
      extension: '.md',
      mimeType: 'text/markdown',
      defaultAppId: 'docs',
      associatedAppIds: ['docs', 'editor', 'notes'],
      friendlyName: 'Markdown Document',
    },
    {
      extension: '.rmd',
      mimeType: 'text/markdown',
      defaultAppId: 'docs',
      associatedAppIds: ['docs', 'editor'],
      friendlyName: 'Rocket Markdown Document',
    },
    {
      extension: '.markdown',
      mimeType: 'text/markdown',
      defaultAppId: 'docs',
      associatedAppIds: ['docs', 'editor'],
      friendlyName: 'Markdown Document',
    },
    {
      extension: '.png',
      mimeType: 'image/png',
      defaultAppId: 'gallery',
      associatedAppIds: ['gallery', 'paint'],
      friendlyName: 'PNG Image',
    },
    {
      extension: '.jpg',
      mimeType: 'image/jpeg',
      defaultAppId: 'gallery',
      associatedAppIds: ['gallery', 'paint'],
      friendlyName: 'JPEG Image',
    },
    {
      extension: '.jpeg',
      mimeType: 'image/jpeg',
      defaultAppId: 'gallery',
      associatedAppIds: ['gallery', 'paint'],
      friendlyName: 'JPEG Image',
    },
    {
      extension: '.webp',
      mimeType: 'image/webp',
      defaultAppId: 'gallery',
      associatedAppIds: ['gallery', 'paint'],
      friendlyName: 'WebP Image',
    },
    {
      extension: '.rpaint',
      mimeType: 'application/x-rocket-paint',
      defaultAppId: 'paint',
      associatedAppIds: ['paint', 'gallery'],
      friendlyName: 'Rocket Paint Project',
    },
    {
      extension: '.rnote',
      mimeType: 'application/x-rocket-notes',
      defaultAppId: 'notes',
      associatedAppIds: ['notes', 'editor'],
      friendlyName: 'Rocket Notes Archive',
    },
    {
      extension: '.toml',
      mimeType: 'text/x-toml',
      defaultAppId: 'editor',
      associatedAppIds: ['editor'],
      friendlyName: 'TOML Configuration',
    },
    {
      extension: '.log',
      mimeType: 'text/plain',
      defaultAppId: 'editor',
      associatedAppIds: ['editor'],
      friendlyName: 'System Log File',
    },
    {
      extension: '.sys',
      mimeType: 'text/plain',
      defaultAppId: 'editor',
      associatedAppIds: ['editor'],
      friendlyName: 'Kernel Driver Specification',
    },
    {
      extension: '.json',
      mimeType: 'application/json',
      defaultAppId: 'editor',
      associatedAppIds: ['editor'],
      friendlyName: 'JSON Document',
    },
    {
      extension: '.csv',
      mimeType: 'text/csv',
      defaultAppId: 'sheet',
      associatedAppIds: ['sheet', 'editor'],
      friendlyName: 'CSV Spreadsheet',
    },
    {
      extension: '.rcsv',
      mimeType: 'text/csv',
      defaultAppId: 'sheet',
      associatedAppIds: ['sheet', 'editor'],
      friendlyName: 'Rocket Spreadsheet Document',
    },
    {
      extension: '.pdf',
      mimeType: 'application/pdf',
      defaultAppId: 'pdf-viewer',
      associatedAppIds: ['pdf-viewer'],
      friendlyName: 'PDF Document',
    },
    {
      extension: '.spec',
      mimeType: 'text/plain',
      defaultAppId: 'pdf-viewer',
      associatedAppIds: ['pdf-viewer', 'editor'],
      friendlyName: 'Specification Document',
    },
    // Virtual Disk & Archive Files
    {
      extension: '.iso',
      mimeType: 'application/x-iso9660-image',
      defaultAppId: 'explorer',
      associatedAppIds: ['explorer', 'system-monitor'],
      friendlyName: 'Virtual Disk Image (ISO)',
    },
    {
      extension: '.zip',
      mimeType: 'application/zip',
      defaultAppId: 'explorer',
      associatedAppIds: ['explorer'],
      friendlyName: 'Compressed ZIP Archive',
    },
    {
      extension: '.tar',
      mimeType: 'application/x-tar',
      defaultAppId: 'explorer',
      associatedAppIds: ['explorer'],
      friendlyName: 'TAR Archive',
    },
    // Media Audio & Video Files
    {
      extension: '.mp3',
      mimeType: 'audio/mpeg',
      defaultAppId: 'media',
      associatedAppIds: ['media'],
      friendlyName: 'MP3 Audio File',
    },
    {
      extension: '.wav',
      mimeType: 'audio/wav',
      defaultAppId: 'media',
      associatedAppIds: ['media'],
      friendlyName: 'WAV Audio Track',
    },
    {
      extension: '.ogg',
      mimeType: 'audio/ogg',
      defaultAppId: 'media',
      associatedAppIds: ['media'],
      friendlyName: 'Ogg Vorbis Audio',
    },
    {
      extension: '.mp4',
      mimeType: 'video/mp4',
      defaultAppId: 'media',
      associatedAppIds: ['media'],
      friendlyName: 'MP4 Video File',
    },
    {
      extension: '.webm',
      mimeType: 'video/webm',
      defaultAppId: 'media',
      associatedAppIds: ['media'],
      friendlyName: 'WebM Video File',
    },
  ];

  private static ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([ext, appId]) => {
          this.userOverrides.set(ext.toLowerCase(), appId as AppId);
        });
      }
    } catch {
      // ignore
    }
  }

  public static getAllAssociations(): FileAssociation[] {
    this.ensureInitialized();
    return this.ASSOCIATIONS.map((a) => {
      const override = this.userOverrides.get(a.extension);
      if (override) {
        return { ...a, defaultAppId: override };
      }
      return a;
    });
  }

  public static setDefaultApp(extension: string, appId: AppId): void {
    this.ensureInitialized();
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    this.userOverrides.set(cleanExt, appId);
    try {
      const obj: Record<string, string> = {};
      this.userOverrides.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  public static resetDefaults(): void {
    this.userOverrides.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  public static getDefaultApp(extension: string): AppId {
    this.ensureInitialized();
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    const override = this.userOverrides.get(cleanExt);
    if (override) return override;

    const found = this.ASSOCIATIONS.find((a) => a.extension === cleanExt);
    return (found?.defaultAppId as AppId) || 'editor';
  }

  public static getDefaultAppId(fileNameOrExt: string): AppId {
    if (fileNameOrExt.includes('.')) {
      const ext = '.' + fileNameOrExt.split('.').pop()!.toLowerCase();
      return this.getDefaultApp(ext);
    }
    return this.getDefaultApp(fileNameOrExt);
  }

  public static getDefaultAppForFilename(filename: string): AppId {
    return this.getDefaultAppId(filename);
  }

  public static getAssociatedApps(extension: string): AppId[] {
    this.ensureInitialized();
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    const found = this.ASSOCIATIONS.find((a) => a.extension === cleanExt);
    if (!found) return ['editor'];
    return found.associatedAppIds as AppId[];
  }

  public static getMimeType(extension: string): string {
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    const found = this.ASSOCIATIONS.find((a) => a.extension === cleanExt);
    return found?.mimeType || 'text/plain';
  }

  public static getFriendlyName(extension: string): string {
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
    const found = this.ASSOCIATIONS.find((a) => a.extension === cleanExt);
    return found?.friendlyName || 'Document';
  }
}
