# Dune 3v3

Private web-table implementation for a six-player `Dune: Imperium - Uprising` team game.

## Current Slice

- Vite + React + TypeScript client.
- Six seats split into Muad'Dib and Shaddam teams.
- Hotseat turn flow for agent turns and reveal turns.
- Board space model for the 6-player surface.
- Resource, influence, conflict, hand, and Imperium row UI foundations.
- Imported Uprising Imperium cards with local WebP card art.
- Exact standard Ally and Commander starting decks with local card fronts.
- Catalog-backed Uprising leader roster with local leader card art.
- Full leader-card reference modal from each seat.
- Catalog-backed six-player Conflict deck display with printed battle icons.
- CHOAM contract bank with two face-up offers, contract-space pickup flow, and Shaddam's reserved Sardaukar contracts.
- Catalog-backed Intrigue deck with physical card draws and active-player references.
- Team trade flow supports spice, water, Solari, and chosen Intrigue-card transfers.
- Shaddam Throne Row support for Emperor-board setup, Imperial Tent movement, and Shaddam-team acquisition.
- Maker-space bonus spice tracks and pays out on the four six-player Maker desert spaces.
- Shipping enforces its 2 Spacing Guild Influence requirement, including Commander shared team influence.
- Hagga Basin and Deep Desert support Maker Hooks sandworm choices, shield-wall checks, and worm combat strength.
- Sietch Tabr supports the Maker Hooks/troop/water branch, water plus Shield Wall removal, and Commander/activated Ally ownership.
- Six-player Objective setup deals only to Allies and balances Desert Mouse/Crysknife icons across teams.
- Conflict winners keep won Conflict cards and score immediate non-wild battle-icon pairs with Objectives or prior Conflicts.
- Sandworm players are flagged for doubled printed Conflict-card rewards, with battle icons and location control kept outside that doubling.
- Combat phase opens before Conflict resolution and sequences Combat Intrigue pass/play timing.
- Endgame phase triggers at 10 VP or an empty Conflict deck and scores battle-icon Endgame Intrigues against matching or wild Conflict cards.
- Endgame scores Secure Spice Trade, CHOAM Profits, and Shadow Alliance rewards when their printed conditions are met.
- Taken CHOAM contracts can be marked complete from player panels for contract-based Endgame scoring.
- Alliance tokens can be assigned from player panels and transfer their VP with the token owner.
- Reaching or dropping below 2 Influence automatically adds or removes the faction-track VP.
- Active players can play the Plot side of battle-icon Intrigues for 1 spice during normal play.
- Contingency Plan can be played as a Plot Intrigue for 2 Solari or as a Combat Intrigue for 3 strength.
- Intelligence Report can be played as a Plot Intrigue to draw 1 card, or 2 cards with two or more own spies on the board.
- Call to Arms can be played as a Plot Intrigue so each card acquired during that Reveal turn recruits 1 troop.
- Strategic Stockpiling can be played as a Plot Intrigue to spend 5 spice and/or the 3 Spacing Guild Influence 3-water branch for VP.
- Shaddam's Favor can be played as a Plot Intrigue to recruit 1 troop and gain 3 Solari with enough Emperor/Great Houses Influence.
- Market Opportunity can be played as a Plot Intrigue to exchange 2 spice for 5 Solari or 5 Solari for 5 spice.
- Weirding Combat can be played as a Combat Intrigue for 3 strength, or 5 with 3+ effective Bene Gesserit Influence.
- Backed by CHOAM can be played as a Plot Intrigue by losing 1 Influence for 4 Solari, or as a Combat Intrigue for 4 strength once the actor has completed at least two contracts.
- Find Weakness can be played as a Combat Intrigue for 2 strength, with an optional actor-owned spy recall for 3 more strength.
- Questionable Methods can be played as a Combat Intrigue for 1 strength, with an optional recipient or Commander personal Influence loss for 4 more strength.
- Go To Ground can be played as a Combat Intrigue to retreat one or two recipient troops, then optionally place a spy for that recipient.
- Spring The Trap can be played as a Combat Intrigue by recalling two actor-owned spies, adding 7 strength after both recalls resolve.
- Spice is Power can be played as a Combat Intrigue by retreating three recipient troops for 3 spice, or spending 3 recipient spice for 6 strength.
- Tactical Option can be played as a Combat Intrigue for 2 strength or to retreat any chosen number of recipient troops.
- Reach Agreement can be played as a Combat Intrigue to retreat one or two recipient troops, then take a CHOAM contract for that recipient.
- Devour can be played as a Combat Intrigue for 2 strength, or 4 plus optional card trashing when the recipient has a sandworm in the Conflict.
- Detonation can be played as a Plot Intrigue to remove the Shield Wall or deploy up to four troops.
- Unexpected Allies can be played as a Plot Intrigue to spend 2 water, optionally remove the Shield Wall, and summon a sandworm for the active Ally or activated Ally.
- Catalog-backed board-space art on matching placement tiles.
- Printed reveal adjustments and spy-post targeting for cards whose text is not reducible to a fixed number.
- Printed Combat Intrigue costs, choices, and strength effects remain manual until each card is fully modeled.
- Asset pipeline conventions for owned scans or public reference images.

## Run

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite.

## Asset Policy

The app is designed to use local physical-copy scans or other assets the play group supplies in `public/assets`. The first checked-in version uses generated CSS treatments and structured metadata so the game can run before final board/card art is wired in.

## Card Catalog

```bash
pnpm sync:cards
pnpm sync:card-images
```

`sync:cards` refreshes the compact Uprising catalog from Dune Cards Hub. `sync:card-images` also downloads referenced images into `public/assets/dune-cards-hub` for private local play.
