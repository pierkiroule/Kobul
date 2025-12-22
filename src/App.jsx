import React, { useEffect, useRef } from 'react';
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02020a);

    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 });
    const starVertices = [];
    for (let i = 0; i < 5000; i += 1) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const atoms = [];
    const atomGeometry = new THREE.SphereGeometry(1.5, 24, 24);

    const createAtom = (x, y, z, color) => {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.05,
        transparent: true,
        opacity: 0.85,
        emissive: color,
        emissiveIntensity: 0.18,
      });
      const mesh = new THREE.Mesh(atomGeometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      atoms.push(mesh);

      const innerLight = new THREE.PointLight(color, 1.5, 10);
      mesh.add(innerLight);

      return mesh;
    };

    const atomA = createAtom(0, 0, 0, 0x00d4ff);
    const atomB = createAtom(10, 8, -15, 0xff00d4);
    const atomC = createAtom(-12, -5, -5, 0x00ffaa);

    const connections = [];
    const connect = (from, to) => {
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        from.position.clone(),
        to.position.clone(),
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
      connections.push(line);
    };

    connect(atomA, atomB);
    connect(atomA, atomC);
    connect(atomB, atomC);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const desiredCamera = camera.position.clone();
    const desiredTarget = controls.target.clone();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const focusAtom = (event) => {
      const x = event.touches ? event.touches[0].clientX : event.clientX;
      const y = event.touches ? event.touches[0].clientY : event.clientY;
      pointer.x = (x / mount.clientWidth) * 2 - 1;
      pointer.y = -(y / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(atoms);
      if (hit.length > 0) {
        const p = hit[0].object.position;
        desiredCamera.set(p.x, p.y, p.z + 12);
        desiredTarget.set(p.x, p.y, p.z);
      }
    };

    mount.addEventListener('mousedown', focusAtom);
    mount.addEventListener('touchstart', focusAtom);

    const onResize = () => {
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', onResize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      camera.position.lerp(desiredCamera, 0.08);
      controls.target.lerp(desiredTarget, 0.12);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      mount.removeEventListener('mousedown', focusAtom);
      mount.removeEventListener('touchstart', focusAtom);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      connections.forEach((line) => {
        line.geometry.dispose();
        line.material.dispose();
      });
      atoms.forEach((atom) => {
        atom.material.dispose();
      });
      atomGeometry.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="scene-shell" ref={mountRef}>
      <div className="scene-overlay">
        <div className="label">EchoBulle — constellation</div>
        <div className="hint">Touchez ou cliquez une bulle pour vous en approcher.</div>
      </div>
    </div>
  );
}
