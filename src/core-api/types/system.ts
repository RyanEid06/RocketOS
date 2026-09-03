// system.ts
// System information, manifest, and capability definitions

export interface SystemManifestInfo {
  osName: string;
  osVersion: string;
  codename: string;
  buildNumber: string;
  kernelArchitecture: string;
  rocketCompilerVersion: string;
  abiVersion: string;
  protocolVersion: number;
  releaseDate: string;
  hardware: {
    cpuModel: string;
    cores: number;
    logicalCores: number;
    clockSpeedGhz: number;
    totalMemoryBytes: number;
    totalDiskBytes: number;
    pagingScheme: string;
  };
}

export interface PlatformCapabilities {
  nativeCoreHost: boolean;
  virtualMemoryPaging: boolean;
  directFileSystem: boolean;
  processIsolation: boolean;
  networkSockets: boolean;
  hardwareAudioSynthesis: boolean;
  proceduralGraphics2D: boolean;
  userElevation: boolean;
  storageProvider: 'rocket-native-vfs' | 'browser-indexeddb';
}

export interface SystemStatusInfo {
  status: 'healthy' | 'degraded' | 'recovering';
  uptimeSeconds: number;
  activeProcesses: number;
  runningServices: number;
  cpuUsagePercent: number;
  memoryUsedBytes: number;
  diskUsedBytes: number;
  currentUserId: number;
}
