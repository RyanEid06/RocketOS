// ServiceTypes.ts
// TypeScript bindings matching rocket/services/service_manager.rocket

export type ServiceState = 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'FAILED';

export type StartupMode = 'boot' | 'demand' | 'disabled';

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  startupMode: StartupMode;
  dependencies: string[];
  isCritical: boolean;
  assignedUid: number;
}

export interface ServiceInstance {
  id: string;
  name: string;
  description: string;
  state: ServiceState;
  startupMode: StartupMode;
  dependencies: string[];
  startTimeEpochMs: number;
  restartCount: number;
  statusMessage: string;
  capabilities: string[];
  processId: number;
  isCritical: boolean;
}
