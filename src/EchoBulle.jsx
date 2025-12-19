import React, { useEffect, useRef, useState } from 'react';
import { bubbles } from './data.js';
import { startAmbient } from './audio.js';

const AFRAME_CDN = 'https://aframe.io/releases/1.5.0/aframe.min.js';

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

      el.classList.add('selectable');
      el.addEventListener('click', select);
      el.addEventListener('mouseenter', () => scene?.emit('bubble-hover', { id }));
      el.addEventListener('mouseleave', () => scene?.emit('bubble-hover', { id: null }));

      this.cleanup = () => {
        el.removeEventListener('click', select);
      };
    },
    remove() {
      this.cleanup?.();
    },
  });

  window.AFRAME.registerComponent('sculpture-controls', {
    init() {
      this.canvas = null;
      this.touches = new Map();
      this.startRot = { x: 0, y: 0 };
      this.startScale = 1;
      this.activePointers = new Set();
      this.baseDist = null;

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onWheel = this.onWheel.bind(this);

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
    },
    remove() {
      if (!this.canvas) return;
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('wheel', this.onWheel);
    },
    onPointerDown(e) {
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
      if (this.touches.size < 2) {
        this.baseDist = null;
      }
    },
    onWheel(e) {
      const scale = this.el.object3D.scale.x;
      const next = Math.min(1.6, Math.max(0.55, scale + (e.deltaY > 0 ? -0.05 : 0.05)));
      this.el.object3D.scale.set(next, next, next);
    },
    onPointerMove(e) {
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
  const [mode, setMode] = useState('sculpture');
  const [viewMode, setViewMode] = useState('3d');
  const [selected, setSelected] = useState(null);
  const [xrSupported, setXrSupported] = useState(false);
  const hoverRef = useRef(null);
  const actionsRef = useRef({ enter: null, exit: null });
  const [menuPos, setMenuPos] = useState({ x: 18, y: 18 });
  const dragRef = useRef(null);
  const [menuCollapsed, setMenuCollapsed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    registerComponents();
  }, [ready]);

  useEffect(() => {
    if (!ready || !navigator?.xr?.isSessionSupported) return;
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => setXrSupported(supported));
  }, [ready]);

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
        label.setAttribute('visible', modeRef.current === 'sculpture');
      });
    };

    const selectedRef = { current: null };
    const modeRef = { current: 'sculpture' };

    const selectBubble = (id) => {
      selectedRef.current = id;
      setSelected(id);
      updateSculptureVisuals();
    };

    const setModeValue = (nextMode) => {
      modeRef.current = nextMode;
      setMode(nextMode);
    };

    const showWorld = (id) => {
      const preset = worldPresets[id];
      if (!preset) return;
      sculpture.setAttribute('visible', false);
      worldContainer.setAttribute('visible', true);
      Array.from(worldContainer.children).forEach((child) => {
        child.setAttribute('visible', child.id === `world-${id}`);
      });
      scene.setAttribute('fog', preset.fog);
      setModeValue('monde');
      startAmbient();
    };

    const leaveWorld = () => {
      worldContainer.setAttribute('visible', false);
      sculpture.setAttribute('visible', true);
      scene.removeAttribute('fog');
      setModeValue('sculpture');
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
      if (modeRef.current === 'sculpture') {
        showWorld(selectedRef.current);
      } else {
        leaveWorld();
      }
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

    selectBubble('root');
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
    if (!selected || !worldPresets[selected]) return;
    actionsRef.current.enter?.();
  };

  const exitWorld = () => {
    actionsRef.current.exit?.();
  };

  const selectFromUi = (id) => {
    actionsRef.current.select?.(id);
  };

  const selectedBubble = bubbles.find((b) => b.id === selected);

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

  const twoDNodes = React.useMemo(() => {
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
  }, []);

  const handleMenuDragMove = (e) => {
    if (!dragRef.current) return;
    setMenuPos({
      x: Math.max(8, e.clientX - dragRef.current.offsetX),
      y: Math.max(8, e.clientY - dragRef.current.offsetY),
    });
  };

  const handleMenuDragEnd = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handleMenuDragMove);
    window.removeEventListener('pointerup', handleMenuDragEnd);
  };

  const handleMenuDragStart = (e) => {
    e.preventDefault();
    dragRef.current = {
      offsetX: e.clientX - menuPos.x,
      offsetY: e.clientY - menuPos.y,
    };
    window.addEventListener('pointermove', handleMenuDragMove);
    window.addEventListener('pointerup', handleMenuDragEnd);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleMenuDragMove);
      window.removeEventListener('pointerup', handleMenuDragEnd);
    };
  }, []);

  if (!ready) {
    return <div style={{ padding: '24px', color: 'rgba(227,241,255,0.7)' }}>Chargement de l’espace…</div>;
  }

  const canEnter = selected && worldPresets[selected] && mode === 'sculpture';
  const canExit = mode === 'monde';

  return (
    <div id="aframe-shell" className="immersive-shell">
      <div
        ref={mountRef}
        className="scene-mount"
        style={{ opacity: viewMode === '2d' ? 0 : 1, pointerEvents: viewMode === '2d' ? 'none' : 'auto' }}
      />

      {viewMode === '2d' && (
        <div className="map2d">
          <svg viewBox="0 0 100 100" role="presentation">
            {links.map(({ a, b }) => {
              const from = twoDNodes.find((n) => n.id === a);
              const to = twoDNodes.find((n) => n.id === b);
              if (!from || !to) return null;
              return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="map-link" />;
            })}
            {twoDNodes.map((node) => (
              <g key={node.id} onClick={() => selectFromUi(node.id)} className="map-node" role="button" tabIndex={0}>
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
          <div className="map-legend">Vue 2D · tap pour sélectionner · utilise Entrer / Sortir pour voyager</div>
        </div>
      )}

      <div className="ui-layer">
        <div
          className="floating-menu"
          style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
        >
          <div className="menu-top">
            <div
              className="menu-handle"
              role="presentation"
              onPointerDown={handleMenuDragStart}
            >
              ▤
            </div>
            <div className="menu-views">
              <button type="button" className={viewMode === '2d' ? 'chip active' : 'chip'} onClick={switchTo2d}>
                2D
              </button>
              <button type="button" className={viewMode === '3d' ? 'chip active' : 'chip'} onClick={switchTo3d}>
                3D
              </button>
              {xrSupported && (
                <button type="button" className={viewMode === 'vr' ? 'chip active' : 'chip'} onClick={switchToVr}>
                  VR 360
                </button>
              )}
            </div>
            <button
              type="button"
              className="chip ghost"
              aria-label="Réduire le menu"
              onClick={() => setMenuCollapsed((v) => !v)}
            >
              {menuCollapsed ? '▢' : '—'}
            </button>
          </div>

          {!menuCollapsed && (
            <>
              <div className="menu-section">
                <div className="menu-label">{mode === 'sculpture' ? 'Sculpture' : 'Monde'}</div>
                <div className="menu-title">{selectedBubble?.title || 'Choisis une bulle'}</div>
                <div className="menu-caption">
                  {mode === 'sculpture'
                    ? 'Glisse pour orienter, pince pour zoomer. Tap/trigger pour sélectionner.'
                    : 'Immersion ouverte. Le réseau reste intact, sortie immédiate.'}
                </div>
              </div>

              <div className="menu-actions">
                <button type="button" className={`pill ${canEnter ? '' : 'disabled'}`} onClick={enterSelected} disabled={!canEnter}>
                  Entrer
                </button>
                <button type="button" className={`pill ghost ${canExit ? '' : 'disabled'}`} onClick={exitWorld} disabled={!canExit}>
                  Sortir
                </button>
              </div>
              <div className="menu-hint">Déplace ou replie le menu. Réseau plein écran.</div>
            </>
          )}
        </div>

        <div className="minimal-hints">
          <span className="hint-pill">Mobile : drag/zoom · Tap pour sélectionner</span>
          <span className="hint-pill">VR : grip pour saisir · Trigger pour viser</span>
        </div>
      </div>
    </div>
  );
}
