// BrowserFallbackCoreProvider.ts
// Compatibility provider delegating to in-browser TypeScript services.
// Note: This is a temporary compatibility provider for browser-only environments
// (such as AI Studio preview). The canonical operating system core is Rocket Core.

import {
  ICoreProvider,
  ICoreSystemAPI,
  ICoreFileSystemAPI,
  ICoreUsersAPI,
  ICoreProcessesAPI,
  ICoreServicesAPI,
  ICoreShellAPI,
  ICoreSearchAPI,
  ICoreAppsAPI,
  ICoreWorkspacesAPI,
} from './CoreProvider';
import { CoreError, CoreErrorCode } from './errors/CoreError';
import { ROCKET_CORE_PROTOCOL } from './protocol/constants';
import { SystemManifestInfo, PlatformCapabilities, SystemStatusInfo } from './types/system';
import {
  CoreFileStat,
  CoreDirEntry,
  CoreSearchOptions,
  CoreSearchResult,
  CoreFileAssociation,
  CoreNodeType,
} from './types/fs';
import { CoreUser, CoreGroup } from './types/users';
import { CoreProcess, ProcessStatus } from './types/processes';
import { CoreService, ServiceStatus, StartupMode } from './types/services';
import {
  CoreShellExecutionResult,
  CoreShellAst,
  CoreCommandChainNode,
  CoreCombinatorType,
} from './types/shell';
import { CoreAppMetadata, AppCategory } from './types/apps';
import { CoreWorkspaceProfile } from './types/workspaces';
import { CoreDiagnostics } from './types/diagnostics';

// Internal subsystem imports
import { SystemManifest } from '../core/manifest/SystemManifest';
import { BrowserPlatformProvider } from '../platform/browser/BrowserPlatformProvider';
import { RocketFS } from '../core/filesystem/RocketFS';
import { VFSErrorCode, VFSInode } from '../core/filesystem/types';
import { UserManager } from '../core/users/UserManager';
import { ProcessManager } from '../core/process/ProcessManager';
import { ServiceManager } from '../core/services/ServiceManager';
import { CommandRegistry, CommandContext } from '../core/commands/CommandRegistry';
import { ShellParser } from '../core/shell/ShellParser';
import { AppRegistry } from '../core/apps/AppRegistry';
import { FileAssociations } from '../core/filesystem/FileAssociations';
import { AppId } from '../types';

function mapVfsErrorToCoreError(code?: VFSErrorCode, message = 'VFS error', target?: string): CoreError {
  let mappedCode: CoreErrorCode = 'INVALID_ARGUMENT';
  switch (code) {
    case 'NOT_FOUND':
      mappedCode = 'NOT_FOUND';
      break;
    case 'ALREADY_EXISTS':
      mappedCode = 'ALREADY_EXISTS';
      break;
    case 'PERMISSION_DENIED':
      mappedCode = 'PERMISSION_DENIED';
      break;
    case 'INVALID_PATH':
      mappedCode = 'INVALID_PATH';
      break;
    case 'READ_ONLY':
      mappedCode = 'READ_ONLY';
      break;
    case 'IS_A_DIRECTORY':
    case 'NOT_A_DIRECTORY':
    case 'DIRECTORY_NOT_EMPTY':
      mappedCode = 'CONFLICT';
      break;
    case 'NO_SPACE':
      mappedCode = 'SERVICE_FAILED';
      break;
    default:
      mappedCode = 'INVALID_ARGUMENT';
  }
  return new CoreError(mappedCode, message, { vfsErrorCode: code, target });
}

function inodeToFileStat(inode: VFSInode): CoreFileStat {
  let type: CoreNodeType = 'file';
  if (inode.nodeType === 'directory') type = 'directory';
  else if (inode.nodeType === 'symlink') type = 'symlink';

  const createdTime = Date.parse(inode.createdAt) || Date.now();
  const modTime = Date.parse(inode.modifiedAt) || Date.now();

  return {
    id: `inode-${inode.inode}`,
    name: inode.name,
    path: inode.canonicalPath,
    type,
    sizeBytes: inode.sizeBytes,
    createdAt: createdTime,
    modifiedAt: modTime,
    uid: inode.uid,
    gid: inode.gid,
    permissions: `0${(inode.mode & 0o777).toString(8)}`,
    isReadOnly: !!inode.flags,
    isSystemNode: inode.uid === 0,
  };
}

