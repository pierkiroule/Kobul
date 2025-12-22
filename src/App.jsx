import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export default function App() {
  const mountRef = useRef(null);
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMediaUrl, setActiveMediaUrl] = useState('');

  const palette = [
    0x00d4ff,
    0xff4fd4,
    0x7cf7ff,
    0xffd170,
    0x7bffbf,
  ];

  const basePlaylist = [
    { label: 'Chant de glace (audio)', url: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav' },
    { label: 'Fleur abyssale (image)', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80' },
    { label: 'Brouillard secret (vidéo)', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { label: 'Chemin luminescent (page)', url: 'https://example.org' },
  ];

  const bubbles = React.useMemo(() => {
    const count = 25;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, index) => {
      const theta = goldenAngle * index;
      const y = 1 - (index / (count - 1)) * 2; // from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const spread = 14.5 + (index % 5) * 0.3;
      const position = new THREE.Vector3(
        Math.cos(theta) * radius * spread,
        y * spread * 0.6,
        Math.sin(theta) * radius * spread,
      );

      return {
        id: `bulle-${index + 1}`,
        title: `Bulle constellation ${index + 1}`,
        color: palette[index % palette.length],
        position,
        playlist: basePlaylist.map((item, itemIndex) => ({
          ...item,
          url: `${item.url}${item.url.includes('?') ? '&' : '?'}v=${index + itemIndex}`,
        })),
      };
    });
  }, []);

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
    const geometry = new THREE.SphereGeometry(1.35, 32, 32);
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

    const createAtom = (bubbleData) => {
      const material = createBubbleMaterial(bubbleData.color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(bubbleData.position);
      mesh.userData.basePosition = mesh.position.clone();
      mesh.userData.floatSpeed = 0.22 + Math.random() * 0.32;
      mesh.userData.floatRadius = 0.38 + Math.random() * 0.35;
      mesh.userData.pulseOffset = Math.random() * Math.PI * 2;
      mesh.userData.meta = bubbleData;
      scene.add(mesh);
      atoms.push(mesh);
      bubbleMaterials.push(material);

      const pointLight = new THREE.PointLight(bubbleData.color, 1.2, 7);
      mesh.add(pointLight);
    };

    bubbles.forEach((bubble) => createAtom(bubble));

    // Luminous links between nearest neighbors
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    const positionsArray = [];

    bubbles.forEach((source, idx) => {
      const neighbors = [...bubbles]
        .filter((candidate) => candidate.id !== source.id)
        .map((candidate) => ({
          candidate,
          distance: source.position.distanceTo(candidate.position),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      neighbors.forEach(({ candidate }) => {
        positionsArray.push(
          source.position.x,
          source.position.y,
          source.position.z,
          candidate.position.x,
          candidate.position.y,
          candidate.position.z,
        );
      });
    });

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));
    const links = new THREE.LineSegments(lineGeom, lineMaterial);
    links.frustumCulled = false;
    scene.add(links);

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
        const mesh = intersects[0].object;
        const position = mesh.position;
        const bubbleMeta = mesh.userData.meta;

        setSelectedBubble({
          id: bubbleMeta.id,
          title: bubbleMeta.title,
          playlist: bubbleMeta.playlist,
        });
        setIsModalOpen(false);
        setActiveMediaUrl('');

        gsap.to(camera.position, {
          x: position.x,
          y: position.y,
          z: position.z + 10,
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

      lineMaterial.opacity = 0.2 + Math.sin(elapsed * 0.6) * 0.08;

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
      scene.remove(links, stars, ambientLight, mainLight, ...atoms);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentPlaylist = selectedBubble?.playlist || [];

  const renderMedia = (url) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.match(/\.(mp4|webm)$/)) {
      return <video src={url} controls className="media-frame" />;
    }
    if (lower.match(/\.(mp3|wav|ogg)$/)) {
      return (
        <audio controls className="media-audio">
          <source src={url} />
        </audio>
      );
    }
    if (lower.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      return <img src={url} alt="contenu lié" className="media-image" />;
    }
    return <iframe title="Ressource" src={url} className="media-frame" />;
  };

  return (
    <div ref={mountRef} className="experience">
      <div className="hud">
        <div className="hud-block">
          <p className="hud-kicker">Constellation vivante</p>
          <p className="hud-title">25 bulles reliées par des fils lumineux</p>
          <p className="hud-sub">Sélectionnez une bulle pour vous en approcher et ouvrir son contenu transmédia.</p>
        </div>

        {selectedBubble && (
          <div className="hud-selection">
            <div>
              <p className="hud-label">Bulle sélectionnée</p>
              <p className="hud-name">{selectedBubble.title}</p>
            </div>
            <button
              type="button"
              className="hud-button"
              onClick={() => {
                setIsModalOpen(true);
                setActiveMediaUrl(currentPlaylist[0]?.url || '');
              }}
            >
              afficher son contenu transmédia
            </button>
          </div>
        )}
      </div>

      {isModalOpen && selectedBubble && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Bulle</p>
                <p className="modal-title">{selectedBubble.title}</p>
              </div>
              <button type="button" className="close" onClick={() => setIsModalOpen(false)}>
                fermer
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-player">{renderMedia(activeMediaUrl)}</div>
              <div className="modal-playlist" aria-label="Playlist de liens">
                {currentPlaylist.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    className={`playlist-item ${activeMediaUrl === item.url ? 'active' : ''}`}
                    onClick={() => setActiveMediaUrl(item.url)}
                  >
                    <span className="dot" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
