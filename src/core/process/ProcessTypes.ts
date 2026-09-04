// ProcessTypes.ts
// TypeScript bindings matching rocket/process/manager.rocket

export type ProcessState = 'RUNNING' | 'READY' | 'SLEEPING' | 'BLOCKED' | 'STOPPED' | 'ZOMBIE';

export interface ProcessCapabilities {
  canElevate: boolean;
  canAccessHardware: boolean;
  canNetwork: boolean;
  canSpawn: boolean;
  canIpc: boolean;
}

export interface ResourceAccounting {
  memoryRssBytes: number;
  virtualMemoryBytes: number;
  cpuPercentTenth: number; // e.g. 24 = 2.4%
  ioReadBytes: number;
  ioWriteBytes: number;
}

export type ProcessPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'REALTIME';

export interface ProcessRecord {
  pid: number;
  ppid: number;
  uid: number;
  gid: number;
  appId: string;
  name: string;
  state: ProcessState;
  startTimeEpochMs: number;
  sessionId: string;
  workspaceId: number;
  accounting: ResourceAccounting;
  exitStatus: number;
  capabilities: ProcessCapabilities;
  windowId?: string;
  isBackgroundDaemon: boolean;
  priority?: ProcessPriority;
  threadsCount?: number;
  cpuQuotaPercent?: number; // 1 - 100%
  cpuAffinity?: number[]; // e.g. [0, 1]
}

export interface SpawnProcessOptions {
  appId: string;
  name?: string;
  ppid?: number;
  uid?: number;
  gid?: number;
  sessionId?: string;
  workspaceId?: number;
  windowId?: string;
  isBackgroundDaemon?: boolean;
  initialMemoryBytes?: number;
}
