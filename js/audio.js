/**
 * Web Audio API Sound Synthesizer
 * Provides soft, warm, vintage photobooth audio effects without external audio files.
 */
class PhotoboothAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  // Soft mechanical film camera shutter click
  playShutter() {
    try {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // Primary shutter slap
      const bufferSize = this.ctx.sampleRate * 0.05; // 50ms burst
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(3.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);

      // Secondary soft mirror click (70ms later)
      setTimeout(() => {
        try {
          if (!this.ctx || this.isMuted) return;
          const t2 = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, t2);
          osc.frequency.exponentialRampToValueAtTime(120, t2 + 0.04);

          oscGain.gain.setValueAtTime(0.25, t2);
          oscGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);

          osc.connect(oscGain);
          oscGain.connect(this.ctx.destination);
          osc.start(t2);
          osc.stop(t2 + 0.05);
        } catch (err) {}
      }, 70);
    } catch (e) {
      console.warn('Audio shutter error:', e);
    }
  }

  // Gentle music-box chime for countdown (step 3, 2, 1)
  playCountdownTick(step) {
    try {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Soft celestial frequencies: step 3 = 659.25Hz (E5), step 2 = 783.99Hz (G5), step 1 = 987.77Hz (B5)
      const freqs = [659.25, 783.99, 987.77, 1174.66];
      const freq = freqs[Math.max(0, Math.min(step - 1, freqs.length - 1))];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Warm decay
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch (e) {
      console.warn('Audio tick error:', e);
    }
  }

  // Paper dispensing sound (soft gear hum + paper slide rustle)
  playDispense() {
    try {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const duration = 1.3;

      // Gentle motor hum
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(160, t + duration * 0.5);
      osc.frequency.linearRampToValueAtTime(120, t + duration);

      oscGain.gain.setValueAtTime(0.01, t);
      oscGain.gain.linearRampToValueAtTime(0.07, t + 0.1);
      oscGain.gain.linearRampToValueAtTime(0.05, t + duration - 0.2);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);

      // Paper sliding rustle
      const bufSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }

      const rustle = this.ctx.createBufferSource();
      rustle.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.frequency.linearRampToValueAtTime(1800, t + duration);
      filter.Q.setValueAtTime(1.8, t);

      const rustleGain = this.ctx.createGain();
      rustleGain.gain.setValueAtTime(0.01, t);
      rustleGain.gain.linearRampToValueAtTime(0.12, t + 0.2);
      rustleGain.gain.linearRampToValueAtTime(0.09, t + duration - 0.1);
      rustleGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      rustle.connect(filter);
      filter.connect(rustleGain);
      rustleGain.connect(this.ctx.destination);
      rustle.start(t);
    } catch (e) {
      console.warn('Audio dispense error:', e);
    }
  }

  // Ribbon untie / magical opening chime
  playOpenEnvelope() {
    try {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const delay = idx * 0.08;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.42);
      });
    } catch (e) {
      console.warn('Audio envelope chime error:', e);
    }
  }
}

window.photoboothAudio = new PhotoboothAudio();

