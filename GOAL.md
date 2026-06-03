# Dune 3v3 Development Goal
/goal Create a smooth, fully playable online Dune: Imperium - Uprising 3v3 game for exactly the real target experience: 6 friends go to the website, create or join a room, choose Commander/Ally roles, and play a complete automated six-player 3v3 game together. The game should handle reconnects, refreshes, turn flow, hidden/private information, pending choices, combat, endgame, and all normal play without requiring a human admin to manually fix state. Do not spend time on authentication, accounts, permissions, security hardening, payments, public matchmaking, or other production SaaS concerns. For this private friend group, a room code/link plus player name/seat is enough.

/one_day_playable_milestone Optimize for getting to a fully playable automated multiplayer game in 1 day. Keep the existing clean-code, typed-rule, verifier, browser-test, and review guardrails, but bias decisions toward shipping missing gameplay and retiring blockers. When choosing between polish and playability, choose playability. When choosing between a perfect abstraction and a good reusable primitive that unlocks several cards/rules today, ship the good primitive and document follow-up cleanup.

/top_priority Fill feature gaps fast while protecting the good architecture already built. The current priority order is:
1. Make the full 6-player online flow work: room creation/join, role/seat selection, shared authoritative game state, turn permissions, hidden hand/intrigue visibility, reconnect/refresh recovery, and a complete-game path.
2. Remove manual gameplay dependencies: automate contract completion where possible, alliance/token movement, Maker Hooks/Shield Wall/sandworm effects, remaining leader/commander-board effects, remaining card effects, and conflict/endgame edge cases.
3. Retire redundant/dead/obsolete code that slows development or creates duplicate rule paths.
4. Preserve the typed declarative rules engine, focused modules, verifier scripts, browser scenarios, and clean state transitions.
5. Improve UX enough that six friends can understand whose turn it is, what they can do, what is pending, what changed, and how to recover after refresh/reconnect.

/multiplayer_target The finished web experience should support:
- create room / join room by link or code
- choose or claim one of 6 seats, with one Commander and two Allies per team
- show each player only their own hand, intrigue cards, and private choices
- show shared board/market/conflict/team state to everyone
- enforce turn order and pending-action ownership
- reconnect after browser refresh or temporary disconnect without losing the game
- tolerate a friend closing and reopening the tab
- persist active game state at least long enough for a normal session
- support spectators or unclaimed-seat viewing only if it is cheap; do not let it distract from the 6-player play path

/no_auth_scope Do not build real authentication. Use lightweight room/session identity such as room id, seat id, and a locally stored reconnect token. Keep honest-player private-game assumptions. Still avoid accidental hidden-information leaks in normal UI/API responses because hidden hands and Intrigues are core gameplay, not security theater.

/progress_bias For every task, ask: "Does this move us closer to six friends completing a game online today?" Prefer vertical slices that remove an actual blocker. Avoid broad rewrites, speculative abstractions, new frameworks, or cosmetic-only work unless they unblock gameplay. It is acceptable to leave documented rough edges if the game remains correct and playable.

/redundant_code_retirement Actively delete or retire redundant code while implementing gaps. If a typed spec path replaces a bespoke handler, remove the old handler and its stale tests/docs. If two helpers do the same rule work, consolidate them. If generated or fallback display text is no longer used for gameplay, keep it only for UI display or remove it. Reviewers must call out dead code, duplicate code paths, stale docs, unused exports, and obsolete manual fallbacks.

/architecture_mandate Keep building a typed, declarative card/effect system so most cards and rules are data/config instead of bespoke functions. Fast progress means implementing reusable effect patterns and migrating cards into declarative data. Adding a normal card should usually require editing typed card/effect params only, not adding a new bespoke `if (isXCard(...))` handler.

