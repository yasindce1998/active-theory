export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent exponential smoothing
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (t) => t * t * (3 - 2 * t);

export function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
}

function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function lookAt(out, eye, target, up = [0, 1, 0]) {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
    out[12] = -dot(x, eye); out[13] = -dot(y, eye); out[14] = -dot(z, eye); out[15] = 1;
    return out;
}

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Samples a smooth Catmull-Rom curve passing through every point; t in [0, 1]
export function samplePath(points, t) {
    const n = points.length - 1;
    const s = clamp(t, 0, 1) * n;
    const i = Math.min(Math.floor(s), n - 1);
    const f = s - i;
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n)];
    return [0, 1, 2].map((k) => catmullRom(p0[k], p1[k], p2[k], p3[k], f));
}

export function hslToRgb(h, s, l) {
    const k = (n) => (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)];
}
