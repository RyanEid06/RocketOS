import React, { useState, useEffect, useRef } from 'react';
import {
  Clock as ClockIcon,
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Globe,
  Flame,
  Coffee,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';

type ClockTab = 'world' | 'stopwatch' | 'timer' | 'pomodoro';

interface WorldTimezone {
  city: string;
  country: string;
  tz: string;
}

export const ClockApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ClockTab>('world');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // World Clocks
  const timezones: WorldTimezone[] = [
    { city: 'UTC Universal', country: 'Standard', tz: 'UTC' },
    { city: 'San Francisco', country: 'United States (PST)', tz: 'America/Los_Angeles' },
    { city: 'New York', country: 'United States (EST)', tz: 'America/New_York' },
    { city: 'London', country: 'United Kingdom (GMT)', tz: 'Europe/London' },
    { city: 'Tokyo', country: 'Japan (JST)', tz: 'Asia/Tokyo' },
    { city: 'Sydney', country: 'Australia (AEST)', tz: 'Australia/Sydney' },
  ];

  // Stopwatch state
  const [swRunning, setSwRunning] = useState<boolean>(false);
  const [swElapsedMs, setSwElapsedMs] = useState<number>(0);
  const [laps, setLaps] = useState<number[]>([]);
  const swStartTimeRef = useRef<number>(0);

  useEffect(() => {
    let animFrame: number;
    if (swRunning) {
      const start = Date.now() - swElapsedMs;
      const update = () => {
        setSwElapsedMs(Date.now() - start);
        animFrame = requestAnimationFrame(update);
      };
      animFrame = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [swRunning]);

  const handleSwToggle = () => {
    soundEngine.play('click');
    setSwRunning(!swRunning);
  };

  const handleSwReset = () => {
    soundEngine.play('trash');
    setSwRunning(false);
    setSwElapsedMs(0);
    setLaps([]);
  };

  const handleSwLap = () => {
    soundEngine.play('snap');
    setLaps((prev) => [swElapsedMs, ...prev]);
  };

  const formatStopwatch = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  // Timer State
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(300); // default 5m
  const [timerTotal, setTimerTotal] = useState<number>(300);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimerRunning(false);
            soundEngine.playSuccess();
            notificationService.sendNotification({
              title: 'Timer Complete',
              body: 'Your countdown timer has expired!',
              severity: 'info',
              sourceAppId: 'clock',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const setTimerPreset = (secs: number) => {
    soundEngine.play('click');
    setTimerRunning(false);
    setTimerTotal(secs);
    setTimerSecondsLeft(secs);
  };

  // Pomodoro State
  const [pomoMode, setPomoMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [pomoSeconds, setPomoSeconds] = useState<number>(25 * 60);
  const [pomoRunning, setPomoRunning] = useState<boolean>(false);
  const [pomoCount, setPomoCount] = useState<number>(3);

  useEffect(() => {
    let interval: any;
    if (pomoRunning) {
      interval = setInterval(() => {
        setPomoSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPomoRunning(false);
            soundEngine.playSuccess();

            if (pomoMode === 'focus') {
              setPomoCount((c) => c + 1);
              setPomoMode('shortBreak');
              setPomoSeconds(5 * 60);
              notificationService.sendNotification({
                title: 'Focus Session Complete!',
                body: 'Great work! Take a 5-minute break.',
                severity: 'info',
                sourceAppId: 'clock',
              });
            } else {
              setPomoMode('focus');
              setPomoSeconds(25 * 60);
              notificationService.sendNotification({
                title: 'Break Over',
                body: 'Ready to start another focus block?',
                severity: 'info',
                sourceAppId: 'clock',
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomoRunning, pomoMode]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Navigation */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('world')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'world' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>World Clock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stopwatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'stopwatch' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5" />
            <span>Stopwatch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'timer' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Timer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pomodoro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'pomodoro' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Focus & Pomodoro</span>
          </button>
        </div>

        <div className="font-mono text-xs text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col justify-center">
        {/* WORLD CLOCK */}
        {activeTab === 'world' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {timezones.map((item) => {
              const timeStr = currentTime.toLocaleTimeString('en-US', {
                timeZone: item.tz,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });
              const dateStr = currentTime.toLocaleDateString('en-US', {
                timeZone: item.tz,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={item.tz} className="p-4 bg-slate-900/80 rounded-xl border border-white/10 flex flex-col justify-between h-32 hover:border-sky-500/30 transition-all">
                  <div>
                    <div className="font-bold text-sm text-white">{item.city}</div>
                    <div className="text-[10px] text-slate-400">{item.country}</div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black font-mono tracking-wider text-sky-400">{timeStr}</div>
                    <div className="text-[10px] font-mono text-slate-500">{dateStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STOPWATCH */}
        {activeTab === 'stopwatch' && (
          <div className="max-w-md mx-auto w-full flex flex-col items-center space-y-6">
            <div className="text-6xl font-black font-mono tracking-wider text-white drop-shadow-lg">
              {formatStopwatch(swElapsedMs)}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSwToggle}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-lg ${
                  swRunning ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
                }`}
              >
                {swRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{swRunning ? 'Pause' : 'Start'}</span>
              </button>

              <button
                type="button"
                onClick={handleSwLap}
                disabled={!swRunning}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs border border-white/10 cursor-pointer disabled:opacity-40 transition-colors"
              >
                <Flag className="w-4 h-4 text-emerald-400" />
                <span>Lap</span>
              </button>

              <button
                type="button"
                onClick={handleSwReset}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/10 cursor-pointer transition-colors"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Lap list */}
            {laps.length > 0 && (
              <div className="w-full max-h-40 overflow-y-auto border border-white/10 rounded-xl bg-slate-900/60 divide-y divide-white/5 font-mono text-xs">
                {laps.map((lapTime, idx) => (
                  <div key={idx} className="p-2 px-3 flex justify-between">
                    <span className="text-slate-400">Lap #{laps.length - idx}</span>
                    <span className="text-white font-bold">{formatStopwatch(lapTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TIMER */}
        {activeTab === 'timer' && (
          <div className="max-w-md mx-auto w-full flex flex-col items-center space-y-6">
            <div className="text-6xl font-black font-mono tracking-wider text-white">
              {Math.floor(timerSecondsLeft / 60).toString().padStart(2, '0')}:
              {(timerSecondsLeft % 60).toString().padStart(2, '0')}
            </div>

            {/* Quick presets */}
            <div className="flex gap-2">
              {[60, 300, 600, 900, 1800].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTimerPreset(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                    timerTotal === s ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {s / 60}m
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click');
                  setTimerRunning(!timerRunning);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-sky-500/20"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{timerRunning ? 'Pause' : 'Start Timer'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.play('trash');
                  setTimerRunning(false);
                  setTimerSecondsLeft(timerTotal);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/10 cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* POMODORO */}
        {activeTab === 'pomodoro' && (
          <div className="max-w-md mx-auto w-full flex flex-col items-center space-y-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPomoMode('focus');
                  setPomoSeconds(25 * 60);
                  setPomoRunning(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  pomoMode === 'focus' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400'
                }`}
              >
                Focus (25m)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPomoMode('shortBreak');
                  setPomoSeconds(5 * 60);
                  setPomoRunning(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  pomoMode === 'shortBreak' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
                }`}
              >
                Short Break (5m)
              </button>
            </div>

            <div className="text-7xl font-black font-mono tracking-wider text-rose-400 drop-shadow-md">
              {Math.floor(pomoSeconds / 60).toString().padStart(2, '0')}:
              {(pomoSeconds % 60).toString().padStart(2, '0')}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.play('click');
                  setPomoRunning(!pomoRunning);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {pomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{pomoRunning ? 'Pause Session' : 'Start Focus'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.play('trash');
                  setPomoRunning(false);
                  setPomoSeconds(pomoMode === 'focus' ? 25 * 60 : 5 * 60);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/10 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{pomoCount} Pomodoro Sessions Completed Today</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
