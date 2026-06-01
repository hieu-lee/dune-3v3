# Card Effect Gaps

This document records bespoke card behavior that should be replaced by reusable primitives, or kept bespoke only when a shared primitive would not be reasonable.

## Current Declarative Foundation

Implemented primitives:

- Triggers: `reveal`, `agent-play`
- Effects: gain persuasion, gain strength, gain resource, draw cards, draw Intrigues, recruit troops, place spies, optional Reveal troop retreat for strength, optional Reveal card trash for strength
- Amounts: fixed non-negative integer, completed contract count with optional non-negative integer multiplier
- Conditions: visited Maker space this round, has at least N own spy posts, has at least N conflict units, has at least N effective Influence, has at least N completed contracts, has at least N cards with a trait in play
- Selectors: `self`, `activated-ally` for Agent routed troop recruitment

The reveal resolver treats reveal specs as the full reveal model for a card. If a card has a reveal spec, legacy fields such as `persuasion`, `swords`, and `revealGain` remain available for display and compatibility but are not added again during reveal planning. Reveal condition checks treat all cards revealed from hand as in play, so Fremen Bond-style trait checks can count another card revealed in the same Reveal turn. Reveal specs currently cover immediate persuasion/strength/resource gains plus optional exact troop-retreat-for-strength pending actions and optional card-trash-for-strength pending actions. Agent-play specs currently cover immediate self effects such as Influence- and contract-gated card draw, conflict-unit-gated Intrigue draw including deferred deployment and Maker-sandworm threshold checks, resource gains, mandatory spy placement with recall-for-supply, plus routed activated-Ally troop recruitment.
Unsupported spec shapes, including triggers, intentionally throw instead of falling back silently. Selectors beyond `self` and the currently supported `activated-ally` Agent routing are part of the planned type surface but fail until the resolver implements them.

## Bespoke Handlers To Retire

- `applyCardAgentEffect`
  - Commander and Ally signet immediate rewards
- `pendingActionForCard`
  - Captured Mentat Agent and Reveal choices
  - Imperial Tent Throne Row movement
  - Commander starter card choices and payments
  - Leader Signet Ring choices
- Plot Intrigue modules
  - Economy, influence, spy, tactical, and acquisition effects are automated but not declarative.
- Combat Intrigue modules
  - Strength, retreat, spy, trash, and acquisition effects are automated but not declarative.

## Next Primitive Candidates

1. Agent immediate gains: gain resources, draw cards, or draw Intrigues with non-self routing.
2. Agent spy primitives: optional place spy, shared post placement, restricted post icon, post-placement rewards.
3. Costs and choices: pay resource, optional pay, discard/trash selected card, lose Influence.
4. Routing: self versus activated Ally, Commander personal board influence, team-shared Influence checks.
5. Market/contract effects: acquire card up to cost, take face-up CHOAM contract, complete contract.

## Bespoke Rule

Before adding any new card-specific branch:

1. Check whether an existing primitive can express the card.
2. If not, add or extend a reusable primitive when it can cover more than one card.
3. If bespoke handling remains necessary, add the card to this document with the reason and add verifier coverage for the behavior.
