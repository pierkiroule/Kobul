import React from 'react';
import EchoBulle from './EchoBulle.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="soft-header">
        <div className="soft-title">Kobul · EchoBulle</div>
        <div className="soft-note">Exploration respirante · Mobile & VR natifs</div>
      </header>

      <div className="scene-frame">
        <EchoBulle />
        <div className="scene-overlay" aria-hidden />
      </div>

      <section className="gesture-hints">
        <div>Gestes : drag / pinch pour orienter, regard libre en VR.</div>
        <div>Approche ou regard prolongé : la bulle s’ouvre doucement. Éloigne-toi pour ressortir.</div>
        <div className="code-pill">Stack : React 18 + Vite · A-Frame encapsulé</div>
      </section>
    </div>
  );
}
