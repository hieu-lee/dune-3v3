# Dune 3v3 Development Goal
/goal The game is now considered functionally complete for the private friend-group target. The new goal is to make the UI as good as possible: beautiful, readable, fast, responsive, board-game-like, and easy for six friends to use during a full Dune: Imperium - Uprising 3v3 session. Preserve the automated rules, room flow, reconnects, hidden information, pending choices, combat, endgame, and final scoring that already work. Do not trade correctness for visuals.

/ui_improvement_branch All UI polish work should happen on the `ui-improvement` branch unless the user explicitly asks otherwise.

/ui_first_milestone Optimize for the best possible play experience rather than more functionality. Gameplay systems are already strong; future development should focus on layout, information hierarchy, visual polish, action clarity, responsiveness, accessibility, perceived quality, and the feeling of playing a premium digital board-game table. Keep the existing clean-code, typed-rule, verifier, browser-test, and review guardrails.

/top_priority Make the current game look and feel excellent while protecting the working functionality. The current priority order is:
1. Improve the table at a glance: active player, phase, pending action, team state, conflict state, market, board, and private hand should be immediately understandable.
2. Improve visual hierarchy and density: reduce clutter, align sections, make important actions prominent, make secondary details available without overwhelming the player.
3. Improve card and board readability: images, text, resources, costs, ownership, disabled states, and legal actions should be legible on real laptop screens.
4. Improve pending-choice and action panels: every prompt should clearly explain who must act, what choice is being made, what each option costs, and what will happen.
5. Improve multiplayer room UX: create/join/claim/reconnect/recover flows should feel calm, obvious, and trustworthy.
6. Preserve performance, clean React structure, deterministic state transitions, and all existing tests/verifiers/browser scenarios.

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

/progress_bias For every task, ask: "Does this make the actual play session clearer, prettier, faster, or more pleasant without risking correctness?" Prefer vertical UI slices that can be judged in screenshots: one panel, one layout region, one recurring visual pattern, or one player-facing flow. Avoid broad rewrites, speculative design systems, new frameworks, or restyling that does not improve the real table screenshots.

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

/ui_gap_attack Keep UI quality honest and current. Each dev session should inspect fresh screenshots before choosing work, identify the highest-impact visual or usability weakness visible in those screenshots, improve it, run the relevant verifier/browser checks, inspect new screenshots, and report what improved plus what still looks weak. Do not just describe UI issues; close visible gaps.

/screenshot_driven_iteration Devs must iteratively look at screenshots and use their own product/design judgment to decide what to improve next. For UI work:
- Run the relevant Playwright browser scenario before or during exploration.
- Inspect the generated PNGs and matching state JSON, not just terminal output.
- Compare before/after screenshots when practical.
- Prefer improvements that are visible in real captured game states.
- Keep iterating until the changed area clearly looks or feels better.
- If a screenshot reveals a functional bug, fix it only if it is tightly related to the UI work or ask before expanding scope.

/state_by_state_ui_completion The UI goal is achieved only when every meaningful state of the game has been reviewed through screenshots and no remaining state obviously needs improvement. Devs should work state by state: capture or inspect screenshots for setup, room/seat claiming, Agent turns, Reveal turns, market buying, pending choices, team trade, conflict, Combat Intrigues, cleanup/round transitions, Endgame, reconnect/recovery, private-information views, disabled/error states, dense late-game states, and responsive layouts. For each state, iterate on the UI until it is good enough for real play before moving on or explicitly record why it is already good enough. When there are no more game states with visible UI weaknesses, this UI-improvement goal is complete.

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

/subagents Fire up subagents aggressively to make UI progress faster, but split work by visible surface area and screenshot evidence. Useful parallel tracks:
- screenshot-based UI audit and ranked improvement plan
- table layout, spacing, alignment, and density
- active-player, phase, and pending-action clarity
- card, market, board-space, and conflict readability
- player column and team-summary clarity
- room creation/join/claim/reconnect polish
- responsive/mobile layout review
- visual consistency, design tokens, CSS cleanup, and component reuse
- React render/performance review for dense table screens
- browser scenario coverage and artifact inspection

Each UI subagent should inspect screenshots, cite the visible problems it is addressing, return a focused patch or recommendation, and prove the change with screenshots plus relevant verifier/browser commands. Cleanup subagents should delete or consolidate styling/component duplication and prove no behavior regressed.

