// Browser smoke tests (Chromium via Playwright). Run: npm run test:browser
// Speech is replaced by a recorder so tests run fast and can check that narration never overlaps.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium, devices} = require('playwright');
const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'};

let server, base, browser;
test.before(async () => {
  server = http.createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const file = path || 'index.html';
    try { const body = await readFile(join(root, file)); res.writeHead(200, {'content-type':types[extname(file)] || 'application/octet-stream'}); res.end(body); }
    catch { res.writeHead(404); res.end(); }
  }).listen(0);
  base = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

const speechStub = () => {
  window.__speech = [];
  const fake = {
    speaking:false,
    getVoices: () => [],
    cancel() { window.__speech.push({cancel:true}); },
    speak(u) { window.__speech.push({text:u.text}); setTimeout(() => u.onend && u.onend(), 20); },
  };
  Object.defineProperty(window, 'speechSynthesis', {value:fake, configurable:true});
};
const skipDemos = () => { for (const g of ['sounds','letters','count','more','story','listen','memory','pattern','habitat','nature']) localStorage.setItem('madison-demo-seen-' + g, '1'); };

async function open(opts = {}, {demos = false, init} = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(speechStub);
  if (!demos) await ctx.addInitScript(skipDemos);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => m.type() === 'error' && page.errors.push(m.text()));
  await page.goto(base);
  await page.waitForSelector('.card');
  return {ctx, page};
}
const events = page => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('madison-demo') || '{"events":{}}').events).length);
// Measures every element's right edge: overflow-x:hidden on <body> would hide clipping from scrollWidth.
const overflow = page => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1) && !e.closest('.demohand, .dragging'); });
  return bad.length ? bad.slice(0, 3).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)).join(', ') : 0;
});

// Answer a round by tapping options until one is right. Returns number of taps.
async function solve(page) {
  if (await page.locator('.opt').first().isDisabled()) await page.waitForSelector('.opt.covered', {timeout:8000});
  let taps = 0;
  while (!(await page.locator('.nextbtn').count())) {
    const opt = page.locator('.opt:not([disabled]):not(.wrong)').first();
    await opt.click(); taps++;
    if (taps > 6) throw Error('could not solve round');
  }
  return taps;
}

const VIEWPORTS = [
  ['iPhone 13', devices['iPhone 13']],
  ['320px', {viewport:{width:320, height:640}, hasTouch:true, isMobile:true}],
  ['iPhone landscape', devices['iPhone 13 landscape']],
  ['desktop', {viewport:{width:1280, height:800}}],
];

for (const [name, opts] of VIEWPORTS) {
  test(`${name}: every game plays a full round with no errors or overflow`, async () => {
    const {ctx, page} = await open(opts);
    assert.equal(await overflow(page), 0, 'home overflow');
    const small = await page.$$eval('main button', bs => bs.filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.height < 56 || r.width < 56); }).map(b => b.getAttribute('aria-label') || b.textContent));
    assert.deepEqual(small, [], 'home targets under 56px');
    const ids = await page.$$eval('.card', cs => cs.map(c => c.getAttribute('aria-label')));
    assert.equal(ids.length, 11);
    for (let i = 0; i < 10; i++) {
      await page.locator('.card').nth(i).click();
      await page.waitForSelector('.opt');
      assert.equal(await overflow(page), 0, `${ids[i]} overflow`);
      const before = await events(page);
      await solve(page);
      assert.equal(await events(page), before + 1, `${ids[i]} records exactly one outcome`);
      const small = await page.$$eval('main button', bs => bs.filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.height < 56 || r.width < 56); }).length);
      assert.equal(small, 0, `${ids[i]} targets under 56px`);
      if (name === 'iPhone 13') await page.screenshot({path:`test-results/${name}-${i}.png`.replace(/ /g, '_')});
      await page.getByRole('button', {name:'Home'}).click();
      await page.waitForSelector('.card');
    }
    assert.deepEqual(page.errors, []);
    await ctx.close();
  });
}

