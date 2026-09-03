// AppSecurityManager.ts
// Central manager enforcing capabilities and logging security boundaries

import { AppId } from '../../types';
import { AppContract, AppCapability, AppSecurityContext, SecurityValidationResult } from './AppContract';
import { AppRegistry } from './AppRegistry';
import { SystemLogger } from '../logging/SystemLogger';

export class AppSecurityManager {
  private static instance: AppSecurityManager | null = null;
  private readonly contexts: Map<AppId, AppSecurityContext> = new Map();

  private constructor() {
    this.initializeDefaultContexts();
  }

  public static getInstance(): AppSecurityManager {
    if (!AppSecurityManager.instance) {
      AppSecurityManager.instance = new AppSecurityManager();
    }
    return AppSecurityManager.instance;
  }

  private initializeDefaultContexts(): void {
    const apps = AppRegistry.getAllApps();
    apps.forEach((app) => {
      const granted = AppContract.DEFAULT_CAPABILITIES[app.id] || ['system.info'];
      this.contexts.set(app.id, {
        appId: app.id,
        displayName: app.displayName,
        isSystemApp: app.isSystemApp,
        grantedCapabilities: [...granted],
        maxMemoryMb: app.isSystemApp ? 512 : 256,
        sandboxPathRoot: `/home/ryan/.${app.id}`,
      });
    });
  }

  public getContext(appId: AppId): AppSecurityContext {
    const existing = this.contexts.get(appId);
    if (existing) return existing;

    const fallback: AppSecurityContext = {
      appId,
      displayName: appId,
      isSystemApp: false,
      grantedCapabilities: ['system.info'],
      maxMemoryMb: 128,
      sandboxPathRoot: `/home/ryan/.${appId}`,
    };
    this.contexts.set(appId, fallback);
    return fallback;
  }

  public checkCapability(appId: AppId, required: AppCapability): boolean {
    const ctx = this.getContext(appId);
    const has = AppContract.hasCapability(ctx, required);
    if (!has) {
      SystemLogger.getInstance().logSecurity(
        'CHECK_CAPABILITY',
        String(required),
        false,
        `App '${appId}' denied capability '${required}'`
      );
    }
    return has;
  }

  public validateFilesystem(
    appId: AppId,
    path: string,
    isWrite: boolean
  ): SecurityValidationResult {
    const ctx = this.getContext(appId);
    const res = AppContract.validateFilesystemAccess(ctx, path, isWrite);
    if (res.type !== 'GRANTED') {
      SystemLogger.getInstance().logSecurity(
        isWrite ? 'FS_WRITE' : 'FS_READ',
        path,
        false,
        `Filesystem access violation by '${appId}' on '${path}': ${res.type}`
      );
    }
    return res;
  }
}
