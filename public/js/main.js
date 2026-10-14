import { createContext, createProgram, pass, bindTarget, FULLSCREEN_VS } from './gl.js';
import { perspective, lookAt, samplePath, damp, lerp, clamp, hslToRgb, smoothstep } from './math.js';
import { Fluid } from './fluid.js';
import { Particles } from './particles.js';
import { Blob } from './blob.js';
import { SciFi } from './scifi.js';
import { Post } from './post.js';
import { Input } from './input.js';
import { Soundscape } from './audio.js';
import { Gui } from './gui.js';
import { UI } from './ui.js';
import { SECTIONS, PARAMS, SCHEMA } from './config.js';
import { NOISE } from './shaders/noise.js';

// Deep-space sky: ridged fBm nebula reconstructed from the camera ray direction,
// so it parallaxes correctly as the camera turns.
const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uForward;
uniform float uTanHalf;
uniform float uAspect;
uniform float uIntensity;
${NOISE}
float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
        s += a * (1.0 - abs(gnoise(p)));
        p = p * 2.03 + vec3(1.7, 9.2, 3.1);
        a *= 0.5;
    }
    return s;
}
void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 dir = normalize(uForward + uRight * ndc.x * uTanHalf * uAspect + uUp * ndc.y * uTanHalf);
    vec3 p = dir * 2.2 + vec3(0.0, 0.0, uTime * 0.01);
    float n = fbm(p);
    float dust = fbm(p * 2.5 + 4.0);
    float band = exp(-pow(dot(dir, normalize(vec3(0.3, 1.0, 0.15))) * 2.4, 2.0));
    float neb = pow(n, 5.0) * (0.15 + band * 1.1);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.3, 0.9, dust)) * neb;
    // Dark dust lanes cutting through the band
    col *= 1.0 - smoothstep(0.4, 0.8, dust) * 0.85 * band;
    col += uColorB * band * 0.006;
    fragColor = vec4(col * uIntensity, 1.0);
}`;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function start() {
    const canvas = document.getElementById('gl');
    const ctx = createContext(canvas);
    if (!ctx || !ctx.hasFloat) {
        document.documentElement.classList.add('no-webgl');
        return;
    }
    const { gl, hasFloat } = ctx;

    const params = PARAMS;
    const gui = new Gui(params, SCHEMA);
    const input = new Input(canvas, { sections: SECTIONS.length });
    const audio = new Soundscape();
    const ui = new UI(SECTIONS, input, audio, gui);

    const quadVao = gl.createVertexArray();
    const sky = createProgram(gl, FULLSCREEN_VS, SKY_FS);
    const isMobile = matchMedia('(pointer: coarse)').matches;
    const particles = new Particles(gl, quadVao, hasFloat, isMobile ? 65536 : 262144);
    const blob = new Blob(gl);
    const scifi = new SciFi(gl, isMobile ? 3000 : 7000);
    const post = new Post(gl, quadVao, hasFloat);
    const fluid = new Fluid(gl, quadVao, hasFloat, params);

    const camera = {
        proj: new Float32Array(16), view: new Float32Array(16),
        pos: [0, 0, 40], target: [0, 0, 0], roll: 0, fov: params.fov
    };
    const camPath = SECTIONS.map((s) => s.camera);
    const targetPath = SECTIONS.map((s) => s.target);

    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let quality = 1;
    let frameAvg = 16;
    let aspect = 1;

    function resize() {
        const w = Math.max(1, Math.floor(window.innerWidth * pixelRatio * quality));
        const h = Math.max(1, Math.floor(window.innerHeight * pixelRatio * quality));
        if (post.scene && canvas.width === w && canvas.height === h) return;
        canvas.width = w;
        canvas.height = h;
        aspect = w / h;
        post.resize(w, h);
        fluid.resize(aspect);
    }
    window.addEventListener('resize', resize);
    resize();

    const look = {
        hue: SECTIONS[0].hue, scale: 1, amp: 0.16, iridescence: 0.35, energy: 0.8,
        flash: 0, warp: 1, shake: 0, fade: 0
    };
    // Intro: camera starts far out in warp; `intro` goes 0 -> 1 once the user enters
    const intro = { started: false, t: 0, duration: reduceMotion ? 0.6 : 4.2 };
    ui.onEnter = (withSound) => {
        intro.started = true;
        if (withSound) audio.start();
    };

    let lastSection = Math.round(input.scroll.current);
    let last = performance.now();
    let time = 0;
    let idleSplatTimer = 0;
    let lastFluidRes = [params.simRes, params.dyeRes];
    const shakeSeed = Math.random() * 100;

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        time += dt;

        frameAvg = lerp(frameAvg, dt * 1000, 0.05);
        if (time > 3) {
            const prevQuality = quality;
            if (frameAvg > 24 && quality > 0.5) quality = Math.max(0.5, quality - 0.1);
            else if (frameAvg < 14 && quality < 1) quality = Math.min(1, quality + 0.05);
            if (prevQuality !== quality) { frameAvg = 16; resize(); }
        }
        if (lastFluidRes[0] !== params.simRes || lastFluidRes[1] !== params.dyeRes) {
            lastFluidRes = [params.simRes, params.dyeRes];
            fluid.resize(aspect);
        }

        if (intro.started) intro.t = Math.min(1, intro.t + dt / intro.duration);
        const introE = 1 - Math.pow(1 - intro.t, 3);

        input.update(dt);
        const progress = input.progress;
        const sectionFloat = input.scroll.current;
        const sectionIndex = clamp(Math.round(sectionFloat), 0, SECTIONS.length - 1);
        const a = Math.floor(sectionFloat);
        const b = Math.min(a + 1, SECTIONS.length - 1);
        const f = sectionFloat - a;
        const sa = SECTIONS[a], sb = SECTIONS[b];

        if (sectionIndex !== lastSection) {
            lastSection = sectionIndex;
            ui.setSection(sectionIndex);
            audio.setSection(sectionIndex);
            look.flash = 0.12;
            look.shake = 1;
        }
        look.flash = damp(look.flash, 0, 3, dt);
        look.shake = damp(look.shake, 0, 2.5, dt);

        look.hue = lerp(sa.hue, sb.hue, f);
        look.scale = damp(look.scale, lerp(sa.blob.scale, sb.blob.scale, f), 4, dt);
        look.amp = damp(look.amp, lerp(sa.blob.amp, sb.blob.amp, f), 3, dt);
        look.iridescence = lerp(sa.blob.iridescence, sb.blob.iridescence, f);
        look.energy = damp(look.energy, lerp(sa.blob.energy, sb.blob.energy, f), 3, dt);

        // Warp: full during the intro, then driven by scroll speed during transitions
        const scrollWarp = clamp(input.scroll.velocity * 0.9, 0, 1) * params.warpOnTransition;
        const warpTarget = Math.max(1 - smoothstep(clamp((intro.t - 0.25) / 0.6, 0, 1)), reduceMotion ? 0 : scrollWarp);
        look.warp = damp(look.warp, warpTarget, 5, dt);
        look.fade = damp(look.fade, intro.started ? 1 : 0.35, 2, dt);

        // Camera: spline path + intro dolly + pointer parallax + drift + roll + handheld shake
        const sway = reduceMotion ? 0 : params.cameraSway;
        const p = input.pointer;
        const base = samplePath(camPath, progress);
        const tgt = samplePath(targetPath, progress);
        const introOffset = (1 - introE) * 38;
        const desired = [
            base[0] + (p.x - 0.5) * 1.0 * sway + Math.sin(time * 0.13) * 0.25 * sway,
            base[1] + (p.y - 0.5) * 0.6 * sway + Math.cos(time * 0.11) * 0.15 * sway,
            base[2] + introOffset
        ];
        const follow = intro.t < 1 ? 20 : 2.2;
        for (let i = 0; i < 3; i++) {
            camera.pos[i] = damp(camera.pos[i], desired[i], follow, dt);
            camera.target[i] = damp(camera.target[i], tgt[i], 2.2, dt);
        }
        const rollTarget = lerp(sa.roll, sb.roll, smoothstep(f)) + (p.x - 0.5) * -0.04 * sway + (1 - introE) * 0.5;
        camera.roll = damp(camera.roll, rollTarget, 2, dt);

        const shakeAmt = (reduceMotion ? 0 : params.shake) * (0.006 + look.shake * 0.05 + look.warp * 0.03);
        const shake = [0, 1, 2].map((k) =>
            (Math.sin(time * 13.1 + shakeSeed + k * 7.3) * 0.6 + Math.sin(time * 23.7 + k * 3.1) * 0.4) * shakeAmt);
        const eye = camera.pos.map((v, i) => v + shake[i]);
        const up = [Math.sin(camera.roll), Math.cos(camera.roll), 0];
        lookAt(camera.view, eye, camera.target, up);

        // FOV breathes wider during warp, like a speed-ramp dolly zoom
        const fovMul = isMobile && aspect < 1 ? 1.45 : 1;
        camera.fov = damp(camera.fov, (params.fov + look.warp * 28) * fovMul, 4, dt);
        perspective(camera.proj, camera.fov * Math.PI / 180, aspect, 0.1, 200);

        const v = camera.view;
        const right = [v[0], v[4], v[8]];
        const upv = [v[1], v[5], v[9]];
        const forward = [-v[2], -v[6], -v[10]];

        const pointer3d = unprojectToPlane(p.x, p.y, camera, aspect);
        const pointerActive = p.moved ? clamp(p.speed * 0.6, 0, 1) + (p.down ? 1 : 0) : 0;

        if (p.moved && (Math.abs(p.dx) + Math.abs(p.dy) > 1e-5)) {
            const col = hslToRgb((look.hue + time * 0.02) % 1, 0.8, 0.5).map((c) => c * 0.1);
            fluid.splat([p.x, p.y], [p.dx, p.dy], col);
        }
        idleSplatTimer -= dt;
        if (!reduceMotion && idleSplatTimer <= 0 && p.speed < 0.05) {
            idleSplatTimer = 1.6 + Math.random() * 2;
            const ang = Math.random() * Math.PI * 2;
            const col = hslToRgb(look.hue, 0.7, 0.5).map((c) => c * 0.1);
            fluid.splat([0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4], [Math.cos(ang) * 0.004, Math.sin(ang) * 0.004], col);
        }
        fluid.step(dt);

        particles.update(dt, time, {
            shapeA: sa.shape,
            shapeB: sb.shape,
            morph: f,
            curlStrength: params.curlStrength * (1 + input.scroll.velocity * 2 + look.warp * 3),
            attraction: params.attraction * (0.3 + introE * 0.7),
            pointer: pointer3d,
            pointerForce: params.pointerForce * pointerActive
        });

        // ---- Scene (HDR) ----
        bindTarget(gl, post.scene);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const primary = hslToRgb(look.hue, 0.75, 0.55);
        const secondary = hslToRgb((look.hue + 0.5) % 1, 0.8, 0.55);
        pass(gl, quadVao, sky, post.scene, {
            uTime: time,
            uColorA: hslToRgb(look.hue, 0.7, 0.35),
            uColorB: hslToRgb((look.hue + 0.08) % 1, 0.8, 0.5),
            uRight: right, uUp: upv, uForward: forward,
            uTanHalf: Math.tan(camera.fov * Math.PI / 360), uAspect: aspect,
            uIntensity: 0.45
        });

        scifi.drawStars(camera, {
            forward, warp: look.warp, time, pixelRatio: pixelRatio * quality, intensity: params.starIntensity
        });

        blob.updateModel(time, look.scale, Math.sin(time * 0.6) * 0.05);
        blob.draw(camera, {
            time, amp: look.amp, freq: params.blobFreq,
            pointer: pointer3d, pointerForce: pointerActive,
            tint: hslToRgb(look.hue, 0.35, 0.4),
            rim: secondary,
            iridescence: look.iridescence,
            energy: look.energy,
            energyColor: primary
        });

        scifi.drawGrid(camera, {
            y: -2.4, color: primary.map((c) => c * 0.9), time, intensity: params.gridIntensity * introE
        });
        scifi.drawRings(camera, {
            time, scale: look.scale * 1.1, y: 0, color: primary.map((c) => c * 1.4), intensity: params.ringIntensity * introE
        });

        const focus = Math.hypot(camera.pos[0] - camera.target[0], camera.pos[1] - camera.target[1], camera.pos[2] - camera.target[2]);
        const pb = params.particleBrightness;
        particles.draw(camera, [
            primary.map((c) => c * pb),
            hslToRgb((look.hue + 0.12) % 1, 0.9, 0.7).map((c) => c * pb)
        ], pixelRatio * quality, focus, params.dofAperture);

        // God rays emanate from the core's projected screen position
        const light = projectToScreen([0, 0, 0], camera);
        const facing = light.z > 0 ? 1 : 0;

        post.render(fluid, {
            ...params,
            time,
            flash: look.flash,
            warp: look.warp,
            fade: look.fade,
            lightPos: [light.x, light.y],
            raysStrength: params.raysStrength * facing,
            streakTint: hslToRgb((look.hue + 0.02) % 1, 0.6, 0.65)
        });

        audio.update(input.scroll.velocity + look.warp * 0.5, p.speed * 0.5);
        ui.update(sectionFloat, dt, {
            time, camera, fov: camera.fov, warp: look.warp, light, focus,
            letterbox: params.letterbox, intro: intro.t, fps: 1000 / frameAvg
        });
        p.moved = p.moved && p.speed > 0.001;

        requestAnimationFrame(frame);
    }

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        document.documentElement.classList.add('no-webgl');
    });

    ui.ready();
    requestAnimationFrame(frame);
}

function projectToScreen(p, camera) {
    const v = camera.view, m = camera.proj;
    const vx = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12];
    const vy = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13];
    const vz = v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14];
    const cx = m[0] * vx + m[4] * vy + m[8] * vz + m[12];
    const cy = m[1] * vx + m[5] * vy + m[9] * vz + m[13];
    const cw = m[3] * vx + m[7] * vy + m[11] * vz + m[15];
    return { x: (cx / cw) * 0.5 + 0.5, y: (cy / cw) * 0.5 + 0.5, z: -vz };
}

// Casts a ray from the camera through the pointer and intersects the plane facing the camera through the target
function unprojectToPlane(px, py, camera, aspect) {
    const v = camera.view;
    const right = [v[0], v[4], v[8]];
    const up = [v[1], v[5], v[9]];
    const fwd = [-v[2], -v[6], -v[10]];
    const tanHalf = 1 / camera.proj[5];
    const nx = (px * 2 - 1) * tanHalf * aspect;
    const ny = (py * 2 - 1) * tanHalf;
    const dir = [0, 1, 2].map((i) => fwd[i] + right[i] * nx + up[i] * ny);
    const toTarget = [0, 1, 2].map((i) => camera.target[i] - camera.pos[i]);
    const dist = toTarget[0] * fwd[0] + toTarget[1] * fwd[1] + toTarget[2] * fwd[2];
    return [0, 1, 2].map((i) => camera.pos[i] + dir[i] * dist);
}

try {
    start();
} catch (err) {
    console.error(err);
    document.documentElement.classList.add('no-webgl');
}
