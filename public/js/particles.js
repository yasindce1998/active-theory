// GPGPU particles: positions live in a float texture and are updated
// entirely on the GPU each frame. Particles flow through a curl-noise field
// while being pulled toward a target shape that morphs per section.
import { createProgram, createDouble, pass, FULLSCREEN_VS, setUniforms } from './gl.js';
import { NOISE } from './shaders/noise.js';

const SHAPES = /* glsl */ `
const float PI = 3.14159265;

vec3 shapeSphere(vec2 r) {
    float th = r.x * 2.0 * PI;
    float ph = acos(2.0 * r.y - 1.0);
    return vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)) * 1.6;
}

vec3 shapeTorusKnot(vec2 r) {
    // (2,3) torus knot with particles scattered in a thin tube around the curve
    float t = r.x * 2.0 * PI;
    float rr = 2.0 + cos(3.0 * t);
    vec3 c = vec3(rr * cos(2.0 * t), -sin(3.0 * t), rr * sin(2.0 * t)) * 0.6;
    float a = r.y * 2.0 * PI;
    return c + vec3(cos(a), sin(a), cos(a + 1.3)) * 0.12;
}

vec3 shapeGrid(vec2 r) {
    vec2 g = floor(r * 48.0) / 48.0;
    float h = sin(g.x * 9.0) * cos(g.y * 7.0) * 0.35;
    return vec3((g.x - 0.5) * 7.0, h - 0.8, (g.y - 0.5) * 7.0);
}

vec3 shapeRing(vec2 r) {
    float a = r.x * 2.0 * PI;
    float rad = 2.2 + (r.y - 0.5) * 0.6;
    return vec3(cos(a) * rad, (r.y - 0.5) * 0.15, sin(a) * rad);
}

vec3 targetShape(float id, vec2 r) {
    if (id < 0.5) return shapeSphere(r);
    if (id < 1.5) return shapeTorusKnot(r);
    if (id < 2.5) return shapeGrid(r);
    return shapeRing(r);
}
`;

const SIM = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uPositions;
uniform float uTime;
uniform float uDt;
uniform float uShapeA;
uniform float uShapeB;
uniform float uMorph;
uniform float uCurlStrength;
uniform float uAttraction;
uniform vec3 uPointer;
uniform float uPointerForce;
${NOISE}
${SHAPES}
void main() {
    vec4 data = texture(uPositions, vUv);
    vec3 pos = data.xyz;
    float life = data.w;

    // Stable per-particle random seed from its texel coordinate
    vec2 seed = fract(sin(vec2(dot(vUv, vec2(12.9898, 78.233)), dot(vUv, vec2(39.346, 11.135)))) * 43758.5453);
    vec3 target = mix(targetShape(uShapeA, seed), targetShape(uShapeB, seed), smoothstep(0.0, 1.0, uMorph));

    vec3 flow = curlNoise(pos * 0.45 + uTime * 0.05) * uCurlStrength;
    vec3 pull = (target - pos) * uAttraction;

    // Pointer pushes particles away, radially
    vec3 toP = pos - uPointer;
    float d = length(toP);
    vec3 push = toP / max(d, 1e-3) * exp(-d * d * 1.5) * uPointerForce;

    pos += (flow + pull + push) * uDt;
    life = fract(life + uDt * 0.05);
    fragColor = vec4(pos, life);
}`;

const RENDER_VS = `#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform mat4 uProj;
uniform mat4 uView;
uniform float uSize;
uniform float uPixelRatio;
uniform float uFocus;
uniform float uAperture;
out float vLife;
out float vDepth;
out float vCoc;
void main() {
    ivec2 size = textureSize(uPositions, 0);
    ivec2 coord = ivec2(gl_VertexID % size.x, gl_VertexID / size.x);
    vec4 data = texelFetch(uPositions, coord, 0);
    vec4 view = uView * vec4(data.xyz, 1.0);
    gl_Position = uProj * view;
    vLife = data.w;
    vDepth = -view.z;
    // Circle of confusion: grows with distance from the focal plane
    vCoc = abs(vDepth - uFocus) * uAperture;
    gl_PointSize = (uSize / max(vDepth, 0.1) + vCoc * 6.0) * uPixelRatio;
}`;

const RENDER_FS = `#version 300 es
precision highp float;
in float vLife;
in float vDepth;
in float vCoc;
out vec4 fragColor;
uniform vec3 uColorA;
uniform vec3 uColorB;
void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    // In focus: soft dot. Out of focus: flatter disc with a faint bright rim, like lens bokeh
    float soft = smoothstep(0.5, 0.0, r);
    float disc = smoothstep(0.5, 0.42, r) * (0.7 + 0.3 * smoothstep(0.3, 0.48, r));
    float blur = clamp(vCoc * 0.6, 0.0, 1.0);
    float a = mix(soft, disc, blur) / (1.0 + vCoc * vCoc * 4.0);
    vec3 col = mix(uColorA, uColorB, vLife);
    a *= smoothstep(0.3, 1.5, vDepth);
    fragColor = vec4(col * a, a);
}`;

export class Particles {
    constructor(gl, vao, hasFloat, count) {
        this.gl = gl;
        this.vao = vao;
        this.size = Math.ceil(Math.sqrt(count));
        this.count = this.size * this.size;
        this.sim = createProgram(gl, FULLSCREEN_VS, SIM);
        this.render = createProgram(gl, RENDER_VS, RENDER_FS);
        this.emptyVao = gl.createVertexArray();

        if (!hasFloat) {
            this.disabled = true;
            return;
        }
        const fmt = { internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, filter: gl.NEAREST };

        const data = new Float32Array(this.count * 4);
        for (let i = 0; i < this.count; i++) {
            const r = 4 * Math.cbrt(Math.random());
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            data[i * 4] = r * Math.sin(ph) * Math.cos(th);
            data[i * 4 + 1] = r * Math.cos(ph);
            data[i * 4 + 2] = r * Math.sin(ph) * Math.sin(th);
            data[i * 4 + 3] = Math.random();
        }
        this.positions = createDouble(gl, this.size, this.size, { ...fmt, data });
        // createDouble uploads data to both; that's fine as a starting state
    }

    update(dt, time, state) {
        if (this.disabled) return;
        const { gl } = this;
        gl.disable(gl.BLEND);
        pass(gl, this.vao, this.sim, this.positions.write, {
            uPositions: this.positions.read.tex,
            uTime: time,
            uDt: Math.min(dt, 1 / 30),
            uShapeA: state.shapeA,
            uShapeB: state.shapeB,
            uMorph: state.morph,
            uCurlStrength: state.curlStrength,
            uAttraction: state.attraction,
            uPointer: state.pointer,
            uPointerForce: state.pointerForce
        });
        this.positions.swap();
    }

    draw(camera, colors, pixelRatio, focus = 6, aperture = 0.15) {
        if (this.disabled) return;
        const { gl } = this;
        setUniforms(gl, this.render, {
            uPositions: this.positions.read.tex,
            uProj: camera.proj,
            uView: camera.view,
            uSize: 9.0,
            uPixelRatio: pixelRatio,
            uFocus: focus,
            uAperture: aperture,
            uColorA: colors[0],
            uColorB: colors[1]
        });
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE); // additive: overlapping particles glow, feeding bloom
        // Test against the blob's depth so it occludes particles behind it, but don't write depth
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.bindVertexArray(this.emptyVao);
        gl.drawArrays(gl.POINTS, 0, this.count);
        gl.depthMask(true);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
    }
}
