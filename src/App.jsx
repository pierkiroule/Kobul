import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export default function App() {
  const sceneContainerRef = useRef(null);
  const interiorContainerRef = useRef(null);
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMediaUrl, setActiveMediaUrl] = useState('');
  const [audioUrlInput, setAudioUrlInput] = useState(
    'https://cdn.pixabay.com/audio/2022/03/23/audio_5392c27504.mp3',
  );
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [localAudioObjectUrl, setLocalAudioObjectUrl] = useState('');
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [isAudioOpen, setIsAudioOpen] = useState(true);
  const [isSelectionOpen, setIsSelectionOpen] = useState(true);
  const [isListOpen, setIsListOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTouchOnUi, setIsTouchOnUi] = useState(false);
  const [isPilotageHover, setIsPilotageHover] = useState(false);
  const [showEnterHint, setShowEnterHint] = useState(false);
  const [isReadyToEnter, setIsReadyToEnter] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [sceneHeight, setSceneHeight] = useState(0);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [enterAnchor, setEnterAnchor] = useState({
    x: 0,
    y: 0,
    visible: false,
    clamped: false,
    direction: 'center',
  });

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const smoothedLevelRef = useRef(0);
  const sourceRef = useRef(null);
  const lastBurstRef = useRef(0);
  const fileInputRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const menuOpenRef = useRef(false);
  const modalOpenRef = useRef(false);
  const atomsRef = useRef([]);
  const bubbleMaterialsRef = useRef([]);
  const haloRef = useRef(null);
  const cameraRef = useRef(null);
  const focusTargetRef = useRef(null);
  const selectedMeshRef = useRef(null);
  const lastTapRef = useRef({ time: 0, id: null });
  const isReadyToEnterRef = useRef(false);

  const interiorSceneRef = useRef(null);
  const interiorRendererRef = useRef(null);
  const interiorCameraRef = useRef(null);
  const interiorControlsRef = useRef(null);

  const palette = [0x00d4ff, 0xff4fd4, 0x7cf7ff, 0xffd170, 0x7bffbf];
  const skyboxSets = [
    [
      'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg',
    ],
    [
      'https://threejs.org/examples/textures/cube/Park2/posx.jpg',
      'https://threejs.org/examples/textures/cube/Park2/negx.jpg',
      'https://threejs.org/examples/textures/cube/Park2/posy.jpg',
      'https://threejs.org/examples/textures/cube/Park2/negy.jpg',
      'https://threejs.org/examples/textures/cube/Park2/posz.jpg',
      'https://threejs.org/examples/textures/cube/Park2/negz.jpg',
    ],
    [
      'https://threejs.org/examples/textures/cube/MilkyWay/posx.jpg',
      'https://threejs.org/examples/textures/cube/MilkyWay/negx.jpg',
      'https://threejs.org/examples/textures/cube/MilkyWay/posy.jpg',
      'https://threejs.org/examples/textures/cube/MilkyWay/negy.jpg',
      'https://threejs.org/examples/textures/cube/MilkyWay/posz.jpg',
      'https://threejs.org/examples/textures/cube/MilkyWay/negz.jpg',
    ],
  ];

  const defaultCameraPosition = React.useMemo(() => ({ x: 0, y: 5, z: 20 }), []);
  const defaultTarget = React.useMemo(() => ({ x: 0, y: 0, z: 0 }), []);

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
        skybox: skyboxSets[index % skyboxSets.length],
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
      skybox: bubbleMeta.skybox,
    });
    setIsReadyToEnter(true);
    isReadyToEnterRef.current = true;

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
      16 / 9,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const updateRendererSize = () => {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width;
      const height = rect.height || 1;
      setSceneSize({ width, height });
      setSceneHeight(height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    sceneContainerRef.current.appendChild(renderer.domElement);
    updateRendererSize();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

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
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.65;
    controls.panSpeed = 0.6;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onScenePointer = (event) => {
      if (menuOpenRef.current || modalOpenRef.current) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      const isTouchPointer = event.pointerType === 'touch' || Boolean(event.touches);
      const touch = event.touches ? event.touches[0] : event;
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atoms);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (isTouchPointer) {
          focusBubbleOnMesh(mesh);
          lastTapRef.current = { time: 0, id: null };
        } else {
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
      }
    };

    renderer.domElement.addEventListener('pointerdown', onScenePointer, { passive: false });
    const resizeObserver = new ResizeObserver(updateRendererSize);
    resizeObserver.observe(sceneContainerRef.current);
    window.addEventListener('resize', updateRendererSize);

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
      renderer.domElement.removeEventListener('pointerdown', onScenePointer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRendererSize);
      if (frameId) cancelAnimationFrame(frameId);
      controls.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      geometry.dispose();
      bubbleMaterials.forEach((mat) => mat.dispose());
      lineGeom.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      if (sceneContainerRef.current?.contains(renderer.domElement)) {
        sceneContainerRef.current.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
    };
  }, [bubbles]);

  useEffect(() => {
    menuOpenRef.current = isMenuOpen;
    modalOpenRef.current = isModalOpen;
    setIsTouchOnUi(isMenuOpen || isModalOpen || isPilotageHover);
  }, [isMenuOpen, isModalOpen, isPilotageHover]);

  useEffect(() => {
    isReadyToEnterRef.current = isReadyToEnter;
  }, [isReadyToEnter]);

  useEffect(() => {
    let frameId;

    const updateAnchor = () => {
      if (selectedMeshRef.current && cameraRef.current) {
        const vector = selectedMeshRef.current.position.clone();
        vector.project(cameraRef.current);

        const width = sceneSize.width || rendererRef.current?.domElement.clientWidth || 1;
        const height = sceneSize.height || rendererRef.current?.domElement.clientHeight || 1;

        if (width === 0 || height === 0) {
          frameId = requestAnimationFrame(updateAnchor);
          return;
        }

        const rawX = (vector.x * 0.5 + 0.5) * width;
        const rawY = (-vector.y * 0.5 + 0.5) * height;
        const visible = vector.z > -1 && vector.z < 1;

        const padding = 16;
        const clampedX = Math.min(Math.max(rawX, padding), width - padding);
        const clampedY = Math.min(Math.max(rawY, padding), height - padding);
        const clamped = clampedX !== rawX || clampedY !== rawY;

        const directionParts = [];
        if (rawY < padding) directionParts.push('up');
        if (rawY > height - padding) directionParts.push('down');
        if (rawX < padding) directionParts.push('left');
        if (rawX > width - padding) directionParts.push('right');

        const direction = directionParts.length ? directionParts.join('-') : 'center';

        setEnterAnchor((prev) => {
          if (!visible && !prev.visible) return prev;
          if (!visible) return { ...prev, visible: false, clamped: false, direction: 'center' };

          if (
            Math.abs(prev.x - clampedX) > 1 ||
            Math.abs(prev.y - clampedY) > 1 ||
            prev.visible !== visible ||
            prev.clamped !== clamped ||
            prev.direction !== direction
          ) {
            return { x: clampedX, y: clampedY, visible, clamped, direction };
          }

          return prev;
        });
      } else {
        setEnterAnchor((prev) => (prev.visible ? { ...prev, visible: false, clamped: false } : prev));
      }

      frameId = requestAnimationFrame(updateAnchor);
    };

    frameId = requestAnimationFrame(updateAnchor);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [sceneSize.width, sceneSize.height, selectedBubble, isReadyToEnter, sceneHeight]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const container = interiorContainerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, container.clientWidth / container.clientHeight || 1, 0.1, 100);
    camera.position.set(0, 0, 0.01);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.rotateSpeed = 0.45;

    const glow = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(glow);

    interiorSceneRef.current = scene;
    interiorCameraRef.current = camera;
    interiorRendererRef.current = renderer;
    interiorControlsRef.current = controls;

    const handleResize = () => {
      const { clientWidth: w = 1, clientHeight: h = 1 } = interiorContainerRef.current || {};
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    let frameId;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!selectedBubble || !interiorSceneRef.current) return;

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load(selectedBubble.skybox);
    texture.colorSpace = THREE.SRGBColorSpace;
    interiorSceneRef.current.background = texture;
  }, [selectedBubble]);

  const handleEnterTap = () => {
    if (!selectedBubble) {
      setShowEnterHint(true);
      return;
    }
    setShowEnterHint(false);
    openModalForSelection();
  };

  const openModalForSelection = () => {
    if (!selectedBubble) return;
    setActiveMediaUrl(selectedBubble.playlist?.[0]?.url || '');
    setIsModalOpen(true);
    setIsReadyToEnter(true);
    isReadyToEnterRef.current = true;
  };

  const recenterView = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    focusTargetRef.current = null;
    selectedMeshRef.current = null;
    setSelectedBubble(null);
    setIsReadyToEnter(false);
    isReadyToEnterRef.current = false;
    setShowEnterHint(false);

    gsap.to(cameraRef.current.position, {
      ...defaultCameraPosition,
      duration: 1.1,
      ease: 'power2.inOut',
    });
    gsap.to(controlsRef.current.target, {
      ...defaultTarget,
      duration: 1.1,
      ease: 'power2.inOut',
    });
  };

  const openBubbleListPanel = () => {
    setIsMenuOpen(true);
    setIsListOpen(true);
    setShowEnterHint(false);
  };

  const renderMedia = (url) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.match(/\.(mp4|webm)$/)) {
      return <video src={url} controls className="media-frame" />;
    }
    if (lower.match(/\.(mp3|wav|ogg)$/)) {
      return (
        <audio controls className="media-audio">
          <source src={url} />
        </audio>
      );
    }
    if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      return <img src={url} alt="contenu lié" className="media-image" />;
    }
    return (
      <a href={url} className="media-link" target="_blank" rel="noreferrer">
        ouvrir {url}
      </a>
    );
  };

  const handlePilotagePointerDown = (event) => {
    event.stopPropagation();
    setIsPilotageHover(true);
  };

  const handlePilotagePointerEnd = (event) => {
    event.stopPropagation();
    setIsPilotageHover(false);
  };

  return (
    <div className="layout">
      <div className="scene" aria-label="Constellation EchoBulle">
        <div
          ref={sceneContainerRef}
          className={`experience ${isTouchOnUi ? 'ui-focus' : 'scene-focus'}`}
        />

        {selectedBubble && isReadyToEnter && !isModalOpen && enterAnchor.visible && (
          <div
            className={`enter-cta ${enterAnchor.clamped ? 'clamped' : ''}`}
            data-direction={enterAnchor.direction}
            style={{ left: `${enterAnchor.x}px`, top: `${enterAnchor.y}px` }}
          >
            <button type="button" className="enter-button" onClick={openModalForSelection}>
              <span className="enter-label">entrer</span>
              {enterAnchor.clamped && (
                <>
                  <span className="enter-indicator" aria-hidden="true">
                    ➜
                  </span>
                  <span className="sr-only">La bulle est en bord de cadre, suivre la flèche.</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div
        className="pilotage"
        onPointerDownCapture={handlePilotagePointerDown}
        onPointerUpCapture={handlePilotagePointerEnd}
        onPointerCancel={handlePilotagePointerEnd}
        onPointerEnter={() => setIsPilotageHover(true)}
        onPointerLeave={() => setIsPilotageHover(false)}
      >
        <div className="pilotage-head">
          <div>
            <p className="hud-kicker">Pilotage</p>
            <p className="pilotage-title">Guidage doux sans toucher la scène</p>
          </div>
          <button
            type="button"
            className={`burger-button ${isMenuOpen ? 'open' : ''}`}
            aria-label="Déplier le pilotage"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="burger-lines">
              <span />
            </span>
            <span className="burger-label">{isMenuOpen ? 'fermer' : 'ouvrir'}</span>
          </button>
        </div>

        <div className={`hud-panel ${isMenuOpen ? 'visible' : ''}`}>
          <div className="pilotage-grid">
            <div className="hud-block touch-grid">
              <div className="hud-block-head">
                <div>
                  <p className="hud-kicker">Raccourcis tactiles</p>
                  <p className="hud-title">Grille simple à large toucher</p>
                  <p className="hud-sub">2 à 3 colonnes fluides selon la largeur et toujours lisibles.</p>
                </div>
                <button
                  type="button"
                  className="hud-toggle"
                  aria-pressed={showEnterHint}
                  onClick={() => setShowEnterHint((open) => !open)}
                >
                  {showEnterHint ? 'masquer le rappel' : 'aide « entrer »'}
                </button>
              </div>

              {showEnterHint && (
                <div className="touch-hint" role="status">
                  <p className="hud-sub">
                    Touchez une bulle, puis le bouton « entrer » pour ouvrir son monde. Le rappel reste visible en
                    paysage comme en portrait.
                  </p>
                </div>
              )}

              <div className="touch-grid-buttons" aria-label="Grille d'actions tactiles">
                <button
                  type="button"
                  className="touch-button touch-button-primary"
                  onClick={handleEnterTap}
                  disabled={!selectedBubble}
                >
                  <span className="touch-label">entrer</span>
                  <span className="touch-helpline">
                    {selectedBubble ? 'ouvrir la bulle choisie' : 'sélectionnez d’abord une bulle'}
                  </span>
                </button>

                <button type="button" className="touch-button" onClick={recenterView}>
                  <span className="touch-label">recentrer</span>
                  <span className="touch-helpline">retour à une vue lisible en un tap</span>
                </button>

                <button type="button" className="touch-button" onClick={openBubbleListPanel}>
                  <span className="touch-label">liste des bulles</span>
                  <span className="touch-helpline">afficher les 25 bulles en grille calme</span>
                </button>
              </div>
            </div>

            <div className="hud-block collapsible">
              <div className="hud-block-head">
                <div>
                  <p className="hud-kicker">Constellation vivante</p>
                  <p className="hud-title">25 bulles reliées par des fils lumineux</p>
                </div>
                <button
                  type="button"
                  className="hud-toggle"
                  onClick={() => setIsIntroOpen((open) => !open)}
                  aria-expanded={isIntroOpen}
                >
                  {isIntroOpen ? 'replier' : 'déplier'}
                </button>
              </div>
              {isIntroOpen && (
                <p className="hud-sub">
                  Sélectionnez une bulle pour vous en approcher et ouvrir son contenu transmédia.
                </p>
              )}
            </div>

            <div className="hud-block collapsible">
              <div className="hud-block-head">
                <div>
                  <p className="hud-kicker">Accès direct</p>
                  <p className="hud-sub">Liste complète des bulles à ouvrir en un tap.</p>
                </div>
                <button
                  type="button"
                  className="hud-toggle"
                  onClick={() => setIsListOpen((open) => !open)}
                  aria-expanded={isListOpen}
                >
                  {isListOpen ? 'replier' : 'déplier'}
                </button>
              </div>
              {isListOpen && (
                <div className="bubble-list">
                  {bubbles.map((bubble, index) => (
                    <button
                      key={bubble.id}
                      type="button"
                      className="bubble-list-item"
                      onClick={() => focusBubbleById(bubble.id, { openModal: true })}
                    >
                      <span className="bubble-chip">{index + 1}</span>
                      <div className="bubble-meta">
                        <span className="bubble-name">{bubble.title}</span>
                        <span className="bubble-mini">ouvrir le transmédia</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hud-block hud-audio collapsible">
              <div className="hud-block-head">
                <div>
                  <p className="hud-kicker">Faire danser le réseau</p>
                  <p className="hud-sub">
                    Collez une URL mp3 ou importez un fichier audio pour guider la danse audioreactive. Doux et subtil.
                  </p>
                </div>
                <div className="hud-head-actions">
                  <div className={`audio-status ${isAudioActive ? 'on' : ''}`} aria-live="polite">
                    <span className="pulse-dot" />
                    <span>{isAudioActive ? 'le réseau respire avec le son' : 'en attente de son'}</span>
                  </div>
                  <button
                    type="button"
                    className="hud-toggle"
                    onClick={() => setIsAudioOpen((open) => !open)}
                    aria-expanded={isAudioOpen}
                  >
                    {isAudioOpen ? 'replier' : 'déplier'}
                  </button>
                </div>
              </div>

              {isAudioOpen && (
                <>
                  <form className="audio-form" onSubmit={handleAudioSubmit}>
                    <input
                      value={audioUrlInput}
                      onChange={(e) => setAudioUrlInput(e.target.value)}
                      placeholder="https://.../votre-son.mp3"
                      className="audio-input"
                      aria-label="URL audio mp3"
                    />
                    <div className="audio-actions">
                      <button type="button" className="hud-button hud-button-ghost" onClick={handleFilePick}>
                        importer un mp3
                      </button>
                      <button type="submit" className="hud-button hud-button-small">
                        lancer l'audio
                      </button>
                    </div>
                  </form>
                  {audioError && <p className="audio-error">{audioError}</p>}
                  <audio
                    ref={audioRef}
                    src={currentAudioUrl}
                    controls
                    className="audio-player"
                    preload="auto"
                    crossOrigin="anonymous"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/*"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>

            {selectedBubble && (
              <div className="hud-selection collapsible">
                <div className="hud-block-head">
                  <div>
                    <p className="hud-label">Bulle sélectionnée</p>
                    <p className="hud-name">{selectedBubble.title}</p>
                  </div>
                  <button
                    type="button"
                    className="hud-toggle"
                    onClick={() => setIsSelectionOpen((open) => !open)}
                    aria-expanded={isSelectionOpen}
                  >
                    {isSelectionOpen ? 'replier' : 'déplier'}
                  </button>
                </div>

                {isSelectionOpen && (
                  <button type="button" className="hud-button" onClick={openModalForSelection}>
                    afficher son contenu transmédia
                  </button>
                )}
              </div>
            )}

            {selectedBubble && isSelectionOpen && currentPlaylist.length > 0 && (
              <div className="hud-carousel">
                <div className="carousel-head">
                  <p className="hud-label">Playlist transmédia</p>
                  <div className="carousel-controls">
                    <button
                      type="button"
                      className="carousel-nav"
                      onClick={() =>
                        setCarouselIndex((prev) =>
                          (prev - 1 + currentPlaylist.length) % currentPlaylist.length,
                        )
                      }
                      aria-label="Précédent"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="carousel-nav"
                      onClick={() => setCarouselIndex((prev) => (prev + 1) % currentPlaylist.length)}
                      aria-label="Suivant"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="carousel-window" ref={carouselRef}>
                  {currentPlaylist.map((item, index) => (
                    <button
                      key={item.url}
                      type="button"
                      data-index={index}
                      className={`carousel-card ${carouselIndex === index ? 'active' : ''}`}
                      onClick={() => {
                        setCarouselIndex(index);
                        setActiveMediaUrl(item.url);
                        setIsModalOpen(true);
                      }}
                    >
                      <span className="bubble-mini">#{index + 1}</span>
                      <span className="carousel-title">{item.label}</span>
                      <span className="bubble-mini">voir / écouter</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedBubble && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Bulle</p>
                <p className="modal-title">{selectedBubble.title}</p>
              </div>
              <button type="button" className="close" onClick={() => setIsModalOpen(false)}>
                fermer
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-immersive">
                <p className="hud-label">Paysage interne</p>
                <div className="interior-shell">
                  <div ref={interiorContainerRef} className="interior-view" />
                  <p className="immersive-hint">Glisser ou bouger l'appareil pour contempler en 360°.</p>
                </div>
              </div>

              <div className="modal-player">{renderMedia(activeMediaUrl)}</div>
              <div className="modal-playlist" aria-label="Playlist de liens">
                {currentPlaylist.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    className={`playlist-item ${activeMediaUrl === item.url ? 'active' : ''}`}
                    onClick={() => setActiveMediaUrl(item.url)}
                  >
                    <span className="dot" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
