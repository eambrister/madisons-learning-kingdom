import {games, subjects, rewards, demos, fresh, levelFor, question, summary, merge} from './engine.js';
import {picture, icon, has, labelOf, pictureIds} from './art.js';
import * as cloud from './cloud.js';

const app = document.querySelector('#app');
let state = fresh(), account = null, configured = false;
let view = 0;            // increments on every screen change; async work checks it to cancel itself
let parentOpen = false;  // true only while the unlocked parent area is on screen
let world = 'forest';

// ---------- Storage (never throws into the UI) ----------
const localKey = () => (account ? 'madison-' + account.uid : 'madison-demo');
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
};
function readLocal() {
  try {
    const s = JSON.parse(store.get(localKey()));
    if (!s || typeof s !== 'object' || !s.events || !s.settings) return fresh();
    s.settings = {...fresh().settings, ...s.settings};
    return s;
  } catch { return fresh(); }
}
let saveWarned = false;
function persist() {
  if (!store.set(localKey(), JSON.stringify(state)) && !saveWarned) {
    saveWarned = true;
    notice('This device could not save progress. Play still works; progress may be lost when the page closes.');
  }
  if (account) {
    clearTimeout(persist.timer);
    persist.timer = setTimeout(() => cloud.save(state).catch(() => notice('Saved on this device. Cloud sync needs a connection.')), 600);
  }
}
state = readLocal();
world = store.get('madison-world') || 'forest';

let noticeTimer;
function notice(message) {
  const n = document.querySelector('#notice');
  n.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (n.textContent = ''), 6500);
}

