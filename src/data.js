export const bubbles = [
  {
    id: 'root',
    title: 'Source',
    level: 0,
    position: { x: 0, y: 1.4, z: -2 },
    parent: null,
    children: ['flow', 'hollow'],
    links: ['tide'],
  },
  {
    id: 'flow',
    title: 'Flux doux',
    level: 1,
    position: { x: 1.6, y: 1, z: -3.4 },
    parent: 'root',
    children: ['echo', 'vein'],
    links: ['tide'],
  },
  {
    id: 'hollow',
    title: 'Creux calme',
    level: 1,
    position: { x: -1.8, y: 0.7, z: -3.2 },
    parent: 'root',
    children: ['moss'],
    links: ['vein'],
  },
  {
    id: 'tide',
    title: 'Marée lente',
    level: 1,
    position: { x: 0.8, y: 2.1, z: -4.4 },
    parent: 'root',
    children: ['pulse'],
    links: ['flow', 'root'],
  },
  {
    id: 'echo',
    title: 'Écho bulle',
    level: 2,
    position: { x: 2.4, y: 0.9, z: -5 },
    parent: 'flow',
    children: [],
    links: ['pulse'],
  },
  {
    id: 'vein',
    title: 'Veine claire',
    level: 2,
    position: { x: 0.6, y: 0.2, z: -4.8 },
    parent: 'flow',
    children: [],
    links: ['hollow'],
  },
  {
    id: 'moss',
    title: 'Mousse tiède',
    level: 2,
    position: { x: -2.6, y: 0.3, z: -4.8 },
    parent: 'hollow',
    children: [],
    links: ['pulse'],
  },
  {
    id: 'pulse',
    title: 'Souffle',
    level: 2,
    position: { x: -0.2, y: 2.6, z: -5.4 },
    parent: 'tide',
    children: [],
    links: ['echo', 'moss'],
  },
];

export function relatedIds(id) {
  const bubble = bubbles.find((b) => b.id === id);
  if (!bubble) return new Set();

  const relations = new Set([id]);
  if (bubble.parent) relations.add(bubble.parent);
  bubble.children.forEach((child) => relations.add(child));
  bubble.links.forEach((link) => relations.add(link));

  // also include siblings for a gentle shared glow
  if (bubble.parent) {
    bubbles
      .filter((b) => b.parent === bubble.parent)
      .forEach((sibling) => relations.add(sibling.id));
  }

  return relations;
}
