// AppContract.ts
// TypeScript bridge implementing rocket/apps/contract.rocket
// Authoritative capability declarations, security context, and isolation validation

import { AppId } from '../../types';

export type AppCapability =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'notifications'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'network'
  | 'system.info'
  | 'process.manage'
  | 'service.manage'
  | 'users.manage';

export interface AppSecurityContext {
  appId: AppId;
  displayName: string;
  isSystemApp: boolean;
  grantedCapabilities: AppCapability[];
  maxMemoryMb: number;
  sandboxPathRoot: string;
}

export type SecurityValidationResult =
  | { type: 'GRANTED' }
  | { type: 'DENIED_CAPABILITY'; capability: AppCapability }
  | { type: 'PATH_ESCAPE_ATTEMPT'; targetPath: string }
  | { type: 'PRIVILEGED_ACCESS_VIOLATION'; reason: string };

export interface AppLifecycleHooks {
  onInit?: () => void | Promise<void>;
  onOpenFile?: (path: string, content: string) => void | Promise<void>;
  onSaveFile?: () => { path: string; content: string } | null;
  onClose?: () => boolean | Promise<boolean>;
  onRestore?: (snapshotPayload: string) => void | Promise<void>;
}

export class AppContract {
  /**
   * Default capability matrices for RocketOS applications
   */
  public static readonly DEFAULT_CAPABILITIES: Record<AppId, AppCapability[]> = {
    explorer: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
      'system.info',
    ],
    thispc: ['system.info', 'filesystem.read'],
    trash: ['filesystem.read', 'filesystem.write', 'notifications'],
    terminal: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
      'system.info',
      'process.manage',
      'service.manage',
      'users.manage',
      'network',
    ],
    'rocket-studio': [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
      'system.info',
    ],
    editor: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    taskmanager: [
      'process.manage',
      'service.manage',
      'system.info',
      'notifications',
    ],
    monitor: ['system.info'],
    settings: ['system.info', 'notifications'],
    paint: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    notes: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    graphics: ['system.info'],
  };

  /**
   * Validates if a security context has the required capability
   */
  public static hasCapability(
    ctx: AppSecurityContext,
    required: AppCapability
  ): boolean {
    if (ctx.isSystemApp) return true;
    return ctx.grantedCapabilities.includes(required);
  }

  /**
   * Validates filesystem access according to sandboxing rules defined in contract.rocket
   */
  public static validateFilesystemAccess(
    ctx: AppSecurityContext,
    targetPath: string,
    writeOp: boolean
  ): SecurityValidationResult {
    const reqCap: AppCapability = writeOp ? 'filesystem.write' : 'filesystem.read';
    if (!this.hasCapability(ctx, reqCap)) {
      return { type: 'DENIED_CAPABILITY', capability: reqCap };
    }

    // System applications have full access
    if (ctx.isSystemApp) {
      return { type: 'GRANTED' };
    }

    // Normal apps are sandboxed to user home, /tmp, examples, or app root
    const isSafe =
      targetPath.startsWith('/home/') ||
      targetPath.startsWith('/tmp') ||
      targetPath.startsWith('/usr/share/rocket/examples') ||
      (ctx.sandboxPathRoot && targetPath.startsWith(ctx.sandboxPathRoot));

    if (!isSafe && writeOp) {
      return { type: 'PATH_ESCAPE_ATTEMPT', targetPath };
    }

    return { type: 'GRANTED' };
  }
}
