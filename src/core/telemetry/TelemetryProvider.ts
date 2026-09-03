// TelemetryProvider.ts
// Authoritative Telemetry Provider for RocketOS
// Implements rocket/telemetry/provenance.rocket domain model
// Exposes honest provenance labels: REAL, ESTIMATED, SIMULATED, UNAVAILABLE

import { BrowserPlatformProvider } from '../../platform/browser/BrowserPlatformProvider';
import { SystemManifest } from '../manifest/SystemManifest';
import { ProcessManager } from '../process/ProcessManager';
import { ServiceManager } from '../services/ServiceManager';
import { SessionManager } from '../sessions/SessionManager';
import { TelemetryMetric, TelemetrySnapshot } from './TelemetryTypes';

export class TelemetryProvider {
  private static instance: TelemetryProvider;

  private platform = BrowserPlatformProvider.getInstance();
  private procMgr = ProcessManager.getInstance();
  private svcMgr = ServiceManager.getInstance();
  private sessionMgr = SessionManager.getInstance();
  private listeners: Set<() => void> = new Set();

  private storageEstimate = { usageMb: 24, quotaMb: 2048 };

  private constructor() {
    this.refreshStorageEstimate();
    // Periodic refresh
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        this.notify();
      }, 2000);
    }
  }

  public static getInstance(): TelemetryProvider {
    if (!TelemetryProvider.instance) {
      TelemetryProvider.instance = new TelemetryProvider();
    }
    return TelemetryProvider.instance;
  }

  private async refreshStorageEstimate(): Promise<void> {
    try {
      const est = await this.platform.getStorageEstimate();
      this.storageEstimate = {
        usageMb: Math.round(est.usageBytes / (1024 * 1024)),
        quotaMb: Math.round(est.quotaBytes / (1024 * 1024)),
      };
      this.notify();
    } catch {
      // Fallback defaults
    }
  }

  public getSnapshot(): TelemetrySnapshot {
    const session = this.sessionMgr.getCurrentSession();
    const uptimeSeconds = Math.floor((Date.now() - session.startTimeEpochMs) / 1000);
    const isOnline = this.platform.isOnline();
    const procs = this.procMgr.getAllProcesses();
    const activeProcessCount = procs.filter((p) => p.state !== 'ZOMBIE').length;
    const activeServiceCount = this.svcMgr.getRunningCount();

    // Calculate memory based on real processes
    const totalMemoryMb = SystemManifest.HARDWARE.totalMemoryMb;
    const processRssMb = Math.round(
      procs.reduce((acc, p) => acc + p.accounting.memoryRssBytes, 0) / (1024 * 1024)
    );
    const memoryUsedMb = Math.min(totalMemoryMb - 512, processRssMb + 480);

    // Calculate CPU utilization based on real processes
    const baseCpu = 3.5;
    const processCpu = procs.reduce((acc, p) => acc + p.accounting.cpuPercentTenth, 0) / 10;
    const cpuUtilizationPercent = Math.min(98, Math.max(2, parseFloat((baseCpu + processCpu).toFixed(1))));

    const metrics: TelemetryMetric[] = [
      {
        id: 'net-status',
        name: 'Host Network Status',
        category: 'network',
        valueDisplay: isOnline ? 'Online (Host Interface)' : 'Offline',
        rawNumber: isOnline ? 1 : 0,
        unit: 'state',
        provenance: 'REAL',
        provenanceNote: 'Directly queried from browser navigator.onLine API',
      },
      {
        id: 'vfs-storage',
        name: 'IndexedDB Virtual Disk Space',
        category: 'storage',
        valueDisplay: `${this.storageEstimate.usageMb} MB / ${this.storageEstimate.quotaMb} MB`,
        rawNumber: this.storageEstimate.usageMb,
        unit: 'MB',
        provenance: 'ESTIMATED',
        provenanceNote: 'Calculated using browser navigator.storage.estimate()',
      },
      {
        id: 'proc-count',
        name: 'RocketOS Process Table',
        category: 'processes',
        valueDisplay: `${activeProcessCount} active tasks`,
        rawNumber: activeProcessCount,
        unit: 'processes',
        provenance: 'REAL',
        provenanceNote: 'Genuine RocketOS process table tracked by ProcessManager',
      },
      {
        id: 'svc-count',
        name: 'Supervised Daemons',
        category: 'services',
        valueDisplay: `${activeServiceCount} / ${this.svcMgr.listServices().length} running`,
        rawNumber: activeServiceCount,
        unit: 'daemons',
        provenance: 'REAL',
        provenanceNote: 'Authoritative ServiceManager background supervisor state',
      },
      {
        id: 'uptime',
        name: 'Session Monotonic Uptime',
        category: 'system',
        valueDisplay: `${uptimeSeconds}s`,
        rawNumber: uptimeSeconds,
        unit: 'seconds',
        provenance: 'REAL',
        provenanceNote: 'Monotonic timer since RocketOS desktop session initialization',
      },
      {
        id: 'cpu-load',
        name: 'Simulated Core Utilization',
        category: 'cpu',
        valueDisplay: `${cpuUtilizationPercent}%`,
        rawNumber: cpuUtilizationPercent,
        unit: '%',
        provenance: 'SIMULATED',
        provenanceNote: 'Load dynamically calculated from active processes and window compositing',
      },
      {
        id: 'pml4-map',
        name: 'PML4 Page Table Allocation',
        category: 'memory',
        valueDisplay: 'CR3=0x1000 (4-Level Identity)',
        rawNumber: 4096,
        unit: 'frames',
        provenance: 'SIMULATED',
        provenanceNote: 'Architectural model of x86_64 48-bit virtual page table',
      },
      {
        id: 'thermal-sensor',
        name: 'CPU Die Temperature',
        category: 'hardware',
        valueDisplay: 'Unavailable',
        rawNumber: 0,
        unit: '°C',
        provenance: 'UNAVAILABLE',
        provenanceNote: 'Browser security sandbox forbids access to host thermal registers',
      },
      {
        id: 'ring0-registers',
        name: 'Native Ring 0 CR0/CR3 Registers',
        category: 'hardware',
        valueDisplay: 'Protected',
        rawNumber: 0,
        unit: 'registers',
        provenance: 'UNAVAILABLE',
        provenanceNote: 'Native hardware interrupts and MSRs cannot run directly in browser',
      },
    ];

    return {
      metrics,
      cpuUtilizationPercent,
      memoryUsedMb,
      memoryTotalMb: SystemManifest.HARDWARE.totalMemoryMb,
      storageUsedMb: this.storageEstimate.usageMb,
      storageTotalMb: SystemManifest.HARDWARE.storageCapacityGb * 1024,
      isOnline,
      uptimeSeconds,
      activeProcessCount,
      activeServiceCount,
      kernelState: 'Running (Ring 3 Sandboxed + Simulated Ring 0 MMU)',
    };
  }

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
