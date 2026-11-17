// PRISM BREAK — sound effects synthesised with WebAudio. No audio files, no network:
// every effect is an oscillator or a filtered noise burst shaped at play time.
// The context is created lazily on the first user gesture; if audio is unavailable
// (headless browser, blocked autoplay) every call quietly does nothing.

let ctx = null;
let master = null;

function ensureContext() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

function blip(freqFrom, freqTo, seconds, type = 'square', volume = 1) {
  const ac = ensureContext();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}

function noiseBurst(seconds, volume = 1) {
  const ac = ensureContext();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, t);
  filter.frequency.exponentialRampToValueAtTime(180, t + seconds);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  paddle() { blip(220, 330, 0.06, 'square', 0.7); },
  wall() { blip(180, 140, 0.05, 'square', 0.5); },
  brick(combo) {
    const step = Math.min(combo, 16);
    const base = 340 * Math.pow(1.059, step);
    blip(base, base * 1.4, 0.07, 'triangle', 0.9);
  },
  hard() { blip(140, 110, 0.06, 'sawtooth', 0.6); },
  boom() { noiseBurst(0.32, 1); blip(120, 40, 0.3, 'sawtooth', 0.8); },
  split() { blip(660, 990, 0.09, 'triangle', 0.8); },
  power() { blip(520, 780, 0.09, 'square', 0.8); setTimeout(() => blip(780, 1180, 0.1, 'square', 0.8), 60); },
  laser() { blip(1250, 300, 0.08, 'sawtooth', 0.35); },
  launch() { blip(300, 620, 0.12, 'triangle', 0.8); },
  loseLife() { blip(420, 90, 0.45, 'sawtooth', 0.9); },
  levelClear() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, f, 0.14, 'triangle', 0.9), i * 90)); },
  bossHit() { blip(200, 160, 0.05, 'square', 0.5); },
  bossDown() { noiseBurst(0.6, 1); [392, 523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, f * 1.01, 0.16, 'triangle', 0.9), i * 100)); },
  gameOver() { [440, 349, 262, 196].forEach((f, i) => setTimeout(() => blip(f, f * 0.94, 0.22, 'triangle', 0.9), i * 150)); },
  victory() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, f, 0.18, 'triangle', 0.9), i * 120)); },
};
