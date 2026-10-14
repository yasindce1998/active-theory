// DOM overlay: enter screen, letterbox, HUD telemetry, target reticle,
// scramble-decode text reveals, nav, sound toggle and custom cursor.
import { damp } from './math.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLYPHS = '01<>/\\[]{}#%&*+=-_ABCDEFGHJKLMNPRSTUVWXYZ';

// Reveals text by cycling random glyphs that settle left-to-right into the final string
function decode(el, text, { duration = 900, delay = 0 } = {}) {
    if (el._decodeRaf) cancelAnimationFrame(el._decodeRaf);
    if (reduceMotion) {
        el.textContent = text;
        return;
    }
    const start = performance.now() + delay;
    const tick = (now) => {
        const t = Math.max(0, (now - start) / duration);
        let out = '';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const settle = i / text.length;
            if (ch === ' ' || t > settle + 0.25) out += ch;
            else if (t > settle - 0.15) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            else out += '\u00a0';
        }
        el.textContent = out;
        if (t < 1.3) el._decodeRaf = requestAnimationFrame(tick);
        else el.textContent = text;
    };
    el._decodeRaf = requestAnimationFrame(tick);
}

const pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');

function timecode(seconds) {
    const fps = 24;
    const total = Math.floor(seconds * fps);
    const f = total % fps;
    const s = Math.floor(total / fps);
    return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
}

