// Hero mesh: subdivided icosphere displaced in the vertex shader by animated
// noise, shaded with a procedural matcap, fresnel rim and thin-film iridescence.
// Normals are recomputed after displacement using neighbouring tangent samples.
import { createProgram, setUniforms } from './gl.js';
import { NOISE } from './shaders/noise.js';

function icosphere(detail) {
    const t = (1 + Math.sqrt(5)) / 2;
    let verts = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map(normalize);
    let faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    for (let d = 0; d < detail; d++) {
        const cache = new Map();
        const mid = (a, b) => {
            const key = a < b ? `${a}_${b}` : `${b}_${a}`;
            if (!cache.has(key)) {
                const va = verts[a], vb = verts[b];
                verts.push(normalize([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]));
                cache.set(key, verts.length - 1);
            }
            return cache.get(key);
        };
        faces = faces.flatMap(([a, b, c]) => {
            const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
            return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
        });
    }
    return { positions: new Float32Array(verts.flat()), indices: new Uint32Array(faces.flat()) };
}

function normalize(v) {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
}

const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform vec3 uPointer;
uniform float uPointerForce;
out vec3 vNormal;
out vec3 vViewPos;
out float vDisp;
out vec3 vObj;
${NOISE}

float displacement(vec3 p) {
    float n = gnoise(p * uFreq + vec3(0.0, uTime * 0.25, uTime * 0.1));
    n += 0.5 * gnoise(p * uFreq * 2.1 - uTime * 0.2);
    // Local bulge where the pointer ray is closest
    float d = distance(p * 1.3, uPointer);
    return n * uAmp + exp(-d * d * 2.0) * uPointerForce * 0.25;
}

vec3 displaced(vec3 p) { return p * (1.0 + displacement(p)); }

void main() {
    vec3 p = aPosition;
    vec3 tangent = normalize(cross(p, abs(p.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = cross(p, tangent);
    const float e = 0.01;
    vec3 a = displaced(p);
    vec3 b = displaced(normalize(p + tangent * e));
    vec3 c = displaced(normalize(p + bitangent * e));
    vec3 n = normalize(cross(b - a, c - a));

    vec4 world = uModel * vec4(a, 1.0);
    vec4 view = uView * world;
    vViewPos = view.xyz;
    vNormal = normalize(mat3(uView) * mat3(uModel) * n);
    vDisp = displacement(p);
    vObj = p;
    gl_Position = uProj * view;
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vViewPos;
in float vDisp;
out vec4 fragColor;
uniform vec3 uTint;
uniform vec3 uRim;
uniform float uIridescence;
uniform float uTime;
uniform float uEnergy;
uniform vec3 uEnergyColor;
in vec3 vObj;
${NOISE}

// Matcap without a texture: fake studio lighting looked up by view-space normal
vec3 proceduralMatcap(vec3 n) {
    vec2 uv = n.xy * 0.5 + 0.5;
    float key = smoothstep(0.55, 1.0, 1.0 - distance(uv, vec2(0.32, 0.78)));
    float fill = smoothstep(0.2, 1.0, 1.0 - distance(uv, vec2(0.85, 0.3))) * 0.35;
    float softbox = smoothstep(0.03, 0.0, abs(uv.y - 0.82)) * smoothstep(0.35, 0.1, abs(uv.x - 0.5));
    float ground = smoothstep(0.5, 0.0, uv.y) * 0.15;
    return vec3(0.03) + uTint * (key * 1.6 + fill) + vec3(softbox * 2.5) + uTint * ground;
}

// Cheap thin-film interference approximation: hue shifts with view angle
vec3 thinFilm(float cosTheta, float thickness) {
    float phase = thickness * (1.0 - cosTheta) * 6.2831;
    return 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.188));
}

void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(-vViewPos);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 4.0);

    vec3 col = proceduralMatcap(n);
    col = mix(col, col * thinFilm(ndv, 2.5 + vDisp * 4.0 + uTime * 0.1) * 1.8, uIridescence);
    col *= 1.0 - uEnergy * 0.55;
    col += uRim * fresnel * 2.5;

    // Energy veins: thin ridges where noise crosses zero, flowing over the surface
    float vn = gnoise(vObj * 3.2 + vec3(0.0, uTime * 0.35, 0.0));
    float vn2 = gnoise(vObj * 7.0 - uTime * 0.25);
    float veins = smoothstep(0.06, 0.0, abs(vn)) + smoothstep(0.035, 0.0, abs(vn2)) * 0.6;
    float pulse = 0.65 + 0.35 * sin(uTime * 2.2 - vObj.y * 5.0);
    col += uEnergyColor * veins * pulse * uEnergy * 5.0;
    // Inner glow seen through the shell when looking straight at it
    col += uEnergyColor * pow(ndv, 3.0) * uEnergy * (0.6 + 0.4 * sin(uTime * 1.3));
    col += vec3(1.0, 0.95, 0.9) * pow(fresnel, 2.0) * uEnergy * 1.5;
    fragColor = vec4(col, 1.0);
}`;

export class Blob {
    constructor(gl) {
        this.gl = gl;
        this.program = createProgram(gl, VS, FS);
        const geo = icosphere(6);
        this.indexCount = geo.indices.length;

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        const pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pb);
        gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
        gl.bindVertexArray(null);

        this.model = new Float32Array(16);
    }

    updateModel(time, scale, offsetY) {
        const ry = time * 0.15;
        const c = Math.cos(ry), s = Math.sin(ry);
        const m = this.model;
        m.fill(0);
        m[0] = c * scale; m[2] = -s * scale;
        m[5] = scale;
        m[8] = s * scale; m[10] = c * scale;
        m[13] = offsetY;
        m[15] = 1;
    }

    draw(camera, u) {
        const { gl } = this;
        setUniforms(gl, this.program, {
            uProj: camera.proj, uView: camera.view, uModel: this.model,
            uTime: u.time, uAmp: u.amp, uFreq: u.freq,
            uPointer: u.pointer, uPointerForce: u.pointerForce,
            uTint: u.tint, uRim: u.rim, uIridescence: u.iridescence,
            uEnergy: u.energy ?? 0, uEnergyColor: u.energyColor ?? [1, 1, 1]
        });
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
    }
}
