import React, { useEffect, useRef, useState } from 'react';
import { bubbles } from './data.js';
import { startAmbient } from './audio.js';

const AFRAME_CDN = 'https://aframe.io/releases/1.5.0/aframe.min.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function useDraggablePanel(initial) {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => {
    if (typeof initial === 'function') return initial();
    return initial;
  });
  const dragRef = useRef(null);

  const boundToViewport = (next) => {
    const rect = ref.current?.getBoundingClientRect();
    const width = rect?.width ?? 260;
    const height = rect?.height ?? 120;
    const maxX = Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : width) - width - 8);
    const maxY = Math.max(8, (typeof window !== 'undefined' ? window.innerHeight : height) - height - 8);
    return {
      x: clamp(next.x, 8, maxX),
      y: clamp(next.y, 8, maxY),
    };
  };

  useEffect(() => {
    setPos((current) => boundToViewport(current));
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const { startX, startY, originX, originY, size } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const width = size?.width ?? ref.current?.getBoundingClientRect()?.width ?? 260;
      const height = size?.height ?? ref.current?.getBoundingClientRect()?.height ?? 120;
      const maxX = Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : width) - width - 8);
      const maxY = Math.max(8, (typeof window !== 'undefined' ? window.innerHeight : height) - height - 8);

      setPos({
        x: clamp(originX + dx, 8, maxX),
        y: clamp(originY + dy, 8, maxY),
      });
    };

    const stop = () => {
      dragRef.current = null;
    };

    const reframe = () => setPos((current) => boundToViewport(current));

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('resize', reframe);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('resize', reframe);
    };
  }, []);

  const startDrag = (e) => {
    if (e.button && e.button !== 0) return;
    e.stopPropagation();
    const rect = ref.current?.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x ?? rect?.left ?? 12,
      originY: pos.y ?? rect?.top ?? 12,
      size: rect,
    };
    ref.current?.setPointerCapture?.(e.pointerId);
  };

  return {
    ref,
    position: boundToViewport(pos),
    startDrag,
  };
}

function useAframe() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.AFRAME);

  useEffect(() => {
    if (ready) return;
    const script = document.createElement('script');
    script.src = AFRAME_CDN;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [ready]);

  return ready;
}

const palette = {
  base: '#0b131d',
  ink: '#e3f1ff',
  halo: '#7dc7ff',
  low: '#0a0f18',
  link: '#6286a8',
};

const worldPresets = {
  root: {
    sky: '#0c1a24',
    fog: 'color: #0c1a24; density: 0.02',
    fx: { color: '#9bd7ff', radius: 6.2, count: 34, drift: 0.16 },
  },
  flow: {
    sky: '#0a1d30',
    fog: 'color: #0a1d30; density: 0.022',
    fx: { color: '#8dd2ff', radius: 6, count: 36, drift: 0.18 },
  },
  hollow: {
    sky: '#0c1018',
    fog: 'color: #0c1018; density: 0.028',
    fx: { color: '#c4ffc8', radius: 5.4, count: 30, drift: 0.14 },
  },
  tide: {
    sky: '#0b1b21',
    fog: 'color: #0b1b21; density: 0.02',
    fx: { color: '#b6e8ff', radius: 7.4, count: 42, drift: 0.2 },
  },
  echo: {
    sky: '#0d1426',
    fog: 'color: #0d1426; density: 0.026',
    fx: { color: '#cbb5ff', radius: 5.6, count: 32, drift: 0.16 },
  },
  vein: {
    sky: '#0b161c',
    fog: 'color: #0b161c; density: 0.024',
    fx: { color: '#a1ffe9', radius: 5.2, count: 30, drift: 0.15 },
  },
  moss: {
    sky: '#0c1610',
    fog: 'color: #0c1610; density: 0.024',
    fx: { color: '#a7ffb3', radius: 5.4, count: 28, drift: 0.12 },
  },
  pulse: {
    sky: '#0c1224',
    fog: 'color: #0c1224; density: 0.024',
    fx: { color: '#f5b7ff', radius: 6.4, count: 36, drift: 0.22 },
  },
};

const videoSources = [
  { id: 'kobul-video-1', src: 'https://cdn.aframe.io/videos/360-video/Chamonix/Chamonix_1.mp4' },
  { id: 'kobul-video-2', src: 'https://cdn.aframe.io/videos/bunny.mp4' },
];

