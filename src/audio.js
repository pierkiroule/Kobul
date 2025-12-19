let context;
let drone;
let analyser;
let data;

function ensureAnalyser() {
  if (!context || analyser) return analyser;
  analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.86;
  data = new Uint8Array(analyser.frequencyBinCount);
  return analyser;
}

export function startAmbient() {
  if (context) return;
  context = new (window.AudioContext || window.webkitAudioContext)();
  const gain = context.createGain();
  gain.gain.value = 0.04;
  gain.gain.linearRampToValueAtTime(0.06, context.currentTime + 6);

  const subtleRing = context.createOscillator();
  subtleRing.type = 'sine';
  subtleRing.frequency.setValueAtTime(36, context.currentTime);
  subtleRing.frequency.exponentialRampToValueAtTime(28, context.currentTime + 14);

  const shimmer = context.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(0.4, context.currentTime);
  shimmer.frequency.linearRampToValueAtTime(0.55, context.currentTime + 18);

  const modulation = context.createGain();
  modulation.gain.value = 12;
  shimmer.connect(modulation.gain);

  drone = context.createOscillator();
  drone.type = 'sawtooth';
  drone.frequency.setValueAtTime(62, context.currentTime);
  drone.frequency.exponentialRampToValueAtTime(46, context.currentTime + 22);

  const analyserNode = ensureAnalyser();

  subtleRing.connect(gain);
  drone.connect(gain);
  modulation.connect(drone.detune);
  gain.connect(analyserNode).connect(context.destination);

  subtleRing.start();
  shimmer.start();
  drone.start();
}

export function stopAmbient() {
  if (!context || !drone) return;
  drone.stop(context.currentTime + 0.5);
  drone = null;
}

export function getAudioLevel() {
  if (!analyser || !data) return 0;
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const deviation = data[i] - 128;
    sum += deviation * deviation;
  }
  const rms = Math.sqrt(sum / data.length) / 64;
  return Math.min(1, Math.max(0, rms));
}
