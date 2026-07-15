// Rotating 3D Earth background (Three.js) - sits behind page content, above particles

(function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container || typeof THREE === 'undefined') return;

    const ACCENT_COLOR = 0x4ec9b0;
    const GLOBE_RADIUS = 3;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Lighting - kept moody/dim so the emissive city lights and teal grid stand out
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Earth sphere - dark "geo-intelligence" theme: dark-tinted continents + glowing teal city lights
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const earthGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
        color: new THREE.Color(0x24343f), // darkens/tints the base map toward the theme's dark-teal palette
        specularMap: textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
        specular: new THREE.Color(0x111111),
        shininess: 4,
        emissiveMap: textureLoader.load('https://threejs.org/examples/textures/planets/earth_lights_2048.png'),
        emissive: new THREE.Color(ACCENT_COLOR),
        emissiveIntensity: 1.4
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Subtle teal atmosphere glow matching site accent color
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: ACCENT_COLOR,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Thin wireframe shell for a "geo-intelligence" grid look
    const wireGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 24, 24);
    const wireMaterial = new THREE.MeshBasicMaterial({
        color: ACCENT_COLOR,
        wireframe: true,
        transparent: true,
        opacity: 0.14
    });
    const wireSphere = new THREE.Mesh(wireGeometry, wireMaterial);
    scene.add(wireSphere);

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    function animate() {
        requestAnimationFrame(animate);
        earth.rotation.y += 0.0018;
        wireSphere.rotation.y += 0.0018;
        renderer.render(scene, camera);
    }
    animate();
})();
