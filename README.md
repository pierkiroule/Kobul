# EchoBulle — toile cosmique minimaliste

Réinitialisation complète sur un template React + Vite épuré. L’expérience actuelle est une scène Three.js douce :
- trois atomes lumineux reliés
- un champ d’étoiles discret
- navigation OrbitControls
- glissement de caméra vers l’atome touché (animation GSAP)

## Démarrer en local
1. `npm install`
2. `npm run dev`
3. ouvrir l’URL indiquée (par défaut http://localhost:5173)

## Structure
```
kobul/
├─ index.html          # point d’ancrage Vite
├─ package.json        # scripts et dépendances (React, Three, GSAP)
├─ vite.config.js
└─ src/
   ├─ main.jsx         # bootstrap React
   ├─ index.css        # habillage nocturne sobre
   └─ App.jsx          # scène Three.js et interactions
```

## Notes d’expérience
- Visuels sobres, fond bleu nuit (#02020a).
- Lumière ambiante + point lumineux principal pour garder du relief.
- Touch/clic sur un atome : la caméra glisse vers lui, le regard reste libre.
- Animation limitée et fluide, sans interface ni texte.