test('drag works for Letter Twins, Animal Homes and Magic Patterns', async () => {
  const {ctx, page} = await open({viewport:{width:390, height:844}});
  const drag = async (from, to) => {
    const a = await from.boundingBox(), b = await to.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 20, {steps:3});
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps:8});
    await page.mouse.up();
  };
  // Letters: drag the big letter onto its twin.
  await page.goto(base + '#play-letters'); await page.waitForSelector('.dragitem');
  const letter = await page.locator('.dragitem').innerText();
  await drag(page.locator('.dragitem'), page.locator(`.opt[data-value="L:${letter}"]`));
  await page.waitForSelector('.nextbtn');
  // Habitat: drag the animal onto its home.
  const homes = {fish:'water', bird:'nest', bee:'hive', dog:'doghouse'};
  await page.goto(base + '#play-habitat'); await page.waitForSelector('.dragitem');
  const animal = await page.locator('.dragitem svg').getAttribute('aria-label');
  await drag(page.locator('.dragitem'), page.locator(`.opt[data-value="${homes[animal]}"]`));
  await page.waitForSelector('.nextbtn');
  // Pattern: drag options into the empty slot until one fits; wrong drops are rejected.
  await page.goto(base + '#play-pattern'); await page.waitForSelector('.slot');
  for (let i = 0; i < 4 && !(await page.locator('.nextbtn').count()); i++) await drag(page.locator('.opt:not([disabled])').first(), page.locator('.slot'));
  await page.waitForSelector('.nextbtn');
  // A short drag that misses every target must not answer.
  await page.goto(base + '#play-letters'); await page.waitForSelector('.dragitem');
  const before = await events(page);
  const box = await page.locator('.dragitem').boundingBox();
  await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y - 40, {steps:4}); await page.mouse.up();
  assert.equal(await events(page), before);
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('back, refresh, parent gate relock', async () => {
  const {ctx, page} = await open(devices['iPhone 13']);
  await page.locator('.card').first().click();
  await page.waitForSelector('.opt');
  await page.goBack(); await page.waitForSelector('.card');
  await page.goForward(); await page.waitForSelector('.opt');
  await page.reload(); await page.waitForSelector('.opt');
  assert.match(page.url(), /#play-sounds$/);
  await page.getByRole('button', {name:'Parents'}).click();
  await page.fill('input[type=password]', 'parent-pass-1');
  await page.getByRole('button', {name:'Open parent area'}).click();
  await page.waitForSelector('text=Parent garden');
  await page.goBack(); await page.waitForSelector('.opt');
  await page.goForward();
  await page.waitForSelector('text=Grown-ups only');
  assert.equal(await page.locator('text=Parent garden').count(), 0, 'gate relocked after leaving');
  await page.fill('input[type=password]', 'wrong-password');
  await page.getByRole('button', {name:'Open parent area'}).click();
  await page.waitForSelector('text=Password did not match.');
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('memory hides answers and a new round cancels stale timers', async () => {
  const {ctx, page} = await open(devices['iPhone 13']);
  await page.goto(base + '#play-memory'); await page.waitForSelector('.opt');
  assert.ok(await page.locator('.opt').first().isDisabled(), 'cannot tap while friends are showing');
  await page.getByRole('button', {name:'Home'}).click();
  await page.goto(base + '#play-memory'); await page.waitForSelector('.opt.covered', {timeout:8000});
  const labels = await page.$$eval('.opt', bs => bs.map(b => b.getAttribute('aria-label')));
  assert.ok(labels.every(l => l === 'Hiding place'), 'answers hidden from accessibility labels too');
  assert.equal(await page.locator('.opt svg[aria-label]:not([aria-label=""])').count(), 0, 'no picture labels leak');
  await page.waitForTimeout(4500);
  assert.equal(await page.locator('.opt.covered').count(), await page.locator('.opt').count(), 'no stale reveal');
  await ctx.close();
});

test('replay and navigation stop overlapping narration', async () => {
  const {ctx, page} = await open(devices['iPhone 13']);
  await page.locator('.card').nth(5).click(); await page.waitForSelector('.opt');
  await page.evaluate(() => (window.__speech.length = 0));
  await page.getByRole('button', {name:'Hear it again'}).click();
  await page.getByRole('button', {name:'Hear it again'}).click();
  await page.waitForTimeout(200);
  const log = await page.evaluate(() => window.__speech);
  // Every utterance is preceded by a cancel.
  log.forEach((e, i) => { if (e.text) assert.ok(log.slice(0, i).some(x => x.cancel), 'cancel before speak'); });
  assert.ok(log.filter(e => e.cancel).length >= 2);
  await page.evaluate(() => (window.__speech.length = 0));
  await page.getByRole('button', {name:'Home'}).click();
  await page.waitForSelector('.card');
  assert.ok((await page.evaluate(() => window.__speech))[0].cancel, 'leaving cancels audio');
  await ctx.close();
});

test('spoken demo runs on first visit, with reduced motion too', async () => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const {ctx, page} = await open({...devices['iPhone 13'], reducedMotion}, {demos:true});
    await page.locator('.card').nth(6).click(); // memory has the longest demo
    await page.waitForSelector('.question.demo');
    await page.waitForFunction(() => window.__speech.some(e => e.text));
    const spoken = await page.evaluate(() => window.__speech.filter(e => e.text).map(e => e.text).join(' | '));
    assert.match(spoken, /Watch me/);
    if (reducedMotion === 'no-preference') await page.screenshot({path:'test-results/demo.png'});
    await page.waitForSelector('.question:not(.demo)', {timeout:15000});
    await page.waitForSelector('.opt.covered', {timeout:8000});
    await solve(page);
    assert.equal(await page.locator('.demohand').count(), 0, 'demo hand removed');
    assert.deepEqual(page.errors, []);
    await ctx.close();
  }
});

test('storage failure keeps play working and tells the grown-up', async () => {
  const {ctx, page} = await open(devices['iPhone 13'], {init: () => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; }});
  await page.locator('.card').nth(2).click(); await page.waitForSelector('.opt');
  await solve(page);
  await page.waitForSelector('text=could not save progress');
  assert.deepEqual(page.errors, []);
  await ctx.close();
});

