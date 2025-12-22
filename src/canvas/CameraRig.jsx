import React, { useMemo, useRef } from 'react';
import { PerspectiveCamera, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export default function CameraRig({ moveInput, lookDeltaRef }) {
  const rig = useRef();
  const pitch = useRef();
  const velocity = useRef(new THREE.Vector3());
  const forward = useMemo(() => new THREE.Vector3(), []);

  const params = useMemo(
    () => ({
      acceleration: 4.2,
      maxSpeed: 3.2,
      damping: 1.8,
      lookSensitivity: 0.0025,
    }),
    []
  );

  const rotation = useRef({ yaw: 0, pitch: -0.08 });

  useFrame((_, delta) => {
    const rigEl = rig.current;
    const pitchEl = pitch.current;
    if (!rigEl || !pitchEl) return;

    // Look
    const look = lookDeltaRef?.current || { x: 0, y: 0 };
    rotation.current.yaw += look.x * params.lookSensitivity;
    rotation.current.pitch = clamp(rotation.current.pitch + look.y * params.lookSensitivity, -Math.PI / 2.4, Math.PI / 2.4);
    if (lookDeltaRef?.current) {
      lookDeltaRef.current.x = 0;
      lookDeltaRef.current.y = 0;
    }

    rigEl.rotation.y = rotation.current.yaw;
    pitchEl.rotation.x = rotation.current.pitch;

    // Move
    forward.set(moveInput.x || 0, 0, -(moveInput.y || 0));
    if (forward.lengthSq() > 1) forward.normalize();
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);
    velocity.current.addScaledVector(forward, params.acceleration * delta);

    const speed = velocity.current.length();
    if (speed > params.maxSpeed) {
      velocity.current.multiplyScalar(params.maxSpeed / speed);
    }

    const damping = Math.exp(-params.damping * delta);
    velocity.current.multiplyScalar(damping);

    rigEl.position.addScaledVector(velocity.current, delta);
  });

  return (
    <group ref={rig} position={[0, 1.4, 6]}>
      <group ref={pitch}>
        <PerspectiveCamera makeDefault fov={72} near={0.1} far={120} />
      </group>
    </group>
  );
}
