# Madison’s Learning Kingdom

A phone-first educational web-app starter for Madison, age two. Prepared for Eddie to continue in Claude Code. No build dependencies or paid services are required for the local demo.

## Start here

1. Extract this entire folder and open it in Claude Code.
2. Read `CLAUDE_HANDOFF.md`, then run `npm start`.
3. Open http://localhost:5173 in your browser. Stop the server with Ctrl+C.
4. Run `npm test` for the learning-engine checks.

Python 3 and Node.js 20+ are needed for those commands. Do not open index.html directly: JavaScript modules require an HTTP server.

## What works now

- **Look and feel.** Bright, chunky, toy-like design. Each world has its own animated sky (drifting clouds, castle sparkles, twinkling stars). Each subject has its own colour. Pip, an original little dragon, guides every screen: blinks, flaps, cheers on a right answer, tilts its head on a wrong one. Confetti, a striped progress bar and a "You did it!" celebration after five rounds. All motion stops under the phone's Reduce Motion setting.
- **Music and sounds.** Original short tunes for each world plus sound effects, generated in the browser (`public/audio.js`; no audio files, no services). Music is soft during games and drops almost to silence whenever the voice speaks. Music button on Home; also in Parents.
- **Deliberately left out:** hearts or lives, daily streaks, coin counters and timers. They add pressure and conflict with the agreed requirements.
- Ten games, two in each of Reading, Math, Language, Thinking and Nature. Each has three real levels (more choices, harder distinctions, bigger numbers, AB then AAB patterns, 2 to 4 hidden cards).
- **Picture-first.** Every answer, game card, world and button is an original local SVG illustration (`public/art.js`). No emoji in child play. Game names are shown small for grown-ups; Madison navigates by pictures and spoken prompts.
- **Spoken demos.** The first time a game opens, a hand shows how to play on a practice round while the instructions are spoken. The hand button replays the demo any time; parents can reset demos.
- **Drag or tap.** Letter Twins and Animal Homes: slide the big picture onto the answer. Magic Patterns: slide an answer into the empty spot. Tapping always works too. Built on Pointer Events (works with touch, mouse and pen). Swipe the world banner on Home to change world; the three world buttons do the same.
- **Hidden Friends** shows the friends, hides them automatically, then shows who to find. Leaving or starting a new round cancels pending timers.
- **Back, refresh and the parent gate.** Each screen has its own address, so the phone's back button and refresh behave. The parent area always asks for the password again after you leave it.
- **Audio.** Replay stops the current narration before speaking. Leaving a screen or switching apps stops speech. On iPhone, speech needs a first tap; after a refresh straight into a game the speaker button pulses.
- **Saving.** Progress saves on the device. If the browser refuses to save (private mode, full storage), play continues and a grown-up message appears.
- Phone portrait, 320px wide screens, landscape (side-by-side layout), large text and reduced motion are handled.
- One first-try outcome is recorded per round; adaptation is unchanged (every 5 rounds per game, 4 to 5 first-try successes raises the level, 0 to 2 lowers it, levels stay 1 to 3). Parents can lock a level.
- Parent area: account, reminder minutes, subjects, levels, progress table, story shelf (stories are shown as text, never HTML; pictures chosen from the illustration list).
- No microphone, advertising, analytics, chat, purchases or outside links in child play.

## Connect a separate Firebase project

Use a NEW project, separate from Eddie’s coaching business.

1. In https://console.firebase.google.com create a project and register a Web app. Do not enable Analytics for this starter.
2. Enable Authentication → Email/Password. Enable Cloud Firestore in production/locked mode, choosing a suitable region.
3. Put the web configuration object into `public/config.js` in place of `null`. Web configuration is delivered to the browser; never add service account files or admin credentials.
4. Deploy the supplied `firestore.rules` BEFORE using cloud data. Rules restrict each `/parents/{uid}` document to that signed-in UID and deny all unmatched paths.
5. Install the Firebase CLI in your own development environment, run `firebase login`, then `firebase use --add` and select the new project. Run `firebase deploy --only firestore:rules,hosting` only when ready to publish.
6. Add the hosting domain to Authentication → Settings → Authorized domains. Add localhost explicitly if needed for development.
7. Open Parents, create a parent account, and sign in to the SAME account on the second device. Use “Sync now” or reload to pull newer progress. Automatic saves push local outcomes; there is no live listener.