test('large text stays inside a 320px screen', async () => {
  const {ctx, page} = await open({viewport:{width:320, height:640}, isMobile:true, hasTouch:true});
  await page.addStyleTag({content:':root{font-size:150% !important}'});
  assert.equal(await overflow(page), 0, 'home');
  await page.screenshot({path:'test-results/large-text-home.png', fullPage:true});
  for (const id of ['count', 'more', 'memory', 'pattern']) {
    await page.goto(base + '#play-' + id); await page.waitForSelector('.opt');
    await page.addStyleTag({content:':root{font-size:150% !important}'});
    assert.equal(await overflow(page), 0, id);
  }
  await ctx.close();
});

test('custom story text is rendered as text, never HTML', async () => {
  const {ctx, page} = await open(devices['iPhone 13']);
  await page.goto(base + '#parents');
  await page.fill('input[type=password]', 'parent-pass-1');
  await page.getByRole('button', {name:'Open parent area'}).click();
  await page.getByLabel('Story (read aloud)').fill('<img src=x onerror="window.__xss=1">A frog hopped.');
  await page.getByLabel('Question (read aloud)').fill('Who hopped?');
  await page.getByLabel('Correct answer picture').selectOption('frog');
  await page.getByLabel('Other choice picture').selectOption('car');
  await page.getByRole('button', {name:'Add story'}).click();
  await page.waitForSelector('text=Story added.');
  await page.getByRole('button', {name:'Lock and return to Madison'}).click();
  for (let i = 0; i < 25; i++) {
    await page.goto(base + '#home'); await page.waitForSelector('.card');
    await page.goto(base + '#play-story'); await page.waitForSelector('.caption');
    if ((await page.locator('.caption').innerText()).includes('frog hopped')) break;
  }
  assert.match(await page.locator('.caption').innerText(), /<img src=x/);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await ctx.close();
});
