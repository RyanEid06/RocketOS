import React, { useState } from 'react';
import {
  Monitor,
  Sun,
  Moon,
  Eye,
  Sliders,
  Sparkles,
  Contrast,
  Check,
  RotateCcw,
  Palette,
  Maximize,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export const DisplayApp: React.FC = () => {
  const [scale, setScale] = useState<number>(100);
  const [nightLight, setNightLight] = useState<boolean>(false);
  const [colorTemp, setColorTemp] = useState<number>(3800);
  const [colorProfile, setColorProfile] = useState<'srgb' | 'p3' | 'vivid'>('p3');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(false);
  const [largeCursor, setLargeCursor] = useState<boolean>(false);

  const handleApply = () => {
    soundEngine.playSuccess();
  };

  const handleReset = () => {
    setScale(100);
    setNightLight(false);
    setColorTemp(5000);
    setColorProfile('srgb');
    setHighContrast(false);
    setDyslexiaFont(false);
    setLargeCursor(false);
    soundEngine.playClick();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
            <Monitor className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">
            Display, Accessibility & Color Calibration
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <Check className="w-3 h-3" />
            <span>Apply Calibration</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 max-w-3xl mx-auto w-full">
        {/* Visual Calibration Preview Monitor */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 p-6 flex flex-col items-center justify-center gap-4 shadow-xl">
          <div
            className="w-full max-w-md h-32 rounded-xl flex items-center justify-center font-mono text-xs transition-all relative overflow-hidden shadow-inner"
            style={{
              backgroundColor: nightLight ? '#382b1c' : '#0f172a',
              filter: highContrast ? 'contrast(140%) brightness(110%)' : 'none',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {/* Swatches */}
            <div className="flex items-center gap-3 z-10">
              <div className="w-8 h-8 rounded-lg bg-sky-500 shadow-md" />
              <div className="w-8 h-8 rounded-lg bg-emerald-500 shadow-md" />
              <div className="w-8 h-8 rounded-lg bg-amber-500 shadow-md" />
              <div className="w-8 h-8 rounded-lg bg-rose-500 shadow-md" />
              <div className="w-8 h-8 rounded-lg bg-violet-500 shadow-md" />
            </div>
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-sans">
              Color Target: {colorProfile.toUpperCase()} ({colorTemp}K)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Real-time viewport simulation conforming to hardware display pipeline
          </span>
        </div>

        {/* 1. Scale & Resolution */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Maximize className="w-4 h-4 text-violet-400" />
            <span>Display Scaling & DPI Ratio</span>
          </div>
          <p className="text-xs text-slate-400">
            Adjust the size of text, icons, and windows across the virtual desktop canvas.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[100, 125, 150].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScale(s);
                  soundEngine.playClick();
                }}
                className={`py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  scale === s
                    ? 'bg-violet-600/30 border-violet-500 text-white shadow-md'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {s}% {s === 100 ? '(Native 1:1)' : s === 125 ? '(Balanced)' : '(High-DPI)'}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Night Light & Temperature */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Moon className="w-4 h-4 text-amber-400" />
              <span>Night Light (Circadian Eye Care)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={nightLight}
                onChange={(e) => {
                  setNightLight(e.target.checked);
                  soundEngine.playClick();
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Reduces blue light spectrum emissions by filtering warm amber tones into the compositor.
          </p>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-300 font-mono">
              <span>Color Temperature</span>
              <span>{colorTemp} K</span>
            </div>
            <input
              type="range"
              min="2700"
              max="6500"
              step="100"
              value={colorTemp}
              onChange={(e) => setColorTemp(Number(e.target.value))}
              disabled={!nightLight}
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-30"
            />
          </div>
        </div>

        {/* 3. Color Space Profiles */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Color Profile Calibration</span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            {(['srgb', 'p3', 'vivid'] as const).map((prof) => (
              <button
                key={prof}
                onClick={() => {
                  setColorProfile(prof);
                  soundEngine.playClick();
                }}
                className={`py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  colorProfile === prof
                    ? 'bg-pink-600/30 border-pink-500 text-white shadow-md'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {prof === 'srgb' ? 'Standard sRGB' : prof === 'p3' ? 'Display P3 Wide' : 'Vivid Dynamic'}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Accessibility Suite */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Accessibility & Ergonomics</span>
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
              <span className="text-slate-200">High Contrast Mode (WCAG AAA)</span>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => {
                  setHighContrast(e.target.checked);
                  soundEngine.playClick();
                }}
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
              <span className="text-slate-200">Dyslexia-Friendly Typography Font</span>
              <input
                type="checkbox"
                checked={dyslexiaFont}
                onChange={(e) => {
                  setDyslexiaFont(e.target.checked);
                  soundEngine.playClick();
                }}
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
              <span className="text-slate-200">Large High-Visibility Cursor</span>
              <input
                type="checkbox"
                checked={largeCursor}
                onChange={(e) => {
                  setLargeCursor(e.target.checked);
                  soundEngine.playClick();
                }}
                className="accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
