import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Clock,
  Cpu,
  HardDrive,
  StickyNote,
  Sparkles,
  RefreshCw,
  Palette,
  Check,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

interface Sticky {
  id: string;
  title: string;
  body: string;
  color: 'amber' | 'emerald' | 'sky' | 'rose' | 'violet';
  updatedAt: string;
}

const COLOR_CLASSES = {
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-200 placeholder:text-amber-300/40',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 placeholder:text-emerald-300/40',
  sky: 'bg-sky-500/15 border-sky-500/30 text-sky-200 placeholder:text-sky-300/40',
  rose: 'bg-rose-500/15 border-rose-500/30 text-rose-200 placeholder:text-rose-300/40',
  violet: 'bg-purple-500/15 border-purple-500/30 text-purple-200 placeholder:text-purple-300/40',
};

export const WidgetsApp: React.FC = () => {
  const [stickies, setStickies] = useState<Sticky[]>(() => {
    const saved = localStorage.getItem('rocketos_stickies_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: '1',
        title: 'Project Goals',
        body: 'Build Rocket 2.1 native modules using clean ABI v1 interfaces.\nKeep memory allocations thread-confined.',
        color: 'sky',
        updatedAt: 'Today',
      },
      {
        id: '2',
        title: 'Syntax Reminder',
        body: 'Functions return values with -> Type:\nmatch expressions require exhaustiveness.',
        color: 'amber',
        updatedAt: 'Today',
      },
    ];
  });

  // Resource telemetry simulation
  const [cpuUsage, setCpuUsage] = useState<number>(24);
  const [ramUsage, setRamUsage] = useState<number>(1420);
  const [uptime, setUptime] = useState<number>(3720);

  useEffect(() => {
    localStorage.setItem('rocketos_stickies_v1', JSON.stringify(stickies));
  }, [stickies]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(8, Math.min(85, prev + delta));
      });
      setUptime((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addSticky = () => {
    const colors: Sticky['color'][] = ['amber', 'emerald', 'sky', 'rose', 'violet'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newSticky: Sticky = {
      id: `sticky-${Date.now()}`,
      title: 'New Note',
      body: '',
      color: randomColor,
      updatedAt: 'Just now',
    };
    setStickies((prev) => [newSticky, ...prev]);
    soundEngine.playOpen();
  };

  const updateSticky = (id: string, updates: Partial<Sticky>) => {
    setStickies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: 'Just now' } : s))
    );
  };

  const deleteSticky = (id: string) => {
    setStickies((prev) => prev.filter((s) => s.id !== id));
    soundEngine.playTrash();
  };

  const formatUptime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Desktop Widgets & Sticky Notes Shelf</span>
        </div>
        <button
          onClick={addSticky}
          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Sticky Note
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Live System Resource Gauges */}
        <div className="w-72 border-r border-white/10 bg-slate-900/40 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            System Live Gauges
          </span>

          {/* CPU Gauge Card */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                <Cpu className="w-3.5 h-3.5" />
                Processor Core
              </span>
              <span className="font-mono text-white font-bold">{cpuUsage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500"
                style={{ width: `${cpuUsage}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>AMD64 8-Core</span>
              <span>2.40 GHz</span>
            </div>
          </div>

          {/* Memory Gauge Card */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                <HardDrive className="w-3.5 h-3.5" />
                Memory (RAM)
              </span>
              <span className="font-mono text-white font-bold">{Math.round((ramUsage / 4096) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all duration-500"
                style={{ width: `${(ramUsage / 4096) * 100}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>{ramUsage} MB Used</span>
              <span>4,096 MB Total</span>
            </div>
          </div>

          {/* World Timezone Clocks */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Global Clocks
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">San Francisco (PT)</span>
                <span className="font-mono text-white font-medium">
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">London (UTC)</span>
                <span className="font-mono text-white font-medium">
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Tokyo (JST)</span>
                <span className="font-mono text-white font-medium">
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto text-[11px] text-slate-500 text-center">
            System Uptime: {formatUptime(uptime)}
          </div>
        </div>

        {/* Right Side: Sticky Notes Canvas */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stickies.map((sticky) => (
              <div
                key={sticky.id}
                className={`p-4 rounded-2xl border flex flex-col gap-2.5 transition-all shadow-lg ${COLOR_CLASSES[sticky.color]}`}
              >
                {/* Note Header */}
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={sticky.title}
                    onChange={(e) => updateSticky(sticky.id, { title: e.target.value })}
                    className="bg-transparent font-bold text-sm outline-none border-none flex-1"
                    placeholder="Note Title..."
                  />
                  <div className="flex items-center gap-1.5">
                    {/* Color picker toggles */}
                    {(['amber', 'emerald', 'sky', 'rose', 'violet'] as Sticky['color'][]).map((c) => (
                      <button
                        key={c}
                        onClick={() => updateSticky(sticky.id, { color: c })}
                        className={`w-3 h-3 rounded-full transition-transform ${
                          c === 'amber'
                            ? 'bg-amber-400'
                            : c === 'emerald'
                            ? 'bg-emerald-400'
                            : c === 'sky'
                            ? 'bg-sky-400'
                            : c === 'rose'
                            ? 'bg-rose-400'
                            : 'bg-purple-400'
                        } ${sticky.color === c ? 'scale-125 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'}`}
                      />
                    ))}
                    <button
                      onClick={() => deleteSticky(sticky.id)}
                      className="p-1 rounded hover:bg-black/20 opacity-70 hover:opacity-100 transition-opacity ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Body */}
                <textarea
                  value={sticky.body}
                  onChange={(e) => updateSticky(sticky.id, { body: e.target.value })}
                  rows={5}
                  placeholder="Type sticky note text here..."
                  className="bg-transparent resize-none outline-none text-xs leading-relaxed font-sans"
                />

                <div className="text-[10px] opacity-60 text-right mt-1">
                  Updated {sticky.updatedAt}
                </div>
              </div>
            ))}
          </div>

          {stickies.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
              <StickyNote className="w-8 h-8 opacity-40" />
              <p className="text-xs">No sticky notes active. Click "Add Sticky Note" to create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
