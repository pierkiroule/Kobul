let context;
let drone;

export function startAmbient() {
  if (context) return;
  context = new (window.AudioContext || window.webkitAudioContext)();
  const gain = context.createGain();
  gain.gain.value = 0.04;
  gain.gain.linearRampToValueAtTime(0.06, context.currentTime + 6);

  drone = context.createOscillator();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(36, context.currentTime);
  drone.frequency.exponentialRampToValueAtTime(28, context.currentTime + 14);
  drone.connect(gain).connect(context.destination);
  drone.start();
}

export function stopAmbient() {
  if (!context || !drone) return;
  drone.stop(context.currentTime + 0.5);
  drone = null;
}
