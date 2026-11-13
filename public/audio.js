// Original music and sound effects, synthesized live with the Web Audio API.
// No audio files, no outside services. Music ducks under the spoken voice so instructions stay clear.

let ctx = null, master, musicBus, sfxBus, noise;
let enabled = true, mode = 'home', song = null, step = 0, nextTime = 0, timer = null, ducked = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    const len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
  } catch { ctx = null; }
  return ctx;
}

// Call from any tap: browsers (iPhone especially) only allow sound after the user touches the page.
export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  if (c && enabled && song && !timer) startScheduler();
}

const midi = name => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + {C:0, D:2, E:4, F:5, G:7, A:9, B:11}[m[1]] + (m[2] ? 1 : 0);
};
const hz = n => 440 * 2 ** ((n - 69) / 12);

function tone(n, t, dur, {type = 'sine', gain = 0.3, bus = musicBus, attack = 0.006, slide = 0} = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz(n), t);
  if (slide) o.frequency.exponentialRampToValueAtTime(hz(n + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}
// Marimba-like mallet: a sine plus a quick bright overtone.
function mallet(n, t, dur, gain, bus = musicBus) {
  tone(n, t, dur, {gain, bus});
  tone(n + 24, t, dur * 0.25, {gain: gain * 0.18, bus});
}
function bell(n, t, dur, gain, bus = musicBus) {
  tone(n, t, dur, {type:'triangle', gain, bus});
  tone(n + 19, t, dur * 0.5, {gain: gain * 0.12, bus});
}

// ---------- Songs: original short loops, one per world ----------
// Each step is an eighth note: [melody, bass] (note names or '-' for rest).
const parse = s => s.trim().split(/\s+/).map(x => (x === '-' ? null : midi(x)));
const SONGS = {
  forest: {bpm:112, voice:mallet, gain:0.22,
    melody: parse(`E5 G5 A5 G5 E5 D5 C5 D5  E5 G5 A5 C6 A5 G5 E5 -  D5 E5 G5 E5 D5 C5 D5 E5  C5 - - - G4 - C5 -`),
    bass:   parse(`C3 - - - G2 - - -  A2 - - - E2 - - -  F2 - - - G2 - - -  C3 - - - G2 - - -`)},
  castle: {bpm:132, voice:bell, gain:0.2,
    melody: parse(`G5 - E5 - C5 -  D5 - E5 - F5 -  E5 - D5 - C5 -  G4 - - - - -  A5 - G5 - E5 -  F5 - E5 - D5 -  C5 - E5 - G5 -  C6 - - - - -`),
    bass:   parse(`C3 - E3 - G3 -  G2 - B2 - D3 -  C3 - E3 - G3 -  G2 - B2 - D3 -  F2 - A2 - C3 -  G2 - B2 - D3 -  C3 - E3 - G3 -  C3 - - - - -`)},
  space:  {bpm:84, voice:bell, gain:0.16,
    melody: parse(`C5 E5 G5 B5 G5 E5 C5 E5  A4 C5 E5 G5 E5 C5 A4 C5  F4 A4 C5 E5 C5 A4 F4 A4  G4 B4 D5 G5 D5 B4 G4 -`),
    bass:   parse(`C3 - - - - - - -  A2 - - - - - - -  F2 - - - - - - -  G2 - - - - - - -`)},
};

function startScheduler() {
  if (!ctx || !song) return;
  clearInterval(timer);
  nextTime = ctx.currentTime + 0.1; step = 0;
  timer = setInterval(() => {
    if (!ctx || !song) return;
    const spb = 60 / song.bpm / 2; // seconds per eighth note
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % song.melody.length;
      if (song.melody[i]) song.voice(song.melody[i], nextTime, spb * 1.8, song.gain);
      if (song.bass[i % song.bass.length]) tone(song.bass[i % song.bass.length], nextTime, spb * 3, {type:'triangle', gain:song.gain * 0.7});
      nextTime += spb; step++;
    }
  }, 90);
}
function busLevel() { return !enabled ? 0 : ducked ? 0.015 : mode === 'game' ? 0.35 : 1; }
function applyLevel(fast) { if (ctx) musicBus.gain.setTargetAtTime(busLevel(), ctx.currentTime, fast ? 0.05 : 0.3); }

// world: 'forest' | 'castle' | 'space'. playMode 'home' is full volume; 'game' is soft under the activity.
export function music(world, playMode = 'home') {
  mode = playMode;
  const next = SONGS[world] || SONGS.forest;
  if (next !== song) { song = next; if (ctx && enabled) startScheduler(); }
  applyLevel();
}
export function setMusic(on) {
  enabled = !!on;
  if (!enabled) { clearInterval(timer); timer = null; }
  else if (ctx && song && !timer) startScheduler();
  applyLevel(true);
}
export const musicOn = () => enabled;
export function duck(on) { ducked = on; applyLevel(true); }

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
});

// ---------- Sound effects ----------
function sfx(fn) { const c = ensure(); if (!c || c.state !== 'running') return; try { fn(c.currentTime); } catch {} }
export const sounds = {
  tap:    () => sfx(t => tone(midi('A5'), t, 0.09, {gain:0.25, bus:sfxBus, slide:-5})),
  pick:   () => sfx(t => tone(midi('C6'), t, 0.12, {gain:0.2, bus:sfxBus, slide:7})),
  correct:() => sfx(t => ['C6','E6','G6','C7'].forEach((n, i) => mallet(midi(n), t + i * 0.07, 0.35, 0.3, sfxBus))),
  wrong:  () => sfx(t => { tone(midi('G4'), t, 0.18, {type:'triangle', gain:0.2, bus:sfxBus}); tone(midi('E4'), t + 0.16, 0.25, {type:'triangle', gain:0.2, bus:sfxBus}); }),
  star:   () => sfx(t => ['E7','G7','C8'].forEach((n, i) => bell(midi(n), t + i * 0.05, 0.4, 0.12, sfxBus))),
  whoosh: () => sfx(t => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 0.4);
  }),
  fanfare:() => sfx(t => {
    ['C5','E5','G5'].forEach((n, i) => mallet(midi(n), t + i * 0.12, 0.3, 0.3, sfxBus));
    ['C5','E5','G5','C6'].forEach(n => bell(midi(n), t + 0.4, 1.2, 0.14, sfxBus));
  }),
};