export class UI {
    constructor(sections, input, audio, gui) {
        this.sections = sections;
        this.input = input;
        this.audio = audio;
        this.current = -1;
        this.onEnter = null;
        this.entered = false;
        this.content = document.getElementById('content');
        this.nav = document.getElementById('nav');
        this.progress = document.getElementById('progress');
        this.soundBtn = document.getElementById('sound');
        this.cursor = document.getElementById('cursor');
        this.reticle = document.getElementById('reticle');
        this.hud = {
            tc: document.getElementById('hud-tc'),
            seq: document.getElementById('hud-seq'),
            cam: document.getElementById('hud-cam'),
            fov: document.getElementById('hud-fov'),
            focus: document.getElementById('hud-focus'),
            warp: document.getElementById('hud-warp'),
            fps: document.getElementById('hud-fps'),
            range: document.getElementById('reticle-range')
        };
        this.bars = document.querySelectorAll('.bar');
        this.cursorPos = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
        this.reticlePos = { x: innerWidth / 2, y: innerHeight / 2 };
        this.hudTimer = 0;

        this.panels = sections.map((s, i) => {
            const el = document.createElement('section');
            el.className = 'panel';
            el.id = s.id;
            el.setAttribute('aria-hidden', 'true');
            const lines = s.title.split('<br>').map((l, j) =>
                `<span class="line"><span style="--i:${j}">${l}</span></span>`).join('');
            el.innerHTML = `<p class="eyebrow" data-text="${s.code}">${s.code}</p>
                <h1>${lines}</h1>
                <p class="body"><span class="line"><span style="--i:${s.title.split('<br>').length}">${s.body}</span></span></p>`;
            this.content.appendChild(el);

            const link = document.createElement('a');
            link.href = `#${s.id}`;
            link.innerHTML = `<i>${pad(i + 1)}</i>${s.id}`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                input.goTo(i);
                audio.blip();
            });
            link.addEventListener('mouseenter', () => audio.blip(undefined, 0.02));
            this.nav.appendChild(link);
            return el;
        });

        this.soundBtn.addEventListener('click', () => this.setSound(this.audio.toggle()));
        document.getElementById('gui-toggle').addEventListener('click', () => gui.toggle());

        const enter = document.getElementById('enter');
        const go = (withSound) => {
            if (this.entered) return;
            this.entered = true;
            document.documentElement.classList.add('entered');
            // The button vanishes under the pointer without firing pointerleave
            this.cursor.classList.remove('hover');
            this.onEnter?.(withSound);
            if (withSound) this.setSound(true);
            setTimeout(() => this.setSection(this.current, true), reduceMotion ? 0 : 1800);
        };
        document.getElementById('enter-sound').addEventListener('click', () => go(true));
        document.getElementById('enter-silent').addEventListener('click', () => go(false));
        enter.querySelectorAll('[data-decode]').forEach((el, i) => decode(el, el.dataset.decode, { delay: 300 + i * 250, duration: 1100 }));

        window.addEventListener('pointermove', (e) => {
            this.cursorPos.tx = e.clientX;
            this.cursorPos.ty = e.clientY;
            this.cursor.classList.add('visible');
        }, { passive: true });
        document.addEventListener('mouseleave', () => this.cursor.classList.remove('visible'));
        document.querySelectorAll('[data-magnetic]').forEach((el) => this.magnetic(el));
        this.nav.querySelectorAll('a').forEach((el) => this.magnetic(el));

        const fromHash = sections.findIndex((s) => `#${s.id}` === location.hash);
        if (fromHash > 0) input.scroll.target = input.scroll.current = fromHash;
        this.current = Math.max(fromHash, 0);
    }

    setSound(on) {
        this.soundBtn.setAttribute('aria-pressed', String(on));
        this.soundBtn.querySelector('span').textContent = on ? 'Audio on' : 'Audio off';
    }

    magnetic(el) {
        el.addEventListener('pointermove', (e) => {
            if (reduceMotion) return;
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * 0.3;
            const y = (e.clientY - r.top - r.height / 2) * 0.3;
            el.style.transform = `translate(${x}px, ${y}px)`;
            this.cursor.classList.add('hover');
        });
        el.addEventListener('pointerleave', () => {
            el.style.transform = '';
            this.cursor.classList.remove('hover');
        });
    }

    setSection(index, force = false) {
        if (index === this.current && !force) return;
        this.current = index;
        if (!this.entered) return;
        this.panels.forEach((p, i) => {
            const active = i === index;
            p.classList.toggle('active', active);
            p.setAttribute('aria-hidden', String(!active));
            if (active) {
                const eb = p.querySelector('.eyebrow');
                decode(eb, eb.dataset.text, { delay: 200, duration: 700 });
            }
        });
        [...this.nav.children].forEach((a, i) => a.classList.toggle('active', i === index));
        decode(this.hud.seq, this.sections[index].code, { duration: 600 });
        history.replaceState(null, '', index === 0 ? location.pathname : `#${this.sections[index].id}`);
    }

    ready() {
        document.documentElement.classList.add('loaded');
    }

    update(sectionFloat, dt, s) {
        this.progress.style.transform = `scaleY(${sectionFloat / (this.sections.length - 1)})`;

        const c = this.cursorPos;
        c.x = damp(c.x, c.tx, 20, dt);
        c.y = damp(c.y, c.ty, 20, dt);
        this.cursor.style.transform = `translate(${c.x}px, ${c.y}px)`;

        // Letterbox to 2.39:1, opened by the intro and tightened slightly during warp
        const vw = innerWidth, vh = innerHeight;
        const scope = Math.max(0, (vh - vw / 2.39) / 2);
        const barH = this.entered
            ? scope * s.letterbox * (0.85 + s.warp * 0.3)
            : vh / 2;
        this.bars.forEach((b) => { b.style.height = `${barH}px`; });
        document.documentElement.style.setProperty('--bar', `${barH}px`);

        // Reticle tracks the core's screen projection
        const r = this.reticlePos;
        const tx = s.light.x * vw, ty = (1 - s.light.y) * vh;
        r.x = damp(r.x, tx, 6, dt);
        r.y = damp(r.y, ty, 6, dt);
        this.reticle.style.transform = `translate(${r.x}px, ${r.y}px) rotate(${s.time * 8}deg)`;
        this.reticle.style.opacity = s.light.z > 0 && this.entered ? 1 : 0;

        this.hud.tc.textContent = timecode(s.time);
        this.hudTimer -= dt;
        if (this.hudTimer <= 0) {
            this.hudTimer = 0.1;
            const p = s.camera.pos;
            this.hud.cam.textContent = `${p[0].toFixed(2)} ${p[1].toFixed(2)} ${p[2].toFixed(2)}`;
            this.hud.fov.textContent = `${s.fov.toFixed(1)}°`;
            this.hud.focus.textContent = `${s.focus.toFixed(2)}m`;
            this.hud.warp.textContent = `${(s.warp * 100).toFixed(0)}%`;
            this.hud.fps.textContent = `${Math.round(s.fps)}`;
            this.hud.range.textContent = `RNG ${s.focus.toFixed(1)}`;
        }
    }
}
