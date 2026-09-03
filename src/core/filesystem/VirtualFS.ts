// VirtualFS.ts
// Authoritative TypeScript binding implementing rocket/filesystem/virtual_fs.rocket
// Connects /proc, /sys, and /dev dynamically to SystemManifest and runtime state

import { SystemManifest } from '../manifest/SystemManifest';

const BOOT_TIMESTAMP = Date.now();

export class VirtualFS {
  public static getProcVersion(): string {
    const v = SystemManifest.VERSION;
    return `${v.osName} version ${v.osVersion} (${v.kernelArchitecture}) (rocketc ${v.rocketCompilerVersion}) (LLVM 22.1.6) #1 SMP PREEMPT Build ${v.buildNumber}\n`;
  }

  public static getProcUptime(): string {
    const uptimeSec = Math.floor((Date.now() - BOOT_TIMESTAMP) / 1000);
    return `${uptimeSec}.00 ${uptimeSec}.00\n`;
  }

  public static getProcMeminfo(): string {
    const totalKb = SystemManifest.HARDWARE.totalMemoryMb * 1024;
    const usedKb = Math.floor(totalKb * 0.28);
    const freeKb = totalKb - usedKb;

    return (
      `MemTotal:       ${totalKb} kB\n` +
      `MemFree:        ${freeKb} kB\n` +
      `MemAvailable:   ${freeKb} kB\n` +
      `Buffers:           40960 kB\n` +
      `Cached:           131072 kB\n` +
      `SwapTotal:             0 kB\n` +
      `SwapFree:              0 kB\n`
    );
  }

  public static getProcCpuinfo(): string {
    const hw = SystemManifest.HARDWARE;
    let output = '';
    for (let i = 0; i < hw.logicalCores; i++) {
      output +=
        `processor       : ${i}\n` +
        `model name      : ${hw.cpuModel}\n` +
        `cpu MHz         : ${(hw.baseClockGhz * 1000).toFixed(3)}\n` +
        `cache size      : 16384 KB\n` +
        `flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss ht syscall nx lm constant_tsc\n\n`;
    }
    return output;
  }

  public static getProcProcesses(): string {
    return (
      `PID  TTY      TIME     CMD\n` +
      `  1  ?        00:00:01 systemd-init\n` +
      ` 42  ?        00:00:00 rocket_vfs\n` +
      ` 88  ?        00:00:00 compositor\n` +
      `105  ?        00:00:00 audio_synth\n` +
      `250  tty1     00:00:00 rsh\n`
    );
  }

  public static getSysPlatform(): string {
    const v = SystemManifest.VERSION;
    return (
      `OS_NAME="${v.osName}"\n` +
      `OS_VERSION="${v.osVersion}"\n` +
      `PLATFORM_TARGET="${v.platformTarget}"\n` +
      `BOOT_MODE="${v.bootMode}"\n` +
      `BUILD_CHANNEL="${v.buildChannel}"\n`
    );
  }

  public static getSysCapabilities(): string {
    return JSON.stringify(
      {
        realFileSystem: true,
        indexedDbPersistence: true,
        multiWorkspace: true,
        audioSynthesis: true,
        windowManagerV2: true,
        unixPermissions: true,
        userPrivilegeElevation: true,
        virtualProcFs: true,
      },
      null,
      2
    ) + '\n';
  }

  public static getSysDeviceNvme0(): string {
    const hw = SystemManifest.HARDWARE;
    return (
      `DRIVER: nvme_vfs\n` +
      `STATUS: ONLINE\n` +
      `CAPACITY_GB: ${hw.storageCapacityGb}\n` +
      `STORAGE_CLASS: ${hw.storageType}\n` +
      `BLOCK_SIZE: 4096\n`
    );
  }

  public static getSysDeviceHdaudio0(): string {
    return (
      `DRIVER: hdaudio_synth\n` +
      `STATUS: READY\n` +
      `CHANNELS: 2 (Stereo)\n` +
      `SAMPLE_RATE: 48000 Hz\n` +
      `ENGINE: Procedural WebAudio Synth\n`
    );
  }

  public static getSysDeviceGpu0(): string {
    const hw = SystemManifest.HARDWARE;
    return (
      `DRIVER: liquid_gpu\n` +
      `STATUS: ACCELERATED\n` +
      `RENDERER: ${hw.gpuRenderer}\n` +
      `PAGING: ${hw.pagingMode}\n` +
      `TARGET_FPS: 60\n`
    );
  }

  public static isVirtualPath(path: string): boolean {
    return (
      path.startsWith('/proc') ||
      path.startsWith('/sys') ||
      path.startsWith('/dev')
    );
  }
}