/codex_dev_prompt Devs should prompt Codex with concrete, screenshot-driven UI tasks like:
"The Dune 3v3 game is functionally complete; now improve the UI on `ui-improvement`. Run or inspect the relevant browser screenshots first, pick the highest-impact visible weakness in [area], implement the smallest clean UI slice, keep gameplay behavior unchanged, run build/verifiers/browser checks, inspect the new screenshots, and report what now looks better plus the next visible weakness. Preserve typed rules, deterministic state transitions, hidden-information guarantees, and existing verifier/browser guardrails."

For UI tasks, include:
- the screenshot or browser scenario that shows the weakness
- the visible player-facing problem
- the intended UX improvement
- the files/components/styles likely involved
- the verifier/browser scenario that should prove nothing regressed
- the before/after artifacts to inspect

/codex_reviewer_prompt Reviewers should review like senior product engineers and UI-focused gameplay engineers. In addition to correctness, edge cases, and missing tests, reviewers must explicitly look for:
- visual regressions in the relevant screenshots
- unclear action hierarchy, confusing pending prompts, or hidden critical state
- cramped, misaligned, inconsistent, or low-contrast UI
- broken responsive behavior or overflowing dense table sections
- unused code, unused exports, stale helpers, stale docs, duplicate styling, and obsolete components
- unnecessary bespoke styling where a local reusable component/token would be clearer
- performance problems in React rendering, state copying, large derived computations, browser scenarios, or multiplayer state sync
- hidden-information leaks in normal gameplay responses/UI
- reconnect/session bugs and lost pending actions
- race conditions or conflicting writes in multiplayer actions
- regressions in existing verifier and browser-debug contracts

Reviewer output should lead with real blockers only. False positives should not block progress. If a finding is real but not needed for the current UI improvement slice, label it follow-up instead of derailing the work.

/code_quality Keep the code clean, typed, and easy to maintain while improving UI quality. Avoid files over 1000 LOC. Break large components and styling into focused modules when it improves readability. Prefer local reusable components, clear CSS variables/design tokens, and consistent interaction patterns over one-off visual hacks. Preserve clear domain boundaries: data/specs, generic effect resolver, pending actions, state transitions, multiplayer/session state, UI panels, browser debug scripts, and verification scripts. Refactor when it removes real duplication, deletes obsolete code, improves UI consistency, or makes the next UI improvement faster.

/git_workflow Use precise commits, each ideally under 5000 LOC changed. Do not bundle unrelated work. Prefer vertical UI slices that leave the game visibly better after each commit. Work on `ui-improvement` unless the user explicitly asks for another branch. Do not push until the review gate is satisfied and the user asks to push.

/review_gate You are only allowed to commit after getting 3 consecutive clean reviews from Codex/GPT-5.5 high-thinking subagents. You are only allowed to push after the commit is ready, the 3 consecutive clean reviews have passed, tests/browser checks are clean, and the user explicitly asks to push. Definition of clean review: no real problem found in UI regression, screenshot quality for the touched surface, correctness, edge cases, tests, unused/redundant code, obvious performance risks, multiplayer/reconnect behavior, or hidden-information handling. Codex can return false positives, so inspect outputs and decide whether findings are real. Only count the review as clean if all real issues are resolved or the remaining findings are clearly false positives or explicitly accepted follow-ups.

/testing_requirements For every meaningful UI, gameplay, or multiplayer change:
- run relevant verifier scripts
- run TypeScript/build checks
- add or update browser debug scenarios where UI/pending choices/room flow/reconnect are affected
- capture screenshots/state JSON into `artifacts/qa/...`
- inspect console and request failures
- inspect the generated screenshots and decide whether the UI actually improved
- for UI changes, prefer at least one before/after screenshot comparison or a clearly named artifact directory for the new state
- test refresh/reconnect when session state is affected
- document any manual test steps or remaining risks

/product_definition The finished game should feel like six friends smoothly playing a premium digital version of the physical Dune: Imperium - Uprising 3v3 board game online: accurate rules, accurate cards, accurate six-player board spaces/effects, accurate board state, complete enough private-play assets/images, excellent visual hierarchy, readable dense information, clear turn flow, delightful pending-action prompts, reliable conflict/combat/endgame handling, reconnect-safe multiplayer, no admin babysitting, and enough verifier/browser artifacts that both functionality and UI quality are easy to inspect.
