# Kobul — EchoBulle (respiration immersive)

EchoBulle est une exploration minimale et organique : quelques bulles métaphoriques reliées entre elles, qui respirent doucement. On s’approche, on laisse le regard ou le geste durer, la bulle devient un petit monde. En s’éloignant, tout revient sans rupture.

## Lancer (local)
1. `npm install`
2. `npm run dev`
3. Ouvrir l’URL indiquée (généralement http://localhost:5173) dans un navigateur compatible WebXR (Chrome, Safari mobile, Oculus Browser).

> Le code est frugal : React 18 + Vite, A-Frame chargé via CDN et encapsulé dans le composant `EchoBulle`.

## Gestes et sensations
- **Explorer** : drag / rotate / pinch sur mobile, souris + WASD sur desktop, regard libre en VR.
- **Sélectionner** : regard prolongé ou tap/clic doux sur une bulle → halo discret et légère pulsation.
- **Entrer / sortir** : se rapprocher (ou garder le regard) laisse la bulle et ses proches respirer, s’éloigner ou viser le fond réouvre l’ensemble.
- **VR** : curseur fuse (1,2s) inclus, aucune UI intrusive.

## Structure du code
```
kobul/
├─ index.html          # point d’entrée Vite
├─ package.json        # scripts dev/build
├─ vite.config.js
└─ src/
   ├─ main.jsx         # bootstrap React
   ├─ main.css         # habillage discret
   ├─ App.jsx          # shell minimal et gestes
   ├─ EchoBulle.jsx    # scène A-Frame encapsulée + composants custom
   ├─ data.js          # bulles, relations, logique relationnelle
   └─ audio.js         # souffle optionnel déclenché au premier contact
```

## Design d’expérience
- **Frugal** : peu d’entités, données statiques, aucune dépendance backend.
- **Organique** : flottement lent (`gentle-float`), pulsation douce (`soft-pulse`), halo calme.
- **Fluide** : pas de switch brutal, simple recadrage visuel en filtrant légèrement les bulles non concernées.
- **Sobre** : palette bleu-brume, aucun bouton ou HUD envahissant.

## Déploiement Vercel
- Build : `npm run build`
- Output : `dist/`
- Le fichier `vercel.json` est configuré pour utiliser Vite et servir le dossier `dist`.

## Limites actuelles
- Audio minimal, déclenché seulement après une première interaction utilisateur (pas d’autoplay forcé).
- Pas de persistance des données, pas de génération dynamique.
- Pas de tests automatisés (prototype sensoriel avant tout).

## Vision
- Ajouter une respiration audio-réactive légère sur les bulles proches.
- Ouvrir les données via un simple import JSON/CSV en local.
- Tester d’autres palettes nocturnes et un brouillard progressif pour adoucir encore le recul.