function registerComponents() {
  if (!window.AFRAME || window.AFRAME.components['gentle-float']) return;

  window.AFRAME.registerComponent('gentle-float', {
    schema: { amp: { default: 0.08 }, speed: { default: 0.35 } },
    init() {
      this.t = Math.random() * Math.PI * 2;
      this.baseY = this.el.object3D.position.y;
    },
    tick(time, dt) {
      const delta = (dt / 1000) * this.data.speed;
      this.t += delta;
      const offset = Math.sin(this.t) * this.data.amp;
      this.el.object3D.position.y = this.baseY + offset;
    },
  });

  window.AFRAME.registerComponent('face-camera', {
    tick() {
      const camera = this.el.sceneEl?.camera;
      if (!camera) return;
      this.el.object3D.lookAt(camera.position);
    },
  });

  window.AFRAME.registerComponent('soft-pulse', {
    schema: { base: { default: 1 }, boost: { default: 0.08 } },
    tick(time) {
      const pulse = this.data.base + Math.sin(time / 1200) * this.data.boost;
      this.el.object3D.scale.set(pulse, pulse, pulse);
    },
  });

  window.AFRAME.registerComponent('firefly-field', {
    schema: {
      count: { default: 36 },
      radius: { default: 6 },
      color: { default: '#8dd2ff' },
      drift: { default: 0.18 },
    },
    init() {
      this.nodes = [];
      for (let i = 0; i < this.data.count; i += 1) {
        const r = Math.random() * this.data.radius * 0.8 + this.data.radius * 0.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        const node = document.createElement('a-sphere');
        node.setAttribute('radius', 0.06 + Math.random() * 0.05);
        node.setAttribute('color', this.data.color);
        node.setAttribute(
          'material',
          `opacity: 0.32; transparent: true; emissive: ${this.data.color}; emissiveIntensity: 0.28; roughness: 0.1; metalness: 0`
        );
        node.setAttribute('position', `${x} ${y} ${z}`);

        this.nodes.push({
          el: node,
          pos: { x, y, z },
          vel: {
            x: (Math.random() - 0.5) * 0.03,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.03,
          },
          phase: Math.random() * Math.PI * 2,
        });

        this.el.appendChild(node);
      }
    },
    tick(time, dt) {
      const delta = Math.min(dt || 16, 40) / 1000;
      const maxSpeed = 0.18;
      this.nodes.forEach((node) => {
        const ax = (Math.random() - 0.5) * this.data.drift * 0.008;
        const ay = (Math.random() - 0.5) * this.data.drift * 0.006;
        const az = (Math.random() - 0.5) * this.data.drift * 0.008;

        node.vel.x = (node.vel.x + ax) * 0.96;
        node.vel.y = (node.vel.y + ay) * 0.96;
        node.vel.z = (node.vel.z + az) * 0.96;

        const speed = Math.hypot(node.vel.x, node.vel.y, node.vel.z);
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          node.vel.x *= scale;
          node.vel.y *= scale;
          node.vel.z *= scale;
        }

        node.pos.x += node.vel.x * delta;
        node.pos.y += node.vel.y * delta;
        node.pos.z += node.vel.z * delta;

        const dist = Math.hypot(node.pos.x, node.pos.y, node.pos.z);
        if (dist > this.data.radius) {
          const pull = this.data.radius / dist;
          node.pos.x *= pull;
          node.pos.y *= pull;
          node.pos.z *= pull;
          node.vel.x *= -0.4;
          node.vel.y *= -0.4;
          node.vel.z *= -0.4;
        }

        const glow = 0.9 + Math.sin(time / 1100 + node.phase) * 0.12;
        node.el.object3D.scale.set(glow, glow, glow);
        node.el.setAttribute('position', `${node.pos.x} ${node.pos.y} ${node.pos.z}`);
      });
    },
  });

  window.AFRAME.registerComponent('slow-spin', {
    schema: { speed: { default: 0.02 } },
    tick(time, dt) {
      const rot = this.el.object3D.rotation;
      rot.y += (this.data.speed * dt) / 1000;
    },
  });

  window.AFRAME.registerComponent('portal-node', {
    schema: { id: { type: 'string' } },
    init() {
      const { id } = this.data;
      const el = this.el;
      const scene = el.sceneEl;

      const select = () => scene?.emit('bubble-selected', { id });
      const down = (e) => scene?.emit('bubble-pointer', { id, type: 'down', pointerId: e.pointerId });
      const up = (e) => scene?.emit('bubble-pointer', { id, type: 'up', pointerId: e.pointerId });

      el.classList.add('selectable');
      el.addEventListener('click', select);
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('mouseenter', () => scene?.emit('bubble-hover', { id }));
      el.addEventListener('mouseleave', () => scene?.emit('bubble-hover', { id: null }));

      this.cleanup = () => {
        el.removeEventListener('click', select);
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointerup', up);
      };
    },
    remove() {
      this.cleanup?.();
    },
  });

  window.AFRAME.registerComponent('sculpture-controls', {
    schema: { enabled: { default: true } },
    init() {
      this.canvas = null;
      this.touches = new Map();
      this.startRot = { x: 0, y: 0 };
      this.startScale = 1;
      this.activePointers = new Set();
      this.baseDist = null;
      this.bubblePointers = new Set();

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onWheel = this.onWheel.bind(this);
      this.handleBubblePointer = this.handleBubblePointer.bind(this);

      const scene = this.el.sceneEl;
      const bindCanvas = () => {
        if (this.canvas || !scene?.canvas) return;
        this.canvas = scene.canvas;
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('wheel', this.onWheel, { passive: true });
      };

      this.el.addEventListener('loaded', bindCanvas);
      bindCanvas();
      scene?.addEventListener('bubble-pointer', this.handleBubblePointer);
    },
    update(oldData) {
      if (oldData?.enabled !== this.data.enabled) {
        this.activePointers.clear();
        this.touches.clear();
        this.baseDist = null;
      }
    },
    remove() {
      if (this.canvas) {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        this.canvas.removeEventListener('wheel', this.onWheel);
      }
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointermove', this.onPointerMove);
      this.el.sceneEl?.removeEventListener('bubble-pointer', this.handleBubblePointer);
    },
    handleBubblePointer(e) {
      const { pointerId, type } = e.detail || {};
      if (!pointerId) return;
      if (type === 'down') this.bubblePointers.add(pointerId);
      if (type === 'up') this.bubblePointers.delete(pointerId);
    },
    onPointerDown(e) {
      if (!this.data.enabled) return;
      if (this.bubblePointers.has(e.pointerId)) return;
      this.activePointers.add(e.pointerId);
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.startRot = { ...this.el.object3D.rotation };
      this.startScale = this.el.object3D.scale.x;
      if (this.touches.size < 2) {
        this.baseDist = null;
      }
    },
    onPointerUp(e) {
      this.activePointers.delete(e.pointerId);
      this.touches.delete(e.pointerId);
      this.bubblePointers.delete(e.pointerId);
      if (this.touches.size < 2) {
        this.baseDist = null;
      }
    },
    onWheel(e) {
      if (!this.data.enabled) return;
      const scale = this.el.object3D.scale.x;
      const next = Math.min(1.6, Math.max(0.55, scale + (e.deltaY > 0 ? -0.05 : 0.05)));
      this.el.object3D.scale.set(next, next, next);
    },
    onPointerMove(e) {
      if (!this.data.enabled) return;
      if (!this.activePointers.has(e.pointerId)) return;
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const points = Array.from(this.touches.values());
      if (points.length === 1) {
        const dx = e.movementX * 0.25;
        const dy = e.movementY * 0.22;
        const rot = this.el.object3D.rotation;
        rot.y += (dx * Math.PI) / 180;
        rot.x += (dy * Math.PI) / 180;
      } else if (points.length >= 2) {
        const [a, b] = points;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (!this.baseDist) {
          this.baseDist = dist;
          this.startScale = this.el.object3D.scale.x;
        }
        const factor = Math.min(1.6, Math.max(0.55, (dist / this.baseDist) * this.startScale));
        this.el.object3D.scale.set(factor, factor, factor);
      }
    },
  });
}

