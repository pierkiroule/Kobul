import { useEffect } from 'react';

export default function TouchControls({ onLookDelta }) {
  useEffect(() => {
    const surface = document.getElementById('look-surface');
    if (!surface || typeof onLookDelta !== 'function') return undefined;

    let active = false;

    const handlePointerDown = () => {
      active = true;
    };

    const handlePointerUp = () => {
      active = false;
    };

    const handlePointerMove = (event) => {
      if (!active) return;
      onLookDelta(event.movementX || 0, event.movementY || 0);
    };

    surface.addEventListener('pointerdown', handlePointerDown);
    surface.addEventListener('pointerup', handlePointerUp);
    surface.addEventListener('pointerleave', handlePointerUp);
    surface.addEventListener('pointermove', handlePointerMove);

    return () => {
      surface.removeEventListener('pointerdown', handlePointerDown);
      surface.removeEventListener('pointerup', handlePointerUp);
      surface.removeEventListener('pointerleave', handlePointerUp);
      surface.removeEventListener('pointermove', handlePointerMove);
    };
  }, [onLookDelta]);

  return <div id="look-surface" className="look-surface" />;
}
