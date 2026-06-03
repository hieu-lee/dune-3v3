import assert from "node:assert/strict";
import { agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecDiscardManipulationValidation({
  cards,
  effectResolver,
  game,
  players,
  state,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p2, p4 } = players;
  const revealDiscardInfluenceDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-influence-draw-card",
    name: "Effect Spec Reveal Discard Influence Draw",
    effects: [revealSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardInfluenceDrawCard], highCouncilSeat: false }),
    /Unsupported effect "discard-card-for-influence-and-draw" for reveal/,
    "Discard-for-Influence-and-draw specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardInfluenceDrawSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-selector-card",
    name: "Effect Spec Invalid Discard Influence Draw Selector",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "activated-ally",
      drawCards: 1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-card-for-influence-and-draw/,
    "Discard-for-Influence-and-draw specs should reject activated Ally selectors",
  );
  const invalidDiscardInfluenceDrawAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-draw-amount-card",
    name: "Effect Spec Invalid Discard Influence Draw Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: -1,
      influenceAmount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceDrawAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative draw amounts",
  );
  const invalidDiscardInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-influence-amount-card",
    name: "Effect Spec Invalid Discard Influence Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-influence-and-draw",
      selector: "self",
      drawCards: 1,
      influenceAmount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardInfluenceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-Influence-and-draw specs should require non-negative Influence amounts",
  );
  const revealDiscardDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-draw-card",
    name: "Effect Spec Reveal Discard Draw",
    effects: [revealSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardDrawCard], highCouncilSeat: false }),
    /Unsupported effect "discard-card-for-draw" for reveal/,
    "Discard-for-draw specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardDrawSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-selector-card",
    name: "Effect Spec Invalid Discard Draw Selector",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "activated-ally",
      drawCards: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-card-for-draw/,
    "Discard-for-draw specs should reject activated Ally selectors",
  );
  const invalidDiscardDrawAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-amount-card",
    name: "Effect Spec Invalid Discard Draw Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should require non-negative draw amounts",
  );
  const invalidDiscardDrawOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-optional-card",
    name: "Effect Spec Invalid Discard Draw Optional",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawOptionalCard, p2, p2),
    /Invalid discard-card-for-draw optional "false"/,
    "Discard-for-draw specs should reject non-boolean optional values",
  );
  const invalidDiscardDrawBonusTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-trait-card",
    name: "Effect Spec Invalid Discard Draw Bonus Trait",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusDraw: {
        requiredDiscardTrait: "",
        drawCards: 1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusTraitCard, p2, p2),
    /Invalid discard-card-for-draw bonusDraw requiredDiscardTrait ""/,
    "Discard-for-draw specs should reject empty bonus trait labels",
  );
  const invalidDiscardDrawBonusAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-amount-card",
    name: "Effect Spec Invalid Discard Draw Bonus Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusDraw: {
        requiredDiscardTrait: "Faction: Spacing Guild",
        drawCards: -1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should reject negative bonus draw amounts",
  );
  const invalidDiscardDrawBonusIntriguesTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-intrigues-trait-card",
    name: "Effect Spec Invalid Discard Draw Bonus Intrigues Trait",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusIntrigues: {
        requiredDiscardTrait: "",
        amount: 1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusIntriguesTraitCard, p2, p2),
    /Invalid discard-card-for-draw bonusIntrigues requiredDiscardTrait ""/,
    "Discard-for-draw specs should reject empty bonus Intrigue trait labels",
  );
  const invalidDiscardDrawBonusIntriguesAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-draw-bonus-intrigues-amount-card",
    name: "Effect Spec Invalid Discard Draw Bonus Intrigues Amount",
    effects: [agentSpec([{
      kind: "discard-card-for-draw",
      selector: "self",
      drawCards: 1,
      bonusIntrigues: {
        requiredDiscardTrait: "Faction: Spacing Guild",
        amount: -1,
      },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardDrawBonusIntriguesAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Discard-for-draw specs should reject negative bonus Intrigue amounts",
  );
  const revealDiscardRewardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-discard-reward-card",
    name: "Effect Spec Reveal Discard Reward",
    effects: [revealSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDiscardRewardCard], highCouncilSeat: false }),
    /Unsupported effect "discard-cards-for-reward" for reveal/,
    "Discard-for-reward specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDiscardRewardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-selector-card",
    name: "Effect Spec Invalid Discard Reward Selector",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "activated-ally",
      amount: 1,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for discard-cards-for-reward/,
    "Discard-for-reward specs should reject activated Ally selectors",
  );
  const invalidDiscardRewardAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-amount-card",
    name: "Effect Spec Invalid Discard Reward Amount",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 0,
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardAmountCard, p2, p2),
    /Invalid discard-cards-for-reward amount "0"/,
    "Discard-for-reward specs should require positive discard amounts",
  );
  const invalidDiscardRewardCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-cost-card",
    name: "Effect Spec Invalid Discard Reward Cost",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      cost: { solari: 0 },
      gain: { spice: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardCostCard, p2, p2),
    /Invalid discard-cards-for-reward cost solari "0"/,
    "Discard-for-reward specs should reject non-positive resource costs",
  );
  const invalidDiscardRewardEmptyCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-empty-card",
    name: "Effect Spec Invalid Discard Reward Empty",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardEmptyCard, p2, p2),
    /Invalid discard-cards-for-reward reward "undefined"/,
    "Discard-for-reward specs should require at least one reward",
  );
  const invalidDiscardRewardVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-vp-card",
    name: "Effect Spec Invalid Discard Reward VP",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gainVp: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardVpCard, p2, p2),
    /Invalid discard-cards-for-reward gainVp "0"/,
    "Discard-for-reward specs should require positive VP rewards",
  );
  const invalidDiscardRewardContractAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-contract-amount-card",
    name: "Effect Spec Invalid Discard Reward Contract Amount",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      takeContracts: { amount: 2, sourcePool: "public-offer" },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardContractAmountCard, p2, p2),
    /Invalid discard-cards-for-reward takeContracts amount "2"/,
    "Discard-for-reward specs should only support one public contract",
  );
  const invalidDiscardRewardContractSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-contract-source-card",
    name: "Effect Spec Invalid Discard Reward Contract Source",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      takeContracts: { amount: 1, sourcePool: "reserved" },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardContractSourceCard, p2, p2),
    /Invalid discard-cards-for-reward takeContracts sourcePool "reserved"/,
    "Discard-for-reward specs should only support public-offer contracts",
  );
  const invalidDiscardRewardOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-discard-reward-optional-card",
    name: "Effect Spec Invalid Discard Reward Optional",
    effects: [agentSpec([{
      kind: "discard-cards-for-reward",
      selector: "self",
      amount: 1,
      gain: { spice: 1 },
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDiscardRewardOptionalCard, p2, p2),
    /Invalid discard-cards-for-reward optional "false"/,
    "Discard-for-reward specs should reject non-boolean optional values",
  );
  const topDeckSelectionCard = {
    ...convincingArgument,
    id: "effect-spec-top-deck-selection-card",
    name: "Effect Spec Top Deck Selection",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  const topDeckSelections = effectResolver.resolveAgentTopDeckSelections(topDeckSelectionCard.effects, {
    trigger: "agent-play",
    source: p2,
    target: p2,
    state: game,
  });
  assert.equal(topDeckSelections.length, 1, "Top-deck selection specs should resolve for Agent play");
  assert.equal(topDeckSelections[0].selector, "self");
  assert.equal(topDeckSelections[0].lookCards, 3);
  assert.equal(topDeckSelections[0].drawCards, 1);
  assert.equal(topDeckSelections[0].discardCards, 1);
  assert.equal(topDeckSelections[0].trashCards, 1);
  assert.equal(topDeckSelections[0].minimumDeckCards, 3);
  const revealTopDeckSelectionCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-top-deck-selection-card",
    name: "Effect Spec Reveal Top Deck Selection",
    effects: [revealSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealTopDeckSelectionCard], highCouncilSeat: false }),
    /Unsupported effect "select-top-deck-cards" for reveal/,
    "Top-deck selection specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidTopDeckSelectionSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-top-deck-selection-selector-card",
    name: "Effect Spec Invalid Top Deck Selection Selector",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "activated-ally",
      lookCards: 3,
      drawCards: 1,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveAgentTopDeckSelections(invalidTopDeckSelectionSelectorCard.effects, {
      trigger: "agent-play",
      source: p2,
      target: p2,
      state: game,
    }),
    /Unsupported effect selector "activated-ally" for select-top-deck-cards/,
    "Top-deck selection specs should reject activated Ally selectors",
  );
  const invalidTopDeckSelectionAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-top-deck-selection-amount-card",
    name: "Effect Spec Invalid Top Deck Selection Amount",
    effects: [agentSpec([{
      kind: "select-top-deck-cards",
      selector: "self",
      lookCards: 3,
      drawCards: 2,
      discardCards: 1,
      trashCards: 1,
      minimumDeckCards: 3,
    }])],
  };
  assert.throws(
    () => effectResolver.resolveAgentTopDeckSelections(invalidTopDeckSelectionAmountCard.effects, {
      trigger: "agent-play",
      source: p2,
      target: p2,
      state: game,
    }),
    /Invalid select-top-deck-cards drawCards "2"/,
    "Top-deck selection specs should reject unsupported card-assignment shapes",
  );
  const revealTrashIntrigueRewardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-trash-intrigue-reward-card",
    name: "Effect Spec Reveal Trash Intrigue Reward",
    effects: [revealSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealTrashIntrigueRewardCard], highCouncilSeat: false }),
    /Unsupported effect "trash-intrigue-for-reward" for reveal/,
    "Trash-Intrigue reward specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidTrashIntrigueSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-selector-card",
    name: "Effect Spec Invalid Trash Intrigue Selector",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "activated-ally",
      drawIntrigues: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for trash-intrigue-for-reward/,
    "Trash-Intrigue reward specs should reject activated Ally selectors",
  );
  const invalidTrashIntrigueAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward drawIntrigues "-1"/,
    "Trash-Intrigue reward specs should reject negative Intrigue draw amounts",
  );
  const invalidTrashIntrigueZeroAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-zero-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Zero Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueZeroAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward drawIntrigues "0"/,
    "Trash-Intrigue reward specs should reject zero Intrigue draw rewards",
  );
  const invalidTrashIntrigueResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-resource-card",
    name: "Effect Spec Invalid Trash Intrigue Resource",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { melange: 1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Trash-Intrigue reward specs should reject unsupported resource gains",
  );
  const invalidTrashIntrigueGainAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-gain-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Gain Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { spice: -1 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueGainAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward gain spice "-1"/,
    "Trash-Intrigue reward specs should reject negative resource gains",
  );
  const invalidTrashIntrigueZeroGainAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-zero-gain-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Zero Gain Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gain: { spice: 0 },
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueZeroGainAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward gain spice "0"/,
    "Trash-Intrigue reward specs should reject zero resource gains",
  );
  const invalidTrashIntrigueCostResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-cost-resource-card",
    name: "Effect Spec Invalid Trash Intrigue Cost Resource",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      cost: { melange: 1 },
      gainVp: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueCostResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Trash-Intrigue reward specs should reject unsupported resource costs",
  );
  const invalidTrashIntrigueCostAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-cost-amount-card",
    name: "Effect Spec Invalid Trash Intrigue Cost Amount",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      cost: { spice: 0 },
      gainVp: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueCostAmountCard, p2, p2),
    /Invalid trash-intrigue-for-reward cost spice "0"/,
    "Trash-Intrigue reward specs should reject zero resource costs",
  );
  const invalidTrashIntrigueGainVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-gain-vp-card",
    name: "Effect Spec Invalid Trash Intrigue Gain VP",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      gainVp: 0,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueGainVpCard, p2, p2),
    /Invalid trash-intrigue-for-reward gainVp "0"/,
    "Trash-Intrigue reward specs should reject zero VP rewards",
  );
  const invalidTrashIntrigueEmptyRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-empty-reward-card",
    name: "Effect Spec Invalid Trash Intrigue Empty Reward",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueEmptyRewardCard, p2, p2),
    /Invalid trash-intrigue-for-reward reward "undefined"/,
    "Trash-Intrigue reward specs should require at least one reward",
  );
  const invalidTrashIntrigueSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-source-card",
    name: "Effect Spec Invalid Trash Intrigue Source",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueSourceCard, p2, p2),
    /Invalid trash-intrigue-for-reward source ""/,
    "Trash-Intrigue reward specs should reject empty source labels",
  );
  const invalidTrashIntrigueOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-intrigue-optional-card",
    name: "Effect Spec Invalid Trash Intrigue Optional",
    effects: [agentSpec([{
      kind: "trash-intrigue-for-reward",
      selector: "self",
      drawIntrigues: 1,
      optional: "yes",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTrashIntrigueOptionalCard, p2, p2),
    /Invalid trash-intrigue-for-reward optional "yes"/,
    "Trash-Intrigue reward specs should reject non-boolean optional values",
  );
  const revealOpponentDiscardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-opponent-discard-card",
    name: "Effect Spec Reveal Opponent Discard",
    effects: [revealSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealOpponentDiscardCard], highCouncilSeat: false }),
    /Unsupported effect "opponents-discard-cards" for reveal/,
    "Opponent-discard specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidOpponentDiscardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-selector-card",
    name: "Effect Spec Invalid Opponent Discard Selector",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "activated-ally",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for opponents-discard-cards/,
    "Opponent-discard specs should reject activated Ally selectors",
  );
  const invalidOpponentDiscardAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-amount-card",
    name: "Effect Spec Invalid Opponent Discard Amount",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Opponent-discard specs should require non-negative discard amounts",
  );
  const invalidOpponentDiscardSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-opponent-discard-source-card",
    name: "Effect Spec Invalid Opponent Discard Source",
    effects: [agentSpec([{
      kind: "opponents-discard-cards",
      selector: "self",
      amount: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidOpponentDiscardSourceCard, p2, p2),
    /Invalid opponents-discard-cards source ""/,
    "Opponent-discard specs should reject empty source labels",
  );
}
