import React, { useState, useEffect } from 'react';
import {
  Clock as ClockIcon,
  Cpu,
  StickyNote,
  Plus,
  Trash2,
  Minimize2,
  Maximize2,
  X,
  Palette,
  Check,
  Activity,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

export interface DesktopWidgetsProps {
  onOpenApp?: (appId: string, extraData?: Record<string, any>) => void;
}

interface StickyNoteItem {
  id: string;
  text: string;
  color: 'amber' | 'emerald' | 'sky' | 'violet' | 'rose';
  updatedAt: string;
}

const STICKY_COLORS: Record<StickyNoteItem['color'], { bg: string; border: string; text: string; dot: string }> = {
  amber: {
    bg: 'bg-amber-950/40 backdrop-blur-md',
    border: 'border-amber-500/30',
    text: 'text-amber-200 placeholder:text-amber-300/40',
    dot: 'bg-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-950/40 backdrop-blur-md',
    border: 'border-emerald-500/30',
    text: 'text-emerald-200 placeholder:text-emerald-300/40',
    dot: 'bg-emerald-400',
  },
  sky: {
    bg: 'bg-sky-950/40 backdrop-blur-md',
    border: 'border-sky-500/30',
    text: 'text-sky-200 placeholder:text-sky-300/40',
    dot: 'bg-sky-400',
  },
  violet: {
    bg: 'bg-purple-950/40 backdrop-blur-md',
    border: 'border-purple-500/30',
    text: 'text-purple-200 placeholder:text-purple-300/40',
    dot: 'bg-purple-400',
  },
  rose: {
    bg: 'bg-rose-950/40 backdrop-blur-md',
    border: 'border-rose-500/30',
    text: 'text-rose-200 placeholder:text-rose-300/40',
    dot: 'bg-rose-400',
  },
};

export const DesktopWidgets: React.FC<DesktopWidgetsProps> = ({ onOpenApp }) => {
  const [showWidgets, setShowWidgets] = useState<boolean>(() => {
    const saved = localStorage.getItem('rocket_desktop_widgets_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'stats'>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [cpuUsage, setCpuUsage] = useState<number>(28);
  const [ramUsageMb, setRamUsageMb] = useState<number>(1480);
  const totalRamMb = 4096;

  // Stickies state
  const [stickies, setStickies] = useState<StickyNoteItem[]>(() => {
    const saved = localStorage.getItem('rocket_desktop_stickies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'desk-note-1',
        text: 'Welcome to RocketOS 2.1!\n• Thread-confined ARC\n• Zero runtime nulls\n• Fast native safety',
        color: 'sky',
        updatedAt: 'Just now',
      },
    ];
  });

  const [activeStickyIdx, setActiveStickyIdx] = useState<number>(0);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // System stats telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(12, Math.min(88, prev + delta));
      });
      setRamUsageMb((prev) => {
        const delta = Math.floor(Math.random() * 21) - 10;
        return Math.max(1200, Math.min(2600, prev + delta));
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Save stickies
  useEffect(() => {
    localStorage.setItem('rocket_desktop_stickies', JSON.stringify(stickies));
  }, [stickies]);

  // Save visibility
  useEffect(() => {
    localStorage.setItem('rocket_desktop_widgets_enabled', String(showWidgets));
  }, [showWidgets]);

  if (!showWidgets) {
    return (
      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
        <button
          onClick={() => {
            setShowWidgets(true);
            soundEngine.playOpen();
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/80 text-slate-300 hover:text-white border border-white/10 text-xs font-medium backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          title="Show Desktop Widgets"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Widgets</span>
        </button>
      </div>
    );
  }

  const currentSticky = stickies[activeStickyIdx] || stickies[0];

  const handleAddNote = () => {
    const colors: StickyNoteItem['color'][] = ['amber', 'emerald', 'sky', 'violet', 'rose'];
    const newColor = colors[Math.floor(Math.random() * colors.length)];
    const newNote: StickyNoteItem = {
      id: `desk-note-${Date.now()}`,
      text: '',
      color: newColor,
      updatedAt: 'Just now',
    };
    setStickies((prev) => [newNote, ...prev]);
    setActiveStickyIdx(0);
    soundEngine.playSuccess();
  };

  const handleDeleteNote = (id: string) => {
    if (stickies.length <= 1) {
      // Clear instead of removing last
      setStickies([{ id: 'desk-note-1', text: '', color: 'sky', updatedAt: 'Just now' }]);
      setActiveStickyIdx(0);
      return;
    }
    setStickies((prev) => prev.filter((s) => s.id !== id));
    setActiveStickyIdx(0);
    soundEngine.playDelete();
  };

  const handleUpdateCurrentNote = (text: string) => {
    if (!currentSticky) return;
    setStickies((prev) =>
      prev.map((s) => (s.id === currentSticky.id ? { ...s, text, updatedAt: 'Just now' } : s))
    );
  };

  const handleChangeNoteColor = (color: StickyNoteItem['color']) => {
    if (!currentSticky) return;
    setStickies((prev) =>
      prev.map((s) => (s.id === currentSticky.id ? { ...s, color } : s))
    );
  };

  const timeFormatted = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateFormatted = currentTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="absolute top-4 right-4 z-10 w-72 pointer-events-auto space-y-3 select-none animate-in fade-in slide-in-from-top-2 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Widget Container Header */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs text-slate-300 shadow-lg">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Desktop Shelf</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowWidgets(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Hide Widgets"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. Live Clock & Calendar Widget */}
      <div
        onClick={() => onOpenApp && onOpenApp('settings', { tab: 'time' })}
        className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900/85 backdrop-blur-xl border border-white/15 shadow-xl transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Local System Time</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">UTC+0</span>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight text-white drop-shadow-sm group-hover:text-sky-300 transition-colors">
          {timeFormatted}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {dateFormatted}
          </span>
          <span className="text-[10px] text-slate-500">60 FPS Sync</span>
        </div>
      </div>

      {/* 2. System Resource Telemetry Widget */}
      <div
        onClick={() => onOpenApp && onOpenApp('taskmanager')}
        className="p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900/85 backdrop-blur-xl border border-white/15 shadow-xl transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Hardware Telemetry</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono">
            Online
          </span>
        </div>

        {/* CPU Bar */}
        <div className="space-y-1 mb-2.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-400" /> CPU Load
            </span>
            <span className="font-mono text-slate-200 font-medium">{cpuUsage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        {/* RAM Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" /> ARC Heap RAM
            </span>
            <span className="font-mono text-slate-200 font-medium">
              {(ramUsageMb / 1024).toFixed(1)} / 4.0 GB
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-500"
              style={{ width: `${(ramUsageMb / totalRamMb) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Quick Sticky Notes Widget */}
      {currentSticky && (
        <div
          className={`p-3.5 rounded-2xl border shadow-xl transition-all ${
            STICKY_COLORS[currentSticky.color].bg
          } ${STICKY_COLORS[currentSticky.color].border}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              <StickyNote className="w-3.5 h-3.5 text-amber-300" />
              <span>Quick Note</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({activeStickyIdx + 1}/{stickies.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddNote}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="New Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteNote(currentSticky.id)}
                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Delete Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            value={currentSticky.text}
            onChange={(e) => handleUpdateCurrentNote(e.target.value)}
            placeholder="Type a quick desktop note..."
            rows={3}
            className={`w-full bg-transparent border-none resize-none focus:outline-none text-xs font-sans leading-relaxed ${
              STICKY_COLORS[currentSticky.color].text
            }`}
          />

          {/* Footer with color selector and note pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
            <div className="flex items-center gap-1">
              {(['amber', 'emerald', 'sky', 'violet', 'rose'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => handleChangeNoteColor(c)}
                  className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${
                    STICKY_COLORS[c].dot
                  } ${currentSticky.color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>

            {stickies.length > 1 && (
              <div className="flex items-center gap-1">
                {stickies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStickyIdx(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                      activeStickyIdx === idx ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
