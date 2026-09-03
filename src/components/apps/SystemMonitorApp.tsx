import React, { useState } from 'react';
import { Cpu, HardDrive, Layers, Activity, ShieldCheck, Zap } from 'lucide-react';

export const SystemMonitorApp: React.FC = () => {
  const [tab, setTab] = useState<'resources' | 'paging' | 'interrupts'>('resources');

  return (
    <div id="system-monitor-app" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans text-xs select-none">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setTab('resources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${
            tab === 'resources' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>CPU & Memory</span>
        </button>
        <button
          onClick={() => setTab('paging')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${
            tab === 'paging' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>4-Level Paging (PML4)</span>
        </button>
        <button
          onClick={() => setTab('interrupts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer ${
            tab === 'interrupts' ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Interrupt Table (IDT)</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {tab === 'resources' && (
          <div className="space-y-4 max-w-2xl">
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>CPU Usage (4x x86_64 Cores)</span>
                </span>
                <span className="text-sky-400 font-mono font-bold">14% Load</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-sky-500 h-full rounded-full w-[14%]" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">Core 0: 18%</div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">Core 1: 12%</div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">Core 2: 15%</div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">Core 3: 11%</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Physical Memory Allocation</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">184 MB / 4096 MB</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-emerald-500 h-full rounded-full w-[4.5%]" />
              </div>
              <div className="mt-2 text-slate-400 text-[11px] flex justify-between">
                <span>Free Frames: 1,001,440 frames</span>
                <span>Frame Allocator: Rocket BitMap</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Running Kernel Threads</span>
              </div>
              <div className="divide-y divide-slate-800 text-[11px]">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">kmain (Rocket Core)</span>
                  <span className="text-emerald-400 font-mono">Running (Ring 0)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">framebuffer_compositor</span>
                  <span className="text-emerald-400 font-mono">Running (60 FPS)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-300">ps2_input_poller</span>
                  <span className="text-slate-400 font-mono">Sleeping (IRQ driven)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'paging' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-sky-400 font-bold mb-2">CR3 Register = 0x0000000000001000</div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div>PML4 Entry [0]: Points to PDPT at 0x2000 (Identity Map 0..1GB)</div>
                <div>PML4 Entry [511]: Points to Higher-Half PDPT at 0x3000 (Kernel Space)</div>
                <div>Page Table Flags: Present=1, Writable=1, User=0, NoExecute=0</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'interrupts' && (
          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-amber-400 font-bold mb-2">IDT Vectors Configured via Rocket:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>IRQ 0 (0x20): PIT Timer @ 1000 Hz</div>
                <div>IRQ 1 (0x21): PS/2 Keyboard Input</div>
                <div>IRQ 12 (0x2C): PS/2 Mouse Input</div>
                <div>Vector 0x0E: Page Fault Handler (#PF)</div>
                <div>Vector 0x0D: General Protection Fault (#GP)</div>
                <div>Vector 0x80: Rocket System Call Gate</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
