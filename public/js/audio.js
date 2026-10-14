// Generative soundscape built entirely with Web Audio (no audio files).
// - Detuned pad chord through a lowpass filter that opens with scroll speed
// - Filtered noise "wind" that swells with pointer velocity
// - Short pitched blips for UI hovers and section changes
// Browsers require a user gesture before audio can start, so call start() from a click.

const CHORDS = [
    [38, 45, 52, 57],
    [36, 43, 51, 58],
    [41, 48, 55, 60],
    [34, 41, 50, 57]
];
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Soundscape {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.chordIndex = 0;
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

        this.reverb = this.createReverb(5.5);
        const wet = ctx.createGain();
        wet.gain.value = 0.55;
        this.reverb.connect(wet).connect(this.master);

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 400;
        this.filter.Q.value = 4;
        const padGain = ctx.createGain();
        padGain.gain.value = 0.12;
        this.filter.connect(padGain);
        padGain.connect(this.master);
        padGain.connect(this.reverb);

        this.voices = CHORDS[this.chordIndex % CHORDS.length].map((note, i) => {
            const oscs = [-7, 7].map((detune) => {
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

        // Slow LFO on filter cutoff so the pad breathes even when idle
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain).connect(this.filter.frequency);
        lfo.start();

        this.wind = this.createNoise();
        this.windFilter = ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 800;
        this.windFilter.Q.value = 0.8;
        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0;
        this.wind.connect(this.windFilter).connect(this.windGain);
        this.windGain.connect(this.master);
        this.windGain.connect(this.reverb);

        // Sub-bass drone with slow beating between two detuned sines
        this.sub = ctx.createGain();
        this.sub.gain.value = 0.22;
        [36, 36.12].forEach((m) => {
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

    // Rising filtered noise + pitch sweep, used for the intro and section transitions
    whoosh(duration = 1.2, gain = 0.35) {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 2;
        f.frequency.setValueAtTime(200, t);
        f.frequency.exponentialRampToValueAtTime(4000, t + duration * 0.8);
        f.frequency.exponentialRampToValueAtTime(800, t + duration);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + duration * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        src.connect(f).connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        src.start(t);
        src.stop(t + duration + 0.05);
    }

    // Low "boom" with a pitch drop, for arriving at a section
    impact(gain = 0.5) {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(32, t + 0.9);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        o.start(t);
        o.stop(t + 1.7);
    }

    boot() {
        this.whoosh(2.4, 0.3);
        setTimeout(() => this.impact(0.6), 2100);
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

    // Synthetic impulse response: exponentially decaying stereo noise
    createReverb(seconds) {
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * seconds);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = ir.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
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
        this.master.gain.setTargetAtTime(muted ? 0 : 0.8, t, 0.4);
    }

    toggle() {
        if (!this.ctx) {
            this.start();
            return true;
        }
        this.setMuted(this.enabled);
        return this.enabled;
    }

    // Called every frame with normalized speeds (0..~1)
    update(scrollSpeed, pointerSpeed) {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        this.filter.frequency.setTargetAtTime(350 + Math.min(scrollSpeed, 1) * 3200, t, 0.15);
        this.windGain.gain.setTargetAtTime(Math.min(pointerSpeed, 1) * 0.25, t, 0.1);
        this.windFilter.frequency.setTargetAtTime(500 + Math.min(pointerSpeed, 1) * 2500, t, 0.1);
    }

    setSection(index) {
        if (index === this.chordIndex) return;
        this.chordIndex = index;
        if (!this.ctx) return;
        const chord = CHORDS[index % CHORDS.length];
        const t = this.ctx.currentTime;
        this.voices.forEach((oscs, i) => {
            oscs.forEach((o) => o.frequency.setTargetAtTime(midiToHz(chord[i]), t, 0.6));
        });
        this.whoosh(0.9, 0.22);
        setTimeout(() => this.impact(0.35), 750);
    }

    blip(midi = 76 + PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], gain = 0.05) {
        if (!this.ctx || !this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = midiToHz(midi);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        o.start(t);
        o.stop(t + 0.65);
    }
}
