# Card Effect Gaps

This document records bespoke card behavior that should be replaced by reusable primitives, or kept bespoke only when a shared primitive would not be reasonable.

## Current Declarative Foundation

Implemented primitives:

- Triggers: `reveal`, `agent-play`
- Effects: gain persuasion, gain strength, gain resource with optional ability source labels, draw cards with optional ability source labels, draw Intrigues, recruit troops with optional ability source labels, place spies with optional ability source labels and post-placement actions, move an Imperium Row card to the Throne Row, split Commander/activated-Ally resource rewards, block Conflict deployment for the current Agent turn, optional Agent card discard for Influence and card draw, optional Agent resource payment for board-space Influence, optional Agent resource payment for activated-Ally sandworms, optional Agent source-card trash to open a same-team trade, optional Reveal troop retreat for strength, optional Reveal card trash for strength, optional Reveal Influence loss for Intrigue draw, optional Reveal resource payment for strength, optional Reveal resource payment for same-team Ally troops
- Amounts: fixed non-negative integer, completed contract count with optional non-negative integer multiplier
- Conditions: visited Maker space this round, visited a board-space icon, has at least N own spy posts, has at least N conflict units, has at least N effective Influence, has at least N completed contracts, has at least N cards with a trait in play, has team, has role, has Swordmaster bonus, has leader, has any/specific Alliance
- Selectors: `self`, `activated-ally` for Agent routed troop recruitment

The reveal resolver treats reveal specs as the full reveal model for a card. If a card has a reveal spec, legacy fields such as `persuasion`, `swords`, and `revealGain` remain available for display and compatibility but are not added again during reveal planning. Reveal condition checks treat all cards revealed from hand as in play, so Fremen Bond-style trait checks can count another card revealed in the same Reveal turn. Reveal specs currently cover immediate persuasion/strength/resource gains plus optional exact troop-retreat-for-strength pending actions, optional card-trash-for-strength pending actions, optional Influence-for-Intrigue pending actions, optional resource-for-strength pending actions, and optional resource-for-same-team-Ally-troops pending actions. Agent-play specs currently cover immediate self effects such as role/team-gated deployment blocking, Influence- and contract-gated card draw, conflict-unit-gated Intrigue draw including deferred deployment and Maker-sandworm threshold checks, resource gains, mandatory spy placement with recall-for-supply, optional discard-for-Influence-and-draw pending actions, optional resource-for-board-Influence pending actions, optional resource-for-activated-Ally-sandworm pending actions, optional source-card trash to open a same-team trade, deferred Throne Row movement, Commander/activated-Ally resource split pending actions, plus routed activated-Ally troop recruitment.
Unsupported spec shapes, including triggers, intentionally throw instead of falling back silently. Selectors beyond `self` and the currently supported `activated-ally` Agent routing are part of the planned type surface but fail until the resolver implements them.

## Bespoke Handlers To Retire

- `pendingActionForCard`
  - Commander starter card choices and payments
  - Leader Signet Ring pay/choice effects
- Plot Intrigue modules
  - Economy, influence, spy, tactical, and acquisition effects are automated but not declarative.
- Combat Intrigue modules
  - Strength, retreat, spy, trash, and acquisition effects are automated but not declarative.

## Next Primitive Candidates

1. Agent immediate gains: gain resources, draw cards, or draw Intrigues with non-self routing.
2. Agent spy primitives: optional place spy, shared post placement, restricted post icon, post-placement rewards.
3. Costs and choices: remaining Agent pay-resource shapes, optional pay, discard/trash selected card, lose Influence.
4. Routing: self versus activated Ally, Commander personal board influence, team-shared Influence checks.
5. Market/contract effects: acquire card up to cost, take face-up CHOAM contract, complete contract.

## Bespoke Rule

Before adding any new card-specific branch:

1. Check whether an existing primitive can express the card.
2. If not, add or extend a reusable primitive when it can cover more than one card.
3. If bespoke handling remains necessary, add the card to this document with the reason and add verifier coverage for the behavior.