Maintain and extend the reusable `CardEffectSpec` / `GameEffectSpec` model with primitives for:
- triggers: agent play, reveal, acquire, plot intrigue, combat intrigue, conflict reward, endgame, round start/end
- costs: spice, water, Solari, influence loss, troop retreat, spy recall, card discard, card trash, contract completion, VP payment
- conditions: has influence, has alliance, has completed contracts, has troops, has sandworms, has spies, visited Maker space, team, role, commander/ally status, board-space type, combat participation
- selectors: self, activated ally, teammate, opponent, combat participant, board space, market card, reserve card, contract, intrigue, hand, discard, deck, play area, trashable card
- effects: gain/spend resources, draw cards, gain persuasion, gain strength, recruit/deploy/retreat troops, place/recall spies, gain/lose influence, gain VP, acquire card, take contract, complete contract, trash/discard cards, remove Shield Wall, summon sandworm, move market card, manipulate row
- choices: choose one, choose N, optional effect, pay-or-skip, target selection, split rewards, repeated effects, conditional branches
- routing rules: 3v3 Commander effects, activated Ally ownership, Commander personal board influence, shared/effective influence, team trade, Commander combat intrigue targeting

Implement generic resolvers that consume these specs and produce deterministic state changes plus pending actions for choices. Resolvers must stay strongly typed, easy to test, and covered by verifier scripts.

Only write bespoke card/rule code when it is the fastest safe way to unblock a playable game and cannot reasonably be represented by existing primitives. When this happens:
1. First ask whether a reusable primitive would cover this card/rule plus future cards.
2. If bespoke code is still necessary, keep it thin and route it through the same pending-action/state-change primitives.
3. Document why in `docs/card-effect-gaps.md`.
4. Add verifier coverage.
5. Retire the bespoke branch once a reusable primitive exists.

/feature_gap_attack Keep `docs/card-coverage.md`, `docs/card-effect-gaps.md`, and `docs/uprising-3v3-notes.md` honest and current. Each dev session should pick the highest-impact remaining manual/printed fallback or multiplayer blocker, implement it, test it, and update the docs. Do not just add more coverage notes; close gaps.

/acceptance_criteria_for_full_playable The game is considered playable when:
- 6 separate browser sessions can join the same room and claim all 6 roles/seats
- a player can refresh/reconnect and resume the same seat
- legal actions are enforced and illegal actions are blocked or unavailable
- the game automates setup, worker placement, reveal, buying, team trade, combat, conflict rewards, cleanup, endgame, and final team scoring
- private hands/Intrigues are only displayed to the owning player in normal play
- all game-critical card, leader, board-space, contract, conflict, Intrigue, objective, sandworm, Shield Wall, Maker Hooks, alliance, and Commander/Ally routing effects are automated or have a very explicit low-friction prompt
- no normal turn requires editing state by hand
- browser smoke/scenario tests can prove the app boots, joins a room, advances turns, handles pending choices, and survives refresh/reconnect

/rules_and_research Use web search and GitHub research for rules, card text, character abilities, board spaces, official FAQs, community references, and implementation artifacts. Download and organize useful assets and references. Keep notes in docs so subagents can use them. Official rules and official card text take priority over fan sources when sources disagree.

/six_player_board_warning Dune: Imperium - Uprising 3v3/six-player mode uses a different board from the normal two-to-four-player game. Do not assume the normal board is correct. The same named places can have different costs, rewards, icons, restrictions, or effects in 3v3 mode. Verify every board space against the correct six-player/3v3 board and official rules/reference images. If current code or assets use normal-board effects or art where the six-player board differs, update the code, data, tests, and assets.

/assets Assets matter because they make the game enjoyable, but do not let asset perfection block a complete playable game. Since this is only for my private friend group and we bought the board game, use the most accurate private-play assets available: card images, board images, leader images, icons, tokens, card backs, player boards, Commander boards, six-player board references, and visual references. Keep assets organized under `public/assets` and document source/coverage gaps in `docs/asset-coverage.md`.

/browser_testing The repo-owned Playwright browser pipeline is the default test path. Use `scripts/browser-debug.mjs` and the package scripts to drive scenarios, capture screenshots, capture state JSON, inspect console/request failures, and debug UI regressions. Add multiplayer/reconnect browser scenarios as soon as the room/session layer exists. A passing browser smoke with console error count 0 and request failure count 0 is required before claiming a playable milestone.

