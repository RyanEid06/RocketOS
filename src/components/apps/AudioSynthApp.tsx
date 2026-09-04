import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Sliders,
  Play,
  Sparkles,
  Download,
  Zap,
  Activity,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';

type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface NoteKey {
  note: string;
  freq: number;
  key: string;
  isBlack: boolean;
}

export const AudioSynthApp: React.FC = () => {
  const [waveform, setWaveform] = useState<Waveform>('sine');
  const [attack, setAttack] = useState<number>(0.05);
  const [decay, setDecay] = useState<number>(0.1);
  const [sustain, setSustain] = useState<number>(0.6);
  const [release, setRelease] = useState<number>(0.3);
  const [filterFreq, setFilterFreq] = useState<number>(2500);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Piano Keys (C4 to B4)
  const notes: NoteKey[] = [
    { note: 'C4', freq: 261.63, key: 'A', isBlack: false },
    { note: 'C#4', freq: 277.18, key: 'W', isBlack: true },
    { note: 'D4', freq: 293.66, key: 'S', isBlack: false },
    { note: 'D#4', freq: 311.13, key: 'E', isBlack: true },
    { note: 'E4', freq: 329.63, key: 'D', isBlack: false },
    { note: 'F4', freq: 349.23, key: 'F', isBlack: false },
    { note: 'F#4', freq: 369.99, key: 'T', isBlack: true },
    { note: 'G4', freq: 392.0, key: 'G', isBlack: false },
    { note: 'G#4', freq: 415.3, key: 'Y', isBlack: true },
    { note: 'A4', freq: 440.0, key: 'H', isBlack: false },
    { note: 'A#4', freq: 466.16, key: 'U', isBlack: true },
    { note: 'B4', freq: 493.88, key: 'J', isBlack: false },
    { note: 'C5', freq: 523.25, key: 'K', isBlack: false },
  ];

  const playFrequency = (freq: number, dur = 0.5) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);

      // ADSR Envelope
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + attack);
      gain.gain.linearRampToValueAtTime(0.3 * sustain, now + attack + decay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur + release);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + release + 0.1);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const targetNote = notes.find((n) => n.key.toUpperCase() === e.key.toUpperCase());
      if (targetNote) {
        setActiveNote(targetNote.note);
        playFrequency(targetNote.freq);
      }
    };

    const handleKeyUp = () => {
      setActiveNote(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [waveform, attack, decay, sustain, release, filterFreq]);

  // SFX Presets
  const playPresetSfx = (type: 'jump' | 'coin' | 'laser' | 'explosion') => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'jump') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'coin') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'explosion') {
      // Noise buffer
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none font-sans overflow-hidden">
      {/* Top Header */}
      <div className="p-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-sky-400" />
          <span className="font-bold text-xs text-white">AudioLab Synthesizer</span>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
            Web Audio API • Real-Time DSP
          </span>
        </div>

        {/* 8-bit presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">8-Bit SFX:</span>
          {[
            { label: 'Jump', type: 'jump' },
            { label: 'Coin', type: 'coin' },
            { label: 'Laser', type: 'laser' },
            { label: 'Explosion', type: 'explosion' },
          ].map((preset) => (
            <button
              key={preset.type}
              type="button"
              onClick={() => playPresetSfx(preset.type as any)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-white/10 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Controls */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Waveform Selector */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
            <div className="text-xs font-bold text-white">Oscillator Waveform</div>
            <div className="grid grid-cols-2 gap-2">
              {(['sine', 'square', 'sawtooth', 'triangle'] as Waveform[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setWaveform(w);
                  }}
                  className={`p-2 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                    waveform === w ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* ADSR Envelope */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-2 text-xs">
            <div className="font-bold text-white mb-2">ADSR Envelope</div>
            <div className="flex justify-between">
              <span className="text-slate-400">Attack: {attack}s</span>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={attack}
                onChange={(e) => setAttack(parseFloat(e.target.value))}
                className="cursor-pointer"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Decay: {decay}s</span>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={decay}
                onChange={(e) => setDecay(parseFloat(e.target.value))}
                className="cursor-pointer"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sustain: {Math.round(sustain * 100)}%</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={sustain}
                onChange={(e) => setSustain(parseFloat(e.target.value))}
                className="cursor-pointer"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Release: {release}s</span>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={release}
                onChange={(e) => setRelease(parseFloat(e.target.value))}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* Lowpass Filter */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3 text-xs">
            <div className="font-bold text-white">Lowpass Filter Cutoff</div>
            <div className="text-2xl font-mono font-bold text-sky-400">{filterFreq} Hz</div>
            <input
              type="range"
              min="200"
              max="10000"
              step="100"
              value={filterFreq}
              onChange={(e) => setFilterFreq(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">Sweeps high frequencies for warm analog warmth</div>
          </div>
        </div>

        {/* Piano Keyboard */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-white/10">
          <div className="text-xs text-slate-400 mb-3 text-center">
            Play with mouse or keyboard keys (<strong className="text-sky-300">A, W, S, E, D, F, T, G, Y, H, U, J, K</strong>):
          </div>

          <div className="relative h-44 flex justify-center max-w-xl mx-auto select-none">
            {notes.map((note) => {
              const isPlaying = activeNote === note.note;

              if (note.isBlack) {
                return (
                  <button
                    key={note.note}
                    type="button"
                    onMouseDown={() => {
                      setActiveNote(note.note);
                      playFrequency(note.freq);
                    }}
                    onMouseUp={() => setActiveNote(null)}
                    className={`absolute z-10 w-9 h-28 rounded-b-md transition-colors cursor-pointer border border-black flex flex-col justify-end items-center pb-2 text-[10px] font-mono font-bold ${
                      isPlaying ? 'bg-sky-500 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                    style={{
                      left:
                        note.note === 'C#4'
                          ? '12%'
                          : note.note === 'D#4'
                          ? '25%'
                          : note.note === 'F#4'
                          ? '50%'
                          : note.note === 'G#4'
                          ? '63%'
                          : '76%',
                    }}
                  >
                    <span>{note.key}</span>
                  </button>
                );
              }

              return (
                <button
                  key={note.note}
                  type="button"
                  onMouseDown={() => {
                    setActiveNote(note.note);
                    playFrequency(note.freq);
                  }}
                  onMouseUp={() => setActiveNote(null)}
                  className={`flex-1 h-full rounded-b-lg border border-slate-700 transition-colors cursor-pointer flex flex-col justify-end items-center pb-2 text-xs font-mono font-bold ${
                    isPlaying ? 'bg-sky-200 text-slate-950' : 'bg-slate-100 text-slate-900 hover:bg-white'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-sans">{note.note}</span>
                  <span>{note.key}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
