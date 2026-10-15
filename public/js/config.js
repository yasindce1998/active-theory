// Active Theory Portfolio & Experience Configuration
// High-end digital production showcase with interactive 3D ribbon physics,
// liquid shaders, case studies, and live parameter tuning.

export const PROJECTS = [
    {
        id: 'paper-triangles',
        num: '01',
        title: 'Paper Triangles',
        tagline: 'Interactive 3D WebGL Brand Universe',
        category: 'EXPERIENTIAL',
        client: 'Paper Triangles Studio',
        year: '2026',
        subtitle: 'Dynamic light simulation, fluid typography and spatial audio in the browser.',
        description: 'An interactive brand universe celebrating the synergy between physical origami forms and digital shader geometry. Real-time procedural tessellation, interactive GPU fluid ripples, and spatial binaural sound create an unforgettable sensory experience that pushes WebGL 2.0 to its absolute limits.',
        awards: 'FWA OF THE DAY · AWWWARDS SITE OF THE MONTH',
        tags: ['WebGL 2.0', 'Procedural Mesh', 'GPU Fluid Solver', 'Spatial Audio'],
        accent: '#00f2fe',
        hue: 0.52,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: 0
    },
    {
        id: 'dreamwave',
        num: '02',
        title: 'Dreamwave',
        tagline: 'Massive Real-Time Spatial Event Platform',
        category: 'PLATFORMS',
        client: 'Dreamwave Labs',
        year: '2025',
        subtitle: 'Next-generation virtual world engine supporting 100k+ concurrent connected users.',
        description: 'Engineered as a distributed virtual events engine for concerts and immersive product reveals. Featuring custom binary geometry streaming, high-density avatars with instanced GPU skinning, and spatial audio with dynamic Doppler effects, all rendered smoothly at 60 FPS on desktop and mobile.',
        awards: 'WEBBY AWARDS WINNER · BEST TECHNICAL EXECUTION',
        tags: ['Hydra Engine', 'Binary WebSocket', 'Volumetric Avatars', 'Spatial 3D'],
        accent: '#ff0055',
        hue: 0.95,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: 0.02
    },
    {
        id: 'mamba-forever',
        num: '03',
        title: 'Mamba Forever',
        tagline: 'Interactive Particle Memorial Sculpture',
        category: 'EXPERIENTIAL',
        client: 'Nike & Kobe Bryant Foundation',
        year: '2024',
        subtitle: 'Quarter-million interactive light motes reacting to user tribute messages in real-time.',
        description: 'A global digital memorial sculpted from 250,000 GPGPU particles following divergence-free curl noise fields. Each visitor can submit tribute thoughts that manifest as floating ribbons of golden light, coalescing into the iconic silhouette with physically based gold-leaf shader response.',
        awards: 'CANNES LIONS GOLD · FWA OF THE MONTH · D&AD YELLOW PENCIL',
        tags: ['GPGPU Particles', 'Curl Noise', 'Physically Based Shaders', 'Web Audio'],
        accent: '#ffb700',
        hue: 0.12,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: -0.02
    },
    {
        id: 'cyberpunk-city',
        num: '04',
        title: 'Night City Holo',
        tagline: 'Holographic Volumetric 3D Map & UI',
        category: 'INTERACTIVE',
        client: 'CD PROJEKT RED',
        year: '2024',
        subtitle: 'Futuristic multi-layer architectural scanning with screen-space reflections.',
        description: 'An interactive 3D tactical map of Night City rendered in real-time browser WebGL. Visitors navigate districts across multi-altitude flight corridors with volumetric laser scans, real-time depth of field, tactile cyberpunk audio UI, and zero asset loading wait time.',
        awards: 'AWWWARDS SITE OF THE YEAR NOMINEE · FWA OF THE DAY',
        tags: ['Volumetric Light', 'Screen-Space Reflections', 'Multi-Layer HUD', 'Audio Synthesis'],
        accent: '#00ff9d',
        hue: 0.44,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: 0.03
    },
    {
        id: 'medusa-engine',
        num: '05',
        title: 'Medusa Engine',
        tagline: 'Proprietary Zero-Allocation WebGL Framework',
        category: 'R&D',
        client: 'Active Theory Labs',
        year: '2025',
        subtitle: 'High-performance rendering foundation engineered for rock-solid 120 FPS motion.',
        description: 'Our in-house graphics framework built from first principles for creative web production. Featuring garbage-collection-free render loops, ping-pong float framebuffers, instanced draw calls, and unified post-processing pipeline for seamless multi-platform performance.',
        awards: 'OPEN SOURCE LAB EXPERIMENT · TECH EXCELLENCE',
        tags: ['Zero Allocation', 'FBO Physics', 'GLSL 3.0', '120 FPS Pipeline'],
        accent: '#9d4edd',
        hue: 0.77,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: -0.01
    },
    {
        id: 'fluid-surface',
        num: '06',
        title: 'Houdini Fluid Lab',
        tagline: 'Navier-Stokes Real-Time Surface Tension Solver',
        category: 'R&D',
        client: 'R&D Explorations',
        year: '2026',
        subtitle: 'GPU-accelerated Eulerian liquid simulation with dynamic chromatic dispersion.',
        description: 'A study in interactive fluid dynamics running directly in WebGL 2 float textures. Pointer motion injects momentum and dye vorticity, with multi-pass Jacobi pressure solvers calculating buoyant surface waves that distort background media with true chromatic dispersion.',
        awards: 'SIGGRAPH REAL-TIME LIVE SHOWCASE',
        tags: ['Navier-Stokes', 'Jacobi Solvers', 'Advection', 'Dispersion Shader'],
        accent: '#3a86ff',
        hue: 0.60,
        camera: [0, 0, 7.2],
        target: [0, 0, 0],
        roll: 0
    }
];

