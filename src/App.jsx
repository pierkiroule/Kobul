import React, { useMemo, useRef, useState } from 'react';
import Scene from './canvas/Scene.jsx';
import VirtualJoystick from './controls/VirtualJoystick.jsx';
import TouchControls from './controls/TouchControls.js';

export default function App() {
  const [moveInput, setMoveInput] = useState({ x: 0, y: 0 });
  const lookDeltaRef = useRef({ x: 0, y: 0 });

  const handleLook = (dx, dy) => {
    lookDeltaRef.current.x += dx;
    lookDeltaRef.current.y += dy;
  };

  const heroLines = useMemo(
    () => [
      'ÉchoBulle — navigation contemplative',
      'Glisser pour orienter. Joystick pour dériver.',
      'Doux, stable, prêt pour mobile.',
    ],
    []
  );

  return (
    <div className="shell">
      <div className="ui">
        <div className="tag">Mode 3D / Navigation lente</div>
        <div className="title">ÉchoBulle</div>
        <div className="subtitle">
          {heroLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
      <div className="canvas-wrap">
        <Scene moveInput={moveInput} lookDeltaRef={lookDeltaRef} />
        <TouchControls onLookDelta={handleLook} />
      </div>
      <VirtualJoystick onChange={setMoveInput} />
    </div>
  );
}
