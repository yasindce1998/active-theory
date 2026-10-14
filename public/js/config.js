// Content and look for each scroll section. The camera flies along a spline
// through `camera` points, and the visuals blend between neighbouring sections.
// `roll` banks the camera (radians); `code` is the HUD designation.
export const SECTIONS = [
    {
        id: 'home',
        code: 'SEQ-01 // ORIGIN',
        title: 'Signal<br>from the deep',
        body: 'A real-time world, rendered in your browser at the edge of the known.',
        camera: [0, 0.4, 7.5],
        target: [0, 0, 0],
        roll: 0,
        shape: 0,
        hue: 0.56,
        blob: { scale: 1, amp: 0.16, iridescence: 0.35, energy: 0.8 }
    },
    {
        id: 'work',
        code: 'SEQ-02 // DRIFT',
        title: 'Matter<br>in motion',
        body: 'Quarter of a million particles riding a divergence-free flow field.',
        camera: [5.2, 1.2, 4.2],
        target: [0, 0.3, 0],
        roll: -0.12,
        shape: 1,
        hue: 0.03,
        blob: { scale: 0.5, amp: 0.34, iridescence: 0.6, energy: 1 }
    },
    {
        id: 'lab',
        code: 'SEQ-03 // SURVEY',
        title: 'Mapping<br>the surface',
        body: 'Light shafts, anamorphic flares and a graded HDR pipeline, tuned live.',
        camera: [-3.2, 4.6, 5.6],
        target: [0, -0.8, 0],
        roll: 0.08,
        shape: 2,
        hue: 0.5,
        blob: { scale: 0.7, amp: 0.1, iridescence: 0.2, energy: 0.5 }
    },
    {
        id: 'contact',
        code: 'SEQ-04 // CONTACT',
        title: 'Open<br>a channel',
        body: 'hello@example.com',
        camera: [0, 0.2, 9],
        target: [0, 0.1, 0],
        roll: 0,
        shape: 3,
        hue: 0.6,
        blob: { scale: 1.2, amp: 0.22, iridescence: 0.4, energy: 1.2 }
    }
];

// Defaults for the live parameter panel (press G)
export const PARAMS = {
    bloomStrength: 0.6,
    bloomThreshold: 1.3,
    bloomRadius: 1.1,
    streakStrength: 0.45,
    raysStrength: 0.4,
    lensDirt: 0.3,
    aberration: 0.025,
    barrel: 0.12,
    distortion: 1,
    dyeAmount: 0.12,
    grain: 0.06,
    vignette: 0.9,
    exposure: 0.85,
    scanlines: 0.035,
    grade: 1,
    letterbox: 1,
    fov: 38,
    dofAperture: 0.18,
    shake: 1,
    warpOnTransition: 1,
    starIntensity: 1,
    gridIntensity: 0.6,
    ringIntensity: 1,
    curlStrength: 0.6,
    attraction: 1.4,
    pointerForce: 2.5,
    particleBrightness: 0.06,
    splatForce: 6000,
    splatRadius: 0.25,
    curl: 25,
    velocityDissipation: 0.4,
    dyeDissipation: 1.2,
    pressureIterations: 20,
    pressureDecay: 0.8,
    simRes: 128,
    dyeRes: 512,
    blobFreq: 1.4,
    cameraSway: 1
};

export const SCHEMA = {
    Lens: {
        bloomStrength: [0, 3, 0.01],
        bloomThreshold: [0, 3, 0.01],
        bloomRadius: [0.5, 3, 0.01],
        streakStrength: [0, 3, 0.01],
        raysStrength: [0, 3, 0.01],
        lensDirt: [0, 3, 0.01],
        aberration: [0, 0.1, 0.001],
        barrel: [0, 0.5, 0.005]
    },
    Film: {
        exposure: [0.2, 3, 0.01],
        grade: [0, 1, 0.01],
        grain: [0, 0.3, 0.001],
        vignette: [0, 1, 0.01],
        scanlines: [0, 0.2, 0.001],
        letterbox: [0, 1, 0.01]
    },
    Camera: {
        fov: [20, 75, 0.5],
        dofAperture: [0, 0.6, 0.005],
        shake: [0, 3, 0.01],
        cameraSway: [0, 3, 0.01],
        warpOnTransition: [0, 2, 0.01]
    },
    World: {
        starIntensity: [0, 3, 0.01],
        gridIntensity: [0, 3, 0.01],
        ringIntensity: [0, 3, 0.01],
        blobFreq: [0.2, 4, 0.01]
    },
    Particles: {
        curlStrength: [0, 3, 0.01],
        attraction: [0, 5, 0.01],
        pointerForce: [0, 10, 0.01],
        particleBrightness: [0, 1, 0.005]
    },
    Fluid: {
        distortion: [0, 5, 0.01],
        dyeAmount: [0, 2, 0.01],
        splatForce: [0, 20000, 10],
        splatRadius: [0.01, 1, 0.01],
        curl: [0, 60, 0.5],
        velocityDissipation: [0, 4, 0.01],
        dyeDissipation: [0, 4, 0.01],
        pressureIterations: [1, 50, 1]
    }
};
