// Minimal WebGL2 helpers: programs, render targets, fullscreen passes.

export const FULLSCREEN_VS = `#version 300 es
out vec2 vUv;
void main() {
    // Single oversized triangle covering the screen, no vertex buffers needed
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export function createContext(canvas) {
    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance'
    });
    if (!gl) return null;
    // Needed to render into half/full float textures (fluid sim, GPGPU particles, HDR)
    const hasFloat = !!gl.getExtension('EXT_color_buffer_float');
    return { gl, hasFloat };
}

function compile(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(3)}: ${l}`).join('\n');
        throw new Error(`Shader compile error:\n${log}\n${numbered}`);
    }
    return shader;
}

export function createProgram(gl, vsSrc, fsSrc) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i).name.replace(/\[0\]$/, '');
        uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
}

// Sets uniforms by inferring their type from the JS value. Textures get sequential units.
export function setUniforms(gl, prog, values) {
    gl.useProgram(prog.program);
    let unit = 0;
    for (const name in values) {
        const loc = prog.uniforms[name];
        if (loc === undefined) continue;
        const v = values[name];
        if (v instanceof WebGLTexture) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, v);
            gl.uniform1i(loc, unit++);
        } else if (typeof v === 'number') {
            gl.uniform1f(loc, v);
        } else if (v.int !== undefined) {
            gl.uniform1i(loc, v.int);
        } else if (v.length === 16) {
            gl.uniformMatrix4fv(loc, false, v);
        } else if (v.length === 4) {
            gl.uniform4fv(loc, v);
        } else if (v.length === 3) {
            gl.uniform3fv(loc, v);
        } else if (v.length === 2) {
            gl.uniform2fv(loc, v);
        }
    }
}

export function createTexture(gl, w, h, { internal, format, type, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE, data = null }) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    return tex;
}

export function createTarget(gl, w, h, opts) {
    const tex = createTexture(gl, w, h, opts);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rb = null;
    if (opts.depth) {
        rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    }
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`Framebuffer incomplete (0x${status.toString(16)})`);
    return {
        tex, fbo, w, h,
        texel: [1 / w, 1 / h],
        dispose() {
            gl.deleteTexture(tex);
            gl.deleteFramebuffer(fbo);
            if (rb) gl.deleteRenderbuffer(rb);
        }
    };
}

// Ping-pong pair for passes that read and write the same logical buffer
export function createDouble(gl, w, h, opts) {
    return {
        read: createTarget(gl, w, h, opts),
        write: createTarget(gl, w, h, opts),
        swap() { [this.read, this.write] = [this.write, this.read]; },
        dispose() { this.read.dispose(); this.write.dispose(); }
    };
}

export function formats(gl, hasFloat) {
    const ldr = { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
    if (!hasFloat) return { rgba: ldr, rg: ldr, r: ldr };
    return {
        rgba: { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT },
        rg: { internal: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT },
        r: { internal: gl.R16F, format: gl.RED, type: gl.HALF_FLOAT }
    };
}

export function bindTarget(gl, target) {
    if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.w, target.h);
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
}

export function drawQuad(gl, vao) {
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export function pass(gl, vao, prog, target, uniforms) {
    setUniforms(gl, prog, uniforms);
    bindTarget(gl, target);
    drawQuad(gl, vao);
}
