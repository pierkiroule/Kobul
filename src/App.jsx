import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  if (!window.AFRAME.components['orbit-manipulation']) {
    window.AFRAME.registerComponent('orbit-manipulation', {
      schema: {
        target: { type: 'vec3', default: { x: 0, y: 1.1, z: -2 } },
        distance: { default: 12 },
        minDistance: { default: 3.2 },
        maxDistance: { default: 90 },
        minPolar: { default: 0.35 },
        maxPolar: { default: 1.45 },
        rotateSpeed: { default: 0.22 },
        panSpeed: { default: 1.0 },
        zoomSpeed: { default: 0.95 },
        focusDistance: { default: 7 },
      },
      init() {
        const { THREE } = window;
        this.three = THREE;
        this.target = new THREE.Vector3(this.data.target.x, this.data.target.y, this.data.target.z);
        this.spherical = new THREE.Spherical(this.data.distance, 1.05, 0);
        this.pointerState = new Map();
        this.mode = 'none';
        this.canvas = null;
        this.midpoint = new THREE.Vector2();
        this.lastPinch = 0;
        this.panOffset = new THREE.Vector3();

        const offset = new THREE.Vector3();
        offset.copy(this.el.object3D.position).sub(this.target);
        if (offset.length() > 0.001) {
          this.spherical.setFromVector3(offset);
        }

        this.onPointerDown = (event) => {
          if (!this.canvas || event.target !== this.canvas) return;
          this.pointerState.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (this.pointerState.size === 1) {
            this.mode = event.button === 1 || event.button === 2 || event.altKey ? 'pan' : 'rotate';
          } else if (this.pointerState.size === 2) {
            this.mode = 'pinch';
            const pts = [...this.pointerState.values()];
            this.lastPinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            this.midpoint.set((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
          }
          if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
        };

        this.onPointerMove = (event) => {
          if (!this.pointerState.has(event.pointerId)) return;
          const prev = this.pointerState.get(event.pointerId);
          const dx = event.clientX - prev.x;
          const dy = event.clientY - prev.y;
          this.pointerState.set(event.pointerId, { x: event.clientX, y: event.clientY });

          if (this.mode === 'rotate' && this.pointerState.size === 1) {
            this.spherical.theta -= dx * 0.0025 * this.data.rotateSpeed;
            this.spherical.phi = Math.min(
              this.data.maxPolar,
              Math.max(this.data.minPolar, this.spherical.phi - dy * 0.002 * this.data.rotateSpeed)
            );
            this.updateCamera();
          } else if (this.mode === 'pan' && this.pointerState.size === 1) {
            this.pan(dx, dy);
            this.updateCamera();
          } else if (this.pointerState.size === 2) {
            const pts = [...this.pointerState.values()];
            const pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const mdx = midX - this.midpoint.x;
            const mdy = midY - this.midpoint.y;
            this.midpoint.set(midX, midY);
            if (this.lastPinch > 0 && pinch > 0.001) {
              const scale = this.lastPinch / pinch;
              this.spherical.radius = this.clampDistance(this.spherical.radius * scale);
            }
            this.lastPinch = pinch;
            this.pan(mdx, mdy);
            this.updateCamera();
          }
        };

        this.onPointerUp = (event) => {
          if (!this.pointerState.has(event.pointerId)) return;
          this.pointerState.delete(event.pointerId);
          if (this.canvas?.releasePointerCapture) {
            try {
              this.canvas.releasePointerCapture(event.pointerId);
            } catch (err) {
              /* noop */
            }
          }
          if (this.pointerState.size === 0) {
            this.mode = 'none';
            this.lastPinch = 0;
          }
        };

        this.onWheel = (event) => {
          event.preventDefault();
          const step = 1 + this.data.zoomSpeed * 0.05;
          const scale = event.deltaY > 0 ? 1 / step : step;
          this.spherical.radius = this.clampDistance(this.spherical.radius * scale);
          this.updateCamera();
        };

        this.focusHandler = (event) => {
          const p = event.detail?.position;
          if (!p) return;
          this.target.set(p.x, p.y, p.z);
          this.spherical.radius = this.clampDistance(this.data.focusDistance);
          this.updateCamera();
        };

        this.attachCanvas = () => {
          if (this.canvas || !this.el.sceneEl?.canvas) return;
          this.canvas = this.el.sceneEl.canvas;
          this.canvas.addEventListener('pointerdown', this.onPointerDown);
          window.addEventListener('pointermove', this.onPointerMove);
          window.addEventListener('pointerup', this.onPointerUp);
          window.addEventListener('pointercancel', this.onPointerUp);
          this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
        };

        this.el.sceneEl?.addEventListener('render-target-loaded', this.attachCanvas);
        this.attachCanvas();

        window.addEventListener('focus-bubble', this.focusHandler);
      },
      remove() {
        if (this.canvas) {
          this.canvas.removeEventListener('pointerdown', this.onPointerDown);
          this.canvas.removeEventListener('wheel', this.onWheel);
        }
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
        window.removeEventListener('focus-bubble', this.focusHandler);
      },
      clampDistance(v) {
        return Math.min(this.data.maxDistance, Math.max(this.data.minDistance, v));
      },
      pan(deltaX, deltaY) {
        const camera = this.el.getObject3D('camera') || this.el.object3D;
        const distance = this.spherical.radius;
        const height = this.canvas?.clientHeight || 1;
        const panX = (-deltaX * distance) / height * this.data.panSpeed;
        const panY = (deltaY * distance) / height * this.data.panSpeed;
        const te = camera.matrix.elements;
        this.panOffset.set(te[0], te[1], te[2]).multiplyScalar(panX);
        this.target.add(this.panOffset);
        this.panOffset.set(te[4], te[5], te[6]).multiplyScalar(panY);
        this.target.add(this.panOffset);
      },
      updateCamera() {
        const offset = new this.three.Vector3().setFromSpherical(this.spherical);
        const target = new this.three.Vector3(this.target.x, this.target.y, this.target.z);
        this.el.object3D.position.copy(target).add(offset);
        this.el.object3D.lookAt(target);
      },
      tick() {
        if (!this.three) return;
        this.updateCamera();
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
        this.camPos = new THREE.Vector3();
        this.cam = null;
        this.lastHit = 0;
      },
      tick(time) {
        if (!this.three) return;
        if (!this.cam) {
          this.cam = this.el.sceneEl?.querySelector('#camera');
          if (!this.cam) return;
        }

        this.el.object3D.getWorldPosition(this.temp);
        this.cam.object3D.getWorldPosition(this.camPos);
        const d = this.temp.distanceTo(this.camPos);
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

  if (!window.AFRAME.components['bubble-focus']) {
    window.AFRAME.registerComponent('bubble-focus', {
      schema: {
        text: { default: '' },
      },
      init() {
        this.el.classList.add('focusable');
        this.el.addEventListener('click', () => {
          const p = new window.THREE.Vector3();
          this.el.object3D.getWorldPosition(p);
          window.dispatchEvent(
            new CustomEvent('focus-bubble', {
              detail: { position: { x: p.x, y: p.y, z: p.z }, text: this.data.text },
            })
          );
          if (this.data.text) {
            window.dispatchEvent(
              new CustomEvent('poem-hit', {
                detail: { text: this.data.text },
              })
            );
          }
        });
      },
    });
  }
}

export default function App() {
  const ready = useAframeReady();
  const cameraRef = useRef(null);
  const [poem, setPoem] = useState('');

  const heroLines = useMemo(
    () => [
      'ÉchoBulle — navigation orbitale grand angle',
      'Glisse pour tourner autour, alt/secondaire pour décaler.',
      'Molette ou pincement pour zoomer, clique une bulle pour la centrer.',
    ],
    []
  );

  useEffect(() => {
    if (!ready) return;
    registerCalmComponents();
  }, [ready]);

  useEffect(() => {
    const handler = (event) => {
      if (event.detail?.text) setPoem(event.detail.text);
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
    window.dispatchEvent(
      new CustomEvent('focus-bubble', { detail: { position: { x: 0, y: 1.1, z: -2 } } })
    );
    setPoem('réseau recentré');
    window.setTimeout(() => setPoem(''), 1400);
  };

  return (
    <div className="shell">
      <div className="ui">
        <div className="title">
          <div className="label">🫧 Kobul</div>
          <div className="meta">PsychoCosmos — réseau de bulles 3D</div>
        </div>

        <div className="panel solo">
          <button type="button" onClick={recenter}>
            ◉ recadrer le réseau
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
            cursor="rayOrigin: mouse; fuse: false"
            raycaster="objects: .focusable"
            fog="type: exponential; color: #0a1a2b; density: 0.035"
            renderer="colorManagement: true; antialias: true; foveationLevel: 2"
            background="color: #0a1a2b"
            vr-mode-ui="enabled: false"
          >
            <a-entity light="type: hemisphere; intensity: 0.8; color: #9bd4ff; groundColor: #0b0f16" />
            <a-entity light="type: directional; intensity: 1.2" position="6 8 3" />

            <a-entity
              id="camera"
              ref={cameraRef}
              camera="active: true; fov: 82"
              orbit-manipulation="target: 0 1.1 -2; distance: 12; minDistance: 3.2; maxDistance: 90"
              position="0 6 12"
            />

            <a-entity id="field" position="0 0 -4">
              {poemNodes.map((node) => (
                <a-sphere
                  key={node.position}
                  position={node.position}
                  radius="0.95"
                  color="#b7d3ff"
                  material="opacity: 0.74; transparent: true; emissive: #b7d3ff; emissiveIntensity: 0.24; roughness: 0.25; metalness: 0.08"
                  gentle-float="amp: 0.12; speed: 0.32"
                  soft-pulse="base: 1; boost: 0.07; speed: 1"
                  bubble-focus={`text: ${node.text}`}
                  poem-node={`text: ${node.text}; radius: 1.65; cooldown: 1600`}
                />
              ))}
              <a-entity
                position="0 -0.6 -2"
                geometry="primitive: ring; radiusInner: 6; radiusOuter: 7"
                material="color: #0d1525; opacity: 0.35; side: double"
              />
            </a-entity>
          </a-scene>
        ) : (
          <div className="loading">Chargement du moteur 3D…</div>
        )}
      </div>

      <div className="hint">
        Navigation style logiciel 3D mobile : glisse pour orbiter, alt/secondaire pour décaler, molette ou pincement pour zoomer. Clique une bulle pour la mettre au centre.
      </div>
      {poem && <div className="poem show">{poem}</div>}
    </div>
  );
}
