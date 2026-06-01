# Dune 3v3 Development Goal

```md
/goal Create a super polished, production-ready Dune 3v3 game that I can play online with my friends. The game must match the board game experience of Dune: Imperium - Uprising in six-player 3v3 mode: each team has 1 Commander/Captain and 2 Ally players. Prioritize gameplay correctness, complete rules coverage, all required assets/images, graphics, board/card feel, and visual fidelity.

/top_priority Build a maintainable rules and card-effect engine, not a pile of one-off card functions. Fast progress means implementing reusable effect patterns and migrating cards into declarative data. Adding a normal card should usually require editing typed card/effect params only, not adding a new bespoke `if (isXCard(...))` handler.

/asset_priority Getting all assets and images ready is also a first-class priority, not polish to defer until the end. Research, collect, organize, verify, and wire card images, leader images, board images, board-space art, icons, tokens, card backs, reference sheets, and any missing visual components as early as possible. It is strongly encouraged to spawn dedicated subagents for asset research, image collection, asset source comparison, image cleanup, and asset coverage reporting.

/architecture_mandate Before implementing more individual card logic, design and build a typed, declarative card/effect system so most cards can be implemented by data/config instead of bespoke functions.

Create a reusable `CardEffectSpec` / `GameEffectSpec` model with primitives for:
- triggers: agent play, reveal, acquire, plot intrigue, combat intrigue, conflict reward, endgame, round start/end
- costs: spice, water, Solari, influence loss, troop retreat, spy recall, card discard, card trash, contract completion, VP payment
- conditions: has influence, has alliance, has completed contracts, has troops, has sandworms, has spies, visited Maker space, team, role, commander/ally status, board-space type, combat participation
- selectors: self, activated ally, teammate, opponent, combat participant, board space, market card, reserve card, contract, intrigue, hand, discard, deck, play area, trashable card
- effects: gain/spend resources, draw cards, gain persuasion, gain strength, recruit/deploy/retreat troops, place/recall spies, gain/lose influence, gain VP, acquire card, take contract, trash/discard cards, remove Shield Wall, summon sandworm, complete contract, move market card, manipulate row
- choices: choose one, choose N, optional effect, pay-or-skip, target selection, split rewards, repeated effects, conditional branches
- routing rules: 3v3 Commander effects, activated Ally ownership, Commander personal board influence, shared/effective influence, team trade, Commander combat intrigue targeting

Implement a generic resolver that consumes these specs and produces state changes plus pending actions for choices. The resolver must be strongly typed, deterministic, easy to test, and covered by verifier scripts.

Only write bespoke card code when a card cannot reasonably be represented by existing primitives. When this happens:
1. First ask whether a new reusable primitive would cover this card plus future cards.
2. If still bespoke, document why in `docs/card-effect-gaps.md`.
3. Add a verifier proving the bespoke behavior.
4. Keep bespoke handlers thin and route them through the same pending-action/state-change primitives.

Maintain a card implementation coverage report in `docs/card-coverage.md` with:
- declarative cards
- cards requiring a new primitive
- cards requiring bespoke code
- cards still manual/printed-text fallback
- missing art/data/rules references

Acceptance criteria for the effect system:
- Common cards like "gain X resource," "draw N," "spend X to gain Y," "choose one reward," "conditional bonus if influence >= N," "acquire card up to cost N," "trash/discard a card," and "place/recall spy" are data-only.
- Conflict rewards are data-driven.
- Plot and Combat Intrigues reuse shared primitives where possible.
- Reveal effects avoid `Resolve printed reveal text` whenever they can be modeled.
- Adding a simple new card should not require touching React UI or core game state code.
- Effect specs are readable enough that future subagents can add cards safely.

/rules_and_research Use web search and GitHub research for rules, card text, character abilities, board spaces, official FAQs, community references, and implementation artifacts. Download and organize useful assets and references. Keep notes in docs so subagents can use them. Official rules and official card text take priority over fan sources when sources disagree.

/six_player_board_warning Dune: Imperium - Uprising 3v3/six-player mode uses a different board from the normal two-to-four-player game. Do not assume the normal board is correct. The same named places can have different costs, rewards, icons, restrictions, or effects in 3v3 mode. Verify every board space against the correct six-player/3v3 board and official rules/reference images. If current code or assets use normal-board effects or art where the six-player board differs, update the code, data, tests, and assets.

/assets Since this is only for my private friend group and we bought the board game, focus on getting the most accurate private-play assets possible: card images, board images, leader images, icons, tokens, card backs, player boards, Commander boards, six-player board references, and visual references. Use the best available sources from web/GitHub/references. Keep assets organized under `public/assets` and document source/coverage gaps. Maintain an asset coverage report in `docs/asset-coverage.md` listing found assets, missing assets, source URLs/repositories, quality notes, and where each asset is wired into the UI.

/browser_testing IAB is not exposed in this environment. First make sure there is a fully functional browser testing pipeline that agents and subagents can use comfortably. Use Playwright/Puppeteer/browser-use or other practical tooling. Document the workflow in `docs/browser-testing-pipeline.md`, including how to run the app on separate ports, drive scenarios, capture screenshots, capture state JSON, inspect console/request failures, and debug UI regressions.

/subagents Fire up subagents aggressively to make progress faster, but split work by effect pattern and system area, not random card batches. Example subagent tracks:
- rules research and official references
- asset discovery, source comparison, download, cleanup, and organization
- asset coverage verification and UI wiring
- six-player board research and board-space effect verification
- board-space modeling and correction against the 3v3 board
- resource/draw/recruit effect primitives
- reveal persuasion/strength primitives
- influence/alliance primitives
- spy primitives
- acquire/trash/discard primitives
- plot intrigue primitives
- combat intrigue primitives
- conflict reward primitives
- commander/activated-ally routing
- UI polish and visual fidelity
- browser scenario testing

Each card/rules subagent should return reusable primitives plus migrated cards, not isolated bespoke handlers, unless bespoke handling is explicitly justified.

/code_quality Keep the code clean, typed, and easy to maintain. Avoid files over 1000 LOC. Break large files into focused modules/components/classes. If an existing file grows too large, do refactor commits. Preserve clear domain boundaries: data/specs, generic effect resolver, pending actions, state transitions, UI panels, browser debug scripts, and verification scripts.

/git_workflow Init/use git repo here. Make small, precise commits, each ideally under 1000 LOC changed. Do not bundle unrelated work. Prefer commits organized by reusable system milestone, for example "add declarative resource effect primitive," then "migrate simple resource cards," then "add browser coverage for migrated cards."

/review_gate You are only allowed to commit after getting 3 consecutive clean reviews from codex --yolo gpt 5.5 high thinking effort subagents. Definition of clean review: no real problem found. Codex can return false positives, so you must inspect the outputs and decide whether findings are real. Only count the review as clean if all real issues are resolved or the remaining findings are clearly false positives.

/testing_requirements For every meaningful gameplay change:
- run relevant verifier scripts
- run TypeScript/build checks
- add or update browser debug scenarios where UI/pending choices are affected
- capture screenshots/state JSON into `artifacts/qa/...`
- inspect console and request failures
- document any manual test steps or remaining risks

/product_definition The finished game should feel like playing the physical Dune: Imperium - Uprising 3v3 board game online with friends: accurate rules, accurate cards, accurate six-player board spaces/effects, accurate board state, complete private-play assets/images, clear turn flow, strong visuals, helpful pending-action prompts, reliable conflict/combat/endgame handling, and enough browser/debug artifacts that progress is easy to inspect.
```
