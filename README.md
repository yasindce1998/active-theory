# Active Theory · Creative Digital Experiences

A high-end, real-time WebGL 2 showcase engineered to mirror the signature look, feel, and buttery-smooth motion of **[activetheory.net](https://activetheory.net)**. Featuring an interactive 3D curved project ribbon with physical momentum drag, localized liquid texture displacement shaders, tactile Web Audio feedback, dynamic contextual cursor, and full case study transitions. Zero dependencies, no build step, no external assets.

```bash
npm start            # or: node server.js, ./start.sh, start.bat
```

Open **http://localhost:7890**. Drag to explore, click any project to expand its case study, and press **G** for the live parameter panel.

## Deploying to Vercel

The site is fully static — everything lives in `public/`, there is no build step and no dependencies. `vercel.json` tells Vercel to serve `public/` as-is, rewrite extensionless routes to `index.html` (same as the local server), and add basic security headers.

```bash
npx vercel          # preview deployment
npx vercel --prod   # production
```

Or import the Git repository in the Vercel dashboard — the defaults from `vercel.json` apply automatically (Framework Preset: *Other*, no build command, output directory `public`).

---

## What was improved to match Active Theory

| Dimension | Previous Demo | Active Theory Transformation | Implementation File |
| :--- | :--- | :--- | :--- |
| **Physics & Motion** | Basic lerp dampening to 4 static sections | **Dual-mode momentum drag & fling** with exponential friction decay, wheel momentum, and magnetic spring snapping | [public/js/input.js](public/js/input.js) |
| **3D Showcase** | Static central noise blob mesh | **Curved 3D Project Ribbon** with 6 procedural luxury case-study posters, depth layering, and raycasted hover detection | [public/js/cards.js](public/js/cards.js) |
| **Liquid Shaders** | Full-screen post-processing lens distortion | **Localized surface water-ripple displacement** running directly on card textures on hover/drag with chromatic aberration and click shockwaves | [public/js/shaders/card.js](public/js/shaders/card.js) |
| **Aerodynamics** | Rigid camera movement | **Velocity skew, roll & tilt** — cards tilt in the direction of drag velocity and elevate forward on mouse hover | [public/js/cards.js](public/js/cards.js) |
| **Design & UI** | Sci-fi cockpit HUD (timecodes, reticle, REC) | **Active Theory Luxury Minimalist UI**: real-time dual-timezone clocks (LA/AMS), project counter `[ 01 / 06 ]`, and category filters | [public/js/ui.js](public/js/ui.js), [public/index.html](public/index.html) |
| **Micro-Interactions** | Standard inverted CSS dot cursor | **Dynamic Contextual Cursor**: smoothly tracks pointer, skews with velocity, and adapts labels (`DRAG`, `VIEW`, `CLOSE`) | [public/js/ui.js](public/js/ui.js), [public/css/style.css](public/css/style.css) |
| **Case Study View** | None | **Fullscreen Case Study Modal** with project overview, client/year, tech stack badges, and live demo action | [public/index.html](public/index.html), [public/js/ui.js](public/js/ui.js) |
| **Tactile Audio** | Ambient drone and noise wind | **Mechanical click ticks** on scroll boundaries, magnetic latch snaps, and cinematic sub-bass modal transitions | [public/js/audio.js](public/js/audio.js) |

---

## Architecture & Techniques

### 1. Momentum Drag & Spring Physics ([input.js](public/js/input.js))
- Tracks pointer displacement 1:1 during mouse drag or touch swipe.
- Samples velocity history over recent frames to calculate a natural release velocity.
- Coasts on release using exponential friction decay: $v_{t+1} = v_t \cdot \gamma^{\Delta t}$.
- When velocity drops below `snapThreshold`, a critically damped spring gently latches onto the closest project card index.

### 2. 3D Card Ribbon System ([cards.js](public/js/cards.js))
- Generates 1024×640 high-resolution procedural canvas artwork for 6 case studies with sharp typography, geometric diagrams, and accent glows.
- Arranges quads along a continuous cylindrical 3D arc ($R \approx 13.5$ units).
- Casts camera rays into local card space using inverse model matrices to detect hover and click coordinates.
- Applies aerodynamic velocity roll ($rotZ = -velocity \times tilt$) and hover elevation ($Z += 0.8$).

### 3. Surface Liquid Shaders ([shaders/card.js](public/js/shaders/card.js))
- Fragment shader samples card textures with mouse-driven 2D procedural wave ripples.
- Computes velocity-driven chromatic aberration (sampling $R$ and $B$ channels with opposing directional offsets).
- Triggers expanding concentric shockwaves on click.
- Renders geometric edge frames, holographic rim highlights, and ambient light spots.

### 4. Generative Web Audio ([audio.js](public/js/audio.js))
- Zero audio files, pure Web Audio API synthesis.
- Filtered triangle/sine impulses produce crisp mechanical dial ticks when scrolling past cards.
- Double micro-click synthesis simulates a physical magnetic latch.
- Deep sine impact + exponential filter sweep for case study modal transitions.

---

## Tuning with Live Parameter Panel (**Press G**)
- **Ribbon Physics:** `friction`, `dragSpeed`, `wheelSpeed`, `snapStrength`, `cardTilt`, `cardElevate`
- **Liquid Shaders:** `liquidDistortion`, `chromaticAberration`, `cardRippleSpeed`
- **Post-Processing:** `bloomStrength`, `bloomThreshold`, `exposure`, `grain`, `vignette`
- **Atmosphere:** `dustIntensity`, `cameraSway`, `fov`
