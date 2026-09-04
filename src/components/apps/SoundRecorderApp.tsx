import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Volume2,
  Sliders,
  Sparkles,
  Save,
  Clock,
  Radio,
  FileAudio,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { notificationService } from '../../core/notifications/NotificationService';
import { RocketFS } from '../../core/filesystem/RocketFS';

export interface AudioRecording {
  id: string;
  name: string;
  durationSeconds: number;
  date: string;
  size: string;
  format: 'WAV' | 'OGG';
}

const INITIAL_RECORDINGS: AudioRecording[] = [
  {
    id: 'rec-1',
    name: 'Rocket_Compiler_Sync_Notes.wav',
    durationSeconds: 42,
    date: '2026-09-04 10:15',
    size: '1.4 MB',
    format: 'WAV',
  },
  {
    id: 'rec-2',
    name: 'Raylib_Bezier_Soundtrack.wav',
    durationSeconds: 118,
    date: '2026-09-03 16:40',
    size: '3.8 MB',
    format: 'WAV',
  },
];

export const SoundRecorderApp: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordTimeSeconds, setRecordTimeSeconds] = useState<number>(0);
  const [recordings, setRecordings] = useState<AudioRecording[]>(INITIAL_RECORDINGS);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const playTimerRef = useRef<number | null>(null);

  // Live Canvas Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (isRecording && !isPaused) {
        // Draw active waveform
        const numBars = 48;
        const barWidth = width / numBars - 2;
        phase += 0.05;

        // Simulated dynamic mic level
        const currentEnergy = Math.sin(phase * 2) * 0.3 + 0.5 + Math.random() * 0.2;
        setMicLevel(Math.min(1, Math.max(0.1, currentEnergy)));

        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + 2);
          const waveHeight =
            Math.sin(i * 0.25 + phase) * Math.cos(i * 0.1 - phase) * (height * 0.4) * currentEnergy;
          const barH = Math.max(4, Math.abs(waveHeight) * 2);
          const y = (height - barH) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(1, '#8b5cf6');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, 2);
          ctx.fill();
        }
      } else {
        // Flat baseline line
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, isPaused]);

  // Recording Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setRecordTimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Start recording
  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordTimeSeconds(0);
    soundEngine.play('click');
  };

  // Pause / Resume
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
    soundEngine.play('click');
  };

  // Stop & Save
  const handleStopRecording = () => {
    if (recordTimeSeconds === 0) {
      setIsRecording(false);
      setIsPaused(false);
      return;
    }

    const duration = recordTimeSeconds;
    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const fileName = `Voice_Recording_${Date.now().toString().slice(-4)}.wav`;
    const sizeMb = ((duration * 32) / 1024).toFixed(1) + ' MB';

    const newRec: AudioRecording = {
      id: `rec-${Date.now()}`,
      name: fileName,
      durationSeconds: duration,
      date: dateStr,
      size: sizeMb,
      format: 'WAV',
    };

    setRecordings((prev) => [newRec, ...prev]);
    setIsRecording(false);
    setIsPaused(false);
    setRecordTimeSeconds(0);
    setMicLevel(0);
    soundEngine.play('success');

    // Save to RocketFS /Documents folder
    try {
      const vfs = RocketFS.getInstance();
      vfs.createFile(
        `/Documents/${fileName}`,
        `[RocketOS Audio Stream Data (RIFF WAV, 48000Hz, 16-bit PCM, Duration: ${duration}s)]`
      );
    } catch {
      // ignore
    }

    notificationService.notify({
      title: 'Recording Saved',
      message: `Saved ${fileName} (${duration}s) to /Documents`,
      type: 'info',
      appId: 'recorder',
    });
  };

  // Play / Pause existing recording
  const handleTogglePlay = (rec: AudioRecording) => {
    if (playingId === rec.id) {
      // Stop
      setPlayingId(null);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setPlaybackProgress(0);
      soundEngine.play('click');
    } else {
      // Play
      setPlayingId(rec.id);
      setPlaybackProgress(0);
      soundEngine.play('click');

      if (playTimerRef.current) clearInterval(playTimerRef.current);
      playTimerRef.current = window.setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            clearInterval(playTimerRef.current!);
            setPlayingId(null);
            return 0;
          }
          return prev + 100 / rec.durationSeconds;
        });
      }, 1000);
    }
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (playingId === id) setPlayingId(null);
    soundEngine.playTrash();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Sound Studio & Voice Recorder
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                48 kHz
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">High-fidelity audio recording & waveform synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <Radio className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span className="font-mono">Input: Virtual Audio Daemon</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Waveform Display Monitor */}
        <div className="flex-1 bg-slate-900/60 rounded-3xl border border-white/10 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          {/* Top telemetry in screen */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isRecording
                    ? isPaused
                      ? 'bg-amber-400'
                      : 'bg-rose-500 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Standby'}
              </span>
            </div>

            {/* Live Clock Timer */}
            <div className="text-4xl lg:text-5xl font-mono font-light tracking-tight text-white drop-shadow-md">
              {formatTime(recordTimeSeconds)}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-mono block">Format</span>
              <span className="text-xs font-mono text-pink-400 font-semibold">16-bit PCM WAV</span>
            </div>
          </div>

          {/* Oscilloscope Canvas */}
          <div className="w-full h-40 flex items-center justify-center my-4">
            <canvas
              ref={canvasRef}
              width={600}
              height={140}
              className="w-full h-full rounded-2xl bg-black/40 border border-white/5"
            />
          </div>

          {/* VU Meter & Level Indicators */}
          <div className="space-y-1 z-10">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Input Gain</span>
              <span>{Math.round(micLevel * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/50 overflow-hidden flex gap-0.5 p-0.5 border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-75"
                style={{ width: `${micLevel * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Record Control Bar */}
        <div className="h-20 flex items-center justify-center gap-6 mt-4">
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer group"
              title="Start Recording"
            >
              <div className="w-6 h-6 rounded-full bg-white group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <div className="flex items-center gap-4 animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={handleTogglePause}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleStopRecording}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all active:scale-95 cursor-pointer"
                title="Stop & Save"
              >
                <Square className="w-6 h-6 fill-white" />
              </button>
            </div>
          )}
        </div>

        {/* Recordings History Drawer */}
        <div className="h-48 border-t border-white/10 pt-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Saved Voice Notes ({recordings.length})</span>
            <span className="text-[11px] font-mono text-slate-500">Destination: /Documents</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {recordings.map((rec) => {
              const isPlaying = playingId === rec.id;
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(rec)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-pink-500 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{rec.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {formatTime(rec.durationSeconds)} • {rec.size} • {rec.date}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar when playing */}
                  {isPlaying && (
                    <div className="flex-1 max-w-xs mx-4">
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all duration-300"
                          style={{ width: `${playbackProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRecording(rec.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
