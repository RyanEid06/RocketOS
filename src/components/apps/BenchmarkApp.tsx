import React, { useState } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  Download,
  Shield,
  Gauge,
  Clock,
  Flame,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';
import { RocketFS } from '../../core/filesystem/RocketFS';

export interface BenchmarkResult {
  arcScore: number;
  llvmScore: number;
  vfsScore: number;
  graphicsScore: number;
  totalScore: number;
  grade: 'S+' | 'A+' | 'A' | 'B';
  timestamp: string;
}

export const BenchmarkApp: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<BenchmarkResult | null>({
    arcScore: 3840,
    llvmScore: 4210,
    vfsScore: 3120,
    graphicsScore: 3680,
    totalScore: 14850,
    grade: 'A+',
    timestamp: '2026-09-04 11:20',
  });

  const benchmarkSteps = [
    { title: 'Thread-Confined ARC Graph Promotion', desc: 'Stress testing thread boundaries & atomic reference counters' },
    { title: 'LLVM 22.1.6 Vectorization & CodeGen', desc: 'Computing SIMD matrix transformations & Float arithmetic' },
    { title: 'RocketFS Virtual Storage IOPS', desc: 'Executing 10,000 random read/write buffer operations' },
    { title: 'Raylib 2D Window Pipeline & Frame Easing', desc: 'Evaluating bezier curve sweeps and buffer swaps' },
  ];

  const handleRunBenchmark = () => {
    setIsRunning(true);
    setCurrentStep(0);
    setProgress(0);
    soundEngine.play('click');

    const totalSteps = benchmarkSteps.length;
    let step = 0;
    let currentPct = 0;

    const interval = setInterval(() => {
      currentPct += 5;
      setProgress(currentPct);

      if (currentPct % 25 === 0) {
        step++;
        setCurrentStep(Math.min(step, totalSteps - 1));
        soundEngine.play('click');
      }

      if (currentPct >= 100) {
        clearInterval(interval);
        setIsRunning(false);

        // Compute simulated high-fidelity benchmark score
        const arc = Math.floor(3700 + Math.random() * 300);
        const llvm = Math.floor(4100 + Math.random() * 350);
        const vfs = Math.floor(3000 + Math.random() * 250);
        const gfx = Math.floor(3600 + Math.random() * 300);
        const total = arc + llvm + vfs + gfx;

        const res: BenchmarkResult = {
          arcScore: arc,
          llvmScore: llvm,
          vfsScore: vfs,
          graphicsScore: gfx,
          totalScore: total,
          grade: total > 15000 ? 'S+' : 'A+',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };

        setResults(res);
        soundEngine.play('success');

        notificationService.notify({
          title: 'Benchmark Complete',
          message: `Official Rocket Score: ${total.toLocaleString()} (Grade: ${res.grade})`,
          type: 'info',
          appId: 'benchmark',
        });
      }
    }, 150);
  };

  const handleExportReport = () => {
    if (!results) return;
    const reportText = `=========================================
RocketOS 2.1 LTS System Benchmark Report
=========================================
Timestamp: ${results.timestamp}
Host Arch: x86_64 Long Mode
Compiler: rocketc (LLVM 22.1.6 Backend)
ABI: Frozen 2.0 ABI v1

Scores:
- ARC Memory Promotion: ${results.arcScore} pts
- LLVM SIMD Vectorization: ${results.llvmScore} pts
- RocketFS IOPS: ${results.vfsScore} pts
- Raylib 2D Frame Latency: ${results.graphicsScore} pts

TOTAL ROCKET SCORE: ${results.totalScore}
PERFORMANCE RATING: ${results.grade}
=========================================`;

    try {
      RocketFS.getInstance().createFile('/Documents/benchmark_report.txt', reportText);
    } catch {
      // ignore
    }

    soundEngine.play('success');
    notificationService.notify({
      title: 'Report Exported',
      message: 'Saved benchmark_report.txt to /Documents',
      type: 'info',
      appId: 'benchmark',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Rocket System Benchmarker
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                v2.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">ARC concurrency, LLVM CodeGen & VFS throughput validation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunBenchmark}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Run Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
        {/* Active Test Progress Banner (if running) */}
        {isRunning && (
          <div className="mb-6 p-5 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400 animate-pulse" />
                Phase {currentStep + 1} of 4: {benchmarkSteps[currentStep].title}
              </span>
              <span className="font-mono text-cyan-300 font-bold">{progress}%</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {benchmarkSteps[currentStep].desc}
            </p>
            <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Hero Score Showcase */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden">
              <div className="space-y-2 z-10">
                <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                  Total Rocket Score
                </div>
                <div className="text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-md">
                  {results.totalScore.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tested {results.timestamp}</span>
                </div>
              </div>

              <div className="text-center z-10 pr-4">
                <div className="text-5xl font-black font-mono text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  {results.grade}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mt-1">
                  Peak Tier
                </span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  System Architecture
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Kernel ABI</span>
                    <span className="font-mono text-white">Frozen 2.0 ABI v1</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">LLVM Engine</span>
                    <span className="font-mono text-white">22.1.6 CodeGen</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Memory Mgmt</span>
                    <span className="font-mono text-white">Deterministic ARC</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportReport}
                className="w-full mt-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report to /Documents</span>
              </button>
            </div>
          </div>
        )}

        {/* Subsystem Metrics Breakdown */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  ARC Promotions
                </span>
                <span className="font-mono text-white font-bold">{results.arcScore}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Measures atomic promotion across thread-confined task barriers.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  LLVM Vectorization
                </span>
                <span className="font-mono text-white font-bold">{results.llvmScore}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Measures SIMD auto-vectorization and floating-point throughput.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  VFS Buffer IOPS
                </span>
                <span className="font-mono text-white font-bold">{results.vfsScore}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Random read/write IOPS within the RocketFS virtual node hierarchy.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Raylib 2D Latency
                </span>
                <span className="font-mono text-white font-bold">{results.graphicsScore}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Double-buffer frame latency and bezier spline rendering rate.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
