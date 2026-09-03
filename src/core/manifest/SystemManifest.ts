// SystemManifest.ts
// Single source of truth for RocketOS identity, hardware specifications, and kernel telemetry

export interface HardwareSpec {
  cpuModel: string;
  logicalCores: number;
  baseClockGhz: number;
  totalMemoryMb: number;
  storageCapacityGb: number;
  storageType: string;
  gpuRenderer: string;
  pagingMode: string;
}

export interface SystemVersion {
  osName: string;
  osVersion: string;
  milestone: string;
  buildNumber: number;
  buildChannel: 'Release' | 'Beta' | 'Alpha' | 'Nightly' | 'Developer';
  rocketCompilerVersion: string;
  kernelArchitecture: string;
  platformTarget: string;
  bootMode: string;
}

export class SystemManifest {
  public static readonly VERSION: SystemVersion = {
    osName: 'RocketOS',
    osVersion: '0.1.0-alpha',
    milestone: 'RocketOS 0.1 Alpha Foundation',
    buildNumber: 105,
    buildChannel: 'Alpha',
    rocketCompilerVersion: '3.0.0-WP14',
    kernelArchitecture: 'x86_64',
    platformTarget: 'Browser VFS + LLVM Native Target',
    bootMode: 'UEFI Long Mode (Ring 0 / Protected)',
  };

  public static readonly HARDWARE: HardwareSpec = {
    cpuModel: 'Rocket Virtual Quantum Core v2 (8-Core SMT)',
    logicalCores: 8,
    baseClockGhz: 3.6,
    totalMemoryMb: 8192,
    storageCapacityGb: 256,
    storageType: 'NVMe Virtual Disk (IndexedDB VFS)',
    gpuRenderer: 'Liquid Glass Compositor (WebGL / Canvas2D)',
    pagingMode: 'PML4 4-Level Paging (48-bit Virtual Addressing)',
  };

  public static getBanner(): string {
    return `${this.VERSION.osName} ${this.VERSION.osVersion} (${this.VERSION.kernelArchitecture}) - Kernel Build ${this.VERSION.buildNumber}`;
  }

  public static getHardwareSummary(): string {
    return `${this.HARDWARE.cpuModel} • ${this.HARDWARE.totalMemoryMb / 1024} GB RAM • ${this.HARDWARE.storageCapacityGb} GB ${this.HARDWARE.storageType}`;
  }
}
