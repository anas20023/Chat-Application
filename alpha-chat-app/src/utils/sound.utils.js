/**
 * Simple notification sound generator using Web Audio API
 */

class SoundService {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if it's suspended (browser security policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  play(type) {
    try {
      this.init();
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      switch (type) {
        case 'received':
          // Soft dual-tone chime
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, now); // A5
          oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;

        case 'sent':
          // Subtle "pop" sound
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(600, now);
          oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.05, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          oscillator.start(now);
          oscillator.stop(now + 0.1);
          break;

        case 'seen': {
          // Very short subtle double click
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(1000, now);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.02, now + 0.01);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
          
          // Second click
          const oscillator2 = this.audioCtx.createOscillator();
          const gainNode2 = this.audioCtx.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(this.audioCtx.destination);
          oscillator2.type = 'square';
          oscillator2.frequency.setValueAtTime(1200, now + 0.05);
          gainNode2.gain.setValueAtTime(0, now + 0.05);
          gainNode2.gain.linearRampToValueAtTime(0.02, now + 0.06);
          gainNode2.gain.linearRampToValueAtTime(0, now + 0.07);
          
          oscillator.start(now);
          oscillator.stop(now + 0.02);
          oscillator2.start(now + 0.05);
          oscillator2.stop(now + 0.07);
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn("Sound playback failed:", e);
    }
  }
}

const soundService = new SoundService();
export default soundService;