/subagents Fire up subagents aggressively to make progress faster, but split work by playable milestone and system area, not random card batches. Useful parallel tracks:
- multiplayer room/session/reconnect architecture
- role/seat selection and private-information UI
- rules gap closure from `docs/card-coverage.md`
- manual-control retirement from player panels/admin toggles
- contract completion automation
- leader, signet, and Commander-board automation
- Maker Hooks, Shield Wall, sandworm, and conflict edge cases
- effect primitive consolidation and obsolete-code deletion
- browser multiplayer/reconnect scenarios
- performance review and render/state-update bottlenecks
- asset gaps that directly affect play clarity

Each card/rules subagent should return reusable primitives plus migrated cards, not isolated bespoke handlers, unless bespoke handling is explicitly justified. Each cleanup subagent should delete or consolidate code, update tests/docs, and prove no behavior regressed.

/codex_dev_prompt Devs should prompt Codex with concrete, progress-biased tasks like:
"We need Dune 3v3 to be fully playable online by end of day. Pick the highest-impact remaining blocker in [area]. Inspect current code/docs first, implement the smallest clean vertical slice, remove redundant code made obsolete by the change, update verifier/browser coverage, and report what is now playable plus the next blocker. Preserve typed effect specs, deterministic state transitions, and existing verifier guardrails. Do not spend time on auth/security beyond simple private room/reconnect identity."

For feature-gap tasks, include:
- the exact gameplay blocker
- the files/docs that describe the gap
- the expected player-facing behavior
- the verifier/browser scenario that should prove it
- any old/manual/fallback code that should be retired after the implementation

/codex_reviewer_prompt Reviewers should review like senior gameplay engineers trying to get the game playable today. In addition to correctness, edge cases, and missing tests, reviewers must explicitly look for:
- unused code, unused exports, stale helpers, stale docs, and duplicate rule paths
- bespoke handlers that should now be declarative specs
- manual controls that should be automated or removed
- performance problems in React rendering, state copying, large derived computations, browser scenarios, or multiplayer state sync
- hidden-information leaks in normal gameplay responses/UI
- reconnect/session bugs and lost pending actions
- race conditions or conflicting writes in multiplayer actions
- regressions in existing verifier and browser-debug contracts

Reviewer output should lead with real blockers only. False positives should not block progress. If a finding is real but not needed for today's playable milestone, label it follow-up instead of derailing the current slice.

/code_quality Keep the code clean, typed, and easy to maintain, but optimize for progress toward playable automation. Avoid files over 1000 LOC. Break large files into focused modules/components. Preserve clear domain boundaries: data/specs, generic effect resolver, pending actions, state transitions, multiplayer/session state, UI panels, browser debug scripts, and verification scripts. Refactor when it removes real duplication, deletes obsolete code, or makes the next feature faster.

/git_workflow Use precise commits, each ideally under 5000 LOC changed. Do not bundle unrelated work. Prefer vertical slices that leave the game more playable after each commit.

/review_gate You are only allowed to commit after getting 3 consecutive clean reviews from Codex/GPT-5.5 high-thinking subagents. Definition of clean review: no real problem found in correctness, edge cases, tests, unused/redundant code, obvious performance risks, multiplayer/reconnect behavior, or hidden-information handling. Codex can return false positives, so inspect outputs and decide whether findings are real. Only count the review as clean if all real issues are resolved or the remaining findings are clearly false positives or explicitly accepted follow-ups.

/testing_requirements For every meaningful gameplay or multiplayer change:
- run relevant verifier scripts
- run TypeScript/build checks
- add or update browser debug scenarios where UI/pending choices/room flow/reconnect are affected
- capture screenshots/state JSON into `artifacts/qa/...`
- inspect console and request failures
- test refresh/reconnect when session state is affected
- document any manual test steps or remaining risks

/product_definition The finished game should feel like six friends smoothly playing the physical Dune: Imperium - Uprising 3v3 board game online: accurate rules, accurate cards, accurate six-player board spaces/effects, accurate board state, complete enough private-play assets/images, clear turn flow, helpful pending-action prompts, reliable conflict/combat/endgame handling, reconnect-safe multiplayer, no admin babysitting, and enough verifier/browser artifacts that progress is easy to inspect.
