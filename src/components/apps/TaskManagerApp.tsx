import React, { useState, useEffect } from 'react';
import { WindowState } from '../../types';
import {
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Wifi,
  Square,
  RefreshCw,
  Zap,
  CheckCircle2,
  Info,
  Server
} from 'lucide-react';

interface TaskManagerAppProps {
  windows: WindowState[];
  onCloseWindow?: (id: string) => void;
}

interface ProcessItem {
  id: string;
  pid: number;
  name: string;
  type: 'app' | 'system';
  cpu: number;
  memoryMb: number;
  diskMb: number;
  status: 'running' | 'sleeping';
  windowId?: string;
}

export const TaskManagerApp: React.FC<TaskManagerAppProps> = ({ windows, onCloseWindow }) => {
  const [activeTab, setActiveTab] = useState<'processes' | 'performance' | 'specs'>('processes');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([18, 22, 19, 24, 30, 26, 21, 28, 22, 25, 29, 23, 27]);
  const [memHistory, setMemHistory] = useState<number[]>([38, 38, 39, 39, 40, 40, 41, 41, 40, 42, 41, 41, 42]);
  const [diskSpeed, setDiskSpeed] = useState<number>(4.2);
  const [netSpeed, setNetSpeed] = useState<number>(180);

  // Live background ticker for performance graphs
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuHistory((prev) => {
        const nextVal = Math.max(8, Math.min(85, prev[prev.length - 1] + (Math.random() * 14 - 7)));
        return [...prev.slice(1), Math.round(nextVal)];
      });
      setMemHistory((prev) => {
        const nextVal = Math.max(30, Math.min(55, prev[prev.length - 1] + (Math.random() * 2 - 1)));
        return [...prev.slice(1), Math.round(nextVal)];
      });
      setDiskSpeed(+(Math.random() * 8 + 1.2).toFixed(1));
      setNetSpeed(Math.round(Math.random() * 300 + 80));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  // System processes combined with active open windows
  const processes: ProcessItem[] = [
    // Open user windows
    ...windows.map((win, idx) => ({
      id: `win-${win.id}`,
      pid: 1000 + idx * 12,
      name: win.title,
      type: 'app' as const,
      cpu: idx === 0 ? 3.4 : 0.8,
      memoryMb: 85 + idx * 24,
      diskMb: 1.2,
      status: 'running' as const,
      windowId: win.id,
    })),
    // Background OS daemons
    { id: 'sys-init', pid: 1, name: 'rocket_init (Stage-3 Kernel)', type: 'system', cpu: 0.1, memoryMb: 18, diskMb: 0.1, status: 'running' },
    { id: 'sys-pml4', pid: 2, name: 'pml4_long_mode_mmu', type: 'system', cpu: 0.4, memoryMb: 32, diskMb: 0.0, status: 'running' },
    { id: 'sys-comp', pid: 8, name: 'compositor_liquid_glass_60fps', type: 'system', cpu: 4.8, memoryMb: 142, diskMb: 2.4, status: 'running' },
    { id: 'sys-raylib', pid: 44, name: 'raylib_primitive_adapter', type: 'system', cpu: 2.1, memoryMb: 68, diskMb: 0.8, status: 'running' },
    { id: 'sys-vfs', pid: 88, name: 'rocketfs_virtual_vfs', type: 'system', cpu: 0.3, memoryMb: 45, diskMb: 1.6, status: 'running' },
    { id: 'sys-rsh', pid: 112, name: 'rsh_posix_daemon', type: 'system', cpu: 0.0, memoryMb: 24, diskMb: 0.0, status: 'sleeping' },
    { id: 'sys-net', pid: 156, name: 'virtio_net_controller', type: 'system', cpu: 0.2, memoryMb: 28, diskMb: 0.4, status: 'running' },
  ];

  const handleEndTask = () => {
    if (!selectedProcessId) return;
    const proc = processes.find((p) => p.id === selectedProcessId);
    if (proc && proc.windowId && onCloseWindow) {
      onCloseWindow(proc.windowId);
      setSelectedProcessId(null);
    }
  };

  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentMem = memHistory[memHistory.length - 1];
  const selectedProc = processes.find((p) => p.id === selectedProcessId);

  return (
    <div id="task-manager-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Liquid Glass Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'processes'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Processes ({processes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Performance</span>
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'specs'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>System Specs</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeTab === 'processes' && selectedProc?.type === 'app' && (
            <button
              onClick={handleEndTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-all shadow-sm"
            >
              <Square className="w-3 h-3 fill-rose-300" />
              <span>End Task</span>
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CPU: {currentCpu}%</span>
            <span className="text-slate-600">|</span>
            <span>RAM: {(16 * (currentMem / 100)).toFixed(1)} GB</span>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: PROCESSES */}
        {activeTab === 'processes' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-900/50 border-b border-white/10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-right">PID</div>
              <div className="col-span-2 text-right">CPU %</div>
              <div className="col-span-2 text-right">Memory</div>
              <div className="col-span-1 text-center">Status</div>
            </div>

            {/* Processes List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {processes.map((proc) => {
                const isSelected = selectedProcessId === proc.id;
                return (
                  <div
                    key={proc.id}
                    onClick={() => setSelectedProcessId(proc.id)}
                    className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-sky-500/20 border-l-2 border-sky-400 text-white'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="col-span-5 flex items-center gap-2.5 truncate">
                      {proc.type === 'app' ? (
                        <div className="p-1 rounded bg-sky-500/20 text-sky-300">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-slate-800 text-slate-400">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="font-medium truncate">{proc.name}</span>
                      {proc.type === 'system' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 font-mono">
                          Kernel
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-right font-mono text-slate-400">{proc.pid}</div>
                    <div className={`col-span-2 text-right font-mono ${proc.cpu > 2 ? 'text-sky-300 font-bold' : 'text-slate-400'}`}>
                      {proc.cpu.toFixed(1)}%
                    </div>
                    <div className="col-span-2 text-right font-mono text-slate-300">
                      {proc.memoryMb} MB
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PERFORMANCE */}
        {activeTab === 'performance' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">CPU Utilization</span>
                  <Cpu className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-light text-white tracking-tight">{currentCpu}%</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">3.80 GHz • 16 Cores / 32 Threads</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Memory (RAM)</span>
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-light text-white tracking-tight">{(16 * (currentMem / 100)).toFixed(1)} / 16.0 GB</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">{currentMem}% In Use (LPDDR5 6400 MT/s)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">NVMe Disk I/O</span>
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-light text-white tracking-tight">{diskSpeed} MB/s</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">Read/Write Bandwidth</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Network Throughput</span>
                  <Wifi className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-light text-white tracking-tight">{netSpeed} KB/s</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">VirtIO Ethernet Adapter</div>
              </div>
            </div>

            {/* Live SVG Graph for CPU */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Processor Real-Time Execution Graph</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ring 0 PML4 Page Faults & Microkernel Scheduling</p>
                </div>
                <span className="font-mono text-xs font-bold text-sky-400">{currentCpu}% Active</span>
              </div>

              <div className="h-36 w-full relative bg-black/40 rounded-xl overflow-hidden border border-white/5 p-2">
                {/* Grid Lines */}
                <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none opacity-10">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="border-b border-r border-white" />
                  ))}
                </div>

                {/* SVG Polyline */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 120 100">
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <polygon
                    fill="url(#cpuGrad)"
                    points={`0,100 ${cpuHistory
                      .map((val, idx) => `${(idx / (cpuHistory.length - 1)) * 120},${100 - val}`)
                      .join(' ')} 120,100`}
                  />
                  {/* Line stroke */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={cpuHistory
                      .map((val, idx) => `${(idx / (cpuHistory.length - 1)) * 120},${100 - val}`)
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SPECS */}
        {activeTab === 'specs' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span>Processor & Hardware Architecture</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Processor Model</span>
                  <div className="text-slate-200 font-semibold">Rocket Ultra Silicon x86_64 v3</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Cores / Threads</span>
                  <div className="text-slate-200 font-semibold">16 Cores (8P + 8E), 32 Threads</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Base Frequency</span>
                  <div className="text-slate-200 font-semibold">3.80 GHz (Max Boost 5.40 GHz)</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">L1 / L2 / L3 Cache</span>
                  <div className="text-slate-200 font-semibold">1 MB / 16 MB / 36 MB Unified</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Operating System & Kernel Details</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">OS Version</span>
                  <div className="text-slate-200 font-semibold">RocketOS 2.1.0-native Long Mode</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Paging & MMU</span>
                  <div className="text-slate-200 font-semibold">PML4 4-Level Paging (48-bit VA, CR3 mapped)</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Compiler Toolchain</span>
                  <div className="text-emerald-300 font-semibold">rocketc 2.1 (LLVM 22.1.6 Backend)</div>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Graphics Compositor</span>
                  <div className="text-sky-300 font-semibold">Raylib 6.0 Safe Primitive Adapter</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
