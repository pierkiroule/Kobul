import React, { useEffect, useRef, useState } from 'react';
import { bubbles, relatedIds } from './data.js';
import { startAmbient, getAudioDynamics } from './audio.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function useDraggablePanel(initial) {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => (typeof initial === 'function' ? initial() : initial));
  const dragRef = useRef(null);

  const bound = (next) => {
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
    setPos((p) => bound(p));
  }, []);

  useEffect(() => {
    const move = (e) => {
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

    const reframe = () => setPos((current) => bound(current));

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('resize', reframe);
    return () => {
      window.removeEventListener('pointermove', move);
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

  return { ref, position: bound(pos), startDrag };
}

const palette = {
  base: '#0b131d',
  ink: '#e3f1ff',
  halo: '#7dc7ff',
  low: '#0a0f18',
  link: '#6286a8',
};

const bubblePalettes = {
  root: '#7dc7ff',
  flow: '#8dd2ff',
  hollow: '#c4ffc8',
  tide: '#b6e8ff',
  echo: '#cbb5ff',
  vein: '#a1ffe9',
  moss: '#a7ffb3',
  pulse: '#f5b7ff',
};

function NavPad({ onCommand, speed, onSpeed }) {
  const { ref, position, startDrag } = useDraggablePanel({ x: 16, y: 16 });
  const arrows = [
    { label: '↖', action: { forward: true, left: true } },
    { label: '↑', action: { forward: true } },
    { label: '↗', action: { forward: true, right: true } },
    { label: '←', action: { left: true } },
    { label: '◎', action: { stop: true } },
    { label: '→', action: { right: true } },
    { label: '↙', action: { backward: true, left: true } },
    { label: '↓', action: { backward: true } },
    { label: '↘', action: { backward: true, right: true } },
  ];

  const handlePress = (cmd) => (e) => {
    e.preventDefault();
    onCommand({ ...cmd, active: true });
  };

  const handleRelease = (cmd) => () => {
    onCommand({ ...cmd, active: false });
  };

  return (
    <div className="floating-panel nav-pad" ref={ref} style={{ left: position.x, top: position.y }}>
      <div className="panel-handle" onPointerDown={startDrag} />
      <p className="action-title" style={{ margin: '0 0 6px 2px' }}>
        Vol libre
      </p>
      <div className="nav-pad__content">
        <div className="nav-pad__grid">
          {arrows.map((item, idx) => (
            <button
              key={item.label + idx}
              className="nav-btn"
              onPointerDown={handlePress(item.action)}
              onPointerUp={handleRelease(item.action)}
              onPointerCancel={handleRelease(item.action)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="nav-pad__vertical">
          <button
            className="nav-btn"
            onPointerDown={handlePress({ up: true })}
            onPointerUp={handleRelease({ up: true })}
            onPointerCancel={handleRelease({ up: true })}
          >
            ⇑
          </button>
          <div className="nav-pad__origin">Alt.</div>
          <button
            className="nav-btn"
            onPointerDown={handlePress({ down: true })}
            onPointerUp={handleRelease({ down: true })}
            onPointerCancel={handleRelease({ down: true })}
          >
            ⇓
          </button>
        </div>
      </div>
      <div className="nav-speed">
        <div className="nav-speed__label">Variateur</div>
        <input
          type="range"
          min="0.4"
          max="3"
          step="0.05"
          value={speed}
          onChange={(e) => onSpeed(parseFloat(e.target.value))}
        />
        <div className="nav-speed__value">{speed.toFixed(2)}x</div>
      </div>
    </div>
  );
}

function BubbleList({ active, onSelect }) {
  const { ref, position, startDrag } = useDraggablePanel({ x: () => window.innerWidth - 360, y: 16 });
  return (
    <div className="floating-panel action-dock" ref={ref} style={{ left: position.x, top: position.y }}>
      <div className="panel-handle" onPointerDown={startDrag} />
      <div className="action-body">
        <div className="action-info">
          <p className="action-title">Constellation</p>
          <p className="action-meta">Choisis une bulle à rejoindre doucement.</p>
        </div>
        <div className="bubble-list">
          {bubbles.map((bubble) => (
            <button
              key={bubble.id}
              className={`pill ${active === bubble.id ? 'pill--primary' : ''}`}
              onClick={() => onSelect(bubble.id)}
            >
              {bubble.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const { ref, position, startDrag } = useDraggablePanel({ x: 16, y: 240 });
  return (
    <div className="floating-panel scene-legend" ref={ref} style={{ left: position.x, top: position.y }}>
      <div className="panel-handle" onPointerDown={startDrag} />
      <p className="action-title">Respire</p>
      <p className="legend-line">Sur desktop : ZQSD ou flèches + drag pour orienter.</p>
      <p className="legend-line">Sur tactile : pad pour glisser, pincement pour zoom.</p>
      <p className="legend-line">Les halos réagissent au souffle sonore.</p>
    </div>
  );
}

export default function EchoBulle() {
  const mountRef = useRef(null);
  const [activeId, setActiveId] = useState('root');
  const [speed, setSpeed] = useState(1.2);
  const controlState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    pitch: 0,
    yaw: 0,
  });
  const speedRef = useRef(speed);
  const highlightRef = useRef(activeId);
  const dragLookRef = useRef(null);
  const pinchRef = useRef(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    highlightRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    startAmbient();
    let renderer;
    let scene;
    let camera;
    let rig;
    let frame;
    let cleanup = () => {};
    let THREE;

    const init = async () => {
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js');
      if (!mountRef.current) return;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setClearColor(0x050a12, 1);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0f18, 0.028);

      camera = new THREE.PerspectiveCamera(
        64,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.08,
        200
      );
      rig = new THREE.Object3D();
      rig.position.set(0, 1.6, 4.4);
      rig.add(camera);
      scene.add(rig);

      const hemi = new THREE.HemisphereLight(0xb5d6ff, 0x0a0f18, 0.65);
      const glowLight = new THREE.PointLight(0x7dc7ff, 3, 12, 2);
      glowLight.position.set(0, 1.4, -1.2);
      scene.add(hemi, glowLight);

      const materials = {};
      const bubbleMeshes = new Map();
      bubbles.forEach((bubble) => {
        const color = new THREE.Color(bubblePalettes[bubble.id] || palette.halo);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color.clone().multiplyScalar(0.16),
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.92,
        });
        materials[bubble.id] = mat;
        const geo = new THREE.SphereGeometry(0.36 + bubble.level * 0.08, 54, 48);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bubble.position.x, bubble.position.y, bubble.position.z);
        mesh.userData = { id: bubble.id };
        scene.add(mesh);
        bubbleMeshes.set(bubble.id, mesh);

        const ringGeo = new THREE.RingGeometry(0.62, 0.7, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          opacity: 0.24,
          transparent: true,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(mesh.position);
        scene.add(ring);
      });

      const linkPoints = [];
      bubbles.forEach((bubble) => {
        bubble.links?.forEach((linked) => {
          const a = bubbleMeshes.get(bubble.id);
          const b = bubbleMeshes.get(linked);
          if (!a || !b) return;
          linkPoints.push(a.position.x, a.position.y, a.position.z);
          linkPoints.push(b.position.x, b.position.y, b.position.z);
        });
      });
      const linkGeo = new THREE.BufferGeometry();
      linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPoints, 3));
      const linkMat = new THREE.LineBasicMaterial({ color: 0x4d6b86, transparent: true, opacity: 0.5 });
      const links = new THREE.LineSegments(linkGeo, linkMat);
      scene.add(links);

      const dustGeo = new THREE.BufferGeometry();
      const dustCount = 420;
      const dustArray = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        const r = Math.random() * 10 + 2.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        dustArray[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dustArray[i * 3 + 1] = r * Math.cos(phi);
        dustArray[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustArray, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0x7dc7ff,
        size: 0.04,
        transparent: true,
        opacity: 0.18,
      });
      const dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust);

      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0x85e1ff,
        opacity: 0.18,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const ribbonGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-3.2, 1.2, -5.2),
          new THREE.Vector3(-1.2, 2.4, -3.8),
          new THREE.Vector3(1.6, 1.6, -4.2),
          new THREE.Vector3(3.2, 0.8, -6.2),
        ]),
        120,
        0.12,
        16,
        false
      );
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      scene.add(ribbon);

      const handleResize = () => {
        if (!mountRef.current) return;
        const { clientWidth, clientHeight } = mountRef.current;
        renderer.setSize(clientWidth, clientHeight);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', handleResize);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const handlePointer = (event) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(Array.from(bubbleMeshes.values()));
        if (hits[0]?.object?.userData?.id) {
          setActiveId(hits[0].object.userData.id);
        }
      };
      mountRef.current.addEventListener('click', handlePointer);

      const temp = new THREE.Vector3();
      const linePos = linkGeo.getAttribute('position');
      const baseLine = linePos.array.slice();
      let lastTime = performance.now();

      const animate = (time) => {
        const now = performance.now();
        const dt = Math.min(32, now - lastTime) / 1000;
        lastTime = now;
        const { level, swell, shimmer } = getAudioDynamics();

        const motion = controlState.current;
        const direction = new THREE.Vector3(
          (motion.right ? 1 : 0) - (motion.left ? 1 : 0),
          (motion.up ? 1 : 0) - (motion.down ? 1 : 0),
          (motion.backward ? 1 : 0) - (motion.forward ? 1 : 0)
        );

        const ease = 0.12;
        if (Math.abs(motion.pitch) > 0.001 || Math.abs(motion.yaw) > 0.001) {
          rig.rotation.x = clamp(rig.rotation.x + motion.pitch * dt, -Math.PI / 2 + 0.12, Math.PI / 2 - 0.12);
          rig.rotation.y += motion.yaw * dt;
          motion.pitch *= 1 - ease;
          motion.yaw *= 1 - ease;
        }

        if (direction.lengthSq() > 0) {
          direction.normalize();
          direction.applyQuaternion(rig.quaternion);
          const speedFactor = 0.65 * speedRef.current * (0.5 + swell * 0.8);
          rig.position.addScaledVector(direction, speedFactor * dt);
        }

        const targetId = highlightRef.current;
        const targetMesh = bubbleMeshes.get(targetId);
        if (targetMesh) {
          temp.copy(targetMesh.position).add(new THREE.Vector3(0, 0.32, 1.8));
          rig.position.lerp(temp, 0.0024);
        }

        bubbleMeshes.forEach((mesh, id) => {
          const mat = materials[id];
          const pulse = 1 + level * 0.25;
          mesh.scale.setScalar(pulse);
          mat.emissiveIntensity = 0.32 + level * 0.9;
          const proximity = relatedIds(highlightRef.current).has(id) ? 0.35 : 0.08;
          mat.opacity = 0.48 + proximity + shimmer * 0.12;
        });

        const t = time * 0.0012;
        for (let i = 0; i < linePos.count; i += 1) {
          const wobble = Math.sin(t + i * 0.27) * 0.08 * (0.3 + level);
          const idx = i * 3;
          linePos.setXYZ(
            i,
            baseLine[idx] + wobble,
            baseLine[idx + 1] + wobble * 0.35,
            baseLine[idx + 2] - wobble * 0.5
          );
        }
        linePos.needsUpdate = true;

        dust.rotation.y += 0.0004 + level * 0.0012;
        dust.material.opacity = 0.1 + swell * 0.25;
        ribbon.material.opacity = 0.14 + level * 0.12;

        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };

      frame = requestAnimationFrame(animate);

      const handleDown = (e) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        dragLookRef.current = { x: e.clientX, y: e.clientY, width: rect.width, height: rect.height };
      };

      const handleMove = (e) => {
        if (!dragLookRef.current) return;
        const dx = e.clientX - dragLookRef.current.x;
        const dy = e.clientY - dragLookRef.current.y;
        controlState.current.yaw = clamp(dx / dragLookRef.current.width, -2.4, 2.4);
        controlState.current.pitch = clamp(-dy / dragLookRef.current.height, -2.4, 2.4);
        dragLookRef.current.x = e.clientX;
        dragLookRef.current.y = e.clientY;
      };

      const handleUp = () => {
        dragLookRef.current = null;
      };

      const handleWheel = (e) => {
        if (!rig) return;
        rig.position.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion), e.deltaY * 0.002);
      };

      const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
          const [a, b] = e.touches;
          pinchRef.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
        } else if (e.touches.length === 1) {
          dragLookRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, width: mountRef.current.clientWidth, height: mountRef.current.clientHeight };
        }
      };

      const handleTouchMove = (e) => {
        if (pinchRef.current && e.touches.length === 2) {
          const [a, b] = e.touches;
          const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          const delta = clamp((pinchRef.current.dist - dist) / 320, -0.12, 0.12);
          rig.position.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(rig.quaternion), delta);
          pinchRef.current.dist = dist;
        } else if (dragLookRef.current && e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - dragLookRef.current.x;
          const dy = touch.clientY - dragLookRef.current.y;
          controlState.current.yaw = clamp(dx / dragLookRef.current.width, -2, 2);
          controlState.current.pitch = clamp(-dy / dragLookRef.current.height, -2, 2);
          dragLookRef.current.x = touch.clientX;
          dragLookRef.current.y = touch.clientY;
        }
      };

      const handleTouchEnd = () => {
        pinchRef.current = null;
        dragLookRef.current = null;
      };

      const node = mountRef.current;
      node.addEventListener('pointerdown', handleDown);
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      node.addEventListener('wheel', handleWheel, { passive: true });
      node.addEventListener('touchstart', handleTouchStart, { passive: true });
      node.addEventListener('touchmove', handleTouchMove, { passive: true });
      node.addEventListener('touchend', handleTouchEnd, { passive: true });

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        node.removeEventListener('pointerdown', handleDown);
        node.removeEventListener('wheel', handleWheel);
        node.removeEventListener('touchstart', handleTouchStart);
        node.removeEventListener('touchmove', handleTouchMove);
        node.removeEventListener('touchend', handleTouchEnd);
        node.removeEventListener('click', handlePointer);
        renderer?.dispose();
        ribbonGeo.dispose();
        dustGeo.dispose();
        linkGeo.dispose();
      };

      mountRef.current.appendChild(renderer.domElement);
    };

    init();
    return () => {
      cleanup();
    };
  }, []);

  const toggle = (name, active) => {
    controlState.current[name] = active;
  };

  const handleCommand = (cmd) => {
    const next = { ...controlState.current };
    if (cmd.stop) {
      Object.keys(next).forEach((key) => {
        if (key in next && typeof next[key] === 'boolean') next[key] = false;
      });
    }
    ['forward', 'backward', 'left', 'right', 'up', 'down'].forEach((key) => {
      if (key in cmd) next[key] = !!cmd.active;
    });
    controlState.current = next;
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'arrowup':
        case 'w':
        case 'z':
          toggle('forward', true);
          break;
        case 'arrowdown':
        case 's':
          toggle('backward', true);
          break;
        case 'arrowleft':
        case 'a':
        case 'q':
          toggle('left', true);
          break;
        case 'arrowright':
        case 'd':
          toggle('right', true);
          break;
        case ' ': // space
        case 'pageup':
          toggle('up', true);
          break;
        case 'shift':
        case 'pagedown':
          toggle('down', true);
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e) => {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'arrowup':
        case 'w':
        case 'z':
          toggle('forward', false);
          break;
        case 'arrowdown':
        case 's':
          toggle('backward', false);
          break;
        case 'arrowleft':
        case 'a':
        case 'q':
          toggle('left', false);
          break;
        case 'arrowright':
        case 'd':
          toggle('right', false);
          break;
        case ' ':
        case 'pageup':
          toggle('up', false);
          break;
        case 'shift':
        case 'pagedown':
          toggle('down', false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const selectBubble = (id) => {
    setActiveId(id);
  };

  return (
    <div className="immersive-shell">
      <div className="scene-mount" ref={mountRef} aria-label="Espace 3D des bulles" />
      <div className="ui-layer">
        <NavPad onCommand={handleCommand} speed={speed} onSpeed={setSpeed} />
        <BubbleList active={activeId} onSelect={selectBubble} />
        <Legend />
      </div>
    </div>
  );
}
