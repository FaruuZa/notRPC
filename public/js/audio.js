/**
 * ELEMENT CLASH: WEBAUDIO SYNTHESIZER
 * Native Web Audio Synthesizer for retro arcade sound effects
 */

const AudioSynth = {
  ctx: null,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  },

  playLock() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.setValueAtTime(150, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  },

  playClash(outcome) {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    let freqStart = 300;
    let freqEnd = 100;
    let type = 'sine';
    let vol = 0.08;

    if (outcome === 'SUPERIOR') {
      freqStart = 580;
      freqEnd = 200;
      type = 'sawtooth';
      vol = 0.06;
    } else if (outcome === 'INFERIOR') {
      freqStart = 180;
      freqEnd = 50;
      type = 'sawtooth';
      vol = 0.08;
    } else {
      // Neutral
      freqStart = 250;
      freqEnd = 120;
      type = 'sine';
      vol = 0.08;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  },

  playMatchFound() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Upbeat retro arcade arpeggio
    playTone(392.00, 0.0, 0.2);   // G4
    playTone(523.25, 0.08, 0.2);  // C5
    playTone(659.25, 0.16, 0.2);  // E5
    playTone(783.99, 0.24, 0.45); // G5
  },

  playVictory() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + delay + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Triumphant melody
    playTone(392.00, 0.0, 0.15); // G4
    playTone(392.00, 0.15, 0.15); // G4
    playTone(392.00, 0.3, 0.15); // G4
    playTone(523.25, 0.45, 0.4); // C5
    playTone(659.25, 0.85, 0.2); // E5
    playTone(783.99, 1.05, 0.6); // G5
  },

  playDefeat() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // Somber dropping notes
    playTone(220.00, 0.0, 0.4); // A3
    playTone(207.65, 0.4, 0.4); // G#3
    playTone(196.00, 0.8, 0.7); // G3
  },

  playShieldBreak() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High metal clink / shield sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.18);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  },

  playQuestComplete() {
    this.init();
    if (!this.ctx) return;
    
    const playTone = (freq, delay, dur, type = 'sine') => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    // A sparkling, rewarding sound
    playTone(523.25, 0.0, 0.25, 'triangle');  // C5
    playTone(659.25, 0.08, 0.25, 'triangle'); // E5
    playTone(783.99, 0.16, 0.25, 'triangle'); // G5
    playTone(1046.50, 0.24, 0.5, 'sine');    // C6
  }
};

// Expose globally
window.AudioSynth = AudioSynth;
