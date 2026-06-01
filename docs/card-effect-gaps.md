# Card Effect Gaps

This document records bespoke card behavior that should be replaced by reusable primitives, or kept bespoke only when a shared primitive would not be reasonable.

## Current Declarative Foundation

Implemented primitives:

- Trigger: `reveal`
- Effects: gain persuasion, gain strength, gain resource
- Amounts: fixed non-negative integer, completed contract count with optional non-negative integer multiplier
- Conditions: visited Maker space this round, has at least N own spy posts
- Selector: `self`

The reveal resolver treats reveal specs as the full reveal model for a card. If a card has a reveal spec, legacy fields such as `persuasion`, `swords`, and `revealGain` remain available for display and compatibility but are not added again during reveal planning.
Unsupported spec shapes, including triggers, intentionally throw instead of falling back silently. Selectors other than `self` are part of the planned type surface but fail until the resolver implements them.

## Bespoke Handlers To Retire

- `applyCardAgentEffect`
  - Prepare The Way draw threshold
  - Commander and Ally signet immediate rewards
  - Devastating Assault Agent reward
- `pendingActionForCard`
  - Captured Mentat Agent and Reveal choices
  - Bene Gesserit Operative Agent spy placement
  - Imperial Tent Throne Row movement
  - Commander starter card choices and payments
  - Leader Signet Ring choices
- Plot Intrigue modules
  - Economy, influence, spy, tactical, and acquisition effects are automated but not declarative.
- Combat Intrigue modules
  - Strength, retreat, spy, trash, and acquisition effects are automated but not declarative.

## Next Primitive Candidates

1. Agent immediate gains: gain resources, draw cards, recruit troops, draw Intrigue.
2. Agent spy primitives: place spy, optional place spy, recall-for-supply, shared post placement, restricted post icon.
3. Costs and choices: pay resource, optional pay, discard/trash selected card, lose Influence.
4. Routing: self versus activated Ally, Commander personal board influence, team-shared Influence checks.
5. Market/contract effects: acquire card up to cost, take face-up CHOAM contract, complete contract.

## Bespoke Rule

Before adding any new card-specific branch:

1. Check whether an existing primitive can express the card.
2. If not, add or extend a reusable primitive when it can cover more than one card.
3. If bespoke handling remains necessary, add the card to this document with the reason and add verifier coverage for the behavior.
