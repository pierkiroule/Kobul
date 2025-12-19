import React, { useEffect, useRef, useState } from 'react';
import { bubbles, relatedIds } from './data.js';
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

  window.AFRAME.registerComponent('backdrop-exit', {
    init() {
      const el = this.el;
      const scene = el.sceneEl;
      const release = () => scene?.emit('backdrop-release');
      el.addEventListener('click', release);
      this.remove = () => el.removeEventListener('click', release);
    },
  });

  window.AFRAME.registerComponent('fractal-node', {
    schema: { id: { type: 'string' } },
    init() {
      const { id } = this.data;
      const el = this.el;
      const scene = el.sceneEl;
      let holdTimer = null;
      let longTriggered = false;
      let hadPointer = false;

      const focus = () => scene?.emit('bubble-focus', { id });
      const enter = () => {
        scene?.emit('bubble-enter', { id });
        startAmbient();
      };

      const clearTimer = () => {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = null;
      };

      const pointerDown = () => {
        hadPointer = true;
        longTriggered = false;
        clearTimer();
        holdTimer = setTimeout(() => {
          longTriggered = true;
          enter();
        }, 650);
      };

      const pointerUp = () => {
        if (holdTimer) {
          clearTimer();
          if (!longTriggered) focus();
        }
        longTriggered = false;
        setTimeout(() => {
          hadPointer = false;
        }, 0);
      };

      const hoverIn = () => scene?.emit('bubble-hover', { id });
      const hoverOut = () => scene?.emit('bubble-hover', { id: null });

      const click = () => {
        // Fuse / gaze click in VR has no pointer phase: treat as enter.
        if (hadPointer) return;
        enter();
      };

      el.classList.add('selectable');
      el.addEventListener('mouseenter', hoverIn);
      el.addEventListener('mouseleave', hoverOut);
      el.addEventListener('mousedown', pointerDown);
      el.addEventListener('mouseup', pointerUp);
      el.addEventListener('touchstart', pointerDown);
      el.addEventListener('touchend', pointerUp);
      el.addEventListener('click', click);

      this.cleanup = () => {
        el.removeEventListener('mouseenter', hoverIn);
        el.removeEventListener('mouseleave', hoverOut);
        el.removeEventListener('mousedown', pointerDown);
        el.removeEventListener('mouseup', pointerUp);
        el.removeEventListener('touchstart', pointerDown);
        el.removeEventListener('touchend', pointerUp);
        el.removeEventListener('click', click);
      };
    },
    remove() {
      this.cleanup?.();
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

const palette = {
  calm: '#7dc7ff',
  glow: '#c5e6ff',
  low: '#0b1927',
  link: '#6ba6d1',
  haze: '#0a0f18',
};

export default function EchoBulle() {
  const ready = useAframe();
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const focusRef = useRef('root');
  const hoverRef = useRef(null);
  const activeRef = useRef('root');
  const worldRef = useRef(null);
  const [xrSupported, setXrSupported] = useState(false);

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

    const bubbleRefs = new Map();
    const linkRefs = [];

    const scene = document.createElement('a-scene');
    scene.setAttribute('background', `color: ${palette.haze}`);
    scene.setAttribute('renderer', 'colorManagement: true; foveationLevel: 2; xrCompatible: true');
    scene.setAttribute('vr-mode-ui', 'enabled: true');
    scene.setAttribute('webxr', 'optionalFeatures: local-floor, bounded-floor, hand-tracking, dom-overlay; overlayElement: #aframe-shell');

    const haze = document.createElement('a-entity');
    haze.id = 'haze';
    haze.className = 'backdrop';
    haze.setAttribute('geometry', 'primitive: sphere; radius: 32');
    haze.setAttribute('material', `color: ${palette.haze}; side: back; opacity: 0.42`);
    haze.setAttribute('backdrop-exit', '');
    const hazeAnim = document.createElement('a-animation');
    hazeAnim.setAttribute('attribute', 'material.opacity');
    hazeAnim.setAttribute('from', '0.36');
    hazeAnim.setAttribute('to', '0.48');
    hazeAnim.setAttribute('direction', 'alternate');
    hazeAnim.setAttribute('dur', '7200');
    hazeAnim.setAttribute('repeat', 'indefinite');
    hazeAnim.setAttribute('easing', 'easeInOutSine');
    haze.appendChild(hazeAnim);
    scene.appendChild(haze);

    const cameraRig = document.createElement('a-entity');
    cameraRig.id = 'cameraRig';
    cameraRig.setAttribute('position', '0 1.6 4.4');
    const camera = document.createElement('a-entity');
    camera.id = 'camera';
    camera.setAttribute('camera', 'active: true');
    camera.setAttribute('look-controls', 'pointerLockEnabled: false');
    camera.setAttribute('wasd-controls', 'acceleration: 8');
    const cursor = document.createElement('a-entity');
    cursor.setAttribute('cursor', 'fuse: true; fuseTimeout: 1200');
    cursor.setAttribute('raycaster', 'objects: .selectable, .backdrop');
    cursor.setAttribute('position', '0 0 -0.9');
    cursor.setAttribute('geometry', 'primitive: ring; radiusInner: 0.01; radiusOuter: 0.016');
    cursor.setAttribute('material', `color: ${palette.glow}; opacity: 0.45`);
    cursor.setAttribute('soft-pulse', 'base: 1; boost: 0.06');
    camera.appendChild(cursor);
    cameraRig.appendChild(camera);
    scene.appendChild(cameraRig);

    const world = document.createElement('a-entity');
    world.id = 'world';
    world.setAttribute('position', '0 0 -3');

    links.forEach(({ a, b }) => {
      const from = bubbles.find((n) => n.id === a);
      const to = bubbles.find((n) => n.id === b);
      if (!from || !to) return;
      const link = document.createElement('a-entity');
      link.dataset.link = `${a}::${b}`;
      link.setAttribute('line', `start: ${from.position.x} ${from.position.y} ${from.position.z}; end: ${to.position.x} ${to.position.y} ${to.position.z}; color: ${palette.link}`);
      link.setAttribute('material', 'opacity: 0.32');
      linkRefs.push(link);
      world.appendChild(link);
    });

    bubbles.forEach((bubble) => {
      const { id, title, level, position } = bubble;
      const wrapper = document.createElement('a-entity');
      wrapper.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
      wrapper.setAttribute('gentle-float', `amp: ${0.05 + level * 0.015}; speed: ${0.25 + level * 0.06}`);

      const sphere = document.createElement('a-sphere');
      sphere.className = 'selectable';
      sphere.setAttribute('radius', '0.32');
      sphere.setAttribute('color', palette.calm);
      sphere.setAttribute('fractal-node', `id: ${id}`);
      sphere.setAttribute('soft-pulse', 'base: 1; boost: 0.04');
      sphere.setAttribute('material', `roughness: 0.3; metalness: 0.02; opacity: 0.75; transparent: true; emissive: ${palette.glow}; emissiveIntensity: 0.18`);
      const sphereAnim = document.createElement('a-animation');
      sphereAnim.setAttribute('attribute', 'material.opacity');
      sphereAnim.setAttribute('direction', 'alternate');
      sphereAnim.setAttribute('dur', '2600');
      sphereAnim.setAttribute('repeat', 'indefinite');
      sphereAnim.setAttribute('easing', 'easeInOutSine');
      sphereAnim.setAttribute('begin', 'mouseenter');
      sphereAnim.setAttribute('end', 'mouseleave');
      sphere.appendChild(sphereAnim);

      const label = document.createElement('a-entity');
      label.setAttribute('position', '0 -0.52 0');
      label.setAttribute('face-camera', '');
      label.setAttribute('text', `value: ${title}\nNiveau ${level}; align: center; color: ${palette.glow}; opacity: 0.9; width: 2`);

      wrapper.appendChild(sphere);
      wrapper.appendChild(label);
      world.appendChild(wrapper);

      bubbleRefs.set(id, { wrapper, sphere, label, level, title, position });
    });

    const setActiveBubble = (id, { keepFocus = false } = {}) => {
      const target = bubbles.find((b) => b.id === id) ?? bubbles[0];
      activeRef.current = target.id;
      if (!keepFocus) {
        focusRef.current = target.id;
      }

      const visibleSet = relatedIds(target.id);

      linkRefs.forEach((link) => {
        const [a, b] = link.dataset.link.split('::');
        const inFocus = visibleSet.has(a) && visibleSet.has(b);
        const opacity = inFocus ? 0.32 : 0.04;
        link.setAttribute('material', `color: ${palette.link}; opacity: ${opacity}`);
      });

      bubbleRefs.forEach(({ sphere, label, level, title, position }, bubbleId) => {
        const isActive = visibleSet.has(bubbleId);
        const isFocus = bubbleId === focusRef.current;
        const isHover = bubbleId === hoverRef.current;
        const opacity = isActive ? (isFocus ? 0.95 : 0.78) : 0.12;
        const scale = isFocus ? 1.18 : isHover ? 1.08 : isActive ? 1.02 : 0.82;

        sphere.setAttribute(
          'material',
          `roughness: 0.32; metalness: 0.02; opacity: ${opacity}; transparent: true; emissive: ${palette.glow}; emissiveIntensity: ${isFocus ? 0.38 : 0.18}`,
        );
        sphere.setAttribute('soft-pulse', `base: ${scale}; boost: ${isActive ? 0.05 : 0.02}`);
        sphere.setAttribute('visible', isActive || isHover || isFocus);

        label.setAttribute(
          'text',
          `value: ${title}\nNiveau ${level}; align: center; color: ${palette.glow}; opacity: ${isActive ? 0.88 : 0.2}; width: 2`,
        );

        // keep a gentle glow hint even when masked
        label.setAttribute('visible', isActive);

        if (bubbleId === target.id && worldRef.current) {
          const anchor = { x: 0, y: 1.35, z: -3.2 };
          const to = {
            x: anchor.x - position.x,
            y: anchor.y - position.y,
            z: anchor.z - position.z,
          };
          worldRef.current.setAttribute('animation__move', `property: position; to: ${to.x} ${to.y} ${to.z}; dur: 1000; easing: easeInOutCubic`);
          worldRef.current.setAttribute('animation__scale', 'property: scale; to: 1.05 1.05 1.05; dur: 900; easing: easeInOutQuad');
        }
      });
    };

    const softFocus = (id) => {
      focusRef.current = id;
      setActiveBubble(activeRef.current, { keepFocus: true });
    };

    const softHover = (id) => {
      hoverRef.current = id;
      setActiveBubble(activeRef.current, { keepFocus: true });
    };

    const openParent = () => {
      const current = bubbles.find((b) => b.id === activeRef.current);
      if (current?.parent) {
        setActiveBubble(current.parent);
      } else {
        setActiveBubble(activeRef.current);
      }
    };

    const handleEnter = (e) => setActiveBubble(e.detail.id);
    const handleFocus = (e) => softFocus(e.detail.id);
    const handleHover = (e) => softHover(e.detail.id);

    scene.addEventListener('bubble-enter', handleEnter);
    scene.addEventListener('bubble-focus', handleFocus);
    scene.addEventListener('bubble-hover', handleHover);
    scene.addEventListener('backdrop-release', openParent);

    world.addEventListener(
      'loaded',
      () => {
        worldRef.current = world;
        setActiveBubble(activeRef.current);
      },
      { once: true },
    );

    scene.appendChild(world);
    sceneRef.current = scene;
    mountRef.current.appendChild(scene);

    return () => {
      scene.removeEventListener('bubble-enter', handleEnter);
      scene.removeEventListener('bubble-focus', handleFocus);
      scene.removeEventListener('bubble-hover', handleHover);
      scene.removeEventListener('backdrop-release', openParent);
      mountRef.current?.removeChild(scene);
      sceneRef.current = null;
      worldRef.current = null;
    };
  }, [ready]);

  if (!ready) {
    return <div style={{ padding: '24px', color: 'rgba(227,241,255,0.7)' }}>Chargement de l’espace…</div>;
  }

  return (
    <div id="aframe-shell" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {xrSupported && (
        <button className="enter-vr" type="button" onClick={() => sceneRef.current?.enterVR?.()}>
          Mode VR
        </button>
      )}
    </div>
  );
}
