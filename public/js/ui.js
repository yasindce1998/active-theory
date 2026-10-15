// Active Theory Minimalist Editorial UI, Dynamic Cursor & Case Study Modal

import { damp } from './math.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLYPHS = '01<>/\\[]{}#%&*+=-_ABCDEFGHJKLMNPRSTUVWXYZ';

function decode(el, text, { duration = 800, delay = 0 } = {}) {
    if (!el) return;
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

export class UI {
    constructor(projects, input, audio, gui) {
        this.projects = projects;
        this.input = input;
        this.audio = audio;
        this.gui = gui;

        this.current = 0;
        this.onEnter = null;
        this.entered = false;
        this.modalOpen = false;

        // DOM elements
        this.cursor = document.getElementById('cursor');
        this.cursorLabel = document.getElementById('cursor-label');
        this.counterBadge = document.getElementById('project-counter');
        this.telemetryTime = document.getElementById('telemetry-time');
        this.soundBtn = document.getElementById('sound');
        this.infoBtn = document.getElementById('info-toggle');
        this.guiBtn = document.getElementById('gui-toggle');

        this.projectCategory = document.getElementById('project-category');
        this.projectTitle = document.getElementById('project-title');
        this.projectSubtitle = document.getElementById('project-subtitle');
        this.btnViewProject = document.getElementById('btn-view-project');

        this.pagination = document.getElementById('project-pagination');
        this.filterTabs = document.getElementById('filter-tabs');

        // Case study modal elements
        this.modal = document.getElementById('case-study-modal');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalClose = document.getElementById('modal-close');
        this.modalMeta = document.getElementById('modal-meta');
        this.modalTitle = document.getElementById('modal-title');
        this.modalTagline = document.getElementById('modal-tagline');
        this.modalHeroGlow = document.getElementById('modal-hero-glow');
        this.modalDesc = document.getElementById('modal-desc');
        this.modalAwards = document.getElementById('modal-awards');
        this.modalClient = document.getElementById('modal-client');
        this.modalYear = document.getElementById('modal-year');
        this.modalTags = document.getElementById('modal-tags');

        // Info modal
        this.infoModal = document.getElementById('info-modal');
        this.infoBackdrop = document.getElementById('info-backdrop');
        this.infoClose = document.getElementById('info-close');

        // Cursor smoothing
        this.cursorPos = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            tx: window.innerWidth / 2,
            ty: window.innerHeight / 2,
            state: 'drag' // 'drag' | 'view' | 'close' | 'hidden'
        };

        if (this.cursor) {
            this.cursor.style.transform = `translate(${this.cursorPos.x}px, ${this.cursorPos.y}px) translate(-50%, -50%)`;
        }

        this.initEnter();
        this.initClocks();
        this.initPagination();
        this.initFilters();
        this.initModals();
        this.initCursorEvents();
        this.updateProjectUI(0);
    }

    initEnter() {
        const enter = document.getElementById('enter');
        const go = (withSound) => {
            if (this.entered) return;
            this.entered = true;
            document.documentElement.classList.add('entered');
            this.cursor?.classList.remove('button-hover');
            this.cursor?.classList.add('visible');
            this.onEnter?.(withSound);
            if (withSound) this.setSound(true);
            setTimeout(() => this.updateProjectUI(this.current, true), reduceMotion ? 0 : 800);
        };

        document.getElementById('enter-sound').addEventListener('click', () => go(true));
        document.getElementById('enter-silent').addEventListener('click', () => go(false));

        enter.querySelectorAll('[data-decode]').forEach((el, i) => {
            decode(el, el.dataset.decode, { delay: 200 + i * 220, duration: 900 });
        });

        this.soundBtn.addEventListener('click', () => this.setSound(this.audio.toggle()));
        this.guiBtn?.addEventListener('click', () => this.gui?.toggle());
    }

    initClocks() {
        const updateTimes = () => {
            try {
                const now = new Date();
                const la = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/Los_Angeles',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(now);
                const ams = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Europe/Amsterdam',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(now);
                if (this.telemetryTime) {
                    this.telemetryTime.textContent = `LA ${la} // AMS ${ams}`;
                }
            } catch (e) {
                // Fallback
            }
        };
        updateTimes();
        setInterval(updateTimes, 1000);
    }

    initPagination() {
        if (!this.pagination) return;
        this.pagination.innerHTML = '';
        this.pagDots = this.projects.map((p, i) => {
            const btn = document.createElement('button');
            btn.className = `pag-dot ${i === 0 ? 'active' : ''}`;
            btn.textContent = p.num;
            btn.setAttribute('aria-label', `Navigate to ${p.title}`);
            btn.addEventListener('click', () => {
                this.input.goTo(i);
                this.audio.tick(2200);
            });
            btn.addEventListener('mouseenter', () => this.audio.blip(80, 0.02));
            this.pagination.appendChild(btn);
            return btn;
        });
    }

    initFilters() {
        if (!this.filterTabs) return;
        this.filterTabs.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.filterTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                this.audio.tick(1600);

                if (filter === 'ALL') {
                    this.input.goTo(0);
                } else {
                    const idx = this.projects.findIndex(p => p.category === filter);
                    if (idx !== -1) this.input.goTo(idx);
                }
            });
        });
    }

    initModals() {
        // Case study trigger
        this.btnViewProject?.addEventListener('click', () => {
            this.openCaseStudy(this.projects[this.current]);
        });

        // Close handlers
        this.modalClose?.addEventListener('click', () => this.closeCaseStudy());
        this.modalBackdrop?.addEventListener('click', () => this.closeCaseStudy());

        // Info modal handlers
        this.infoBtn?.addEventListener('click', () => {
            this.infoModal.classList.add('active');
            this.audio.tick(2000);
        });
        this.infoClose?.addEventListener('click', () => {
            this.infoModal.classList.remove('active');
            this.audio.tick(1400);
        });
        this.infoBackdrop?.addEventListener('click', () => {
            this.infoModal.classList.remove('active');
            this.audio.tick(1400);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.modalOpen) this.closeCaseStudy();
                this.infoModal?.classList.remove('active');
            }
        });
    }

    initCursorEvents() {
        window.addEventListener('pointermove', (e) => {
            this.cursorPos.tx = e.clientX;
            this.cursorPos.ty = e.clientY;
            this.cursor.classList.add('visible');
        }, { passive: true });

        document.addEventListener('mouseleave', () => this.cursor.classList.remove('visible'));

        // Magnetic buttons
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                if (reduceMotion) return;
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * 0.25;
                const y = (e.clientY - r.top - r.height / 2) * 0.25;
                el.style.transform = `translate(${x}px, ${y}px)`;
                this.cursor.classList.add('button-hover');
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
                this.cursor.classList.remove('button-hover');
            });
        });
    }

    setCursorState(state) {
        if (this.cursorPos.state === state) return;
        this.cursorPos.state = state;

        this.cursor.classList.remove('view-state', 'close-state');

        if (state === 'view') {
            this.cursor.classList.add('view-state');
            this.cursorLabel.textContent = 'VIEW';
        } else if (state === 'close') {
            this.cursor.classList.add('close-state');
            this.cursorLabel.textContent = 'CLOSE';
        } else {
            this.cursorLabel.textContent = 'DRAG';
        }
    }

    setSound(on) {
        this.soundBtn.setAttribute('aria-pressed', String(on));
        this.soundBtn.querySelector('span').textContent = on ? 'AUDIO ON' : 'AUDIO OFF';
    }

    openCaseStudy(project) {
        if (!project || this.modalOpen) return;
        this.modalOpen = true;

        this.modalMeta.textContent = `[ ${project.num} // ${project.category} · ${project.year} ]`;
        this.modalTitle.textContent = project.title;
        this.modalTagline.textContent = project.tagline;
        this.modalDesc.textContent = project.description;
        this.modalAwards.textContent = project.awards;
        this.modalClient.textContent = project.client;
        this.modalYear.textContent = project.year;

        // Accent glow
        const accent = project.accent || '#00f2fe';
        this.modalHeroGlow.style.background = `radial-gradient(circle at 80% 20%, ${accent}40, transparent 70%)`;
        document.documentElement.style.setProperty('--accent', accent);

        // Tags
        this.modalTags.innerHTML = project.tags.map(t => `<span class="tech-tag">${t}</span>`).join('');

        this.modal.classList.add('active');
        this.setCursorState('close');
        this.audio.modalOpen();
    }

    closeCaseStudy() {
        if (!this.modalOpen) return;
        this.modalOpen = false;
        this.modal.classList.remove('active');
        this.setCursorState('drag');
        this.audio.modalClose();
    }

    updateProjectUI(index, force = false) {
        if (index === this.current && !force) return;
        this.current = index;
        const p = this.projects[index];
        if (!p) return;

        // Update accent CSS variable
        document.documentElement.style.setProperty('--accent', p.accent);

        // Update counter badge
        if (this.counterBadge) {
            this.counterBadge.textContent = `[ ${p.num} / ${pad(this.projects.length)} ]`;
        }

        // Update active project info
        if (this.projectCategory) {
            this.projectCategory.textContent = `[ ${p.num} // ${p.category} ]`;
        }
        if (this.projectTitle) {
            decode(this.projectTitle, p.title, { duration: 550 });
        }
        if (this.projectSubtitle) {
            this.projectSubtitle.textContent = p.subtitle;
        }

        // Update pagination dots
        this.pagDots?.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }

    ready() {
        document.documentElement.classList.add('loaded');
    }

    update(dt, velocity) {
        // Cursor damping
        const c = this.cursorPos;
        c.x = damp(c.x, c.tx, 26, dt);
        c.y = damp(c.y, c.ty, 26, dt);

        // Dynamic slight velocity skew
        const skew = Math.max(-25, Math.min(25, velocity * 40));
        this.cursor.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, -50%) skewX(${-skew * 0.4}deg)`;
    }
}
