import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CornerDownRight,
  Square,
  Bug,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Search,
  Code2,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface VariableEntry {
  name: string;
  type: string;
  value: string;
  arcRefCount?: number;
  threadConfinement?: string;
  scope: 'Local' | 'Global' | 'Parameter';
  promoted?: boolean;
}

interface StackFrame {
  id: string;
  fnName: string;
  module: string;
  line: number;
  args: string;
}

interface DebugPreset {
  id: string;
  title: string;
  description: string;
  code: string;
  steps: {
    line: number;
    description: string;
    callStack: StackFrame[];
    variables: VariableEntry[];
    stdout?: string;
    arcEvent?: string;
  }[];
}

const DEBUG_PRESETS: DebugPreset[] = [
  {
    id: 'particle-motion',
    title: 'Particle Simulation (ARC & Structs)',
    description: 'Debug struct allocation, pure function updates, and thread-confined ARC tracking',
    code: `import std.string
import std.math
import rocket.motion

struct Particle:
    x: Float
    y: Float
    speed: Float

fn update_particle(p: Particle, dt: Float) -> Particle:
    let new_x = p.x + p.speed * dt
    let new_y = p.y + motion.ease_out_cubic(dt) * 12.0
    return Particle(new_x, new_y, p.speed)

fn main() -> Int:
    let particle = Particle(0.0, 100.0, 15.5)
    let delta_t = 0.016
    let updated = update_particle(particle, delta_t)
    print("Next X position: " + string.from_float(updated.x))
    return 0
`,
    steps: [
      {
        line: 16,
        description: 'Entering fn main() -> Int: frame initialization',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 16, args: '()' }],
        variables: [],
        stdout: '[lldb/rocketc] Process attached to PID 4192 (thread 0)',
      },
      {
        line: 17,
        description: 'Allocating struct Particle(0.0, 100.0, 15.5) on thread-confined heap',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 17, args: '()' }],
        variables: [
          { name: 'particle', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 1, threadConfinement: 'Core 0 (Confined)', scope: 'Local', promoted: false },
        ],
        arcEvent: 'ARC_ALLOC: Particle(0x7fff4020) ref_count=1 [Thread 0 Confined]',
      },
      {
        line: 18,
        description: 'Binding delta_t = 0.016 (IEEE 754 64-bit float)',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 18, args: '()' }],
        variables: [
          { name: 'particle', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 1, threadConfinement: 'Core 0 (Confined)', scope: 'Local', promoted: false },
          { name: 'delta_t', type: 'Float', value: '0.016', scope: 'Local' },
        ],
      },
      {
        line: 11,
        description: 'Stepping into update_particle(p, dt)',
        callStack: [
          { id: 'f2', fnName: 'update_particle(p, dt)', module: 'src/main.rocket', line: 11, args: '(p: Particle, dt: 0.016)' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 19, args: '()' },
        ],
        variables: [
          { name: 'p', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 2, threadConfinement: 'Core 0 (Confined)', scope: 'Parameter', promoted: false },
          { name: 'dt', type: 'Float', value: '0.016', scope: 'Parameter' },
        ],
        arcEvent: 'ARC_RETAIN: Borrowing Particle(0x7fff4020) into callee frame ref_count=2',
      },
      {
        line: 12,
        description: 'Computing new_x = p.x + p.speed * dt = 0.0 + 15.5 * 0.016 = 0.248',
        callStack: [
          { id: 'f2', fnName: 'update_particle(p, dt)', module: 'src/main.rocket', line: 12, args: '(p: Particle, dt: 0.016)' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 19, args: '()' },
        ],
        variables: [
          { name: 'p', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 2, threadConfinement: 'Core 0 (Confined)', scope: 'Parameter', promoted: false },
          { name: 'dt', type: 'Float', value: '0.016', scope: 'Parameter' },
          { name: 'new_x', type: 'Float', value: '0.248', scope: 'Local' },
        ],
      },
      {
        line: 13,
        description: 'Evaluating motion.ease_out_cubic(0.016) * 12.0 and assigning new_y',
        callStack: [
          { id: 'f2', fnName: 'update_particle(p, dt)', module: 'src/main.rocket', line: 13, args: '(p: Particle, dt: 0.016)' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 19, args: '()' },
        ],
        variables: [
          { name: 'p', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 2, threadConfinement: 'Core 0 (Confined)', scope: 'Parameter', promoted: false },
          { name: 'dt', type: 'Float', value: '0.016', scope: 'Parameter' },
          { name: 'new_x', type: 'Float', value: '0.248', scope: 'Local' },
          { name: 'new_y', type: 'Float', value: '100.576', scope: 'Local' },
        ],
      },
      {
        line: 14,
        description: 'Returning newly constructed Particle(0.248, 100.576, 15.5)',
        callStack: [
          { id: 'f2', fnName: 'update_particle(p, dt)', module: 'src/main.rocket', line: 14, args: '(p: Particle, dt: 0.016)' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 19, args: '()' },
        ],
        variables: [
          { name: 'new_x', type: 'Float', value: '0.248', scope: 'Local' },
          { name: 'new_y', type: 'Float', value: '100.576', scope: 'Local' },
          { name: 'return_val', type: 'Particle', value: '{ x: 0.248, y: 100.576, speed: 15.5 }', arcRefCount: 1, threadConfinement: 'Core 0', scope: 'Local', promoted: false },
        ],
        arcEvent: 'ARC_RELEASE: Frame pop p ref_count 2 -> 1',
      },
      {
        line: 20,
        description: 'Returned to main(). Calling print() with formatted output string',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 20, args: '()' }],
        variables: [
          { name: 'particle', type: 'Particle', value: '{ x: 0.0, y: 100.0, speed: 15.5 }', arcRefCount: 1, threadConfinement: 'Core 0', scope: 'Local', promoted: false },
          { name: 'delta_t', type: 'Float', value: '0.016', scope: 'Local' },
          { name: 'updated', type: 'Particle', value: '{ x: 0.248, y: 100.576, speed: 15.5 }', arcRefCount: 1, threadConfinement: 'Core 0', scope: 'Local', promoted: false },
        ],
        stdout: 'Next X position: 0.248',
      },
      {
        line: 21,
        description: 'Terminating main() with exit code 0. Deallocating all confined buffers',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 21, args: '()' }],
        variables: [
          { name: 'exit_code', type: 'Int', value: '0', scope: 'Local' },
        ],
        arcEvent: 'ARC_DEALLOC: particle (ref_count=0), updated (ref_count=0) freed with zero lock contention',
        stdout: 'Process 4192 exited with status 0 (0x0)',
      },
    ],
  },
  {
    id: 'error-propagation',
    title: 'Result[T, E] & Postfix Operator (?)',
    description: 'Observe error unpack and early return semantics in Rocket 2.1 ABI v1',
    code: `import std.string

fn parse_and_increment(text: String) -> Result[Int, String]:
    let value = string.parse_int(text)?
    return Ok(value + 1)

fn main() -> Int:
    let valid_input = "41"
    let res = parse_and_increment(valid_input)
    match res:
        case Ok(num):
            print("Incremented: " + string.from_int(num))
        case Err(msg):
            print("Error: " + msg)
    return 0
`,
    steps: [
      {
        line: 8,
        description: 'Allocating String "41" in valid_input',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 8, args: '()' }],
        variables: [{ name: 'valid_input', type: 'String', value: '"41"', arcRefCount: 1, threadConfinement: 'Core 0', scope: 'Local' }],
      },
      {
        line: 4,
        description: 'Inside parse_and_increment("41"). Evaluating parse_int("41")?',
        callStack: [
          { id: 'f2', fnName: 'parse_and_increment(text)', module: 'src/main.rocket', line: 4, args: '(text: "41")' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 9, args: '()' },
        ],
        variables: [
          { name: 'text', type: 'String', value: '"41"', scope: 'Parameter' },
          { name: 'value', type: 'Int', value: '41', scope: 'Local' },
        ],
        arcEvent: 'POSTFIX_UNPACK: Result::Ok(41) safely unwrapped into value',
      },
      {
        line: 5,
        description: 'Returning Ok(41 + 1) = Ok(42)',
        callStack: [
          { id: 'f2', fnName: 'parse_and_increment(text)', module: 'src/main.rocket', line: 5, args: '(text: "41")' },
          { id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 9, args: '()' },
        ],
        variables: [
          { name: 'return_val', type: 'Result[Int, String]', value: 'Ok(42)', scope: 'Local' },
        ],
      },
      {
        line: 11,
        description: 'Pattern match branch Ok(num) matches with num = 42',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 11, args: '()' }],
        variables: [
          { name: 'res', type: 'Result[Int, String]', value: 'Ok(42)', scope: 'Local' },
          { name: 'num', type: 'Int', value: '42', scope: 'Local' },
        ],
        stdout: 'Incremented: 42',
      },
      {
        line: 15,
        description: 'Exit 0',
        callStack: [{ id: 'f1', fnName: 'main()', module: 'src/main.rocket', line: 15, args: '()' }],
        variables: [{ name: 'exit_status', type: 'Int', value: '0', scope: 'Local' }],
        stdout: 'Process exited normally with code 0',
      },
    ],
  },
];

