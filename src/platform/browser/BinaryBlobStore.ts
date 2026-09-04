// BinaryBlobStore.ts
// High-performance binary blob storage in IndexedDB for Paint, Media, and audio/image assets.

import { BrowserPersistenceProvider } from './BrowserPersistenceProvider';

export interface StoredBinaryBlob {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  data: string; // Base64 data URL or raw binary string
  createdAt: string;
  updatedAt: string;
}

export class BinaryBlobStore {
  private static instance: BinaryBlobStore | null = null;
  private provider = BrowserPersistenceProvider.getInstance();
  private readonly PREFIX = 'rocket_blob:';

  private constructor() {}

  public static getInstance(): BinaryBlobStore {
    if (!BinaryBlobStore.instance) {
      BinaryBlobStore.instance = new BinaryBlobStore();
    }
    return BinaryBlobStore.instance;
  }

  public async saveBlob(
    id: string,
    filename: string,
    mimeType: string,
    data: string | Blob
  ): Promise<StoredBinaryBlob> {
    let dataUrl: string;

    if (typeof data === 'string') {
      dataUrl = data;
    } else {
      dataUrl = await this.blobToDataUrl(data);
    }

    const sizeBytes = dataUrl.length;
    const now = new Date().toISOString();

    const record: StoredBinaryBlob = {
      id,
      filename,
      mimeType,
      sizeBytes,
      data: dataUrl,
      createdAt: now,
      updatedAt: now,
    };

    await this.provider.setItem(`${this.PREFIX}${id}`, record);
    return record;
  }

  public async getBlob(id: string): Promise<StoredBinaryBlob | null> {
    return this.provider.getItem<StoredBinaryBlob>(`${this.PREFIX}${id}`);
  }

  public async deleteBlob(id: string): Promise<void> {
    await this.provider.removeItem(`${this.PREFIX}${id}`);
  }

  public async listBlobs(): Promise<StoredBinaryBlob[]> {
    // Collect from indexedDB or localStorage
    const results: StoredBinaryBlob[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          try {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              results.push(JSON.parse(raw));
            }
          } catch {
            // ignore
          }
        }
      }
    }
    return results;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const binaryBlobStore = BinaryBlobStore.getInstance();
