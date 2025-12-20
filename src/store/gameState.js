const listeners = new Set();

const state = {
  viewMode: '3d',
  spaceMode: 'reseau',
  currentBulle: null,
};

function setState(partial) {
  Object.assign(state, partial);
  listeners.forEach((fn) => fn(state));
}

export function useGameState(subscribe) {
  return subscribe ? subscribe(state) : state;
}

export function subscribeGameState(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export const gameActions = {
  setViewMode: (viewMode) => setState({ viewMode }),
  setSpaceMode: (spaceMode) => setState({ spaceMode }),
  setCurrentBulle: (currentBulle) => setState({ currentBulle }),
};

export default state;
