// ServiceManager.ts
// Authoritative Background Service Supervisor for RocketOS
// Implements rocket/services/service_manager.rocket domain model

import { SystemLogger } from '../logging/SystemLogger';
import { ProcessManager } from '../process/ProcessManager';
import { ServiceDefinition, ServiceInstance, ServiceState } from './ServiceTypes';

export const CORE_SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    id: 'rocket-init',
    name: 'RocketOS System Bootstrap Daemon',
    description: 'PID 1 core orchestrator, hardware abstraction, and lifecycle root',
    startupMode: 'boot',
    dependencies: [],
    isCritical: true,
    assignedUid: 0,
  },
  {
    id: 'rocket-session',
    name: 'User Session & Authorization Service',
    description: 'User context, elevation grants, and multi-user authentication',
    startupMode: 'boot',
    dependencies: ['rocket-init'],
    isCritical: true,
    assignedUid: 0,
  },
  {
    id: 'rocket-fs',
    name: 'Rocket Virtual Filesystem Supervisor',
    description: 'VFS inode management, persistence synchronization, and trash daemon',
    startupMode: 'boot',
    dependencies: ['rocket-init'],
    isCritical: true,
    assignedUid: 0,
  },
  {
    id: 'rocket-settings',
    name: 'System Settings & Profile Daemon',
    description: 'Desktop atmosphere, wallpaper, audio preferences, and telemetry config',
    startupMode: 'boot',
    dependencies: ['rocket-fs'],
    isCritical: false,
    assignedUid: 1000,
  },
  {
    id: 'rocket-notify',
    name: 'RocketOS Notification Bus',
    description: 'System alerts, desktop toasts, and IPC event notifications',
    startupMode: 'boot',
    dependencies: ['rocket-session'],
    isCritical: false,
    assignedUid: 1000,
  },
  {
    id: 'rocket-audio',
    name: 'Procedural Audio Synthesizer Daemon',
    description: 'Web Audio synthesis driver, acoustic events, and volume controller',
    startupMode: 'boot',
    dependencies: ['rocket-settings'],
    isCritical: false,
    assignedUid: 1000,
  },
  {
    id: 'rocket-network',
    name: 'VirtIO Network State Controller',
    description: 'Host link monitoring, DNS simulation, and socket telemetry',
    startupMode: 'boot',
    dependencies: ['rocket-init'],
    isCritical: false,
    assignedUid: 0,
  },
  {
    id: 'rocket-indexer',
    name: 'Universal Desktop Search Indexer',
    description: 'VFS full-text crawler and application metadata indexing engine',
    startupMode: 'demand',
    dependencies: ['rocket-fs'],
    isCritical: false,
    assignedUid: 1000,
  },
  {
    id: 'rocket-compiler',
    name: 'Rocket Language Analysis Daemon',
    description: 'rocketc AST inspector, bytecode verification, and language tools',
    startupMode: 'demand',
    dependencies: ['rocket-fs'],
    isCritical: false,
    assignedUid: 1000,
  },
  {
    id: 'rocket-desktop',
    name: 'Liquid Glass Desktop Compositor',
    description: 'Window manager synchronization, taskbar dock, and virtual workspaces',
    startupMode: 'boot',
    dependencies: ['rocket-session', 'rocket-settings', 'rocket-audio'],
    isCritical: true,
    assignedUid: 1000,
  },
];

export class ServiceManager {
  private static instance: ServiceManager;

  private services: Map<string, ServiceInstance> = new Map();
  private listeners: Set<() => void> = new Set();
  private logger = SystemLogger.getInstance();

