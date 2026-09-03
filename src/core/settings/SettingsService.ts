// SettingsService.ts
// Centralized settings management with event subscription and persistence synchronization

import { SystemSettings } from '../../types';
import { persistenceProvider } from '../../platform/browser/BrowserPersistenceProvider';
import { PERSISTENCE_KEYS } from '../persistence/PersistenceProvider';
import { soundEngine } from '../../utils/audio';

export type SettingsListener = (settings: SystemSettings) => void;

export class SettingsService {
  private static instance: SettingsService | null = null;
  private settings: SystemSettings = {
    wallpaper: 'liquid-aurora',
    accentColor: 'sky',
    nightLight: false,
    volume: 85,
    isMuted: false,
    wifiConnected: true,
    timeFormat: '12h',
    showSeconds: true,
    language: 'en',
  };
  private listeners: Set<SettingsListener> = new Set();
  private isLoaded = false;

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public async init(): Promise<SystemSettings> {
    if (!this.isLoaded) {
      try {
        const saved = await persistenceProvider.getItem<SystemSettings>(PERSISTENCE_KEYS.SETTINGS);
        if (saved) {
          this.settings = { ...this.settings, ...saved };
        }
      } catch {}
      this.isLoaded = true;
      this.syncSoundEngine();
    }
    return this.settings;
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...partial };
    this.syncSoundEngine();
    this.notifyListeners();
    // Persist asynchronously
    persistenceProvider.setItem(PERSISTENCE_KEYS.SETTINGS, this.settings).catch(() => {});
    return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.settings);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.settings);
      } catch {}
    }
  }

  private syncSoundEngine(): void {
    soundEngine.setMasterSettings(this.settings.volume, this.settings.isMuted);
  }
}

export const settingsService = SettingsService.getInstance();
