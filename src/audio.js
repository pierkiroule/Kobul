let context;
let drone;
let analyser;
let freqData;
let timeData;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function ensureAnalyser() {
  if (!context || analyser) return analyser;
  analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.82;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.frequencyBinCount);
  return analyser;
}

export function startAmbient() {
  if (context) return;
  context = new (window.AudioContext || window.webkitAudioContext)();
  const analyserNode = ensureAnalyser();

  const master = context.createGain();
  master.gain.value = 0.02;
  master.gain.linearRampToValueAtTime(0.08, context.currentTime + 8);

  const slowPad = context.createOscillator();
  slowPad.type = 'sawtooth';
  slowPad.frequency.setValueAtTime(54, context.currentTime);
  slowPad.frequency.exponentialRampToValueAtTime(36, context.currentTime + 24);

  const halo = context.createOscillator();
  halo.type = 'sine';
  halo.frequency.setValueAtTime(31, context.currentTime);
  halo.detune.setValueAtTime(2, context.currentTime);

  const shimmer = context.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(0.55, context.currentTime);
  shimmer.frequency.linearRampToValueAtTime(0.3, context.currentTime + 26);

  const shimmerGain = context.createGain();
  shimmerGain.gain.value = 14;
  shimmer.connect(shimmerGain.gain);

  drone = context.createOscillator();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(72, context.currentTime);
  drone.frequency.exponentialRampToValueAtTime(52, context.currentTime + 30);
  shimmerGain.connect(drone.detune);

  const gentleNoise = context.createBufferSource();
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.12;
  }
  gentleNoise.buffer = buffer;
  gentleNoise.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  filter.Q.value = 0.6;

  const delay = context.createDelay(4);
  delay.delayTime.value = 1.1;
  const feedback = context.createGain();
  feedback.gain.value = 0.28;

  delay.connect(feedback).connect(delay);

  slowPad.connect(filter);
  halo.connect(filter);
  drone.connect(filter);
  gentleNoise.connect(filter);
  filter.connect(master);
  master.connect(delay);
  master.connect(analyserNode).connect(context.destination);
  delay.connect(analyserNode).connect(context.destination);

  slowPad.start();
  halo.start();
  shimmer.start();
  drone.start();
  gentleNoise.start();
}

export function stopAmbient() {
  if (!context || !drone) return;
  drone.stop(context.currentTime + 0.5);
  drone = null;
}

export function getAudioDynamics() {
  if (!analyser || !freqData || !timeData) return { level: 0, swell: 0, shimmer: 0 };
  analyser.getByteFrequencyData(freqData);
  analyser.getByteTimeDomainData(timeData);

  let sum = 0;
  for (let i = 0; i < timeData.length; i += 1) {
    const deviation = timeData[i] - 128;
    sum += deviation * deviation;
  }
  const rms = Math.sqrt(sum / timeData.length) / 90;

  let mid = 0;
  let high = 0;
  const midRange = [8, 42];
  const highRange = [42, 96];
  for (let i = midRange[0]; i < midRange[1]; i += 1) mid += freqData[i];
  for (let i = highRange[0]; i < highRange[1]; i += 1) high += freqData[i];
  mid /= midRange[1] - midRange[0];
  high /= highRange[1] - highRange[0];

  return {
    level: clamp(rms * 1.2, 0, 1),
    swell: clamp(mid / 220, 0, 1),
    shimmer: clamp(high / 260, 0, 1),
  };
}
