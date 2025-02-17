// First, let's make sure we have access to all needed Matter.js modules
const { 
    Engine, 
    Render, 
    World, 
    Bodies, 
    Runner, 
    Body, 
    Mouse, 
    MouseConstraint, 
    Composite
} = Matter;

// Create engine
const engine = Engine.create({
    gravity: { x: 0, y: 0.5 } // Default is 1
});
const world = engine.world;

const musicalSymbols = ['♩', '♪', '♫', '♬', '𝄞', '♭', '♯'];

// Create renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
    }
});

// Set up canvas
render.canvas.style.position = 'fixed';
render.canvas.style.top = '0';
render.canvas.style.left = '0';
render.canvas.style.zIndex = '1000';

// Create runner
const runner = Runner.create();

// Create mouse and mouse constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
World.add(world, mouseConstraint);
render.mouse = mouse;

// Create ground and walls
const ground = Bodies.rectangle(
    window.innerWidth / 2,
    window.innerHeight + 5,
    window.innerWidth,
    10,
    {
        isStatic: true,
        render: { visible: false }
    }
);

const leftWall = Bodies.rectangle(
    -50,
    window.innerHeight / 2,
    100,
    window.innerHeight,
    {
        isStatic: true,
        render: { visible: false }
    }
);

const rightWall = Bodies.rectangle(
    window.innerWidth + 50,
    window.innerHeight / 2,
    100,
    window.innerHeight,
    {
        isStatic: true,
        render: { visible: false }
    }
);

World.add(world, [ground, leftWall, rightWall]);

// Start engine and renderer
Render.run(render);
Runner.run(runner, engine);

// Keep track of logos
let fallingLogos = [];

// ------------------- UPDATED SOUND LOGIC ------------------- //

// Toggle for enabling sound
let soundEnabled = false;

let lastNoteTime = 0; // Initialize to track last played note time
const collisionCooldown = 80; // Cooldown in milliseconds


// Use Web Audio API for better performance
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const blackKeySamples = [
    "Sounds/Note_Cis.mp3",
    "Sounds/Note_Dis.mp3",
    "Sounds/Note_Fis.mp3",
    "Sounds/Note_Gis.mp3",
    "Sounds/Note_Ais.mp3"
];

let audioBuffers = {}; // Store preloaded sounds

async function preloadAudio(samplePath) {
    if (audioBuffers[samplePath]) return; // Already loaded

    console.log(`📥 Preloading: ${samplePath}`);

    try {
        const response = await fetch(samplePath);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers[samplePath] = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`✅ Preloaded: ${samplePath}`);
    } catch (error) {
        console.error(`❌ Failed to preload ${samplePath}:`, error);
    }
}

// Preload both normal and "O" samples
blackKeySamples.forEach(sample => {
    preloadAudio(sample);
    preloadAudio(sample.replace(".mp3", "O.mp3"));
});
// Play sound with optional pitch shifting
function playSound(samplePath, octaveUp = false) {
    if (!audioBuffers[samplePath]) {
        console.warn(`⚠️ Audio buffer not found for ${samplePath}`);
        return null;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[samplePath];

    const gainNode = audioContext.createGain();

    // 🔥 Adjust volume levels:
    if (samplePath.includes("O.mp3")) {
        gainNode.gain.value = 1.0; // Normal volume for "O" samples
    } else {
        gainNode.gain.value = 0.4; // Lower volume for non-"O" samples
    }

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (octaveUp) source.playbackRate.value = 2.0; // One octave up for "O" samples only
    source.start();

    console.log(`🎵 Playing ${samplePath} ${octaveUp ? "one octave up" : ""} at volume ${gainNode.gain.value}`);

    return source;
}



let nonOSamplePlaying = false; // Tracks if a non-"O" sample is playing
let nextNonOSamplePending = false; // Ensures the next trigger plays a non-"O" sample

Matter.Events.on(engine, "collisionStart", async (event) => {
    if (!soundEnabled) return;

    const now = performance.now();
    if (now - lastNoteTime < collisionCooldown) return; // Rate limit
    lastNoteTime = now;

    for (let pair of event.pairs) {
        const { bodyA, bodyB } = pair;

        if (bodyA === ground || bodyB === ground) {
            let samplePath;
            let isOSample = false;
            let octaveUp = false;

            // If the last non-"O" sample finished, force the next sample to be non-"O"
            if (nextNonOSamplePending) {
                do {
                    samplePath = blackKeySamples[Math.floor(Math.random() * blackKeySamples.length)];
                } while (samplePath.includes("O.mp3")); // Ensure we pick a non-"O" sample
                nextNonOSamplePending = false; // Reset the flag after picking a non-"O" sample
            } else {
                // Normal random selection (80% chance for "O" sample)
                const randomIndex = Math.floor(Math.random() * blackKeySamples.length);
                samplePath = blackKeySamples[randomIndex];

                if (Math.random() < 0.8) {
                    samplePath = samplePath.replace(".mp3", "O.mp3");
                    isOSample = true;
                    octaveUp = Math.random() < 0.2; // Only "O" samples can octave shift
                }
            }

            console.log(`🎲 Selected sample: ${samplePath}`);
            console.log(`⬆️ Octave Shift: ${octaveUp ? "Yes" : "No"}`);

            const audio = playSound(samplePath, octaveUp);

            if (!isOSample && audio) { 
                nonOSamplePlaying = true;
                nextNonOSamplePending = false; // Reset flag since a non-"O" sample is playing

                audio.onended = () => { 
                    setTimeout(() => {
                        nonOSamplePlaying = false;
                        nextNonOSamplePending = true; // Ensure next collision picks a non-"O" sample
                        console.log(`✅ ${samplePath} finished, next non-"O" sample will play.`);
                    }, 50); 
                };
            }

            break; // Stop after first valid ground collision
        }
    }
});




// ------------------------------------------------------------ //


// Initialize when document is loaded
window.onload = function() {
    let homeLogo = document.getElementById("home-logo");
    
    if (homeLogo) {
        // Prevent default link behavior
        homeLogo.parentElement.addEventListener("click", function(event) {
            event.preventDefault();
        });

        // Double click to create logos + music notes + vibration
        homeLogo.addEventListener("dblclick", function(event) {
            event.preventDefault();
            startMusicNoteAnimation();
            triggerVibration();
            startFallingLogos();
        });

        // Random vibration effect
        setInterval(() => {
            if (Math.random() < 0.2) {
                triggerVibration();
            }
        }, 5000);
    }

    setupShockwaveButton();
    setupSoundSwitch(); // Make sure your HTML has <input id="soundSwitch">
};

function triggerVibration() {
    let homeLogo = document.getElementById("home-logo");
    if (!homeLogo) return;
    homeLogo.classList.add("vibrating");
    setTimeout(() => {
        homeLogo.classList.remove("vibrating");
    }, 500);
}

function startFallingLogos() {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const logoSize = 50;
            const tinyLogo = Bodies.rectangle(
                Math.random() * (window.innerWidth - logoSize),
                -100,
                logoSize,
                logoSize,
                {
                    restitution: 0.7,
                    friction: 0.1,
                    density: 0.001,
                    frictionAir: 0.001,
                    chamfer: { radius: 5 },
                    render: {
                        sprite: {
                            texture: "images/BPLogo_transparant.png",
                            xScale: 0.5,
                            yScale: 0.5
                        }
                    }
                }
            );

            // Random initial velocity and spin
            Body.setVelocity(tinyLogo, {
                x: (Math.random() - 0.5) * 3,
                y: Math.random() * 2
            });
            Body.setAngularVelocity(tinyLogo, (Math.random() - 0.5) * 0.2);

            World.add(world, tinyLogo);
            fallingLogos.push(tinyLogo);

            // Remove after 20 seconds
            setTimeout(() => {
                if (world.bodies.includes(tinyLogo)) {
                    World.remove(world, tinyLogo);
                    fallingLogos = fallingLogos.filter(l => l !== tinyLogo);
                }
            }, 20000);
        }, i * 100);
    }
}

