# Card Coverage

This report tracks how card behavior is implemented. The target state is data-first card behavior through typed `CardEffectSpec` / `GameEffectSpec` entries, with bespoke handlers reserved for effects that cannot yet be expressed by shared primitives.

## Declarative Cards

These cards currently use typed reveal effect specs:

- Ally starter reveal cards: Convincing Argument, Dagger, Diplomacy, Dune, The Desert Planet, Reconnaissance, Signet Ring.
- Muad'Dib Commander reveal cards: Command Respect, Convincing Argument, Demand Attention, Desert Call, Limited Landsraad Access, Signet Ring, Threaten Spice Production, Usul.
- Emperor Commander reveal cards: Convincing Argument, Corrino Might, Critical Shipments, Demand Results, Devastating Assault, Imperial Ornithopter, Imperial Tent, Signet Ring.
- Reserve cards: Prepare The Way.
- Imperium cards: Smuggler's Harvester, Interstellar Trade, Bene Gesserit Operative, Captured Mentat, Calculus of Power, Chani, Clever Tactician.

These cards currently use typed Agent effect specs:

- Ally starter cards: Signet Ring leader-gated immediate rewards for Gurney Halleck and Lady Amber Metulli, plus spy placement pending rewards for Lady Margot Fenring and Staban Tuek.
- Reserve cards: Prepare The Way.
- Muad'Dib Commander cards: Command Respect, Demand Attention, Desert Call, Signet Ring, Usul.
- Emperor Commander cards: Critical Shipments, Demand Results, Devastating Assault, Imperial Tent, Signet Ring.
- Imperium cards: Bene Gesserit Operative, Captured Mentat, Cargo Runner, Chani, Clever Tactician, Maker Keeper, Maula Pistol, Northern Watermaster, Paracompass.

## Bespoke Automated Cards

These cards are automated but still rely on explicit card or leader branches while the shared primitive library grows:

- Commander starter cards: Threaten Spice Production, Shaddam Signet Ring choices.
- Ally leader Signet Ring pay/choice effects: Lady Jessica, Princess Irulan, Reverend Mother Jessica.
- Plot and Combat Intrigues: currently automated through pattern modules and card-specific branches, not effect specs.

## Data-Driven Non-Card Islands

- Conflict rewards are data-driven through `conflict-reward-data.ts`.
- Board spaces use structured costs, gains, influence, troop, spy, contract, combat, Maker, Sietch Tabr, and team routing fields.

## Manual / Printed Fallback

- `reveal-adjust` remains available for cards with `conditionalPersuasion` or `conditionalSwords`.
- Imported Imperium Agent text that is only summarized in `play` remains manual until migrated into Agent effect specs.

## Missing Primitives

The largest current gaps are Agent and choice primitives:

- Costs: Agent pay resources beyond typed Influence/sandworm/contract payments and Reveal strength/Reveal troop payments, discard card, non-trade trash card, lose Influence, recall spy.
- Conditions: combat participation beyond current conflict-unit count checks.
- Selectors: activated Ally outside routed troop recruitment, teammate, faction, board space, market card, reserve card, contract, hand/discard/play-area card.
- Effects: deploy troops, variable retreat troops, gain/lose Influence, recall spy, acquire card, take/complete contract, trash/discard card, gain VP, remove Shield Wall, remaining non-payment sandworm effects.
- Choices: optional effect, pay-or-skip, choose one, choose N, non-resource split Commander/Ally rewards.

## Verification

- `pnpm run verify:card-effect-specs` verifies reveal specs, Agent card draw/source-label/resource/recruit/spy-placement/post-placement/Intrigue draw/discard-for-Influence/resource-for-Influence/resource-for-sandworms/resource-for-contracts/trash-source-for-trade/deployment-block/Throne Row movement/Commander resource-split specs, Reveal Fremen Bond trait checks, Reveal troop-retreat strength specs, Reveal trash-card strength specs, Reveal Influence-for-Intrigue specs, Reveal resource-for-strength and resource-for-troops payment specs, legacy fallback, no double-counting, conditional Maker/space-icon/contract/spy/influence/conflict-unit/leader/alliance behavior, shared spy posts, and manual reveal fallback.
- `pnpm run verify` includes the effect-spec verifier through `package.json`.
