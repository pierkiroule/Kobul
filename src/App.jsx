import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    // Un bleu nuit très profond plutôt que du noir pur
    scene.background = new THREE.Color(0x02020a);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- ÉCLAIRAGE (C'est ici que ça change) ---
    // 1. Lumière d'ambiance globale (augmente la visibilité générale)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // 2. Lumière principale (comme un soleil)
    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    // 3. Ajouter un champ d'étoiles pour la profondeur
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    const starVertices = [];
    for (let i = 0; i < 5000; i++) {
      starVertices.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- OBJETS ---
    const geometry = new THREE.SphereGeometry(1.5, 8, 8);
    const atoms = [];

    const createAtom = (x, y, z, color) => {
      const material = new THREE.MeshStandardMaterial({
        color: color,

        // Clés de profondeur
        roughness: 0.75, // ↑ capte mieux la lumière
        metalness: 0.05, // ↓ évite l’effet plastique

        // Volume perceptif
        transparent: true,
        opacity: 0.85,

        // Halo interne subtil
        emissive: color,
        emissiveIntensity: 0.18,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      atoms.push(mesh);

      // Petite lumière interne à chaque atome
      const pLight = new THREE.PointLight(color, 1.5, 10);
      mesh.add(pLight);
    };

    createAtom(0, 0, 0, 0x00d4ff);
    createAtom(10, 8, -15, 0xff00d4);
    createAtom(-12, -5, -5, 0x00ffaa);

    // --- LIAISONS LUMINEUSES ---
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 8, -15)];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    scene.add(new THREE.Line(lineGeom, lineMaterial));

    // --- NAVIGATION ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onTouch = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atoms);
      if (intersects.length > 0) {
        const p = intersects[0].object.position;
        gsap.to(camera.position, { x: p.x, y: p.y, z: p.z + 12, duration: 1.2, ease: 'power2.inOut' });
        gsap.to(controls.target, { x: p.x, y: p.y, z: p.z, duration: 1.2 });
      }
    };

    window.addEventListener('touchstart', onTouch);
    window.addEventListener('mousedown', onTouch);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => mountRef.current?.removeChild(renderer.domElement);
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
}
