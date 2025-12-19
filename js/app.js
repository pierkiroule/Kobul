// Logique principale EchoBulle
// Mode A : exploration libre (clic/tap pour sélectionner)
// Mode B : navigation fractale (maintien long / regard long pour entrer)

(function () {
  const group = document.querySelector("#bubble-group");
  const linkGroup = document.querySelector("#link-group");
  const sky = document.querySelector("#background-sky");

  const state = {
    selectedId: null,
    focusId: null,
    entities: new Map(),
    linkEntities: [],
  };

  function createBubbleEntity(bubble) {
    const sphere = document.createElement("a-sphere");
    sphere.setAttribute("position", bubble.position);
    sphere.setAttribute("radius", 0.35 + bubble.level * 0.1);
    sphere.setAttribute("color", levelColor(bubble.level));
    sphere.setAttribute("material", "roughness: 0.6; metalness: 0.0; opacity: 0.9");
    sphere.setAttribute("floaty", "amplitude: 0.1; speed: 1.1");
    sphere.setAttribute("bubble-interactions", `id: ${bubble.id}`);

    const text = document.createElement("a-entity");
    text.setAttribute("text", {
      value: `${bubble.title} (L${bubble.level})`,
      align: "center",
      width: 2.4,
      color: "#e4edff",
    });
    text.setAttribute("position", { x: 0, y: -0.55, z: 0 });
    text.setAttribute("face-camera", "");

    sphere.appendChild(text);
    group.appendChild(sphere);
    state.entities.set(bubble.id, sphere);
  }

  function createLinks() {
    const added = new Set();
    bubbles.forEach((bubble) => {
      bubble.links.forEach((targetId) => {
        const key = [bubble.id, targetId].sort().join("-");
        if (added.has(key)) return;
        const target = bubbleById[targetId];
        if (!target) return;
        const link = document.createElement("a-entity");
        link.setAttribute("line", {
          start: bubble.position,
          end: target.position,
          color: "#6fa3ff",
          opacity: 0.25,
        });
        linkGroup.appendChild(link);
        state.linkEntities.push({ key, link, from: bubble.id, to: targetId });
        added.add(key);
      });
    });
  }

  function levelColor(level) {
    if (level === 0) return "#8fb4ff";
    if (level === 1) return "#7cc4d8";
    return "#c5b8ff";
  }

  function setSelected(id) {
    if (state.selectedId === id) return;
    if (state.selectedId && state.entities.has(state.selectedId)) {
      const prev = state.entities.get(state.selectedId);
      prev.setAttribute("scale", "1 1 1");
      prev.setAttribute("material", "color: " + levelColor(bubbleById[state.selectedId].level));
    }
    state.selectedId = id;
    const entity = state.entities.get(id);
    if (entity) {
      entity.setAttribute("scale", "1.15 1.15 1.15");
      entity.setAttribute("material", "color: #ffe89e");
    }
  }

  function setFocus(id) {
    state.focusId = id;
    updateVisibility();
    recentreOn(id);
  }

  function clearFocus() {
    state.focusId = null;
    updateVisibility();
    recentreOn(null);
  }

  function updateVisibility() {
    const visibleIds = new Set();
    if (!state.focusId) {
      bubbles.forEach((b) => visibleIds.add(b.id));
    } else {
      const focus = bubbleById[state.focusId];
      if (!focus) return;
      visibleIds.add(focus.id);
      if (focus.parent) visibleIds.add(focus.parent);
      focus.children.forEach((c) => visibleIds.add(c));
      focus.links.forEach((link) => visibleIds.add(link));
    }

    state.entities.forEach((entity, id) => {
      entity.setAttribute("visible", visibleIds.has(id));
      entity.setAttribute("animation__fade", {
        property: "material.opacity",
        to: visibleIds.has(id) ? 0.95 : 0.1,
        dur: 450,
      });
    });

    state.linkEntities.forEach(({ link, from, to }) => {
      const show = visibleIds.has(from) && visibleIds.has(to);
      link.setAttribute("visible", show);
      link.setAttribute("animation__fade", {
        property: "material.opacity",
        to: show ? 0.25 : 0.05,
        dur: 450,
      });
    });
  }

  function recentreOn(id) {
    const focus = id ? bubbleById[id] : null;
    const offset = focus ? {
      x: -focus.position.x,
      y: -focus.position.y + 1.6,
      z: -focus.position.z + 3,
    } : { x: 0, y: 0, z: 0 };
    group.setAttribute("animation__move", {
      property: "position",
      to: `${offset.x} ${offset.y} ${offset.z}`,
      dur: 600,
      easing: "easeInOutQuad",
    });
    linkGroup.setAttribute("animation__move", {
      property: "position",
      to: `${offset.x} ${offset.y} ${offset.z}`,
      dur: 600,
      easing: "easeInOutQuad",
    });
  }

  function initScene() {
    bubbles.forEach(createBubbleEntity);
    createLinks();
    updateVisibility();
    attachSkyExit();
  }

  function attachSkyExit() {
    sky.addEventListener("click", () => {
      if (state.focusId) {
        clearFocus();
      }
    });
  }

  window.EchoApp = {
    selectBubble: (id) => {
      setSelected(id);
    },
    enterBubble: (id) => {
      setSelected(id);
      setFocus(id);
    },
    exit: clearFocus,
  };

  window.addEventListener("DOMContentLoaded", initScene);
})();
