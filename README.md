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
- Muad'Dib's Signet Ring resolves Lead the Way by drawing 1 card for Muad'Dib.
- Shaddam's Signet Ring resolves Emperor of the Known Universe, blocking same-turn Conflict deployment and queuing the Solari troop/Influence choice.
- Gurney Halleck's Warmaster Signet recruits 1 troop, and Always Smiling scores 1 VP on his Reveal turn at 10+ Conflict strength.
- Feyd-Rautha Harkonnen's Devious Strength queues an optional Reveal-turn spy recall for +2 strength.
- Lady Jessica's Spice Agony troop-memory payment and Other Memories Bene Gesserit-space flip are automated.
- Princess Irulan's Imperial Birthright draws an Intrigue when she reaches Great Houses 2 Influence in 3v3 mode, and Chronicler's Insight queues her exact cost-1 acquisition or hand-trash Signet choice.
- Command Respect lets Swordmaster Muad'Dib trash the card to trade with one Muad'Dib Ally.
- Demand Attention lets Muad'Dib spend 4 Solari to upgrade a faction visit to two Influence for the board-effect recipient.
- Desert Call lets Muad'Dib spend 1 water to summon a sandworm for the activated hooked Ally, then trash the card.
- Threaten Spice Production lets Muad'Dib and both Allies commit 7 total spice for Muad'Dib to gain 1 VP, then trash the card.
- Usul queues Muad'Dib's Commander/activated-Ally water-or-spice split when played.
- Critical Shipments queues Shaddam's Commander/activated-Ally water-or-2-Solari split when played.
- Corrino Might reveals for 1 strength and lets Shaddam spend 3 spice for 2 troops to each Shaddam Ally, then self-trash.
- Devastating Assault gives Shaddam 1 Solari and recruits 1 troop for the activated Ally before deployment choices.
- Demand Results lets Shaddam spend 2 Solari to assign the two face-up public contracts one to each Shaddam Ally.
- Maker-space bonus spice tracks and pays out on the four six-player Maker desert spaces.
- Shipping enforces its 2 Spacing Guild Influence requirement, including Commander shared team influence.
- Hagga Basin and Deep Desert support Maker Hooks sandworm choices, shield-wall checks, and worm combat strength.
- Sietch Tabr supports the Maker Hooks/troop/water branch, water plus Shield Wall removal, and Commander/activated Ally ownership.
- Six-player Objective setup deals only to Allies and balances Desert Mouse/Crysknife icons across teams.
- Conflict winners keep won Conflict cards and score immediate non-wild battle-icon pairs with Objectives or prior Conflicts.
- Sandworm players are flagged for doubled printed Conflict-card rewards, with battle icons and location control kept outside that doubling.
- High Council seats persist and add 2 persuasion on Reveal turns; later High Council visits take the printed repeat rewards.
- Combat phase opens before Conflict resolution and sequences Combat Intrigue pass/play timing.
- Endgame phase triggers at 10 VP or an empty Conflict deck and scores battle-icon Endgame Intrigues against matching or wild Conflict cards.
- Endgame scores Secure Spice Trade, CHOAM Profits, and Shadow Alliance rewards when their printed conditions are met.
- Taken CHOAM contracts can be marked complete from player panels for contract-based Endgame scoring.
- Alliance tokens can be assigned from player panels and transfer their VP with the token owner.
- Reaching or dropping below 2 Influence automatically adds or removes the faction-track VP.
- Active players can play the Plot side of battle-icon Intrigues for 1 spice during normal play.
- Contingency Plan can be played as a Plot Intrigue for 2 Solari or as a Combat Intrigue for 3 strength.
- Inspire Awe can be played as a Plot Intrigue to acquire a card that costs 3 or less, placing it in hand when the player has a sandworm in the Conflict.
- Manipulate can be played as a Plot Intrigue to remove and replace an Imperium Row card, then acquire that removed card for 1 less during that player's Reveal turn.
- Leverage can be played as a Plot Intrigue after gaining spice that turn to gain 1 Solari and take a face-up CHOAM contract.
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
