// Web Audio Synthesizer Engine for RocketOS
// Procedurally synthesizes clean harmonic UI sounds with zero latency or external assets

class SoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft harmonic chime for opening an application or window
  playWindowOpen(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
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

      const masterVol = (volume / 100) * 0.12;
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

  // Gentle descending waterdrop pop for window minimize
  playMinimize(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

      const masterVol = (volume / 100) * 0.15;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Gentle ascending pop for window restore
  playRestore(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);

      const masterVol = (volume / 100) * 0.15;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Crisp metallic latch tap for taskbar pin/unpin
  playPin(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1240, t + 0.02);

      const masterVol = (volume / 100) * 0.18;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {}
  }

  // Glass snap click when docking or window edge snapping
  playSnap(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(980, t + 0.08);

      const masterVol = (volume / 100) * 0.16;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  // Smooth whoosh sound when switching virtual desktop workspaces
  playWorkspaceSwitch(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(560, t + 0.09);

      const masterVol = (volume / 100) * 0.14;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  // Deletion / Recycle Bin sound
  playTrash(volume = 50, muted = false) {
    if (muted || volume <= 0) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

      const masterVol = (volume / 100) * 0.16;
      gain.gain.setValueAtTime(masterVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
