// ProcessManager.ts
// Authoritative Process Manager for RocketOS
// Implements rocket/process/manager.rocket domain model

import { AppRegistry } from '../apps/AppRegistry';
import { SystemLogger } from '../logging/SystemLogger';
import { UserManager } from '../users/UserManager';
import {
  ProcessCapabilities,
  ProcessRecord,
  ProcessState,
  ResourceAccounting,
  SpawnProcessOptions,
} from './ProcessTypes';

export class ProcessManager {
  private static instance: ProcessManager;

  private nextPid = 1;
  private processes: Map<number, ProcessRecord> = new Map();
  private listeners: Set<() => void> = new Set();
  private logger = SystemLogger.getInstance();

  private constructor() {
    this.bootstrapCoreProcesses();
  }

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  // =========================================================================
  // BOOTSTRAP INITIAL DAEMONS
  // =========================================================================
  private bootstrapCoreProcesses(): void {
    // PID 1: rocket-init (root)
    this.createRawProcess({
      pid: 1,
      ppid: 0,
      uid: 0,
      gid: 0,
      appId: 'rocket-init',
      name: 'rocket-init',
      state: 'RUNNING',
      startTimeEpochMs: Date.now() - 3600,
      sessionId: 'sys-0',
      workspaceId: 0,
      isBackgroundDaemon: true,
      accounting: {
        memoryRssBytes: 16 * 1024 * 1024,
        virtualMemoryBytes: 32 * 1024 * 1024,
        cpuPercentTenth: 1,
        ioReadBytes: 1024 * 512,
        ioWriteBytes: 1024 * 64,
      },
      exitStatus: 0,
      capabilities: {
        canElevate: true,
        canAccessHardware: true,
        canNetwork: true,
        canSpawn: true,
        canIpc: true,
      },
    });

    this.nextPid = 2;
  }

  private createRawProcess(record: ProcessRecord): ProcessRecord {
    this.processes.set(record.pid, record);
    return record;
  }

  // =========================================================================
  // PROCESS CREATION / SPAWN
  // =========================================================================
  public spawnProcess(options: SpawnProcessOptions): ProcessRecord {
    const userMgr = UserManager.getInstance();
    const currentUser = userMgr.getCurrentUser();

    const uid = options.uid ?? currentUser.uid;
    const gid = options.gid ?? currentUser.primaryGid;
    const ppid = options.ppid ?? 1;
    const sessionId = options.sessionId ?? 'session-ryan-1';
    const workspaceId = options.workspaceId ?? 1;

    // Check if app is singleton and already running
    const appDef = AppRegistry.getApp(options.appId as any);
    if (appDef && appDef.isSingleton) {
      const existing = this.findActiveByAppId(options.appId);
      if (existing) {
        // App is already running; transition to RUNNING/READY if stopped
        if (existing.state === 'STOPPED' || existing.state === 'SLEEPING') {
          existing.state = 'RUNNING';
        }
        if (options.windowId && !existing.windowId) {
          existing.windowId = options.windowId;
        }
        this.notify();
        return existing;
      }
    }

    const pid = this.nextPid++;
    const name = options.name ?? (appDef ? appDef.displayName : options.appId);
    const initialMemory = options.initialMemoryBytes ?? (options.isBackgroundDaemon ? 24 * 1024 * 1024 : 48 * 1024 * 1024);

    const capabilities: ProcessCapabilities = {
      canElevate: uid === 0 || currentUser.isAdmin,
      canAccessHardware: uid === 0,
      canNetwork: true,
      canSpawn: true,
      canIpc: true,
    };

    const accounting: ResourceAccounting = {
      memoryRssBytes: initialMemory,
      virtualMemoryBytes: initialMemory * 2,
      cpuPercentTenth: Math.floor(Math.random() * 8) + 2, // realistic 0.2% - 1.0%
      ioReadBytes: 1024 * 128,
      ioWriteBytes: 1024 * 32,
    };

    const record: ProcessRecord = {
      pid,
      ppid,
      uid,
      gid,
      appId: options.appId,
      name,
      state: 'RUNNING',
      startTimeEpochMs: Date.now(),
      sessionId,
      workspaceId,
      accounting,
      exitStatus: 0,
      capabilities,
      windowId: options.windowId,
      isBackgroundDaemon: !!options.isBackgroundDaemon,
    };

    this.processes.set(pid, record);
    this.logger.logProcess('launched', pid, name, `appId=${options.appId}, uid=${uid}`);
    this.notify();
    return record;
  }

  // =========================================================================
  // PROCESS STATE & LIFECYCLE
  // =========================================================================
  public setProcessState(pid: number, newState: ProcessState): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    if (proc.state === 'ZOMBIE') return false; // terminal

    proc.state = newState;
    this.notify();
    return true;
  }

  public setWindowId(pid: number, windowId: string): void {
    const proc = this.processes.get(pid);
    if (proc) {
      proc.windowId = windowId;
      this.notify();
    }
  }

  public terminateProcess(pid: number, exitStatus = 0): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;

    // Do not terminate PID 1 init daemon
    if (pid === 1) {
      this.logger.logProcess('state_change', pid, proc.name, 'attempted kill on PID 1 denied');
      return false;
    }

    proc.state = 'ZOMBIE';
    proc.exitStatus = exitStatus;
    this.logger.logProcess('exited', pid, proc.name, `exitStatus=${exitStatus}`);

    // Clean up zombie after brief delay (reaping)
    setTimeout(() => {
      this.processes.delete(pid);
      this.notify();
    }, 1500);

    this.notify();
    return true;
  }

  public kill(pid: number, signal = 15): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;

    if (pid === 1) return false; // Protected init

    this.logger.logProcess('killed', pid, proc.name, `signal=${signal}`);
    return this.terminateProcess(pid, 128 + signal);
  }

  // Called by WindowManager when a window is closed
  public onWindowClosed(windowId: string): void {
    for (const proc of this.processes.values()) {
      if (proc.windowId === windowId) {
        // If it's a background service, keep it alive
        if (proc.isBackgroundDaemon) {
          proc.windowId = undefined;
          proc.state = 'SLEEPING';
          this.notify();
        } else {
          this.terminateProcess(proc.pid, 0);
        }
      }
    }
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================
  public getProcess(pid: number): ProcessRecord | undefined {
    return this.processes.get(pid);
  }

  public getProcessByWindowId(windowId: string): ProcessRecord | undefined {
    for (const proc of this.processes.values()) {
      if (proc.windowId === windowId) return proc;
    }
    return undefined;
  }

  public findActiveByAppId(appId: string): ProcessRecord | undefined {
    for (const proc of this.processes.values()) {
      if (proc.appId === appId && proc.state !== 'ZOMBIE') {
        return proc;
      }
    }
    return undefined;
  }

  public getAllProcesses(): ProcessRecord[] {
    return Array.from(this.processes.values()).sort((a, b) => a.pid - b.pid);
  }

  public getProcessesBySession(sessionId: string): ProcessRecord[] {
    return Array.from(this.processes.values()).filter((p) => p.sessionId === sessionId);
  }

  public getActiveCount(): number {
    return Array.from(this.processes.values()).filter((p) => p.state !== 'ZOMBIE').length;
  }

  // =========================================================================
  // SUBSCRIPTION & EVENTS
  // =========================================================================
  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {}
    }
  }
}
