import React, { useState } from 'react';
import {
  Binary,
  Code,
  Cpu,
  Copy,
  Download,
  Play,
  CheckCircle2,
  FileCode,
  Layers,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { RocketFS } from '../../core/filesystem/RocketFS';

interface CodeSnippet {
  name: string;
  source: string;
  llvmIr: string;
  asmX86: string;
}

const TEMPLATES: CodeSnippet[] = [
  {
    name: 'Fibonacci Recursion',
    source: `pub fn fib(n: Int) -> Int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

fn main() -> Int:
    let result = fib(10)
    return result`,
    llvmIr: `; ModuleID = 'fib.rocket'
source_filename = "fib.rocket"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-linux-gnu"

define i64 @fib(i64 %n) local_unnamed_addr #0 {
entry:
  %cmp = icmp sle i64 %n, 1
  br i1 %cmp, label %return, label %recurse

recurse:
  %sub1 = add nsw i64 %n, -1
  %call1 = tail call i64 @fib(i64 %sub1)
  %sub2 = add nsw i64 %n, -2
  %call2 = tail call i64 @fib(i64 %sub2)
  %add = add nsw i64 %call2, %call1
  ret i64 %add

return:
  ret i64 %n
}

define i32 @main() local_unnamed_addr #0 {
entry:
  %res = tail call i64 @fib(i64 10)
  %conv = trunc i64 %res to i32
  ret i32 %conv
}`,
    asmX86: `.globl  fib
.type   fib, @function
fib:
    cmpq    $1, %rdi
    jle     .LBB0_3
    pushq   %rbp
    pushq   %r14
    pushq   %rbx
    movq    %rdi, %rbx
    leaq    -1(%rdi), %rdi
    callq   fib
    movq    %rax, %r14
    leaq    -2(%rbx), %rdi
    callq   fib
    addq    %r14, %rax
    popq    %rbx
    popq    %r14
    popq    %rbp
    retq
.LBB0_3:
    movq    %rdi, %rax
    retq

.globl  main
.type   main, @function
main:
    movl    $10, %edi
    callq   fib
    movl    %eax, %eax
    retq`,
  },
  {
    name: 'SIMD Vector Addition',
    source: `import rocket.motion

pub fn add_vectors(a: Float, b: Float) -> Float:
    let eased = motion.ease_in_cubic(a)
    return eased + b`,
    llvmIr: `define double @add_vectors(double %a, double %b) local_unnamed_addr #1 {
entry:
  ; Inlined rocket.motion.ease_in_cubic: t * t * t
  %mul1 = fmul fast double %a, %a
  %mul2 = fmul fast double %mul1, %a
  %res  = fadd fast double %mul2, %b
  ret double %res
}`,
    asmX86: `.globl  add_vectors
add_vectors:
    # %xmm0 = a, %xmm1 = b
    vmulsd  %xmm0, %xmm0, %xmm2   # xmm2 = a * a
    vmulsd  %xmm0, %xmm2, %xmm0   # xmm0 = a^3
    vaddsd  %xmm1, %xmm0, %xmm0   # return a^3 + b
    retq`,
  },
];

export const DisassemblerApp: React.FC = () => {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [activeOutputTab, setActiveOutputTab] = useState<'asm' | 'llvm' | 'abi'>('asm');
  const [sourceCode, setSourceCode] = useState<string>(TEMPLATES[0].source);

  const currentTemplate = TEMPLATES[selectedTemplateIndex];

  const handleTemplateChange = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setSourceCode(TEMPLATES[idx].source);
    soundEngine.playSnap();
  };

  const handleSaveToFS = () => {
    const fs = RocketFS.getInstance();
    const filename = activeOutputTab === 'llvm' ? '/home/ryan/Documents/output.ll' : '/home/ryan/Documents/output.s';
    const content = activeOutputTab === 'llvm' ? currentTemplate.llvmIr : currentTemplate.asmX86;
    fs.writeFile(filename, content);
    soundEngine.playSuccess();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Binary className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket LLVM IR & x86_64 Disassembler</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono">
            ABI v1 Compiler
          </span>
        </div>

        {/* Template selector & Save */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplateIndex}
            onChange={(e) => handleTemplateChange(Number(e.target.value))}
            className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none cursor-pointer font-mono"
          >
            {TEMPLATES.map((t, idx) => (
              <option key={t.name} value={idx}>
                Preset: {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSaveToFS}
            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
          >
            Save Output
          </button>
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Rocket Source Editor */}
        <div className="w-1/2 border-r border-white/10 flex flex-col bg-slate-950">
          <div className="h-9 px-4 border-b border-white/10 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono">
              <Code className="w-3.5 h-3.5 text-orange-400" />
              <span>Rocket 2.1 Source (.rocket)</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Clean ABI v1 AST</span>
          </div>

          <textarea
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            className="flex-1 p-4 bg-slate-950 font-mono text-xs text-slate-200 outline-none resize-none leading-relaxed custom-scrollbar selection:bg-orange-500/30"
          />
        </div>

        {/* Right: Disassembly Output */}
        <div className="w-1/2 flex flex-col bg-slate-900/40">
          <div className="h-9 px-4 border-b border-white/10 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => setActiveOutputTab('asm')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium cursor-pointer ${
                  activeOutputTab === 'asm' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                x86_64 Asm
              </button>
              <button
                onClick={() => setActiveOutputTab('llvm')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium cursor-pointer ${
                  activeOutputTab === 'llvm' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                LLVM 22 IR
              </button>
              <button
                onClick={() => setActiveOutputTab('abi')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium cursor-pointer ${
                  activeOutputTab === 'abi' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ABI Registers
              </button>
            </div>

            <button
              onClick={() => {
                const text =
                  activeOutputTab === 'llvm'
                    ? currentTemplate.llvmIr
                    : activeOutputTab === 'asm'
                    ? currentTemplate.asmX86
                    : 'System V AMD64 ABI registers: %rdi, %rsi, %rdx, %rcx, %r8, %r9';
                navigator.clipboard.writeText(text);
                soundEngine.playSuccess();
              }}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              title="Copy to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed">
            {activeOutputTab === 'asm' ? (
              <pre className="text-sky-300 selection:bg-sky-500/30">
                {currentTemplate.asmX86}
              </pre>
            ) : activeOutputTab === 'llvm' ? (
              <pre className="text-emerald-300 selection:bg-emerald-500/30">
                {currentTemplate.llvmIr}
              </pre>
            ) : (
              /* Frozen 2.0 ABI v1 Register Architecture Guide */
              <div className="space-y-4 text-xs font-sans text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <div className="font-bold text-white font-mono text-xs text-sky-400">
                    System V AMD64 / Rocket ABI v1 Register Protocol
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Functions pass up to six 64-bit integer or pointer arguments in registers:
                  </p>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 1: %rdi</span>
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 2: %rsi</span>
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 3: %rdx</span>
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 4: %rcx</span>
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 5: %r8</span>
                    <span className="p-1.5 rounded bg-slate-950 text-sky-300">Arg 6: %r9</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <div className="font-bold text-white font-mono text-xs text-emerald-400">
                    Return Value Conventions
                  </div>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div>Int / Pointers / ARC handles: <strong className="text-white">%rax</strong></div>
                    <div>Float (64-bit binary64): <strong className="text-white">%xmm0</strong></div>
                    <div>Result[T, E] / Option[T]: <strong className="text-white">%rax (tag) + %rdx (payload)</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
