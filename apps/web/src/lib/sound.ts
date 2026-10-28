type SoundName = 'tick' | 'correct' | 'turn' | 'fanfare';

class SoundEngine {
  private context: AudioContext | null = null;
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.ensureContext();
    } else if (this.context) {
      void this.context.suspend();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) {
      return;
    }
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }
    switch (name) {
      case 'tick':
        this.tone(660, 0.045, 0.025, 'square');
        break;
      case 'correct':
        this.tone(660, 0.09, 0.05, 'sine');
        this.tone(880, 0.12, 0.05, 'sine', 0.09);
        break;
      case 'turn':
        this.tone(392, 0.12, 0.04, 'triangle');
        this.tone(523, 0.16, 0.04, 'triangle', 0.12);
        break;
      case 'fanfare':
        this.tone(523, 0.14, 0.05, 'triangle');
        this.tone(659, 0.14, 0.05, 'triangle', 0.14);
        this.tone(784, 0.18, 0.05, 'triangle', 0.28);
        this.tone(1046, 0.32, 0.05, 'triangle', 0.44);
        break;
      default:
        break;
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        return null;
      }
      this.context = new Ctor();
    }
    return this.context;
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay = 0
  ): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

export const sound = new SoundEngine();
