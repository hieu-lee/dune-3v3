# Dune 3v3

Private web-table implementation for a six-player `Dune: Imperium - Uprising` team game.

## Current Slice

- Vite + React + TypeScript client.
- Repo-local Playwright browser debug harness captures scripted gameplay screenshots under `artifacts/qa/browser-debug`.
- Private room dev server supports create/join by room code, seat claims, local reconnect tokens, file-backed room persistence, live room snapshots, per-seat hidden hand/Intrigue/objective plus draw/shared-deck projection, server-authoritative core turn actions, Combat pass/play, Endgame scoring/finalization, and server-backed pending-choice resolution.
- Six seats split into Muad'Dib and Shaddam teams.
- Hotseat turn flow for agent turns and reveal turns.
- Board space model for the 6-player surface.
- Resource, influence, conflict, hand, and Imperium row UI foundations.
- Imported Uprising Imperium cards with local WebP card art.
- Exact standard Ally and Commander starting decks with local card fronts.
- Catalog-backed Uprising leader roster with local leader card art.
- Full leader-card reference modal from each seat.
- Catalog-backed six-player Conflict deck display with printed battle icons.
- CHOAM contract bank with two face-up offers, contract-space pickup flow, Shaddam's reserved Sardaukar contracts, and automatic completion for Immediate plus modeled board-space contracts.
- Catalog-backed Intrigue deck with physical card draws and active-player references.
- Team trade flow supports spice, water, Solari, and chosen Intrigue-card transfers.
- Shaddam Throne Row support for Emperor-board setup, Imperial Tent movement, and Shaddam-team acquisition.
- Muad'Dib's Signet Ring resolves Lead the Way by drawing 1 card for Muad'Dib.
- Shaddam's Signet Ring resolves Emperor of the Known Universe, blocking same-turn Conflict deployment and queuing the Solari troop/Influence choice.
- Gurney Halleck's Warmaster Signet recruits 1 troop, and Always Smiling scores 1 VP on his Reveal turn at 10+ Conflict strength.
- Feyd-Rautha Harkonnen's Devious Strength queues an optional Reveal-turn spy recall for +2 strength.
- Lady Amber Metulli's Fill Coffers Signet gains 1 Solari and 1 spice while she has an Alliance, and Desert Scouts queues her optional Reveal-turn troop retreat.
- Lady Margot Fenring's Loyalty pays 2 spice when she reaches Bene Gesserit 2 Influence, and Arrakis Informant places a spy on a Bene Gesserit observation post.
- Staban Tuek starts without Diplomacy, gains Smuggle Spice from spied Maker spaces another player visits, and resolves Unseen Network spy placement rewards.
- Lady Jessica's Spice Agony Intrigue plus troop-memory payment, Other Memories Bene Gesserit-space flip, Reverend Mother Jessica's Water of Life Signet payment, and Reverend Mother Bene/Fremen board-space repeat are automated.
- Princess Irulan's Imperial Birthright draws an Intrigue when she reaches Great Houses 2 Influence in 3v3 mode, and Chronicler's Insight queues her exact cost-1 acquisition or hand-trash Signet choice.
- Command Respect lets Swordmaster Muad'Dib trash the card to trade with one Muad'Dib Ally.
- Demand Attention lets Muad'Dib spend 4 Solari to upgrade a faction visit to two Influence for the board-effect recipient.
- Desert Call lets Muad'Dib spend 1 water to summon a sandworm for the activated hooked Ally, then trash the card.
- Threaten Spice Production lets Muad'Dib and both Allies commit 7 total spice for Muad'Dib to gain 1 VP, then trash the card.
- Usul queues Muad'Dib's Commander/activated-Ally water-or-spice split when played.
- Critical Shipments queues Shaddam's Commander/activated-Ally water-or-2-Solari split when played.
- Corrino Might reveals for 1 strength and lets Shaddam spend 3 spice for 2 troops to each Shaddam Ally, then self-trash.
- Devastating Assault gives Shaddam 1 Solari and recruits 1 troop for the activated Ally before deployment choices, then can spend 3 Solari for +5 Reveal strength with the Swordmaster bonus token.
- Demand Results lets Shaddam spend 2 Solari to assign the two face-up public contracts one to each Shaddam Ally.
- Maker-space bonus spice tracks and pays out on the four six-player Maker desert spaces.
- Shipping enforces its 2 Spacing Guild Influence requirement, including Commander shared team influence.
- Hagga Basin and Deep Desert support Maker Hooks sandworm choices, shield-wall checks, and worm combat strength.
- Sietch Tabr supports the Maker Hooks/troop/water branch, water plus Shield Wall removal, and Commander/activated Ally ownership.
- Six-player Objective setup deals only to Allies and balances Desert Mouse/Crysknife icons across teams.
- Conflict winners keep won Conflict cards and score immediate non-wild battle-icon pairs with Objectives or prior Conflicts.
- Critical-location Conflict wins set control of Arrakeen, Spice Refinery, or Imperial Basin; controlled spaces pay their visit income, and revealed controlled-location Conflicts queue the optional defensive supply troop.
- Level I Skirmish Conflicts pay automated first-place fixed rewards for Skirmish (Ornithopter) and Skirmish (Desert Mouse).
- Conflict cards pay automated first-, second-, and third-place printed rewards for the imported Uprising Conflict deck, including tie reward rules, same-team concession rewards, sandworm-doubled repeats, and undoubled battle icons/location control.
- High Council seats persist and add 2 persuasion on Reveal turns; later High Council visits take the printed repeat rewards.
- Combat phase opens before Conflict resolution and sequences Combat Intrigue pass/play timing.
- Endgame phase triggers at 10 VP or an empty Conflict deck and scores battle-icon Endgame Intrigues against matching or wild Conflict cards.
- Endgame scores Secure Spice Trade, CHOAM Profits, and Shadow Alliance rewards when their printed conditions are met.
- Modeled CHOAM contracts complete automatically for their printed rewards; remaining unmodeled completion triggers stay available as table-correction checkboxes for contract-based Endgame scoring.
- Alliance tokens are claimed, transferred, returned, and scored automatically from Faction Influence changes.
- Reaching or dropping below 2 Influence automatically adds or removes the faction-track VP.
- Active players can play the Plot side of battle-icon Intrigues for 1 spice during normal play.
- Contingency Plan can be played as a Plot Intrigue for 2 Solari or as a Combat Intrigue for 3 strength.
- Inspire Awe can be played as a Plot Intrigue to acquire a card that costs 3 or less, placing it in hand when the player has a sandworm in the Conflict.
- Manipulate can be played as a Plot Intrigue to remove and replace an Imperium Row card, then acquire that removed card for 1 less during that player's Reveal turn.
- Leverage can be played as a Plot Intrigue after gaining spice that turn to gain 1 Solari and may take a face-up CHOAM contract.
- Distraction can be played after deploying three or more units in a turn to place a spy on another player's occupied observation post.
- Intelligence Report can be played as a Plot Intrigue to draw 1 card, or 2 cards with two or more own spies on the board.
- Cunning can be played as a Plot Intrigue to draw 1 card, or spend 1 spice to draw 1 card and trash 1 card.
- Sietch Ritual can be played as a Plot Intrigue to discard a hand card for Bene Gesserit or Fremen/Fringe Influence.
- Change Allegiances can be played as a Plot Intrigue to lose Influence for Influence, spend 3 spice for Influence, or do both.
- Special Mission can be played as a Plot Intrigue to place a City spy or recall a spy to remove the Shield Wall and gain 2 spice.
- Opportunism can be played as a Plot Intrigue to spend 2 Solari and lose 2 Influence for 1 VP.
- Buy Access can be played as a Plot Intrigue to spend 5 Solari for two different faction-icon Influence bumps with 3v3 Commander mapping.
- Imperium Politics can be played as a Plot Intrigue to spend 1 Solari for Emperor/Great Houses or Spacing Guild Influence, including Shaddam's personal Emperor option.
- Depart For Arrakis can be played as a Plot Intrigue to spend 2 spice for 3 troops, and draw 1 card with enough Fremen/Fringe Influence.
- Councilor's Ambition can be played as a Plot Intrigue for 2 water once the player has a High Council seat.
- Mercenaries can be played as a Plot Intrigue to spend 3 Solari, draw 1 Intrigue, and recruit 2 troops.
- Call to Arms can be played as a Plot Intrigue so each card acquired during that Reveal turn recruits 1 troop.
- Strategic Stockpiling can be played as a Plot Intrigue to spend 5 spice and/or the 3 Spacing Guild Influence 3-water branch for VP.
- Shaddam's Favor can be played as a Plot Intrigue to recruit 1 troop and gain 3 Solari with enough Emperor/Great Houses Influence.
- Market Opportunity can be played as a Plot Intrigue to exchange 2 spice for 5 Solari or 5 Solari for 5 spice.
- Weirding Combat can be played as a Combat Intrigue for 3 strength, or 5 with 3+ effective Bene Gesserit Influence.
- Backed by CHOAM can be played as a Plot Intrigue by losing 1 Influence for 4 Solari, or as a Combat Intrigue for 4 strength once the actor has completed at least two contracts.
- Impress can be played as a Combat Intrigue for 2 strength, then the chosen recipient acquires a card that costs 3 or less.
- Find Weakness can be played as a Combat Intrigue for 2 strength, with an optional actor-owned spy recall for 3 more strength.
- Questionable Methods can be played as a Combat Intrigue for 1 strength, with an optional recipient or Commander personal Influence loss for 4 more strength.
- Go To Ground can be played as a Combat Intrigue to retreat one or two recipient troops, then optionally place a spy for that recipient.
- Spring The Trap can be played as a Combat Intrigue by recalling two actor-owned spies, adding 7 strength after both recalls resolve.
- Spice is Power can be played as a Combat Intrigue by retreating three recipient troops for 3 spice, or spending 3 recipient spice for 6 strength.
- Tactical Option can be played as a Combat Intrigue for 2 strength or to retreat any chosen number of recipient troops.
- Reach Agreement can be played as a Combat Intrigue to retreat one or two recipient troops, then take a CHOAM contract for that recipient.
- Devour can be played as a Combat Intrigue for 2 strength, or 4 plus optional card trashing when the recipient has a sandworm in the Conflict.
- Prepare The Way is available from the Reserve, costs 2 persuasion, reveals for 2 persuasion, and draws 1 card on Agent turns with 2+ Bene Gesserit Influence using 3v3 shared Influence.
- Smuggler's Harvester adds its conditional Reveal spice after that player sent an Agent to a Maker board space earlier in the round.
- Detonation can be played as a Plot Intrigue to remove the Shield Wall or deploy up to four troops.
- Unexpected Allies can be played as a Plot Intrigue to spend 2 water, optionally remove the Shield Wall, and summon a sandworm for the active Ally or activated Ally.
- Catalog-backed board-space art on matching placement tiles.
- Printed reveal adjustments and spy-post targeting for cards whose text is not reducible to a fixed number.
- Remaining printed edge cases are being reduced into structured card, Conflict, and reserve effects as they are modeled.
- Multiplayer room mode supports server-authoritative Shaddam setup Throne Row, active-player Agent placement, Agent turn end, Reveal, card acquisition, Reveal turn end, Plot Intrigue dispatch, Combat Intrigue pass/play, Endgame Intrigue scoring/finalization, most generated pending choices, file-backed restart recovery, and six-browser room smokes covering all seats, reconnect, permissions, pending resolution, Endgame readiness, and a natural marathon with deterministic Agent placements, Reveal buys, Ally troop deployments, and asserted final team scoring through Conflict-deck exhaustion.
- Asset pipeline conventions for owned scans or public reference images.

