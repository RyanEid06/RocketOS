import React, { useState, useEffect } from 'react';
import { BootStep } from '../types';
import { Terminal, Cpu, Play, FastForward, CheckCircle2 } from 'lucide-react';

interface BootSequenceProps {
  onBootComplete: () => void;
}

const BOOT_STEPS_DEF: Omit<BootStep, 'status'>[] = [
  {
    stage: 'POST & Firmware',
    message: 'UEFI / BIOS POST complete. 4096 MB DDR4 RAM detected. 4x x86_64 Cores.',
    durationMs: 400,
    sourceLanguage: 'Hardware',
  },
  {
    stage: 'Bootloader',
    message: '[boot.asm] Multiboot2 magic 0xe85250d6 validated. Initializing 32-bit bootstrap.',
    durationMs: 350,
    sourceLanguage: 'Assembly',
  },
  {
    stage: 'Paging Setup',
    message: '[boot.asm] Building 4-level PML4 identity page tables. Setting CR3=0x1000.',
    durationMs: 300,
    sourceLanguage: 'Assembly',
  },
  {
    stage: 'Long Mode Switch',
    message: '[boot.asm] Enabling EFER.LME and CR0.PG. Jumping to 64-bit Long Mode.',
    durationMs: 350,
    sourceLanguage: 'Assembly',
  },
  {
    stage: 'Kernel Entry',
    message: '[kernel.rkt] Calling kmain_rocket(mb_info=0x7e00). Zero-runtime mode active.',
    durationMs: 450,
    sourceLanguage: 'Rocket',
  },
  {
    stage: 'Memory Allocator',
    message: '[memory.rkt] Initializing physical frame allocator. 1,048,576 frames available.',
    durationMs: 400,
    sourceLanguage: 'Rocket',
  },
  {
    stage: 'Interrupts (IDT)',
    message: '[idt.rkt] Remapping 8259 PIC (IRQ 0x20..0x2F). Loading IDTR descriptor with LIDT.',
    durationMs: 350,
    sourceLanguage: 'Rocket',
  },
  {
    stage: 'GOP Framebuffer',
    message: '[framebuffer.rkt] Initialized 32-bit true color linear framebuffer (1920x1080@32bpp).',
    durationMs: 400,
    sourceLanguage: 'Rocket',
  },
  {
    stage: 'Driver Handlers',
    message: '[drivers] PS/2 keyboard and PS/2 mouse initialized with volatile MMIO.',
    durationMs: 300,
    sourceLanguage: 'Rocket',
  },
  {
    stage: 'GUI Compositor',
    message: '[desktop.rkt] Launching RocketOS graphical user interface environment...',
    durationMs: 300,
    sourceLanguage: 'Rocket',
  },
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onBootComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (currentStepIndex >= BOOT_STEPS_DEF.length) {
      const timer = setTimeout(() => {
        onBootComplete();
      }, 500);
      return () => clearTimeout(timer);
    }

    const currentStep = BOOT_STEPS_DEF[currentStepIndex];
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStepIndex]);
      setCurrentStepIndex((prev) => prev + 1);
    }, currentStep.durationMs);

    return () => clearTimeout(timer);
  }, [currentStepIndex, onBootComplete]);

  return (
    <div id="boot-screen" className="fixed inset-0 bg-slate-950 text-slate-100 font-mono flex flex-col justify-between p-6 z-50 select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-600/30">
              R
            </div>
            <div>
              <div className="text-base font-bold tracking-wide text-sky-400">RocketOS Bootloader v0.1.0</div>
              <div className="text-xs text-slate-400">Target: x86_64-rocket-none-kernel | Language: Rocket + Assembly</div>
            </div>
          </div>
          <button
            id="skip-boot-button"
            onClick={onBootComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
          >
            <FastForward className="w-3.5 h-3.5 text-sky-400" />
            Fast Boot / Skip to GUI
          </button>
        </div>

        {/* Boot Logs */}
        <div className="space-y-2 max-w-4xl">
          {BOOT_STEPS_DEF.map((step, idx) => {
            const isDone = completedSteps.includes(idx);
            const isCurrent = currentStepIndex === idx;

            if (!isDone && !isCurrent) return null;

            return (
              <div
                key={step.stage}
                className={`flex items-start gap-3 text-xs leading-relaxed transition-opacity duration-150 ${
                  isCurrent ? 'text-sky-300 font-semibold' : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500 w-14 shrink-0 text-right">
                  [ {((idx * 0.08) + 0.04).toFixed(3)}s ]
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 uppercase tracking-wider ${
                    step.sourceLanguage === 'Assembly'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : step.sourceLanguage === 'Rocket'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  {step.sourceLanguage}
                </span>

                <span className="text-slate-400 font-medium">[{step.stage}]</span>
                <span className="flex-1">{step.message}</span>

                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 self-center" />}
                {isCurrent && (
                  <span className="inline-block w-2 h-3.5 bg-sky-400 animate-pulse shrink-0 self-center" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom status */}
      <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-500 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Executing hardware handoff: Real Mode -&gt; Protected Mode -&gt; 64-bit Long Mode -&gt; Rocket kmain()</span>
        </div>
        <div>Press ESC or click Fast Boot to jump straight to the GUI desktop</div>
      </div>
    </div>
  );
};
