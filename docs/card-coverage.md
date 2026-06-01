# Card Coverage

This report tracks how card behavior is implemented. The target state is data-first card behavior through typed `CardEffectSpec` / `GameEffectSpec` entries, with bespoke handlers reserved for effects that cannot yet be expressed by shared primitives.

## Declarative Cards

These cards currently use typed reveal effect specs:

- Ally starter reveal cards: Convincing Argument, Dagger, Diplomacy, Dune, The Desert Planet, Reconnaissance, Signet Ring.
- Muad'Dib Commander reveal cards: Command Respect, Convincing Argument, Demand Attention, Desert Call, Limited Landsraad Access, Signet Ring, Threaten Spice Production, Usul.
- Emperor Commander reveal cards: Convincing Argument, Corrino Might, Critical Shipments, Demand Results, Devastating Assault, Imperial Ornithopter, Imperial Tent, Signet Ring.
- Reserve cards: Prepare The Way.
- Imperium cards: Smuggler's Harvester, Interstellar Trade, Bene Gesserit Operative.

These cards currently use typed Agent effect specs:

- Reserve cards: Prepare The Way.

## Bespoke Automated Cards

These cards are automated but still rely on explicit card or leader branches while the shared primitive library grows:

- Imperium / reserve Agent effects: Captured Mentat, Bene Gesserit Operative.
- Imperium / reserve Reveal choices: Captured Mentat, Calculus of Power.
- Commander starter cards: Command Respect, Critical Shipments, Demand Attention, Demand Results, Desert Call, Devastating Assault, Imperial Tent, Corrino Might, Threaten Spice Production, Usul, Signet Rings.
- Ally leader Signet Ring effects: Gurney Halleck, Lady Amber Metulli, Lady Jessica, Lady Margot Fenring, Princess Irulan, Reverend Mother Jessica, Staban Tuek.
- Plot and Combat Intrigues: currently automated through pattern modules and card-specific branches, not effect specs.

## Data-Driven Non-Card Islands

- Conflict rewards are data-driven through `conflict-reward-data.ts`.
- Board spaces use structured costs, gains, influence, troop, spy, contract, combat, Maker, Sietch Tabr, and team routing fields.

## Manual / Printed Fallback

- `reveal-adjust` remains available for cards with `conditionalPersuasion` or `conditionalSwords`.
- Imported Imperium Agent text that is only summarized in `play` remains manual until migrated into Agent effect specs.

## Missing Primitives

The largest current gaps are Agent and choice primitives:

- Costs: pay resources, discard card, trash card, lose Influence, recall spy, retreat troops.
- Conditions: Influence threshold, alliance, role/team, completed contracts, Maker visit, spy count, combat participation.
- Selectors: activated Ally, teammate, faction, board space, market card, reserve card, contract, hand/discard/play-area card.
- Effects: draw card, recruit/deploy/retreat troops, gain/lose Influence, place/recall spy, acquire card, take/complete contract, trash/discard card, gain VP, remove Shield Wall, summon sandworm.
- Choices: optional effect, pay-or-skip, choose one, choose N, split Commander/Ally rewards.

## Verification

- `pnpm run verify:card-effect-specs` verifies reveal specs, Agent draw specs, legacy fallback, no double-counting, conditional Maker/contract/spy/influence behavior, shared spy posts, and manual reveal fallback.
- `pnpm run verify` includes the effect-spec verifier through `package.json`.
