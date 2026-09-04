import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Mic,
  Square,
  Save,
  Image as ImageIcon,
  Sliders,
  RotateCw,
  Sun,
  ListMusic,
  Sparkles,
  Download,
  FolderOpen,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { UserManager } from '../../core/users/UserManager';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSec: number;
  freq: number;
}

const DEFAULT_PLAYLIST: Track[] = [
  {
    id: 't1',
    title: 'Aurora Borealis (Liquid Ambient)',
    artist: 'Rocket Sound Lab',
    duration: '2:45',
    durationSec: 165,
    freq: 432,
  },
  {
    id: 't2',
    title: 'Thread-Confined ARC Dreams',
    artist: 'RyanEid06',
    duration: '3:12',
    durationSec: 192,
    freq: 528,
  },
  {
    id: 't3',
    title: 'Cyberpunk Compiler Pass',
    artist: 'LLVM 22 Synth Ensemble',
    duration: '2:18',
    durationSec: 138,
    freq: 639,
  },
];

export const MediaApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'music' | 'record' | 'photos'>('music');

  // Music Player State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Audio synthesis oscillator ref for real sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const currentTrack = DEFAULT_PLAYLIST[currentTrackIndex];

  // Voice Recorder State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [savedRecordings, setSavedRecordings] = useState<{ name: string; date: string; dur: string }[]>([
    { name: 'voice_memo_001.wav', date: 'Yesterday', dur: '0:14' },
  ]);

  // Photo Editor State
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // Music loop timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= currentTrack.durationSec) {
            if (isLooping) return 0;
            handleNextTrack();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentTrackIndex, isLooping]);

  // Recording timer
  useEffect(() => {
    let recTimer: any;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    soundEngine.playClick();
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % DEFAULT_PLAYLIST.length);
    setCurrentTimeSec(0);
    soundEngine.playClick();
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + DEFAULT_PLAYLIST.length) % DEFAULT_PLAYLIST.length);
    setCurrentTimeSec(0);
    soundEngine.playClick();
  };

  const toggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      const name = `memo_${Date.now().toString().slice(-4)}.wav`;
      const mins = Math.floor(recordSeconds / 60);
      const secs = (recordSeconds % 60).toString().padStart(2, '0');
      const newRec = { name, date: 'Just now', dur: `${mins}:${secs}` };
      setSavedRecordings([newRec, ...savedRecordings]);

      // Save to RocketFS /home/ryan/Music
      const rfs = RocketFS.getInstance();
      const user = UserManager.getInstance().getCurrentUser();
      rfs.createFile(`/home/ryan/Music/${name}`, `# Audio Recording Blob\nDuration: ${mins}:${secs}\n`, user);

      setRecordSeconds(0);
      soundEngine.playSuccess();
    } else {
      setIsRecording(true);
      setRecordSeconds(0);
      soundEngine.playClick();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <Music className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs tracking-wide">Rocket Media & Audio Studio</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('music')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'music'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-3 h-3" />
            <span>Music Player</span>
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'record'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>Voice Recorder</span>
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Photo Studio</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'music' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Visualizer & Now Playing Area */}
            <div className="flex-1 p-6 flex flex-col items-center justify-between overflow-y-auto custom-scrollbar">
              <div className="w-full flex justify-between items-center text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  Hi-Fi 48kHz / 24-bit Lossless
                </span>
                <span className="font-mono">{currentTrack.freq} Hz Harmonic Tuning</span>
              </div>

              {/* Album Art & Real-time Frequency Bar Visualization */}
              <div className="flex flex-col items-center gap-6 my-auto">
                <div className="relative w-48 h-48 rounded-3xl bg-gradient-to-tr from-pink-600 to-indigo-600 p-1 shadow-2xl shadow-pink-500/20 group">
                  <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                    <Music className={`w-14 h-14 text-pink-400 ${isPlaying ? 'animate-bounce' : ''}`} />
                    <span className="text-[11px] font-mono text-pink-300 font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30">
                      ROCKET AUDIO
                    </span>
                  </div>
                </div>

                {/* Animated Spectrum Analyzer Bars */}
                <div className="flex items-end justify-center gap-1.5 h-12 w-64 px-4">
                  {[24, 48, 70, 95, 60, 85, 40, 75, 90, 55, 35, 65, 80, 50].map((h, i) => (
                    <div
                      key={i}
                      className="w-2.5 bg-gradient-to-t from-pink-500 to-indigo-400 rounded-full transition-all duration-200"
                      style={{
                        height: isPlaying ? `${Math.floor(Math.max(12, h * Math.random()))}%` : '15%',
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <h3 className="font-bold text-base text-white">{currentTrack.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{currentTrack.artist}</p>
                </div>
              </div>

              {/* Playback Controls & Scrubber */}
              <div className="w-full max-w-md space-y-3">
                {/* Scrubber Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden cursor-pointer">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-indigo-400"
                      style={{
                        width: `${(currentTimeSec / currentTrack.durationSec) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatTime(currentTimeSec)}</span>
                    <span>{currentTrack.duration}</span>
                  </div>
                </div>

                {/* Buttons Row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isLooping ? 'text-pink-400 bg-pink-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevTrack}
                      className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white cursor-pointer transition-colors"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-600/30 cursor-pointer transition-transform hover:scale-105"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>

                    <button
                      onClick={handleNextTrack}
                      className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white cursor-pointer transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 hover:text-white cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 accent-pink-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Playlist Sidebar */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/40 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                RocketOS Soundtracks ({DEFAULT_PLAYLIST.length})
              </span>
              <div className="space-y-1.5">
                {DEFAULT_PLAYLIST.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setCurrentTimeSec(0);
                      setIsPlaying(true);
                      soundEngine.playClick();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      currentTrackIndex === idx
                        ? 'bg-pink-500/20 border-pink-500/40 text-white'
                        : 'bg-black/20 border-white/5 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">{track.title}</div>
                      <div className="text-[10px] text-slate-400">{track.artist}</div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0">
                      {track.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6 overflow-y-auto">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-white">Voice & Audio Recorder</h3>
              <p className="text-xs text-slate-400">
                Captures high-bitrate PCM audio and streams directly into /home/ryan/Music
              </p>
            </div>

            {/* Recording Pulse Ring */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <div className="absolute w-36 h-36 rounded-full bg-rose-500/20 animate-ping" />
              )}
              <button
                onClick={toggleRecord}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white scale-110'
                    : 'bg-white/10 hover:bg-white/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isRecording ? <Square className="w-8 h-8 fill-white" /> : <Mic className="w-10 h-10" />}
              </button>
            </div>

            <div className="font-mono text-2xl font-bold text-white tracking-widest">
              {formatTime(recordSeconds)}
            </div>

            {/* Saved Recordings Shelf */}
            <div className="w-full max-w-md space-y-2 mt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saved Recordings
              </span>
              <div className="space-y-1.5">
                {savedRecordings.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-white">{rec.name}</div>
                      <div className="text-[10px] text-slate-400">{rec.date}</div>
                    </div>
                    <span className="font-mono text-pink-400">{rec.dur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Image Preview Canvas */}
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
              <div
                className="max-w-md w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all"
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
                  alt="Liquid Aurora Sample"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Adjustments Sidebar */}
            <div className="w-72 border-l border-white/10 bg-slate-900/40 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Photo Adjustments
              </span>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Brightness</span>
                    <span className="font-mono">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Contrast</span>
                    <span className="font-mono">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