export class BrowserFallbackCoreProvider implements ICoreProvider {
  public readonly providerType = 'browser-fallback' as const;
  public readonly providerName = 'Browser Compatibility Core Provider (Fallback)';
  public readonly isConnected = true;

  private bootTime = Date.now();
  private bootId = `browser-fallback-${Math.random().toString(36).substring(2, 10)}`;

  public readonly system: ICoreSystemAPI;
  public readonly fs: ICoreFileSystemAPI;
  public readonly users: ICoreUsersAPI;
  public readonly processes: ICoreProcessesAPI;
  public readonly services: ICoreServicesAPI;
  public readonly shell: ICoreShellAPI;
  public readonly search: ICoreSearchAPI;
  public readonly apps: ICoreAppsAPI;
  public readonly workspaces: ICoreWorkspacesAPI;

  constructor() {
    this.system = this.createSystemAPI();
    this.fs = this.createFileSystemAPI();
    this.users = this.createUsersAPI();
    this.processes = this.createProcessesAPI();
    this.services = this.createServicesAPI();
    this.shell = this.createShellAPI();
    this.search = this.createSearchAPI();
    this.apps = this.createAppsAPI();
    this.workspaces = this.createWorkspacesAPI();

    // Ensure core services and background daemons are booted
    ServiceManager.getInstance().bootCoreServices();
  }

  public async getDiagnostics(): Promise<CoreDiagnostics> {
    const fs = RocketFS.getInstance();
    const pm = ProcessManager.getInstance();
    const manifest = SystemManifest.VERSION;

    return {
      providerType: this.providerType,
      providerName: this.providerName,
      protocolVersion: ROCKET_CORE_PROTOCOL,
      engineIdentity: 'RocketOS Browser Compatibility Engine (TypeScript/VFS)',
      compilerIdentity: `rocketc ${manifest.rocketCompilerVersion} (Browser Emulated ABI v1)`,
      runtimeAbi: 'ABI v1',
      bootId: this.bootId,
      bootTimestampMs: this.bootTime,
      uptimeSeconds: Math.floor((Date.now() - this.bootTime) / 1000),
      storageBackend: 'IndexedDB VFS (Browser-Confined)',
      activeProcessesCount: pm.getAllProcesses().length,
      managedInodesCount: fs.snapshot().inodes.length,
      hostEndpoints: {
        boundHost: 'browser-memory',
        boundPort: 0,
      },
    };
  }

  private createSystemAPI(): ICoreSystemAPI {
    return {
      getManifest: async (): Promise<SystemManifestInfo> => {
        const v = SystemManifest.VERSION;
        const h = SystemManifest.HARDWARE;
        return {
          osName: v.osName,
          osVersion: v.osVersion,
          codename: v.milestone,
          buildNumber: String(v.buildNumber),
          kernelArchitecture: v.kernelArchitecture,
          rocketCompilerVersion: v.rocketCompilerVersion,
          abiVersion: 'ABI v1',
          protocolVersion: ROCKET_CORE_PROTOCOL,
          releaseDate: '2026-03-01',
          hardware: {
            cpuModel: h.cpuModel,
            cores: 8,
            logicalCores: h.logicalCores,
            clockSpeedGhz: h.baseClockGhz,
            totalMemoryBytes: h.totalMemoryMb * 1024 * 1024,
            totalDiskBytes: h.storageCapacityGb * 1024 * 1024 * 1024,
            pagingScheme: h.pagingMode,
          },
        };
      },

      getCapabilities: async (): Promise<PlatformCapabilities> => {
        const p = new BrowserPlatformProvider();
        const cap = p.getCapabilities();
        return {
          nativeCoreHost: false,
          virtualMemoryPaging: cap.pml4MemoryTelemetry === 'REAL_BROWSER' || cap.pml4MemoryTelemetry === 'SIMULATED',
          directFileSystem: cap.filesystem === 'REAL_BROWSER',
          processIsolation: false,
          networkSockets: cap.networkControl === 'REAL_BROWSER',
          hardwareAudioSynthesis: cap.audioSynthesis === 'REAL_BROWSER',
          proceduralGraphics2D: true,
          userElevation: true,
          storageProvider: 'browser-indexeddb',
        };
      },

      getStatus: async (): Promise<SystemStatusInfo> => {
        const pm = ProcessManager.getInstance();
        const sm = ServiceManager.getInstance();
        const um = UserManager.getInstance();
        let procs = pm.getAllProcesses();
        let runningServices = sm.listServices().filter((s) => s.state === 'RUNNING').length;

        if (runningServices === 0) {
          await sm.bootCoreServices();
          procs = pm.getAllProcesses();
          runningServices = sm.listServices().filter((s) => s.state === 'RUNNING').length;
        }

        return {
          status: 'healthy',
          uptimeSeconds: Math.floor((Date.now() - this.bootTime) / 1000),
          activeProcesses: Math.max(1, procs.length),
          runningServices,
          cpuUsagePercent: 12.5,
          memoryUsedBytes: 420 * 1024 * 1024,
          diskUsedBytes: 12 * 1024 * 1024,
          currentUserId: um.getCurrentUser().uid,
        };
      },
    };
  }

