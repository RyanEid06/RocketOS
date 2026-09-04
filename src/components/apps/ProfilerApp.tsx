import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Cpu,
  Flame,
  Zap,
  Play,
  RotateCcw,
  BarChart2,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Download,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface FlameFrame {
  name: string;
  totalTimeMs: number;
  selfTimeMs: number;
  allocs: number;
  depth: number;
  color: string;
  children?: FlameFrame[];
}

interface BenchmarkItem {
  id: string;
  name: string;
  category: 'Memory' | 'Compute' | 'SIMD' | 'Graphics';
  rocketScore: number;
  cppScore: number;
  rustScore: number;
  pythonScore: number;
  unit: string;
  higherIsBetter: boolean;
}

export const ProfilerApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flamegraph' | 'benchmarks' | 'memory'>('flamegraph');
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(100);
  const [selectedFrame, setSelectedFrame] = useState<FlameFrame | null>(null);

  // Sample Flamegraph frames based on Rocket 2.1 compiler runtime
  const flameHierarchy: FlameFrame[] = [
    {
      name: 'main() [entry]',
      totalTimeMs: 16.42,
      selfTimeMs: 0.82,
      allocs: 14,
      depth: 0,
      color: '#f97316',
      children: [
        {
          name: 'render_frame()',
          totalTimeMs: 9.15,
          selfTimeMs: 1.2,
          allocs: 4,
          depth: 1,
          color: '#fb923c',
          children: [
            {
              name: 'raylib.clear_background()',
              totalTimeMs: 1.45,
              selfTimeMs: 1.45,
              allocs: 0,
              depth: 2,
              color: '#38bdf8',
            },
            {
              name: 'motion.ease_in_cubic()',
              totalTimeMs: 2.1,
              selfTimeMs: 2.1,
              allocs: 0,
              depth: 2,
              color: '#38bdf8',
            },
            {
              name: 'raylib.draw_circle()',
              totalTimeMs: 4.4,
              selfTimeMs: 4.4,
              allocs: 2,
              depth: 2,
              color: '#0284c7',
            },
          ],
        },
        {
          name: 'json.parse_simd()',
          totalTimeMs: 4.25,
          selfTimeMs: 0.95,
          allocs: 12,
          depth: 1,
          color: '#a855f7',
          children: [
            {
              name: 'string.slice_zero_copy()',
              totalTimeMs: 1.8,
              selfTimeMs: 1.8,
              allocs: 0,
              depth: 2,
              color: '#c084fc',
            },
            {
              name: 'simd_scan_structural_quotes()',
              totalTimeMs: 1.5,
              selfTimeMs: 1.5,
              allocs: 0,
              depth: 2,
              color: '#c084fc',
            },
          ],
        },
        {
          name: 'arc_retain_check()',
          totalTimeMs: 2.2,
          selfTimeMs: 2.2,
          allocs: 0,
          depth: 1,
          color: '#10b981',
        },
      ],
    },
  ];

  const benchmarks: BenchmarkItem[] = [
    {
      id: 'simd-json',
      name: 'SIMD JSON Parser Throughput',
      category: 'SIMD',
      rocketScore: 3.42,
      cppScore: 3.51,
      rustScore: 3.48,
      pythonScore: 0.18,
      unit: 'GB/s',
      higherIsBetter: true,
    },
    {
      id: 'arc-alloc',
      name: 'Thread-Confined ARC Alloc/Dealloc',
      category: 'Memory',
      rocketScore: 48.6,
      cppScore: 42.1,
      rustScore: 51.2,
      pythonScore: 3.2,
      unit: 'Mops/s',
      higherIsBetter: true,
    },
    {
      id: 'string-slice',
      name: 'UTF-8 String Slicing Latency',
      category: 'Compute',
      rocketScore: 1.15,
      cppScore: 1.12,
      rustScore: 1.18,
      pythonScore: 18.4,
      unit: 'ns/op',
      higherIsBetter: false,
    },
    {
      id: 'raylib-draw',
      name: 'Raylib 2D Hardware Draw Calls',
      category: 'Graphics',
      rocketScore: 120500,
      cppScore: 122000,
      rustScore: 119800,
      pythonScore: 14200,
      unit: 'sprites/frame',
      higherIsBetter: true,
    },
  ];

  const runAllBenchmarks = () => {
    setIsBenchmarking(true);
    setBenchmarkProgress(0);
    soundEngine.playClick();

    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setBenchmarkProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsBenchmarking(false);
        soundEngine.playSuccess();
      }
    }, 200);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket Flamegraph & Benchmark Profiler</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30 font-mono">
            LLVM 22.1.6
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('flamegraph')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'flamegraph' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Flamegraph</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'benchmarks' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>Microbenchmarks</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'memory' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>ARC Memory</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'flamegraph' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Call Stack Flamegraph Trace</h2>
                <p className="text-xs text-slate-400">
                  Sampled at 1,000 Hz via hardware performance counters. Click any block to inspect latency and allocs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Frame Time: 16.42 ms (60.9 FPS)</span>
              </div>
            </div>

            {/* Interactive Flame Stack Canvas */}
            <div className="flex-1 bg-slate-900/70 rounded-2xl border border-white/10 p-5 flex flex-col justify-end gap-2 overflow-y-auto custom-scrollbar">
              {/* Top Row: Leaf functions */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setSelectedFrame({ name: 'raylib.clear_background()', totalTimeMs: 1.45, selfTimeMs: 1.45, allocs: 0, depth: 2, color: '#38bdf8' })}
                  className="flex-1 py-3 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold truncate transition-all text-center"
                >
                  raylib.clear_background() (1.45ms)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'motion.ease_in_cubic()', totalTimeMs: 2.1, selfTimeMs: 2.1, allocs: 0, depth: 2, color: '#38bdf8' })}
                  className="flex-1 py-3 px-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-mono font-semibold truncate transition-all text-center"
                >
                  motion.ease_in_cubic() (2.1ms)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'raylib.draw_circle()', totalTimeMs: 4.4, selfTimeMs: 4.4, allocs: 2, depth: 2, color: '#0284c7' })}
                  className="flex-[2] py-3 px-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-mono font-semibold truncate transition-all text-center"
                >
                  raylib.draw_circle() (4.4ms)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'string.slice_zero_copy()', totalTimeMs: 1.8, selfTimeMs: 1.8, allocs: 0, depth: 2, color: '#c084fc' })}
                  className="flex-1 py-3 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-semibold truncate transition-all text-center"
                >
                  string.slice() (1.8ms)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'simd_scan_structural_quotes()', totalTimeMs: 1.5, selfTimeMs: 1.5, allocs: 0, depth: 2, color: '#c084fc' })}
                  className="flex-1 py-3 px-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-mono font-semibold truncate transition-all text-center"
                >
                  simd_scan() (1.5ms)
                </button>
              </div>

              {/* Middle Row: Calling routines */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setSelectedFrame({ name: 'render_frame()', totalTimeMs: 9.15, selfTimeMs: 1.2, allocs: 4, depth: 1, color: '#fb923c' })}
                  className="flex-[4] py-3.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-semibold truncate transition-all text-center shadow-md"
                >
                  render_frame() (9.15ms / 55.7%)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'json.parse_simd()', totalTimeMs: 4.25, selfTimeMs: 0.95, allocs: 12, depth: 1, color: '#a855f7' })}
                  className="flex-[2] py-3.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-mono font-semibold truncate transition-all text-center shadow-md"
                >
                  json.parse_simd() (4.25ms / 25.8%)
                </button>
                <button
                  onClick={() => setSelectedFrame({ name: 'arc_retain_check()', totalTimeMs: 2.2, selfTimeMs: 2.2, allocs: 0, depth: 1, color: '#10b981' })}
                  className="flex-1 py-3.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-semibold truncate transition-all text-center shadow-md"
                >
                  arc_retain (2.2ms)
                </button>
              </div>

              {/* Bottom Row: Root Entry */}
              <div className="w-full">
                <button
                  onClick={() => setSelectedFrame({ name: 'main() [entry]', totalTimeMs: 16.42, selfTimeMs: 0.82, allocs: 14, depth: 0, color: '#f97316' })}
                  className="w-full py-4 px-4 rounded-xl bg-orange-700 hover:bg-orange-600 text-white text-xs font-mono font-bold truncate transition-all text-center shadow-lg"
                >
                  fn main() -&gt; Int (16.42ms / 100.0%)
                </button>
              </div>
            </div>

            {/* Selected Frame Detail Callout */}
            {selectedFrame && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400">Frame:</span>{' '}
                  <span className="text-orange-400 font-bold">{selectedFrame.name}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-300">
                  <span>Total: <strong>{selectedFrame.totalTimeMs} ms</strong></span>
                  <span>Self: <strong>{selectedFrame.selfTimeMs} ms</strong></span>
                  <span>ARC Allocs: <strong>{selectedFrame.allocs}</strong></span>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'benchmarks' ? (
          /* Microbenchmarks Tab */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Language Runtime Microbenchmarks</h2>
                <p className="text-xs text-slate-400">
                  Comparing Rocket 2.1 ABI v1 (LLVM -O3) against industry systems languages.
                </p>
              </div>
              <button
                onClick={runAllBenchmarks}
                disabled={isBenchmarking}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-md transition-all"
              >
                <Play className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
                <span>{isBenchmarking ? `Running (${benchmarkProgress}%)` : 'Run All Benchmarks'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {benchmarks.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{b.name}</span>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {b.category}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      Rocket: {b.rocketScore} {b.unit}
                    </span>
                  </div>

                  {/* Visual Relative Bar Comparison */}
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-orange-400 font-bold">Rocket:</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: '96%' }} />
                      </div>
                      <span className="w-20 text-right text-slate-300">{b.rocketScore} {b.unit}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-16 text-sky-400">C++20:</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: '98%' }} />
                      </div>
                      <span className="w-20 text-right text-slate-400">{b.cppScore} {b.unit}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-16 text-amber-400">Rust:</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '97%' }} />
                      </div>
                      <span className="w-20 text-right text-slate-400">{b.rustScore} {b.unit}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-16 text-slate-500">Python:</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-slate-600 rounded-full" style={{ width: '8%' }} />
                      </div>
                      <span className="w-20 text-right text-slate-500">{b.pythonScore} {b.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ARC Memory & Cache Tab */
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Thread-Confined ARC & Cache Dynamics</h2>
              <p className="text-xs text-slate-400">
                Deterministic reference counting with zero stop-the-world pauses.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
                <div className="text-xs text-slate-400 font-mono">L1 Data Cache Hit Rate</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">98.4%</div>
                <div className="text-[10px] text-slate-500">Zero-copy string layout</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
                <div className="text-xs text-slate-400 font-mono">Stack Confinement Ratio</div>
                <div className="text-2xl font-bold font-mono text-sky-400">91.2%</div>
                <div className="text-[10px] text-slate-500">91% allocations never hit heap</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-1">
                <div className="text-xs text-slate-400 font-mono">Atomic Promote Latency</div>
                <div className="text-2xl font-bold font-mono text-purple-400">12.8 ns</div>
                <div className="text-[10px] text-slate-500">Thread graph promotion</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Active Memory Allocations By Struct Type
              </h3>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="p-2 rounded-xl bg-slate-950 flex items-center justify-between">
                  <span className="text-sky-300">String (UTF-8 bytes + len)</span>
                  <span className="text-slate-400">1,240 live (38.4 KB) • 0 leaks</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 flex items-center justify-between">
                  <span className="text-sky-300">Array[T] (Copy-on-write buffer)</span>
                  <span className="text-slate-400">312 live (114.2 KB) • 0 leaks</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 flex items-center justify-between">
                  <span className="text-sky-300">Option[T] / Result[T, E]</span>
                  <span className="text-slate-400">840 live (0 bytes - unboxed)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
