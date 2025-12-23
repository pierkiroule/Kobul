import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

const palette = [0x7cf7ff, 0xff7bd9, 0xffd170, 0x7bffbf, 0xb7a7ff];

const poeticTitles = [
  'Marée d\'aurore',
  'Souffle des lucioles',
  'Nébuleuse des murmures',
  'Pluie d\'étoiles lentes',
  'Jardin des ondes',
  'Courbe des marées',
  'Mémoire phosphène',
  'Étang céleste',
  'Spirale du velours',
  'Clarté des paillettes',
  'Brume magnétique',
  'Arc des songes',
  'Route des comètes',
  'Halo des lichens',
  'Chant des anémones',
  'Cercles du vent doux',
  'Suspension d\'argent',
  'Delta des possibles',
];

const poeticTexts = [
  'Une onde qui se replie et revient.',
  'Des éclats calmes qui se répondent.',
  'Les mots chuchotés deviennent vapeur.',
  'Chaque goutte d\'étoile s\'étire.',
  'Un motif souple comme un fil d\'eau.',
  'La marée trace des arcs lents.',
  'Des souvenirs s\'allument en silence.',
  'Le miroir du ciel respire.',
  'Un pas sur un velours astral.',
  'Une poussière scintille puis retombe.',
  'La brume tient les éclats ensemble.',
  'Un arc invisible relie les pensées.',
  'Les comètes dessinent des chemins.',
  'Un halo mousseux d\'idées.',
  'Les anémones chantent bas.',
  'Des cercles d\'air effleurent la peau.',
  'Un fil d\'argent suspendu.',
  'L\'embouchure où tout peut naître.',
];

function createTextSprite(text, color = '#e8f7ff') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const padding = 24;
  const fontSize = 32;
  context.font = `${fontSize}px "Inter", sans-serif`;
  const textWidth = context.measureText(text).width;

  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 214, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 95, 213, 0.35)');

  context.fillStyle = 'rgba(8, 14, 28, 0.8)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = gradient;
  context.lineWidth = 2;
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.font = `${fontSize}px "Inter", sans-serif`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scale = 1.2;
  sprite.scale.set(canvas.width / 200 * scale, canvas.height / 200 * scale, 1);
  sprite.userData.texture = texture;
  return sprite;
}

function ensureTags(content, fallbackTitle = '') {
  const tokens = tokenizeText(content || '');
  const titleTokens = tokenizeText(fallbackTitle || '');
  const defaults = ['#bulle', '#réseau', '✨'];
  if (tokens.length > 0) return tokens;
  if (titleTokens.length > 0) return titleTokens;
  return defaults;
}

function generateBubbles() {
  const count = poeticTitles.length;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const base = Array.from({ length: count }, (_, index) => {
    const theta = goldenAngle * index;
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const spread = 12.5;
    const position = new THREE.Vector3(
      Math.cos(theta) * radius * spread,
      y * spread * 0.6,
      Math.sin(theta) * radius * spread,
    );

    return {
      id: `bulle-${index + 1}`,
      title: poeticTitles[index],
      note: poeticTexts[index],
      skyboxUrl: '',
      fx: '',
      seedTags: ensureTags(poeticTexts[index], poeticTitles[index]),
      createdAt: Date.now() - 1000 * 60 * 20 - index * 1000,
      isRecent: false,
      connections: [],
      color: palette[index % palette.length],
      position,
    };
  });

  base.forEach((source, index) => {
    const neighbors = base
      .map((candidate, idx) => (idx !== index ? { candidate, distance: source.position.distanceTo(candidate.position) } : null))
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    neighbors.forEach(({ candidate }) => {
      if (!source.connections.includes(candidate.id)) source.connections.push(candidate.id);
      if (!candidate.connections.includes(source.id)) candidate.connections.push(source.id);
    });
  });

  return base;
}

function tokenizeText(input) {
  const cleaned = input.trim();
  if (!cleaned) return [];

  const emojiMatches = cleaned.match(/[\p{Emoji}\u2600-\u27BF]/gu) || [];
  const words = cleaned
    .replace(/[\p{Emoji}\u2600-\u27BF]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `#${word.toLowerCase()}`);

  return [...words, ...emojiMatches];
}