// ---------- Speech ----------
// One voice at a time: every call cancels what is playing. Resolves when speech ends, or after a
// length-based fallback so the app never waits forever on browsers that drop the end event.
const synth = window.speechSynthesis;
let speechId = 0;
function stopSpeech() { speechId++; try { synth?.cancel(); } catch {} }
function say(text) {
  stopSpeech();
  const id = speechId;
  const fallback = 1200 + text.length * 75;
  if (!synth || !text) return wait(Math.min(fallback, 600));
  return new Promise(resolve => {
    const done = () => { clearTimeout(t); resolve(); };
    const t = setTimeout(done, fallback);
    // Safari can drop an utterance queued in the same tick as cancel().
    setTimeout(() => {
      if (id !== speechId) return done();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.82; u.pitch = 1.05;
      const v = synth.getVoices().find(v => v.lang === 'en-US' && v.localService) || synth.getVoices().find(v => v.lang === 'en-US');
      if (v) u.voice = v;
      u.onend = done; u.onerror = done;
      synth.speak(u);
    }, 60);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- DOM helpers ----------
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined && text !== null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function button(content, fn, cls, label) {
  const b = el('button', typeof content === 'string' ? content : undefined, cls);
  if (content instanceof Node) b.append(content);
  b.type = 'button';
  b.onclick = fn;
  if (label) b.setAttribute('aria-label', label);
  return b;
}
// Trusted static SVG from art.js only. User text never goes through this.
function art(markup, cls = 'art') { const s = el('span', undefined, cls); s.innerHTML = markup; return s; }
const pic = id => art(picture(id));
const ico = (id, label) => art(icon(id, label), 'ico');
function iconButton(id, label, fn, cls = '') { return button(ico(id, ''), fn, 'iconbtn ' + cls, label); }

// Render an answer token: picture id, letter tile, number card, rock pile, or plain text.
function token(t) {
  const s = String(t);
  if (s.startsWith('L:')) return el('span', s.slice(2), 'tile');
  if (s.startsWith('N:')) {
    const n = Number(s.slice(2)), w = el('span', undefined, 'numcard');
    w.append(el('span', String(n), 'numeral'));
    const dots = el('span', undefined, 'dots'); for (let i = 0; i < n; i++) dots.append(el('i'));
    w.append(dots); return w;
  }
  if (s.startsWith('P:')) {
    const n = Number(s.slice(2)), w = el('span', undefined, 'pile');
    for (let i = 0; i < n; i++) w.append(pic('rock'));
    return w;
  }
  if (has(s)) return pic(s);
  return el('span', s, 'textchoice');
}
function tokenLabel(t) {
  const s = String(t);
  if (s.startsWith('L:')) return 'letter ' + s.slice(2);
  if (s.startsWith('N:')) return s.slice(2);
  if (s.startsWith('P:')) return s.slice(2) + ' rocks';
  return has(s) ? labelOf(s) : s;
}

// ---------- Routing (back button and refresh work) ----------
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
function route() {
  const h = location.hash || '#/';
  const m = h.match(/^#\/play\/(\w+)$/);
  if (m && games.some(g => g.id === m[1])) return startGame(games.find(g => g.id === m[1]));
  if (h === '#/treasures') return treasures();
  if (h === '#/parent') return gate();
  return home();
}
window.addEventListener('hashchange', route);
function resetView() { view++; stopSpeech(); app.replaceChildren(); parentOpen = false; window.scrollTo(0, 0); }

// ---------- Home ----------
const WORLDS = [
  {id:'forest', name:'Animal Forest', art:'tree',   scene:['tree','fox','rabbit','tree'], hello:'Welcome to the Animal Forest!'},
  {id:'castle', name:'Magic Castle',  art:'castle', scene:['crown','castle','flower'],    hello:'Welcome to the Magic Castle!'},
  {id:'space',  name:'Space Adventure', art:'planet', scene:['star','rocket','planet'],   hello:'Welcome to Space Adventure!'},
];
function setWorld(id) { world = id; store.set('madison-world', id); }
function home() {
  resetView();
  const w = WORLDS.find(x => x.id === world) || WORLDS[0];
  const hero = el('section', undefined, 'hero world-' + w.id);
  const scene = el('div', undefined, 'scene');
  w.scene.forEach(id => scene.append(pic(id)));
  scene.append(art(picture(state.equipped && has(state.equipped) ? state.equipped : 'castle'), 'art equipped'));
  hero.append(scene, iconButton('speaker', 'Say hello', () => say(`Hello, Madison! ${w.hello} Tap a picture to play.`), 'big'));
  swipe(hero, dir => { const i = WORLDS.indexOf(w); setWorld(WORLDS[(i + dir + WORLDS.length) % WORLDS.length].id); home(); say(WORLDS.find(x => x.id === world).hello); });
  app.append(hero);

  const worlds = el('div', undefined, 'worlds');
  for (const x of WORLDS) {
    const b = button(pic(x.art), () => { setWorld(x.id); home(); say(x.hello); }, 'world' + (x.id === w.id ? ' selected' : ''), x.name);
    b.setAttribute('aria-pressed', String(x.id === w.id));
    worlds.append(b);
  }
  app.append(worlds);

  const grid = el('div', undefined, 'grid games');
  for (const g of games.filter(g => state.settings.enabled.includes(g.subject))) {
    const b = button(pic(g.art), () => go('#/play/' + g.id), 'card', g.name);
    b.append(el('span', g.name, 'cardname'));
    grid.append(b);
  }
  grid.append(button(ico('gift', ''), () => go('#/treasures'), 'card treasure-card', 'My treasures'));
  app.append(grid);
  if (grid.children.length === 1) app.append(el('p', 'All subjects are paused. A grown-up can choose activities in Parents.', 'tiny'));
  app.append(el('p', account ? 'Private family progress · Signed in' : 'Saved on this device · Parents can connect a private account', 'tiny'));
}

// Horizontal swipe on an element. Tap alternatives always exist alongside.
function swipe(target, fn) {
  let x0 = null, y0 = 0;
  target.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  target.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) fn(dx < 0 ? 1 : -1);
  });
  target.addEventListener('pointercancel', () => (x0 = null));
}

// ---------- Drag with Pointer Events (tap is always the alternative) ----------
function draggable(source, targets, onDrop) {
  source.classList.add('draggable');
  let start = null, moved = false;
  source.addEventListener('pointerdown', e => {
    if (source.disabled) return;
    start = {x:e.clientX, y:e.clientY, id:e.pointerId}; moved = false;
    source.setPointerCapture(e.pointerId);
  });
  source.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 10) return;
    moved = true;
    source.classList.add('dragging');
    source.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    for (const t of targets()) t.classList.toggle('over', hit(t, e));
  });
  const end = e => {
    if (!start) return;
    const wasDrag = moved; start = null;
    source.classList.remove('dragging'); source.style.transform = '';
    const over = targets().find(t => hit(t, e));
    targets().forEach(t => t.classList.remove('over'));
    if (wasDrag) { source.dataset.dragged = '1'; setTimeout(() => delete source.dataset.dragged, 50); if (over && e.type === 'pointerup') onDrop(over); }
  };
  source.addEventListener('pointerup', end);
  source.addEventListener('pointercancel', end);
}
function hit(node, e) { const r = node.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }

