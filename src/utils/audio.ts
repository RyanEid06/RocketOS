// Web Audio Synthesizer Engine for RocketOS
// Procedurally synthesizes clean harmonic UI sounds with zero latency or external assets

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 85;
  private masterMuted: boolean = false;

  public setMasterSettings(volume: number, isMuted: boolean): void {
    this.masterVolume = Math.max(0, Math.min(100, volume));
    this.masterMuted = isMuted;
  }

  public isMuted(): boolean {
    return this.masterMuted || this.masterVolume <= 0;
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private resolveAudioParams(volume?: number, muted?: boolean): { vol: number; silent: boolean } {
    const activeMuted = muted !== undefined ? muted : this.masterMuted;
    const activeVol = volume !== undefined ? volume : this.masterVolume;
    const isSilent = activeMuted || activeVol <= 0;
    return { vol: activeVol, silent: isSilent };
  }

  // Soft harmonic chime for opening an application or window
  playWindowOpen(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(480, t);
      osc1.frequency.exponentialRampToValueAtTime(880, t + 0.14);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(720, t);
      osc2.frequency.exponentialRampToValueAtTime(1320, t + 0.14);

      const masterVol = (vol / 100) * 0.12;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.2);
      osc2.stop(t + 0.2);
    } catch {}
  }

  // Alias for opening an app, window, or menu
  playOpen(volume?: number, muted?: boolean) {
    this.playWindowOpen(volume, muted);
  }

  // Gentle descending waterdrop pop for window minimize
  playMinimize(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

      const masterVol = (vol / 100) * 0.15;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Gentle ascending pop for window restore
  playRestore(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);

      const masterVol = (vol / 100) * 0.15;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Crisp metallic latch tap for taskbar pin/unpin
  playPin(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1240, t + 0.02);

      const masterVol = (vol / 100) * 0.18;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {}
  }

  // Glass snap click when docking or window edge snapping
  playSnap(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(980, t + 0.08);

      const masterVol = (vol / 100) * 0.16;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // Smooth whoosh sound when switching virtual desktop workspaces
  playWorkspaceSwitch(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(560, t + 0.09);

      const masterVol = (vol / 100) * 0.14;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  // Subtle hover tick
  playHover(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(720, t + 0.04);
      const masterVol = (vol / 100) * 0.05;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {}
  }

  // Gentle click sound
  playClick(volume?: number, muted?: boolean) {
    this.playHover(volume, muted);
  }

  // Soft keyboard mechanical click for editor/repl
  playKeyboard(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);
      const masterVol = (vol / 100) * 0.04;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {}
  }

  // Harmonic success chime
  playSuccess(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc1.frequency.setValueAtTime(659.25, t + 0.08); // E5
      osc1.frequency.setValueAtTime(783.99, t + 0.16); // G5
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, t + 0.16); // C6
      const masterVol = (vol / 100) * 0.1;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.36);
      osc2.start(t + 0.16);
      osc2.stop(t + 0.36);
    } catch {}
  }

  // Deletion / Recycle Bin sound
  playTrash(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

      const masterVol = (vol / 100) * 0.16;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  // Soft dismissal pop for window close
  playClose(volume?: number, muted?: boolean) {
    const { vol, silent } = this.resolveAudioParams(volume, muted);
    if (silent) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);

      const masterVol = (vol / 100) * 0.12;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.13);
    } catch {}
  }

  // Unified sound dispatcher for generic play calls
  play(sound: 'click' | 'open' | 'close' | 'minimize' | 'restore' | 'pin' | 'snap' | 'trash' | 'navigate' | 'hover' | string) {
    switch (sound) {
      case 'open':
        this.playOpen();
        break;
      case 'close':
        this.playClose();
        break;
      case 'minimize':
        this.playMinimize();
        break;
      case 'restore':
        this.playRestore();
        break;
      case 'pin':
        this.playPin();
        break;
      case 'snap':
        this.playSnap();
        break;
      case 'trash':
        this.playTrash();
        break;
      case 'navigate':
        this.playWorkspaceSwitch();
        break;
      case 'hover':
        this.playHover();
        break;
      case 'click':
      default:
        this.playHover();
        break;
    }
  }

  // Per-app volume control tracking
  private appVolumes: Map<string, number> = new Map();

  public setAppVolume(appId: string, volume: number): void {
    this.appVolumes.set(appId, Math.max(0, Math.min(100, volume)));
  }

  public getAppVolume(appId: string): number {
    return this.appVolumes.get(appId) ?? 100;
  }

  // Ambient Focus Generator for deep work sessions
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private currentAmbientType: string | null = null;

  public startAmbientFocus(type: 'rain' | 'whitenoise' | 'binaural', volume: number = 20) {
    this.stopAmbientFocus();
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime((Math.min(100, Math.max(0, volume)) / 100) * 0.15, ctx.currentTime);
      gain.connect(ctx.destination);
      this.ambientGain = gain;

      if (type === 'whitenoise' || type === 'rain') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'rain') {
            // Pink/brown filtered noise simulating soothing rain
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
          } else {
            data[i] = white * 0.3;
          }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        noise.connect(gain);
        noise.start();
        this.ambientSource = noise;
      } else if (type === 'binaural') {
        // Binaural alpha frequency (210 Hz left, 220 Hz right -> 10Hz alpha wave)
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(216, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        this.ambientSource = osc;
      }

      this.currentAmbientType = type;
    } catch {}
  }

  public setAmbientVolume(vol: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime((Math.min(100, Math.max(0, vol)) / 100) * 0.15, this.ctx.currentTime);
    }
  }

  public stopAmbientFocus() {
    try {
      if (this.ambientSource) {
        (this.ambientSource as any).stop?.();
        this.ambientSource.disconnect();
        this.ambientSource = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
      this.currentAmbientType = null;
    } catch {}
  }

  public getCurrentAmbientType(): string | null {
    return this.currentAmbientType;
  }
}

export const soundEngine = new SoundEngine();
