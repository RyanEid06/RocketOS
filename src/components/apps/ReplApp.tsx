import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  StepForward,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  Terminal,
  Bug,
  BookOpen,
  Sparkles,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface REPLEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

interface ScopeVar {
  name: string;
  type: string;
  value: string;
  isMut: boolean;
  refCount: number;
}

interface ASTNode {
  id: string;
  type: string;
  label: string;
  detail?: string;
  children?: ASTNode[];
}

interface TokenItem {
  type: string;
  value: string;
  pos: string;
}

const PRESET_PROGRAMS: { title: string; code: string; description: string }[] = [
  {
    title: 'Fibonacci Recursion',
    description: 'Calculates Fibonacci numbers with 64-bit Int precision',
    code: `fn fib(n: Int) -> Int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

let answer = fib(8)
print("fib(8) = " + string.from_int(answer))`,
  },
  {
    title: 'Enum & Pattern Matching',
    description: 'Exhaustive pattern matching with algebraic data types',
    code: `enum Command:
    Move(Int, Int)
    Stop
    Message(String)

fn execute(cmd: Command) -> String:
    match cmd:
        case Move(x, y):
            return "Moving to " + string.from_int(x) + ", " + string.from_int(y)
        case Stop:
            return "Engine stopped"
        case Message(s):
            return "Received: " + s

let action = Command.Move(12, 45)
let res = execute(action)
print(res)`,
  },
  {
    title: 'ARC Memory & Graph Promotion',
    description: 'Deterministic Thread-Confined ARC reference lifecycle',
    code: `struct Node:
    id: Int
    payload: String

var first = Node(101, "Shared Payload")
var second = first
# ARC RefCount incremented to 2
print("Node: " + first.payload)`,
  },
  {
    title: 'Result[T, E] & Postfix ?',
    description: 'Safe error propagation without runtime exceptions',
    code: `fn check_status(code: Int) -> Result[String, String]:
    if code == 200:
        return Ok("System Operational")
    return Err("Fault detected: " + string.from_int(code))

let status = check_status(200)?
print("Status: " + status)`,
  },
];