Firebase references: https://firebase.google.com/docs/web/setup and https://firebase.google.com/docs/firestore/security/rules-conditions . Verify SDK/CLI versions and available free quotas during setup. The current starter pins the modular CDN SDK to 12.0.0; Claude should review/update the pin before deployment and repeat checks. No Firebase credentials were provided here, so live authentication, security rules and cross-device operation have NOT been integration-tested.

## Important prototype limits / next implementation work

This is a functional starter, not a finished educational product.

- Story, animal-home and nature question banks are small. Some games currently change choice counts or number ranges with level; others reuse their question bank at every level. Expand all three levels meaningfully before describing the full curriculum as adaptive.
- Sound Safari’s synthesized “mmm/sss/buh/puh” prompts are provisional. Browser TTS is not reliable phonics instruction. Replace with reviewed recordings of clean phonemes, avoiding added “uh”; make prompts match the chosen teaching method.
- US voice availability, audio behavior, pronunciation and touch MUST be checked on Madison’s actual iPhone. iOS audio generally needs an initial user tap. Replay is available. No audio recordings are bundled.
- World selection changes the home theme, not game mechanics. Rewards are a starter treasure shelf and selected decoration. Full character outfits, castle furnishing placement and an animal/planet discovery book are pending.
- Browser speech recognition is deliberately OFF. A future adapter may expose availability, start/cancel, transcript and uncertain results; do not enable it or request microphone access without a new parent decision. Hosting Permissions-Policy blocks microphones today.
- The local parent password is a child gate, not server authentication. Someone controlling the browser can clear or bypass local state. Firebase Auth and Firestore rules protect cloud data. There is no password recovery UI yet; use the Firebase console/provider recovery flow until implemented.
- Active visible time is counted every ten seconds on each device, including menu time. It is a device-local daily reminder, not synchronized family screen time, and it never blocks play. Default is 15 minutes because no duration was chosen; parent can change it or disable it.
- Firestore uses one document per parent for simplicity. It has a finite document-size limit; migrate events into per-event documents with pagination and rules before long-term usage. Concurrent events merge by UUID; settings are last-save-wins and can be overwritten by a stale second device. Pull via Sync now before editing on another device. No unattended multi-device editing guarantees.
- No service worker/offline installation, account/data deletion UI, full data schema validation, rule emulator tests or password brute-force controls yet. The demo works locally; cloud features require network access.
- The app records completed rounds and first-try accuracy, not specific misconceptions or developmental milestones. Retry as often as needed. No streak penalties, leaderboards or punitive feedback.

## Validation performed

- `npm test`: 7 engine tests pass. These check that every option has a picture, answers are correct (counts, bigger pile, pattern continuation, letter twins), difficulty grows across levels, adaptation is bounded, events deduplicate, and custom stories are used.
- `npm run test:browser`: 13 Chromium tests pass. They play a full round of all ten games at iPhone 13 portrait, 320px, iPhone landscape and desktop, checking for no errors, no element past the screen edge, all buttons at least 56px, and exactly one recorded outcome per round. They also cover drag for three games, back/forward/refresh, the parent gate relocking, memory hiding (including accessibility labels), replay cancelling narration, demos with and without reduced motion, storage failure, 150% text at 320px, and story text injection.
- Browser tests need Playwright: `npm install`, then `npx playwright install chromium`, then `npm run test:browser`.

**Not yet verified:** a real iPhone with real Safari speech and touch. Speech in the browser tests is a recorder, not a real voice. Firebase sign-in and sync have not been run against a live project or emulator.

## Project map

- `public/index.html`, `style.css`: responsive visual shell.
- `public/engine.js`: game banks, question generation, adaptation, event merging.
- `public/art.js`: original SVG illustrations, interface icons and Pip the dragon.
- `public/audio.js`: synthesized music and sound effects.
- `tools/build-artifact.mjs`: builds one self-contained page for private claude.ai hosting.
- `public/app.js`: screens, speech, local persistence, rewards, parent controls.
- `public/cloud.js`, `config.js`: opt-in Firebase connection and authenticated syncing.
- `firebase.json`, `firestore.rules`: hosting settings and private owner rules.
- `tests/engine.test.js`: learning-engine tests.
- `tests/browser.test.mjs`: Chromium smoke tests across phone sizes.
- `CLAUDE_HANDOFF.md`: requirements and concrete continuation instructions.
