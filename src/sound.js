// All sound is synthesized with WebAudio — no audio files.
// dial-up handshake, error dings, clicks and hold music through a phone line.

let ctx = null;
let master, sfx, musicBus;
let volume = 0.7;
let muted = false;
let musicOn = false;
let schedTimer = null;

try {
  const s = JSON.parse(localStorage.getItem('plug.sound') || '{}');
  if (typeof s.v === 'number') volume = Math.min(1, Math.max(0, s.v));
  if (s.m) muted = true;
} catch {}

const save = () => {
  try { localStorage.setItem('plug.sound', JSON.stringify({ v: volume, m: muted })); } catch {}
};

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  sfx = ctx.createGain();
  sfx.gain.value = 0.9;
  sfx.connect(master);

  // music → telephone line (300–3400 Hz) → light saturation
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const sat = ctx.createWaveShaper(); sat.curve = curve(2.2);
  const post = ctx.createGain(); post.gain.value = 0.55;
  musicBus.connect(hp); hp.connect(lp); lp.connect(sat); sat.connect(post); post.connect(master);

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}

function curve(k) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}

export const getVolume = () => volume;
export const isMuted = () => muted;
export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  if (master && !muted) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
  save();
}
export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.03);
  save();
}

// ── primitives ───────────────────────────────────────────────
function tone(freqs, t, dur, dest, g, type = 'sine') {
  const gn = ctx.createGain();
  const a = g / freqs.length;
  gn.gain.setValueAtTime(0, t);
  gn.gain.linearRampToValueAtTime(a, t + 0.006);
  gn.gain.setValueAtTime(a, Math.max(t + 0.007, t + dur - 0.012));
  gn.gain.linearRampToValueAtTime(0, t + dur);
  gn.connect(dest);
  for (const f of freqs) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    o.connect(gn); o.start(t); o.stop(t + dur + 0.02);
  }
}

function noise(t, dur, dest, f0, f1, g, gated = 0) {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3.5;
  f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(g, t); gn.gain.linearRampToValueAtTime(g * 0.6, t + dur * 0.8); gn.gain.linearRampToValueAtTime(0, t + dur);
  if (gated) {
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = gated;
    const lg = ctx.createGain(); lg.gain.value = g * 0.45;
    lfo.connect(lg); lg.connect(gn.gain); lfo.start(t); lfo.stop(t + dur);
  }
  src.connect(f); f.connect(gn); gn.connect(dest);
  src.start(t); src.stop(t + dur);
}

// ── dial-up handshake (~3.6 s). returns duration in seconds ─
let dialOut = null;
export function stopDial() {
  if (dialOut && ctx) dialOut.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
}
export function dialup() {
  if (!ctx) return 0;
  const t0 = ctx.currentTime + 0.05;
  const out = ctx.createGain(); out.gain.value = 0.32; out.connect(sfx);
  dialOut = out;
  const line = ctx.createBiquadFilter(); line.type = 'bandpass'; line.frequency.value = 1400; line.Q.value = 0.45;
  line.connect(out);
  let t = t0;
  tone([350, 440], t, 0.5, line, 0.5); t += 0.6;                       // dial tone
  const pad = { 1: [697, 1209], 3: [697, 1477], 5: [770, 1336], 7: [852, 1209], 9: [852, 1477] };
  for (const d of '5551937') { tone(pad[d], t, 0.075, line, 0.7); t += 0.115; } // DTMF
  t += 0.22;
  tone([2100], t, 0.45, line, 0.32); t += 0.5;                           // answer tone
  for (let i = 0; i < 12; i++) { tone([i % 2 ? 1180 : 980], t, 0.03, line, 0.42); t += 0.03; } // warble
  noise(t, 0.5, line, 900, 2400, 0.9); t += 0.45;                        // sweep
  tone([1200, 2400], t, 0.22, line, 0.3, 'triangle'); t += 0.22;          // bong
  noise(t, 0.75, line, 2000, 1300, 1.0, 21); t += 0.75;                   // static
  return t - ctx.currentTime;
}

// ── small sfx ────────────────────────────────────────────────
export function ding(kind = 'error') {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const notes = kind === 'error' ? [659, 494] : kind === 'warn' ? [587, 587] : kind === 'ok' ? [784, 1175] : [880, 1319];
  notes.forEach((f, i) => {
    const s = t + i * 0.085;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.16, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, s + 0.55);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(sfx);
    o.start(s); o2.start(s); o.stop(s + 0.6); o2.stop(s + 0.6);
  });
}

export function click() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  noise(t, 0.018, sfx, 3200, 2600, 0.35);
}

export function zap() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(1600, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.25);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.3);
}

// ── hold music ───────────────────────────────────────────────
const BPM = 86;
const STEP = 60 / BPM / 2; // eighth notes
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60], // Am7
  [50, 57, 60, 65], // Dm7
  [43, 50, 53, 59], // G7
];
// 8 eighths per bar, 8 bars (two passes with a different ending)
const MEL = [
  76, null, 79, null, 81, 79, 76, null,
  72, null, 76, null, 74, 72, 69, null,
  74, null, 77, null, 76, 74, 72, null,
  71, null, 74, null, 72, 71, 67, null,
  76, null, 79, null, 81, 84, 81, null,
  72, null, 76, 79, 76, null, 72, null,
  74, null, 77, null, 81, 79, 77, 76,
  74, null, 71, null, 72, null, null, null,
];
let step = 0;
let nextT = 0;
let vib;

function schedule() {
  while (nextT < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % 8;
    const inBar = step % 8;
    const chord = CHORDS[bar % 4];
    if (inBar === 0) pad(chord, nextT, STEP * 8);
    if (inBar === 0 || inBar === 4) bass(chord[0] - 12, nextT, STEP * 3.2);
    if (inBar === 2 || inBar === 6) bass(chord[0] - 5, nextT, STEP * 1.4);
    const m = MEL[step % MEL.length];
    if (m) keys(m, nextT, STEP * 1.8);
    if (inBar % 2 === 1) brush(nextT);
    nextT += STEP; step++;
  }
}

function pad(ch, t, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.35);
  g.gain.setValueAtTime(0.05, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 0.1);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  g.connect(lp); lp.connect(musicBus);
  for (const n of ch.slice(1)) for (const det of [-7, 6]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n); o.detune.value = det;
    vib.connect(o.detune);
    o.connect(g); o.start(t); o.stop(t + dur + 0.15);
  }
}
function bass(n, t, dur) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(n);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = mtof(n + 12);
  const g2 = ctx.createGain(); g2.gain.value = 0.25;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
function keys(n, t, dur) {
  const f = mtof(n);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const a = ctx.createOscillator(); a.type = 'sine'; a.frequency.value = f;
  const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = f * 3.0;
  const bg = ctx.createGain(); bg.gain.setValueAtTime(0.18, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  vib.connect(a.detune);
  a.connect(g); b.connect(bg); bg.connect(g); g.connect(musicBus);
  a.start(t); b.start(t); a.stop(t + dur + 0.05); b.stop(t + dur + 0.05);
}
function brush(t) {
  const len = Math.ceil(ctx.sampleRate * 0.08);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
  const g = ctx.createGain(); g.gain.value = 0.05;
  s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + 0.09);
}

export function startMusic() {
  if (!ctx || musicOn) return;
  musicOn = true;
  vib = ctx.createGain(); vib.gain.value = 9;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.55; lfo.connect(vib); lfo.start();
  step = 0; nextT = ctx.currentTime + 0.1;
  musicBus.gain.setValueAtTime(0, ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
  schedTimer = setInterval(schedule, 60);
}
