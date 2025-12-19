import React from 'react';
import EchoBulle from './EchoBulle.jsx';

export default function App() {
  return (
    <div className="page">
      <header className="nav-2026">
        <div className="nav-brand">
          <span className="glyph">◎</span>
          <div>
            <div className="eyebrow">Kobul / EchoBulle</div>
            <div className="nav-title">Portails immersifs — WebXR 2026</div>
          </div>
        </div>
        <div className="nav-right">
          <span className="chip ghost">React · Vite · A-Frame encapsulé</span>
          <span className="chip">Mobile + VR natifs</span>
        </div>
      </header>

      <main className="viewport">
        <EchoBulle />
      </main>

      <footer className="footer-legend">
        <div>Gestes : drag + pinch (mobile) · grip + trigger (VR). Les bulles sont des portails, pas des menus.</div>
        <div className="micro">Sculpture manipulable · Entrée explicite dans chaque bulle · Sortie immédiate et rassurante.</div>
      </footer>
    </div>
  );
}
