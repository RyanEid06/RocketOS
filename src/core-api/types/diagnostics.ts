// diagnostics.ts
// Diagnostic information returned by CoreProvider

export interface CoreDiagnostics {
  providerType: 'rocket-core' | 'browser-fallback';
  providerName: string;
  protocolVersion: number;
  engineIdentity: string;
  compilerIdentity: string;
  runtimeAbi: string;
  bootId: string;
  bootTimestampMs: number;
  uptimeSeconds: number;
  storageBackend: string;
  activeProcessesCount: number;
  managedInodesCount: number;
  hostEndpoints?: {
    httpUrl?: string;
    boundHost?: string;
    boundPort?: number;
  };
}
