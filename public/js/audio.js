// Generative Soundscape & Tactile Audio System for Active Theory
// Features synthesized mechanical ticks, magnetic latch snaps,
// velocity whooshes, modal transitions, and ambient spatial harmonic drones.

const CHORDS = [
    [38, 45, 52, 57], // D minor 9
    [36, 43, 51, 58], // C minor 9
    [41, 48, 55, 60], // F major 9
    [34, 41, 50, 57], // Bb major 9
    [39, 46, 53, 58], // Eb major 7
    [37, 44, 52, 59]  // C# minor 9
];

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Soundscape {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.chordIndex = 0;
        this.lastTickTime = 0;
    }

    start() {
        if (this.ctx) {
            this.ctx.resume();
            this.setMuted(false);
            return;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = new AC();

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        this.master.connect(comp).connect(ctx.destination);

        this.reverb = this.createReverb(4.5);
        const wet = ctx.createGain();
        wet.gain.value = 0.45;
        this.reverb.connect(wet).connect(this.master);

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 450;
        this.filter.Q.value = 3.5;
        const padGain = ctx.createGain();
        padGain.gain.value = 0.12;
        this.filter.connect(padGain);
        padGain.connect(this.master);
        padGain.connect(this.reverb);

        this.voices = CHORDS[this.chordIndex % CHORDS.length].map((note, i) => {
            const oscs = [-6, 6].map((detune) => {
                const o = ctx.createOscillator();
                o.type = i % 2 ? 'sawtooth' : 'triangle';
                o.frequency.value = midiToHz(note);
                o.detune.value = detune;
                o.connect(this.filter);
                o.start();
                return o;
            });
            return oscs;
        });

        // Breathing LFO on filter cutoff
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 160;
        lfo.connect(lfoGain).connect(this.filter.frequency);
        lfo.start();

        // Atmospheric noise bed
        this.wind = this.createNoise();
        this.windFilter = ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 900;
        this.windFilter.Q.value = 1.0;
        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0;
        this.wind.connect(this.windFilter).connect(this.windGain);
        this.windGain.connect(this.master);
        this.windGain.connect(this.reverb);

        // Sub drone
        this.sub = ctx.createGain();
        this.sub.gain.value = 0.18;
        [36, 36.1].forEach((m) => {
            const o = ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = midiToHz(m);
            o.connect(this.sub);
            o.start();
        });
        this.sub.connect(this.master);

        this.setMuted(false);
        this.boot();
    }

    createNoise() {
        const ctx = this.ctx;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.start();
        return src;
    }

    createReverb(seconds) {
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * seconds);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = ir.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
        }
        const conv = ctx.createConvolver();
        conv.buffer = ir;
        return conv;
    }

    setMuted(muted) {
        this.enabled = !muted;
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(muted ? 0 : 0.75, t, 0.3);
    }

    toggle() {
        if (!this.ctx) {
            this.start();
            return true;
        }
        this.setMuted(this.enabled);
        return this.enabled;
    }

    // Crisp mechanical tick for ribbon scrolling / card pass-by
    tick(freq = 1800) {
        if (!this.ctx || !this.enabled) return;
        const now = performance.now();
        if (now - this.lastTickTime < 45) return; // Debounce rapid ticks
        this.lastTickTime = now;

        const ctx = this.ctx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();

        f.type = 'bandpass';
        f.frequency.value = freq;
        f.Q.value = 8;

        o.type = 'triangle';
        o.frequency.setValueAtTime(freq * 1.5, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.015);

        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

        o.connect(f).connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.025);
    }

    // Magnetic latch snap sound when card centers
    snap() {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Double micro-click
        [0, 0.03].forEach((delay, idx) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(idx === 0 ? 980 : 1320, t + delay);
            o.frequency.exponentialRampToValueAtTime(320, t + delay + 0.035);

            g.gain.setValueAtTime(0.09, t + delay);
            g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.04);

            o.connect(g).connect(this.master);
            o.start(t + delay);
            o.stop(t + delay + 0.05);
        });
    }

    // Whoosh for high-velocity flick
    whoosh(duration = 0.8, gain = 0.25) {
        if (!this.ctx || !this.enabled || !this.noiseBuffer) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 2.5;
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(2800, t + duration * 0.6);
        f.frequency.exponentialRampToValueAtTime(600, t + duration);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + duration * 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        src.connect(f).connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        src.start(t);
        src.stop(t + duration + 0.05);
    }

    // Cinematic swell when opening case study
    modalOpen() {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Low sub impact
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.6);

        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.75);

        // Shimmer
        this.blip(88, 0.06);
    }

    modalClose() {
        if (!this.ctx || !this.enabled) return;
        this.blip(74, 0.04);
    }

    boot() {
        this.whoosh(1.6, 0.2);
    }

    update(scrollSpeed, pointerSpeed) {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const spd = Math.abs(scrollSpeed);
        this.filter.frequency.setTargetAtTime(450 + Math.min(spd * 2.0, 1) * 2400, t, 0.15);
        this.windGain.gain.setTargetAtTime(Math.min(pointerSpeed + spd * 0.4, 1) * 0.18, t, 0.1);
        this.windFilter.frequency.setTargetAtTime(600 + Math.min(pointerSpeed * 1.5, 1) * 2000, t, 0.1);
    }

    setSection(index) {
        if (index === this.chordIndex) return;
        this.chordIndex = index;
        if (!this.ctx) return;
        const chord = CHORDS[index % CHORDS.length];
        const t = this.ctx.currentTime;
        this.voices.forEach((oscs, i) => {
            oscs.forEach((o) => o.frequency.setTargetAtTime(midiToHz(chord[i]), t, 0.5));
        });
        this.snap();
    }

    blip(midi = 76 + PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], gain = 0.04) {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = midiToHz(midi);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        o.start(t);
        o.stop(t + 0.45);
    }
}
