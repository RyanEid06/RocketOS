// SystemMonitorApp.tsx
// Authoritative System Monitor for RocketOS
// Directly coupled with SystemManifest and TelemetryProvider
// No contradictory hardware values with Terminal, Boot, Task Manager, or Settings

import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Layers, Activity, ShieldCheck, Zap, Info } from 'lucide-react';
import { SystemManifest } from '../../core/manifest/SystemManifest';
import { ProcessManager } from '../../core/process/ProcessManager';
import { ServiceManager } from '../../core/services/ServiceManager';
import { TelemetryProvider } from '../../core/telemetry/TelemetryProvider';
import { TelemetrySnapshot } from '../../core/telemetry/TelemetryTypes';

export const SystemMonitorApp: React.FC = () => {
  const [tab, setTab] = useState<'resources' | 'paging' | 'interrupts'>('resources');

  const telemetry = TelemetryProvider.getInstance();
  const procMgr = ProcessManager.getInstance();
  const svcMgr = ServiceManager.getInstance();

  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(() => telemetry.getSnapshot());

  useEffect(() => {
    return telemetry.subscribe(() => {
      setSnapshot(telemetry.getSnapshot());
    });
  }, [telemetry]);

  const totalMemMb = SystemManifest.HARDWARE.totalMemoryMb;
  const usedMemMb = snapshot.memoryUsedMb;
  const memPercent = Math.min(100, Math.round((usedMemMb / totalMemMb) * 100));

  const totalStorageGb = SystemManifest.HARDWARE.storageCapacityGb;
  const storageUsedMb = snapshot.storageUsedMb;

  return (
    <div id="system-monitor-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={() => setTab('resources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
            tab === 'resources' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>CPU & Memory</span>
        </button>
        <button
          onClick={() => setTab('paging')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
            tab === 'paging' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>4-Level Paging (PML4)</span>
        </button>
        <button
          onClick={() => setTab('interrupts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
            tab === 'interrupts' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Interrupt Table (IDT)</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* ================= RESOURCES TAB ================= */}
        {tab === 'resources' && (
          <div className="space-y-4 max-w-2xl">
            {/* CPU Monitor */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>CPU: {SystemManifest.HARDWARE.cpuModel} ({SystemManifest.HARDWARE.logicalCores} Cores)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">SIMULATED</span>
                  <span className="text-sky-400 font-mono font-bold">{snapshot.cpuUtilizationPercent}% Load</span>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${snapshot.cpuUtilizationPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                {Array.from({ length: 4 }).map((_, idx) => {
                  const corePct = Math.max(1, Math.round(snapshot.cpuUtilizationPercent + ((idx % 2 === 0 ? 2 : -2))));
                  return (
                    <div key={idx} className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      Core {idx}: {corePct}%
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Memory Monitor */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Physical Memory Allocation</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">REAL TASKS</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {usedMemMb} MB / {totalMemMb} MB ({memPercent}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${memPercent}%` }}
                />
              </div>
              <div className="text-slate-400 text-[11px] flex justify-between">
                <span>Free Memory: {totalMemMb - usedMemMb} MB</span>
                <span>Allocator: Rocket BitMap Inode Allocator</span>
              </div>
            </div>

            {/* Active Subsystems */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Supervised Daemons & Kernel Threads</span>
              </div>
              <div className="divide-y divide-slate-800 text-[11px]">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">rocket-init (Bootstrap Daemon)</span>
                  <span className="text-emerald-400 font-mono">Running (PID 1, Ring 0 root)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">rocket-desktop (Compositor & Dock)</span>
                  <span className="text-emerald-400 font-mono">Running (60 FPS, WebGL)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">rocket-fs (Virtual Filesystem Daemon)</span>
                  <span className="text-emerald-400 font-mono">Running (IndexedDB Backed)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">Active Tasks in Process Table</span>
                  <span className="text-sky-400 font-mono">{snapshot.activeProcessCount} Registered Tasks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGING TAB ================= */}
        {tab === 'paging' && (
          <div className="space-y-3 max-w-2xl">
            <div className="p-3 bg-sky-950/20 rounded-xl border border-sky-900/30 text-sky-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Architectural x86_64 4-Level Page Table Translation Model</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">SIMULATED</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">Root Page Directory</div>
                <div className="font-mono text-sm font-bold text-white">CR3 = 0x0000000000100000</div>
                <div className="text-slate-500 text-[10px]">PML4 Base Register</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">Virtual Page Size</div>
                <div className="font-mono text-sm font-bold text-white">4096 Bytes (4 KiB)</div>
                <div className="text-slate-500 text-[10px]">Standard x86_64 Granularity</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200">Virtual Memory Address Space Layout</div>
              <div className="font-mono text-[11px] space-y-1 text-slate-400">
                <div className="flex justify-between border-b border-slate-800/80 py-1">
                  <span className="text-emerald-400">0x0000_0000_0000_0000 - 0x0000_7FFF_FFFF_FFFF</span>
                  <span>User Space (128 TiB)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 py-1">
                  <span className="text-rose-400">0xFFFF_8000_0000_0000 - 0xFFFF_FFFF_FFFF_FFFF</span>
                  <span>Kernel Direct Physical Map (128 TiB)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-sky-400">Canonical Hole (Non-canonical)</span>
                  <span>Protected by CPU MMU</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= INTERRUPTS TAB ================= */}
        {tab === 'interrupts' && (
          <div className="space-y-3 max-w-2xl">
            <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/30 text-purple-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-purple-400" />
                <span>x86_64 Interrupt Descriptor Table (IDT) Specification</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/30 font-semibold">MODEL</span>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="divide-y divide-slate-800 text-[11px]">
                <div className="py-2 flex justify-between">
                  <span className="font-mono text-amber-400 font-semibold">INT 0x00: #DE</span>
                  <span className="text-slate-300">Divide-by-zero Error</span>
                  <span className="text-slate-500">Trap Gate</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-mono text-amber-400 font-semibold">INT 0x0E: #PF</span>
                  <span className="text-slate-300">Page Fault Handler (CR2)</span>
                  <span className="text-slate-500">Interrupt Gate</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-mono text-sky-400 font-semibold">INT 0x20: IRQ 0</span>
                  <span className="text-slate-300">Programmable Interval Timer (PIT)</span>
                  <span className="text-slate-500">1000 Hz Scheduler</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-mono text-sky-400 font-semibold">INT 0x21: IRQ 1</span>
                  <span className="text-slate-300">PS/2 Keyboard Controller</span>
                  <span className="text-slate-500">Scan Code Queue</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-mono text-emerald-400 font-semibold">INT 0x80: SYSCALL</span>
                  <span className="text-slate-300">RocketOS Fast System Call Vector</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
