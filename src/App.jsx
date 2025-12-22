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
        this.resetMotion = () => {
          this.velocity.set(0, 0, 0);
        };
        // Expose a tiny helper to the element so React can zero the motion.
        this.el.flushMotion = this.resetMotion;
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

  if (!window.AFRAME.components['poem-node']) {
    window.AFRAME.registerComponent('poem-node', {
      schema: {
        text: { default: '' },
        radius: { default: 1.6 },
        cooldown: { default: 1400 },
      },
      init() {
        const { THREE } = window;
        this.three = THREE;
        this.temp = new THREE.Vector3();
        this.rigPos = new THREE.Vector3();
        this.rig = null;
        this.lastHit = 0;
      },
      tick(time) {
        if (!this.three) return;
        if (!this.rig) {
          this.rig = this.el.sceneEl?.querySelector('#cameraRig');
          if (!this.rig) return;
        }

        this.el.object3D.getWorldPosition(this.temp);
        this.rig.object3D.getWorldPosition(this.rigPos);
        const d = this.temp.distanceTo(this.rigPos);
        if (d < this.data.radius && time - this.lastHit > this.data.cooldown) {
          this.lastHit = time;
          window.dispatchEvent(
            new CustomEvent('poem-hit', {
              detail: { text: this.data.text },
            })
          );
        }
      },
    });
  }
}

export default function App() {
  const ready = useAframeReady();
  const rigRef = useRef(null);
  const [moveInput, setMoveInput] = useState({ x: 0, y: 0 });
  const [force, setForce] = useState(1.4);
  const [speed, setSpeed] = useState(1.0);
  const [poem, setPoem] = useState('');

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
      acceleration: 2.2 * force,
      damping: 1.1 + speed * 0.6,
      maxSpeed: 1.8 + speed * 1.6,
    });
  }, [moveInput, force, speed]);

  useEffect(() => {
    const handler = (event) => {
      setPoem(event.detail?.text || '');
      window.clearTimeout(handler.timer);
      handler.timer = window.setTimeout(() => setPoem(''), 2200);
    };
    window.addEventListener('poem-hit', handler);
    return () => {
      window.removeEventListener('poem-hit', handler);
      window.clearTimeout(handler.timer);
    };
  }, []);

  const poemNodes = useMemo(
    () => [
      { position: '0 1.2 -2', text: 'un vent intérieur\naiguise la lumière' },
      { position: '-2.4 0.9 -1.8', text: 'une barque fragile\nsur le lac des pensées' },
      { position: '2.6 1 -2.2', text: 'un fil d’encre\nse remet à respirer' },
      { position: '0 1.6 -5', text: 'un pas sans sol\net pourtant un cap' },
    ],
    []
  );

  const recenter = () => {
    if (!rigRef.current) return;
    const rig = rigRef.current;
    rig.object3D.position.set(0, 1.4, 5);
    rig.object3D.rotation.set(0, 0, 0);
    rig.components['joystick-motion']?.flushMotion?.();
    setPoem('recentrage — respire…');
    window.setTimeout(() => setPoem(''), 1600);
  };

  return (
    <div className="shell">
      <div className="ui">
        <div className="title">
          <div className="label">🫧 Kobul</div>
          <div className="meta">PsychoCosmos — déplacement par impulsions</div>
        </div>

        <div className="panel">
          <div className="row">
            <label htmlFor="force">force</label>
            <input
              id="force"
              type="range"
              min="0.4"
              max="3.0"
              step="0.05"
              value={force}
              onChange={(e) => setForce(parseFloat(e.target.value))}
            />
          </div>
          <div className="row">
            <label htmlFor="speed">vitesse</label>
            <input
              id="speed"
              type="range"
              min="0.35"
              max="2.2"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
            />
          </div>
          <button type="button" onClick={recenter}>
            ◉ recentrer
          </button>
        </div>

        <div className="subtitle-lines">
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
              {poemNodes.map((node) => (
                <a-sphere
                  key={node.position}
                  position={node.position}
                  radius="0.85"
                  color="#b7d3ff"
                  material="opacity: 0.74; transparent: true; emissive: #b7d3ff; emissiveIntensity: 0.24; roughness: 0.25; metalness: 0.08"
                  gentle-float="amp: 0.12; speed: 0.32"
                  soft-pulse="base: 1; boost: 0.07; speed: 1"
                  poem-node={`text: ${node.text}; radius: 1.65; cooldown: 1600`}
                />
              ))}
              <a-entity position="0 -0.6 -2" geometry="primitive: ring; radiusInner: 6; radiusOuter: 7" material="color: #0d1525; opacity: 0.35; side: double" />
            </a-entity>
          </a-scene>
        ) : (
          <div className="loading">Chargement du moteur 3D…</div>
        )}
      </div>

      <VirtualJoystick onChange={setMoveInput} hint="Glisse ou tape pour donner une impulsion" />

      <div className="hint">Astuce : fais des petites impulsions. Laisse l’inertie faire. Approche une bulle : un mot surgit.</div>
      {poem && <div className="poem show">{poem}</div>}
    </div>
  );
}