function uniqueId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const sceneContainerRef = useRef(null);
  const interiorContainerRef = useRef(null);

  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const atomsRef = useRef([]);
  const haloRef = useRef(null);
  const frameIdRef = useRef(null);
  const seedGroupRef = useRef(null);
  const seedParticlesRef = useRef([]);
  const restoreControlsRef = useRef(null);

  const interiorRendererRef = useRef(null);
  const interiorSceneRef = useRef(null);
  const interiorCameraRef = useRef(null);
  const interiorNetworkGroupRef = useRef(null);
  const miniNetworksRef = useRef([]);
  const interiorFrameIdRef = useRef(null);

  const focusedBubbleRef = useRef(null);

  const [bubbles, setBubbles] = useState(generateBubbles);
  const [filterMode, setFilterMode] = useState('all');
  const [focusedBubble, setFocusedBubble] = useState(null);
  const [isInteriorOpen, setIsInteriorOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [newBubbleData, setNewBubbleData] = useState({
    title: '',
    note: '',
    skyboxUrl: '',
    fx: '',
    connections: [],
  });

  const [syncEvents, setSyncEvents] = useState([]);

  useEffect(() => {
    focusedBubbleRef.current = focusedBubble;
  }, [focusedBubble]);

  const logEvent = (message) => {
    setSyncEvents((prev) => {
      const next = [{ id: uniqueId(), message }, ...prev];
      return next.slice(0, 6);
    });
  };

  const releaseSeeds = (tags) => {
    if (!seedGroupRef.current || tags.length === 0) return;
    const uniqueTags = Array.from(new Set(tags));
    uniqueTags.forEach((tag, index) => {
      const sprite = createTextSprite(tag, '#fdfbff');
      sprite.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10);
      sprite.userData.tag = tag;
      seedGroupRef.current.add(sprite);

      seedParticlesRef.current.push({
        sprite,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.015, (Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.015),
        wander: Math.random() * Math.PI * 2 + index,
      });
    });
    logEvent(`Ensemencement (${uniqueTags.join(' ')}) libéré dans le réseau.`);
  };

  const handleSeedNetwork = (event) => {
    event.preventDefault();
    const tags = tokenizeText(seedInput);
    if (tags.length === 0) return;
    releaseSeeds(tags);
    setSeedInput('');
  };

  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    gsap.to(cameraRef.current.position, { x: 0, y: 5, z: 22, duration: 1.2, ease: 'power2.inOut' });
    gsap.to(controlsRef.current.target, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.inOut' });
    setFocusedBubble(null);
    focusedBubbleRef.current = null;
  };

  const handleCreateBubble = (event) => {
    event.preventDefault();
    const selectedConnections = (newBubbleData.connections && newBubbleData.connections.length > 0)
      ? newBubbleData.connections
      : focusedBubble
        ? [focusedBubble.id]
        : [];
    const title = newBubbleData.title.trim() || 'Bulle inédite';
    const note = newBubbleData.note.trim();
    const skyboxUrl = newBubbleData.skyboxUrl.trim();
    const fx = newBubbleData.fx.trim();
    const seedTags = ensureTags(note, title);

    setBubbles((prev) => {
      const nextIndex = prev.length + 1;
      const id = `bulle-${nextIndex}`;
      const color = palette[nextIndex % palette.length];

      const anchors = prev.filter((bubble) => selectedConnections.includes(bubble.id));
      const center = anchors.reduce((acc, bubble) => acc.add(bubble.position), new THREE.Vector3());
      const position = anchors.length
        ? center.divideScalar(anchors.length).add(new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 2.4,
        ))
        : (() => {
          const angle = Math.random() * Math.PI * 2;
          const radius = 9 + Math.random() * 6;
          const height = (Math.random() - 0.5) * 6;
          return new THREE.Vector3(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius,
          );
        })();

      const updatedBubbles = prev.map((bubble) => {
        if (!selectedConnections.includes(bubble.id)) return bubble;
        return { ...bubble, connections: Array.from(new Set([...(bubble.connections || []), id])) };
      });

      const newBubble = {
        id,
        title,
        note,
        skyboxUrl,
        fx,
        seedTags,
        connections: [...selectedConnections],
        color,
        position,
        createdAt: Date.now(),
        isRecent: true,
      };

      return [...updatedBubbles, newBubble];
    });
    setNewBubbleData({ title: '', note: '', skyboxUrl: '', fx: '', connections: [] });
  };

  const focusBubble = (mesh) => {
    if (!mesh || !cameraRef.current || !controlsRef.current) return;
    const meta = mesh.userData.meta;
    setFocusedBubble(meta);
    setIsInteriorOpen(true);
    setSyncEvents([]);
    focusedBubbleRef.current = meta;

    gsap.to(cameraRef.current.position, {
      x: mesh.position.x + 0.6,
      y: mesh.position.y + 0.4,
      z: mesh.position.z + 1.1,
      duration: 1.3,
      ease: 'power2.inOut',
    });
    gsap.to(controlsRef.current.target, {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
      duration: 1.3,
      ease: 'power2.inOut',
    });
  };

  const visibleBubbles = useMemo(() => {
    if (filterMode === 'recent') return bubbles.filter((bubble) => bubble.isRecent);
    return bubbles;
  }, [bubbles, filterMode]);

  useEffect(() => {
    if (focusedBubble && !visibleBubbles.some((bubble) => bubble.id === focusedBubble.id)) {
      setFocusedBubble(null);
      focusedBubbleRef.current = null;
    }
  }, [focusedBubble, visibleBubbles]);

  useEffect(() => {
    if (!sceneContainerRef.current) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020610);

    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 800);
    camera.position.set(0, 5, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const updateSize = () => {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width || 1;
      const height = rect.height || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xffffff, 1.2, 120);
    keyLight.position.set(16, 18, 22);
    scene.add(keyLight);

    const starGeo = new THREE.BufferGeometry();
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    const stars = [];
    for (let i = 0; i < 1200; i += 1) {
      stars.push(THREE.MathUtils.randFloatSpread(600));
      stars.push(THREE.MathUtils.randFloatSpread(360));
      stars.push(THREE.MathUtils.randFloatSpread(600));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    const geometry = new THREE.SphereGeometry(1.1, 32, 32);
    const atoms = [];

    visibleBubbles.forEach((bubble) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: bubble.color,
        roughness: 0.2,
        metalness: 0.08,
        transmission: 0.78,
        thickness: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        emissive: bubble.color,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(bubble.position);
      mesh.userData.meta = bubble;
      const light = new THREE.PointLight(bubble.color, 0.8, 7);
      mesh.add(light);
      scene.add(mesh);
      atoms.push(mesh);
    });
    atomsRef.current = atoms;

    const seedGroup = new THREE.Group();
    scene.add(seedGroup);
    seedGroupRef.current = seedGroup;
    seedParticlesRef.current = [];

    const haloGeometry = new THREE.SphereGeometry(1.6, 42, 42);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.12,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.visible = false;
    scene.add(halo);
    haloRef.current = halo;

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
    const linkPositions = [];
    const addedPairs = new Set();
    visibleBubbles.forEach((source) => {
      (source.connections || []).forEach((targetId) => {
        const target = visibleBubbles.find((candidate) => candidate.id === targetId);
        if (!target) return;
        const key = [source.id, target.id].sort().join('->');
        if (addedPairs.has(key)) return;
        addedPairs.add(key);
        linkPositions.push(
          source.position.x,
          source.position.y,
          source.position.z,
          target.position.x,
          target.position.y,
          target.position.z,
        );
      });
    });
    const lineGeom = new THREE.BufferGeometry();
    if (linkPositions.length > 0) {
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    }
    const links = new THREE.LineSegments(lineGeom, lineMaterial);
    links.frustumCulled = false;
    scene.add(links);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.45;
    controls.zoomSpeed = 0.65;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const preventContextMenu = (event) => event.preventDefault();

    const onPointerDown = (event) => {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(atoms, true);
      if (hits.length) {
        const target = hits[0].object;
        focusBubble(target);
      }
    };
    const onPointerUp = () => restoreControlsRef.current && restoreControlsRef.current();
    const onPointerOut = () => restoreControlsRef.current && restoreControlsRef.current();

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerOut);
    renderer.domElement.addEventListener('pointercancel', onPointerOut);
    renderer.domElement.addEventListener('contextmenu', preventContextMenu);
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(sceneContainerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      atoms.forEach((atom, index) => {
        const offset = index * 0.3;
        atom.position.y = atom.userData.meta.position.y + Math.sin(elapsed * 0.8 + offset) * 0.4;
        atom.rotation.y += 0.004;
        const mat = atom.material;
        mat.emissiveIntensity = 0.16 + Math.abs(Math.sin(elapsed * 1 + offset)) * 0.25;
      });

      const targetBubble = focusedBubbleRef.current;
      if (haloRef.current && targetBubble) {
        const target = atoms.find((mesh) => mesh.userData.meta.id === targetBubble.id);
        if (target) {
          halo.visible = true;
          halo.position.copy(target.position);
          halo.scale.setScalar(1.2 + Math.sin(elapsed * 1.6) * 0.06);
          halo.material.opacity = 0.2 + Math.abs(Math.sin(elapsed * 1.4)) * 0.2;
        }
      } else if (haloRef.current) {
        halo.visible = false;
      }

      const pendingIntegrations = [];
      seedParticlesRef.current.forEach((seed) => {
        let nearest = null;
        let nearestDistance = Infinity;
        atoms.forEach((atom) => {
          const distance = atom.position.distanceTo(seed.sprite.position);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = atom;
          }
        });

        const wanderStrength = 0.004 + Math.sin(elapsed + seed.wander) * 0.002;
        seed.velocity.x += (Math.random() - 0.5) * wanderStrength * 0.2;
        seed.velocity.y += (Math.random() - 0.5) * wanderStrength * 0.2;
        seed.velocity.z += (Math.random() - 0.5) * wanderStrength * 0.2;

        if (nearest) {
          const direction = new THREE.Vector3().subVectors(nearest.position, seed.sprite.position);
          const distance = Math.max(direction.length(), 0.001);
          direction.normalize();
          const pull = 0.006 / distance;
          seed.velocity.addScaledVector(direction, pull);

          if (distance < 1.1) {
            pendingIntegrations.push({ bubbleId: nearest.userData.meta.id, tag: seed.sprite.userData.tag, sprite: seed.sprite });
          }
        }

        seed.velocity.multiplyScalar(0.992);
        seed.sprite.position.add(seed.velocity);
        seed.sprite.lookAt(camera.position);
      });

      if (pendingIntegrations.length > 0 && seedGroupRef.current) {
        pendingIntegrations.forEach(({ sprite }) => {
          seedParticlesRef.current = seedParticlesRef.current.filter((entry) => entry.sprite !== sprite);
          seedGroupRef.current.remove(sprite);
          if (sprite.material?.map) sprite.material.map.dispose();
          if (sprite.material) sprite.material.dispose();
        });

        const updatesByBubble = pendingIntegrations.reduce((acc, item) => {
          if (!acc[item.bubbleId]) acc[item.bubbleId] = [];
          acc[item.bubbleId].push(item.tag);
          return acc;
        }, {});

        setBubbles((prev) => prev.map((bubble) => {
          const incoming = updatesByBubble[bubble.id];
          if (!incoming) return bubble;
          const nextSeeds = Array.from(new Set([...(bubble.seedTags || ensureTags(bubble.note, bubble.title)), ...incoming]));
          return { ...bubble, seedTags: nextSeeds };
        }));

        const mergedTags = pendingIntegrations.map((item) => item.tag);
        logEvent(`Les tags ${mergedTags.join(' ')} se déposent dans une bulle.`);
      }

      controls.update();
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerOut);
      renderer.domElement.removeEventListener('pointercancel', onPointerOut);
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      controls.dispose();
      geometry.dispose();
      starGeo.dispose();
      starMat.dispose();
      lineGeom.dispose();
      lineMaterial.dispose();
      seedParticlesRef.current.forEach(({ sprite }) => {
        if (sprite.material?.map) sprite.material.map.dispose();
        if (sprite.material) sprite.material.dispose();
      });
      seedParticlesRef.current = [];
      if (seedGroupRef.current) {
        scene.remove(seedGroupRef.current);
        seedGroupRef.current = null;
      }
      atoms.forEach((atom) => atom.material.dispose());
      renderer.dispose();
      if (sceneContainerRef.current?.contains(renderer.domElement)) {
        sceneContainerRef.current.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [visibleBubbles]);

  useEffect(() => {
    if (!isInteriorOpen || !interiorContainerRef.current || !focusedBubble) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a16);
    interiorSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 0, 3.2);
    interiorCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    interiorContainerRef.current.appendChild(renderer.domElement);
    interiorRendererRef.current = renderer;

    const updateSize = () => {
      const rect = interiorContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width || 1;
      const height = rect.height || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const soft = new THREE.PointLight(focusedBubble.color, 1.2, 18);
    soft.position.set(2, 2, 2);
    scene.add(soft);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(6, 52, 52),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x0b1a33),
        emissive: new THREE.Color(focusedBubble.color).multiplyScalar(0.15),
        roughness: 0.8,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    );
    scene.add(dome);

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);
    interiorNetworkGroupRef.current = networkGroup;
    miniNetworksRef.current = [];

    const initialTags = focusedBubble.seedTags || ensureTags(focusedBubble.note, focusedBubble.title);

    if (initialTags.length > 0) {
      const seedNetwork = createMiniNetwork(initialTags);
      if (seedNetwork) {
        logEvent(`Intérieur (${initialTags.join(' ')}) en orbite douce.`);
      }
    }

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(interiorContainerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      miniNetworksRef.current.forEach((network, idx) => {
        network.rotation.y += 0.0008 + idx * 0.0002;
        network.children.forEach((child) => {
          if (child.userData.base) {
            child.position.x = child.userData.base.x + Math.sin(elapsed * 0.9 + child.userData.offset) * 0.22;
            child.position.y = child.userData.base.y + Math.cos(elapsed * 0.8 + child.userData.offset * 1.2) * 0.18;
            child.position.z = child.userData.base.z + Math.sin(elapsed * 0.7 + child.userData.offset * 0.7) * 0.2;
          }
          if (child.lookAt) child.lookAt(camera.position);
        });
      });
      dome.rotation.y += 0.0009;
      renderer.render(scene, camera);
      interiorFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (interiorFrameIdRef.current) cancelAnimationFrame(interiorFrameIdRef.current);
      miniNetworksRef.current.forEach((network) => {
        network.children.forEach((child) => {
          if (child.material?.map) child.material.map.dispose();
          if (child.material) child.material.dispose();
          if (child.geometry) child.geometry.dispose();
        });
      });
      miniNetworksRef.current = [];
      dome.geometry.dispose();
      dome.material.dispose();
      renderer.dispose();
      if (interiorContainerRef.current?.contains(renderer.domElement)) {
        interiorContainerRef.current.removeChild(renderer.domElement);
      }
      interiorSceneRef.current = null;
      interiorRendererRef.current = null;
      interiorCameraRef.current = null;
      interiorNetworkGroupRef.current = null;
    };
  }, [focusedBubble, isInteriorOpen]);

  const handleExitInterior = () => {
    setIsInteriorOpen(false);
    resetView();
  };

  const createMiniNetwork = (tags) => {
    if (!interiorNetworkGroupRef.current) return null;
    const group = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 22, 22),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: focusedBubble?.color || 0xffffff,
        emissiveIntensity: 0.3,
        roughness: 0.35,
      }),
    );
    core.userData.base = new THREE.Vector3(0, 0, 0);
    core.userData.offset = Math.random() * 3;
    group.add(core);

    const lines = [];
    const radius = 1 + Math.random() * 0.4;
    tags.forEach((tag, index) => {
      const phi = Math.acos(1 - (2 * (index + 0.5)) / (tags.length + 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const position = new THREE.Vector3(
        Math.cos(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius,
        Math.sin(theta) * Math.sin(phi) * radius,
      );

      const node = createTextSprite(tag, '#f5fbff');
      node.position.copy(position);
      node.userData.base = position.clone();
      node.userData.offset = Math.random() * 2;
      group.add(node);

      lines.push(0, 0, 0, position.x, position.y, position.z);
    });

    if (lines.length > 0) {
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
      const lineSegments = new THREE.LineSegments(lineGeom, lineMat);
      lineSegments.userData.base = new THREE.Vector3(0, 0, 0);
      lineSegments.userData.offset = Math.random() * 2;
      group.add(lineSegments);
    }

    interiorNetworkGroupRef.current.add(group);
    miniNetworksRef.current.push(group);
    return group;
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-block">
          <p className="eyebrow">EchoBulle</p>
          <h1>Réseau 3D unique et intérieur</h1>
          <p className="lede">
            Cliquez une bulle, entrez directement dedans et observez son monde de particules. Le réseau reste
            présent en toile de fond tandis que les tags et émojis gravitent pour rejoindre les bulles.
          </p>
          <div className="control-row">
            <button type="button" className="primary" onClick={resetView}>Revenir au réseau</button>
            <button type="button" className="ghost" onClick={handleExitInterior} disabled={!focusedBubble}>
              Quitter la bulle
            </button>
          </div>
        </div>

        <div className="sidebar-block">
          <p className="eyebrow">Filtre</p>
          <div className="segmented" aria-label="Modes de filtre">
            <button
              type="button"
              className={filterMode === 'all' ? 'active' : ''}
              onClick={() => setFilterMode('all')}
            >
              Toutes les bulles
            </button>
            <button
              type="button"
              className={filterMode === 'recent' ? 'active' : ''}
              onClick={() => setFilterMode('recent')}
            >
              Récemment créées
            </button>
          </div>
          <div className="panel-footer">
            <span className="chip subtle">Visibles : {visibleBubbles.length}</span>
            <span className="hint">Chaque clic fait plonger la caméra dans la bulle visée.</span>
          </div>
        </div>

        <form className="sidebar-block seed-form" onSubmit={handleSeedNetwork}>
          <p className="eyebrow">Ensemencer le réseau</p>
          <p className="muted">Texte + émojis sont transformés en tags flottants attirés par les bulles.</p>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="Déposer une pluie de mots ou d'icônes"
          />
          <button type="submit" className="primary">Lâcher les tags</button>
        </form>

        <div className="sidebar-block focus-panel">
          <p className="eyebrow">Bulle en cours</p>
          {focusedBubble ? (
            <>
              <h3>{focusedBubble.title}</h3>
              <p className="muted">{focusedBubble.note || 'Silence intérieur à explorer.'}</p>
              <div className="tag-cloud" aria-label="Tags de la bulle">
                {(focusedBubble.seedTags || ensureTags(focusedBubble.note, focusedBubble.title)).map((tag) => (
                  <span key={tag} className="chip subtle">{tag}</span>
                ))}
              </div>
              <div className="bubble-meta">
                <span className="chip">Skybox : {focusedBubble.skyboxUrl || 'à venir'}</span>
                <span className="chip">FX : {focusedBubble.fx || 'silence'}</span>
              </div>
            </>
          ) : (
            <p className="muted">Sélectionnez une bulle du réseau pour ressentir son intériorité.</p>
          )}
        </div>

        <form className="sidebar-block mini-form" onSubmit={handleCreateBubble}>
          <p className="eyebrow">Nouvelle bulle</p>
          <input
            type="text"
            value={newBubbleData.title}
            onChange={(e) => setNewBubbleData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Titre"
          />
          <textarea
            value={newBubbleData.note}
            onChange={(e) => setNewBubbleData((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Fragment poétique ou sensation"
          />
          <input
            type="url"
            value={newBubbleData.skyboxUrl}
            onChange={(e) => setNewBubbleData((prev) => ({ ...prev, skyboxUrl: e.target.value }))}
            placeholder="Skybox (URL optionnelle)"
          />
          <input
            type="text"
            value={newBubbleData.fx}
            onChange={(e) => setNewBubbleData((prev) => ({ ...prev, fx: e.target.value }))}
            placeholder="FX particules ou ambiance"
          />
          <button type="submit" className="ghost">Ajouter au réseau</button>
        </form>

        <div className="sidebar-block sync-feed">
          <p className="eyebrow">Flux</p>
          {syncEvents.length === 0 ? (
            <p className="muted">Les graines déposées et intégrations apparaissent ici.</p>
          ) : (
            <ul>
              {syncEvents.map((event) => (
                <li key={event.id}>{event.message}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="stage">
        <div className="scene" aria-label="Réseau de bulles 3D">
          <div ref={sceneContainerRef} className="experience" />
          {isInteriorOpen && focusedBubble && (
            <div className="interior-window" role="region" aria-label="Intérieur de la bulle">
              <div className="interior-window-header">
                <div>
                  <p className="eyebrow">Intérieur</p>
                  <h3>{focusedBubble.title}</h3>
                </div>
                <button type="button" className="ghost" onClick={handleExitInterior}>Sortir</button>
              </div>
              <div className="tag-cloud" aria-label="Tags intégrés">
                {(focusedBubble.seedTags || ensureTags(focusedBubble.note, focusedBubble.title)).map((tag) => (
                  <span key={tag} className="chip subtle">{tag}</span>
                ))}
              </div>
              <div className="interior-viewport" ref={interiorContainerRef} aria-label="Micro réseau" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
