// High-Performance Momentum Physics & Input Solver for Active Theory
// Supports direct pointer dragging, fling inertia decay, wheel momentum,
// magnetic spring snapping, and click vs drag discrimination.

import { clamp, damp } from './math.js';

export class Input {
    constructor(el, { sections = 6, params = {} } = {}) {
        this.sections = sections;
        this.params = params;

        // Pointer state in normalized screen coords [0..1]
        this.pointer = {
            x: 0.5, y: 0.5,
            px: 0.5, py: 0.5,
            dx: 0, dy: 0,
            screenX: window.innerWidth / 2,
            screenY: window.innerHeight / 2,
            speed: 0,
            down: false,
            moved: false,
            isDragging: false
        };

        // Ribbon scroll & physics state
        this.scroll = {
            target: 0,
            current: 0,
            velocity: 0,       // Instantaneous velocity (sections per second or frame)
            dragVelocity: 0,
            unwrapped: 0
        };

        // Drag tracking internals
        this.drag = {
            startX: 0,
            startY: 0,
            lastX: 0,
            lastTime: performance.now(),
            threshold: 6,      // Pixels to exceed before qualifying as a drag
            history: []        // Recent pointer samples for smooth release velocity
        };

        this.clickHandler = null;
        this.sectionChangeListeners = [];
        this.lastSectionIndex = 0;

        this.initEvents(el);
    }

    initEvents(el) {
        const onPointerMove = (e) => {
            const now = performance.now();
            const sx = e.clientX;
            const sy = e.clientY;

            this.pointer.screenX = sx;
            this.pointer.screenY = sy;
            this.pointer.x = sx / window.innerWidth;
            this.pointer.y = sy / window.innerHeight;
            this.pointer.moved = true;

            if (this.pointer.down) {
                const totalDx = sx - this.drag.startX;
                const totalDy = sy - this.drag.startY;
                if (!this.pointer.isDragging && Math.hypot(totalDx, totalDy) > this.drag.threshold) {
                    this.pointer.isDragging = true;
                }

                if (this.pointer.isDragging) {
                    const stepDx = sx - this.drag.lastX;
                    const dragSpeed = this.params.dragSpeed || 0.0034;
                    // Horizontal drag drives the ribbon
                    this.scroll.target -= stepDx * dragSpeed;
                    
                    // Track velocity sample
                    const dt = Math.max((now - this.drag.lastTime) / 1000, 0.001);
                    const v = -(stepDx * dragSpeed) / dt;
                    this.drag.history.push({ v, t: now });
                    if (this.drag.history.length > 5) this.drag.history.shift();

                    this.drag.lastX = sx;
                    this.drag.lastTime = now;
                }
            }
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });

        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest?.('.gui, .modal, button, a, nav, header')) return;
            this.pointer.down = true;
            this.pointer.isDragging = false;
            this.drag.startX = e.clientX;
            this.drag.startY = e.clientY;
            this.drag.lastX = e.clientX;
            this.drag.lastTime = performance.now();
            this.drag.history = [];
            // Stop current momentum fling on grab
            this.scroll.velocity = 0;
            onPointerMove(e);
        });

        window.addEventListener('pointerup', (e) => {
            if (!this.pointer.down) return;
            const now = performance.now();
            
            if (this.pointer.isDragging) {
                // Compute release fling velocity from recent history
                const recent = this.drag.history.filter(h => now - h.t < 120);
                if (recent.length > 0) {
                    const avgV = recent.reduce((sum, h) => sum + h.v, 0) / recent.length;
                    this.scroll.velocity = clamp(avgV * 0.016, -0.6, 0.6);
                }
            } else {
                // Valid click (distance did not exceed threshold)
                this.clickHandler?.(e);
            }

            this.pointer.down = false;
            setTimeout(() => { this.pointer.isDragging = false; }, 30);
        });

        window.addEventListener('wheel', (e) => {
            if (e.target.closest?.('.gui, .modal-body')) return;
            e.preventDefault();
            const scale = e.deltaMode === 1 ? 28 : e.deltaMode === 2 ? window.innerHeight : 1;
            const wheelFactor = (this.params.wheelSpeed || 0.0016) * 0.45;
            const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * scale;
            this.scroll.velocity += delta * wheelFactor;
            this.scroll.velocity = clamp(this.scroll.velocity, -0.7, 0.7);
        }, { passive: false });

        // Touch gestures
        let touchStartX = 0;
        let touchLastX = 0;
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                touchStartX = touchLastX = e.touches[0].clientX;
                this.scroll.velocity = 0;
            }
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const tx = e.touches[0].clientX;
                const d = tx - touchLastX;
                const dragSpeed = this.params.dragSpeed || 0.0034;
                this.scroll.target -= d * dragSpeed * 1.5;
                this.scroll.velocity = -d * dragSpeed * 0.2;
                touchLastX = tx;
            }
        }, { passive: true });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (e.target.closest?.('input, textarea, .gui')) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd') {
                e.preventDefault();
                this.goTo(Math.round(this.scroll.target) + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a') {
                e.preventDefault();
                this.goTo(Math.round(this.scroll.target) - 1);
            } else if (e.key === 'Home') {
                this.goTo(0);
            } else if (e.key === 'End') {
                this.goTo(this.sections - 1);
            }
        });
    }

    onClick(fn) {
        this.clickHandler = fn;
    }

    goTo(index) {
        this.scroll.target = index;
        this.scroll.velocity = 0;
    }

    update(dt) {
        const p = this.pointer;
        const s = this.scroll;
        const params = this.params;

        p.dx = p.x - p.px;
        p.dy = p.y - p.py;
        p.px = p.x;
        p.py = p.y;
        const instant = Math.hypot(p.dx, p.dy) / Math.max(dt, 1e-3);
        p.speed = damp(p.speed, instant, 10, dt);

        // Momentum coasting with exponential friction decay
        if (!p.isDragging) {
            const friction = params.friction !== undefined ? params.friction : 0.92;
            s.target += s.velocity * (dt * 60);
            s.velocity *= Math.pow(friction, dt * 60);

            // Magnetic spring snapping when slowing down
            const snapActive = params.magneticSnap !== undefined ? params.magneticSnap : 1;
            if (snapActive && Math.abs(s.velocity) < 0.08) {
                const snapStrength = params.snapStrength || 5.5;
                const nearest = Math.round(s.target);
                const snapDelta = nearest - s.target;
                s.target += snapDelta * (1 - Math.exp(-snapStrength * dt));
                if (Math.abs(snapDelta) < 0.001) {
                    s.target = nearest;
                    s.velocity = 0;
                }
            }
        }

        // Smooth camera/ribbon position follow
        const prevCurrent = s.current;
        s.current = damp(s.current, s.target, 14, dt);
        
        // Signed movement velocity
        s.velocity = (s.current - prevCurrent) / Math.max(dt, 1e-3);

        // Notify section change if active index changed
        const activeIdx = ((Math.round(s.current) % this.sections) + this.sections) % this.sections;
        if (activeIdx !== this.lastSectionIndex) {
            this.lastSectionIndex = activeIdx;
            this.sectionChangeListeners.forEach(fn => fn(activeIdx));
        }
    }

    onSectionChange(fn) {
        this.sectionChangeListeners.push(fn);
    }

    get activeIndex() {
        return ((Math.round(this.scroll.current) % this.sections) + this.sections) % this.sections;
    }

    get progress() {
        return this.scroll.current / this.sections;
    }
}
