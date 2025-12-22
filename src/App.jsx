import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;

    // Base scene and camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02020a);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // Soft lighting for calm visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    // Star field for depth
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    const starVertices = [];
    for (let i = 0; i < 5000; i += 1) {
      starVertices.push(
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000),
        THREE.MathUtils.randFloatSpread(1000),
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Atom cluster
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const atoms = [];
    const bubbleMaterials = [];

    const createBubbleMaterial = (color) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.15,
        metalness: 0.05,
        transmission: 0.8,
        thickness: 0.8,
        ior: 1.33,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        iridescence: 0.25,
        iridescenceIOR: 1.3,
        emissive: color,
        emissiveIntensity: 0.12,
      });

    const createAtom = (x, y, z, color) => {
      const material = createBubbleMaterial(color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.floatSpeed = 0.25 + Math.random() * 0.35;
      mesh.userData.floatRadius = 0.45 + Math.random() * 0.35;
      mesh.userData.pulseOffset = Math.random() * Math.PI * 2;
      scene.add(mesh);
      atoms.push(mesh);
      bubbleMaterials.push(material);

      const pointLight = new THREE.PointLight(color, 1.35, 8);
      mesh.add(pointLight);
    };

    createAtom(0, 0, 0, 0x00d4ff);
    createAtom(10, 8, -15, 0xff00d4);
    createAtom(-12, -5, -5, 0x00ffaa);

    // Luminous link between atoms
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 8, -15)];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const link = new THREE.Line(lineGeom, lineMaterial);
    scene.add(link);

    // Camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onTouch = (event) => {
      const touch = event.touches ? event.touches[0] : event;
      mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atoms);
      if (intersects.length > 0) {
        const position = intersects[0].object.position;
        gsap.to(camera.position, {
          x: position.x,
          y: position.y,
          z: position.z + 12,
          duration: 1.2,
          ease: 'power2.inOut',
        });
        gsap.to(controls.target, {
          x: position.x,
          y: position.y,
          z: position.z,
          duration: 1.2,
        });
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('touchstart', onTouch);
    window.addEventListener('mousedown', onTouch);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      const elapsed = clock.getElapsedTime();

      atoms.forEach((atom, index) => {
        const speed = atom.userData.floatSpeed;
        const radius = atom.userData.floatRadius;
        const base = atom.userData.basePosition;
        const offset = atom.userData.pulseOffset;

        atom.position.x = base.x + Math.sin(elapsed * speed + index) * radius;
        atom.position.y = base.y + Math.sin(elapsed * speed * 0.85 + offset) * radius;
        atom.position.z = base.z + Math.cos(elapsed * speed + offset) * radius * 0.6;

        const scalePulse = 1 + Math.sin(elapsed * 0.9 + offset) * 0.04;
        atom.scale.setScalar(scalePulse);
        atom.rotation.y += 0.0015;
      });

      link.material.opacity = 0.25 + Math.sin(elapsed * 0.6) * 0.08;

      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('mousedown', onTouch);
      window.removeEventListener('resize', handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      controls.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      geometry.dispose();
      lineGeom.dispose();
      lineMaterial.dispose();
      bubbleMaterials.forEach((material) => material.dispose());
      scene.remove(link, stars, ambientLight, mainLight, ...atoms);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="experience" />;
}
