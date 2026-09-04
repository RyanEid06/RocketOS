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
    gallery: [
      'filesystem.read',
      'clipboard.read',
      'clipboard.write',
      'notifications',
      'system.info',
    ],
    notes: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    sheet: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    docs: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    calculator: ['clipboard.write', 'notifications'],
    'pdf-viewer': ['filesystem.read', 'notifications'],
    backup: [
      'filesystem.read',
      'filesystem.write',
      'system.info',
      'notifications',
    ],
    graphics: ['system.info'],
    repl: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
      'system.info',
    ],
    widgets: ['system.info', 'notifications'],
    'rocket-drop': [
      'filesystem.read',
      'filesystem.write',
      'network',
      'notifications',
    ],
    rockpm: [
      'filesystem.read',
      'filesystem.write',
      'network',
      'notifications',
    ],
    git: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    media: [
      'filesystem.read',
      'filesystem.write',
      'system.info',
      'notifications',
    ],
    browser: [
      'network',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    display: [
      'system.info',
      'notifications',
    ],
    cron: [
      'system.info',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    archive: [
      'filesystem.read',
      'filesystem.write',
      'notifications',
      'system.info',
    ],
    network: [
      'network',
      'notifications',
      'system.info',
    ],
    clock: [
      'notifications',
      'system.info',
    ],
    hex: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    snippets: [
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    'db-studio': [
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    keyring: [
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    palette: [
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    'font-book': [
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    synth: [
      'notifications',
    ],
    camera: [
      'filesystem.write',
      'notifications',
    ],
    profiler: [
      'system.info',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    disassembler: [
      'filesystem.read',
      'filesystem.write',
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    cheatsheet: [
      'clipboard.read',
      'clipboard.write',
      'notifications',
    ],
    wifi: [
      'network',
      'system.info',
      'service.manage',
      'notifications',
    ],
    bluetooth: [
      'network',
      'system.info',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    'device-manager': [
      'system.info',
      'service.manage',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    calendar: [
      'system.info',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    mail: [
      'network',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
    'software-center': [
      'network',
      'filesystem.read',
      'filesystem.write',
      'service.manage',
      'notifications',
    ],
    recorder: [
      'filesystem.write',
      'notifications',
    ],
    firewall: [
      'network',
      'system.info',
      'service.manage',
      'notifications',
    ],
    benchmark: [
      'system.info',
      'filesystem.read',
      'filesystem.write',
      'notifications',
    ],
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