// ---------- Game screen ----------
let current = null, round = 0;
const demoKey = id => 'madison-demo-seen-' + id;
function startGame(g) {
  current = g; round = 0;
  if (!store.get(demoKey(g.id))) { store.set(demoKey(g.id), '1'); return playRound({demo:true}); }
  playRound();
}

const PRAISE = ['You found it!', 'Yes! Well done!', 'That is right!', 'Great listening!', 'You did it!'];
function playRound({demo = false} = {}) {
  resetView();
  const token0 = view, g = current;
  const q = question(g.id, demo ? 1 : levelFor(state, g.id), state.settings.stories);
  let missed = false, done = false, phase = q.kind === 'memory' ? 'look' : 'ask';
  let spoken = q.prompt;

  // Toolbar: pictures only. Grown-ups get aria labels.
  const bar = el('div', undefined, 'toolbar');
  const replay = iconButton('speaker', 'Hear it again', () => say(spoken), 'replay');
  bar.append(iconButton('home', 'Home', () => go('#/')), replay, iconButton('hand', 'Show me how', () => { if (!demo) playRound({demo:true}); }));
  const dots = el('div', undefined, 'rounds'); dots.setAttribute('aria-label', `Round ${Math.min(round + 1, 5)} of 5`);
  for (let i = 0; i < 5; i++) dots.append(el('i', undefined, i < round ? 'on' : ''));
  bar.append(dots);
  app.append(bar);

  const panel = el('section', undefined, 'question' + (demo ? ' demo' : ''));
  const scene = el('div', undefined, 'scene');
  let slot = null, dragItem = null;
  for (const s of q.scene) {
    if (s.count) { const row = el('div', undefined, 'counted'); for (let i = 0; i < s.count; i++) row.append(pic(s.pic)); scene.append(row); }
    else if (s.slot) { slot = art(icon('slot', 'empty spot'), 'art slot'); scene.append(slot); }
    else if (s.icon) scene.append(art(icon(s.icon, ''), 'art'));
    else scene.append(pic(s.pic));
  }
  if (q.drag) { dragItem = el('div', undefined, 'dragitem'); dragItem.append(token(q.drag)); dragItem.setAttribute('aria-hidden', 'true'); scene.append(dragItem); }
  const target = el('div', undefined, 'target'); // memory: who to find
  scene.append(target);
  panel.append(scene);
  const caption = el('p', q.prompt, 'caption'); // for grown-ups; Madison hears it
  panel.append(caption);

  const choices = el('div', undefined, 'answers n' + q.options.length + (q.options.some(o => String(o).startsWith('P:')) ? ' wide' : ''));
  const buttons = q.options.map(o => {
    const b = button(token(o), () => { if (b.dataset.dragged) return; choose(o, b); }, 'opt', tokenLabel(o));
    b.dataset.value = o;
    choices.append(b);
    return b;
  });
  panel.append(choices);
  const feedback = el('div', '', 'feedback'); feedback.setAttribute('aria-live', 'polite');
  panel.append(feedback);
  app.append(panel);

  // Drag wiring (optional; tapping an option does the same thing).
  if (!demo && q.kind === 'drag') {
    if (dragItem) draggable(dragItem, () => buttons.filter(b => !b.disabled), b => choose(b.dataset.value, b));
    if (q.dropSlot && slot) buttons.forEach(b => draggable(b, () => [slot], () => choose(b.dataset.value, b)));
  }

  function choose(value, b) {
    if (demo || done || phase !== 'ask' || token0 !== view) return;
    if (value !== q.answer) {
      missed = true;
      b.disabled = true; b.classList.add('wrong');
      feedback.replaceChildren();
      say('Hmm. Try another one.');
      return;
    }
    done = true;
    b.classList.add('right');
    if (slot) slot.replaceChildren(token(q.answer));
    if (q.kind === 'memory') b.replaceChildren(token(q.answer));
    buttons.forEach(x => (x.disabled = x !== b));
    // Record exactly one outcome per round: first try or not.
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    state.events[id] = {id, game:g.id, firstTry:!missed, at:Date.now()};
    round++;
    persist();
    const total = Object.keys(state.events).length;
    const earned = total % 5 === 0 && total / 5 <= rewards.length;
    feedback.replaceChildren(ico('check', ''));
    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    const finished = round >= 5;
    const nextBtn = finished
      ? button(pic('star'), () => { round = 0; go('#/treasures'); }, 'nextbtn', 'All done! See treasures')
      : iconButton('next', 'Play again', () => playRound(), 'nextbtn');
    panel.append(nextBtn);
    spoken = `${praise} ${earned ? 'You found a new treasure!' : ''} ${finished ? 'All done! Tap the star.' : 'Tap the arrow to play again.'}`;
    say(spoken);
    nextBtn.focus({preventScroll:true});
  }

  // Memory: show the friends, then hide them on a timer; a new round or screen cancels the timer.
  async function runMemory() {
    buttons.forEach(b => (b.disabled = true));
    spoken = 'Look! ' + q.options.map(labelOf).join(', ') + '.';
    await Promise.all([say(spoken), wait(q.showMs)]);
    if (token0 !== view) return;
    buttons.forEach(b => { b.replaceChildren(ico('hidden', '')); b.disabled = false; b.setAttribute('aria-label', 'Hiding place'); b.classList.add('covered'); });
    target.replaceChildren(pic(q.answer));
    phase = 'ask';
    spoken = `Now they are hiding. Where is the ${labelOf(q.answer)}?`;
    say(spoken);
  }

  async function runDemo() {
    buttons.forEach(b => (b.disabled = true));
    await say(demos[g.id]);
    if (token0 !== view) return;
    if (q.kind === 'memory') {
      buttons.forEach((b, i) => b.replaceChildren(token(q.options[i])));
      await Promise.all([say('Look! ' + q.options.map(labelOf).join(', ') + '.'), wait(2500)]);
      if (token0 !== view) return;
      buttons.forEach(b => b.replaceChildren(ico('hidden', '')));
      target.replaceChildren(pic(q.answer));
      await say(`Where is the ${labelOf(q.answer)}?`);
    } else {
      await say(q.prompt);
    }
    if (token0 !== view) return;
    const answerBtn = buttons.find(b => b.dataset.value === q.answer);
    const from = (dragItem || panel.querySelector('.scene')).getBoundingClientRect();
    const hand = art(icon('hand', ''), 'demohand');
    document.body.append(hand);
    const to = answerBtn.getBoundingClientRect();
    const place = r => { hand.style.left = (r.left + r.width / 2 + scrollX - 10) + 'px'; hand.style.top = (r.top + r.height / 2 + scrollY) + 'px'; };
    place(reducedMotion() ? to : from);
    if (dragItem && !reducedMotion()) {
      dragItem.style.transition = 'transform 1.2s ease-in-out';
    }
    await wait(80);
    place(to);
    if (dragItem && !reducedMotion()) dragItem.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
    await wait(reducedMotion() ? 300 : 1300);
    if (token0 !== view) { hand.remove(); return; }
    answerBtn.classList.add('right');
    if (q.kind === 'memory') answerBtn.replaceChildren(token(q.answer));
    if (slot) slot.replaceChildren(token(q.answer));
    await say('Like that! Now you try.');
    hand.remove();
    if (token0 !== view) return;
    playRound();
  }
  // Remove a stray demo hand when the screen changes.
  document.querySelectorAll('.demohand').forEach(h => h.remove());

  if (demo) return void runDemo();
  if (q.kind === 'memory') { buttons.forEach((b, i) => b.replaceChildren(token(q.options[i]))); runMemory(); }
  else say(q.prompt);
  // iOS Safari speaks only after a tap. After a refresh straight into a game, pulse the speaker.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) replay.classList.add('pulse');
}

