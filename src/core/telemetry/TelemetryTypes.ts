// TelemetryTypes.ts
// TypeScript bindings matching rocket/telemetry/provenance.rocket

export type MetricProvenance = 'REAL' | 'ESTIMATED' | 'SIMULATED' | 'UNAVAILABLE';

export interface TelemetryMetric {
  id: string;
  name: string;
  category: 'network' | 'storage' | 'processes' | 'services' | 'system' | 'cpu' | 'memory' | 'hardware';
  valueDisplay: string;
  rawNumber: number;
  unit: string;
  provenance: MetricProvenance;
  provenanceNote: string;
}

export interface TelemetrySnapshot {
  metrics: TelemetryMetric[];
  cpuUtilizationPercent: number; // Simulated
  memoryUsedMb: number; // Accounting based on real processes
  memoryTotalMb: number; // SystemManifest
  storageUsedMb: number; // Browser / VFS estimate
  storageTotalMb: number;
  isOnline: boolean; // Real
  uptimeSeconds: number; // Real
  activeProcessCount: number; // Real
  activeServiceCount: number; // Real
  kernelState: string;
}
