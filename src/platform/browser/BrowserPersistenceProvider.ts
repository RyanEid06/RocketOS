// BrowserPersistenceProvider.ts
// Robust IndexedDB-backed persistence provider with localStorage fallback and schema migration

import {
  IPersistenceProvider,
  ROCKET_DATA_SCHEMA_VERSION,
  PERSISTENCE_KEYS,
} from '../../core/persistence/PersistenceProvider';
import { SchemaMigration } from '../../core/filesystem/SchemaMigration';
import { FSItem } from '../../types';

export class BrowserPersistenceProvider implements IPersistenceProvider {
  private static instance: BrowserPersistenceProvider | null = null;
  private db: IDBDatabase | null = null;
  private dbName = 'rocket_os_db';
  private storeName = 'system_store';
  private dbVersion = 1;
  private isInitialized = false;

  public static getInstance(): BrowserPersistenceProvider {
    if (!BrowserPersistenceProvider.instance) {
      BrowserPersistenceProvider.instance = new BrowserPersistenceProvider();
    }
    return BrowserPersistenceProvider.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isInitialized = true;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isInitialized = true;
          this.migrateIfNeeded().then(() => resolve());
        };

        request.onerror = () => {
          // Fall back to localStorage gracefully
          this.isInitialized = true;
          resolve();
        };
      } catch {
        this.isInitialized = true;
        resolve();
      }
    });
  }

  public async getSchemaVersion(): Promise<number> {
    const ver = await this.getItem<number>(PERSISTENCE_KEYS.SCHEMA_VERSION);
    return ver !== null ? ver : 0;
  }

  public async migrateIfNeeded(): Promise<void> {
    const currentVer = await this.getSchemaVersion();
    if (currentVer < 2) {
      try {
        const storedVfs = await this.getItem<any>(PERSISTENCE_KEYS.VFS);
        if (storedVfs && !SchemaMigration.isV2Snapshot(storedVfs)) {
          // If storedVfs is array of FSItem (v1)
          const itemsToMigrate: FSItem[] = Array.isArray(storedVfs)
            ? storedVfs
            : storedVfs.fileSystem && Array.isArray(storedVfs.fileSystem)
            ? storedVfs.fileSystem
            : [];

          if (itemsToMigrate.length > 0) {
            const v2Snapshot = SchemaMigration.migrateV1ToV2(itemsToMigrate);
            await this.setItem(PERSISTENCE_KEYS.VFS, v2Snapshot);
          }
        }
      } catch (err) {
        console.warn('VFS Schema v1->v2 migration warning:', err);
      }
      await this.setItem(PERSISTENCE_KEYS.SCHEMA_VERSION, ROCKET_DATA_SCHEMA_VERSION);
    }
  }

  public async getItem<T>(key: string): Promise<T | null> {
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(key);

          req.onsuccess = () => {
            resolve(req.result !== undefined ? (req.result as T) : null);
          };

          req.onerror = () => {
            // Fallback to localStorage
            resolve(this.getFromLocalStorage<T>(key));
          };
        } catch {
          resolve(this.getFromLocalStorage<T>(key));
        }
      });
    }

    return this.getFromLocalStorage<T>(key);
  }

  public async setItem<T>(key: string, value: T): Promise<void> {
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.put(value, key);

          req.onsuccess = () => {
            this.saveToLocalStorage(key, value);
            resolve();
          };

          req.onerror = () => {
            this.saveToLocalStorage(key, value);
            resolve();
          };
        } catch {
          this.saveToLocalStorage(key, value);
          resolve();
        }
      });
    }

    this.saveToLocalStorage(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.delete(key);
          req.onsuccess = () => {
            this.removeFromLocalStorage(key);
            resolve();
          };
          req.onerror = () => {
            this.removeFromLocalStorage(key);
            resolve();
          };
        } catch {
          this.removeFromLocalStorage(key);
          resolve();
        }
      });
    }

    this.removeFromLocalStorage(key);
  }

  public async clear(): Promise<void> {
    await this.init();

    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.clear();
          req.onsuccess = () => {
            this.clearLocalStorage();
            resolve();
          };
          req.onerror = () => {
            this.clearLocalStorage();
            resolve();
          };
        } catch {
          this.clearLocalStorage();
          resolve();
        }
      });
    }

    this.clearLocalStorage();
  }

  public async loadState(): Promise<{
    settings?: any;
    pinnedAppIds?: any;
    fileSystem?: any;
    trashItems?: any;
    activeWorkspace?: any;
  } | null> {
    try {
      const [settings, pinnedAppIds, fileSystem, trashItems, activeWorkspace] = await Promise.all([
        this.getItem(PERSISTENCE_KEYS.SETTINGS),
        this.getItem(PERSISTENCE_KEYS.PINNED_APPS),
        this.getItem(PERSISTENCE_KEYS.VFS),
        this.getItem(PERSISTENCE_KEYS.TRASH),
        this.getItem(PERSISTENCE_KEYS.WORKSPACES),
      ]);
      return { settings, pinnedAppIds, fileSystem, trashItems, activeWorkspace };
    } catch {
      return null;
    }
  }

  public async saveState(state: {
    settings?: any;
    pinnedAppIds?: any;
    fileSystem?: any;
    trashItems?: any;
    activeWorkspace?: any;
  }): Promise<void> {
    try {
      const promises: Promise<void>[] = [];
      if (state.settings !== undefined) {
        promises.push(this.setItem(PERSISTENCE_KEYS.SETTINGS, state.settings));
      }
      if (state.pinnedAppIds !== undefined) {
        promises.push(this.setItem(PERSISTENCE_KEYS.PINNED_APPS, state.pinnedAppIds));
      }
      if (state.fileSystem !== undefined) {
        promises.push(this.setItem(PERSISTENCE_KEYS.VFS, state.fileSystem));
      }
      if (state.trashItems !== undefined) {
        promises.push(this.setItem(PERSISTENCE_KEYS.TRASH, state.trashItems));
      }
      if (state.activeWorkspace !== undefined) {
        promises.push(this.setItem(PERSISTENCE_KEYS.WORKSPACES, state.activeWorkspace));
      }
      await Promise.all(promises);
    } catch {}
  }

  private getFromLocalStorage<T>(key: string): T | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          return JSON.parse(item) as T;
        }
      }
    } catch {}
    return null;
  }

  private saveToLocalStorage<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  }

  private removeFromLocalStorage(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }

  private clearLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.values(PERSISTENCE_KEYS).forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {}
  }

  public async clearAll(): Promise<void> {
    await this.init();
    if (this.db) {
      try {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        tx.objectStore(this.storeName).clear();
      } catch {}
    }
    this.clearLocalStorage();
  }
}

export const persistenceProvider = BrowserPersistenceProvider.getInstance();
export const browserPersistenceProvider = persistenceProvider;
