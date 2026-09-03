// services.ts
// Service model types for CoreProvider

export type ServiceStatus = 'running' | 'stopped' | 'failed' | 'starting' | 'stopping';
export type StartupMode = 'automatic' | 'manual' | 'disabled';

export interface CoreService {
  name: string;
  displayName: string;
  description: string;
  status: ServiceStatus;
  startupMode: StartupMode;
  pid?: number;
  dependencies: string[];
  restartCount: number;
  lastStartedAt?: number;
  lastErrorMessage?: string;
}