function startMusicNoteAnimation() {
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const note = document.createElement("div");
            note.classList.add("music-note");
            
            // Random symbol
            note.innerHTML = musicalSymbols[Math.floor(Math.random() * musicalSymbols.length)];
            
            // Random horizontal position
            note.style.left = Math.random() * 100 + "vw";
            
            // Random size between 20px and 32px
            note.style.fontSize = (Math.random() * 12 + 20) + "px";
            
            // Random animation duration
            const duration = (Math.random() * 3 + 2);
            note.style.animationDuration = duration + "s";
            
            // Random rotation
            const startRotation = Math.random() * 360;
            const direction = Math.random() < 0.5 ? -1 : 1;
            note.style.animationDirection = direction > 0 ? 'normal' : 'reverse';
            note.style.transform = `rotate(${startRotation}deg)`;
            
            document.body.appendChild(note);
            setTimeout(() => note.remove(), duration * 1000);
        }, i * 50);
    }
}

// Handle window resize
window.addEventListener('resize', function() {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    
    Body.setPosition(ground, {
        x: window.innerWidth / 2,
        y: window.innerHeight + 5
    });
    Body.setPosition(rightWall, {
        x: window.innerWidth + 50,
        y: window.innerHeight / 2
    });
    
    render.bounds.max.x = window.innerWidth;
    render.bounds.max.y = window.innerHeight;
});

function toggleMute() {
    let video = document.getElementById("myVideo");
    if (video) {
        console.log("🎬 Video clicked!");
        if (video.muted) {
            video.muted = false;
            video.volume = 1.0;
            video.play();
            console.log("🔊 Unmuted and playing!");
        } else {
            video.muted = true;
            console.log("🔇 Muted again.");
        }
    } else {
        console.error("❌ Video element not found!");
    }
}

// ------------------ SHOCKWAVE BUTTON ------------------ //
function setupShockwaveButton() {
    const shockwaveBtn = document.getElementById("shockwaveBtn");
    if (!shockwaveBtn) return; 
    shockwaveBtn.addEventListener("click", () => {
        createShockwave();
    });
}

function createShockwave() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const forceMultiplier = 0.2; 

    fallingLogos.forEach(logo => {
        const dx = logo.position.x - centerX;
        const dy = logo.position.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        Body.applyForce(
            logo,
            logo.position,
            { x: nx * forceMultiplier, y: ny * forceMultiplier }
        );
        setTimeout(() => {
            if (world.bodies.includes(logo)) {
                World.remove(world, logo);
                fallingLogos = fallingLogos.filter(l => l !== logo);
            }
        }, 2000);
    });
}

// 🎛 **Sound Toggle Switch**
function setupSoundSwitch() {
    const soundSwitch = document.getElementById("soundSwitch");

    if (!soundSwitch) {
        console.warn("⚠️ No soundSwitch element found!");
        return;
    }

    soundSwitch.addEventListener("click", () => {
        soundEnabled = !soundEnabled; // Toggle state
        soundSwitch.classList.toggle("on", soundEnabled); // Apply styling
        console.log(`🔊 Sound ${soundEnabled ? "ENABLED" : "DISABLED"}`);

        // Unlock AudioContext if it's suspended
        if (audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log("🎵 AudioContext resumed");
            });
        }
    });
}