// ---------- Treasures ----------
function treasures() {
  resetView();
  const earned = Math.min(rewards.length, Math.floor(Object.keys(state.events).length / 5));
  app.append(el('h2', 'Madison’s treasures', 'title'));
  const shown = el('div', undefined, 'equipped-big');
  shown.append(has(state.equipped) ? pic(state.equipped) : el('span', String(state.equipped || ''), 'textchoice'));
  app.append(shown);
  const grid = el('div', undefined, 'grid rewards');
  rewards.forEach((r, i) => {
    const open = i < earned;
    const b = button(open ? pic(r) : ico('lock', ''), () => {
      if (!open) return;
      state.equipped = r; persist();
      shown.replaceChildren(pic(r));
      say(`Your ${labelOf(r)} is in your kingdom now!`);
    }, 'reward' + (open ? '' : ' locked'), open ? labelOf(r) : 'Locked treasure');
    b.disabled = !open;
    grid.append(b);
  });
  app.append(grid, iconButton('home', 'Home', () => go('#/'), 'big'));
  say(earned ? 'Your treasures! Tap one to put it in your kingdom.' : 'Play games to find treasures!');
}

// ---------- Parent gate and area ----------
function gate() {
  resetView();
  const p = el('section', undefined, 'panel');
  p.append(el('h2', 'Grown-ups only'), el('p', account ? 'Enter your account password to open settings.' : 'Create or enter this device’s parent password (8+ characters). It is a child gate, not account security.'));
  const input = el('input'); input.type = 'password'; input.autocomplete = 'current-password';
  const label = el('label', account ? 'Account password' : 'Parent password'); label.append(input);
  const open = async () => {
    try {
      if (account) await cloud.login(account.email, input.value);
      else {
        if (input.value.length < 8) throw Error('Use at least eight characters.');
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.value));
        const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
        const old = store.get('madison-parent-hash');
        if (old && old !== hash) throw Error('Password did not match.');
        store.set('madison-parent-hash', hash);
      }
      parentArea();
    } catch (e) { notice(e.message); }
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  p.append(label, button('Open parent area', open, 'primary'), button('Back', () => go('#/')));
  app.append(p);
  input.focus();
}
function field(labelText, type, value, max) {
  const label = el('label', labelText), input = el('input');
  input.type = type; input.value = value ?? '';
  if (max) input.maxLength = max;
  label.append(input);
  return {label, input};
}
function pictureSelect(labelText) {
  const label = el('label', labelText), select = el('select');
  for (const id of [...pictureIds].sort((a, b) => labelOf(a).localeCompare(labelOf(b)))) { const o = el('option', labelOf(id)); o.value = id; select.append(o); }
  label.append(select);
  return {label, select};
}
function parentArea() {
  resetView();
  parentOpen = true;
  app.append(el('h2', 'Parent garden'), el('p', 'Practice progress helps you choose activities. It is not a developmental assessment.', 'tiny'));

  const accountPanel = el('section', undefined, 'panel');
  accountPanel.append(el('h3', 'Private family account'));
  if (account) {
    accountPanel.append(el('p', account.email),
      button('Sync now', async () => { try { await cloud.save(state); const d = await cloud.load(); if (d) state = merge(state, d); persist(); notice('Progress synced.'); parentArea(); } catch { notice('Sync failed. Check your connection.'); } }),
      button('Sign out', async () => { try { await cloud.logout(); go('#/'); } catch { notice('Sign out failed. Check your connection.'); } }));
  } else {
    accountPanel.append(el('p', configured ? 'Sign in to sync across devices. Progress saved on this device stays separate.' : 'Firebase isn’t configured yet. Play works on this device; follow README.md to connect your project.'));
    const email = field('Parent email', 'email', ''), password = field('Account password', 'password', '');
    password.input.minLength = 8;
    accountPanel.append(email.label, password.label);
    for (const create of [false, true]) accountPanel.append(button(create ? 'Create parent account' : 'Sign in', async () => { try { await cloud.login(email.input.value, password.input.value, create); } catch (e) { notice(e.message); } }));
  }
  app.append(accountPanel);

  const settings = el('section', undefined, 'panel');
  settings.append(el('h3', 'Learning controls'));
  const minutes = field('Gentle daily reminder after this many minutes (0 = off)', 'number', state.settings.minutes);
  minutes.input.min = 0; minutes.input.max = 120;
  settings.append(minutes.label);
  const enabled = subjects.map(s => { const label = el('label', undefined, 'check'), c = el('input'); c.type = 'checkbox'; c.checked = state.settings.enabled.includes(s); label.append(c, document.createTextNode(s)); settings.append(label); return [s, c]; });
  const selects = {};
  for (const g of games) {
    const label = el('label', g.name), select = el('select');
    for (const [v, t] of [['', 'Automatic'], ['1', 'Level 1'], ['2', 'Level 2'], ['3', 'Level 3']]) { const o = el('option', t); o.value = v; select.append(o); }
    select.value = state.settings.levels[g.id] || '';
    selects[g.id] = select; label.append(select); settings.append(label);
  }
  settings.append(button('Show the “how to play” demos again', () => { games.forEach(g => { try { localStorage.removeItem(demoKey(g.id)); } catch {} }); notice('Demos will play the next time each game opens.'); }));
  settings.append(button('Save learning controls', () => {
    state.settings.minutes = Math.max(0, Math.min(120, Math.round(Number(minutes.input.value)) || 0));
    state.settings.enabled = enabled.filter(x => x[1].checked).map(x => x[0]);
    state.settings.levels = Object.fromEntries(Object.entries(selects).map(([k, v]) => [k, v.value]));
    persist(); notice('Learning controls saved.');
  }, 'primary'));
  app.append(settings);

  const progress = el('section', undefined, 'panel');
  progress.append(el('h3', 'Practice by game'));
  const table = el('table'), head = el('tr');
  for (const h of ['Game', 'Rounds', 'First try', 'Level']) head.append(el('th', h));
  table.append(head);
  for (const g of games) {
    const rows = summary(state.events, g.id), r = el('tr');
    for (const text of [g.name, rows.length, rows.length ? Math.round(rows.filter(e => e.firstTry).length / rows.length * 100) + '%' : '—', levelFor(state, g.id)]) r.append(el('td', String(text)));
    table.append(r);
  }
  progress.append(table);
  progress.append(el('p', 'Sound Safari currently uses the device voice for letter sounds. These are provisional and will be replaced by reviewed recordings.', 'tiny'));
  app.append(progress);

  const content = el('section', undefined, 'panel');
  content.append(el('h3', 'Your story shelf'), el('p', 'Add a short story Madison will hear, a question, and two pictures to choose from. Built-in stories stay available.', 'tiny'));
  const text = field('Story (read aloud)', 'text', '', 300), prompt = field('Question (read aloud)', 'text', '', 100);
  const scenePic = pictureSelect('Story picture'), right = pictureSelect('Correct answer picture'), wrong = pictureSelect('Other choice picture');
  content.append(text.label, prompt.label, scenePic.label, right.label, wrong.label);
  content.append(button('Add story', () => {
    const v = {text:text.input.value.trim(), prompt:prompt.input.value.trim(), scene:scenePic.select.value, answer:right.select.value, other:wrong.select.value};
    if (!v.text || !v.prompt) return notice('Write a story and a question.');
    if (v.text.length > 300 || v.prompt.length > 100) return notice('Keep the story under 300 characters and the question under 100.');
    if (![v.scene, v.answer, v.other].every(has)) return notice('Choose pictures from the list.');
    if (v.answer === v.other) return notice('Choose two different answer pictures.');
    if (state.settings.stories.length >= 30) return notice('The story shelf holds 30 stories. Remove one first.');
    state.settings.stories.push({text:v.text, prompt:v.prompt, scene:[v.scene], answer:v.answer, options:[v.answer, v.other]});
    persist(); parentArea(); notice('Story added.');
  }));
  state.settings.stories.forEach((s, i) => content.append(button('Remove: ' + String(s.text).slice(0, 45), () => { state.settings.stories.splice(i, 1); persist(); parentArea(); })));
  app.append(content,
    el('p', 'Microphone: off. This app never asks for microphone access.', 'tiny'),
    button('Lock and return to Madison', () => go('#/'), 'primary'));
}

