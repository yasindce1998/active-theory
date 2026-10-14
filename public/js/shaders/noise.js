// Shared GLSL noise: 3D gradient noise + curl noise.
// hash33 is based on Dave Hoskins' "Hash without Sine" (MIT).
export const NOISE = /* glsl */ `
vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}

float gcorner(vec3 i, vec3 f, vec3 o) {
    return dot(normalize(hash33(i + o) + 1e-5), f - o);
}

float gnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float x00 = mix(gcorner(i, f, vec3(0, 0, 0)), gcorner(i, f, vec3(1, 0, 0)), u.x);
    float x10 = mix(gcorner(i, f, vec3(0, 1, 0)), gcorner(i, f, vec3(1, 1, 0)), u.x);
    float x01 = mix(gcorner(i, f, vec3(0, 0, 1)), gcorner(i, f, vec3(1, 0, 1)), u.x);
    float x11 = mix(gcorner(i, f, vec3(0, 1, 1)), gcorner(i, f, vec3(1, 1, 1)), u.x);
    return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

vec3 noise3(vec3 p) {
    return vec3(gnoise(p), gnoise(p + vec3(31.4, 17.9, 5.3)), gnoise(p + vec3(-8.7, 43.1, 21.6)));
}

// Divergence-free flow field: particles swirl without bunching up or thinning out
vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 px0 = noise3(p - dx), px1 = noise3(p + dx);
    vec3 py0 = noise3(p - dy), py1 = noise3(p + dy);
    vec3 pz0 = noise3(p - dz), pz1 = noise3(p + dz);
    float x = (py1.z - py0.z) - (pz1.y - pz0.y);
    float y = (pz1.x - pz0.x) - (px1.z - px0.z);
    float z = (px1.y - px0.y) - (py1.x - py0.x);
    return vec3(x, y, z) / (2.0 * e);
}
`;
