// Learning engine: game list, question generation, adaptation and event merging.
// Answers and options are picture ids from art.js, or typed tokens:
//   'L:M' a letter tile, 'N:3' a number card (numeral + dots), 'P:3' a pile of 3 rocks.
// Anything else (for example an older custom story) renders as plain text.

export const games = [
  {id:'sounds',  name:'Sound Safari',       subject:'Reading',  art:'ear'},
  {id:'letters', name:'Letter Twins',       subject:'Reading',  art:'letters'},
  {id:'count',   name:'Star Counter',       subject:'Math',     art:'star'},
  {id:'more',    name:'More Moon Rocks',    subject:'Math',     art:'rock'},
  {id:'story',   name:'Story Castle',       subject:'Language', art:'book'},
  {id:'listen',  name:'Listen & Find',      subject:'Language', art:'bird'},
  {id:'memory',  name:'Hidden Friends',     subject:'Thinking', art:'cards'},
  {id:'pattern', name:'Magic Patterns',     subject:'Thinking', art:'gem'},
  {id:'habitat', name:'Animal Homes',       subject:'Nature',   art:'nest'},
  {id:'nature',  name:'Little Discoveries', subject:'Nature',   art:'plant'},
];
export const subjects = [...new Set(games.map(g => g.subject))];
export const rewards = ['flower','bow','heart','crown','gem','castle','fox','turtle','planet','rocket','star','bee'];

// Spoken onboarding demos, said while a hand shows the move on a practice round.
export const demos = {
  sounds:  'Listen to the sound. Then tap the picture that starts with that sound. Watch me!',
  letters: 'Look at the big letter. Find the same letter. Tap it, or slide the big letter onto it. Watch me!',
  count:   'Count the stars. Then tap the card with the same number of dots. Watch me!',
  more:    'Look at the two piles. Tap the pile with more rocks. Watch me!',
  story:   'Listen to the little story. Then tap the picture that answers the question. Watch me!',
  listen:  'Listen to the clue. Then tap the picture that matches. Watch me!',
  memory:  'Look at the friends. Then they hide! Tap where your friend is hiding. Watch me!',
  pattern: 'Look at the pattern. What comes next? Tap it, or slide it into the empty spot. Watch me!',
  habitat: 'Help the animal get home. Tap its home, or slide the animal onto it. Watch me!',
  nature:  'Listen to the question. Then tap the right picture. Watch me!',
};

export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const take = (a, n) => shuffle(a).slice(0, Math.max(0, n));

export function fresh() {
  return {version:1, events:{}, settings:{minutes:15, enabled:[...subjects], levels:{}, stories:[]}, equipped:'castle'};
}
export function summary(events, id) {
  return Object.values(events).filter(e => e.game === id)
    .sort((a, b) => a.at - b.at || String(a.id).localeCompare(String(b.id)));
}
export function levelFor(state, id) {
  const override = state.settings.levels[id];
  if (override) return Number(override);
  let level = 1;
  const rows = summary(state.events, id);
  for (let i = 0; i + 5 <= rows.length; i += 5) {
    const score = rows.slice(i, i + 5).filter(e => e.firstTry).length;
    if (score >= 4) level = Math.min(3, level + 1);
    if (score <= 2) level = Math.max(1, level - 1);
  }
  return level;
}
export function merge(a, b) {
  return {...a, events:{...a.events, ...b.events}, settings:b.settings || a.settings, equipped:b.equipped || a.equipped};
}

// The spoken name for a letter in US English ("zee").
export const letterName = l => (l === 'Z' ? 'zee' : l);

const make = q => ({...q, options: shuffle(q.options)});
const choiceCount = level => (level === 1 ? 2 : level === 2 ? 3 : 4);