export const RocketStudioDebugger: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<DebugPreset>(DEBUG_PRESETS[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set([11, 16, 19]));
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Rocket Debugger v2.1.6 ready (LLVM 22.1 JIT backend)',
    'Type or select preset above to begin session.',
  ]);
  const [watchExpressions, setWatchExpressions] = useState<{ expr: string; value: string }[]>([
    { expr: 'p.x', value: '0.0' },
    { expr: 'dt * 1000.0', value: '16.0 ms' },
  ]);
  const [newWatchInput, setNewWatchInput] = useState<string>('');
  const [inspectorTab, setInspectorTab] = useState<'variables' | 'arc' | 'watch'>('variables');

  const currentStep = selectedPreset.steps[currentStepIndex];
  const lines = selectedPreset.code.trim().split('\n');

  const toggleBreakpoint = (lineNum: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(lineNum)) {
        next.delete(lineNum);
        soundEngine.playSnap();
      } else {
        next.add(lineNum);
        soundEngine.playOpen();
      }
      return next;
    });
  };

  const startDebugging = () => {
    setIsDebugging(true);
    setCurrentStepIndex(0);
    soundEngine.playOpen();
    const firstStep = selectedPreset.steps[0];
    setConsoleLogs([
      `[DEBUG_INIT] Target: ${selectedPreset.title}`,
      `[DEBUG_INIT] ABI: v1 Frozen, Architecture: x86_64, Optimization: O0 (Debug)`,
      firstStep.stdout || `Breakpoint ready on line ${firstStep.line}`,
    ]);
  };

  const stopDebugging = () => {
    setIsDebugging(false);
    setCurrentStepIndex(0);
    soundEngine.playClose();
    setConsoleLogs((prev) => [...prev, '[DEBUG_TERMINATED] Session stopped by user.']);
  };

  const stepNext = () => {
    if (!isDebugging) {
      startDebugging();
      return;
    }
    if (currentStepIndex < selectedPreset.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      soundEngine.playSnap();
      const step = selectedPreset.steps[nextIdx];
      if (step.stdout) {
        setConsoleLogs((prev) => [...prev, `[STDOUT] ${step.stdout}`]);
      }
      if (step.arcEvent) {
        setConsoleLogs((prev) => [...prev, `[ARC] ${step.arcEvent}`]);
      }
    } else {
      setConsoleLogs((prev) => [...prev, '[EXECUTION_COMPLETE] End of instructions.']);
      soundEngine.playSuccess();
    }
  };

  const stepOver = () => {
    stepNext();
  };

  const stepInto = () => {
    stepNext();
  };

  const continueExecution = () => {
    if (!isDebugging) {
      startDebugging();
      return;
    }
    // Find next breakpoint or reach the end
    let targetIdx = selectedPreset.steps.length - 1;
    for (let i = currentStepIndex + 1; i < selectedPreset.steps.length; i++) {
      if (breakpoints.has(selectedPreset.steps[i].line)) {
        targetIdx = i;
        break;
      }
    }
    setCurrentStepIndex(targetIdx);
    soundEngine.playSuccess();
    const step = selectedPreset.steps[targetIdx];
    if (step.stdout) setConsoleLogs((prev) => [...prev, `[STDOUT] ${step.stdout}`]);
    if (step.arcEvent) setConsoleLogs((prev) => [...prev, `[ARC] ${step.arcEvent}`]);
  };

  const addWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchInput.trim()) return;
    setWatchExpressions((prev) => [
      ...prev,
      { expr: newWatchInput.trim(), value: 'evaluating...' },
    ]);
    setNewWatchInput('');
    soundEngine.playSnap();
  };

  const removeWatch = (index: number) => {
    setWatchExpressions((prev) => prev.filter((_, i) => i !== index));
    soundEngine.playSnap();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Debugger Toolbar */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Bug className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs text-white">Rocket Visual Debugger</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/50 font-mono">
              ABI v1 ARC Tracer
            </span>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 ml-4">
            <span className="text-[11px] text-slate-400">Preset:</span>
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const target = DEBUG_PRESETS.find((p) => p.id === e.target.value);
                if (target) {
                  setSelectedPreset(target);
                  setCurrentStepIndex(0);
                  setIsDebugging(false);
                  soundEngine.playOpen();
                }
              }}
              className="bg-slate-800 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-mono outline-none cursor-pointer"
            >
              {DEBUG_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Debug Controls */}
        <div className="flex items-center gap-1.5">
          {!isDebugging ? (
            <button
              onClick={startDebugging}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
              title="Start Debugging (F5)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start (F5)</span>
            </button>
          ) : (
            <>
              <button
                onClick={continueExecution}
                className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
                title="Continue Execution to Next Breakpoint"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={stepOver}
                className="p-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 transition-colors cursor-pointer"
                title="Step Over (F10)"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={stepInto}
                className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors cursor-pointer"
                title="Step Into (F11)"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  soundEngine.playSnap();
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                title="Restart Session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={stopDebugging}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
                title="Stop Debugging (Shift+F5)"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Editor with Breakpoint Gutter & Active Line Highlight */}
        <div className="flex-1 flex flex-col border-r border-white/10 bg-slate-950 overflow-hidden">
          {/* Status Subheader */}
          <div className="h-8 px-4 bg-slate-900/50 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sky-400">src/main.rocket</span>
              <span>•</span>
              <span className="text-slate-300">
                {isDebugging
                  ? `Execution paused at line ${currentStep.line}`
                  : 'Ready (Click line numbers to toggle breakpoints)'}
              </span>
            </div>
            {isDebugging && (
              <span className="text-amber-400 font-mono">
                Step {currentStepIndex + 1}/{selectedPreset.steps.length}
              </span>
            )}
          </div>

          {/* Code Viewer with Gutter */}
          <div className="flex-1 overflow-y-auto font-mono text-xs p-2 custom-scrollbar">
            {lines.map((codeLine, idx) => {
              const lineNum = idx + 1;
              const hasBreakpoint = breakpoints.has(lineNum);
              const isCurrentLine = isDebugging && currentStep.line === lineNum;

              return (
                <div
                  key={lineNum}
                  onClick={() => toggleBreakpoint(lineNum)}
                  className={`flex items-center py-0.5 px-2 rounded group cursor-pointer transition-colors ${
                    isCurrentLine
                      ? 'bg-amber-500/20 border-l-2 border-amber-400 text-white'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  {/* Breakpoint Gutter Column */}
                  <div className="w-7 flex items-center justify-center shrink-0">
                    {isCurrentLine ? (
                      <div className="w-3 h-3 text-amber-400 font-bold flex items-center justify-center">
                        ➜
                      </div>
                    ) : hasBreakpoint ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-rose-500/30 transition-colors" />
                    )}
                  </div>

                  {/* Line Number */}
                  <span className="w-8 text-right pr-3 select-none text-slate-600 group-hover:text-slate-400">
                    {lineNum}
                  </span>

                  {/* Code Syntax Highlight */}
                  <span className="flex-1 whitespace-pre">
                    {codeLine.startsWith('import ') ? (
                      <span className="text-purple-400">{codeLine}</span>
                    ) : codeLine.trim().startsWith('fn ') ? (
                      <span className="text-sky-300 font-semibold">{codeLine}</span>
                    ) : codeLine.trim().startsWith('struct ') ? (
                      <span className="text-amber-300 font-semibold">{codeLine}</span>
                    ) : codeLine.trim().startsWith('let ') || codeLine.trim().startsWith('var ') ? (
                      <span className="text-emerald-300">{codeLine}</span>
                    ) : codeLine.trim().startsWith('return ') ? (
                      <span className="text-rose-300 font-semibold">{codeLine}</span>
                    ) : (
                      codeLine
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Execution Log / Explanation */}
          <div className="h-28 border-t border-white/10 bg-slate-900/60 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Activity className="w-3.5 h-3.5" />
                Step Semantics & Runtime State
              </span>
              <span className="text-slate-500 font-mono text-[10px]">Deterministic ARC ABI v1</span>
            </div>
            <div className="text-xs text-slate-200 mt-1 font-sans bg-slate-950/70 p-2.5 rounded-xl border border-white/10">
              {isDebugging ? (
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-mono font-bold mt-0.5">➔</span>
                  <div>
                    <span className="font-semibold text-amber-300">Line {currentStep.line}: </span>
                    <span>{currentStep.description}</span>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 italic">
                  Press Start (F5) to launch the Rocket virtual machine debugger and step through memory operations.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Variables, ARC Promotion, Call Stack, Watches */}
        <div className="w-96 flex flex-col bg-slate-900/50 shrink-0 overflow-hidden">
          {/* Tabs for Inspector */}
          <div className="flex items-center border-b border-white/10 bg-slate-900 px-2 pt-1 gap-1">
            <button
              onClick={() => setInspectorTab('variables')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                inspectorTab === 'variables'
                  ? 'bg-slate-950 text-sky-400 border-t border-x border-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Variables ({currentStep?.variables.length || 0})</span>
            </button>
            <button
              onClick={() => setInspectorTab('arc')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                inspectorTab === 'arc'
                  ? 'bg-slate-950 text-sky-400 border-t border-x border-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>ARC & Memory</span>
            </button>
            <button
              onClick={() => setInspectorTab('watch')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                inspectorTab === 'watch'
                  ? 'bg-slate-950 text-sky-400 border-t border-x border-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Watches ({watchExpressions.length})</span>
            </button>
          </div>

          {/* Inspector Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {inspectorTab === 'variables' && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Stack Variables
                </div>
                {(!currentStep || currentStep.variables.length === 0) ? (
                  <div className="text-xs text-slate-500 italic p-3 text-center bg-slate-950/40 rounded-xl border border-white/5">
                    No active local variables in this frame.
                  </div>
                ) : (
                  currentStep.variables.map((v, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-300 text-xs">{v.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {v.type}
                        </span>
                      </div>
                      <div className="font-mono text-emerald-400 text-xs break-all">{v.value}</div>
                      {v.arcRefCount !== undefined && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-400">
                          <span>ARC Ref Count: <strong className="text-white">{v.arcRefCount}</strong></span>
                          <span className="text-sky-400">{v.threadConfinement}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {inspectorTab === 'arc' && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  ARC Thread-Confinement Engine
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Concurrency Mode:</span>
                    <span className="text-emerald-300 font-semibold">Thread-Confined (ABI v1)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Atomic Promotion:</span>
                    <span className="text-sky-300 font-mono">Graph Promoting</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Locking Overhead:</span>
                    <span className="text-emerald-400 font-mono">0 cycles (Uncontended)</span>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-3">
                  ARC Lifecycle Log
                </div>
                <div className="p-2 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                  {currentStep?.arcEvent ? (
                    <div className="text-sky-300 p-1 bg-sky-950/40 rounded border border-sky-800/40">
                      ➜ {currentStep.arcEvent}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic p-1">No ARC mutations on current step.</div>
                  )}
                  <div className="text-slate-500 text-[10px] pt-1">
                    • Deterministic zero-pause deallocation on scope exit.
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'watch' && (
              <div className="space-y-3">
                <form onSubmit={addWatch} className="flex gap-2">
                  <input
                    type="text"
                    value={newWatchInput}
                    onChange={(e) => setNewWatchInput(e.target.value)}
                    placeholder="Add expression to watch (e.g. p.x)"
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-white/15 rounded-xl text-xs font-mono text-white outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                <div className="space-y-1.5">
                  {watchExpressions.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-white/10"
                    >
                      <div>
                        <span className="font-mono text-xs text-sky-300">{w.expr}:</span>
                        <span className="ml-2 font-mono text-xs text-emerald-400">
                          {isDebugging ? w.value : '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeWatch(i)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call Stack Section */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Call Stack Frames</span>
                <span className="text-[10px] text-sky-400 font-mono">
                  {currentStep?.callStack.length || 0} frames
                </span>
              </div>
              <div className="space-y-1">
                {currentStep?.callStack.map((frame, i) => (
                  <div
                    key={frame.id}
                    className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between ${
                      i === 0
                        ? 'bg-sky-950/60 border border-sky-500/40 text-sky-200'
                        : 'bg-slate-950/40 text-slate-400 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">#{i}</span>
                      <span className="font-bold">{frame.fnName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">line {frame.line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Console */}
          <div className="h-32 border-t border-white/10 bg-slate-950 p-2.5 flex flex-col font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-500 text-[10px] pb-1 border-b border-white/5 mb-1">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-emerald-400" />
                Debugger Output Log
              </span>
              <button
                onClick={() => setConsoleLogs([])}
                className="hover:text-slate-300 cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar text-slate-300">
              {consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.includes('[ARC]')
                      ? 'text-sky-400'
                      : log.includes('[STDOUT]')
                      ? 'text-emerald-300'
                      : log.includes('exited')
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
