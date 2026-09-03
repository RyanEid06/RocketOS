// index.ts
// Central export and provider selection for RocketOS Core API

import { ICoreProvider } from './CoreProvider';
import { BrowserFallbackCoreProvider } from './BrowserFallbackCoreProvider';
import { RocketCoreClient } from './RocketCoreClient';
import { ROCKET_CORE_PROTOCOL } from './protocol/constants';

export * from './CoreProvider';
export * from './errors/CoreError';
export * from './protocol/constants';
export * from './types/system';
export * from './types/fs';
export * from './types/users';
export * from './types/processes';
export * from './types/services';
export * from './types/shell';
export * from './types/apps';
export * from './types/workspaces';
export * from './types/diagnostics';
export { BrowserFallbackCoreProvider } from './BrowserFallbackCoreProvider';
export { RocketCoreClient } from './RocketCoreClient';

let activeProvider: ICoreProvider | null = null;
const providerChangeListeners = new Set<(provider: ICoreProvider) => void>();

export function subscribeProviderChange(listener: (provider: ICoreProvider) => void): () => void {
  providerChangeListeners.add(listener);
  return () => providerChangeListeners.delete(listener);
}

function notifyProviderChanged(provider: ICoreProvider): void {
  for (const listener of providerChangeListeners) {
    try {
      listener(provider);
    } catch {
      // ignore listener failures
    }
  }
}

/**
 * Initializes and returns the active CoreProvider.
 * Attempts to connect to the native Rocket Core Host first.
 * If unavailable or in browser preview mode, gracefully activates BrowserFallbackCoreProvider.
 */
export async function initializeCoreProvider(forceFallback = false): Promise<ICoreProvider> {
  if (forceFallback) {
    activeProvider = new BrowserFallbackCoreProvider();
    notifyProviderChanged(activeProvider);
    return activeProvider;
  }

  // Check if native host configuration or environment variable is set
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : undefined;
  const coreUrl = metaEnv?.VITE_ROCKET_CORE_URL || 'http://127.0.0.1:5180';
  const token = metaEnv?.VITE_ROCKET_CORE_TOKEN || '';

  const client = new RocketCoreClient({
    baseUrl: coreUrl,
    authToken: token,
    timeoutMs: 1500, // Fast probe
  });

  try {
    await client.connect();
    activeProvider = client;
    notifyProviderChanged(activeProvider);
    return client;
  } catch {
    // Native core host is offline or not running (e.g. browser preview mode)
    activeProvider = new BrowserFallbackCoreProvider();
    notifyProviderChanged(activeProvider);
    return activeProvider;
  }
}

/**
 * Returns the currently active CoreProvider, initializing fallback if not yet loaded.
 */
export function getCoreProvider(): ICoreProvider {
  if (!activeProvider) {
    activeProvider = new BrowserFallbackCoreProvider();
  }
  return activeProvider;
}

/**
 * Manually switch provider (used by Dev Tools / Settings / Test harnesses)
 */
export function setCoreProvider(provider: ICoreProvider): void {
  activeProvider = provider;
  notifyProviderChanged(activeProvider);
}
