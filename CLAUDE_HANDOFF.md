# Claude Code handoff — Madison’s Learning Kingdom

Read this and README.md before modifying code. Continue the supplied starter; do not replace it with a generic landing page.

## Owner-approved requirements

Eddie wants a personal educational place for his daughter Madison, currently two. She recognizes letters, counts objects and knows familiar shapes/colors; letter sounds and more complex language are emerging. These are context, not a clinical evaluation. Build toward her observed ability, not an assumed reading age.

- Main device: phone, with real iPhone Safari testing.
- Mostly independent use with spoken US-English instructions (zee, American spelling), large picture-based targets and demonstrations.
- Madison can tap, drag and swipe. Free choice of activities; no mandatory sequence.
- Five priorities: letter sounds/early reading; quantities/simple math; speaking/listening/storytelling; memory/puzzles/problem-solving; animals/nature/how things work.
- Themes: animals/nature, princesses/castles/magic, space/exploration.
- First release: ten polished games, two per learning area. Existing ten names are implementation suggestions, not additional owner mandates.
- Adaptive difficulty plus parent manual level controls.
- Private parent account syncing across devices using a separate Firebase project. Free services first. No promises of unlimited free usage.
- Protected parent area: progress/skills practised; subject and difficulty settings; session reminder; story/content management.
- Daily time reminder allows continued play. Duration not chosen; current default of fifteen minutes is editable, not a personalized recommendation.
- Rewards: sticker collection, character outfits/castle decorations, animals and planets to discover. Starter has one combined shelf; complete the separate systems.
- Speech recognition deferred. Prepare a feature boundary only; do not enable capture or send voice data. Spoken practice can ask Madison to say a word without scoring or recording it.
- Deliver source files and beginner-friendly setup directions. Do not publish or configure Eddie’s other projects without his instruction.

## Work order

1. Run the starter and tests. Inspect each module and retain working behavior.
2. Run mobile browser smoke tests. Fix all runtime errors, overflow and interaction problems. Test portrait/landscape, browser refresh/back navigation, offline save failure, reduced motion, large text and audio replay. Review visual density: younger children should navigate by pictures, not reading.
3. Replace provisional synthesized phonemes with reviewed US-English recordings. Add an audio manifest and explicit missing-audio fallback; never silently substitute incorrect phonemes.
4. Expand each game’s reviewed content and three difficulty levels. Reading: sound/picture associations then simple sound discrimination, not reading paragraphs. Math: small quantities then comparison/add-one with manipulatives. Language: short recall then sequence and supported inference. Thinking: two then four hidden cards; AB then AAB patterns. Nature: familiar animal homes and cause/effect with accurate, unambiguous pictures. Avoid treating repeated correct guesses as evidence of mastery.
5. Add optional drag/drop and swipe interactions using Pointer Events and tap alternatives, never mouse-only HTML drag. Add spoken onboarding demos. Ensure each game can be completed without reading.
6. Complete world art, visible equipped rewards, outfits/castle decorations and animal/planet discoveries. No paid or random loot rewards; no urgency or streak pressure. Original local SVG illustration is appropriate; avoid relying on ambiguous emoji for final answer images.
7. Improve the Firebase data model to parent-owned child profiles, separate event docs and versioned settings. Add bounded event queries, retry queues, loading/error states, safe sign-out, export/delete, password reset and account-switch isolation. Treat data protection rules as the boundary, not the parent UI gate.
8. Implement Firebase emulator rule tests proving unauthenticated requests and parent B cannot read/write parent A’s data, and own-account requests are valid. Validate record shape/size; never use permissive test-mode rules.
9. Let Eddie enter web config through config.js or environment tooling. Do not request admin keys or passwords in chat. Do not add paid AI APIs. Review official Firebase documentation and SDK releases before upgrading the CDN pin.
10. Report what works, exact validation run and remaining limitations. Keep speech recognition disabled. Ask Eddie only for meaningful missing choices; do not reopen settled requirements.

## Acceptance checklist

- [ ] Ten distinct games with meaningful content at all three levels.
- [ ] All child tasks understandable from speech and pictures.
- [ ] iPhone Safari tested with actual audio and touch; 56px+ main targets.
- [ ] Memory hides answers and a fresh round cancels stale interactions.
- [ ] Replay stops overlapping narration; leaving a screen stops its audio.
- [ ] First-try outcomes persisted once and adaptation bounded.
- [ ] Parent settings gated and gate relocked on leaving.
- [ ] Daily reminder gentle, editable and nonblocking.
- [ ] All three reward systems visibly usable.
- [ ] Custom story text rendered as text, never HTML; input validated.
- [ ] Cloud progress follows the correct account; offline events survive retry.
- [ ] Rules tested across two parents; no third-party trackers or microphone access.
- [ ] Setup directions tested from a fresh extracted folder.

## Suggested first instruction to Claude Code

“Read CLAUDE_HANDOFF.md and README.md, run the starter and tests, then continue the work order. Preserve the agreed requirements. Begin by fixing and testing the mobile experience and listing incomplete starter features. Do not deploy, enable microphone recognition, or introduce paid services.”
