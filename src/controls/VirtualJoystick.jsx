import React, { useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function VirtualJoystick({ onChange, hint = 'Glisser pour dériver' }) {
  const padRef = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointerId = useRef(null);

  useEffect(() => {
    if (!onChange) return undefined;
    onChange(stick);
    return undefined;
  }, [stick, onChange]);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return undefined;

    const updateStick = (clientX, clientY) => {
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const radius = rect.width / 2;
      let nx = clamp(dx / radius, -1, 1);
      let ny = clamp(dy / radius, -1, 1);

      // emulate CAD mobile viewers: small deadzone + axial snap for precise strafe/orbit
      const dead = 0.06;
      if (Math.abs(nx) < dead) nx = 0;
      if (Math.abs(ny) < dead) ny = 0;

      const snap = 0.92;
      if (Math.abs(nx) > snap) nx = Math.sign(nx);
      if (Math.abs(ny) > snap) ny = Math.sign(ny);

      setStick({ x: nx, y: ny });
    };

    const end = () => {
      pointerId.current = null;
      setStick({ x: 0, y: 0 });
    };

    const handleStart = (event) => {
      if (pointerId.current !== null) return;
      pointerId.current = event.pointerId;
      updateStick(event.clientX, event.clientY);
      pad.setPointerCapture(event.pointerId);
    };

    const handleMove = (event) => {
      if (event.pointerId !== pointerId.current) return;
      updateStick(event.clientX, event.clientY);
    };

    const handleEnd = (event) => {
      if (event.pointerId !== pointerId.current) return;
      end();
      pad.releasePointerCapture(event.pointerId);
    };

    pad.addEventListener('pointerdown', handleStart);
    pad.addEventListener('pointermove', handleMove);
    pad.addEventListener('pointerup', handleEnd);
    pad.addEventListener('pointercancel', handleEnd);
    pad.addEventListener('pointerleave', handleEnd);

    return () => {
      pad.removeEventListener('pointerdown', handleStart);
      pad.removeEventListener('pointermove', handleMove);
      pad.removeEventListener('pointerup', handleEnd);
      pad.removeEventListener('pointercancel', handleEnd);
      pad.removeEventListener('pointerleave', handleEnd);
    };
  }, []);

  return (
    <div className="joystick-wrapper">
      <div className="joystick-hint">{hint}</div>
      <div className="joystick-pad" ref={padRef}>
        <div className="joystick-cross" aria-hidden="true" />
        <div
          className="joystick-nub"
          style={{
            transform: `translate(${stick.x * 40}px, ${stick.y * 40}px)`,
          }}
        />
      </div>
    </div>
  );
}
