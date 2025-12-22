import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export default function App() {
  const mountRef = useRef(null);
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
  const [isReadyToEnter, setIsReadyToEnter] = useState(false);
  const [enterButtonPos, setEnterButtonPos] = useState({ x: 0, y: 0, visible: false });
  const [carouselIndex, setCarouselIndex] = useState(0);

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
  const carouselRef = useRef(null);
  const isReadyToEnterRef = useRef(false);

  const palette = [
    0x00d4ff,
    0xff4fd4,
    0x7cf7ff,
    0xffd170,
    0x7bffbf,
  ];

  const basePlaylist = [
    { label: 'Chant de glace (audio)', url: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav' },
    { label: 'Fleur abyssale (image)', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80' },
    { label: 'Brouillard secret (vidéo)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { label: 'Chemin luminescent (page)', url: 'https://example.org' },
  ];

  const bubbles = React.useMemo(() => {
    const count = 25;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, index) => {
      const theta = goldenAngle * index;
      const y = 1 - (index / (count - 1)) * 2; // from 1 to -1
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

  const ensureAudioNodes = async () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (!audioContextRef.current) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = context;
    }

    if (!analyserRef.current && audioContextRef.current) {
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }

    if (!sourceRef.current && audioContextRef.current && analyserRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audioEl);
      sourceRef.current = source;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    await audioContextRef.current.resume();
  };

  const focusBubbleOnMesh = (mesh, { openModal = false, mediaUrl } = {}) => {
    if (!mesh || !cameraRef.current || !controlsRef.current) return;

    const bubbleMeta = mesh.userData.meta;
    selectedMeshRef.current = mesh;
    focusTargetRef.current = mesh.position.clone();
    setIsReadyToEnter(false);

    setSelectedBubble({
      id: bubbleMeta.id,
      title: bubbleMeta.title,
      playlist: bubbleMeta.playlist,
      color: bubbleMeta.color,
    });
    setIsSelectionOpen(true);

    const resolvedMedia = mediaUrl || (openModal ? bubbleMeta.playlist[0]?.url || '' : '');
    setActiveMediaUrl(resolvedMedia);
    setIsModalOpen(openModal);

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

  const focusBubbleById = (bubbleId, options = {}) => {
    const mesh = atomsRef.current.find((atom) => atom.userData.meta.id === bubbleId);
    if (mesh) {
      focusBubbleOnMesh(mesh, options);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return undefined;

    // Base scene and camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02020a);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Soft lighting for calm visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    // Star field for depth
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

    // Atom cluster
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
        const dir = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 1.6 - 0.8,
          Math.random() * 2 - 1,
        )
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
      mesh.userData.drift = new THREE.Vector3(
        Math.random() * 1.5 - 0.75,
        Math.random() * 1.2 - 0.6,
        Math.random() * 1.5 - 0.75,
      );
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

    // Luminous links between nearest neighbors
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    const positionsArray = [];

    bubbles.forEach((source, idx) => {
      const neighbors = [...bubbles]
        .filter((candidate) => candidate.id !== source.id)
        .map((candidate) => ({
          candidate,
          distance: source.position.distanceTo(candidate.position),
        }))
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

    // Camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onTouch = (event) => {
      if (menuOpenRef.current || modalOpenRef.current) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      const touch = event.touches ? event.touches[0] : event;
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    renderer.domElement.addEventListener('touchstart', onTouch, { passive: false });
    renderer.domElement.addEventListener('mousedown', onTouch);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      let currentLevel = smoothedLevelRef.current;
      let audioDelta = 0;

      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i += 1) {
          const centered = dataArrayRef.current[i] - 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        const normalized = Math.min(rms / 64, 1);
        audioDelta = normalized - currentLevel;
        currentLevel = THREE.MathUtils.lerp(currentLevel, normalized, 0.08);
        smoothedLevelRef.current = currentLevel;
      }

      atoms.forEach((atom, index) => {
        const speed = atom.userData.floatSpeed;
        const radius = atom.userData.floatRadius;
        const base = atom.userData.basePosition;
        const offset = atom.userData.pulseOffset;
        const drift = atom.userData.drift;
        const noise = atom.userData.noiseOffset;

        const sway = currentLevel * 0.25;

        atom.position.x =
          base.x + Math.sin(elapsed * speed + index) * radius + Math.sin(elapsed * 0.7 + noise) * drift.x * sway;
        atom.position.y =
          base.y + Math.sin(elapsed * speed * 0.85 + offset) * radius + Math.cos(elapsed * 0.6 + noise) * drift.y * sway;
        atom.position.z =
          base.z + Math.cos(elapsed * speed + offset) * radius * 0.6 + Math.sin(elapsed * 0.5 + noise * 0.5) * drift.z * sway;

        const scalePulse = 1 + Math.sin(elapsed * 0.9 + offset) * 0.04 + currentLevel * 0.05;
        atom.scale.setScalar(scalePulse);
        atom.rotation.y += 0.0015 + currentLevel * 0.001;

        if (bubbleMaterials[index]) {
          bubbleMaterials[index].emissiveIntensity = 0.12 + currentLevel * 0.35;
        }

        if (selectedMeshRef.current && atom.uuid === selectedMeshRef.current.uuid) {
          bubbleMaterials[index].emissiveIntensity = 0.38 + currentLevel * 0.6;
        }
      });

      lineMaterial.opacity = 0.2 + Math.sin(elapsed * 0.6) * 0.08 + currentLevel * 0.25;

      if (haloRef.current && selectedMeshRef.current) {
        const halo = haloRef.current;
        halo.visible = true;
        halo.position.copy(selectedMeshRef.current.position);
        const haloPulse = 1.35 + Math.sin(elapsed * 1.8) * 0.08 + currentLevel * 0.35;
        halo.scale.setScalar(haloPulse);
        halo.material.opacity = 0.12 + currentLevel * 0.3;
        halo.material.color.setHex(selectedMeshRef.current.userData.meta.color);
      } else if (haloRef.current) {
        haloRef.current.visible = false;
      }

      if (audioDelta > 0.07 && currentLevel > 0.05 && elapsed - lastBurstRef.current > 0.4 && atoms.length) {
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

      if (focusTargetRef.current && cameraRef.current) {
        const cameraDistance = cameraRef.current.position.distanceTo(focusTargetRef.current);
        const targetDistance = controls.target.distanceTo(focusTargetRef.current);
        const isAligned = cameraDistance < 0.6 && targetDistance < 0.2;
        if (isAligned !== isReadyToEnterRef.current) {
          isReadyToEnterRef.current = isAligned;
          setIsReadyToEnter(isAligned);
        }
      } else if (isReadyToEnterRef.current) {
        isReadyToEnterRef.current = false;
        setIsReadyToEnter(false);
      }

      if (selectedMeshRef.current && cameraRef.current && rendererRef.current) {
        const projected = selectedMeshRef.current.position.clone().project(cameraRef.current);
        const canvas = rendererRef.current.domElement;
        const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;
        const shouldShow =
          isReadyToEnterRef.current && !modalOpenRef.current && !menuOpenRef.current;

        setEnterButtonPos((prev) => {
          if (
            Math.abs(prev.x - x) > 0.5 ||
            Math.abs(prev.y - y) > 0.5 ||
            prev.visible !== shouldShow
          ) {
            return { x, y, visible: shouldShow };
          }
          return prev;
        });
      } else {
        setEnterButtonPos((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }

      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('touchstart', onTouch);
      renderer.domElement.removeEventListener('mousedown', onTouch);
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      controls.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      geometry.dispose();
      lineGeom.dispose();
      lineMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      bubbleMaterials.forEach((material) => material.dispose());
      bursts.forEach((burst) => {
        particleGroup.remove(burst.points);
        burst.burstGeometry.dispose();
        burst.burstMaterial.dispose();
      });
      scene.remove(particleGroup, links, stars, ambientLight, mainLight, halo, ...atoms);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    menuOpenRef.current = isMenuOpen;
    modalOpenRef.current = isModalOpen;
    setIsTouchOnUi(isMenuOpen || isModalOpen);
  }, [isMenuOpen, isModalOpen]);

  useEffect(() => {
    isReadyToEnterRef.current = isReadyToEnter;
  }, [isReadyToEnter]);

  useEffect(() => {
    const prefersUi = isTouchOnUi;
    if (controlsRef.current) {
      controlsRef.current.enabled = !prefersUi;
    }

    const canvas = rendererRef.current?.domElement;
    if (canvas) {
      canvas.style.pointerEvents = prefersUi ? 'none' : 'auto';
      canvas.style.touchAction = prefersUi ? 'auto' : 'none';
    }
  }, [isTouchOnUi]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return undefined;

    const handlePlay = async () => {
      await ensureAudioNodes();
      setIsAudioActive(true);
    };

    const handlePause = () => setIsAudioActive(false);
    const handleEnded = () => setIsAudioActive(false);
    const handleError = () => {
      setIsAudioActive(false);
      setAudioError("Impossible de lire ce flux audio. Vérifiez l'URL, le fichier ou réessayez.");
    };

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleError);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (!currentAudioUrl) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const startAudio = async () => {
      try {
        setAudioError('');
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.load();
        await ensureAudioNodes();
        await audioEl.play();
        setIsAudioActive(true);
      } catch (error) {
        // If autoplay is blocked or the URL fails, keep UI calm and inform the user subtly
        setIsAudioActive(false);
        setAudioError("Impossible de lire ce flux audio. Vérifiez l'URL ou réessayez.");
      }
    };

    startAudio();
  }, [currentAudioUrl]);

  const currentPlaylist = selectedBubble?.playlist || [];

  useEffect(() => {
    setCarouselIndex(0);
    if (!selectedBubble) {
      focusTargetRef.current = null;
      selectedMeshRef.current = null;
    }
    isReadyToEnterRef.current = false;
    setIsReadyToEnter(false);
  }, [selectedBubble]);

  useEffect(() => {
    if (!carouselRef.current) return;
    const targetCard = carouselRef.current.querySelector(`[data-index='${carouselIndex}']`);
    if (targetCard?.scrollIntoView) {
      targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [carouselIndex]);

  const openModalForSelection = () => {
    if (!selectedBubble) return;
    setActiveMediaUrl((prev) => prev || currentPlaylist[0]?.url || '');
    setIsModalOpen(true);
    setIsMenuOpen(false);
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
    return <iframe title="Ressource" src={url} className="media-frame" />;
  };

  const handleAudioSubmit = async (event) => {
    event.preventDefault();
    const trimmed = audioUrlInput.trim();
    if (!trimmed) return;
    setAudioError('');
    setCurrentAudioUrl((prev) =>
      prev === trimmed ? `${trimmed}${trimmed.includes('?') ? '&' : '?'}t=${Date.now()}` : trimmed,
    );
    if (localAudioObjectUrl) {
      URL.revokeObjectURL(localAudioObjectUrl);
      setLocalAudioObjectUrl('');
    }
    await ensureAudioNodes();
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setAudioError('Le fichier doit être un audio (.mp3, .wav, .ogg).');
      return;
    }

    if (localAudioObjectUrl) {
      URL.revokeObjectURL(localAudioObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalAudioObjectUrl(objectUrl);
    setAudioUrlInput(file.name);
    setAudioError('');
    setCurrentAudioUrl(objectUrl);
    // allow re-importing the same file later
    if (event.target) {
      // eslint-disable-next-line no-param-reassign
      event.target.value = '';
    }
  };

  useEffect(() => () => {
    if (localAudioObjectUrl) {
      URL.revokeObjectURL(localAudioObjectUrl);
    }
  }, [localAudioObjectUrl]);

  return (
    <div ref={mountRef} className={`experience ${isTouchOnUi ? 'ui-focus' : 'scene-focus'}`}>
      <div className="hud">
        <button
          type="button"
          className={`burger-button ${isMenuOpen ? 'open' : ''}`}
          aria-label="Ouvrir le menu de contrôle"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="burger-lines">
            <span />
          </span>
          <span className="burger-label">Menu</span>
        </button>

        <div className={`hud-panel ${isMenuOpen ? 'visible' : ''}`}>
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
                    onClick={() => focusBubbleById(bubble.id)}
                  >
                    <span className="bubble-chip">{index + 1}</span>
                    <div className="bubble-meta">
                      <span className="bubble-name">{bubble.title}</span>
                      <span className="bubble-mini">se rapprocher</span>
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
                <p className="hud-sub">
                  Approchez-vous puis appuyez sur le bouton « entrer » qui se dépose sur la bulle
                  sélectionnée.
                </p>
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

      {enterButtonPos.visible && (
        <div
          className="enter-cta"
          style={{ left: `${enterButtonPos.x}px`, top: `${enterButtonPos.y}px` }}
        >
          <button type="button" className="enter-button" onClick={openModalForSelection}>
            entrer
          </button>
        </div>
      )}

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
