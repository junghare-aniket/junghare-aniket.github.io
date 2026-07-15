// Rotating "data-network" globe background (Three.js) - sits behind page content, above particles
// Abstract geo-intelligence look: dark wireframe sphere + glowing city nodes + pulsing connection arcs

(function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container || typeof THREE === 'undefined') return;

    const ACCENT_COLOR = 0x4ec9b0;
    const GLOBE_RADIUS = 3;
    const MAX_ARCS = 18;
    const ARC_SPAWN_INTERVAL = 300; // ms
    const NODE_IDLE_OPACITY = 0.2;
    const NODE_ACTIVE_OPACITY = 0.95;

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
        [52.5200, 13.4050],   // Berlin
        [28.6139, 77.2090],   // Delhi
        [31.2304, 121.4737],  // Shanghai
        [22.3193, 114.1694],  // Hong Kong
        [37.5665, 126.9780],  // Seoul
        [-6.2088, 106.8456],  // Jakarta
        [13.7563, 100.5018],  // Bangkok
        [19.4326, -99.1332],  // Mexico City
        [-34.6037, -58.3816], // Buenos Aires
        [6.5244, 3.3792],     // Lagos
        [-1.2921, 36.8219],   // Nairobi
        [41.0082, 28.9784],   // Istanbul
        [48.8566, 2.3522],    // Paris
        [40.4168, -3.7038],   // Madrid
        [41.9028, 12.4964],   // Rome
        [34.0522, -118.2437]  // Los Angeles
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

    // Solid dark core with a faint world-map overlay so nodes/arcs read clearly against it
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const coreGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 48, 48);
    const coreMaterial = new THREE.MeshBasicMaterial({
        map: textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
        color: new THREE.Color(0x6d8ea3) // brighter tint so the landmass map reads clearly under the grid
    });
    globeGroup.add(new THREE.Mesh(coreGeometry, coreMaterial));

    // Teal latitude/longitude grid - built from clean rings (not a triangulated sphere wireframe)
    // so there are no diagonal lines, just horizontal latitude circles and vertical longitude circles
    const gridMaterial = new THREE.LineBasicMaterial({
        color: ACCENT_COLOR,
        transparent: true,
        opacity: 0.12
    });
    const gridRadius = GLOBE_RADIUS * 1.002;

    // Latitude rings (horizontal), skipping the poles
    for (let lat = -80; lat <= 80; lat += 20) {
        const latRad = lat * Math.PI / 180;
        const ringRadius = gridRadius * Math.cos(latRad);
        const y = gridRadius * Math.sin(latRad);
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const theta = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(ringRadius * Math.cos(theta), y, ringRadius * Math.sin(theta)));
        }
        const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), gridMaterial);
        globeGroup.add(ring);
    }

    // Longitude lines (vertical, pole-to-pole great circles)
    for (let lon = 0; lon < 360; lon += 30) {
        const lonRad = lon * Math.PI / 180;
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const phi = (i / 64) * Math.PI - Math.PI / 2;
            points.push(new THREE.Vector3(
                gridRadius * Math.cos(phi) * Math.cos(lonRad),
                gridRadius * Math.sin(phi),
                gridRadius * Math.cos(phi) * Math.sin(lonRad)
            ));
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial);
        globeGroup.add(line);
    }

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

    // City nodes - dim/small by default, only lighting up while an arc is connected to them
    const nodePositions = NODE_COORDS.map(([lat, lon]) => latLonToVector3(lat, lon, GLOBE_RADIUS * 1.01));
    const nodeActiveCount = new Array(nodePositions.length).fill(0);
    const nodeMeshes = nodePositions.map((pos, i) => {
        const nodeGeometry = new THREE.SphereGeometry(0.022, 8, 8);
        const nodeMaterial = new THREE.MeshBasicMaterial({
            color: ACCENT_COLOR,
            transparent: true,
            opacity: NODE_IDLE_OPACITY
        });
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
            color: ACCENT_COLOR, // same accent hue for every arc - only brightness varies
            transparent: true,
            opacity: 0
        });
        const line = new THREE.Line(geometry, material);
        globeGroup.add(line);

        nodeActiveCount[i]++;
        nodeActiveCount[j]++;

        activeArcs.push({
            line,
            material,
            nodeA: i,
            nodeB: j,
            peakOpacity: 0.4 + Math.random() * 0.5, // random brightness per arc, same color
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
                nodeActiveCount[arc.nodeA]--;
                nodeActiveCount[arc.nodeB]--;
                activeArcs.splice(i, 1);
                continue;
            }
            arc.material.opacity = Math.sin(Math.PI * t) * arc.peakOpacity;
        }
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // Drag-to-rotate: click/touch and drag spins the globe manually; releasing
    // lets it drift to a stop and then ease back into the slow auto-rotation.
    const AUTO_ROTATE_SPEED = 0.0018;
    const DRAG_SENSITIVITY = 0.005;
    const VELOCITY_DAMPING = 0.94;
    const MAX_TILT = Math.PI / 2 - 0.05;

    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let velocityX = 0;
    let dragEndTime = 0;

    function pointerDown(x, y) {
        isDragging = true;
        lastPointerX = x;
        lastPointerY = y;
        velocityX = 0;
        document.body.classList.add('dragging-globe');
    }

    function pointerMove(x, y) {
        if (!isDragging) return;
        const deltaX = x - lastPointerX;
        const deltaY = y - lastPointerY;

        globeGroup.rotation.y += deltaX * DRAG_SENSITIVITY;
        globeGroup.rotation.x = Math.max(
            -MAX_TILT,
            Math.min(MAX_TILT, globeGroup.rotation.x + deltaY * DRAG_SENSITIVITY)
        );

        velocityX = deltaX * DRAG_SENSITIVITY;
        lastPointerX = x;
        lastPointerY = y;
    }

    function pointerUp() {
        if (!isDragging) return;
        isDragging = false;
        dragEndTime = performance.now();
        document.body.classList.remove('dragging-globe');
    }

    // Listen on window (not the globe canvas) since the visible globe sits
    // behind the page content in stacking order - the content's boxes would
    // otherwise swallow every mousedown before it reaches the canvas.
    // Real links/buttons are excluded so clicks and navigation still work.
    const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select';

    window.addEventListener('mousedown', (e) => {
        if (e.target.closest(INTERACTIVE_SELECTOR)) return;
        e.preventDefault(); // avoid dragging also selecting page text
        pointerDown(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', pointerUp);

    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();

        if (isDragging) {
            // rotation already applied directly in pointerMove
        } else if (Math.abs(velocityX) > 0.00005) {
            globeGroup.rotation.y += velocityX;
            velocityX *= VELOCITY_DAMPING;
        } else if (now - dragEndTime > 600) {
            globeGroup.rotation.y += AUTO_ROTATE_SPEED;
        }

        updateArcs(now); // updates nodeActiveCount before nodes read it below

        nodeMeshes.forEach((node, i) => {
            const isActive = nodeActiveCount[i] > 0;
            const targetOpacity = isActive ? NODE_ACTIVE_OPACITY : NODE_IDLE_OPACITY;
            node.material.opacity += (targetOpacity - node.material.opacity) * 0.08;

            const scale = isActive
                ? 1 + 0.35 * Math.sin(now * 0.0025 + node.userData.pulseOffset)
                : 1;
            node.scale.setScalar(scale);
        });
        renderer.render(scene, camera);
    }
    animate();
})();