## Run

```bash
pnpm install
pnpm dev
pnpm run room:dev
```

Use `pnpm dev` for local hotseat development. Use `pnpm run room:dev` for the private room server with create/join/claim/reconnect flow. Room state persists outside the web-served project tree at `~/.dune-3v3/room-server/rooms.json` by default; pass `-- --storage-file=<path>` or `-- --no-storage` when starting `room:dev` to override that behavior.

## Verification

```bash
pnpm run verify:all
pnpm run verify:all -- --list
pnpm build
pnpm run debug:room:smoke
pnpm run debug:room:complete
pnpm run debug:room:marathon
```

`verify:all` runs every package verifier script in order and stops on the first failure.

## Browser Debugging

```bash
pnpm run debug:browser:help
pnpm run debug:browser:scenarios
pnpm run debug:browser
pnpm run debug:browser -- --scenario control-defense
pnpm run debug:browser -- --scenario commander-reveal
pnpm run debug:browser:headed -- --scenario all
pnpm run debug:browser:manual
pnpm run debug:game
pnpm run debug:game:smoke
pnpm run debug:room:smoke
pnpm run debug:room:complete
pnpm run debug:room:marathon
```

The default debug run starts a local Vite server, drives scripted Playwright scenarios, and writes screenshots, per-capture game state, `console.json`, `request-failures.json`, `<scenario>-trace.zip`, and `summary.json` under `artifacts/qa/browser-debug`. Use the headed command to watch the scripted scenarios. When passing `--port`, treat it as the requested starting port and check the printed URL or `summary.json` for the actual port.