  private constructor() {
    this.initializeServiceDefinitions();
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private initializeServiceDefinitions(): void {
    for (const def of CORE_SERVICE_DEFINITIONS) {
      this.services.set(def.id, {
        id: def.id,
        name: def.name,
        description: def.description,
        state: 'STOPPED',
        startupMode: def.startupMode,
        dependencies: [...def.dependencies],
        startTimeEpochMs: 0,
        restartCount: 0,
        statusMessage: 'Inactive / awaiting startup sequence',
        capabilities: ['ipc', 'logging', def.assignedUid === 0 ? 'root' : 'user'],
        processId: 0,
        isCritical: def.isCritical,
      });
    }
  }

  // =========================================================================
  // BOOT ORCHESTRATION
  // =========================================================================
  public async bootCoreServices(): Promise<void> {
    const bootServices = CORE_SERVICE_DEFINITIONS.filter((d) => d.startupMode === 'boot');

    for (const s of bootServices) {
      this.start(s.id);
    }
  }

  // =========================================================================
  // SERVICE LIFECYCLE
  // =========================================================================
  public start(id: string): { success: boolean; message: string } {
    const svc = this.services.get(id);
    if (!svc) {
      return { success: false, message: `Unknown service: '${id}'` };
    }

    if (svc.state === 'RUNNING') {
      return { success: true, message: `Service '${id}' is already running.` };
    }

    // Verify dependencies are active
    for (const depId of svc.dependencies) {
      const dep = this.services.get(depId);
      if (!dep || dep.state !== 'RUNNING') {
        const msg = `Dependency failure: required service '${depId}' is not running.`;
        this.logger.logService('failed', id, msg);
        svc.state = 'FAILED';
        svc.statusMessage = msg;
        this.notify();
        return { success: false, message: msg };
      }
    }

    svc.state = 'STARTING';
    svc.statusMessage = 'Initializing worker and registering IPC endpoints...';
    this.notify();

    // Link or spawn backing daemon process in ProcessManager
    const procMgr = ProcessManager.getInstance();
    let proc = procMgr.findActiveByAppId(id);
    if (!proc) {
      const def = CORE_SERVICE_DEFINITIONS.find((d) => d.id === id);
      proc = procMgr.spawnProcess({
        appId: id,
        name: svc.name,
        uid: def ? def.assignedUid : 0,
        isBackgroundDaemon: true,
        initialMemoryBytes: 28 * 1024 * 1024,
      });
    }

    svc.processId = proc.pid;
    svc.state = 'RUNNING';
    svc.startTimeEpochMs = Date.now();
    svc.statusMessage = 'Active (running)';

    this.logger.logService('started', id, `PID=${svc.processId}`);
    this.notify();
    return { success: true, message: `Service '${id}' successfully started (PID ${svc.processId}).` };
  }

  public stop(id: string): { success: boolean; message: string } {
    const svc = this.services.get(id);
    if (!svc) {
      return { success: false, message: `Unknown service: '${id}'` };
    }

    if (svc.state === 'STOPPED') {
      return { success: true, message: `Service '${id}' is already stopped.` };
    }

    if (svc.isCritical) {
      const msg = `Warning: Service '${id}' is marked critical to RocketOS stability. Stopping is restricted.`;
      this.logger.logService('failed', id, msg);
      return { success: false, message: msg };
    }

    svc.state = 'STOPPING';
    this.notify();

    if (svc.processId > 1) {
      ProcessManager.getInstance().terminateProcess(svc.processId, 0);
    }

    svc.state = 'STOPPED';
    svc.statusMessage = 'Inactive (stopped)';
    svc.processId = 0;

    this.logger.logService('stopped', id, 'Stopped by operator/rocketctl');
    this.notify();
    return { success: true, message: `Service '${id}' stopped.` };
  }

  public restart(id: string): { success: boolean; message: string } {
    const svc = this.services.get(id);
    if (!svc) {
      return { success: false, message: `Unknown service: '${id}'` };
    }

    if (svc.state === 'RUNNING') {
      const stopRes = this.stop(id);
      if (!stopRes.success && svc.isCritical) {
        // Soft reload for critical service
        svc.restartCount++;
        svc.startTimeEpochMs = Date.now();
        svc.statusMessage = 'Active (reloaded)';
        this.logger.logService('restarted', id, `Reloaded in-place (count=${svc.restartCount})`);
        this.notify();
        return { success: true, message: `Service '${id}' reloaded in-place.` };
      }
    }

    svc.restartCount++;
    const startRes = this.start(id);
    if (startRes.success) {
      this.logger.logService('restarted', id, `Restart count=${svc.restartCount}`);
    }
    return startRes;
  }

  // =========================================================================
  // QUERIES
  // =========================================================================
  public getStatus(id: string): ServiceInstance | undefined {
    return this.services.get(id);
  }

  public listServices(): ServiceInstance[] {
    return Array.from(this.services.values());
  }

  public getRunningCount(): number {
    return Array.from(this.services.values()).filter((s) => s.state === 'RUNNING').length;
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
