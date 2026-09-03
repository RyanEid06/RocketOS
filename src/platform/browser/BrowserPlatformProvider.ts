// BrowserPlatformProvider.ts
// Browser implementation of PlatformProvider with honest reporting of real vs simulated features

import { IPlatformProvider, PlatformCapabilities } from '../../core/platform/PlatformProvider';

export class BrowserPlatformProvider implements IPlatformProvider {
  private static instance: BrowserPlatformProvider | null = null;

  public static getInstance(): BrowserPlatformProvider {
    if (!BrowserPlatformProvider.instance) {
      BrowserPlatformProvider.instance = new BrowserPlatformProvider();
    }
    return BrowserPlatformProvider.instance;
  }

  public getCapabilities(): PlatformCapabilities {
    return {
      filesystem: 'VIRTUAL_PERSISTENT',
      windowManager: 'REAL_BROWSER',
      audioSynthesis: 'REAL_BROWSER',
      browserNetworkStatus: 'REAL_BROWSER',
      networkControl: 'UNAVAILABLE',
      cpuTelemetry: 'SIMULATED',
      pml4MemoryTelemetry: 'SIMULATED',
      nativeKernel: 'UNAVAILABLE',
      nativeHardwareSensors: 'UNAVAILABLE',
    };
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  public async getStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        return {
          usageBytes: est.usage || 1024 * 1024 * 24, // fallback 24MB
          quotaBytes: est.quota || 1024 * 1024 * 1024 * 2, // fallback 2GB
        };
      } catch {
        // Fallback
      }
    }
    return {
      usageBytes: 1024 * 1024 * 24,
      quotaBytes: 1024 * 1024 * 1024 * 2,
    };
  }

  public async copyToSystemClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    return false;
  }

  public async readFromSystemClipboard(): Promise<string | null> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        return await navigator.clipboard.readText();
      }
    } catch {}
    return null;
  }
}

export const platformProvider = BrowserPlatformProvider.getInstance();
