// FileAssociations.ts
// Authoritative TypeScript binding implementing rocket/filesystem/associations.rocket

import { AppId } from '../../types';
import { FileAssociation } from './types';

export class FileAssociations {
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
      defaultAppId: 'editor',
      associatedAppIds: ['editor', 'notes'],
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
  ];

  public static getAllAssociations() {
    return this.ASSOCIATIONS;
  }

  public static getDefaultApp(extension: string): AppId {
    const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
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
