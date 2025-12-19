import React, { useState } from 'react';
import EchoBulle from './EchoBulle.jsx';

function HomeIntro({ onEnter }) {
  return (
    <div className="home">
      <div className="home__glow" aria-hidden="true" />
      <div className="home__panel">
        <p className="home__eyebrow">EchoBulle</p>
        <h1 className="home__title">Un seuil calme vers l'atelier des bulles.</h1>
        <p className="home__lede">
          Écris, écoute et traverse des bulles symboliques. Chaque geste est une
          résonance lente, dessinant un réseau vivant.
        </p>
        <div className="home__actions">
          <button className="pill" type="button" onClick={onEnter}>
            Entrer dans le réseau
          </button>
          <span className="home__hint">Interaction locale, rien n'est envoyé.</span>
        </div>
      </div>
      <div className="home__footnotes">
        <div>
          <p className="home__note-title">Modes</p>
          <p className="home__note">2D paisible ou immersion WebXR à activer selon ton envie.</p>
        </div>
        <div>
          <p className="home__note-title">Rythme</p>
          <p className="home__note">Pas de compte, pas de flux. Juste tes mots et des bulles qui résonnent.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return (
      <div className="page fullscreen">
        <HomeIntro onEnter={() => setEntered(true)} />
      </div>
    );
  }

  return (
    <div className="page fullscreen">
      <EchoBulle />
    </div>
  );
}
