import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export default function App() {
  const sceneContainerRef = useRef(null);
  const networkCanvasRef = useRef(null);
  const interiorContainerRef = useRef(null);
  const [selectedBubble, setSelectedBubble] = useState(null);

  const atomsRef = useRef([]);
  const bubbleMaterialsRef = useRef([]);
  const haloRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const focusTargetRef = useRef(null);
  const selectedMeshRef = useRef(null);
  const lastTapRef = useRef({ time: 0, id: null });
  const lastBurstRef = useRef(0);

  const interiorSceneRef = useRef(null);
  const interiorRendererRef = useRef(null);
  const interiorCameraRef = useRef(null);
  const interiorObjectsRef = useRef({ textMesh: null, particles: null, videoMesh: null, videoEl: null });

  const palette = [0x00d4ff, 0xff4fd4, 0x7cf7ff, 0xffd170, 0x7bffbf];

  const basePlaylist = [
    { label: 'Chant de glace (audio)', url: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav' },
    { label: 'Fleur abyssale (image)', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80' },
    { label: 'Brouillard secret (vidéo)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { label: 'Chemin luminescent (page)', url: 'https://example.org' },
  ];

  const bubbles = useMemo(() => {
    const count = 25;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, index) => {
      const theta = goldenAngle * index;
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const spread = 14.5 + (index % 5) * 0.3;
      const position = new THREE.Vector3(
        Math.cos(theta) * radius * spread,
        y * spread * 0.6,
        Math.sin(theta) * radius * spread,
      );

      return {
        id: `bulle-${index + 1}`,
        title: `Bulle constellation ${index + 1}`,
        color: palette[index % palette.length],
        position,
        playlist: basePlaylist.map((item, itemIndex) => ({
          ...item,
          url: `${item.url}${item.url.includes('?') ? '&' : '?'}v=${index + itemIndex}`,
        })),
      };
    });
  }, []);

  const focusBubbleOnMesh = (mesh) => {
    if (!mesh || !cameraRef.current || !controlsRef.current) return;

    const bubbleMeta = mesh.userData.meta;
    selectedMeshRef.current = mesh;
    focusTargetRef.current = mesh.position.clone();

    setSelectedBubble({
      id: bubbleMeta.id,
      title: bubbleMeta.title,
      playlist: bubbleMeta.playlist,
      color: bubbleMeta.color,
    });

    gsap.to(cameraRef.current.position, {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z + 10,
      duration: 1.2,
      ease: 'power2.inOut',
    });
    gsap.to(controlsRef.current.target, {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
      duration: 1.2,
    });
  };

  const focusBubbleById = (bubbleId) => {
    const mesh = atomsRef.current.find((atom) => atom.userData.meta.id === bubbleId);
    if (mesh) {
      focusBubbleOnMesh(mesh);
    }
  };

  useEffect(() => {
    if (!sceneContainerRef.current) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02020a);

    const camera = new THREE.PerspectiveCamera(
      75,
      sceneContainerRef.current.clientWidth / sceneContainerRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(sceneContainerRef.current.clientWidth, sceneContainerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    networkCanvasRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    const starVertices = [];
    for (let i = 0; i < 5000; i += 1) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000),
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    const geometry = new THREE.SphereGeometry(1.35, 32, 32);
    const atoms = [];
    const bubbleMaterials = [];
    const bursts = [];

    const spawnBurst = (center) => {
      const count = Math.floor(8 + Math.random() * 12);
      const burstGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i += 1) {
        const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.6 - 0.8, Math.random() * 2 - 1)
          .normalize()
          .multiplyScalar(0.12 + Math.random() * 0.18);
        velocities.push(dir);

        positions[i * 3] = center.x + dir.x * 4;
        positions[i * 3 + 1] = center.y + dir.y * 4;
        positions[i * 3 + 2] = center.z + dir.z * 4;
      }

      burstGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const burstMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });

      const points = new THREE.Points(burstGeometry, burstMaterial);
      particleGroup.add(points);
      bursts.push({ points, burstGeometry, burstMaterial, velocities, bornAt: clock.getElapsedTime() });
    };

    const createBubbleMaterial = (color) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.15,
        metalness: 0.05,
        transmission: 0.8,
        thickness: 0.8,
        ior: 1.33,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        iridescence: 0.25,
        iridescenceIOR: 1.3,
        emissive: color,
        emissiveIntensity: 0.12,
      });

    const createAtom = (bubbleData) => {
      const material = createBubbleMaterial(bubbleData.color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(bubbleData.position);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.floatSpeed = 0.22 + Math.random() * 0.32;
      mesh.userData.floatRadius = 0.38 + Math.random() * 0.35;
      mesh.userData.pulseOffset = Math.random() * Math.PI * 2;
      mesh.userData.drift = new THREE.Vector3(Math.random() * 1.5 - 0.75, Math.random() * 1.2 - 0.6, Math.random() * 1.5 - 0.75);
      mesh.userData.noiseOffset = Math.random() * 100;
      mesh.userData.meta = bubbleData;
      scene.add(mesh);
      atoms.push(mesh);
      bubbleMaterials.push(material);

      const pointLight = new THREE.PointLight(bubbleData.color, 1.2, 7);
      mesh.add(pointLight);
    };

    bubbles.forEach((bubble) => createAtom(bubble));
    atomsRef.current = atoms;
    bubbleMaterialsRef.current = bubbleMaterials;

    const haloGeometry = new THREE.SphereGeometry(1.55, 48, 48);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.visible = false;
    scene.add(halo);
    haloRef.current = halo;

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    const positionsArray = [];

    bubbles.forEach((source, idx) => {
      const neighbors = [...bubbles]
        .filter((candidate) => candidate.id !== source.id)
        .map((candidate) => ({ candidate, distance: source.position.distanceTo(candidate.position) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      neighbors.forEach(({ candidate }) => {
        positionsArray.push(
          source.position.x,
          source.position.y,
          source.position.z,
          candidate.position.x,
          candidate.position.y,
          candidate.position.z,
        );
      });
    });

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));
    const links = new THREE.LineSegments(lineGeom, lineMaterial);
    links.frustumCulled = false;
    scene.add(links);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onTouch = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }

      const touch = event.touches ? event.touches[0] : event;
      const bounds = renderer.domElement.getBoundingClientRect();
      mouse.x = ((touch.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((touch.clientY - bounds.top) / bounds.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atoms);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const now = performance.now();
        const isSameTarget = lastTapRef.current.id === mesh.uuid;
        const delta = now - lastTapRef.current.time;

        if (isSameTarget && delta < 380) {
          focusBubbleOnMesh(mesh);
          lastTapRef.current = { time: 0, id: null };
        } else {
          lastTapRef.current = { time: now, id: mesh.uuid };
        }
      }
    };

    const handleResize = () => {
      const width = sceneContainerRef.current.clientWidth;
      const height = sceneContainerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    renderer.domElement.addEventListener('touchstart', onTouch, { passive: false });
    renderer.domElement.addEventListener('mousedown', onTouch);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      atoms.forEach((atom, index) => {
        const speed = atom.userData.floatSpeed;
        const radius = atom.userData.floatRadius;
        const base = atom.userData.basePosition;
        const offset = atom.userData.pulseOffset;
        const drift = atom.userData.drift;
        const noise = atom.userData.noiseOffset;

        atom.position.x = base.x + Math.sin(elapsed * speed + index) * radius + Math.sin(elapsed * 0.7 + noise) * drift.x * 0.25;
        atom.position.y = base.y + Math.sin(elapsed * speed * 0.85 + offset) * radius + Math.cos(elapsed * 0.6 + noise) * drift.y * 0.25;
        atom.position.z = base.z + Math.cos(elapsed * speed + offset) * radius * 0.6 + Math.sin(elapsed * 0.5 + noise * 0.5) * drift.z * 0.25;

        const scalePulse = 1 + Math.sin(elapsed * 0.9 + offset) * 0.04;
        atom.scale.setScalar(scalePulse);
        atom.rotation.y += 0.0015;

        if (bubbleMaterials[index]) {
          bubbleMaterials[index].emissiveIntensity = 0.12 + Math.abs(Math.sin(elapsed * 0.6)) * 0.25;
        }

        if (selectedMeshRef.current && atom.uuid === selectedMeshRef.current.uuid) {
          bubbleMaterials[index].emissiveIntensity = 0.38 + Math.abs(Math.sin(elapsed * 0.8)) * 0.35;
        }
      });

      lineMaterial.opacity = 0.2 + Math.sin(elapsed * 0.6) * 0.08;

      if (haloRef.current && selectedMeshRef.current) {
        const halo = haloRef.current;
        halo.visible = true;
        halo.position.copy(selectedMeshRef.current.position);
        const haloPulse = 1.35 + Math.sin(elapsed * 1.8) * 0.08;
        halo.scale.setScalar(haloPulse);
        halo.material.opacity = 0.12 + Math.abs(Math.sin(elapsed * 0.7)) * 0.3;
        halo.material.color.setHex(selectedMeshRef.current.userData.meta.color);
      } else if (haloRef.current) {
        haloRef.current.visible = false;
      }

      if (elapsed - lastBurstRef.current > 0.8 && atoms.length) {
        const target = atoms[Math.floor(Math.random() * atoms.length)].position;
        spawnBurst(target);
        lastBurstRef.current = elapsed;
      }

      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const burst = bursts[i];
        const age = elapsed - burst.bornAt;
        const life = 1.8;
        const decay = Math.max(1 - age / life, 0);
        const positions = burst.burstGeometry.attributes.position.array;

        for (let j = 0; j < burst.velocities.length; j += 1) {
          const v = burst.velocities[j];
          positions[j * 3] += v.x * 0.6;
          positions[j * 3 + 1] += v.y * 0.6;
          positions[j * 3 + 2] += v.z * 0.6;
        }

        burst.burstGeometry.attributes.position.needsUpdate = true;
        burst.burstMaterial.opacity = 0.7 * decay;

        if (decay <= 0.02) {
          particleGroup.remove(burst.points);
          burst.burstGeometry.dispose();
          burst.burstMaterial.dispose();
          bursts.splice(i, 1);
        }
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
    handleResize();

    return () => {
      renderer.domElement.removeEventListener('touchstart', onTouch);
      renderer.domElement.removeEventListener('mousedown', onTouch);
      window.removeEventListener('resize', handleResize);
      starGeometry.dispose();
      starMaterial.dispose();
      geometry.dispose();
      bubbleMaterials.forEach((mat) => mat.dispose());
      lineGeom.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, [bubbles]);

  useEffect(() => {
    if (!interiorContainerRef.current) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      interiorContainerRef.current.clientWidth / interiorContainerRef.current.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.2, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(interiorContainerRef.current.clientWidth, interiorContainerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    interiorContainerRef.current.appendChild(renderer.domElement);

    const cubeLoader = new THREE.CubeTextureLoader();
    scene.background = cubeLoader.load([
      'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg',
    ]);

    const interiorAmbient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(interiorAmbient);
    const interiorPoint = new THREE.PointLight(0xffffff, 1.2, 12);
    interiorPoint.position.set(2.5, 2.5, 3.5);
    scene.add(interiorPoint);

    const particlesGeom = new THREE.BufferGeometry();
    const particleCount = 500;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = THREE.MathUtils.randFloatSpread(8);
      particlePositions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(4);
      particlePositions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(8);
    }
    particlesGeom.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0x7cf7ff,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const particles = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particles);

    const createTextMesh = (text, color = '#ffffff') => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new THREE.PlaneGeometry(2.8, 1.4);
      return new THREE.Mesh(geometry, material);
    };

    const textMesh = createTextMesh('Choisissez une bulle');
    textMesh.position.set(0, 1.4, 0);
    scene.add(textMesh);

    const video = document.createElement('video');
    video.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    const videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.6), videoMaterial);
    videoPlane.position.set(0, 0.1, -1.6);
    scene.add(videoPlane);

    interiorSceneRef.current = scene;
    interiorCameraRef.current = camera;
    interiorRendererRef.current = renderer;
    interiorObjectsRef.current = {
      textMesh,
      particles,
      videoMesh: videoPlane,
      videoEl: video,
    };

    const handleResize = () => {
      if (!interiorContainerRef.current) return;
      const { clientWidth: w, clientHeight: h } = interiorContainerRef.current;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      particles.rotation.y = elapsed * 0.08;
      textMesh.position.y = 1.4 + Math.sin(elapsed * 1.3) * 0.12;
      videoPlane.position.y = 0.1 + Math.sin(elapsed * 0.9) * 0.08;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      particlesGeom.dispose();
      particlesMat.dispose();
      videoTexture.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!selectedBubble || !interiorSceneRef.current || !interiorObjectsRef.current) return;

    const { textMesh, particles, videoMesh, videoEl } = interiorObjectsRef.current;

    if (textMesh) {
      textMesh.material.map.dispose();
      textMesh.material.dispose();
      textMesh.geometry.dispose();
      interiorSceneRef.current.remove(textMesh);
      const updated = (() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e8f7ff';
        ctx.font = 'bold 46px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(selectedBubble.title, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(3, 1.3);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 1.4, 0);
        return mesh;
      })();
      interiorSceneRef.current.add(updated);
      interiorObjectsRef.current.textMesh = updated;
    }

    if (particles) {
      particles.material.color = new THREE.Color(selectedBubble.color);
    }

    if (videoMesh && videoEl) {
      const videoItem = selectedBubble.playlist.find((item) => item.url.endsWith('.mp4'));
      videoEl.src = videoItem ? videoItem.url : 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      videoEl.play().catch(() => {});
      videoMesh.material.opacity = 0.92;
    }
  }, [selectedBubble]);

  return (
    <div className="experience">
      <div className="scene-area" ref={sceneContainerRef}>
        <div className="scene-label">
          <p className="hud-kicker">Réseau vivant</p>
          <p className="hud-title">Tapotez deux fois une bulle pour plonger dedans.</p>
        </div>
        <div ref={networkCanvasRef} className="scene-canvas" />
        {selectedBubble && (
          <div className="scene-selection">
            <span className="bubble-chip">{selectedBubble.id}</span>
            <span className="bubble-name">{selectedBubble.title}</span>
          </div>
        )}
      </div>
      <div className="interior-area">
        <div className="interior-head">
          <p className="hud-label">Intérieur de la bulle</p>
          <p className="hud-sub">
            Skybox, particules lentes, texte flottant et plan vidéo apparaissent dès qu'une bulle est sélectionnée.
          </p>
        </div>
        <div className="interior-view" ref={interiorContainerRef} />
        <div className="interior-actions">
          <button type="button" className="hud-button" onClick={() => focusBubbleById('bulle-1')}>
            revenir à la première bulle
          </button>
          <button type="button" className="hud-button hud-button-ghost" onClick={() => setSelectedBubble(null)}>
            vider la sélection
          </button>
        </div>
      </div>
    </div>
  );
}
