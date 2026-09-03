// PinningService.ts
// Manages persistent pinned applications independently of currently active open windows

import { AppId } from '../../types';
import { AppRegistry } from '../apps/AppRegistry';
import { persistenceProvider } from '../../platform/browser/BrowserPersistenceProvider';
import { PERSISTENCE_KEYS } from '../persistence/PersistenceProvider';
import { soundEngine } from '../../utils/audio';

export class PinningService {
  private static instance: PinningService | null = null;
  private pinnedAppIds: AppId[] = AppRegistry.getDefaultPinnedAppIds();
  private listeners: Set<(pinned: AppId[]) => void> = new Set();
  private isLoaded = false;

  public static getInstance(): PinningService {
    if (!PinningService.instance) {
      PinningService.instance = new PinningService();
    }
    return PinningService.instance;
  }

  public async init(): Promise<AppId[]> {
    if (!this.isLoaded) {
      try {
        const saved = await persistenceProvider.getItem<AppId[]>(PERSISTENCE_KEYS.PINNED_APPS);
        if (saved && Array.isArray(saved) && saved.length > 0) {
          this.pinnedAppIds = saved;
        }
      } catch {}
      this.isLoaded = true;
      this.notify();
    }
    return this.getPinnedAppIds();
  }

  public getPinnedAppIds(): AppId[] {
    return [...this.pinnedAppIds];
  }

  public getPinned(): AppId[] {
    return this.getPinnedAppIds();
  }

  public setPinned(ids: AppId[]): void {
    this.reorderPinned(ids);
  }

  public isPinned(appId: AppId): boolean {
    return this.pinnedAppIds.includes(appId);
  }

  public pinApp(appId: AppId): void {
    if (!this.pinnedAppIds.includes(appId)) {
      this.pinnedAppIds.push(appId);
      soundEngine.playPin();
      this.notify();
      this.persist();
    }
  }

  public unpinApp(appId: AppId): void {
    if (this.pinnedAppIds.includes(appId)) {
      this.pinnedAppIds = this.pinnedAppIds.filter((id) => id !== appId);
      soundEngine.playPin();
      this.notify();
      this.persist();
    }
  }

  public togglePin(appId: AppId): AppId[] {
    if (this.isPinned(appId)) {
      this.unpinApp(appId);
    } else {
      this.pinApp(appId);
    }
    return this.getPinnedAppIds();
  }

  public reorderPinned(newOrder: AppId[]): void {
    this.pinnedAppIds = newOrder;
    this.notify();
    this.persist();
  }

  public subscribe(listener: (pinned: AppId[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.pinnedAppIds);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.pinnedAppIds);
      } catch {}
    }
  }

  private persist(): void {
    persistenceProvider.setItem(PERSISTENCE_KEYS.PINNED_APPS, this.pinnedAppIds).catch(() => {});
  }
}

export const pinningService = PinningService.getInstance();
