// 3D Interactive Project Ribbon & Card Showcase for Active Theory
// Renders textured case study cards along a curved 3D ribbon with
// velocity-based tilt, raycasted hover detection, and liquid displacement.

import { createProgram, setUniforms } from './gl.js';
import { CARD_VS, CARD_FS } from './shaders/card.js';
import { PROJECTS } from './config.js';
import {
    damp, clamp, hexToRgb,
    mat4Create, mat4Identity, mat4Multiply, mat4Translate,
    mat4RotateX, mat4RotateY, mat4RotateZ, mat4Scale, mat4Invert,
    vec3TransformMat4
} from './math.js';

const CARD_W = 4.2;
const CARD_H = 2.65;

export class Cards {
    constructor(gl) {
        this.gl = gl;
        this.projects = PROJECTS;
        this.program = createProgram(gl, CARD_VS, CARD_FS);
        this.textures = [];
        this.cardStates = [];
        this.hoveredIndex = -1;
        this.hoveredUv = [0.5, 0.5];
        this.hoveredCard = null;

        this.initGeometry();
        this.initTextures();
        this.initStates();
    }

    initGeometry() {
        const gl = this.gl;
        const hw = CARD_W / 2;
        const hh = CARD_H / 2;

        // Quad centered at (0, 0, 0) facing +Z
        const vertices = new Float32Array([
            // Position (x,y,z), UV (u,v), Normal (nx,ny,nz)
            -hw, -hh, 0,   0, 0,   0, 0, 1,
             hw, -hh, 0,   1, 0,   0, 0, 1,
             hw,  hh, 0,   1, 1,   0, 0, 1,
            -hw,  hh, 0,   0, 1,   0, 0, 1
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        const stride = 8 * 4; // 8 floats per vertex
        // Location 0: Position (vec3)
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

        // Location 1: UV (vec2)
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 3 * 4);

        // Location 2: Normal (vec3)
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 5 * 4);

        gl.bindVertexArray(null);
    }