The Codex in-app browser (`iab`) is optional. If it is not exposed in the current Codex session, use the finite repo-owned Playwright pipeline as the default gate: `pnpm run debug:game:smoke` for the manual capture bridge, or `pnpm run debug:browser -- --scenario <name> --out artifacts/qa/browser-debug-<task>` for a scripted scenario.

Use `pnpm run debug:game` when you need to play the table in a browser with artifacts isolated under `artifacts/qa/browser-debug-manual`. `pnpm run debug:browser:manual` uses the default artifact directory unless you pass `--out`. While it is running, use the camera button in the top bar, press `Ctrl+Shift+S` or `Cmd+Shift+S`, or run `window.__DUNE_DEBUG__.capture("descriptive-label")` from the browser console to capture the current full-page screenshot and game state. The harness writes `manual-ready.png` and `manual-ready.state.json` at startup, captures as `manual-capture-###[-label].png` with matching `.state.json` files, and `manual-final.png`, `manual-final.state.json`, `console.json`, `request-failures.json`, `manual-trace.zip`, and `summary.json` after `Ctrl+C`.

Use `pnpm run debug:game:smoke` to verify the manual capture bridge without keeping a browser open. It exits after writing `manual-ready.png`, `manual-ready.state.json`, `manual-capture-001-button.png`, its matching `.state.json`, `console.json`, `request-failures.json`, and `summary.json`.

