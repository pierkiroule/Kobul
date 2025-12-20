import React, { useEffect, useMemo, useRef, useState } from 'react';
import VirtualJoystick from './controls/VirtualJoystick.jsx';

const AFRAME_CDN = 'https://aframe.io/releases/1.5.0/aframe.min.js';

function useAframeReady() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.AFRAME);

  useEffect(() => {
    if (ready) return undefined;
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

function registerCalmComponents() {
  if (!window.AFRAME) return;

  if (!window.AFRAME.components['gentle-float']) {
    window.AFRAME.registerComponent('gentle-float', {
      schema: { amp: { default: 0.1 }, speed: { default: 0.4 } },
      init() {
        this.t = Math.random() * Math.PI * 2;
        this.baseY = this.el.object3D.position.y;
      },
      tick(time, dt) {
        const delta = (dt || 16) / 1000;
        this.t += delta * this.data.speed;
        this.el.object3D.position.y = this.baseY + Math.sin(this.t) * this.data.amp;
      },
    });
  }

  if (!window.AFRAME.components['soft-pulse']) {
    window.AFRAME.registerComponent('soft-pulse', {
      schema: { base: { default: 1 }, boost: { default: 0.08 }, speed: { default: 1.2 } },
      tick(time) {
        const pulse = this.data.base + Math.sin((time / 1000) * this.data.speed) * this.data.boost;
        this.el.object3D.scale.setScalar(pulse);
      },
    });
  }

  if (!window.AFRAME.components['joystick-motion']) {
    window.AFRAME.registerComponent('joystick-motion', {
      schema: {
        x: { default: 0 },
        y: { default: 0 },
        acceleration: { default: 3.6 },
        damping: { default: 1.9 },
        maxSpeed: { default: 2.8 },
      },
      init() {
        const { THREE } = window;
        this.velocity = new THREE.Vector3();
        this.heading = new THREE.Vector3();
        this.euler = new THREE.Euler();
      },
      tick(time, dt) {
        const delta = Math.min(dt || 16, 48) / 1000;
        const { THREE } = window;
        if (!THREE) return;

        this.heading.set(this.data.x || 0, 0, -(this.data.y || 0));
        if (this.heading.lengthSq() > 1) this.heading.normalize();

        this.euler.set(0, this.el.object3D.rotation.y, 0, 'YXZ');
        this.heading.applyEuler(this.euler);

        this.velocity.addScaledVector(this.heading, this.data.acceleration * delta);
        const speed = this.velocity.length();
        if (speed > this.data.maxSpeed) {
          this.velocity.multiplyScalar(this.data.maxSpeed / speed);
        }

        const damping = Math.exp(-this.data.damping * delta);
        this.velocity.multiplyScalar(damping);

        this.el.object3D.position.addScaledVector(this.velocity, delta);
      },
    });
  }
}

export default function App() {
  const ready = useAframeReady();
  const rigRef = useRef(null);
  const [moveInput, setMoveInput] = useState({ x: 0, y: 0 });

  const heroLines = useMemo(
    () => [
      'ÉchoBulle — navigation contemplative',
      'Glisser pour orienter. Joystick pour dériver.',
      'Doux, stable, mobile-first.',
    ],
    []
  );

  useEffect(() => {
    if (!ready) return;
    registerCalmComponents();
  }, [ready]);

  useEffect(() => {
    if (!rigRef.current) return;
    rigRef.current.setAttribute('joystick-motion', {
      x: moveInput.x,
      y: moveInput.y,
      acceleration: 3.6,
      damping: 1.9,
      maxSpeed: 2.8,
    });
  }, [moveInput]);

  return (
    <div className="shell">
      <div className="ui">
        <div className="tag">Mode 3D / Navigation lente</div>
        <div className="title">ÉchoBulle</div>
        <div className="subtitle">
          {heroLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>

      <div className="canvas-wrap">
        {ready ? (
          <a-scene
            embedded
            fog="type: exponential; color: #0a1a2b; density: 0.035"
            renderer="colorManagement: true; antialias: true; foveationLevel: 2"
            background="color: #0a1a2b"
            vr-mode-ui="enabled: false"
          >
            <a-entity light="type: hemisphere; intensity: 0.8; color: #9bd4ff; groundColor: #0b0f16" />
            <a-entity light="type: directional; intensity: 1.2" position="6 8 3" />

            <a-entity
              id="cameraRig"
              ref={rigRef}
              position="0 1.4 5"
              joystick-motion="x: 0; y: 0; acceleration: 3.6; damping: 1.9; maxSpeed: 2.8"
            >
              <a-entity
                id="camera"
                camera="active: true"
                look-controls="touchEnabled: true; mouseEnabled: true; pointerLockEnabled: false"
                position="0 0 0"
              />
            </a-entity>

            <a-entity id="field" position="0 0 -4">
              <a-sphere
                position="0 1.2 -2"
                radius="0.9"
                color="#b1ffe2"
                material="opacity: 0.72; transparent: true; emissive: #b1ffe2; emissiveIntensity: 0.24; roughness: 0.25; metalness: 0.08"
                gentle-float="amp: 0.16; speed: 0.32"
                soft-pulse="base: 1; boost: 0.08; speed: 1"
              />
              <a-sphere
                position="-2.4 0.8 -1.8"
                radius="0.8"
                color="#9bd4ff"
                material="opacity: 0.7; transparent: true; emissive: #9bd4ff; emissiveIntensity: 0.22; roughness: 0.25; metalness: 0.08"
                gentle-float="amp: 0.12; speed: 0.28"
                soft-pulse="base: 1; boost: 0.06; speed: 0.9"
              />
              <a-sphere
                position="2.6 1 -2.2"
                radius="0.85"
                color="#ffcfe8"
                material="opacity: 0.7; transparent: true; emissive: #ffcfe8; emissiveIntensity: 0.2; roughness: 0.25; metalness: 0.08"
                gentle-float="amp: 0.1; speed: 0.3"
                soft-pulse="base: 1; boost: 0.05; speed: 1.1"
              />
              <a-entity position="0 -0.6 -2" geometry="primitive: ring; radiusInner: 6; radiusOuter: 7" material="color: #0d1525; opacity: 0.35; side: double" />
            </a-entity>
          </a-scene>
        ) : (
          <div className="loading">Chargement du moteur 3D…</div>
        )}
      </div>

      <VirtualJoystick onChange={setMoveInput} />
    </div>
  );
}
