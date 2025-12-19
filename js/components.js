// Composants A-Frame personnalisés pour EchoBulle

AFRAME.registerComponent("floaty", {
  schema: {
    amplitude: { type: "number", default: 0.15 },
    speed: { type: "number", default: 1 },
    axis: { type: "string", default: "y" },
  },
  init() {
    this.start = Date.now();
    this.original = this.el.object3D.position.clone();
  },
  tick() {
    const t = (Date.now() - this.start) / 1000;
    const delta = Math.sin(t * this.data.speed) * this.data.amplitude;
    const pos = this.el.object3D.position;
    pos.copy(this.original);
    if (this.data.axis === "y") pos.y += delta;
    if (this.data.axis === "x") pos.x += delta;
    if (this.data.axis === "z") pos.z += delta;
  },
});

AFRAME.registerComponent("face-camera", {
  tick() {
    const camera = document.querySelector("#player-camera");
    if (!camera) return;
    this.el.object3D.lookAt(camera.object3D.getWorldPosition(new THREE.Vector3()));
  },
});

AFRAME.registerComponent("bubble-interactions", {
  schema: {
    id: { type: "string" },
  },
  init() {
    this.holdTimer = null;
    this.holdTriggered = false;
    this.onClick = this.onClick.bind(this);
    this.startHold = this.startHold.bind(this);
    this.cancelHold = this.cancelHold.bind(this);

    this.el.addEventListener("click", this.onClick);

    ["mousedown", "touchstart", "triggerdown", "fusing"].forEach((ev) => {
      this.el.addEventListener(ev, this.startHold);
    });
    ["mouseup", "touchend", "triggerup", "mouseleave"].forEach((ev) => {
      this.el.addEventListener(ev, this.cancelHold);
    });
  },
  remove() {
    this.el.removeEventListener("click", this.onClick);
    ["mousedown", "touchstart", "triggerdown", "fusing"].forEach((ev) => {
      this.el.removeEventListener(ev, this.startHold);
    });
    ["mouseup", "touchend", "triggerup", "mouseleave"].forEach((ev) => {
      this.el.removeEventListener(ev, this.cancelHold);
    });
  },
  startHold() {
    if (this.holdTimer) return;
    this.holdTriggered = false;
    this.holdTimer = setTimeout(() => {
      this.holdTriggered = true;
      if (window.EchoApp) {
        window.EchoApp.enterBubble(this.data.id);
      }
    }, 900);
  },
  cancelHold() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  },
  onClick() {
    if (this.holdTriggered) {
      this.holdTriggered = false;
      return;
    }
    if (window.EchoApp) {
      window.EchoApp.selectBubble(this.data.id);
    }
  },
});
