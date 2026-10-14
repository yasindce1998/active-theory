// Sci-fi set dressing, all generated in shaders from gl_VertexID (no buffers):
// - Starfield that stretches into hyperspace streaks with warp
// - Holographic grid floor with expanding scan pulses
// - Orbital HUD rings (solid comet, dashed, tick marks) around the core
import { createProgram, setUniforms } from './gl.js';

const HASH = /* glsl */ `
vec3 hash31(float p) {
    vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}
`;

const STARS_VS = `#version 300 es
precision highp float;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uForward;
uniform float uWarp;
uniform float uLines;
uniform float uTime;
uniform float uPixelRatio;
out float vFade;
out vec3 vColor;
${HASH}
void main() {
    float id = uLines > 0.5 ? float(gl_VertexID / 2) : float(gl_VertexID);
    float tail = uLines > 0.5 ? float(gl_VertexID % 2) : 0.0;
    vec3 h = hash31(id + 1.0);
    float th = h.x * 6.2831853;
    float ph = acos(2.0 * h.y - 1.0);
    vec3 pos = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)) * (25.0 + h.z * 40.0);

    // The tail sits where the star "was" while flying forward, giving radial streaks
    pos += uForward * uWarp * (4.0 + h.z * 14.0) * tail;

    float twinkle = 0.6 + 0.4 * sin(uTime * (0.7 + h.x * 3.0) + id);
    vColor = mix(vec3(0.55, 0.7, 1.0), vec3(1.0, 0.82, 0.65), step(0.85, h.y)) * twinkle * (0.4 + h.z);
    vFade = 1.0 - tail;
    gl_Position = uProj * uView * vec4(pos, 1.0);
    gl_PointSize = (1.0 + h.z * 1.8) * uPixelRatio;
}`;

const STARS_FS = `#version 300 es
precision highp float;
in float vFade;
in vec3 vColor;
out vec4 fragColor;
uniform float uLines;
uniform float uWarp;
uniform float uIntensity;
void main() {
    float a;
    if (uLines > 0.5) {
        a = vFade * min(uWarp * 2.0, 1.0) * 1.6;
    } else {
        a = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
    }
    fragColor = vec4(vColor * a * uIntensity, 1.0);
}`;

const GRID_VS = `#version 300 es
precision highp float;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uY;
uniform float uSize;
out vec3 vWorld;
void main() {
    vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
    vWorld = vec3(c.x * uSize, uY, c.y * uSize);
    gl_Position = uProj * uView * vec4(vWorld, 1.0);
}`;

const GRID_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 fragColor;
uniform vec3 uColor;
uniform vec3 uCamPos;
uniform float uTime;
uniform float uIntensity;

float gridLine(vec2 p, float scale) {
    vec2 q = p / scale;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
    vec2 p = vWorld.xz;
    float d = length(p);
    float lines = gridLine(p, 1.0) * 0.3 + gridLine(p, 5.0);
    // Concentric range rings every 4 units
    float rings = 1.0 - min(abs(fract(d / 4.0 - 0.5) - 0.5) / fwidth(d / 4.0), 1.0);
    lines += rings * 0.4;

    float fade = exp(-d * 0.085) * smoothstep(50.0, 6.0, distance(vWorld, uCamPos));

    float pulseR = mod(uTime * 7.0, 42.0);
    float pulse = exp(-abs(d - pulseR) * 1.2) * (1.0 - pulseR / 42.0);

    float pool = exp(-d * d * 0.05) * 0.18;
    vec3 col = uColor * (lines * fade * (1.0 + pulse * 5.0) + pool + pulse * fade * 0.12);
    fragColor = vec4(col * uIntensity, 1.0);
}`;

const RING_SEGMENTS = 256;
const RING_COUNT = 3;

const RINGS_VS = `#version 300 es
precision highp float;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uTime;
uniform float uScale;
uniform float uY;
out float vT;
out float vRing;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }

void main() {
    const int SEG = ${RING_SEGMENTS};
    int perRing = SEG * 2;
    float ring = float(gl_VertexID / perRing);
    int k = gl_VertexID % perRing;
    float t = float(k / 2 + k % 2) / float(SEG);
    float a = t * 6.2831853;

    vec3 p = vec3(cos(a), 0.0, sin(a)) * (1.9 + ring * 0.42) * uScale;
    float dir = mod(ring, 2.0) * 2.0 - 1.0;
    p = rotY(uTime * (0.12 + ring * 0.05) * dir) * p;
    p = rotZ(sin(ring * 1.7 + 0.4) * 0.35) * rotX(0.25 + ring * 0.45) * p;
    p.y += uY;

    vT = t;
    vRing = ring;
    gl_Position = uProj * uView * vec4(p, 1.0);
}`;

const RINGS_FS = `#version 300 es
precision highp float;
in float vT;
in float vRing;
out vec4 fragColor;
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
void main() {
    float pattern;
    if (vRing < 0.5) {
        // Solid ring with a bright "comet" orbiting along it
        float head = fract(vT - uTime * 0.09);
        pattern = 0.25 + smoothstep(0.75, 1.0, head) * 2.5;
    } else if (vRing < 1.5) {
        pattern = step(0.45, fract(vT * 64.0)) * 0.55;
    } else {
        pattern = step(0.8, fract(vT * 180.0)) * 0.7 + step(0.975, fract(vT * 12.0)) * 2.0;
    }
    fragColor = vec4(uColor * pattern * uIntensity, 1.0);
}`;

export class SciFi {
    constructor(gl, starCount = 7000) {
        this.gl = gl;
        this.starCount = starCount;
        this.stars = createProgram(gl, STARS_VS, STARS_FS);
        this.grid = createProgram(gl, GRID_VS, GRID_FS);
        this.rings = createProgram(gl, RINGS_VS, RINGS_FS);
        this.vao = gl.createVertexArray();
    }

    begin() {
        const { gl } = this;
        gl.bindVertexArray(this.vao);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
    }

    end() {
        const { gl } = this;
        gl.depthMask(true);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    }

    drawStars(camera, u) {
        const { gl } = this;
        this.begin();
        gl.disable(gl.DEPTH_TEST);
        const common = {
            uProj: camera.proj, uView: camera.view, uForward: u.forward, uWarp: u.warp,
            uTime: u.time, uPixelRatio: u.pixelRatio, uIntensity: u.intensity
        };
        setUniforms(gl, this.stars, { ...common, uLines: 0 });
        gl.drawArrays(gl.POINTS, 0, this.starCount);
        if (u.warp > 0.01) {
            setUniforms(gl, this.stars, { ...common, uLines: 1 });
            gl.drawArrays(gl.LINES, 0, this.starCount * 2);
        }
        this.end();
    }

    drawGrid(camera, u) {
        const { gl } = this;
        this.begin();
        setUniforms(gl, this.grid, {
            uProj: camera.proj, uView: camera.view, uY: u.y, uSize: 45,
            uColor: u.color, uCamPos: camera.pos, uTime: u.time, uIntensity: u.intensity
        });
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.end();
    }

    drawRings(camera, u) {
        const { gl } = this;
        this.begin();
        setUniforms(gl, this.rings, {
            uProj: camera.proj, uView: camera.view, uTime: u.time, uScale: u.scale, uY: u.y,
            uColor: u.color, uIntensity: u.intensity
        });
        gl.drawArrays(gl.LINES, 0, RING_COUNT * RING_SEGMENTS * 2);
        this.end();
    }
}
