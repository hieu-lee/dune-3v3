# Card Coverage

This report tracks how card behavior is implemented. The target state is data-first card behavior through typed `CardEffectSpec` / `GameEffectSpec` entries, with bespoke handlers reserved for effects that cannot yet be expressed by shared primitives.

## Declarative Cards

These cards currently use typed reveal effect specs:

- Ally starter reveal cards: Convincing Argument, Dagger, Diplomacy, Dune, The Desert Planet, Reconnaissance, Signet Ring.
- Muad'Dib Commander reveal cards: Command Respect, Convincing Argument, Demand Attention, Desert Call, Limited Landsraad Access, Signet Ring, Threaten Spice Production, Usul.
- Emperor Commander reveal cards: Convincing Argument, Corrino Might, Critical Shipments, Demand Results, Devastating Assault, Imperial Ornithopter, Imperial Tent, Signet Ring.
- Reserve cards: Prepare The Way.
- Reserve/Imperium fixed reveal rewards are generated declaratively from catalog fields for every card with positive printed persuasion, strength, or reveal resource gain.
- Custom Reserve/Imperium reveal cards: Smuggler's Harvester, Interstellar Trade, Bene Gesserit Operative, Captured Mentat, Calculus of Power, Cargo Runner, Chani, Clever Tactician, Covert Operation, Double Agent, Ecological Testing Station, Fedaykin Stilltent, Guild Envoy, Hidden Missive, Maker Keeper, Maula Pistol, Northern Watermaster, Paracompass, Prepare The Way, Reliable Informant, Space-time Folding, Wheels Within Wheels.
- Custom Reserve/Imperium acquire cards: Guild Spy, In High Places, Overthrow, Price is No Object, Spy Network, Strike Fleet, Subversive Advisor, The Spice Must Flow.

These cards currently use typed Agent effect specs:

- Ally starter cards: Signet Ring leader-gated immediate rewards for Gurney Halleck and Lady Amber Metulli, plus spy placement pending rewards for Lady Margot Fenring and Staban Tuek.
- Reserve cards: Prepare The Way.
- Muad'Dib Commander cards: Command Respect, Demand Attention, Desert Call, Signet Ring, Threaten Spice Production, Usul.
- Emperor Commander cards: Critical Shipments, Demand Results, Devastating Assault, Imperial Tent, Signet Ring.
- Imperium cards: Bene Gesserit Operative, Captured Mentat, Cargo Runner, Chani, Clever Tactician, Covert Operation, Dangerous Rhetoric, Desert Power, Double Agent, Ecological Testing Station, Fedaykin Stilltent, Guild Envoy, Hidden Missive, Imperial Spymaster, Leadership, Maker Keeper, Maula Pistol, Northern Watermaster, Paracompass, Price is No Object, Public Spectacle, Rebel Supplier, Reliable Informant, Sardaukar Soldier, Southern Elders, Space-time Folding, Stilgar, The Devoted, Theacherous Maneuver, Undercover Asset, Wheels Within Wheels.
- Covert Operation uses the typed Agent `opponents-discard-cards` primitive, which queues mandatory hand-discard prompts for opposing-team players with cards in hand.
- Dangerous Rhetoric uses the typed Agent `gain-influence-choice` primitive, which reuses the board Influence choice pending surface and can trash the source card after resolution.
- Desert Power uses the typed Agent `gain-resource` primitive gated by the current Agent board space being a Maker space.
- Ecological Testing Station uses the typed Agent `pay-resource-for-draw-cards` pending primitive for its "pay 2 water to draw 2 cards" choice.
- Imperial Spymaster and Sardaukar Soldier use the typed Agent `draw-intrigues` primitive for fixed Intrigue rewards.
- Leadership uses the typed Agent `draw-cards` primitive for its fixed card draw.
- Price is No Object uses the typed Agent `acquire-card` pending primitive to optionally acquire a market card to hand while paying its printed cost in Solari.
- Public Spectacle and Theacherous Maneuver use the typed Agent `gain-influence-choice` primitive; Public Spectacle composes it with typed spy placement.
- Rebel Supplier, Southern Elders, and Stilgar, The Devoted use typed Agent fixed resource/recruit primitives; troop rewards route to the activated Ally when a Commander plays the card.
- Undercover Asset uses the typed Agent `place-spies` primitive.

