# Madison’s Learning Kingdom

A phone-first educational web-app starter for Madison, age two. Prepared for Eddie to continue in Claude Code. No build dependencies or paid services are required for the local demo.

## Start here

1. Extract this entire folder and open it in Claude Code.
2. Read `CLAUDE_HANDOFF.md`, then run `npm start`.
3. Open http://localhost:5173 in your browser. Stop the server with Ctrl+C.
4. Run `npm test` for the learning-engine checks.

Python 3 and Node.js 20+ are needed for those commands. Do not open index.html directly: JavaScript modules require an HTTP server.

## What works in this starter

- Ten selectable games, two in each of Reading, Math, Language, Thinking and Nature.
- Forest, castle and space home-screen themes; all games remain available in every theme.
- Tap-based choices, spoken US-English prompts through browser speech synthesis, and replay controls.
- First-try outcomes recorded separately from eventual completion. Every five completed rounds per game adjusts its level: four or five first-try successes raises it; zero to two lowers it; three holds it. Levels stay within 1–3.
- Per-game parent overrides, subject visibility, a daily reminder, practice summaries, custom story creation/removal.
- One treasure per five completed rounds, up to twelve. Choose an earned treasure as a decoration.
- Password-gated parent area. Firebase account reauthentication when signed in; local password hash for demo mode only.
- Local persistence, optional email/password Firebase accounts, and explicit/automatic cloud saves. A new account starts separately from demo progress.
- No microphone capture, advertising, analytics, chat, purchases, or external content links in child play.

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

- Choice inputs are tapping only. Drag/drop and swipe activities remain to implement with accessible tap alternatives; they were discussed as abilities, not required to start every game.
- Story, animal-home and nature question banks are small. Some games currently change choice counts or number ranges with level; others reuse their question bank at every level. Expand all three levels meaningfully before describing the full curriculum as adaptive.
- Sound Safari’s synthesized “mmm/sss/buh/puh” prompts are provisional. Browser TTS is not reliable phonics instruction. Replace with reviewed recordings of clean phonemes, avoiding added “uh”; make prompts match the chosen teaching method.
- US voice availability, audio behavior, pronunciation, emoji rendering and touch targets MUST be checked on Madison’s actual iPhone. iOS audio generally needs an initial user tap. Replay is available. No audio recordings are bundled.
- World selection changes the home theme, not game mechanics. Rewards are a starter treasure shelf and selected decoration. Full character outfits, castle furnishing placement and an animal/planet discovery book are pending.
- Browser speech recognition is deliberately OFF. A future adapter may expose availability, start/cancel, transcript and uncertain results; do not enable it or request microphone access without a new parent decision. Hosting Permissions-Policy blocks microphones today.
- The local parent password is a child gate, not server authentication. Someone controlling the browser can clear or bypass local state. Firebase Auth and Firestore rules protect cloud data. There is no password recovery UI yet; use the Firebase console/provider recovery flow until implemented.
- Active visible time is counted every ten seconds on each device, including menu time. It is a device-local daily reminder, not synchronized family screen time, and it never blocks play. Default is 15 minutes because no duration was chosen; parent can change it or disable it.
- Firestore uses one document per parent for simplicity. It has a finite document-size limit; migrate events into per-event documents with pagination and rules before long-term usage. Concurrent events merge by UUID; settings are last-save-wins and can be overwritten by a stale second device. Pull via Sync now before editing on another device. No unattended multi-device editing guarantees.
- No service worker/offline installation, account/data deletion UI, full data schema validation, rule emulator tests or password brute-force controls yet. The demo works locally; cloud features require network access.
- The app records completed rounds and first-try accuracy, not specific misconceptions or developmental milestones. Retry as often as needed. No streak penalties, leaderboards or punitive feedback.

## Validation performed

`npm test`: 3 tests passed, including 3,000 generated question checks across ten games and three levels, bounded difficulty changes and event deduplication.

Browser smoke testing was attempted with Playwright. Its bundled browser was absent, and system Chromium could not start because this environment denied its socket operation. Consequently no visual, touch or audio verification is claimed. Claude must run browser checks and test iPhone Safari before release. Firebase emulator tests are also pending.

## Project map

- `public/index.html`, `style.css`: responsive visual shell.
- `public/engine.js`: game banks, question generation, adaptation, event merging.
- `public/app.js`: screens, speech, local persistence, rewards, parent controls.
- `public/cloud.js`, `config.js`: opt-in Firebase connection and authenticated syncing.
- `firebase.json`, `firestore.rules`: hosting settings and private owner rules.
- `tests/engine.test.js`: learning-engine tests.
- `CLAUDE_HANDOFF.md`: requirements and concrete continuation instructions.