function collectLinks() {
  const set = new Set();
  bubbles.forEach((b) => {
    b.links.forEach((link) => {
      const key = [b.id, link].sort().join('::');
      set.add(key);
    });
  });
  return Array.from(set).map((key) => {
    const [a, b] = key.split('::');
    return { a, b };
  });
}

const links = collectLinks();

export default function EchoBulle() {
  const ready = useAframe();
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const sculptureRef = useRef(null);
  const worldContainerRef = useRef(null);
  const bubbleRefs = useRef(new Map());
  const [spaceMode, setSpaceMode] = useState('reseau');
  const [viewMode, setViewMode] = useState('2d');
  const [selected, setSelected] = useState(null);
  const [xrSupported, setXrSupported] = useState(false);
  const hoverRef = useRef(null);
  const actionsRef = useRef({ enter: null, exit: null, select: null });
  const inputLockedRef = useRef(false);

  const [mapNodes, setMapNodes] = useState(() => {
    const xs = bubbles.map((b) => b.position.x);
    const zs = bubbles.map((b) => b.position.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const spanX = maxX - minX || 1;
    const spanZ = maxZ - minZ || 1;
    return bubbles.map((b) => ({
      id: b.id,
      title: b.title,
      level: b.level,
      x: ((b.position.x - minX) / spanX) * 100,
      y: ((b.position.z - minZ) / spanZ) * 100,
      links: b.links,
    }));
  });
  const [mapScale, setMapScale] = useState(1);
  const mapScaleRef = useRef(1);
  const mapRef = useRef(null);
  const mapTouchesRef = useRef(new Map());
  const mapDragRef = useRef({ id: null, pointerId: null, moved: false });
  const pinchRef = useRef({ base: null, start: 1 });
  const viewPanel = useDraggablePanel({ x: 16, y: 16 });
  const actionPanel = useDraggablePanel(() => ({
    x: 16,
    y: (typeof window !== 'undefined' ? window.innerHeight : 760) - 190,
  }));

  useEffect(() => {
    if (!ready) return;
    registerComponents();
  }, [ready]);

  useEffect(() => {
    if (!ready || !navigator?.xr?.isSessionSupported) return;
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => setXrSupported(supported));
  }, [ready]);

  useEffect(() => {
    if (!sculptureRef.current) return;
    const enabled = viewMode !== '2d' && spaceMode === 'reseau';
    sculptureRef.current.setAttribute('sculpture-controls', `enabled: ${enabled}`);
  }, [viewMode, spaceMode]);

  useEffect(() => {
    if (!sceneRef.current) return;
    if (viewMode === 'vr') {
      sceneRef.current.enterVR?.();
    } else {
      sceneRef.current.exitVR?.();
    }
  }, [viewMode]);

  useEffect(() => {
    if (!ready || !mountRef.current) return;

    const scene = document.createElement('a-scene');
    scene.setAttribute('background', `color: ${palette.base}`);
    scene.setAttribute('renderer', 'colorManagement: true; antialias: true; foveationLevel: 2; xrCompatible: true');
    scene.setAttribute('vr-mode-ui', 'enabled: true');
    scene.setAttribute('webxr', 'optionalFeatures: local-floor, bounded-floor, hand-tracking, dom-overlay; overlayElement: #aframe-shell');

    const assets = document.createElement('a-assets');
    videoSources.forEach((video) => {
      const videoEl = document.createElement('video');
      videoEl.setAttribute('id', video.id);
      videoEl.setAttribute('src', video.src);
      videoEl.setAttribute('autoplay', 'true');
      videoEl.setAttribute('loop', 'true');
      videoEl.setAttribute('muted', 'true');
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('preload', 'auto');
      videoEl.setAttribute('crossorigin', 'anonymous');
      videoEl.autoplay = true;
      assets.appendChild(videoEl);
    });
    scene.appendChild(assets);

    const cameraRig = document.createElement('a-entity');
    cameraRig.id = 'cameraRig';
    cameraRig.setAttribute('position', '0 1.6 4.2');
    const camera = document.createElement('a-entity');
    camera.id = 'camera';
    camera.setAttribute('camera', 'active: true');
    camera.setAttribute('look-controls', 'pointerLockEnabled: false');
    camera.setAttribute('wasd-controls', 'acceleration: 8');
    const cursor = document.createElement('a-entity');
    cursor.setAttribute('cursor', 'fuse: true; fuseTimeout: 1200');
    cursor.setAttribute('raycaster', 'objects: .selectable');
    cursor.setAttribute('position', '0 0 -0.9');
    cursor.setAttribute('geometry', 'primitive: ring; radiusInner: 0.01; radiusOuter: 0.016');
    cursor.setAttribute('material', `color: ${palette.halo}; opacity: 0.45`);
    cursor.setAttribute('soft-pulse', 'base: 1; boost: 0.06');
    camera.appendChild(cursor);
    cameraRig.appendChild(camera);
    scene.appendChild(cameraRig);

    const sculpture = document.createElement('a-entity');
    sculpture.id = 'sculpture';
    sculpture.setAttribute('position', '0 0 0');
    sculpture.setAttribute('sculpture-controls', '');

    links.forEach(({ a, b }) => {
      const from = bubbles.find((n) => n.id === a);
      const to = bubbles.find((n) => n.id === b);
      if (!from || !to) return;
      const link = document.createElement('a-entity');
      link.dataset.link = `${a}::${b}`;
      link.setAttribute('line', `start: ${from.position.x} ${from.position.y} ${from.position.z}; end: ${to.position.x} ${to.position.y} ${to.position.z}; color: ${palette.link}`);
      link.setAttribute('material', 'opacity: 0.32');
      sculpture.appendChild(link);
    });

    bubbles.forEach((bubble) => {
      const { id, title, level, position } = bubble;
      const wrapper = document.createElement('a-entity');
      wrapper.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
      wrapper.setAttribute('gentle-float', `amp: ${0.05 + level * 0.015}; speed: ${0.25 + level * 0.06}`);

      const sphere = document.createElement('a-sphere');
      sphere.className = 'selectable';
      sphere.setAttribute('radius', '0.32');
      sphere.setAttribute('color', palette.halo);
      sphere.setAttribute('portal-node', `id: ${id}`);
      sphere.setAttribute('soft-pulse', 'base: 1; boost: 0.05');
      sphere.setAttribute('material', `roughness: 0.32; metalness: 0.04; opacity: 0.72; transparent: true; emissive: ${palette.halo}; emissiveIntensity: 0.22`);

      const label = document.createElement('a-entity');
      label.setAttribute('position', '0 -0.52 0');
      label.setAttribute('face-camera', '');
      label.setAttribute('text', `value: ${title}\nNiveau ${level}; align: center; color: ${palette.ink}; opacity: 0.8; width: 2`);

      wrapper.appendChild(sphere);
      wrapper.appendChild(label);
      sculpture.appendChild(wrapper);

      bubbleRefs.current.set(id, { wrapper, sphere, label, level });
    });

    const worldContainer = document.createElement('a-entity');
    worldContainer.id = 'world-container';
    worldContainer.setAttribute('visible', false);

    Object.entries(worldPresets).forEach(([id, config]) => {
      const world = document.createElement('a-entity');
      world.id = `world-${id}`;
      world.setAttribute('visible', false);

      const sky = document.createElement('a-sphere');
      sky.setAttribute('radius', '42');
      sky.setAttribute('position', '0 1.6 0');
      sky.setAttribute('material', `side: back; color: ${config.sky}; opacity: 0.92; roughness: 1`);

      const fogShell = document.createElement('a-entity');
      fogShell.setAttribute('geometry', 'primitive: sphere; radius: 30');
      fogShell.setAttribute('material', `color: ${config.sky}; side: back; opacity: 0.35; transparent: true`);

      const fx = document.createElement('a-entity');
      fx.setAttribute('firefly-field', `count: ${config.fx.count}; radius: ${config.fx.radius}; color: ${config.fx.color}; drift: ${config.fx.drift}`);

      const videoGroup = document.createElement('a-entity');
      const cubePositions = [
        { x: -1.4, y: 1.2, z: -2.6 },
        { x: 1.3, y: 1.6, z: -2.4 },
        { x: 0, y: 0.9, z: -3.1 },
      ];

      cubePositions.forEach((pos, idx) => {
        const cube = document.createElement('a-box');
        cube.setAttribute('depth', '0.9');
        cube.setAttribute('height', '0.9');
        cube.setAttribute('width', '0.9');
        cube.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
        cube.setAttribute('rotation', `${-6 + idx * 3} ${idx * 20} ${4 - idx * 2}`);
        cube.setAttribute('material', `src: #${videoSources[idx % videoSources.length].id}; roughness: 0.4; metalness: 0.08; opacity: 0.95`);
        cube.setAttribute('gentle-float', 'amp: 0.06; speed: 0.22');
        cube.setAttribute('slow-spin', `speed: ${0.2 + idx * 0.05}`);
        videoGroup.appendChild(cube);
      });

      world.appendChild(sky);
      world.appendChild(fogShell);
      world.appendChild(fx);
      world.appendChild(videoGroup);
      worldContainer.appendChild(world);
    });

    scene.appendChild(sculpture);
    scene.appendChild(worldContainer);

    const updateSculptureVisuals = () => {
      const hoverId = hoverRef.current;
      bubbleRefs.current.forEach(({ sphere, label, level }, bubbleId) => {
        const selectedId = selectedRef.current;
        const isSelected = bubbleId === selectedId;
        const isHover = bubbleId === hoverId;
        const opacity = isSelected ? 0.95 : isHover ? 0.85 : 0.65;
        const emissive = isSelected ? 0.42 : isHover ? 0.32 : 0.18;
        const scale = isSelected ? 1.22 : isHover ? 1.1 : 1;
        sphere.setAttribute('material', `roughness: 0.32; metalness: 0.04; opacity: ${opacity}; transparent: true; emissive: ${palette.halo}; emissiveIntensity: ${emissive}`);
        sphere.setAttribute('soft-pulse', `base: ${scale}; boost: 0.05`);
        label.setAttribute('visible', spaceModeRef.current === 'reseau');
      });
    };

    const selectedRef = { current: null };
    const spaceModeRef = { current: 'reseau' };

    const selectBubble = (id) => {
      if (inputLockedRef.current) return;
      const alreadySelected = selectedRef.current === id;
      selectedRef.current = id;
      setSelected(id);
      updateSculptureVisuals();
      if (alreadySelected && worldPresets[id] && spaceModeRef.current === 'reseau') {
        showWorld(id);
      }
    };

    const setSpaceValue = (nextMode) => {
      spaceModeRef.current = nextMode;
      setSpaceMode(nextMode);
    };

    const showWorld = (id) => {
      const preset = worldPresets[id];
      if (!preset || inputLockedRef.current) return;
      inputLockedRef.current = true;
      setTimeout(() => {
        inputLockedRef.current = false;
      }, 420);
      sculpture.setAttribute('visible', false);
      worldContainer.setAttribute('visible', true);
      Array.from(worldContainer.children).forEach((child) => {
        child.setAttribute('visible', child.id === `world-${id}`);
      });
      scene.setAttribute('fog', preset.fog);
      setSpaceValue('bulle');
      startAmbient();
    };

    const leaveWorld = () => {
      if (inputLockedRef.current) return;
      inputLockedRef.current = true;
      setTimeout(() => {
        inputLockedRef.current = false;
      }, 320);
      worldContainer.setAttribute('visible', false);
      sculpture.setAttribute('visible', true);
      scene.removeAttribute('fog');
      setSpaceValue('reseau');
      updateSculptureVisuals();
    };

    actionsRef.current = {
      enter: () => showWorld(selectedRef.current),
      exit: leaveWorld,
      select: selectBubble,
    };

    const handleSelect = (e) => selectBubble(e.detail.id);
    const handleHover = (e) => {
      hoverRef.current = e.detail.id;
      updateSculptureVisuals();
    };

    const handleControllerEnter = () => {
      if (spaceModeRef.current === 'reseau') showWorld(selectedRef.current);
      else leaveWorld();
    };

    const handleEnterVr = () => setViewMode('vr');
    const handleExitVr = () => setViewMode('3d');

    scene.addEventListener('bubble-selected', handleSelect);
    scene.addEventListener('bubble-hover', handleHover);
    scene.addEventListener('abuttondown', handleControllerEnter);
    scene.addEventListener('xbuttondown', handleControllerEnter);
    scene.addEventListener('enter-vr', handleEnterVr);
    scene.addEventListener('exit-vr', handleExitVr);

    sceneRef.current = scene;
    sculptureRef.current = sculpture;
    worldContainerRef.current = worldContainer;
    mountRef.current.appendChild(scene);

    selectBubble('flow');
    updateSculptureVisuals();

    return () => {
      scene.removeEventListener('bubble-selected', handleSelect);
      scene.removeEventListener('bubble-hover', handleHover);
      scene.removeEventListener('abuttondown', handleControllerEnter);
      scene.removeEventListener('xbuttondown', handleControllerEnter);
      scene.removeEventListener('enter-vr', handleEnterVr);
      scene.removeEventListener('exit-vr', handleExitVr);
      mountRef.current?.removeChild(scene);
      bubbleRefs.current.clear();
      sceneRef.current = null;
      sculptureRef.current = null;
      worldContainerRef.current = null;
    };
  }, [ready]);

  const enterSelected = () => {
    if (!selected || !worldPresets[selected] || inputLockedRef.current) return;
    actionsRef.current.enter?.();
  };

  const exitWorld = () => {
    actionsRef.current.exit?.();
  };

  const switchTo2d = () => {
    setViewMode('2d');
    sceneRef.current?.exitVR?.();
  };

  const switchTo3d = () => {
    setViewMode('3d');
    sceneRef.current?.exitVR?.();
  };

  const switchToVr = () => {
    setViewMode('vr');
    sceneRef.current?.enterVR?.();
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const updateMapScale = (next) => {
    mapScaleRef.current = next;
    setMapScale(next);
  };

  const svgCoords = (clientX, clientY) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width / mapScaleRef.current) * 100;
    const y = ((clientY - rect.top) / rect.height / mapScaleRef.current) * 100;
    return { x: clamp(x, 2, 98), y: clamp(y, 2, 98) };
  };

  const releaseMapListeners = () => {
    window.removeEventListener('pointermove', handleMapPointerMove);
    window.removeEventListener('pointerup', handleMapPointerUp);
  };

  const handleMapWheel = (e) => {
    e.preventDefault();
    const next = clamp(mapScaleRef.current + (e.deltaY > 0 ? -0.06 : 0.06), 0.7, 1.6);
    updateMapScale(next);
  };

  const handleMapPointerMove = (e) => {
    if (!mapTouchesRef.current.has(e.pointerId)) return;
    mapTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const activeTouches = Array.from(mapTouchesRef.current.values());

    if (activeTouches.length >= 2) {
      const [a, b] = activeTouches;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchRef.current.base) {
        pinchRef.current.base = dist;
        pinchRef.current.start = mapScaleRef.current;
      } else {
        const next = clamp((dist / pinchRef.current.base) * pinchRef.current.start, 0.7, 1.6);
        updateMapScale(next);
      }
      mapDragRef.current = { id: null, pointerId: null, moved: false };
      return;
    }

    if (mapDragRef.current?.id && mapDragRef.current.pointerId === e.pointerId) {
      const coords = svgCoords(e.clientX, e.clientY);
      if (!coords) return;
      mapDragRef.current.moved = true;
      setMapNodes((prev) =>
        prev.map((node) => (node.id === mapDragRef.current.id ? { ...node, ...coords } : node))
      );
    }
  };

  const enterFrom2d = (id) => {
    if (!id || inputLockedRef.current) return;
    actionsRef.current.select?.(id);
    if (worldPresets[id]) {
      actionsRef.current.enter?.();
    }
  };

  const handleMapPointerUp = (e) => {
    mapTouchesRef.current.delete(e.pointerId);
    if (mapTouchesRef.current.size < 2) {
      pinchRef.current.base = null;
    }
    if (mapDragRef.current?.pointerId === e.pointerId) {
      const drag = mapDragRef.current;
      if (!drag.moved) {
        enterFrom2d(drag.id);
      }
      mapDragRef.current = { id: null, pointerId: null, moved: false };
    }
    if (mapTouchesRef.current.size === 0) {
      releaseMapListeners();
    }
  };

  const handleNodePointerDown = (id) => (e) => {
    e.preventDefault();
    mapTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    mapDragRef.current = { id, pointerId: e.pointerId, moved: false };
    window.addEventListener('pointermove', handleMapPointerMove);
    window.addEventListener('pointerup', handleMapPointerUp);
  };

  const handleMapBackgroundPointerDown = (e) => {
    if (e.target?.closest('[data-node]')) return;
    e.preventDefault();
    mapTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    mapDragRef.current = { id: null, pointerId: null, moved: false };
    window.addEventListener('pointermove', handleMapPointerMove);
    window.addEventListener('pointerup', handleMapPointerUp);
  };

  useEffect(() => () => releaseMapListeners(), []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (spaceMode === 'reseau') {
        e.preventDefault();
        enterSelected();
      } else if (spaceMode === 'bulle') {
        e.preventDefault();
        exitWorld();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [spaceMode, enterSelected, exitWorld]);

  if (!ready) {
    return <div style={{ padding: '24px', color: 'rgba(227,241,255,0.7)' }}>Chargement de l’espace…</div>;
  }

  const canEnter = selected && worldPresets[selected] && spaceMode === 'reseau' && !inputLockedRef.current;
  const canExit = spaceMode === 'bulle';
  const sceneVisible = viewMode !== '2d' || spaceMode === 'bulle';
  const selectedBubble = bubbles.find((b) => b.id === selected);
  const selectionMeta = spaceMode === 'bulle'
    ? 'Immersion ouverte · bouton ou Entrée pour revenir'
    : worldPresets[selected]
      ? 'Prêt à traverser · double tap / Entrée / manette'
      : 'Choisis une bulle habitée pour entrer';

  return (
    <div id="aframe-shell" className="immersive-shell">
      <div
        ref={mountRef}
        className="scene-mount"
        style={{ opacity: sceneVisible ? 1 : 0, pointerEvents: sceneVisible ? 'auto' : 'none' }}
      />

      {viewMode === '2d' && spaceMode === 'reseau' && (
        <div className="map2d" onWheel={handleMapWheel}>
          <svg
            ref={mapRef}
            viewBox="0 0 100 100"
            role="presentation"
            onPointerDown={handleMapBackgroundPointerDown}
            style={{ transform: `scale(${mapScale})` }}
          >
            {links.map(({ a, b }) => {
              const from = mapNodes.find((n) => n.id === a);
              const to = mapNodes.find((n) => n.id === b);
              if (!from || !to) return null;
              return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="map-link" />;
            })}
            {mapNodes.map((node) => (
              <g
                key={node.id}
                data-node
                onPointerDown={handleNodePointerDown(node.id)}
                className="map-node"
                role="button"
                tabIndex={0}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={8 + node.level * 2}
                  className={selected === node.id ? 'map-bubble active' : 'map-bubble'}
                />
                <text x={node.x} y={node.y + 0.6} className="map-label">
                  {node.title}
                </text>
              </g>
            ))}
          </svg>
          <div className="map-overlay">Tap court pour entrer · pinch/molette pour zoomer · glisse une bulle pour réorganiser</div>
        </div>
      )}

      <div className="ui-layer">
        <div
          className="floating-panel view-toggle"
          ref={viewPanel.ref}
          style={{ left: viewPanel.position.x, top: viewPanel.position.y }}
        >
          <div className="panel-handle" onPointerDown={viewPanel.startDrag} aria-label="Déplacer le menu des vues" />
          <div className="panel-actions">
            <button type="button" className={viewMode === '2d' ? 'chip active' : 'chip'} onClick={switchTo2d}>
              2D
            </button>
            <button type="button" className={viewMode === '3d' ? 'chip active' : 'chip'} onClick={switchTo3d}>
              3D
            </button>
            {xrSupported && (
              <button type="button" className={viewMode === 'vr' ? 'chip active' : 'chip'} onClick={switchToVr}>
                VR
              </button>
            )}
          </div>
        </div>

        <div
          className="floating-panel action-dock"
          ref={actionPanel.ref}
          style={{ left: actionPanel.position.x, top: actionPanel.position.y }}
        >
          <div className="panel-handle" onPointerDown={actionPanel.startDrag} aria-label="Déplacer le dock d'action" />
          <div className="action-body">
            <div className="action-info">
              <div className="action-title">{selectedBubble?.title ?? 'Choisis une bulle'}</div>
              <div className="action-meta">{selectionMeta}</div>
            </div>
            <div className="action-buttons">
              {spaceMode === 'bulle' ? (
                <button type="button" className="pill" onClick={exitWorld} disabled={!canExit}>
                  Retour réseau
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`pill ${canEnter ? '' : 'disabled'}`}
                    onClick={enterSelected}
                    disabled={!canEnter}
                  >
                    Entrer dans la bulle
                  </button>
                  <button
                    type="button"
                    className={viewMode === '2d' ? 'pill ghost active-light' : 'pill ghost'}
                    onClick={switchTo3d}
                    disabled={viewMode === '3d'}
                  >
                    Vue spatiale
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