  private createFileSystemAPI(): ICoreFileSystemAPI {
    return {
      stat: async (path: string): Promise<CoreFileStat> => {
        const fs = RocketFS.getInstance();
        const statRes = fs.stat(path);
        if (!statRes.success || !statRes.data) {
          throw mapVfsErrorToCoreError(statRes.error, statRes.message, path);
        }
        const lookup = fs.lookup(path);
        if (!lookup.success || !lookup.data) {
          throw mapVfsErrorToCoreError(lookup.error, lookup.message, path);
        }
        return inodeToFileStat(lookup.data);
      },

      list: async (path: string): Promise<CoreDirEntry[]> => {
        const fs = RocketFS.getInstance();
        const res = fs.listDirectory(path);
        if (!res.success || !res.data) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
        return res.data.map((child) => ({
          id: `inode-${child.inode}`,
          name: child.name,
          path: child.canonicalPath,
          type: child.nodeType === 'directory' ? 'directory' : 'file',
          sizeBytes: child.sizeBytes,
          modifiedAt: Date.parse(child.modifiedAt) || Date.now(),
        }));
      },

      read: async (path: string): Promise<string> => {
        const fs = RocketFS.getInstance();
        const res = fs.readFile(path);
        if (!res.success || res.data === undefined) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
        return res.data;
      },

      write: async (path: string, content: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.writeFile(path, content);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
      },

      createFile: async (path: string, content = ''): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.createFile(path, content, UserManager.getInstance().getCurrentUser());
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
      },

      createDirectory: async (path: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.createDirectory(path, UserManager.getInstance().getCurrentUser());
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
      },

      rename: async (oldPath: string, newPath: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const newSegments = newPath.split('/').filter(Boolean);
        const newName = newSegments[newSegments.length - 1] || '';
        const res = fs.rename(oldPath, newName);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, oldPath);
        }
      },

      copy: async (srcPath: string, dstPath: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.copy(srcPath, dstPath);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, srcPath);
        }
      },

      move: async (srcPath: string, dstPath: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.move(srcPath, dstPath);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, srcPath);
        }
      },

      remove: async (path: string, recursive = true): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.delete(path, UserManager.getInstance().getCurrentUser(), recursive);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
      },

      trash: async (path: string): Promise<string> => {
        const fs = RocketFS.getInstance();
        const res = fs.trash(path);
        if (!res.success || !res.data) {
          throw mapVfsErrorToCoreError(res.error, res.message, path);
        }
        return res.data.trashId;
      },

      restore: async (trashId: string): Promise<void> => {
        const fs = RocketFS.getInstance();
        const res = fs.restore(trashId);
        if (!res.success) {
          throw mapVfsErrorToCoreError(res.error, res.message, trashId);
        }
      },

      search: async (query: string, options?: CoreSearchOptions): Promise<CoreSearchResult[]> => {
        const fs = RocketFS.getInstance();
        const targetDir = options?.targetDirectory || '/';
        const matches = fs.search(query, UserManager.getInstance().getCurrentUser(), targetDir);

        return matches.slice(0, options?.maxResults || 50).map((m) => {
          let matchType: 'exact' | 'prefix' | 'fuzzy' = 'fuzzy';
          const lowerQ = query.toLowerCase();
          const lowerName = m.name.toLowerCase();
          if (lowerName === lowerQ) matchType = 'exact';
          else if (lowerName.startsWith(lowerQ)) matchType = 'prefix';

          return {
            id: `inode-${m.inode}`,
            name: m.name,
            path: m.canonicalPath,
            type: m.nodeType === 'directory' ? 'directory' : 'file',
            score: matchType === 'exact' ? 100 : matchType === 'prefix' ? 80 : 50,
            matchType,
          };
        });
      },
    };
  }

  private createUsersAPI(): ICoreUsersAPI {
    return {
      current: async (): Promise<CoreUser> => {
        const u = UserManager.getInstance().getCurrentUser();
        return {
          uid: u.uid,
          username: u.username,
          displayName: u.displayName,
          homeDirectory: u.homeDirectory,
          primaryGid: u.primaryGid,
          supplementaryGids: u.supplementaryGids,
          shell: u.shell,
          isAdministrator: u.isAdmin,
        };
      },

      list: async (): Promise<CoreUser[]> => {
        const users = [UserManager.ROOT_USER, UserManager.NORMAL_USER];
        return users.map((u) => ({
          uid: u.uid,
          username: u.username,
          displayName: u.displayName,
          homeDirectory: u.homeDirectory,
          primaryGid: u.primaryGid,
          supplementaryGids: u.supplementaryGids,
          shell: u.shell,
          isAdministrator: u.isAdmin,
        }));
      },

      groups: async (): Promise<CoreGroup[]> => {
        const groups = UserManager.getInstance().getGroups();
        return groups.map((g) => ({
          gid: g.gid,
          name: g.name,
          description: g.description,
        }));
      },

      checkPermission: async (path: string, mode: 'read' | 'write' | 'execute'): Promise<boolean> => {
        const fs = RocketFS.getInstance();
        const statRes = fs.stat(path);
        if (!statRes.success || !statRes.data) return false;
        const user = UserManager.getInstance().getCurrentUser();
        if (user.isAdmin || user.uid === 0) return true;

        const m = statRes.data.mode;
        const isOwner = statRes.data.uid === user.uid;
        const isGroup = statRes.data.gid === user.primaryGid || user.supplementaryGids.includes(statRes.data.gid);

        if (mode === 'read') {
          return isOwner ? !!(m & 0o400) : isGroup ? !!(m & 0o040) : !!(m & 0o004);
        }
        if (mode === 'write') {
          return isOwner ? !!(m & 0o200) : isGroup ? !!(m & 0o020) : !!(m & 0o002);
        }
        if (mode === 'execute') {
          return isOwner ? !!(m & 0o100) : isGroup ? !!(m & 0o010) : !!(m & 0o001);
        }
        return false;
      },
    };
  }

  private createProcessesAPI(): ICoreProcessesAPI {
    return {
      list: async (): Promise<CoreProcess[]> => {
        const pm = ProcessManager.getInstance();
        return pm.getAllProcesses().map((p) => {
          let status: ProcessStatus = 'running';
          if (p.state === 'STOPPED') status = 'stopped';
          else if (p.state === 'ZOMBIE') status = 'zombie';
          else if (p.state === 'SLEEPING') status = 'sleeping';

          return {
            pid: p.pid,
            ppid: p.ppid,
            name: p.name,
            appId: p.appId,
            commandLine: p.name,
            status,
            cpuPercent: (p.accounting?.cpuPercentTenth || 0) / 10,
            memoryBytes: p.accounting?.memoryRssBytes || 1024 * 1024,
            threads: 1,
            uid: p.uid,
            startedAt: p.startTimeEpochMs,
            priority: 0,
          };
        });
      },

      get: async (pid: number): Promise<CoreProcess | null> => {
        const pm = ProcessManager.getInstance();
        const p = pm.getProcess(pid);
        if (!p) return null;
        return {
          pid: p.pid,
          ppid: p.ppid,
          name: p.name,
          appId: p.appId,
          commandLine: p.name,
          status: p.state.toLowerCase() as ProcessStatus,
          cpuPercent: (p.accounting?.cpuPercentTenth || 0) / 10,
          memoryBytes: p.accounting?.memoryRssBytes || 1024 * 1024,
          threads: 1,
          uid: p.uid,
          startedAt: p.startTimeEpochMs,
          priority: 0,
        };
      },

      launch: async (appId: string, name?: string, commandLine?: string): Promise<CoreProcess> => {
        const pm = ProcessManager.getInstance();
        const app = AppRegistry.getApp(appId as AppId);
        const res = pm.spawnProcess({
          appId: appId as AppId,
          name: name || app?.displayName || appId,
        });

        return {
          pid: res.pid,
          ppid: res.ppid,
          name: res.name,
          appId: res.appId,
          commandLine: commandLine || res.name,
          status: 'running',
          cpuPercent: 0,
          memoryBytes: 8 * 1024 * 1024,
          threads: 1,
          uid: res.uid,
          startedAt: res.startTimeEpochMs,
          priority: 0,
        };
      },

      terminate: async (pid: number): Promise<boolean> => {
        const pm = ProcessManager.getInstance();
        return pm.terminateProcess(pid);
      },
    };
  }

  private createServicesAPI(): ICoreServicesAPI {
    return {
      list: async (): Promise<CoreService[]> => {
        const sm = ServiceManager.getInstance();
        return sm.listServices().map((s) => ({
          name: s.id,
          displayName: s.name,
          description: s.description,
          status: (s.state === 'RUNNING' ? 'running' : 'stopped') as ServiceStatus,
          startupMode: (s.startupMode === 'boot' ? 'automatic' : 'manual') as StartupMode,
          dependencies: s.dependencies || [],
          restartCount: s.restartCount || 0,
          lastStartedAt: s.startTimeEpochMs,
        }));
      },

      status: async (name: string): Promise<CoreService | null> => {
        const sm = ServiceManager.getInstance();
        const s = sm.getStatus(name);
        if (!s) return null;
        return {
          name: s.id,
          displayName: s.name,
          description: s.description,
          status: (s.state === 'RUNNING' ? 'running' : 'stopped') as ServiceStatus,
          startupMode: s.startupMode === 'boot' ? 'automatic' : 'manual',
          dependencies: s.dependencies || [],
          restartCount: s.restartCount || 0,
          lastStartedAt: s.startTimeEpochMs,
        };
      },

      start: async (name: string): Promise<boolean> => {
        const sm = ServiceManager.getInstance();
        const res = sm.start(name);
        return res.success;
      },

      stop: async (name: string): Promise<boolean> => {
        const sm = ServiceManager.getInstance();
        const res = sm.stop(name);
        return res.success;
      },

      restart: async (name: string): Promise<boolean> => {
        const sm = ServiceManager.getInstance();
        const res = sm.restart(name);
        return res.success;
      },
    };
  }

  private createShellAPI(): ICoreShellAPI {
    return {
      execute: async (commandLine: string, env?: Record<string, string>): Promise<CoreShellExecutionResult> => {
        const start = performance.now();
        const cmdReg = CommandRegistry.getInstance();
        const um = UserManager.getInstance();

        const shellEnv = {
          USER: um.getCurrentUser().username,
          HOME: um.getCurrentUser().homeDirectory,
          PATH: '/bin:/usr/bin:/usr/local/bin',
          SHELL: '/usr/bin/rsh',
          ...env,
        };

        const ctx: CommandContext = {
          cwd: um.getCurrentUser().homeDirectory,
          env: shellEnv,
          args: [],
        };

        const res = await cmdReg.executeCommandLine(commandLine, ctx);

        return {
          exitCode: res.exitCode,
          stdout: res.stdout,
          stderr: res.stderr,
          executionTimeMs: Math.round(performance.now() - start),
        };
      },

      complete: async (line: string): Promise<string[]> => {
        const cmdReg = CommandRegistry.getInstance();
        const allCmds = cmdReg.getAllCommands().map((c) => c.name);
        allCmds.push('reboot', 'edit', 'sysinfo', 'neofetch', 'rocketc', 'sudo');
        const trimmed = line.trimStart();
        return allCmds.filter((c) => c.startsWith(trimmed));
      },

      parse: async (commandLine: string): Promise<CoreShellAst> => {
        const parsed = ShellParser.parse(commandLine);
        const nodes: CoreCommandChainNode[] = parsed.nodes.map((n) => {
          let comb: CoreCombinatorType = 'none';
          if (n.combinator === 'PIPE') comb = 'pipe';
          else if (n.combinator === 'AND') comb = 'and';
          else if (n.combinator === 'OR') comb = 'or';
          else if (n.combinator === 'SEQUENCE') comb = 'sequence';

          return {
            command: {
              argv: n.command.argv,
              redirectStdout: n.command.redirectStdout,
              appendStdout: n.command.appendStdout,
              redirectStdin: n.command.redirectStdin,
            },
            combinator: comb,
          };
        });

        return {
          nodes,
          hasSyntaxError: parsed.hasSyntaxError,
          errorMessage: parsed.errorMessage,
        };
      },
    };
  }

  private createSearchAPI(): ICoreSearchAPI {
    return {
      query: async (keyword: string): Promise<CoreSearchResult[]> => {
        const rfs = RocketFS.getInstance();
        const tree = rfs.toFSItemTree();
        const matches = rfs.search(keyword);
        return matches.map((m) => {
          let matchType: 'exact' | 'prefix' | 'fuzzy' = 'fuzzy';
          const lowerQ = keyword.toLowerCase();
          const lowerName = m.name.toLowerCase();
          if (lowerName === lowerQ) matchType = 'exact';
          else if (lowerName.startsWith(lowerQ)) matchType = 'prefix';

          return {
            id: `inode-${m.inode}`,
            name: m.name,
            path: m.canonicalPath,
            type: m.nodeType === 'directory' ? 'directory' : 'file',
            score: matchType === 'exact' ? 100 : matchType === 'prefix' ? 80 : 50,
            matchType,
          };
        });
      },
    };
  }

  private createAppsAPI(): ICoreAppsAPI {
    return {
      list: async (): Promise<CoreAppMetadata[]> => {
        const apps = AppRegistry.getAllApps();
        return apps.map((a) => ({
          id: a.id,
          displayName: a.displayName,
          description: a.description,
          glyph: a.glyph,
          category: (a.category === 'graphics' ? 'media' : a.category) as AppCategory,
          isSingleton: a.isSingleton,
          defaultBounds: { width: a.constraints.defaultWidth, height: a.constraints.defaultHeight },
          minBounds: { width: a.constraints.minWidth, height: a.constraints.minHeight },
          supportedExtensions: a.supportedExtensions,
          keywords: a.keywords,
          version: '2.1.0',
        }));
      },

      get: async (id: string): Promise<CoreAppMetadata | null> => {
        const a = AppRegistry.getApp(id as AppId);
        if (!a) return null;
        return {
          id: a.id,
          displayName: a.displayName,
          description: a.description,
          glyph: a.glyph,
          category: (a.category === 'graphics' ? 'media' : a.category) as AppCategory,
          isSingleton: a.isSingleton,
          defaultBounds: { width: a.constraints.defaultWidth, height: a.constraints.defaultHeight },
          minBounds: { width: a.constraints.minWidth, height: a.constraints.minHeight },
          supportedExtensions: a.supportedExtensions,
          keywords: a.keywords,
          version: '2.1.0',
        };
      },

      fileAssociations: async (): Promise<CoreFileAssociation[]> => {
        const assocs = FileAssociations.getAllAssociations();
        return assocs.map((fa) => ({
          extension: fa.extension,
          defaultAppId: fa.defaultAppId,
          associatedAppIds: fa.associatedAppIds,
          mimeType: fa.mimeType,
          description: fa.friendlyName,
        }));
      },
    };
  }

  private createWorkspacesAPI(): ICoreWorkspacesAPI {
    const defaultProfiles: CoreWorkspaceProfile[] = [
      {
        id: 1,
        name: 'General',
        category: 'general',
        description: 'Standard daily productivity and web browsing',
        wallpaperId: 'aurora',
        themeAccent: 'sky',
        allowedAppCategories: ['system', 'developer', 'productivity', 'media', 'utilities'],
        pinnedAppIds: ['explorer', 'notes', 'paint', 'settings'],
        rules: {
          restrictAppsToCategory: false,
          autoTiling: false,
          isolateClipboard: false,
        },
      },
      {
        id: 2,
        name: 'Developer',
        category: 'developer',
        description: 'High-density developer workbench with terminal & IDE',
        wallpaperId: 'cyberpunk',
        themeAccent: 'emerald',
        allowedAppCategories: ['developer', 'system', 'utilities'],
        pinnedAppIds: ['editor', 'studio', 'terminal', 'system-monitor'],
        rules: {
          restrictAppsToCategory: false,
          autoTiling: true,
          isolateClipboard: false,
        },
      },
      {
        id: 3,
        name: 'Art & Media',
        category: 'art',
        description: 'Creative studio environment for pixel art and raylib graphics',
        wallpaperId: 'cosmic',
        themeAccent: 'violet',
        allowedAppCategories: ['media', 'productivity', 'utilities'],
        pinnedAppIds: ['paint', 'gallery', 'raylib', 'notes'],
        rules: {
          restrictAppsToCategory: false,
          autoTiling: false,
          isolateClipboard: false,
        },
      },
    ];

    return {
      list: async (): Promise<CoreWorkspaceProfile[]> => {
        return defaultProfiles;
      },

      getProfile: async (id: number): Promise<CoreWorkspaceProfile | null> => {
        return defaultProfiles.find((p) => p.id === id) || null;
      },
    };
  }
}