// ---------- Header ----------
document.querySelector('#home').addEventListener('click', e => { e.preventDefault(); go('#/'); });
document.querySelector('#parent').addEventListener('click', () => go('#/parent'));
document.querySelector('#home').replaceChildren(art(picture('castle')));

// ---------- Gentle daily reminder: device-local, never blocks play ----------
let reminderDay = null;
setInterval(() => {
  if (document.hidden || parentOpen) return;
  const day = new Date().toLocaleDateString('en-CA'), key = localKey() + '-time-' + day;
  const seconds = Number(store.get(key) || 0) + 10;
  store.set(key, String(seconds));
  if (reminderDay !== day && state.settings.minutes > 0 && seconds >= state.settings.minutes * 60) {
    reminderDay = day;
    notice('A little pause? You can keep playing when you’re ready.');
    say('You have been exploring for a while. It is a good time to stretch. You can keep playing when you are ready.');
  }
}, 10000);

// ---------- Cloud (optional) ----------
cloud.connect(async u => {
  account = u; state = readLocal();
  if (u) {
    try { const remote = await cloud.load(); if (remote) state = merge(state, remote); store.set(localKey(), JSON.stringify(state)); }
    catch { notice('Cloud unavailable. This device’s saved progress is ready.'); }
  }
  if (!location.hash.startsWith('#/play')) route();
}).then(ok => { configured = ok; }).catch(() => notice('Cloud setup is unavailable. Play on this device is ready.'));

route();