// --- Content banks -------------------------------------------------------
// Phoneme cues are spoken by browser speech synthesis until reviewed recordings exist (work-order step 3).
const SOUNDS = [
  {sound:'mmm', word:'moon', pic:'moon'},
  {sound:'sss', word:'sun',  pic:'sun'},
  {sound:'buh', word:'bear', pic:'bear'},
  {sound:'puh', word:'pig',  pic:'pig'},
  {sound:'fff', word:'fish', pic:'fish'},
  {sound:'kuh', word:'cat',  pic:'cat'},
];
const LETTERS = {1:['A','B','M','S','O','T'], 2:['A','B','C','D','E','M','P','S','T','O']};
const LOOKALIKES = [['M','N','W'],['O','Q','C'],['E','F','B'],['P','R','B'],['V','W','Y'],['Z','N','S']];
const STORIES = [
  {text:'A little bunny felt hungry. She found a carrot and ate it all up.', prompt:'What did the bunny eat?', scene:['rabbit','carrot'], answer:'carrot', wrong:['sock','car','ball']},
  {text:'The princess planted a seed. She gave it water. A pretty flower grew.', prompt:'What grew from the seed?', scene:['crown','plant','drop'], answer:'flower', wrong:['car','shoe','ball']},
  {text:'The little bear was very sleepy. He climbed into bed and went to sleep.', prompt:'Where did the bear sleep?', scene:['bear','moon'], answer:'bed', wrong:['tree','car','water']},
  {text:'A fish swam in the water. Then a frog jumped in with a splash!', prompt:'Who jumped in the water?', scene:['fish','water'], answer:'frog', wrong:['dog','hen','bear']},
  {text:'The hen sat on her nest. Crack! A baby chick came out of the egg.', prompt:'What did the hen sit on?', scene:['hen','egg'], answer:'nest', wrong:['bike','bed','car']},
  {text:'The rocket flew up, up, up, past the moon, all the way to a planet.', prompt:'Where did the rocket go?', scene:['rocket','moon'], answer:'planet', wrong:['tree','doghouse','bed']},
];
const CLUES = [
  {clue:'the animal that says meow', answer:'cat', wrong:['dog','fish','bird']},
  {clue:'the animal that says woof', answer:'dog', wrong:['cat','frog','bee']},
  {clue:'something you wear on your feet', answer:'shoe', wrong:['apple','ball','bed']},
  {clue:'something you can eat', answer:'apple', wrong:['shoe','car','sock']},
  {clue:'something you can ride', answer:'bike', wrong:['apple','sock','tree']},
  {clue:'something you sleep in', answer:'bed', wrong:['ball','apple','bike']},
  {clue:'something that bounces', answer:'ball', wrong:['bed','tree','sock']},
];
const FRIENDS = ['fox','rabbit','bear','frog','cat','pig'];
const PATTERN_PAIRS = [['star','moon'],['flower','leaf'],['heart','gem'],['apple','ball'],['fish','bird']];
const HOMES = [
  {animal:'fish', home:'water'},
  {animal:'bird', home:'nest'},
  {animal:'bee',  home:'hive'},
  {animal:'dog',  home:'doghouse'},
];
const NATURE = [
  {prompt:'What helps a plant grow?', scene:['plant'], answer:'drop', wrong:['sock','car','shoe']},
  {prompt:'What shines in the daytime sky?', scene:['tree'], answer:'sun', wrong:['bed','sock','apple']},
  {prompt:'Which animal can fly with wings?', scene:['cloud'], answer:'bird', wrong:['turtle','pig','dog']},
  {prompt:'What falls from a rain cloud?', scene:['cloud'], answer:'drop', wrong:['shoe','apple','ball']},
  {prompt:'Which animal lives in the water?', scene:['water'], answer:'fish', wrong:['dog','hen','cat']},
  {prompt:'What does a hen lay?', scene:['hen'], answer:'egg', wrong:['ball','apple','shoe']},
  {prompt:'Which one grows on a tree?', scene:['tree'], answer:'apple', wrong:['shoe','car','sock']},
  {prompt:'Which animal carries its home on its back?', scene:['leaf'], answer:'turtle', wrong:['dog','bird','pig']},
];

