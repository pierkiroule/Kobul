# Kobul — EchoBulle (MVP A-Frame local)

EchoBulle est une exploration immersive légère : un réseau de bulles métaphoriques que l'on manipule librement puis dans lequel on peut "entrer" pour suivre un chemin fractal. Le projet est un MVP local sans backend, basé uniquement sur A-Frame et un peu de JavaScript.

## Lancer le projet
1. Cloner ou télécharger ce dépôt.
2. Ouvrir `index.html` dans un navigateur compatible WebXR :
   - Desktop : Chrome ou Firefox avec WebXR activé.
   - Mobile : Chrome (Android) ou Safari/Chrome (iOS via WebXR Polyfill intégré à A-Frame).
   - Casque VR : Oculus Browser / Meta Quest, navigateur WebXR.
3. Aucun build ni serveur n'est requis. Un simple double-clic suffit ; si votre navigateur bloque les ressources locales, servez le dossier avec un `python -m http.server 8000` minimal.

### Déploiement Vercel
- Le dépôt inclut `vercel.json` pour forcer un déploiement 100% statique (pas de commande `vite build`).
- Vercel doit simplement servir `index.html`, `js/` et `assets/` tels quels ; aucune étape de build n'est attendue.

## Gestes et interactions
### Mode A — Exploration libre (par défaut)
- **Mobile** : glisser pour regarder autour, pincer pour zoomer (comportement natif A-Frame), tap/clic court sur une bulle pour la mettre en surbrillance.
- **Desktop** : souris pour la vue, ZQSD/WASD pour se déplacer, clic court pour sélectionner.
- **VR** : regard + curseur (fuse) pour survoler, clic court (trigger) pour surbrillance.

### Mode B — Navigation fractale (explicite)
- **Entrer** : maintenir le tap/trigger ou laisser le regard sur une bulle ~1 seconde. La scène se recentre sur la bulle, seules la bulle, son parent, ses enfants et ses liens directs restent visibles.
- **Sortir** : tap/clic sur le fond (ciel) ou regard long/fuse sur le fond pour revenir au niveau supérieur.

## Données et structure
- Les bulles sont décrites dans `js/data.js` avec : `id`, `title`, `level`, `position`, `parent`, `children`, `links`.
- `js/components.js` regroupe les composants A-Frame custom : flottement doux, texte qui fait face à la caméra, interactions (clic / maintien).
- `js/app.js` assemble la scène, rend les bulles, applique les liens et gère les deux modes d'interaction (sélection + focus fractal).
- `assets/` est laissé vide pour accueillir ultérieurement des textures ou sons.

## Décisions de conception
- **Simplicité** : aucun build ni dépendance externe en dehors du CDN A-Frame.
- **Lisibilité** : matériaux opaques, couleurs calmes (#8fb4ff, #7cc4d8, #c5b8ff) et liens translucides pour ne pas gêner la lecture.
- **Frugalité mobile/VR** : peu d'entités, animations légères, pas de shaders complexes.

## Limites actuelles
- Pas de sauvegarde ni d'édition des données en direct.
- Pas de spatial audio ni de feedback haptique.
- Les tests automatiques sont inexistants (prototype seulement).

## Vision future
- Ajouter un panneau d'infos contextuel quand une bulle est sélectionnée.
- Générer le réseau à partir de données importées (CSV/JSON) via l'onglet fichiers local.
- Offrir un mode multi-utilisateur léger (WebRTC) tout en restant frugal.