    initTextures() {
        const gl = this.gl;
        this.textures = this.projects.map((p) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 640;
            const ctx = canvas.getContext('2d');

            this.renderCardGraphic(ctx, p, canvas.width, canvas.height);

            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

            return tex;
        });
    }

    // High-end minimalist editorial graphic generator for project posters
    renderCardGraphic(ctx, project, w, h) {
        // Deep luxury dark background
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#0a0a0f');
        bgGrad.addColorStop(0.5, '#07070a');
        bgGrad.addColorStop(1, '#050508');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Ambient color accent glow in top right
        const accent = project.accent || '#00f2fe';
        const glow = ctx.createRadialGradient(w * 0.75, h * 0.35, 10, w * 0.75, h * 0.35, w * 0.55);
        glow.addColorStop(0, `${accent}40`);
        glow.addColorStop(0.4, `${accent}18`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        // Background subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = 0; x < w; x += gridStep) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridStep) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Giant background project number
        ctx.font = '900 240px "Inter", -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(project.num, w - 40, 20);

        // Abstract thematic geometric art based on project id
        ctx.save();
        ctx.translate(w * 0.65, h * 0.52);
        this.drawProjectArt(ctx, project.id, accent);
        ctx.restore();

        // Top Left: Project Index & Category Pill
        ctx.font = '600 13px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = accent;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`[ ${project.num} // ${project.category} ]`, 48, 48);

        // Client & Year in top right
        ctx.font = '500 13px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.textAlign = 'right';
        ctx.fillText(`${project.client} · ${project.year}`, w - 48, 48);

        // Main Project Title
        ctx.font = '700 52px "Inter", -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(project.title, 48, h - 110);

        // Tagline / Subtitle
        ctx.font = '400 17px "Inter", -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(project.tagline, 48, h - 74);

        // Bottom metadata & Awards
        ctx.font = '600 11px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillText(`AWARDS: ${project.awards}`, 48, h - 42);

        // Tech badges
        ctx.textAlign = 'right';
        ctx.fillStyle = `${accent}bb`;
        ctx.fillText(project.tags.slice(0, 3).join(' · '), w - 48, h - 42);

        // Framing corner crosshairs
        ctx.strokeStyle = `${accent}66`;
        ctx.lineWidth = 1.5;
        const cl = 16;
        // Top-left
        ctx.beginPath(); ctx.moveTo(28, 28 + cl); ctx.lineTo(28, 28); ctx.lineTo(28 + cl, 28); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(w - 28 - cl, 28); ctx.lineTo(w - 28, 28); ctx.lineTo(w - 28, 28 + cl); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(28, h - 28 - cl); ctx.lineTo(28, h - 28); ctx.lineTo(28 + cl, h - 28); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(w - 28 - cl, h - 28); ctx.lineTo(w - 28, h - 28); ctx.lineTo(w - 28, h - 28 - cl); ctx.stroke();
    }

    drawProjectArt(ctx, id, accent) {
        ctx.strokeStyle = accent;
        ctx.fillStyle = `${accent}15`;
        ctx.lineWidth = 1.5;

        if (id === 'paper-triangles') {
            // Tessellated 3D origami crystal
            for (let i = 0; i < 6; i++) {
                const a1 = (i / 6) * Math.PI * 2;
                const a2 = ((i + 1) / 6) * Math.PI * 2;
                const r = 110;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
                ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Inner diagonals
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a1) * (r * 0.5), Math.sin(a1) * (r * 0.5));
                ctx.stroke();
            }
        } else if (id === 'dreamwave') {
            // Concentric soundwaves / radar rings
            for (let r = 25; r <= 125; r += 25) {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(-130, 0); ctx.lineTo(130, 0);
            ctx.moveTo(0, -130); ctx.lineTo(0, 130);
            ctx.stroke();
        } else if (id === 'mamba-forever') {
            // Golden particle spiral
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 6; a += 0.1) {
                const r = a * 6.5;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else if (id === 'cyberpunk-city') {
            // Isometric futuristic city blocks & crosshairs
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 30, -90);
                ctx.lineTo(i * 30, 90);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, 0, 70, 0, Math.PI * 2);
            ctx.stroke();
        } else if (id === 'medusa-engine') {
            // Micro-architecture hexagonal node mesh
            for (let i = 0; i < 7; i++) {
                const a = (i / 6) * Math.PI * 2;
                const x = Math.cos(a) * 75;
                const y = Math.sin(a) * 75;
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke();
            }
            ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else {
            // Fluid streamline contours
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const y = (i - 2) * 36;
                ctx.moveTo(-120, y);
                ctx.bezierCurveTo(-60, y - 40, 60, y + 40, 120, y);
                ctx.stroke();
            }
        }
    }

    initStates() {
        this.cardStates = this.projects.map((p, i) => ({
            index: i,
            project: p,
            accent: hexToRgb(p.accent),
            modelMatrix: mat4Create(),
            invModelMatrix: mat4Create(),
            pos: [0, 0, 0],
            hover: 0,
            pointer: [0.5, 0.5],
            ripple: [0.5, 0.5, 999.0, 0.0] // x, y, age, intensity
        }));
    }

    // Raycast hit test against all cards in 3D
    hitTest(pointerNorm, camera, aspect) {
        // pointerNorm: x,y in [0..1], 0,0 top-left
        const v = camera.view;
        const right = [v[0], v[4], v[8]];
        const up = [v[1], v[5], v[9]];
        const fwd = [-v[2], -v[6], -v[10]];
        const tanHalf = 1 / camera.proj[5];

        const nx = (pointerNorm.x * 2 - 1) * tanHalf * aspect;
        const ny = ((1 - pointerNorm.y) * 2 - 1) * tanHalf;

        // Camera ray in world space
        const rayDir = [
            fwd[0] + right[0] * nx + up[0] * ny,
            fwd[1] + right[1] * nx + up[1] * ny,
            fwd[2] + right[2] * nx + up[2] * ny
        ];
        const len = Math.hypot(...rayDir) || 1;
        rayDir[0] /= len; rayDir[1] /= len; rayDir[2] /= len;
        const rayOrigin = [...camera.pos];

        let closestDist = Infinity;
        let hitResult = null;

        const hw = CARD_W / 2;
        const hh = CARD_H / 2;

        for (let i = 0; i < this.cardStates.length; i++) {
            const card = this.cardStates[i];
            const invM = card.invModelMatrix;

            // Transform ray origin and direction into card's local object space
            const originLoc = vec3TransformMat4([0, 0, 0], rayOrigin, invM);
            const farWorld = [rayOrigin[0] + rayDir[0] * 100, rayOrigin[1] + rayDir[1] * 100, rayOrigin[2] + rayDir[2] * 100];
            const farLoc = vec3TransformMat4([0, 0, 0], farWorld, invM);

            const dirLoc = [farLoc[0] - originLoc[0], farLoc[1] - originLoc[1], farLoc[2] - originLoc[2]];
            const dLen = Math.hypot(...dirLoc) || 1;
            dirLoc[0] /= dLen; dirLoc[1] /= dLen; dirLoc[2] /= dLen;

            // Check intersection with plane z = 0
            if (Math.abs(dirLoc[2]) < 1e-5) continue;
            const t = -originLoc[2] / dirLoc[2];
            if (t <= 0) continue;

            const hitX = originLoc[0] + dirLoc[0] * t;
            const hitY = originLoc[1] + dirLoc[1] * t;

            // Check if hit falls within card dimensions
            if (hitX >= -hw && hitX <= hw && hitY >= -hh && hitY <= hh) {
                // Calculate world distance
                const worldDist = Math.hypot(
                    (rayOrigin[0] + rayDir[0] * t) - rayOrigin[0],
                    (rayOrigin[1] + rayDir[1] * t) - rayOrigin[1],
                    (rayOrigin[2] + rayDir[2] * t) - rayOrigin[2]
                );

                if (t < closestDist) {
                    closestDist = t;
                    const u = (hitX / CARD_W) + 0.5;
                    const v = (hitY / CARD_H) + 0.5;
                    hitResult = {
                        cardIndex: i,
                        uv: [u, v],
                        project: card.project
                    };
                }
            }
        }

        return hitResult;
    }

    triggerClick(index, uv = [0.5, 0.5]) {
        if (index >= 0 && index < this.cardStates.length) {
            const card = this.cardStates[index];
            card.ripple = [uv[0], uv[1], 0.0, 1.0];
            return card.project;
        }
        return null;
    }

    update(dt, time, scrollProgress, velocity, pointer, params) {
        const N = this.projects.length;
        const radius = params.cardRadius || 13.5;
        const spacingRad = (params.cardSpacing || 3.5) / radius;
        const tiltFactor = params.cardTilt || 1.3;
        const elevateDist = params.cardElevate || 0.8;

        for (let i = 0; i < N; i++) {
            const card = this.cardStates[i];

            // Circular wrapping around active scroll position
            let diff = (i - scrollProgress);
            // Wrap to range [-N/2, N/2]
            diff = ((diff % N) + N * 1.5) % N - N * 0.5;

            const theta = diff * spacingRad;
            const x = Math.sin(theta) * radius;
            const z = -Math.cos(theta) * radius + radius;
            const y = 0.0;

            card.pos = [x, y, z];

            // Smooth hover state interpolation
            const isHovered = (this.hoveredIndex === i);
            const targetHover = isHovered ? 1.0 : 0.0;
            card.hover = damp(card.hover, targetHover, 8, dt);

            if (isHovered && this.hoveredUv) {
                card.pointer[0] = damp(card.pointer[0], this.hoveredUv[0], 12, dt);
                card.pointer[1] = damp(card.pointer[1], this.hoveredUv[1], 12, dt);
            }

            // Update ripple shockwave
            card.ripple[2] += dt * (params.cardRippleSpeed || 3.2);
            card.ripple[3] = Math.max(0.0, card.ripple[3] - dt * 1.4);

            // Compute Model Matrix:
            // Translate to arc -> Elevate on hover -> Rotate Y (arc) -> Rotate Z (velocity roll) -> Tilt to pointer
            const m = card.modelMatrix;
            mat4Identity(m);
            
            // Base arc position + hover elevation along camera direction (+Z)
            const elevZ = card.hover * elevateDist;
            mat4Translate(m, m, [x, y, z + elevZ]);

            // Arc facing angle
            mat4RotateY(m, m, -theta);

            // Velocity-based aerodynamic roll and bank
            const vRoll = clamp(-velocity * tiltFactor * 0.4, -0.35, 0.35);
            mat4RotateZ(m, m, vRoll);
            mat4RotateY(m, m, velocity * 0.15);

            // Mouse hover parallax tilt
            if (card.hover > 0.01) {
                const tiltX = (card.pointer[1] - 0.5) * -0.25 * card.hover;
                const tiltY = (card.pointer[0] - 0.5) * 0.3 * card.hover;
                mat4RotateX(m, m, tiltX);
                mat4RotateY(m, m, tiltY);
            }

            // Scale slightly on hover
            const s = 1.0 + card.hover * 0.04;
            mat4Scale(m, m, [s, s, 1.0]);

            // Cache inverse matrix for raycasting
            mat4Invert(card.invModelMatrix, m);
        }
    }

    draw(camera, velocity, time, params) {
        const gl = this.gl;
        gl.useProgram(this.program.program);
        gl.bindVertexArray(this.vao);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Sort cards by camera distance (draw back to front)
        const sorted = [...this.cardStates].sort((a, b) => {
            const da = Math.hypot(camera.pos[0] - a.pos[0], camera.pos[2] - a.pos[2]);
            const db = Math.hypot(camera.pos[0] - b.pos[0], camera.pos[2] - b.pos[2]);
            return db - da;
        });

        for (let i = 0; i < sorted.length; i++) {
            const card = sorted[i];
            const tex = this.textures[card.index];

            setUniforms(gl, this.program, {
                uModel: card.modelMatrix,
                uView: camera.view,
                uProj: camera.proj,
                uTexture: tex,
                uAccent: card.accent,
                uPointer: card.pointer,
                uHover: card.hover,
                uVelocity: velocity,
                uTime: time,
                uRipple: card.ripple,
                uDistortion: params.liquidDistortion || 1.4,
                uAberration: params.chromaticAberration || 0.035
            });

            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }

        gl.bindVertexArray(null);
    }
}
