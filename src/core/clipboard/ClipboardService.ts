// ClipboardService.ts
// System clipboard service managing Copy and Cut operations for files, folders, and text

import { FSItem } from '../../types';

export type ClipboardOp = 'copy' | 'cut';
export type ClipboardDataType = 'fs_item' | 'text';

export interface ClipboardItem {
  op: ClipboardOp;
  type: ClipboardDataType;
  item?: FSItem;
  text?: string;
  sourcePath?: string;
  timestamp: number;
}

export class ClipboardService {
  private static instance: ClipboardService | null = null;
  private currentItem: ClipboardItem | null = null;
  private listeners: Set<(item: ClipboardItem | null) => void> = new Set();

  public static getInstance(): ClipboardService {
    if (!ClipboardService.instance) {
      ClipboardService.instance = new ClipboardService();
    }
    return ClipboardService.instance;
  }

  public copyItem(item: FSItem): void {
    this.currentItem = {
      op: 'copy',
      type: 'fs_item',
      item,
      sourcePath: item.path,
      timestamp: Date.now(),
    };
    this.notify();
  }

  public cutItem(item: FSItem): void {
    this.currentItem = {
      op: 'cut',
      type: 'fs_item',
      item,
      sourcePath: item.path,
      timestamp: Date.now(),
    };
    this.notify();
  }

  public copyText(text: string): void {
    this.currentItem = {
      op: 'copy',
      type: 'text',
      text,
      timestamp: Date.now(),
    };
    this.notify();
  }

  public getClipboard(): ClipboardItem | null {
    return this.currentItem;
  }

  public clear(): void {
    this.currentItem = null;
    this.notify();
  }

  public subscribe(listener: (item: ClipboardItem | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentItem);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentItem);
      } catch {}
    }
  }
}

export const clipboardService = ClipboardService.getInstance();
