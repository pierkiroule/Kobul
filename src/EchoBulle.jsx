import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const sceneRef = useRef(null);
  const [focusId, setFocusId] = useState(null);
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    if (!ready) return;
    registerComponents();
  }, [ready]);

  useEffect(() => {
    if (!ready || !sceneRef.current) return;
    const scene = sceneRef.current;
    const onSelect = (e) => setFocusId(e.detail.id);
    const onHover = (e) => setHoverId(e.detail.id);
    const onBackdrop = () => setFocusId(null);

    scene.addEventListener('bubble-select', onSelect);
    scene.addEventListener('bubble-hover', onHover);
    scene.addEventListener('backdrop-release', onBackdrop);

    return () => {
      scene.removeEventListener('bubble-select', onSelect);
      scene.removeEventListener('bubble-hover', onHover);
      scene.removeEventListener('backdrop-release', onBackdrop);
    };
  }, [ready]);

  const visibleSet = useMemo(() => (focusId ? relatedIds(focusId) : null), [focusId]);

  if (!ready) {
    return <div style={{ padding: '24px', color: 'rgba(227,241,255,0.7)' }}>Chargement de l’espace…</div>;
  }

  return (
    <a-scene
      ref={sceneRef}
      background={`color: ${palette.haze}`}
      renderer="colorManagement: true; foveationLevel: 2"
      vr-mode-ui="enabled: true"
    >
      <a-entity id="haze" className="backdrop" geometry="primitive: sphere; radius: 32" material={`color: ${palette.haze}; side: back; opacity: 0.42`} backdrop-exit>
        <a-animation
          attribute="material.opacity"
          from="0.36"
          to="0.48"
          direction="alternate"
          dur="7200"
          repeat="indefinite"
          easing="easeInOutSine"
        />
      </a-entity>

      <a-entity
        id="cameraRig"
        position="0 1.6 4.4"
      >
        <a-entity
          id="camera"
          camera="active: true"
          look-controls="pointerLockEnabled: false"
          wasd-controls="acceleration: 8"
        >
          <a-entity
            cursor="fuse: true; fuseTimeout: 1200"
            raycaster="objects: .selectable, .backdrop"
            position="0 0 -0.9"
            geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.016"
            material={`color: ${palette.glow}; opacity: 0.45`}
            soft-pulse="base: 1; boost: 0.06"
          />
        </a-entity>
      </a-entity>

      <a-entity position="0 0 -3">
        {links.map(({ a, b }) => {
          const from = bubbles.find((n) => n.id === a);
          const to = bubbles.find((n) => n.id === b);
          if (!from || !to) return null;
          const inFocus = !visibleSet || (visibleSet.has(a) && visibleSet.has(b));
          const opacity = inFocus ? 0.32 : 0.08;
          return (
            <a-entity
              key={`${a}-${b}`}
              line={`start: ${from.position.x} ${from.position.y} ${from.position.z}; end: ${to.position.x} ${to.position.y} ${to.position.z}; color: ${palette.link}`}
              material={`opacity: ${opacity}`}
            />
          );
        })}

        {bubbles.map((bubble) => {
          const { id, title, level, position } = bubble;
          const isFocus = focusId === id;
          const isActive = !visibleSet || visibleSet.has(id);
          const isHover = hoverId === id;
          const opacity = isActive ? (isFocus ? 0.95 : 0.75) : 0.22;
          const scale = isFocus ? 1.15 : isHover ? 1.08 : 1;
          const amp = 0.05 + level * 0.015;
          const speed = 0.25 + level * 0.06;

          return (
            <a-entity
              key={id}
              position={`${position.x} ${position.y} ${position.z}`}
              gentle-float={`amp: ${amp}; speed: ${speed}`}
            >
              <a-sphere
                className="selectable"
                soft-select={`id: ${id}`}
                soft-pulse={`base: ${scale}; boost: 0.04`}
                radius="0.32"
                color={palette.calm}
                material={`roughness: 0.3; metalness: 0.02; opacity: ${opacity}; transparent: true; emissive: ${palette.glow}; emissiveIntensity: ${isFocus ? 0.35 : 0.18}`}
              >
                <a-animation
                  attribute="material.opacity"
                  to={opacity}
                  direction="alternate"
                  dur="2600"
                  repeat="indefinite"
                  easing="easeInOutSine"
                  begin="mouseenter"
                  end="mouseleave"
                />
              </a-sphere>

              <a-entity
                position="0 -0.52 0"
                face-camera
                text={`value: ${title}\nNiveau ${level}; align: center; color: ${palette.glow}; opacity: ${isActive ? 0.9 : 0.35}; width: 2`}
              />
            </a-entity>
          );
        })}
      </a-entity>
    </a-scene>
  );
}
