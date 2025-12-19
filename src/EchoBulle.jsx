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

  window.AFRAME.registerComponent('soft-select', {
    schema: { id: { type: 'string' } },
    init() {
      const el = this.el;
      const scene = el.sceneEl;
      el.classList.add('selectable');

      const hoverIn = () => scene?.emit('bubble-hover', { id: this.data.id });
      const hoverOut = () => scene?.emit('bubble-hover', { id: null });
      const select = () => {
        scene?.emit('bubble-select', { id: this.data.id });
        startAmbient();
      };

      el.addEventListener('mouseenter', hoverIn);
      el.addEventListener('mouseleave', hoverOut);
      el.addEventListener('click', select);

      this.cleanup = () => {
        el.removeEventListener('mouseenter', hoverIn);
        el.removeEventListener('mouseleave', hoverOut);
        el.removeEventListener('click', select);
      };
    },
    remove() {
      this.cleanup?.();
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
  const focusRef = useRef(null);
  const hoverRef = useRef(null);
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

    const cluster = document.createElement('a-entity');
    cluster.setAttribute('position', '0 0 -3');

    links.forEach(({ a, b }) => {
      const from = bubbles.find((n) => n.id === a);
      const to = bubbles.find((n) => n.id === b);
      if (!from || !to) return;
      const link = document.createElement('a-entity');
      link.dataset.link = `${a}::${b}`;
      link.setAttribute('line', `start: ${from.position.x} ${from.position.y} ${from.position.z}; end: ${to.position.x} ${to.position.y} ${to.position.z}; color: ${palette.link}`);
      link.setAttribute('material', 'opacity: 0.32');
      linkRefs.push(link);
      cluster.appendChild(link);
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
      sphere.setAttribute('soft-select', `id: ${id}`);
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
      cluster.appendChild(wrapper);

      bubbleRefs.set(id, { wrapper, sphere, label, level, title });
    });

    const applyState = () => {
      const focusId = focusRef.current;
      const hoverId = hoverRef.current;
      const visibleSet = focusId ? relatedIds(focusId) : null;

      linkRefs.forEach((link) => {
        const [a, b] = link.dataset.link.split('::');
        const inFocus = !visibleSet || (visibleSet.has(a) && visibleSet.has(b));
        const opacity = inFocus ? 0.32 : 0.08;
        link.setAttribute('material', `color: ${palette.link}; opacity: ${opacity}`);
      });

      bubbleRefs.forEach(({ sphere, label, level, title }, id) => {
        const isFocus = focusId === id;
        const isHover = hoverId === id;
        const isActive = !visibleSet || visibleSet.has(id);
        const opacity = isActive ? (isFocus ? 0.95 : 0.75) : 0.22;
        const scale = isFocus ? 1.15 : isHover ? 1.08 : 1;

        sphere.setAttribute(
          'material',
          `roughness: 0.3; metalness: 0.02; opacity: ${opacity}; transparent: true; emissive: ${palette.glow}; emissiveIntensity: ${isFocus ? 0.35 : 0.18}`,
        );
        sphere.setAttribute('soft-pulse', `base: ${scale}; boost: 0.04`);
        sphere.querySelector('a-animation')?.setAttribute('to', opacity);

        label.setAttribute(
          'text',
          `value: ${title}\nNiveau ${level}; align: center; color: ${palette.glow}; opacity: ${isActive ? 0.9 : 0.35}; width: 2`,
        );
      });
    };

    const handleSelect = (e) => {
      focusRef.current = e.detail.id;
      applyState();
    };

    const handleHover = (e) => {
      hoverRef.current = e.detail.id;
      applyState();
    };

    const handleBackdrop = () => {
      focusRef.current = null;
      hoverRef.current = null;
      applyState();
    };

    scene.addEventListener('bubble-select', handleSelect);
    scene.addEventListener('bubble-hover', handleHover);
    scene.addEventListener('backdrop-release', handleBackdrop);

    cluster.addEventListener('loaded', applyState, { once: true });
    scene.appendChild(cluster);
    sceneRef.current = scene;
    mountRef.current.appendChild(scene);

    return () => {
      scene.removeEventListener('bubble-select', handleSelect);
      scene.removeEventListener('bubble-hover', handleHover);
      scene.removeEventListener('backdrop-release', handleBackdrop);
      cluster.removeEventListener('loaded', applyState);
      mountRef.current?.removeChild(scene);
      sceneRef.current = null;
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