// Alias for backwards compatibility with any systems expecting SECTIONS
export const SECTIONS = PROJECTS.map((p, i) => ({
    id: p.id,
    code: `[ ${p.num} // ${p.category} ]`,
    title: p.title,
    body: p.subtitle,
    camera: p.camera,
    target: p.target,
    roll: p.roll,
    shape: i % 4,
    hue: p.hue,
    blob: { scale: 0.8, amp: 0.2, iridescence: 0.5, energy: 0.9 },
    project: p
}));

// Defaults for the live parameter panel (press G)
export const PARAMS = {
    // Momentum & Ribbon Physics
    friction: 0.92,
    wheelSpeed: 0.0016,
    dragSpeed: 0.0034,
    magneticSnap: 1,
    snapStrength: 5.5,
    cardRadius: 13.5,
    cardSpacing: 3.5,
    cardTilt: 1.3,
    cardElevate: 0.8,
    
    // Liquid & Shaders
    liquidDistortion: 1.4,
    chromaticAberration: 0.035,
    cardRippleSpeed: 3.2,
    
    // Lens & Post-processing
    bloomStrength: 0.5,
    bloomThreshold: 1.1,
    bloomRadius: 1.0,
    exposure: 0.95,
    grain: 0.045,
    vignette: 0.85,
    
    // Environment & Camera
    dustIntensity: 0.75,
    cameraSway: 0.8,
    fov: 42,

    // Pointer fluid simulation (drives post-process distortion)
    simRes: 128,
    dyeRes: 512,
    splatRadius: 0.25,
    splatForce: 3000,
    curl: 20,
    pressureIterations: 20,
    pressureDecay: 0.8,
    velocityDissipation: 0.6,
    dyeDissipation: 1.2
};

export const SCHEMA = {
    RibbonPhysics: {
        friction: [0.8, 0.98, 0.005],
        dragSpeed: [0.001, 0.01, 0.0005],
        wheelSpeed: [0.0005, 0.005, 0.0001],
        snapStrength: [1, 15, 0.5],
        cardTilt: [0, 3, 0.05],
        cardElevate: [0, 2, 0.05]
    },
    LiquidShaders: {
        liquidDistortion: [0, 3, 0.05],
        chromaticAberration: [0, 0.1, 0.002],
        cardRippleSpeed: [1, 10, 0.1]
    },
    PostProcessing: {
        bloomStrength: [0, 2, 0.02],
        bloomThreshold: [0.5, 2.5, 0.05],
        exposure: [0.5, 2, 0.02],
        grain: [0, 0.2, 0.002],
        vignette: [0, 1, 0.02]
    },
    Atmosphere: {
        dustIntensity: [0, 2, 0.02],
        cameraSway: [0, 2, 0.02],
        fov: [30, 65, 0.5]
    }
};
