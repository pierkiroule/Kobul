import React from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './CameraRig.jsx';
import Particles from './Particles.jsx';
import Bubble from './Bubble.jsx';

export default function Scene({ moveInput, lookDeltaRef }) {
  return (
    <Canvas shadows camera={{ position: [0, 1.4, 6], fov: 72 }}>
      <color attach="background" args={["#0a1a2b"]} />
      <fog attach="fog" args={["#0a1a2b", 6, 28]} />
      <hemisphereLight intensity={0.7} color="#9bd4ff" groundColor="#0b0f16" />
      <directionalLight position={[6, 8, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <CameraRig moveInput={moveInput} lookDeltaRef={lookDeltaRef} />
      <Particles />
      <Bubble position={[0, 1.2, -4]} color="#b1ffe2" />
      <Bubble position={[-2.4, 0.8, -6]} color="#9bd4ff" pulse={0.08} />
      <Bubble position={[2.8, 1, -7]} color="#ffcfe8" pulse={0.05} />
    </Canvas>
  );
}
