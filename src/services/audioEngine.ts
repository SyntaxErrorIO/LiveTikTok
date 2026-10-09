import { SoundPresetId } from '../types';

class AudioEngineService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGainNode: GainNode | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMasterVolume(volumePercent: number) {
    this.initContext();
    if (this.masterGainNode && this.audioCtx) {
      const vol = Math.max(0, Math.min(100, volumePercent)) / 100;
      this.masterGainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    }
  }

  public playSound(preset: SoundPresetId, volumePercent: number = 80) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || !this.masterGainNode) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      const localVolume = Math.max(0, Math.min(100, volumePercent)) / 100;
      gainNode.gain.setValueAtTime(localVolume, now);
      gainNode.connect(this.masterGainNode);

      switch (preset) {
        case 'chime': {
          // Cyber 2-tone melodic chime
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(587.33, now); // D5
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
          osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6

          gainNode.gain.setValueAtTime(localVolume * 0.7, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          osc1.start(now);
          osc2.start(now + 0.1);
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
          break;
        }

        case 'fanfare': {
          // Ascending majestic triad (C5 - E5 - G5 - C6)
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const noteTime = now + idx * 0.08;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, noteTime);

            noteGain.gain.setValueAtTime(0, noteTime);
            noteGain.gain.linearRampToValueAtTime(localVolume * 0.4, noteTime + 0.02);
            noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

            osc.connect(noteGain);
            noteGain.connect(gainNode);
            osc.start(noteTime);
            osc.stop(noteTime + 0.4);
          });
          break;
        }

        case 'laser': {
          // Sci-fi pitch drop zap
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

          gainNode.gain.setValueAtTime(localVolume * 0.6, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.28);
          break;
        }

        case 'coin': {
          // Arcade double ping
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, now); // B5
          osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

          gainNode.gain.setValueAtTime(localVolume * 0.6, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case 'powerup': {
          // Arpeggiated riser
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.4);

          gainNode.gain.setValueAtTime(localVolume * 0.7, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }

        case 'explosion': {
          // Noise synth with lowpass filter
          const bufferSize = ctx.sampleRate * 0.6;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

          gainNode.gain.setValueAtTime(localVolume * 0.8, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          noise.connect(filter);
          filter.connect(gainNode);
          noise.start(now);
          noise.stop(now + 0.6);
          break;
        }

        case 'airhorn': {
          // Stream airhorn multi-tone chord
          const freqs = [466.16, 466.16 * 1.5, 466.16 * 2]; // Bb chord
          freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.setValueAtTime(f * 1.05, now + 0.05);
            osc.frequency.setValueAtTime(f, now + 0.1);

            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + 0.5);
          });
          gainNode.gain.setValueAtTime(localVolume * 0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          break;
        }

        case 'cyber_pulse':
        case 'notification':
        default: {
          // Clean futuristic notification
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(659.25, now);
          osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.15);

          gainNode.gain.setValueAtTime(localVolume * 0.6, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
      }
    } catch {
      // Graceful fallback if Web Audio is blocked by browser policy
    }
  }

  public speakText(text: string, voiceName?: string, speed: number = 1.0, pitch: number = 1.0) {
    if (!('speechSynthesis' in window) || !text.trim()) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.5, Math.min(2.0, speed));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));

      if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find((v) => v.name === voiceName || v.lang.startsWith('es'));
        if (selected) utterance.voice = selected;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error or permission
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }
}

export const audioEngine = new AudioEngineService();
