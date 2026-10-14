// Pointer + virtual smooth scroll.
// Scroll is captured (wheel/touch/keys) into a target value and eased each
// frame, so camera choreography stays smooth regardless of input device.
import { clamp, damp } from './math.js';

export class Input {
    constructor(el, { sections }) {
        this.sections = sections;
        this.pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, dx: 0, dy: 0, speed: 0, down: false, moved: false };
        this.scroll = { target: 0, current: 0, velocity: 0 };
        this.touchY = null;

        const onMove = (x, y) => {
            this.pointer.x = x / window.innerWidth;
            this.pointer.y = 1 - y / window.innerHeight;
            this.pointer.moved = true;
        };

        window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
        window.addEventListener('pointerdown', (e) => {
            this.pointer.down = true;
            onMove(e.clientX, e.clientY);
        });
        window.addEventListener('pointerup', () => { this.pointer.down = false; });

        window.addEventListener('wheel', (e) => {
            if (e.target.closest?.('.gui')) return;
            e.preventDefault();
            // Normalise line/page delta modes to pixels
            const scale = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
            this.scrollBy(e.deltaY * scale / window.innerHeight);
        }, { passive: false });

        el.addEventListener('touchstart', (e) => { this.touchY = e.touches[0].clientY; }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            if (this.touchY === null) return;
            const y = e.touches[0].clientY;
            this.scrollBy((this.touchY - y) / window.innerHeight * 1.5);
            this.touchY = y;
        }, { passive: true });
        el.addEventListener('touchend', () => { this.touchY = null; });

        window.addEventListener('keydown', (e) => {
            if (e.target.closest?.('input, textarea, .gui')) return;
            const step = { ArrowDown: 0.3, ArrowUp: -0.3, PageDown: 1, PageUp: -1, ' ': 1 }[e.key];
            if (step !== undefined) {
                e.preventDefault();
                this.scrollBy(step);
            } else if (e.key === 'Home') {
                this.goTo(0);
            } else if (e.key === 'End') {
                this.goTo(this.sections - 1);
            }
        });
    }

    // Units: 1 = one section
    scrollBy(delta) {
        this.scroll.target = clamp(this.scroll.target + delta, 0, this.sections - 1);
    }

    goTo(index) {
        this.scroll.target = clamp(index, 0, this.sections - 1);
    }

    update(dt) {
        const p = this.pointer;
        const s = this.scroll;
        p.dx = p.x - p.px;
        p.dy = p.y - p.py;
        p.px = p.x;
        p.py = p.y;
        const instant = Math.hypot(p.dx, p.dy) / Math.max(dt, 1e-3);
        p.speed = damp(p.speed, instant, 8, dt);

        const prev = s.current;
        s.current = damp(s.current, s.target, 4, dt);
        if (Math.abs(s.current - s.target) < 1e-4) s.current = s.target;
        s.velocity = damp(s.velocity, Math.abs(s.current - prev) / Math.max(dt, 1e-3), 6, dt);
    }

    get progress() {
        return this.scroll.current / (this.sections - 1);
    }
}
