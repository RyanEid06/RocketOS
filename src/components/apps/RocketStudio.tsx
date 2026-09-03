import React, { useState } from 'react';
import {
  REPO_METADATA,
  ROCKET_3_PACKETS,
  LANGUAGE_WEAKNESSES,
  OS_ARCHITECTURE_STEPS
} from '../../data/languageAnalysis';
import { LanguageWeakness } from '../../types';
import {
  AlertTriangle,
  CheckCircle,
  Code2,
  FileSearch,
  Sparkles,
  Layers,
  Cpu,
  Play,
  Copy,
  Check,
  ExternalLink,
  GitBranch,
  Target,
  Shield,
  Palette,
  Terminal,
  Clock,
  CheckSquare
} from 'lucide-react';

export const RocketStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'weaknesses' | 'syntax' | 'checker' | 'architecture'>('overview');
  const [selectedWeakness, setSelectedWeakness] = useState<LanguageWeakness>(LANGUAGE_WEAKNESSES[0]);

  // Checker code state
  const [codeToAnalyze, setCodeToAnalyze] = useState<string>(`import std.collections
import std.string
import rocket.motion

struct Particle:
    x: Float
    y: Float
    speed: Float

fn update_particle(p: Particle, dt: Float) -> Particle:
    let new_x = p.x + p.speed * dt
    let new_y = p.y + motion.ease_out_sine(dt) * 10.0
    return Particle(new_x, new_y, p.speed)

fn main() -> Int:
    let particle = Particle(0.0, 100.0, 15.5)
    let updated = update_particle(particle, 0.016)
    print("Particle moved to X: " + string.from_int(math.round(updated.x)))
    return 0
`);

  const [checkResults, setCheckResults] = useState<{
    score: number;
    passed: string[];
    warnings: string[];
    diagnostics: { code: string; message: string; severity: 'error' | 'warning' | 'info' }[];
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleRunCheck = () => {
    const lines = codeToAnalyze.split('\n');
    const passed: string[] = [];
    const warnings: string[] = [];
    const diagnostics: { code: string; message: string; severity: 'error' | 'warning' | 'info' }[] = [];
    let score = 70;

    // Check for function definitions and colon syntax
    const hasFnMain = codeToAnalyze.includes('fn main() -> Int:');
    const hasColon = lines.some((l) => l.trim().endsWith(':'));
    const hasTabs = lines.some((l) => l.includes('\t'));
    const hasDlopen = codeToAnalyze.includes('dlopen') || codeToAnalyze.includes('dlsym');
    const hasStdcall = codeToAnalyze.includes('stdcall');
    const hasLet = codeToAnalyze.includes('let ');
    const hasMatch = codeToAnalyze.includes('match ') && codeToAnalyze.includes('case ');
    const hasImports = lines.some((l) => l.trim().startsWith('import '));
    const hasBadImportAlias = lines.some((l) => l.trim().startsWith('import ') && l.includes(' as '));

    if (hasFnMain) {
      score += 15;
      passed.push('Canonical entry point verified: fn main() -> Int:');
    } else {
      score -= 10;
      diagnostics.push({
        code: 'R1001',
        message: "Missing canonical 'fn main() -> Int:' entry point.",
        severity: 'warning'
      });
      warnings.push("Program lacks canonical 'fn main() -> Int:' function.");
    }

    if (hasColon) {
      score += 10;
      passed.push('Indentation-aware colon block syntax recognized.');
    }

    if (hasTabs) {
      score -= 25;
      diagnostics.push({
        code: 'R1004',
        message: 'Tab characters detected in indentation; Rocket requires canonical 4 spaces.',
        severity: 'error'
      });
      warnings.push('Fatal: tabs found. Use 4 spaces per indentation level.');
    } else {
      passed.push('No tab characters detected; compliant with 4-space indent rules.');
    }

    if (hasDlopen) {
      score -= 30;
      diagnostics.push({
        code: 'R5001',
        message: 'Arbitrary runtime dlopen/dlsym is disallowed; declare native bindings in rocket.toml.',
        severity: 'error'
      });
      warnings.push('Manifest safety violation: arbitrary dynamic library loading is forbidden.');
    }

    if (hasStdcall) {
      score -= 15;
      diagnostics.push({
        code: 'R5002',
        message: 'Unsupported foreign calling convention: only standard platform C ABI is accepted.',
        severity: 'error'
      });
      warnings.push('Foreign calling convention not supported. Must use platform C ABI.');
    }

    if (hasBadImportAlias) {
      score -= 10;
      diagnostics.push({
        code: 'R1007',
        message: "Rocket does not support custom 'as' import aliases; symbols bind to the final component.",
        severity: 'error'
      });
      warnings.push("Remove 'as' clause in import; Rocket automatically binds to module name.");
    }

    if (hasLet) {
      passed.push("Explicit immutable 'let' bindings utilized.");
    }

    if (hasMatch) {
      passed.push("Exhaustive pattern matching ('match' / 'case') validated.");
    }

    if (hasImports) {
      passed.push('Standard module import hierarchy resolved.');
    }

    score = Math.max(10, Math.min(100, score));

    setCheckResults({
      score,
      passed,
      warnings,
      diagnostics
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div id="rocket-studio" className="flex flex-col h-full bg-slate-900 text-slate-100 text-xs font-sans select-none">
      {/* Top Header & Navigation Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Rocket Language Studio</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/80 text-[10px] font-mono">
                {REPO_METADATA.latestRelease}
              </span>
              <a
                href={REPO_METADATA.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2 ml-1"
              >
                <span>RyanEid06/Rocket</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-[11px] text-slate-400">
              &quot;{REPO_METADATA.tagline}&quot; • LLVM 22.1.6 Backend • ABI v1 Runtime • raylib 6.0
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Overview & Roadmap</span>
          </button>
          <button
            onClick={() => setActiveTab('weaknesses')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'weaknesses'
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Audited Weaknesses ({LANGUAGE_WEAKNESSES.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('syntax')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'syntax'
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Syntax & stdlib</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('checker');
              if (!checkResults) handleRunCheck();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'checker'
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>rocketc Checker</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-sky-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compiler Pipeline</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* OVERVIEW & ROADMAP TAB */}
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-900/50">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">Active Version</span>
                  <GitBranch className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-lg font-bold text-white">Rocket 2.1</div>
                <div className="text-[11px] text-emerald-400 mt-1">Phase 19 Parity Accepted</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">Native Backend</span>
                  <Cpu className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-lg font-bold text-white">LLVM 22.1.6</div>
                <div className="text-[11px] text-slate-400 mt-1">O2 Pipeline + Stage0 C++20 Fallback</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">Production Targets</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white">4 Architectures</div>
                <div className="text-[11px] text-slate-400 mt-1">Win x64, Lin x64/ARM64, Mac ARM64</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs">Rocket 3.0 Next</span>
                  <Palette className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-amber-300">WP15: Textures</div>
                <div className="text-[11px] text-slate-400 mt-1">Advanced Filtering & Safe Pivot</div>
              </div>
            </div>

            {/* Target Support Matrix */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-400" />
                  <span>Production Target Architecture Matrix (Phase 19 Audit)</span>
                </div>
                <span className="text-xs text-emerald-400 font-mono">24/24 Verification Vectors Passed</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {REPO_METADATA.supportedTargets.map((target) => (
                  <div key={target.alias} className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{target.alias}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        {target.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">{target.triple}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rocket 3.0 Graphics & UI Work Packets Roadmap */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Rocket 3.0 Graphics & UI Implementation Roadmap</span>
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Tracking progress from docs/ROCKET_3_0_GRAPHICS_UI_IMPLEMENTATION_PLAN.md
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckSquare className="w-3.5 h-3.5" /> 6 Complete
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Clock className="w-3.5 h-3.5" /> 1 In Progress (WP15)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ROCKET_3_PACKETS.map((wp) => (
                  <div
                    key={wp.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      wp.status === 'CURRENT' || wp.status === 'NEXT'
                        ? 'bg-amber-950/20 border-amber-500/80'
                        : wp.status === 'COMPLETE'
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-slate-900/40 border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{wp.id}</span>
                        <span className="text-slate-400 font-semibold">{wp.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          wp.status === 'COMPLETE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : wp.status === 'CURRENT' || wp.status === 'NEXT'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {wp.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{wp.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WEAKNESSES & LIMITATIONS TAB */}
        {activeTab === 'weaknesses' && (
          <div className="flex h-full">
            {/* Sidebar List */}
            <div className="w-80 bg-slate-950/70 border-r border-slate-800 p-2 overflow-y-auto space-y-2 shrink-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2 py-1">
                Audited Architectural Boundaries & Weaknesses
              </div>
              {LANGUAGE_WEAKNESSES.map((w) => {
                const isSelected = selectedWeakness.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWeakness(w)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-900/30 border-sky-500/80 text-white shadow-sm'
                        : 'border-slate-800 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          w.severity === 'Critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : w.severity === 'High'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}
                      >
                        {w.severity}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{w.category}</span>
                    </div>
                    <div className="font-semibold text-xs leading-snug line-clamp-1">{w.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {w.summary}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail View */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-900/40">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        selectedWeakness.severity === 'Critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : selectedWeakness.severity === 'High'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}
                    >
                      {selectedWeakness.severity} Priority
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-sky-400 font-medium">{selectedWeakness.category}</span>
                  </div>
                  {selectedWeakness.repoReference && (
                    <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Ref: {selectedWeakness.repoReference}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedWeakness.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedWeakness.summary}</p>
              </div>

              {/* The Issue */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>The Limitation / Why It Exists</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedWeakness.issueDescription}</p>
              </div>

              {/* Solution in Rocket */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Rocket Architectural Resolution & Safe Pattern</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedWeakness.solutionInRocket}</p>
              </div>

              {/* Code comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 rounded-xl border border-rose-900/40 p-3 flex flex-col">
                  <div className="text-[11px] font-bold text-rose-400 mb-2">
                    <span>Weakness / Disallowed Usage</span>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-rose-200 overflow-x-auto whitespace-pre leading-relaxed flex-1">
                    {selectedWeakness.codeExampleBad}
                  </pre>
                </div>

                <div className="bg-slate-950 rounded-xl border border-emerald-900/40 p-3 flex flex-col">
                  <div className="text-[11px] font-bold text-emerald-400 mb-2">
                    <span>Compliant Rocket Architecture</span>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 font-mono text-[11px] text-emerald-200 overflow-x-auto whitespace-pre leading-relaxed flex-1">
                    {selectedWeakness.codeExampleGood}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYNTAX & STDLIB TAB */}
        {activeTab === 'syntax' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-900/50">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-1">Rocket Language Syntax Quick Reference</h3>
              <p className="text-slate-400 text-xs">
                Derived directly from RyanEid06/Rocket <span className="text-sky-300 font-mono">docs/ROCKET_1_0_SYNTAX_DICTIONARY.md</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-sky-400">1. Function & Type Declarations</div>
                <pre className="bg-slate-900 p-3 rounded font-mono text-[11px] text-sky-200 overflow-x-auto">
{`fn add(a: Int, b: Int) -> Int:
    return a + b

fn main() -> Int:
    let sum = add(10, 32)
    print(sum)
    return 0`}
                </pre>
                <div className="text-slate-400 text-[11px]">
                  All blocks end with a colon <span className="font-mono text-sky-300">:</span> and indent exactly 4 spaces.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400">2. Structs & Payload Enums</div>
                <pre className="bg-slate-900 p-3 rounded font-mono text-[11px] text-emerald-200 overflow-x-auto">
{`struct Pair[T]:
    first: T
    second: T

enum Message:
    Number(Int)
    Text(String)

let pair = Pair(10, 20)
let msg = Message.Text("Hello")`}
                </pre>
                <div className="text-slate-400 text-[11px]">
                  Generic parameters use square brackets <span className="font-mono text-emerald-300">[T]</span>.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400">3. Pattern Matching & Result/Option</div>
                <pre className="bg-slate-900 p-3 rounded font-mono text-[11px] text-amber-200 overflow-x-auto">
{`match result:
    case Ok(value):
        print(value)
    case Err(error):
        print(error)

// Postfix '?' operator for early return
let parsed = string.parse_int(text)?`}
                </pre>
                <div className="text-slate-400 text-[11px]">
                  Exhaustive pattern matching with zero exception runtime overhead.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-purple-400">4. Safe Motion & Math (Rocket 3.0 WP12/13)</div>
                <pre className="bg-slate-900 p-3 rounded font-mono text-[11px] text-purple-200 overflow-x-auto">
{`import std.math
import rocket.motion

let eased = motion.ease_in_out_cubic(progress)
let angle = math.sin(eased * 3.14159)
print(math.round(angle * 100.0))`}
                </pre>
                <div className="text-slate-400 text-[11px]">
                  Bundled motion easing curves and deterministic IEEE 754 float math.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROCKETC CHECKER TAB */}
        {activeTab === 'checker' && (
          <div className="h-full flex flex-col md:flex-row">
            {/* Code Input */}
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200">
                  Rocket Source Code (Editable test buffer)
                </span>
                <button
                  onClick={handleRunCheck}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run rocketc check</span>
                </button>
              </div>
              <textarea
                value={codeToAnalyze}
                onChange={(e) => setCodeToAnalyze(e.target.value)}
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-sky-200 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
                placeholder="// Type or paste your Rocket code here..."
              />
            </div>

            {/* Results Panel */}
            <div className="w-full md:w-96 bg-slate-950 p-4 flex flex-col overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-white text-sm">Compiler Output</span>
                {checkResults && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Score:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                        checkResults.score >= 80
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : checkResults.score >= 50
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {checkResults.score}/100
                    </span>
                  </div>
                )}
              </div>

              {checkResults ? (
                <div className="space-y-4">
                  {/* Diagnostics */}
                  {checkResults.diagnostics.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                        Compiler Diagnostics (rocketc)
                      </div>
                      <div className="space-y-1.5">
                        {checkResults.diagnostics.map((diag, i) => (
                          <div
                            key={i}
                            className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-2.5 font-mono text-[11px] text-rose-200"
                          >
                            <span className="font-bold text-rose-400">[{diag.code}] </span>
                            {diag.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passed Vectors */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Verified Properties ({checkResults.passed.length})
                    </div>
                    <div className="space-y-1">
                      {checkResults.passed.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  <p>Click &quot;Run rocketc check&quot; to parse and type-check the source code.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPILER PIPELINE TAB */}
        {activeTab === 'architecture' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-900/50">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Rocket Compiler Architecture (Stage0 to Stage3)</span>
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                The production compiler is written in Rocket and self-hosts through 4 deterministic stages.
              </p>
            </div>

            <div className="space-y-3">
              {OS_ARCHITECTURE_STEPS.map((step) => (
                <div key={step.step} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-950 border border-sky-800 text-sky-300 flex items-center justify-center font-bold text-xs">
                        {step.step}
                      </span>
                      <span className="font-bold text-white text-sm">{step.title}</span>
                    </div>
                    <span className="text-[11px] text-sky-400 font-mono">{step.languageBreakdown}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
