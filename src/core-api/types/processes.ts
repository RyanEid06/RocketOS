// processes.ts
// Process model types for CoreProvider

export type ProcessStatus = 'running' | 'sleeping' | 'stopped' | 'zombie';

export interface CoreProcess {
  pid: number;
  ppid: number;
  name: string;
  appId?: string;
  commandLine: string;
  status: ProcessStatus;
  cpuPercent: number;
  memoryBytes: number;
  threads: number;
  uid: number;
  startedAt: number;
  priority: number;
}
