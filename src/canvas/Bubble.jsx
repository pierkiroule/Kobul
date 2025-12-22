import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Bubble({ position = [0, 0, 0], color = '#b1ffe2', pulse = 0.06 }) {
  const mesh = useRef();

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 0.8) * pulse;
    mesh.current.scale.setScalar(scale);
    mesh.current.position.y = position[1] + Math.sin(t * 0.6) * 0.2;
  });

  return (
    <mesh ref={mesh} position={position} castShadow>
      <sphereGeometry args={[0.8, 42, 42]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.72}
        emissive={color}
        emissiveIntensity={0.24}
        roughness={0.25}
        metalness={0.08}
      />
    </mesh>
  );
}