// --- Question generation -------------------------------------------------
// Every question: {kind, prompt (spoken), scene[], answer, options[]}.
// kind 'drag' adds `drag` (an item to slide onto an option) or `dropSlot` (slide an option into the scene's slot).
export function question(id, level, stories = []) {
  level = Math.max(1, Math.min(3, Number(level) || 1));
  if (id === 'sounds') {
    const pool = level === 1 ? SOUNDS.slice(0, 4) : SOUNDS;
    const a = pick(pool);
    const others = take(pool.filter(x => x !== a), level === 1 ? 1 : 2).map(x => x.pic);
    // Level 1 also names the word (sound-picture association). Levels 2 and 3 ask by sound alone.
    const prompt = level === 1
      ? `${a.sound}. ${a.word}. Which picture starts with ${a.sound}?`
      : `Listen. ${a.sound}. ${a.sound}. Which picture starts with ${a.sound}?`;
    return make({kind:'choice', prompt, scene:[{icon:'speaker'}], answer:a.pic, options:[a.pic, ...others], provisionalAudio:true});
  }
  if (id === 'letters') {
    let a, others;
    if (level === 3) { const set = pick(LOOKALIKES); a = pick(set); others = set.filter(x => x !== a); }
    else { const pool = LETTERS[level]; a = pick(pool); others = take(pool.filter(x => x !== a), level === 1 ? 1 : 2); }
    return make({kind:'drag', prompt:`This is the letter ${letterName(a)}. Find the same letter.`, scene:[], drag:'L:'+a, answer:'L:'+a, options:['L:'+a, ...others.map(x => 'L:'+x)]});
  }
  if (id === 'count') {
    const max = level === 1 ? 2 : level === 2 ? 3 : 5;
    const n = 1 + Math.floor(Math.random() * max);
    const want = level === 1 ? 2 : 3;
    const nums = new Set([n]);
    for (const d of shuffle([-1, 1, 2, -2])) { if (nums.size >= want) break; if (n + d >= 1) nums.add(n + d); }
    return make({kind:'choice', prompt:'Count the stars. How many stars? Tap the card with the same number.', scene:[{count:n, pic:'star'}], answer:'N:'+n, options:[...nums].map(v => 'N:'+v)});
  }
  if (id === 'more') {
    const pairs = level === 1 ? [[1,3],[1,4],[2,5]] : level === 2 ? [[1,2],[2,4],[3,5],[2,3]] : [[3,4],[4,5],[2,3]];
    const [lo, hi] = pick(pairs);
    return make({kind:'choice', prompt:'Which pile has more rocks? Tap the bigger pile.', scene:[{pic:'moon'}], answer:'P:'+hi, options:['P:'+lo, 'P:'+hi]});
  }
  if (id === 'story') {
    const custom = stories.filter(s => s && s.text && s.prompt && s.answer && Array.isArray(s.options))
      .map(s => ({text:s.text, prompt:s.prompt, scene:Array.isArray(s.scene) ? s.scene : [], answer:s.answer, wrong:s.options.filter(o => o !== s.answer)}));
    const s = pick([...STORIES, ...custom]);
    const n = Math.min(choiceCount(level), 1 + s.wrong.length);
    return make({kind:'choice', story:true, prompt:`${s.text} ${s.prompt}`, scene:s.scene.map(x => ({pic:x})), answer:s.answer, options:[s.answer, ...take(s.wrong, n - 1)]});
  }
  if (id === 'listen') {
    const a = pick(CLUES);
    return make({kind:'choice', prompt:`Find ${a.clue}.`, scene:[{pic:'ear'}], answer:a.answer, options:[a.answer, ...take(a.wrong, choiceCount(level) - 1)]});
  }
  if (id === 'memory') {
    const options = take(FRIENDS, level + 1); // 2, 3, then 4 hidden cards
    return {kind:'memory', prompt:'Look at the friends. Remember where they are.', scene:[], answer:pick(options), options, showMs: level === 3 ? 3000 : 3500};
  }
  if (id === 'pattern') {
    const [a, b] = shuffle(pick(PATTERN_PAIRS));
    // Levels 1 and 2: AB. Level 3: AAB. The missing piece can fall on any part of the unit.
    const unit = level < 3 ? [a, b] : [a, a, b];
    const len = level === 1 ? 3 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 2);
    const seq = Array.from({length:len}, (_, i) => unit[i % unit.length]);
    const answer = unit[len % unit.length];
    const extra = take(PATTERN_PAIRS.flat().filter(x => x !== a && x !== b), level === 1 ? 0 : 1);
    return make({kind:'drag', dropSlot:true, prompt:'What comes next? Find the missing picture.', scene:[...seq.map(x => ({pic:x})), {icon:'slot', slot:true}], answer, options:[a, b, ...extra]});
  }
  if (id === 'habitat') {
    const a = pick(HOMES);
    const others = take(HOMES.filter(x => x !== a), choiceCount(level) - 1).map(x => x.home);
    return make({kind:'drag', prompt:`Where does the ${a.animal} live? Help the ${a.animal} get home.`, scene:[], drag:a.animal, answer:a.home, options:[a.home, ...others]});
  }
  const a = pick(NATURE);
  return make({kind:'choice', prompt:a.prompt, scene:a.scene.map(x => ({pic:x})), answer:a.answer, options:[a.answer, ...take(a.wrong, choiceCount(level) - 1)]});
}
