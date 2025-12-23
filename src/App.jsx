import React, { useEffect, useRef, useState } from 'react';
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

function createSeededRandom(seedString = '') {
  let seed = 0;
  for (let i = 0; i < seedString.length; i += 1) {
    seed = (seed * 31 + seedString.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function buildProceduralSky(accentColor, random) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const topColor = new THREE.Color(accentColor).lerp(new THREE.Color(0x91c5ff), 0.3);
  const bottomColor = new THREE.Color(0x050a16);
  const horizonColor = new THREE.Color(accentColor).lerp(new THREE.Color(0x0b1d2f), 0.6);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColor.getStyle());
  gradient.addColorStop(0.55, topColor.clone().lerp(bottomColor, 0.2).getStyle());
  gradient.addColorStop(1, bottomColor.getStyle());
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const horizonHeight = canvas.height * 0.64;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  let lastY = horizonHeight;
  for (let x = 0; x <= canvas.width; x += 8) {
    const drift = (random() - 0.5) * 22;
    const peak = Math.sin(x * 0.004 + random() * 2) * 28;
    lastY = THREE.MathUtils.clamp(lastY + drift + peak * 0.02, horizonHeight - 42, horizonHeight + 32);
    ctx.lineTo(x, lastY);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = horizonColor.getStyle();
  ctx.fill();

  const cloudCount = 18 + Math.floor(random() * 10);
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = topColor.clone().lerp(new THREE.Color(0xffffff), 0.3).getStyle();
  for (let i = 0; i < cloudCount; i += 1) {
    const baseX = random() * canvas.width;
    const baseY = random() * horizonHeight * 0.9;
    const width = 80 + random() * 120;
    const height = 18 + random() * 30;
    const segments = 6 + Math.floor(random() * 6);
    for (let j = 0; j < segments; j += 1) {
      const offsetX = (random() - 0.5) * width * 0.35;
      const offsetY = (random() - 0.5) * height * 0.35;
      ctx.beginPath();
      ctx.ellipse(baseX + offsetX, baseY + offsetY, width * 0.2, height * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const starCount = 260 + Math.floor(random() * 140);
  ctx.fillStyle = '#e8f7ff';
  for (let i = 0; i < starCount; i += 1) {
    const x = random() * canvas.width;
    const y = random() * horizonHeight * 0.85;
    const size = 0.5 + random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  const skyGeo = new THREE.SphereGeometry(22, 64, 64);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
  const mesh = new THREE.Mesh(skyGeo, material);

  return {
    mesh,
    dispose: () => {
      texture.dispose();
      skyGeo.dispose();
      material.dispose();
    },
  };
}

function buildLandscape(accentColor, random) {
  const group = new THREE.Group();
  const terrainGeometry = new THREE.PlaneGeometry(26, 26, 70, 70);
  const position = terrainGeometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const hills = Math.sin(x * 0.35) * 0.35 + Math.cos(y * 0.28) * 0.25;
    const ripples = Math.sin((x + y) * 0.7) * 0.12;
    const noise = (random() - 0.5) * 0.28;
    position.setZ(i, hills + ripples + noise);
  }
  position.needsUpdate = true;
  terrainGeometry.computeVertexNormals();

  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0d1f33).lerp(new THREE.Color(accentColor), 0.18),
    roughness: 0.82,
    metalness: 0.08,
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  group.add(terrain);

  const scatterGroup = new THREE.Group();
  const scatterCount = 8 + Math.floor(random() * 8);
  for (let i = 0; i < scatterCount; i += 1) {
    const typeRoll = random();
    const size = 0.3 + random() * 0.9;
    let geometry = null;
    if (typeRoll < 0.33) geometry = new THREE.TorusKnotGeometry(size * 0.5, size * 0.16, 64, 12);
    else if (typeRoll < 0.66) geometry = new THREE.DodecahedronGeometry(size);
    else geometry = new THREE.CylinderGeometry(size * 0.6, size * 0.6, size * 1.6, 16, 1);

    const hueShift = 0.04 + random() * 0.12;
    const shapeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor).offsetHSL(hueShift, -0.1, 0.08),
      emissive: new THREE.Color(accentColor).multiplyScalar(0.25),
      roughness: 0.4,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, shapeMaterial);
    mesh.position.set((random() - 0.5) * 18, size * 0.8 + 0.1, (random() - 0.5) * 18);
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    scatterGroup.add(mesh);
  }

  group.add(scatterGroup);
  return {
    group,
    scatterGroup,
    terrain,
    dispose: () => {
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      scatterGroup.children.forEach((mesh) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
    },
  };
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
  const seedClustersRef = useRef([]);
  const settledSeedsRef = useRef([]);
  const bubbleTagGroupsRef = useRef(new Map());
  const restoreControlsRef = useRef(null);
  const isInteriorOpenRef = useRef(false);
  const pendingEntryRef = useRef(false);

  const interiorRendererRef = useRef(null);
  const interiorSceneRef = useRef(null);
  const interiorCameraRef = useRef(null);
  const interiorOrientationRef = useRef({ active: false, quaternion: new THREE.Quaternion(), cleanup: null });
  const interiorNetworkGroupRef = useRef(null);
  const miniNetworksRef = useRef([]);
  const interiorFrameIdRef = useRef(null);
  const interiorFallbackViewRef = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 });
  const interiorAutoDriftRef = useRef(0);

  const focusedBubbleRef = useRef(null);

  const [bubbles, setBubbles] = useState(generateBubbles);
  const [focusedBubble, setFocusedBubble] = useState(null);
  const [isInteriorOpen, setIsInteriorOpen] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  const [syncEvents, setSyncEvents] = useState([]);

  useEffect(() => {
    focusedBubbleRef.current = focusedBubble;
  }, [focusedBubble]);

  useEffect(() => {
    isInteriorOpenRef.current = isInteriorOpen;
  }, [isInteriorOpen]);

  const logEvent = (message) => {
    setSyncEvents((prev) => {
      const next = [{ id: uniqueId(), message }, ...prev];
      return next.slice(0, 6);
    });
  };

  const releaseSeeds = (tags) => {
    if (!seedGroupRef.current || tags.length === 0) return;
    const uniqueTags = Array.from(new Set(tags));

    const cluster = new THREE.Group();
    cluster.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 8);

    const nodes = uniqueTags.map((tag, index) => {
      const sprite = createTextSprite(tag, '#fdfbff');
      const radius = 1.05;
      const jitter = 0.35;
      const seed = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      seed.multiplyScalar(radius * (0.7 + Math.random() * 0.6));
      const offset = seed.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * jitter,
          (Math.random() - 0.5) * jitter,
          (Math.random() - 0.5) * jitter,
        ),
      );
      sprite.position.copy(offset);
      sprite.userData.tag = tag;
      sprite.userData.offset = offset;
      sprite.userData.wobble = Math.random() * Math.PI * 2 + index;
      cluster.add(sprite);
      return sprite;
    });

    if (nodes.length > 1) {
      const positions = [];
      nodes.forEach((node, idx) => {
        const next = nodes[(idx + 1) % nodes.length];
        positions.push(node.position.x, node.position.y, node.position.z, next.position.x, next.position.y, next.position.z);
        if (nodes.length > 3 && idx % 2 === 0) {
          const cross = nodes[(idx + 2) % nodes.length];
          positions.push(node.position.x, node.position.y, node.position.z, cross.position.x, cross.position.y, cross.position.z);
        }
      });
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
      const lines = new THREE.LineSegments(lineGeom, lineMat);
      lines.userData.isClusterLines = true;
      cluster.add(lines);
    }

    seedGroupRef.current.add(cluster);

    seedClustersRef.current.push({
      group: cluster,
      nodes,
      tags: uniqueTags,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.009, (Math.random() - 0.5) * 0.007, (Math.random() - 0.5) * 0.009),
      wander: Math.random() * Math.PI * 2,
      orbitPhase: Math.random() * Math.PI * 2,
      bounceHistory: new Set(),
    });

    logEvent(`Grappe (${uniqueTags.join(' ')}) libérée, déjà reliée en mini réseau.`);
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
    pendingEntryRef.current = false;
  };

  const moveCameraToBubbleCenter = (bubbleMeta, duration = 1.15) => {
    if (!bubbleMeta || !cameraRef.current || !controlsRef.current) return;
    const targetMesh = atomsRef.current.find((mesh) => mesh.userData.meta.id === bubbleMeta.id);
    if (!targetMesh) return;
    const { position } = targetMesh;

    gsap.to(cameraRef.current.position, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration,
      ease: 'power2.inOut',
    });
    gsap.to(controlsRef.current.target, {
      x: position.x,
      y: position.y,
      z: position.z,
      duration,
      ease: 'power2.inOut',
    });
  };

  const focusBubble = (mesh) => {
    if (!mesh) return;
    const meta = mesh.userData.meta;
    setFocusedBubble(meta);
    setIsInteriorOpen(false);
    setSyncEvents([]);
    focusedBubbleRef.current = meta;
    pendingEntryRef.current = true;

    moveCameraToBubbleCenter(meta);
  };

  useEffect(() => {
    if (focusedBubble && !bubbles.some((bubble) => bubble.id === focusedBubble.id)) {
      setFocusedBubble(null);
      focusedBubbleRef.current = null;
      pendingEntryRef.current = false;
      setIsInteriorOpen(false);
    }
  }, [bubbles, focusedBubble]);

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
    bubbleTagGroupsRef.current = new Map();

    bubbles.forEach((bubble) => {
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
      const tagNest = new THREE.Group();
      tagNest.name = `tags-${bubble.id}`;
      tagNest.userData.floaters = [];
      mesh.add(tagNest);
      bubbleTagGroupsRef.current.set(bubble.id, tagNest);
      scene.add(mesh);
      atoms.push(mesh);
    });
    atomsRef.current = atoms;

    const seedGroup = new THREE.Group();
    scene.add(seedGroup);
    seedGroupRef.current = seedGroup;
    seedClustersRef.current = [];

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
    bubbles.forEach((source) => {
      (source.connections || []).forEach((targetId) => {
        const target = bubbles.find((candidate) => candidate.id === targetId);
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

      if (pendingEntryRef.current && targetBubble && !isInteriorOpenRef.current) {
        const target = atoms.find((mesh) => mesh.userData.meta.id === targetBubble.id);
        if (target) {
          const distance = camera.position.distanceTo(target.position);
          if (distance <= 0.12) {
            pendingEntryRef.current = false;
            setIsInteriorOpen(true);
            logEvent(`${targetBubble.title} ouverte : immersion 360° enclenchée.`);
          }
        }
      }

      const pendingIntegrations = [];
      seedClustersRef.current.forEach((cluster) => {
        let nearest = null;
        let nearestDistance = Infinity;
        atoms.forEach((atom) => {
          const distance = atom.position.distanceTo(cluster.group.position);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = atom;
          }
        });

        const wanderStrength = 0.0015 + Math.sin(elapsed + cluster.wander) * 0.0008;
        cluster.velocity.x += (Math.random() - 0.5) * wanderStrength * 0.22;
        cluster.velocity.y += (Math.random() - 0.5) * wanderStrength * 0.22;
        cluster.velocity.z += (Math.random() - 0.5) * wanderStrength * 0.22;

        const orbitPush = new THREE.Vector3(
          Math.sin(elapsed * 0.2 + cluster.orbitPhase),
          Math.sin(elapsed * 0.16 + cluster.orbitPhase * 1.3) * 0.28,
          Math.cos(elapsed * 0.2 + cluster.orbitPhase),
        ).multiplyScalar(0.0013);
        cluster.velocity.add(orbitPush);

        const coreVector = cluster.group.position.clone().multiplyScalar(-1);
        const coreDistance = Math.max(coreVector.length(), 0.001);
        coreVector.normalize();
        const corePull = Math.min(coreDistance / 16, 1) * 0.007;
        cluster.velocity.addScaledVector(coreVector, corePull);

        if (nearest) {
          const direction = new THREE.Vector3().subVectors(nearest.position, cluster.group.position);
          const distance = Math.max(direction.length(), 0.001);
          direction.normalize();
          const pull = 0.012 / distance;
          cluster.velocity.addScaledVector(direction, pull);

          if (distance < 1.2) {
            const normal = new THREE.Vector3().subVectors(cluster.group.position, nearest.position).normalize();
            const isNewBounce = !cluster.bounceHistory.has(nearest.userData.meta.id);

            if (cluster.bounceHistory.size >= 3) {
              const randomTarget = atoms[Math.floor(Math.random() * atoms.length)];
              pendingIntegrations.push({
                bubbleId: randomTarget?.userData.meta.id || nearest.userData.meta.id,
                sprites: cluster.nodes,
                tags: cluster.tags,
                cluster,
              });
            } else {
              if (isNewBounce) cluster.bounceHistory.add(nearest.userData.meta.id);
              const reflected = cluster.velocity.clone().sub(normal.clone().multiplyScalar(2 * cluster.velocity.dot(normal)));
              cluster.velocity.copy(reflected.multiplyScalar(0.9));
              cluster.velocity.addScaledVector(normal, 0.018);
            }
          }
        }

        const maxSpeed = 0.02;
        const speed = cluster.velocity.length();
        if (speed > maxSpeed) {
          cluster.velocity.multiplyScalar(maxSpeed / speed);
        }

        cluster.velocity.multiplyScalar(0.99);
        cluster.group.position.add(cluster.velocity);

        cluster.nodes.forEach((sprite) => {
          const wobble = sprite.userData.wobble;
          sprite.position.x = sprite.userData.offset.x + Math.sin(elapsed * 0.7 + wobble) * 0.06;
          sprite.position.y = sprite.userData.offset.y + Math.cos(elapsed * 0.6 + wobble * 1.3) * 0.06;
          sprite.position.z = sprite.userData.offset.z + Math.sin(elapsed * 0.5 + wobble * 0.7) * 0.06;
          sprite.lookAt(camera.position);
        });
      });

      if (pendingIntegrations.length > 0 && seedGroupRef.current) {
        const updatesByBubble = pendingIntegrations.reduce((acc, item) => {
          const uniqueTags = acc[item.bubbleId] || new Set();
          item.tags.forEach((tag) => uniqueTags.add(tag));
          acc[item.bubbleId] = uniqueTags;
          return acc;
        }, {});

        pendingIntegrations.forEach(({ sprites, bubbleId, cluster }) => {
          seedClustersRef.current = seedClustersRef.current.filter((entry) => entry !== cluster);
          seedGroupRef.current.remove(cluster.group);
          cluster.group.children
            .filter((child) => child.userData?.isClusterLines)
            .forEach((line) => {
              if (line.material) line.material.dispose();
              if (line.geometry) line.geometry.dispose();
            });

          const targetNest = bubbleTagGroupsRef.current.get(bubbleId);
          if (targetNest) {
            sprites.forEach((sprite) => {
              sprite.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
              sprite.scale.multiplyScalar(0.7);
              sprite.material.opacity = 0.95;
              targetNest.add(sprite);
              settledSeedsRef.current.push({
                bubbleId,
                sprite,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003),
                drift: Math.random() * Math.PI * 2,
              });
            });
          } else {
            sprites.forEach((sprite) => {
              if (sprite.material?.map) sprite.material.map.dispose();
              if (sprite.material) sprite.material.dispose();
            });
          }
        });

        setBubbles((prev) => prev.map((bubble) => {
          const incomingSet = updatesByBubble[bubble.id];
          if (!incomingSet) return bubble;
          const nextSeeds = Array.from(new Set([...(bubble.seedTags || ensureTags(bubble.note, bubble.title)), ...incomingSet]));
          return { ...bubble, seedTags: nextSeeds };
        }));

        const mergedTags = pendingIntegrations.flatMap((item) => item.tags);
        logEvent(`La grappe ${mergedTags.join(' ')} est absorbée par une bulle.`);
      }

      settledSeedsRef.current.forEach((floater) => {
        floater.drift += 0.002;
        floater.sprite.position.x += Math.sin(elapsed * 0.5 + floater.drift) * 0.004;
        floater.sprite.position.y += Math.cos(elapsed * 0.6 + floater.drift * 1.2) * 0.004;
        floater.sprite.position.z += Math.sin(elapsed * 0.55 + floater.drift * 0.8) * 0.004;
        floater.sprite.position.add(floater.velocity);
        floater.velocity.multiplyScalar(0.995);
        const distanceFromCenter = floater.sprite.position.length();
        if (distanceFromCenter > 0.75) {
          floater.sprite.position.addScaledVector(floater.sprite.position.clone().normalize(), -0.02);
        }
        floater.sprite.lookAt(camera.position);
      });

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
      seedClustersRef.current.forEach((cluster) => {
        cluster.group.children.forEach((child) => {
          if (child.material?.map) child.material.map.dispose();
          if (child.material) child.material.dispose();
          if (child.geometry) child.geometry.dispose();
        });
      });
      seedClustersRef.current = [];
      settledSeedsRef.current.forEach(({ sprite }) => {
        if (sprite.material?.map) sprite.material.map.dispose();
        if (sprite.material) sprite.material.dispose();
      });
      settledSeedsRef.current = [];
      if (seedGroupRef.current) {
        scene.remove(seedGroupRef.current);
        seedGroupRef.current = null;
      }
      bubbleTagGroupsRef.current.forEach((group) => {
        group.children.forEach((child) => {
          if (child.material?.map) child.material.map.dispose();
          if (child.material) child.material.dispose();
        });
      });
      bubbleTagGroupsRef.current = new Map();
      atoms.forEach((atom) => atom.material.dispose());
      renderer.dispose();
      if (sceneContainerRef.current?.contains(renderer.domElement)) {
        sceneContainerRef.current.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [bubbles]);

  useEffect(() => {
    if (!isInteriorOpen || !interiorContainerRef.current || !focusedBubble) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a16);
    interiorSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    interiorCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    interiorContainerRef.current.appendChild(renderer.domElement);
    interiorRendererRef.current = renderer;
    interiorOrientationRef.current = { active: false, quaternion: new THREE.Quaternion(), cleanup: null };
    interiorFallbackViewRef.current = { yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 };
    interiorAutoDriftRef.current = 0;

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

    const random = createSeededRandom(`${focusedBubble.id}-${focusedBubble.createdAt}`);
    const sky = buildProceduralSky(focusedBubble.color, random);
    scene.add(sky.mesh);

    const landscape = buildLandscape(focusedBubble.color, random);
    scene.add(landscape.group);

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

    const maybeEnableGyro = async () => {
      if (!('DeviceOrientationEvent' in window)) return;
      const { DeviceOrientationEvent } = window;
      const permissionRequest = DeviceOrientationEvent.requestPermission;
      if (typeof permissionRequest === 'function') {
        try {
          const permission = await permissionRequest();
          if (permission !== 'granted') return;
        } catch (error) {
          return;
        }
      }

      const zee = new THREE.Vector3(0, 0, 1);
      const euler = new THREE.Euler();
      const q0 = new THREE.Quaternion();
      const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
      const targetQuaternion = new THREE.Quaternion();

      const handleOrientation = (event) => {
        const alpha = THREE.MathUtils.degToRad(event.alpha || 0);
        const beta = THREE.MathUtils.degToRad(event.beta || 0);
        const gamma = THREE.MathUtils.degToRad(event.gamma || 0);
        const orientationAngle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
        const orient = THREE.MathUtils.degToRad(orientationAngle);
        euler.set(beta, alpha, -gamma, 'YXZ');
        targetQuaternion
          .setFromEuler(euler)
          .multiply(q1)
          .multiply(q0.setFromAxisAngle(zee, -orient));
        interiorOrientationRef.current.quaternion.slerp(targetQuaternion, 0.25);
        interiorOrientationRef.current.active = true;
      };

      window.addEventListener('deviceorientation', handleOrientation, true);
      interiorOrientationRef.current.cleanup = () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
        interiorOrientationRef.current.active = false;
      };
      interiorAutoDriftRef.current = 0;
    };

    maybeEnableGyro();

    const handlePointerDown = (event) => {
      interiorFallbackViewRef.current = {
        ...interiorFallbackViewRef.current,
        dragging: true,
        lastX: event.clientX,
        lastY: event.clientY,
      };
    };

    const handlePointerUp = () => {
      interiorFallbackViewRef.current = {
        ...interiorFallbackViewRef.current,
        dragging: false,
      };
    };

    const handlePointerMove = (event) => {
      const view = interiorFallbackViewRef.current;
      if (!view.dragging || interiorOrientationRef.current?.active) return;
      const deltaX = event.clientX - view.lastX;
      const deltaY = event.clientY - view.lastY;
      interiorFallbackViewRef.current = {
        ...view,
        yaw: view.yaw - deltaX * 0.002,
        pitch: Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, view.pitch - deltaY * 0.002)),
        lastX: event.clientX,
        lastY: event.clientY,
      };
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

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
      if (interiorOrientationRef.current?.active) {
        camera.quaternion.slerp(interiorOrientationRef.current.quaternion, 0.35);
        sky.mesh.position.copy(camera.position);
        sky.mesh.rotation.set(0, 0, 0);
      } else {
        interiorAutoDriftRef.current += 0.0006;
        const { yaw, pitch } = interiorFallbackViewRef.current;
        camera.rotation.set(pitch, yaw + interiorAutoDriftRef.current, 0, 'YXZ');
        sky.mesh.position.copy(camera.position);
        sky.mesh.rotation.set(0, 0, 0);
      }
      landscape.scatterGroup.rotation.y += 0.0004;
      landscape.scatterGroup.children.forEach((shape, idx) => {
        shape.rotation.x += 0.001 + idx * 0.0002;
        shape.rotation.y += 0.0015;
      });
      renderer.render(scene, camera);
      interiorFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (interiorFrameIdRef.current) cancelAnimationFrame(interiorFrameIdRef.current);
      if (interiorOrientationRef.current?.cleanup) interiorOrientationRef.current.cleanup();
      interiorOrientationRef.current = { active: false, quaternion: new THREE.Quaternion(), cleanup: null };
      miniNetworksRef.current.forEach((network) => {
        network.children.forEach((child) => {
          if (child.material?.map) child.material.map.dispose();
          if (child.material) child.material.dispose();
          if (child.geometry) child.geometry.dispose();
        });
      });
      miniNetworksRef.current = [];
      landscape.dispose();
      sky.dispose();
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

  const handleEnterInterior = () => {
    if (!focusedBubble) return;
    moveCameraToBubbleCenter(focusedBubble, 0.8);
    pendingEntryRef.current = false;
    setIsInteriorOpen(true);
    logEvent(`${focusedBubble.title} ouverte manuellement : immersion 360°.`);
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
    const radius = 1.4 + Math.random() * 0.5;
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
            Sélectionnez une bulle, approchez-la : dès que la caméra touche sa surface, l'immersion 360° s'ouvre sur
            un paysage génératif propre. Le réseau reste présent en toile de fond tandis que les tags et émojis
            gravitent pour rejoindre les bulles.
          </p>
          <div className="control-row">
            <button type="button" className="primary" onClick={resetView}>Revenir au réseau</button>
            <button type="button" className="ghost" onClick={handleExitInterior} disabled={!focusedBubble}>
              Quitter la bulle
            </button>
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
                <span className="chip">Skybox : paysage généré</span>
                <span className="chip">FX : {focusedBubble.fx || 'silence'}</span>
              </div>
              <div className="control-row">
                <button type="button" className="primary" onClick={handleEnterInterior}>
                  Entrer dans la bulle
                </button>
                <button type="button" className="ghost" onClick={handleExitInterior}>
                  Quitter la bulle
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Sélectionnez une bulle du réseau pour ressentir son intériorité.</p>
          )}
        </div>

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
                <span className="chip subtle">Caméra 360° · Gyro</span>
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