Use `pnpm run debug:room:smoke` after room/session changes. It starts the private room server, creates a room, claims a seat, reloads to prove reconnect recovery, joins from a second browser context, checks hidden hand projection, resolves setup online, advances an online Reveal turn, resolves a server-backed pending choice, plays a Plot Intrigue online, plays and passes combat online, and scores battle-icon plus conditional Endgame Intrigues before finalizing online.

Use `pnpm run debug:room:complete` when room/session changes affect full-table coordination. It opens six isolated browser contexts, claims all six seats, verifies hidden projections and turn permissions, reloads a claimed seat, resolves setup, advances a room turn, resolves a server-backed pending choice, and has all six seats mark Endgame ready until the shared room finishes.

Use `pnpm run debug:room:marathon` for the heavier six-browser natural room marathon. It claims all six seats, verifies private projections, resolves setup, places legal Agents when available, buys legal cards during Reveal turns, deploys legal troops for all four Ally seats into the Conflict, resolves generated pending actions, advances Reveal/combat/Endgame flow until the Conflict deck naturally empties, finalizes all seats, asserts the final team-score result, and writes screenshots, state JSON, console logs, request failures, action logs, and `summary.json` under `artifacts/qa/browser-room-marathon`.

See [docs/browser-testing-pipeline.md](docs/browser-testing-pipeline.md) for the full IAB-free browser testing workflow, subagent instructions, artifact contract, and scenario-extension checklist.

## Asset Policy

The app is designed to use local physical-copy scans or other assets the play group supplies in `public/assets`. The first checked-in version uses generated CSS treatments and structured metadata so the game can run before final board/card art is wired in.

## Card Catalog

```bash
pnpm sync:cards
pnpm sync:card-images
```

`sync:cards` refreshes the compact Uprising catalog from Dune Cards Hub. `sync:card-images` also downloads referenced images into `public/assets/dune-cards-hub` for private local play.

Six-player-only board-space art is not present in the Dune Cards Hub catalog. Those local overrides are named like the rest of the Uprising location art under `public/assets/dune-cards-hub/location`, and `pnpm run verify:board-spaces` verifies that every 3v3 board space resolves to a real local asset.
