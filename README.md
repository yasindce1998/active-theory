# Lumen

A cinematic, sci-fi real-time WebGL 2 experience exploring the techniques used by
high-end creative studios: GPU fluids, GPGPU particles, shader-driven materials,
film-style lens effects, camera choreography and generative sound. Zero
dependencies, no build step, no external assets.

```bash
npm start            # or: node server.js, ./start.sh, start.bat
```

Open http://localhost:7890. Scroll, move the pointer, press **G** for the parameter panel.

## Techniques and where to find them

| Technique | File | How it works |
| :--- | :--- | :--- |
| **GPU fluid simulation** | `public/js/fluid.js` | Stable-fluids solver on ping-pong float textures: splat → curl → vorticity confinement → divergence → Jacobi pressure solve → gradient subtraction → semi-Lagrangian advection. Pointer motion injects velocity and dye. |
| **GPGPU particles** | `public/js/particles.js` | 262k particle positions stored in an RGBA32F texture and updated by a fragment shader. Each particle follows a **curl-noise** field (divergence-free, so the flow swirls without clumping) while being pulled toward a target shape. Shapes morph with scroll. Rendered as additive points fetched with `texelFetch` from `gl_VertexID`, with no vertex buffers. |
| **Displaced hero mesh** | `public/js/blob.js` | Icosphere subdivided 6 times, displaced by layered gradient noise in the vertex shader. Normals are rebuilt after displacement from two tangent-offset samples. |
| **Procedural matcap + iridescence** | `public/js/blob.js` | Studio lighting faked from the view-space normal (no texture), plus a thin-film interference approximation and a fresnel rim. |
| **HDR bloom** | `public/js/post.js` | Soft-knee bright pass → 13-tap downsample chain (resists flicker) → tent-filter upsample with additive blending. |
| **Composite** | `public/js/post.js` | Fluid velocity distorts screen UVs; chromatic aberration grows toward the edges and with fluid speed; ACES tonemapping; vignette; per-frame film grain (also hides colour banding). |
| **Camera choreography** | `public/js/main.js`, `public/js/math.js` | The camera eases along a Catmull-Rom spline through per-section keyframes, with pointer parallax and idle drift layered on top. All easing uses frame-rate-independent `damp()`. |
| **Virtual smooth scroll** | `public/js/input.js` | Wheel, touch and keyboard update a target value, which is eased every frame. Section changes trigger audio, a UI transition and a light flash. |
| **3D pointer interaction** | `public/js/main.js` | A ray from the pointer is intersected with a camera-facing plane, so particles are pushed away and the blob bulges where you point. |
| **Generative audio** | `public/js/audio.js` | Web Audio only, no files: detuned oscillator pad through an LFO-modulated lowpass that opens with scroll speed, noise "wind" driven by pointer speed, a synthetic convolution reverb, and pentatonic blips on hover and section change. |
| **Text reveals + cursor** | `public/js/ui.js`, `public/css/style.css` | Masked line-by-line reveals with staggered delays, a magnetic hover effect on buttons, and a blend-mode cursor. |
| **Live parameter panel** | `public/js/gui.js`, `public/js/config.js` | Sliders for every tunable value. Settings persist to localStorage and can be copied or pasted as JSON presets. |
| **Adaptive quality** | `public/js/main.js` | Watches average frame time and scales render resolution between 50% and 100%. Fewer particles on touch devices. |

### Cinematic layer

| Technique | File | How it works |
| :--- | :--- | :--- |
| **Enter + warp-in intro** | `public/js/main.js`, `public/js/ui.js` | An enter screen (also unlocks audio), then the letterbox opens like a shutter while the camera dollies in from 38 units out at full warp. |
| **Hyperspace stars** | `public/js/scifi.js` | 7k stars generated from `gl_VertexID`. During warp each star also draws a line toward its "past" position, which gives radial streaks. FOV widens with warp like a dolly zoom. |
| **Nebula sky** | `public/js/main.js` (`SKY_FS`) | Ridged fBm sampled along the camera ray, so the sky parallaxes correctly as the camera turns, with a galactic band and dust lanes. |
| **Holo grid + orbital rings** | `public/js/scifi.js` | Anti-aliased grid (`fwidth`) with range rings and expanding scan pulses, plus three rotating HUD rings (comet, dashed, ticks) drawn as line primitives. |
| **Energy core** | `public/js/blob.js` | Veins of light where noise crosses zero, an inner pulse, and a hot fresnel rim. |
| **Bokeh depth of field** | `public/js/particles.js` | Per-particle circle of confusion around the focus distance: out-of-focus points grow into rimmed discs and dim to conserve energy. |
| **Anamorphic streaks** | `public/js/post.js`, `shaders/cinematic.js` | The bright pass is blurred horizontally in a short wide buffer with steps that grow each pass, then tinted. |
| **God rays** | `shaders/cinematic.js` | Screen-space radial blur toward the core's projected position. Turned off when the core is behind the camera. |
| **Lens and film** | `shaders/cinematic.js` | Barrel distortion, warp radial blur, procedural lens dirt lit by bloom, teal/orange split-tone grade with an S-curve, scanlines, grain, vignette. |
| **Camera feel** | `public/js/main.js` | Per-section roll, pointer-driven banking, and a layered-sine handheld shake that kicks on section changes. |
| **HUD** | `public/js/ui.js`, `public/css/cinematic.css` | 24 fps timecode, live camera telemetry, a target reticle that tracks the core, frame corners, and text that decodes from scrambled glyphs. |
| **Sound design** | `public/js/audio.js` | Sub-bass drone, a boot sweep with an impact, and a filtered-noise whoosh plus a pitch-dropping boom on every section change. |

Tune it all live with **G**. Groups: Lens, Film, Camera, World, Particles, Fluid. Setting `letterbox` to 0 removes the bars, and `warpOnTransition` controls how much each scroll jumps to hyperspace.

Also handled: `prefers-reduced-motion`, WebGL-unavailable fallback, context loss, deep links (`/#lab`).

## Customising

- Section copy, camera keyframes, colours and shapes: `public/js/config.js` (`SECTIONS`)
- Default look values: `public/js/config.js` (`PARAMS`), or tune them live with **G** and use **Copy JSON**

## Server

`server.js` is a zero-dependency static server with range requests, SPA fallback,
`Last-Modified`/304 support and path-traversal protection.

| Env var | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `7890` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface to bind (`0.0.0.0` to expose on your LAN) |
| `ROOT` | `./public` | Directory to serve |
