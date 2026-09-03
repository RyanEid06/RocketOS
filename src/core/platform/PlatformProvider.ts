// PlatformProvider.ts
// Platform capability abstraction distinguishing real host capabilities from simulated OS telemetry

export type CapabilityState = 'REAL_BROWSER' | 'VIRTUAL_PERSISTENT' | 'SIMULATED' | 'UNAVAILABLE';

export interface PlatformCapabilities {
  filesystem: CapabilityState;
  windowManager: CapabilityState;
  audioSynthesis: CapabilityState;
  browserNetworkStatus: CapabilityState;
  networkControl: CapabilityState;
  cpuTelemetry: CapabilityState;
  pml4MemoryTelemetry: CapabilityState;
  nativeKernel: CapabilityState;
  nativeHardwareSensors: CapabilityState;
}

export interface IPlatformProvider {
  getCapabilities(): PlatformCapabilities;
  isOnline(): boolean;
  getStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number }>;
  copyToSystemClipboard(text: string): Promise<boolean>;
  readFromSystemClipboard(): Promise<string | null>;
}