export const ReplApp: React.FC = () => {
  const [history, setHistory] = useState<REPLEntry[]>([
    {
      id: 'welcome',
      type: 'system',
      content:
        'Rocket 2.1 Interactive REPL (LLVM 22 JIT backend, ABI v1)\nType Rocket statements, expressions, or select a preset to begin.\nIndentation uses 4 spaces. Type "help" or "clear" for controls.\n',
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [multiLineBuffer, setMultiLineBuffer] = useState<string[]>([]);

  // Environment & Scope
  const [scopeVars, setScopeVars] = useState<Record<string, ScopeVar>>({
    'version': { name: 'version', type: 'String', value: '"2.1.0-LTS"', isMut: false, refCount: 1 },
    'arch': { name: 'arch', type: 'String', value: '"x86_64"', isMut: false, refCount: 1 },
  });

  // Right pane tab
  const [activeTab, setActiveTab] = useState<'debugger' | 'ast' | 'tokens' | 'arc'>('debugger');

  // Debugger state
  const [debugCode, setDebugCode] = useState<string>(PRESET_PROGRAMS[0].code);
  const [debugLine, setDebugLine] = useState<number>(0);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [breakpoints, setBreakpoints] = useState<number[]>([4]);
  const [copied, setCopied] = useState<boolean>(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Evaluate simple Rocket 2.1 expressions in the REPL
  const evaluateRocketCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    if (trimmed === 'clear') {
      setHistory([]);
      return;
    }

    if (trimmed === 'help') {
      setHistory((prev) => [
        ...prev,
        {
          id: `h-${Date.now()}`,
          type: 'system',
          content:
            'Rocket REPL Commands:\n  clear          - Clear console log\n  vars           - List all variables in local scope\n  presets        - Load sample code into step debugger\n  let x = <val>  - Bind immutable variable\n  var x = <val>  - Bind mutable variable\n  print(...)     - Output text to console\n',
        },
      ]);
      return;
    }

    if (trimmed === 'vars') {
      const varList = Object.values(scopeVars)
        .map((v) => `  ${v.isMut ? 'var' : 'let'} ${v.name}: ${v.type} = ${v.value} [rc: ${v.refCount}]`)
        .join('\n');
      setHistory((prev) => [
        ...prev,
        {
          id: `v-${Date.now()}`,
          type: 'output',
          content: varList ? `Active Scope Variables:\n${varList}` : 'No local variables defined.',
        },
      ]);
      return;
    }

    // Parse variable declarations: let x = ... or var x: Type = ...
    const letVarMatch = trimmed.match(/^(let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([A-Za-z0-9_\[\], ]+))?\s*=\s*(.+)$/);
    if (letVarMatch) {
      const isMut = letVarMatch[1] === 'var';
      const name = letVarMatch[2];
      const explicitType = letVarMatch[3];
      const rhs = letVarMatch[4].trim();

      let valStr = rhs;
      let inferredType = explicitType || 'Int';

      if (rhs.startsWith('"') && rhs.endsWith('"')) {
        inferredType = 'String';
      } else if (rhs === 'true' || rhs === 'false') {
        inferredType = 'Bool';
      } else if (rhs.includes('.')) {
        inferredType = 'Float';
      } else if (rhs.startsWith('[') && rhs.endsWith(']')) {
        inferredType = 'Array[Int]';
      } else if (!isNaN(Number(rhs))) {
        inferredType = 'Int';
      } else if (rhs.startsWith('Some(') || rhs === 'None()') {
        inferredType = 'Option[Any]';
      } else if (rhs.startsWith('Ok(') || rhs.startsWith('Err(')) {
        inferredType = 'Result[Any, String]';
      }

      setScopeVars((prev) => ({
        ...prev,
        [name]: {
          name,
          type: inferredType,
          value: valStr,
          isMut,
          refCount: 1,
        },
      }));

      setHistory((prev) => [
        ...prev,
        {
          id: `eval-${Date.now()}`,
          type: 'output',
          content: `${isMut ? 'var' : 'let'} ${name}: ${inferredType} = ${valStr}`,
        },
      ]);
      soundEngine.playKeyboard();
      return;
    }

    // Print command: print(...)
    const printMatch = trimmed.match(/^print\((.*)\)$/);
    if (printMatch) {
      const rawArg = printMatch[1].trim();
      let evaluated = rawArg;

      if (rawArg.startsWith('"') && rawArg.endsWith('"')) {
        evaluated = rawArg.slice(1, -1);
      } else if (scopeVars[rawArg]) {
        evaluated = scopeVars[rawArg].value.replace(/^"|"$/g, '');
      } else if (!isNaN(Number(rawArg))) {
        evaluated = rawArg;
      }

      setHistory((prev) => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: 'output',
          content: evaluated,
        },
      ]);
      soundEngine.playSuccess();
      return;
    }

    // Simple arithmetic evaluation (e.g. 20 + 22, 10 * 4)
    const mathMatch = trimmed.match(/^([0-9.]+)\s*([\+\-\*\/])\s*([0-9.]+)$/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let calc = 0;
      if (op === '+') calc = a + b;
      if (op === '-') calc = a - b;
      if (op === '*') calc = a * b;
      if (op === '/') calc = b !== 0 ? a / b : 0;

      const isFloat = mathMatch[1].includes('.') || mathMatch[3].includes('.') || op === '/';
      const formatted = isFloat ? calc.toFixed(4) : Math.floor(calc).toString();
      setHistory((prev) => [
        ...prev,
        {
          id: `calc-${Date.now()}`,
          type: 'output',
          content: `-> ${formatted} : ${isFloat ? 'Float' : 'Int'}`,
        },
      ]);
      soundEngine.playKeyboard();
      return;
    }

    // Check variable reference
    if (scopeVars[trimmed]) {
      const v = scopeVars[trimmed];
      setHistory((prev) => [
        ...prev,
        {
          id: `ref-${Date.now()}`,
          type: 'output',
          content: `-> ${v.value} : ${v.type}`,
        },
      ]);
      return;
    }

    // Fallback compilation mock response
    setHistory((prev) => [
      ...prev,
      {
        id: `eval-fallback-${Date.now()}`,
        type: 'output',
        content: `Compiled & evaluated: ${trimmed} -> Ok(Unit)`,
      },
    ]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const line = inputVal;
    setInputVal('');
    setCmdHistory((prev) => [...prev, line]);
    setHistoryIdx(-1);

    // Multi-line block detection (ends with :)
    if (line.trim().endsWith(':')) {
      setMultiLineBuffer([line]);
      setHistory((prev) => [
        ...prev,
        { id: `in-${Date.now()}`, type: 'input', content: `rocket> ${line}` },
      ]);
      return;
    }

    if (multiLineBuffer.length > 0) {
      if (line.trim() === '') {
        // Evaluate buffered multi-line code
        const fullBlock = [...multiLineBuffer, line].join('\n');
        setMultiLineBuffer([]);
        evaluateRocketCode(fullBlock);
      } else {
        setMultiLineBuffer((prev) => [...prev, line]);
        setHistory((prev) => [
          ...prev,
          { id: `in-${Date.now()}`, type: 'input', content: `    ... ${line}` },
        ]);
      }
      return;
    }

    setHistory((prev) => [
      ...prev,
      { id: `in-${Date.now()}`, type: 'input', content: `rocket> ${line}` },
    ]);
    evaluateRocketCode(line);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    }
  };

  // Step Debugger Line Simulation
  const debugLines = debugCode.split('\n');

  const handleStepDebugger = () => {
    if (!isDebugging) {
      setIsDebugging(true);
      setDebugLine(0);
      soundEngine.playClick();
      return;
    }

    const nextLine = (debugLine + 1) % debugLines.length;
    setDebugLine(nextLine);
    soundEngine.playKeyboard();

    // Update dynamic simulated local variables based on current line
    const curCode = debugLines[debugLine]?.trim() || '';
    if (curCode.includes('let answer =') || curCode.includes('let val =')) {
      setScopeVars((prev) => ({
        ...prev,
        answer: { name: 'answer', type: 'Int', value: '21', isMut: false, refCount: 1 },
      }));
    }
  };

  const handleResetDebugger = () => {
    setIsDebugging(false);
    setDebugLine(0);
    soundEngine.playClick();
  };

  const toggleBreakpoint = (lineIdx: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineIdx) ? prev.filter((b) => b !== lineIdx) : [...prev, lineIdx]
    );
    soundEngine.playClick();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(debugCode);
    setCopied(true);
    soundEngine.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate Tokens for Token View
  const generateTokens = (code: string): TokenItem[] => {
    const tokens: TokenItem[] = [];
    const lines = code.split('\n');
    lines.forEach((line, lineNum) => {
      const parts = line.trim().split(/\s+/);
      parts.forEach((p, colNum) => {
        if (!p) return;
        let kind = 'IDENTIFIER';
        if (['fn', 'let', 'var', 'if', 'else', 'return', 'match', 'case', 'enum', 'struct', 'import'].includes(p)) {
          kind = 'KEYWORD';
        } else if (!isNaN(Number(p))) {
          kind = 'INT_LITERAL';
        } else if (p.startsWith('"') && p.endsWith('"')) {
          kind = 'STRING_LITERAL';
        } else if (['+', '-', '*', '/', '=', '==', '!=', '->', '?', ':'].includes(p)) {
          kind = 'OPERATOR';
        } else if (['(', ')', '[', ']', ','].includes(p)) {
          kind = 'PUNCTUATION';
        }
        tokens.push({ type: kind, value: p, pos: `${lineNum + 1}:${colNum * 4 + 1}` });
      });
    });
    return tokens;
  };

  const currentTokens = generateTokens(debugCode);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none">
      {/* Top Controls Bar */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket 2.1 Interactive REPL & Inspector</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
            ABI v1
          </span>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Presets:</span>
          <div className="flex items-center gap-1">
            {PRESET_PROGRAMS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => {
                  setDebugCode(preset.code);
                  handleResetDebugger();
                  soundEngine.playOpen();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  debugCode === preset.code
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {preset.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Copy Source"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Split Body: REPL Terminal (Left) + Inspector Pane (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Interactive REPL Terminal */}
        <div className="w-1/2 flex flex-col border-r border-white/10 bg-black/40 font-mono text-xs">
          <div className="h-8 px-3 border-b border-white/5 bg-slate-900/40 flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              rsh-repl: active
            </span>
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                soundEngine.playClick();
              }}
              className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* Console Output Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-1.5 custom-scrollbar select-text">
            {history.map((entry) => (
              <div key={entry.id} className="leading-relaxed">
                {entry.type === 'system' && (
                  <div className="text-slate-500 italic whitespace-pre-wrap">{entry.content}</div>
                )}
                {entry.type === 'input' && (
                  <div className="text-sky-300 font-semibold">{entry.content}</div>
                )}
                {entry.type === 'output' && (
                  <div className="text-emerald-400 whitespace-pre-wrap">{entry.content}</div>
                )}
                {entry.type === 'error' && (
                  <div className="text-rose-400 font-semibold whitespace-pre-wrap">{entry.content}</div>
                )}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>

          {/* Interactive REPL Prompt Input */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2 border-t border-white/10 bg-slate-950 flex items-center gap-2"
          >
            <span className="text-purple-400 font-bold select-none pl-1">
              {multiLineBuffer.length > 0 ? '... ' : 'rocket> '}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={multiLineBuffer.length > 0 ? 'enter indented block or empty line' : 'type statement, e.g. let x = 42'}
              className="flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600 font-mono text-xs"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium transition-colors cursor-pointer"
            >
              Run
            </button>
          </form>
        </div>

        {/* Right Pane: Inspector, Debugger & AST Inspector */}
        <div className="w-1/2 flex flex-col bg-slate-900/30">
          {/* Tabs header */}
          <div className="h-9 px-3 border-b border-white/10 bg-slate-900/50 flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('debugger')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'debugger'
                  ? 'bg-slate-800 text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              Step Debugger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ast')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ast'
                  ? 'bg-slate-800 text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              AST Nodes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'tokens'
                  ? 'bg-slate-800 text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Token Stream
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('arc')}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'arc'
                  ? 'bg-slate-800 text-purple-300 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              ARC Graph (ABI v1)
            </button>
          </div>

          {/* Tab 1: Step Debugger */}
          {activeTab === 'debugger' && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
              {/* Debug controls */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStepDebugger}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <StepForward className="w-3.5 h-3.5" />
                    {isDebugging ? 'Step Next Line' : 'Start Debugging'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDebugger}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {isDebugging ? `Active Line: ${debugLine + 1} / ${debugLines.length}` : 'Click line number for breakpoint'}
                </div>
              </div>

              {/* Code viewer with execution pointer */}
              <div className="flex-1 rounded-xl bg-black/60 border border-white/10 overflow-y-auto font-mono text-xs p-2 custom-scrollbar">
                {debugLines.map((lineStr, idx) => {
                  const isCurrent = isDebugging && debugLine === idx;
                  const hasBp = breakpoints.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleBreakpoint(idx)}
                      className={`flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-purple-500/25 border-l-2 border-purple-400 text-white font-semibold'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      {/* Breakpoint indicator */}
                      <span className="w-3 h-3 flex items-center justify-center shrink-0">
                        {hasBp && <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />}
                        {isCurrent && !hasBp && (
                          <span className="text-purple-400 text-[10px]">▶</span>
                        )}
                      </span>

                      {/* Line number */}
                      <span className="text-slate-600 text-[10px] w-5 text-right shrink-0 select-none">
                        {idx + 1}
                      </span>

                      {/* Code line */}
                      <span className="whitespace-pre">{lineStr || ' '}</span>
                    </div>
                  );
                })}
              </div>

              {/* Scope Inspector Table */}
              <div className="h-36 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col overflow-hidden shrink-0">
                <div className="h-7 px-3 bg-white/5 flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-white/5">
                  <span>Stack Frame & Local Variables</span>
                  <span className="text-[10px] text-purple-400 font-mono">Thread: #0 (Main)</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 text-xs custom-scrollbar space-y-1">
                  {Object.values(scopeVars).map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between px-2 py-1 rounded bg-black/30 border border-white/5 font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={v.isMut ? 'text-amber-400' : 'text-sky-400'}>
                          {v.isMut ? 'var' : 'let'}
                        </span>
                        <span className="text-white font-bold">{v.name}</span>
                        <span className="text-slate-500">:</span>
                        <span className="text-purple-300">{v.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 truncate max-w-[140px]">{v.value}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                          rc:{v.refCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: AST Nodes Visualizer */}
          {activeTab === 'ast' && (
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs">
              <div className="text-slate-400 text-xs mb-3 font-sans">
                Abstract Syntax Tree representation generated by the Rocket 2.1 parser:
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="text-purple-400 font-bold">Program</div>
                <div className="pl-4 border-l border-white/10 space-y-2">
                  <div className="p-1.5 rounded bg-white/5 border border-white/5">
                    <span className="text-sky-400 font-semibold">FunctionDeclaration</span>
                    <span className="text-slate-400 ml-2">name: "fib", returns: Int</span>
                    <div className="pl-3 mt-1 text-slate-500 text-[11px]">
                      ↳ Parameters: [ Param(name: "n", type: Int) ]
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-white/5 border border-white/5">
                    <span className="text-amber-400 font-semibold">IfExpression</span>
                    <span className="text-slate-400 ml-2">condition: BinaryExpr(n &lt;= 1)</span>
                    <div className="pl-3 mt-1 text-slate-500 text-[11px]">
                      ↳ Consequent: ReturnStatement(Identifier("n"))
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-white/5 border border-white/5">
                    <span className="text-emerald-400 font-semibold">VariableBinding</span>
                    <span className="text-slate-400 ml-2">kind: let, name: "answer"</span>
                    <div className="pl-3 mt-1 text-slate-500 text-[11px]">
                      ↳ Expression: CallExpr(target: "fib", args: [8])
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Token Stream */}
          {activeTab === 'tokens' && (
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar font-mono text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                {currentTokens.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${
                          t.type === 'KEYWORD'
                            ? 'text-purple-400'
                            : t.type === 'INT_LITERAL'
                            ? 'text-amber-400'
                            : t.type === 'STRING_LITERAL'
                            ? 'text-emerald-400'
                            : t.type === 'OPERATOR'
                            ? 'text-sky-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {t.type}
                      </span>
                      <span className="text-slate-600 text-[10px]">{t.pos}</span>
                    </div>
                    <span className="text-white truncate font-bold">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: ABI v1 ARC Graph */}
          {activeTab === 'arc' && (
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar text-xs">
              <div className="mb-3 text-slate-400">
                Rocket ABI v1 thread-confined ARC memory map. Zero global lock contention; allocations are confined to the thread until atomic graph promotion.
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-black/50 border border-purple-500/30">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-purple-300">Thread #0 Arena Heap</span>
                    <span className="text-emerald-400 font-mono">Status: Confined</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5 font-mono text-[11px]">
                      <div className="text-slate-500">Ptr: 0x7ffd9a10</div>
                      <div className="text-white font-bold">Node (Ref Count: 2)</div>
                      <div className="text-emerald-400 text-[10px]">No cycle detected</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5 font-mono text-[11px]">
                      <div className="text-slate-500">Ptr: 0x7ffd9a38</div>
                      <div className="text-white font-bold">String Payload (Ref Count: 1)</div>
                      <div className="text-sky-400 text-[10px]">Owned UTF-8 sequence</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-400 font-bold mb-1 font-sans">Memory Metrics:</div>
                  <div>• Allocation Strategy: Bump-pointer thread arena</div>
                  <div>• Promotion Status: 0 atomic promotions to shared heap</div>
                  <div>• Active Strong References: {Object.keys(scopeVars).length}</div>
                  <div>• Active Weak References: 0</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
