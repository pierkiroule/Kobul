// Données décrivant le réseau de bulles EchoBulle
// Une bulle = un noeud avec hiérarchie et liens transversaux

const bubbles = [
  {
    id: "root",
    title: "EchoBulle",
    level: 0,
    position: { x: 0, y: 1.6, z: -3 },
    parent: null,
    children: ["flow", "sense", "care"],
    links: ["story"],
  },
  {
    id: "flow",
    title: "Flux doux",
    level: 1,
    position: { x: -1.8, y: 1.4, z: -4.5 },
    parent: "root",
    children: ["rhythm", "breath"],
    links: ["sense"],
  },
  {
    id: "sense",
    title: "Sens clair",
    level: 1,
    position: { x: 1.9, y: 1.7, z: -4.2 },
    parent: "root",
    children: ["color", "tone"],
    links: ["flow", "care"],
  },
  {
    id: "care",
    title: "Caresse",
    level: 1,
    position: { x: 0.2, y: 0.9, z: -5.3 },
    parent: "root",
    children: ["cocoon"],
    links: ["sense"],
  },
  {
    id: "rhythm",
    title: "Rythme",
    level: 2,
    position: { x: -2.6, y: 1.2, z: -6.2 },
    parent: "flow",
    children: [],
    links: ["tone"],
  },
  {
    id: "breath",
    title: "Souffle",
    level: 2,
    position: { x: -1.3, y: 2.1, z: -6.6 },
    parent: "flow",
    children: [],
    links: ["color"],
  },
  {
    id: "color",
    title: "Couleur",
    level: 2,
    position: { x: 2.7, y: 1.3, z: -6.3 },
    parent: "sense",
    children: ["story"],
    links: ["breath", "tone"],
  },
  {
    id: "tone",
    title: "Tonalité",
    level: 2,
    position: { x: 1.1, y: 2.2, z: -6.8 },
    parent: "sense",
    children: [],
    links: ["rhythm", "color"],
  },
  {
    id: "story",
    title: "Récit",
    level: 2,
    position: { x: 0.5, y: 1.5, z: -7.5 },
    parent: "color",
    children: [],
    links: ["root"],
  },
  {
    id: "cocoon",
    title: "Cocon",
    level: 2,
    position: { x: -0.4, y: 0.5, z: -7.1 },
    parent: "care",
    children: [],
    links: [],
  },
];

// Dictionnaire pratique pour accès rapide
const bubbleById = bubbles.reduce((map, bubble) => {
  map[bubble.id] = bubble;
  return map;
}, {});
