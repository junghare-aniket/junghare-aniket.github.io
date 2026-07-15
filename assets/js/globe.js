// Rotating "data-network" globe background (Three.js) - sits behind page content, above particles
// Abstract geo-intelligence look: dark wireframe sphere + glowing city nodes + pulsing connection arcs

(function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container || typeof THREE === 'undefined') return;

    const ACCENT_COLOR = 0x4ec9b0;
    const GLOBE_RADIUS = 3;
    const MAX_ARCS = 6;
    const ARC_SPAWN_INTERVAL = 900; // ms

    // Roughly-global spread of "city" nodes, as [lat, lon]
    const NODE_COORDS = [
        [40.7128, -74.0060],  // New York
        [51.5074, -0.1278],   // London
        [19.0760, 72.8777],   // Mumbai
        [35.6762, 139.6503],  // Tokyo
        [-33.8688, 151.2093], // Sydney
        [-23.5505, -46.6333], // Sao Paulo
        [30.0444, 31.2357],   // Cairo
        [55.7558, 37.6173],   // Moscow
        [39.9042, 116.4074],  // Beijing
        [37.7749, -122.4194], // San Francisco
        [1.3521, 103.8198],   // Singapore
        [-33.9249, 18.4241],  // Cape Town
        [43.6532, -79.3832],  // Toronto
        [25.2048, 55.2708],   // Dubai
        [52.5200, 13.4050]    // Berlin
    ];

    function latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Everything below rotates together as one unit
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Solid dark core so nodes/arcs read clearly against it (no lighting needed - unlit material)
    const coreGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 48, 48);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0f14 });
    globeGroup.add(new THREE.Mesh(coreGeometry, coreMaterial));

    // Teal wireframe grid - the primary "surface" look
    const wireGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 24, 24);
    const wireMaterial = new THREE.MeshBasicMaterial({
        color: ACCENT_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    globeGroup.add(new THREE.Mesh(wireGeometry, wireMaterial));

    // Subtle outer atmosphere glow matching the site's accent color
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 48, 48);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: ACCENT_COLOR,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    globeGroup.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

    // Glowing city nodes
    const nodePositions = NODE_COORDS.map(([lat, lon]) => latLonToVector3(lat, lon, GLOBE_RADIUS * 1.01));
    const nodeMeshes = nodePositions.map((pos, i) => {
        const nodeGeometry = new THREE.SphereGeometry(0.045, 8, 8);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: ACCENT_COLOR });
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.copy(pos);
        node.userData.pulseOffset = i * 0.7;
        globeGroup.add(node);
        return node;
    });

    // Pulsing arcs animated between random node pairs
    const activeArcs = [];

    function spawnArc() {
        if (activeArcs.length >= MAX_ARCS || nodePositions.length < 2) return;

        let i = Math.floor(Math.random() * nodePositions.length);
        let j = Math.floor(Math.random() * nodePositions.length);
        if (i === j) return;

        const p1 = nodePositions[i];
        const p2 = nodePositions[j];
        const angle = p1.angleTo(p2);
        const bulge = GLOBE_RADIUS * (0.3 + (angle / Math.PI) * 0.6);

        const mid = p1.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + bulge);
        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const points = curve.getPoints(48);

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: ACCENT_COLOR,
            transparent: true,
            opacity: 0
        });
        const line = new THREE.Line(geometry, material);
        globeGroup.add(line);

        activeArcs.push({
            line,
            material,
            startTime: performance.now(),
            lifetime: 3200 + Math.random() * 1600
        });
    }
    setInterval(spawnArc, ARC_SPAWN_INTERVAL);

    function updateArcs(now) {
        for (let i = activeArcs.length - 1; i >= 0; i--) {
            const arc = activeArcs[i];
            const t = (now - arc.startTime) / arc.lifetime;
            if (t >= 1) {
                globeGroup.remove(arc.line);
                arc.line.geometry.dispose();
                arc.material.dispose();
                activeArcs.splice(i, 1);
                continue;
            }
            arc.material.opacity = Math.sin(Math.PI * t) * 0.85;
        }
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();

        globeGroup.rotation.y += 0.0018;

        nodeMeshes.forEach(node => {
            const scale = 1 + 0.35 * Math.sin(now * 0.0025 + node.userData.pulseOffset);
            node.scale.setScalar(scale);
        });

        updateArcs(now);
        renderer.render(scene, camera);
    }
    animate();
})();
