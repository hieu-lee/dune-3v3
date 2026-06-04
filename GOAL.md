# Dune 3v3 Development Goal

/goal Redesign the six-player board side of the app so it feels much closer to the real Dune: Imperium - Uprising 3v3 board. The primary visual reference is `public/assets/dune-cards-hub/full-board-image.png`. The app should keep its working gameplay automation, hidden-information rules, pending-action flow, multiplayer/reconnect behavior, combat, endgame, and scoring while making the board surface more faithful, readable, and pleasant to use.

/branch All work for this goal must happen on the `ui-improvement` branch unless the user explicitly says otherwise.

## Board Redesign Target

The current board UI should be redesigned around the physical six-player board layout:

- Use `public/assets/dune-cards-hub/full-board-image.png` as the main composition reference for grouping, spacing, zones, score track, faction columns, Landsraad Council, CHOAM/Shipping, city/desert spaces, conflict area, and overall table feel.
- The real board reference contains 24 visible board locations. The other 4 locations belong to the two Commanders. Devs must improvise a clean way to place those 4 Commander locations in the digital layout without making the board confusing or cramped.
- The redesign should be board-game-like, not just a list of cards. Location placement, zone color, paths, control markers, costs, rewards, occupied states, disabled states, and legal-action affordances should all support quick visual scanning during a real six-player session.
- Do not assume the normal two-to-four-player board is correct. Six-player/3v3 spaces can have different costs, icons, rewards, restrictions, and routing rules.
- Keep the UI playable on real laptop screens. The design may use responsive rearrangement, zoom, scrolling, or focused panels, but active decisions must remain clear and low-friction.

## Implementation Principles

Protect correctness while improving the board:

- Preserve deterministic state transitions, typed rule/data structures, pending-action ownership, private hand/Intrigue visibility, room/session identity, refresh/reconnect behavior, and all existing gameplay automation.
- Prefer focused, vertical UI slices that can be judged from screenshots: one board region, one interaction state, one set of markers, or one responsive layout improvement.
- Avoid speculative frameworks or broad rewrites that do not directly improve the board-side play experience.
- Retire redundant code while working. Delete stale helpers, unused exports, duplicate styling, obsolete components, and dead fallback paths when they are replaced.
- Keep assets organized under `public/assets`, and use the most accurate private-play assets available for this friend-group project.

## Clean Code Rules

The board redesign must stay maintainable:

- Files should not exceed 1500 LOC. If a file grows beyond that, refactor it into focused components, helpers, data modules, or stylesheets before continuing.
- Keep React components readable and domain boundaries clear: board data/specs, state transitions, pending actions, multiplayer/session state, UI components, styles, browser debug scripts, and verifier scripts.
- Prefer reusable local components, CSS variables/design tokens, and consistent interaction patterns over one-off visual hacks.
- Add abstractions only when they remove real duplication or make the board implementation easier to extend.
- Keep TypeScript/build checks clean.

## Screenshot And Play Testing

Testing must prove both function and visual quality:

- Use scripts and browser automation to simulate real plays, not only isolated component checks.
- Run relevant verifier scripts and TypeScript/build checks for every meaningful board, gameplay, or multiplayer change.
- Use the repo-owned browser/Playwright pipeline, including `scripts/browser-debug.mjs` where relevant, to drive scenarios, capture screenshots, capture state JSON, and inspect console/request failures.
- Capture artifacts under `artifacts/qa/...` for setup, agent placement, pending choices, occupied spaces, disabled illegal moves, Commander personal locations, combat/deployment states, market/reveal states, refresh/reconnect, dense late-game boards, and responsive layouts.
- Inspect generated screenshots manually. A test run is not enough; devs must decide whether the board actually looks and plays better.
- Prefer before/after screenshots for each visible UI slice.

## Commit And Review Gate

Move quickly, but only ship clean slices:

- Devs are encouraged to make self-contained commits with clear feature boundaries and clear commit messages.
- Devs are encouraged to push completed, reviewed work on `ui-improvement` when the gate below is satisfied.
- The commit gate requires 3 consecutive clean reviews from Codex YOLO GPT-5.5 high-thinking reviewers.
- If any reviewer finds a real issue, the commit attempt fails. Fix the issue, then spawn 3 reviewers again for the next commit attempt. Do not count earlier clean reviews after a failed review cycle.
- A clean review means no real blocker in board UI regression, screenshot quality, gameplay correctness, edge cases, tests, unused/redundant code, performance, multiplayer/reconnect behavior, or hidden-information handling.
- False positives may be dismissed only after the dev inspects them and explains why they are false positives or accepted follow-ups.

## Reviewer Expectations

Reviewers should review like senior product engineers and UI-focused gameplay engineers. They should explicitly check:

- Whether the redesigned board is genuinely inspired by the real six-player board image.
- Whether all 24 visible board locations and the 4 improvised Commander locations are understandable.
- Whether legal actions, occupied spaces, costs, rewards, ownership, pending choices, and disabled states are visually clear.
- Whether screenshots show improved layout, spacing, hierarchy, and readability.
- Whether responsive behavior works without hiding critical game state.
- Whether gameplay rules, hidden information, multiplayer actions, reconnects, and pending-action ownership still work.
- Whether large files, duplicated styling, stale helpers, or dead code should be refactored before commit.

## Definition Of Done

This goal is complete when the six-player board side of the app looks and behaves like a polished digital interpretation of the real 3v3 board: the physical layout is recognizable, all locations are placed clearly, Commander-only locations are integrated cleanly, real play can be simulated through scripts and screenshots, reviewers pass the 3-clean-review gate, and the code remains maintainable under the 1500-LOC file limit.
