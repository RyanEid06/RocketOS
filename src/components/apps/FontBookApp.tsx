import React, { useState } from 'react';
import {
  Type,
  Grid,
  Code,
  Copy,
  Check,
  Search,
  Sliders,
  Sparkles,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

type FontBookTab = 'scales' | 'glyphs' | 'ligatures';

export const FontBookApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FontBookTab>('scales');
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [baseSize, setBaseSize] = useState<number>(16);
  const [scaleRatio, setScaleRatio] = useState<number>(1.25); // Major Third
  const [sampleText, setSampleText] = useState<string>('RocketOS High-Performance Computing');
  const [copiedGlyph, setCopiedGlyph] = useState<string | null>(null);

  // Optical Type Scale Steps
  const scaleSteps = [
    { label: 'Display H1', level: 4 },
    { label: 'Heading H2', level: 3 },
    { label: 'Heading H3', level: 2 },
    { label: 'Subhead H4', level: 1 },
    { label: 'Base Body', level: 0 },
    { label: 'Caption / Small', level: -1 },
  ];

  // Unicode Glyphs library
  const glyphs = [
    { char: '→', code: 'U+2192', name: 'Right Arrow' },
    { char: '←', code: 'U+2190', name: 'Left Arrow' },
    { char: '↑', code: 'U+2191', name: 'Up Arrow' },
    { char: '↓', code: 'U+2193', name: 'Down Arrow' },
    { char: '⇄', code: 'U+21C4', name: 'Left Right Arrow' },
    { char: '⇒', code: 'U+21D2', name: 'Double Right Arrow' },
    { char: '√', code: 'U+221A', name: 'Square Root' },
    { char: '∑', code: 'U+2211', name: 'Summation' },
    { char: '∫', code: 'U+222B', name: 'Integral' },
    { char: '≈', code: 'U+2248', name: 'Almost Equal' },
    { char: '≠', code: 'U+2260', name: 'Not Equal' },
    { char: '≤', code: 'U+2264', name: 'Less-Than or Equal' },
    { char: '≥', code: 'U+2265', name: 'Greater-Than or Equal' },
    { char: '⚡', code: 'U+26A1', name: 'High Voltage' },
    { char: 'λ', code: 'U+03BB', name: 'Greek Small Lambda' },
    { char: 'π', code: 'U+03C0', name: 'Greek Small Pi' },
    { char: 'Ω', code: 'U+03A9', name: 'Greek Capital Omega' },
    { char: '░', code: 'U+2591', name: 'Light Shade' },
    { char: '▒', code: 'U+2592', name: 'Medium Shade' },
    { char: '▓', code: 'U+2593', name: 'Dark Shade' },
    { char: '█', code: 'U+2588', name: 'Full Block' },
    { char: '◆', code: 'U+25C6', name: 'Black Diamond' },
    { char: '●', code: 'U+25CF', name: 'Black Circle' },
    { char: '▲', code: 'U+25B2', name: 'Black Up-Pointing Triangle' },
  ];

  const handleCopyGlyph = (g: { char: string; code: string }) => {
    soundEngine.play('snap');
    navigator.clipboard.writeText(g.char);
    setCopiedGlyph(g.code);
    setTimeout(() => setCopiedGlyph(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('scales')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'scales' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Mathematical Scales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('glyphs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'glyphs' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Unicode Glyphs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ligatures')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'ligatures' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Programming Ligatures</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-slate-300 outline-none cursor-pointer"
          >
            <option value="font-sans">System Sans (Inter)</option>
            <option value="font-mono">JetBrains Mono</option>
            <option value="font-serif">Merriweather Serif</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* SCALES TAB */}
        {activeTab === 'scales' && (
          <div className="space-y-6">
            {/* Scale Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/80 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Step Ratio:</span>
                {[
                  { label: 'Major Second (1.125)', val: 1.125 },
                  { label: 'Major Third (1.250)', val: 1.25 },
                  { label: 'Perfect Fourth (1.333)', val: 1.333 },
                  { label: 'Golden Ratio (1.618)', val: 1.618 },
                ].map((r) => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => {
                      soundEngine.play('click');
                      setScaleRatio(r.val);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      scaleRatio === r.val ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sample Text:</span>
                <input
                  type="text"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  className="bg-slate-950 px-2.5 py-1 rounded-lg border border-white/10 text-xs text-white outline-none w-56"
                />
              </div>
            </div>

            {/* Type Scale Steps Table */}
            <div className={`space-y-4 ${fontFamily}`}>
              {scaleSteps.map((step) => {
                const pxSize = Math.round(baseSize * Math.pow(scaleRatio, step.level));
                const remSize = (pxSize / 16).toFixed(3);

                return (
                  <div key={step.level} className="p-3 bg-slate-900/50 rounded-xl border border-white/5 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span className="uppercase tracking-wider font-bold text-sky-400">{step.label}</span>
                      <span>
                        {pxSize}px • {remSize}rem
                      </span>
                    </div>
                    <div style={{ fontSize: `${pxSize}px`, lineHeight: 1.25 }} className="font-bold text-white truncate">
                      {sampleText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GLYPHS TAB */}
        {activeTab === 'glyphs' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">Click any symbol to copy the character to your clipboard:</div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
              {glyphs.map((g) => {
                const isCopied = copiedGlyph === g.code;
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => handleCopyGlyph(g)}
                    className={`p-3 bg-slate-900/80 rounded-xl border flex flex-col items-center justify-center space-y-1 hover:border-sky-500 cursor-pointer transition-all ${
                      isCopied ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/10'
                    }`}
                  >
                    <span className="text-2xl text-white font-mono">{g.char}</span>
                    <span className="text-[10px] font-mono text-slate-400">{g.code}</span>
                    <span className="text-[9px] text-slate-500 truncate max-w-full">{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LIGATURES TAB */}
        {activeTab === 'ligatures' && (
          <div className="space-y-4 max-w-2xl mx-auto pt-2">
            <div className="p-4 bg-slate-900 rounded-xl border border-white/10 space-y-3 font-mono">
              <div className="text-xs font-bold text-sky-400">Programming Ligature Matrix</div>
              <div className="text-2xl space-y-2 text-slate-200">
                <div className="p-2 bg-slate-950 rounded border border-white/5 flex justify-between">
                  <span>-&gt; ==&gt; &lt;= &gt;=</span>
                  <span className="text-xs text-slate-500 font-sans self-center">Arrows & Comparisons</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-white/5 flex justify-between">
                  <span>!= !== === := ::</span>
                  <span className="text-xs text-slate-500 font-sans self-center">Assignments & Identity</span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-white/5 flex justify-between">
                  <span>/* ... */ // ##</span>
                  <span className="text-xs text-slate-500 font-sans self-center">Comment Delimiters</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
