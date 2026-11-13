import test from 'node:test';
import assert from 'node:assert/strict';
import {games, fresh, question, levelFor, merge, demos, rewards} from '../public/engine.js';
import {has} from '../public/art.js';

const renderable = t => /^(L:[A-Z]|N:\d+|P:\d+)$/.test(t) || has(t);
const sample = (id, level, n = 300) => Array.from({length:n}, () => question(id, level));

test('all ten games generate valid, renderable choices at every level', () => {
  assert.equal(games.length, 10);
  for (const g of games) for (let l = 1; l <= 3; l++) for (const q of sample(g.id, l)) {
    assert.ok(q.options.includes(q.answer), `${g.id} L${l}: answer in options`);
    assert.equal(new Set(q.options).size, q.options.length, `${g.id} L${l}: unique options`);
    assert.ok(q.prompt, `${g.id}: prompt`);
    for (const o of q.options) assert.ok(renderable(o), `${g.id}: option ${o} has a picture`);
    for (const s of q.scene) if (s.pic) assert.ok(has(s.pic), `${g.id}: scene picture ${s.pic}`);
    if (q.drag) assert.ok(renderable(q.drag), `${g.id}: drag item renders`);
  }
});

test('every game has a spoken demo and a picture card; every reward has art', () => {
  for (const g of games) { assert.ok(demos[g.id], g.id); assert.ok(has(g.art), g.id); }
  for (const r of rewards) assert.ok(has(r), r);
});

test('difficulty changes meaningfully across levels', () => {
  const maxOptions = (id, l) => Math.max(...sample(id, l).map(q => q.options.length));
  for (const id of ['sounds', 'letters', 'listen', 'story', 'habitat', 'nature', 'memory']) {
    assert.ok(maxOptions(id, 1) < maxOptions(id, 3), `${id}: more choices at level 3`);
  }
  // Sound Safari names the word only at level 1.
  for (const q of sample('sounds', 2)) assert.match(q.prompt, /^Listen\./);
  // Counting range grows.
  const maxCount = l => Math.max(...sample('count', l).map(q => q.scene[0].count));
  assert.equal(maxCount(1), 2); assert.equal(maxCount(3), 5);
  // Level 3 comparisons differ by one.
  for (const q of sample('more', 3)) { const [a, b] = q.options.map(o => Number(o.slice(2))); assert.equal(Math.abs(a - b), 1); }
  // Level 3 patterns are AAB.
  for (const q of sample('pattern', 3)) { const seq = q.scene.filter(s => s.pic).map(s => s.pic); assert.equal(seq[0], seq[1]); assert.notEqual(seq[1], seq[2]); }
});

test('answers are actually correct', () => {
  for (let l = 1; l <= 3; l++) {
    for (const q of sample('count', l)) assert.equal(q.answer, 'N:' + q.scene[0].count);
    for (const q of sample('more', l)) { const n = q.options.map(o => Number(o.slice(2))); assert.equal(q.answer, 'P:' + Math.max(...n)); }
    for (const q of sample('letters', l)) assert.equal(q.drag, q.answer);
    for (const q of sample('pattern', l)) {
      const seq = q.scene.filter(s => s.pic).map(s => s.pic);
      const unit = l < 3 ? 2 : 3;
      assert.equal(q.answer, seq[seq.length - unit], 'next item repeats the unit');
    }
    for (const q of sample('memory', l)) assert.equal(q.options.length, l + 1);
  }
});

test('adaptation uses five first-try outcomes and remains bounded', () => {
  const s = fresh();
  for (let i = 0; i < 15; i++) s.events[i] = {id:String(i), game:'count', at:i, firstTry:true};
  assert.equal(levelFor(s, 'count'), 3);
  for (let i = 15; i < 30; i++) s.events[i] = {id:String(i), game:'count', at:i, firstTry:false};
  assert.equal(levelFor(s, 'count'), 1);
  s.settings.levels.count = '2';
  assert.equal(levelFor(s, 'count'), 2);
});

test('merging preserves unique offline events and deduplicates retries', () => {
  const a = fresh(), b = fresh();
  a.events.a = {id:'a'}; b.events.b = {id:'b'}; b.events.a = {id:'a'};
  assert.equal(Object.keys(merge(a, b).events).length, 2);
});

test('custom stories are used and validated', () => {
  const stories = [{text:'Mia saw a frog.', prompt:'What did Mia see?', scene:['water'], answer:'frog', options:['frog', 'car']}, {bad:true}];
  const seen = new Set();
  for (let i = 0; i < 400; i++) { const q = question('story', 1, stories); seen.add(q.answer); assert.ok(q.options.includes(q.answer)); }
  assert.ok(seen.has('frog'));
});