## Bespoke Automated Cards

These cards are automated but still rely on explicit card or leader branches while the shared primitive library grows:

- Commander starter cards: Shaddam Signet Ring choices.
- Ally leader Signet Ring pay/choice effects: Lady Jessica, Princess Irulan, Reverend Mother Jessica.
- Plot and Combat Intrigues: currently automated through pattern modules and card-specific branches, not effect specs.

## Data-Driven Non-Card Islands

- Conflict rewards are data-driven through `conflict-reward-data.ts`.
- Board spaces use structured costs, gains, influence, troop, spy, contract, combat, Maker, Sietch Tabr, and team routing fields.

## Manual / Printed Fallback

- `reveal-adjust` remains available for cards with `conditionalPersuasion` or `conditionalSwords`; no current Reserve or Imperium reveal card needs it.
- Zero-reveal Reserve/Imperium cards without Reveal specs: The Spice Must Flow, Corrinth City, Delivery Agreement, Priority Contracts.
- Imported Imperium Agent text that is only summarized in `play` remains manual until migrated into Agent effect specs; fixed card draws, fixed Intrigue draws, fixed resource gains, current-Agent Maker-space resource gains, fixed routed troop recruitment, fixed spy placement, and simple Influence-choice rewards are covered for the migrated simple cards, while cards with costs beyond current payment shapes, discard/trash choices, contract acquisition, remaining Influence-gain shapes beyond simple choices, acquire bonuses beyond fixed VP/resource/spy/Intrigue rewards, Recall Agent, sandworm effects, or opponent effects beyond typed hand discard still need specific primitives before automatic generation. Desert Power's Agent reward is typed, but its Reveal choice between persuasion and paying water for a sandworm still needs a Reveal choose/pay primitive.

## Missing Primitives

The largest current gaps are Agent and choice primitives:

- Costs: Agent pay resources beyond typed draw-card/Influence/sandworm/contract/team-VP payments and Reveal strength/Reveal troop payments, discard card outside typed discard-for-draw/Influence-draw effects, non-trade trash card, lose Influence, recall spy.
- Conditions: combat participation beyond current conflict-unit count checks.
- Selectors: activated Ally outside routed troop recruitment, teammate, faction, board space, market card, reserve card, contract, hand/discard/play-area card.
- Effects: deploy troops to conflict, variable retreat troops, fixed or modifier-based gain/lose Influence beyond typed self Influence choices and existing payment/loss shapes, recall spy, discounted or targeted acquire-card variants beyond the typed self market acquisition, take/complete contract, trash/discard card beyond typed self/opponent hand-discard shapes, gain VP outside fixed acquire rewards, remove Shield Wall, remaining non-payment sandworm effects.
- Choices: optional effect, pay-or-skip, choose one, choose N, non-resource split Commander/Ally rewards.

## Verification

- `pnpm run verify:card-effect-specs` verifies generated fixed Reserve/Imperium reveal specs, Acquire VP/resource/spy/Intrigue specs, Agent card draw/source-label/resource/recruit/spy-placement/post-placement/Intrigue draw/acquire-card/gain-Influence-choice/discard-for-draw/discard-for-Influence/opponents-discard/resource-for-draw/resource-for-Influence/resource-for-sandworms/resource-for-contracts/team-resource-for-VP/trash-source-for-trade/deployment-block/Throne Row movement/Commander resource-split specs, simple Imperium Agent draw/Intrigue/resource/current-Agent-Maker-resource/spy/Influence/routed-troop migrations, condition-gated Imperium Agent resource/draw/recruit/spy migrations, current-Agent Maker-space and spy-post context, Reveal Fremen Bond trait checks, Reveal troop-retreat strength specs, Reveal trash-card strength specs, Reveal Influence-for-Intrigue specs, Reveal resource-for-strength and resource-for-troops payment specs, Reveal spy placement pending specs, legacy fallback, no double-counting, conditional Maker/space-icon/contract/spy/influence/conflict-unit/leader/alliance behavior, shared spy posts, and manual reveal fallback.
- `pnpm run verify` includes the effect-spec verifier through `package.json`.
