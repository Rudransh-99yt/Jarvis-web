// Procedural Web Audio API sound generator for Stark Industries HUD
// Works 100% offline, zero network latency, no external audio files required.

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
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

  // Quick tactile UI click
  playClick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Affirmative chime (Jarvis accepted command)
  playAffirmative() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [
        { freq: 880, start: 0, dur: 0.1 },
        { freq: 1320, start: 0.09, dur: 0.18 }
      ].forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.09, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Diagnostic radar sweep sound
  playScan() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(5, ctx.currentTime);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn(e);
    }
  }

  // Arc reactor charging / pulse
  playArcPulse() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(340, ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn(e);
    }
  }

  // Warning alert (Defense or critical warning)
  playWarning() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const offset = i * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(680, now + offset);
        osc.frequency.setValueAtTime(450, now + offset + 0.07);

        gain.gain.setValueAtTime(0.07, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // Armor deployment hydraulic / thruster sound
  playDeploy() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn(e);
    }
  }

  // Soft futuristic chime
  playChime() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [1046.5, 1318.51, 1567.98].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.06, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // System Boot Up chord
  playStartup() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [220, 330, 440, 554, 660, 880];
      const now = ctx.currentTime;
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.06, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.5);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

export const soundEffects = new SoundEffectsManager();
