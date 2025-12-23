import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

function createTextSprite(text, color = '#e8f7ff') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const padding = 24;
  const fontSize = 32;
  context.font = `${fontSize}px "Inter", sans-serif`;
  const textWidth = context.measureText(text).width;

  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 214, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 95, 213, 0.35)');

  context.fillStyle = 'rgba(8, 14, 28, 0.8)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = gradient;
  context.lineWidth = 2;
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.font = `${fontSize}px "Inter", sans-serif`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scale = 1.2;
  sprite.scale.set(canvas.width / 200 * scale, canvas.height / 200 * scale, 1);
  sprite.userData.texture = texture;
  return sprite;
}

export default function App() {
  const sceneContainerRef = useRef(null);
  const interiorContainerRef = useRef(null);

  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const atomsRef = useRef([]);
  const haloRef = useRef(null);
  const frameIdRef = useRef(null);

  const interiorRendererRef = useRef(null);
  const interiorSceneRef = useRef(null);
  const interiorCameraRef = useRef(null);
  const interiorNotesGroupRef = useRef(null);
  const interiorFrameIdRef = useRef(null);

  const [focusedBubble, setFocusedBubble] = useState(null);
  const [showEntryPrompt, setShowEntryPrompt] = useState(false);
  const [isInteriorOpen, setIsInteriorOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [notesByBubble, setNotesByBubble] = useState({});

  const palette = [0x7cf7ff, 0xff7bd9, 0xffd170, 0x7bffbf, 0xb7a7ff];

  const bubbles = useMemo(() => {
    const count = 18;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, index) => {
      const theta = goldenAngle * index;
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const spread = 12.5;
      const position = new THREE.Vector3(
        Math.cos(theta) * radius * spread,
        y * spread * 0.6,
        Math.sin(theta) * radius * spread,
      );

      return {
        id: `bulle-${index + 1}`,
        title: `Bulle ${index + 1}`,
        color: palette[index % palette.length],
        position,
      };
    });
  }, []);

  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    gsap.to(cameraRef.current.position, { x: 0, y: 5, z: 22, duration: 1.2, ease: 'power2.inOut' });
    gsap.to(controlsRef.current.target, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.inOut' });
    setFocusedBubble(null);
    setShowEntryPrompt(false);
  };

  const focusBubble = (mesh) => {
    if (!mesh || !cameraRef.current || !controlsRef.current) return;
    const meta = mesh.userData.meta;
    setFocusedBubble(meta);
    setShowEntryPrompt(true);

    gsap.to(cameraRef.current.position, {
      x: mesh.position.x + 2.2,
      y: mesh.position.y + 1.2,
      z: mesh.position.z + 4.8,
      duration: 1.3,
      ease: 'power2.inOut',
    });
    gsap.to(controlsRef.current.target, {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
      duration: 1.3,
      ease: 'power2.inOut',
    });
  };

  useEffect(() => {
    if (!sceneContainerRef.current) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020610);

    const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 800);
    camera.position.set(0, 5, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const updateSize = () => {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width || 1;
      const height = rect.height || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0xffffff, 1.2, 120);
    keyLight.position.set(16, 18, 22);
    scene.add(keyLight);

    const starGeo = new THREE.BufferGeometry();
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    const stars = [];
    for (let i = 0; i < 1200; i += 1) {
      stars.push(THREE.MathUtils.randFloatSpread(600));
      stars.push(THREE.MathUtils.randFloatSpread(360));
      stars.push(THREE.MathUtils.randFloatSpread(600));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    const geometry = new THREE.SphereGeometry(1.1, 32, 32);
    const atoms = [];

    bubbles.forEach((bubble) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: bubble.color,
        roughness: 0.2,
        metalness: 0.08,
        transmission: 0.78,
        thickness: 0.9,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        emissive: bubble.color,
        emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(bubble.position);
      mesh.userData.meta = bubble;
      const light = new THREE.PointLight(bubble.color, 0.8, 7);
      mesh.add(light);
      scene.add(mesh);
      atoms.push(mesh);
    });
    atomsRef.current = atoms;

    const haloGeometry = new THREE.SphereGeometry(1.6, 42, 42);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.12,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.visible = false;
    scene.add(halo);
    haloRef.current = halo;

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
    const linkPositions = [];
    bubbles.forEach((source, idx) => {
      const neighbors = [...bubbles]
        .filter((candidate) => candidate.id !== source.id)
        .map((candidate) => ({ candidate, distance: source.position.distanceTo(candidate.position) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      neighbors.forEach(({ candidate }) => {
        linkPositions.push(
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
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    const links = new THREE.LineSegments(lineGeom, lineMaterial);
    links.frustumCulled = false;
    scene.add(links);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.rotateSpeed = 0.45;
    controls.zoomSpeed = 0.65;
    controlsRef.current = controls;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event) => {
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(atoms);
      if (hits.length) {
        focusBubble(hits[0].object);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(sceneContainerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      atoms.forEach((atom, index) => {
        const offset = index * 0.3;
        atom.position.y = atom.userData.meta.position.y + Math.sin(elapsed * 0.8 + offset) * 0.4;
        atom.rotation.y += 0.004;
        const mat = atom.material;
        mat.emissiveIntensity = 0.16 + Math.abs(Math.sin(elapsed * 1 + offset)) * 0.25;
      });

      if (haloRef.current && focusedBubble) {
        const target = atoms.find((mesh) => mesh.userData.meta.id === focusedBubble.id);
        if (target) {
          halo.visible = true;
          halo.position.copy(target.position);
          halo.scale.setScalar(1.2 + Math.sin(elapsed * 1.6) * 0.06);
          halo.material.opacity = 0.2 + Math.abs(Math.sin(elapsed * 1.4)) * 0.2;
        }
      } else if (haloRef.current) {
        halo.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      controls.dispose();
      geometry.dispose();
      starGeo.dispose();
      starMat.dispose();
      lineGeom.dispose();
      lineMaterial.dispose();
      atoms.forEach((atom) => atom.material.dispose());
      renderer.dispose();
      if (sceneContainerRef.current?.contains(renderer.domElement)) {
        sceneContainerRef.current.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [bubbles, focusedBubble]);

  useEffect(() => {
    if (!isInteriorOpen || !interiorContainerRef.current || !focusedBubble) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a16);
    interiorSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 0, 3.2);
    interiorCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    interiorContainerRef.current.appendChild(renderer.domElement);
    interiorRendererRef.current = renderer;

    const updateSize = () => {
      const rect = interiorContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width || 1;
      const height = rect.height || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const soft = new THREE.PointLight(focusedBubble.color, 1.2, 18);
    soft.position.set(2, 2, 2);
    scene.add(soft);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(6, 52, 52),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x0b1a33),
        emissive: new THREE.Color(focusedBubble.color).multiplyScalar(0.15),
        roughness: 0.8,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    );
    scene.add(dome);

    const noteGroup = new THREE.Group();
    scene.add(noteGroup);
    interiorNotesGroupRef.current = noteGroup;

    const seedNotes = notesByBubble[focusedBubble.id] || [];
    seedNotes.forEach((note) => {
      const sprite = createTextSprite(note.text, '#f5fbff');
      sprite.position.set(note.position[0], note.position[1], note.position[2]);
      noteGroup.add(sprite);
    });

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(interiorContainerRef.current);
    window.addEventListener('resize', updateSize);
    updateSize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      noteGroup.children.forEach((child, index) => {
        child.position.y += Math.sin(elapsed * 1.4 + index) * 0.002;
        child.lookAt(camera.position);
      });
      dome.rotation.y += 0.0009;
      renderer.render(scene, camera);
      interiorFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (interiorFrameIdRef.current) cancelAnimationFrame(interiorFrameIdRef.current);
      noteGroup.children.forEach((child) => {
        if (child.material?.map) child.material.map.dispose();
        if (child.material) child.material.dispose();
      });
      dome.geometry.dispose();
      dome.material.dispose();
      renderer.dispose();
      if (interiorContainerRef.current?.contains(renderer.domElement)) {
        interiorContainerRef.current.removeChild(renderer.domElement);
      }
      interiorSceneRef.current = null;
      interiorRendererRef.current = null;
      interiorCameraRef.current = null;
      interiorNotesGroupRef.current = null;
    };
  }, [focusedBubble, isInteriorOpen, notesByBubble]);

  const handleEnter = () => {
    if (!focusedBubble) return;
    setIsInteriorOpen(true);
    setShowEntryPrompt(false);
  };

  const handleExitInterior = () => {
    setIsInteriorOpen(false);
    setNewNote('');
    resetView();
  };

  const handleAddNote = (event) => {
    event.preventDefault();
    if (!focusedBubble) return;
    const trimmed = newNote.trim();
    if (!trimmed) return;

    const direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const radius = 1.8 + Math.random() * 0.8;
    const position = direction.multiplyScalar(radius);

    setNotesByBubble((prev) => {
      const existing = prev[focusedBubble.id] || [];
      return {
        ...prev,
        [focusedBubble.id]: [...existing, { id: `${focusedBubble.id}-${existing.length + 1}`, text: trimmed, position: [position.x, position.y, position.z] }],
      };
    });
    setNewNote('');
  };

  useEffect(() => {
    if (!isInteriorOpen || !interiorNotesGroupRef.current || !focusedBubble) return;
    const group = interiorNotesGroupRef.current;
    while (group.children.length) {
      const child = group.children.pop();
      if (child.material?.map) child.material.map.dispose();
      if (child.material) child.material.dispose();
    }
    const notes = notesByBubble[focusedBubble.id] || [];
    notes.forEach((note) => {
      const sprite = createTextSprite(note.text, '#f5fbff');
      sprite.position.set(note.position[0], note.position[1], note.position[2]);
      group.add(sprite);
    });
  }, [notesByBubble, isInteriorOpen, focusedBubble]);

  return (
    <div className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">EchoBulle</p>
          <h1>Réseau de bulles à explorer lentement</h1>
          <p className="lede">
            Choisissez une bulle, voyagez doucement vers elle, puis entrez pour y planter vos mots.
            À tout moment, revenez au réseau vivant.
          </p>
        </div>
        <button type="button" className="ghost" onClick={resetView}>
          Revenir au réseau
        </button>
      </header>

      <div className="scene" aria-label="Réseau de bulles 3D">
        <div ref={sceneContainerRef} className="experience" />

        {showEntryPrompt && focusedBubble && !isInteriorOpen && (
          <div className="entry-card">
            <p className="eyebrow">Invitation</p>
            <h2>Entrer dans {focusedBubble.title} ?</h2>
            <p>La caméra s\'est rapprochée. Entrez pour découvrir et planter des textes.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={handleEnter}>
                Entrer dans la bulle
              </button>
              <button type="button" className="ghost" onClick={resetView}>
                Rester dans le réseau
              </button>
            </div>
          </div>
        )}
      </div>

      {isInteriorOpen && focusedBubble && (
        <div className="interior">
          <div className="interior-header">
            <div>
              <p className="eyebrow">Intérieur</p>
              <h2>{focusedBubble.title}</h2>
              <p className="lede">Plantez un titre qui flottera dans la bulle.</p>
            </div>
            <button type="button" className="ghost" onClick={handleExitInterior}>
              Quitter la bulle
            </button>
          </div>

          <div className="interior-body">
            <div className="interior-viewport" ref={interiorContainerRef} />
            <form className="note-form" onSubmit={handleAddNote}>
              <label htmlFor="note">Titre à planter</label>
              <input
                id="note"
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Un mot, une phrase, une intention..."
              />
              <button type="submit" className="primary">Planter</button>
            </form>
            <div className="note-list">
              {(notesByBubble[focusedBubble.id] || []).length === 0 ? (
                <p className="muted">Aucun texte pour l'instant. Ajoutez le premier.</p>
              ) : (
                <ul>
                  {(notesByBubble[focusedBubble.id] || []).map((note) => (
                    <li key={note.id}>{note.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
