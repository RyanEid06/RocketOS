import React, { useState, useMemo } from 'react';
import {
  Palette,
  Check,
  Copy,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Shuffle,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export const PaletteStudioApp: React.FC = () => {
  const [baseHex, setBaseHex] = useState<string>('#38BDF8');
  const [bgHex, setBgHex] = useState<string>('#0B1329');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // RGB derivation
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgb = useMemo(() => hexToRgb(baseHex), [baseHex]);
  const bgRgb = useMemo(() => hexToRgb(bgHex), [bgHex]);

  // Relative luminance calculation for WCAG 2.1
  const getLuminance = ({ r, g, b }: { r: number; g: number; b: number }): number => {
    const a = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };

  // WCAG Contrast Ratio
  const contrastRatio = useMemo(() => {
    const l1 = getLuminance(rgb);
    const l2 = getLuminance(bgRgb);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return Number(ratio.toFixed(2));
  }, [rgb, bgRgb]);

  // Shades ladder generator
  const shades = useMemo(() => {
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    return steps.map((step) => {
      const factor = (500 - step) / 500;
      let r = rgb.r;
      let g = rgb.g;
      let b = rgb.b;
      if (factor > 0) {
        // Tints towards white
        r = Math.round(r + (255 - r) * factor * 0.8);
        g = Math.round(g + (255 - g) * factor * 0.8);
        b = Math.round(b + (255 - b) * factor * 0.8);
      } else {
        // Shades towards black
        const darkFactor = Math.abs(factor);
        r = Math.round(r * (1 - darkFactor * 0.85));
        g = Math.round(g * (1 - darkFactor * 0.85));
        b = Math.round(b * (1 - darkFactor * 0.85));
      }
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
      return { step, hex };
    });
  }, [rgb]);

  const handleCopy = (text: string, id: string) => {
    soundEngine.play('snap');
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRandomize = () => {
    soundEngine.play('click');
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    setBaseHex(randomHex);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-sky-400" />
          <span className="font-bold text-xs text-white">ColorForge Studio</span>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
            WCAG 2.1 Contrast & Tones
          </span>
        </div>

        <button
          type="button"
          onClick={handleRandomize}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-white/10 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Random Palette</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Color Inputs & Active Swatch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white">Primary Brand Color</div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={baseHex}
                onChange={(e) => setBaseHex(e.target.value.toUpperCase())}
                className="w-14 h-14 rounded-xl cursor-pointer border border-white/20 bg-transparent p-0"
              />
              <div className="space-y-1 font-mono text-xs flex-1">
                <input
                  type="text"
                  value={baseHex}
                  onChange={(e) => setBaseHex(e.target.value.toUpperCase())}
                  className="bg-slate-950 px-2.5 py-1 rounded border border-white/10 text-sky-300 font-bold w-32 outline-none"
                />
                <div className="text-[11px] text-slate-400">
                  rgb({rgb.r}, {rgb.g}, {rgb.b})
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white">Background Canvas Color</div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgHex}
                onChange={(e) => setBgHex(e.target.value.toUpperCase())}
                className="w-14 h-14 rounded-xl cursor-pointer border border-white/20 bg-transparent p-0"
              />
              <div className="space-y-1 font-mono text-xs flex-1">
                <input
                  type="text"
                  value={bgHex}
                  onChange={(e) => setBgHex(e.target.value.toUpperCase())}
                  className="bg-slate-950 px-2.5 py-1 rounded border border-white/10 text-slate-300 font-bold w-32 outline-none"
                />
                <div className="text-[11px] text-slate-400">
                  rgb({bgRgb.r}, {bgRgb.g}, {bgRgb.b})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WCAG Contrast Verification */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white">WCAG 2.1 Contrast Ratio</span>
            </div>
            <span className="text-xl font-mono font-black text-sky-300">{contrastRatio}:1</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5 space-y-1 text-center">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Normal Text (AA)</div>
              <div className="flex items-center justify-center gap-1 font-bold text-xs">
                {contrastRatio >= 4.5 ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5 space-y-1 text-center">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Large Text (AAA)</div>
              <div className="flex items-center justify-center gap-1 font-bold text-xs">
                {contrastRatio >= 4.5 ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                )}
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5 space-y-1 text-center">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">UI Components</div>
              <div className="flex items-center justify-center gap-1 font-bold text-xs">
                {contrastRatio >= 3.0 ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                )}
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div
            style={{ backgroundColor: bgHex, color: baseHex }}
            className="p-4 rounded-xl border border-white/10 transition-colors"
          >
            <h4 className="text-lg font-bold">The quick brown fox jumps over the lazy dog.</h4>
            <p className="text-xs opacity-90 mt-1">
              RocketOS high-contrast typography scaling test. Accessible color combinations guarantee comfort across monitors and lighting conditions.
            </p>
          </div>
        </div>

        {/* 10-Step Tone Ladder */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">Shades & Tones Ladder (Tailwind 50–950)</span>
            <button
              type="button"
              onClick={() => {
                const code = shades.map((s) => `  '${s.step}': '${s.hex}',`).join('\n');
                handleCopy(`{\n${code}\n}`, 'ladder');
              }}
              className="flex items-center gap-1 text-sky-400 hover:underline cursor-pointer text-[11px]"
            >
              {copiedToken === 'ladder' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy Tailwind Palette</span>
            </button>
          </div>

          <div className="grid grid-cols-11 gap-1.5">
            {shades.map((shade) => (
              <div
                key={shade.step}
                onClick={() => handleCopy(shade.hex, String(shade.step))}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div
                  style={{ backgroundColor: shade.hex }}
                  className="w-full h-12 rounded-lg border border-white/10 group-hover:scale-105 transition-transform shadow-xs"
                />
                <span className="text-[10px] font-mono text-slate-400">{shade.step}</span>
                <span className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {shade.hex}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
