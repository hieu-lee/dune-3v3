import assert from "node:assert/strict";
import { agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecUtilityValidation({
  boardSpaces,
  cards,
  players,
  state,
  turnActions,
}) {
  const { arrakeen, shipping } = boardSpaces;
  const { convincingArgument } = cards;
  const { p2, p4 } = players;
  const returnSourceToHandEffectCard = {
    ...convincingArgument,
    id: "effect-spec-return-source-to-hand-card",
    name: "Effect Spec Return Source To Hand",
    effects: [agentSpec([{ kind: "return-source-to-hand", selector: "self", source: "Return Test" }])],
  };
  const returnSourceToHandApplied = state.applyCardAgentEffect(
    returnSourceToHandEffectCard,
    {
      ...p2,
      hand: [],
      playArea: [{ ...returnSourceToHandEffectCard, agentPlacementSpaceId: arrakeen.id, agentPlacementTargetOwnerId: p2.id }],
    },
    p2,
    undefined,
    arrakeen,
  );
  assert.equal(returnSourceToHandApplied.returnedSourceToHand, true, "Return-source specs should expose the moved source card");
  assert.equal(returnSourceToHandApplied.source.hand.at(-1)?.id, returnSourceToHandEffectCard.id);
  assert.equal(
    returnSourceToHandApplied.source.hand.at(-1)?.agentPlacementSpaceId,
    undefined,
    "Returned source cards should not keep stale Agent placement metadata in hand",
  );
  assert.equal(
    returnSourceToHandApplied.source.playArea.some((card) => card.id === returnSourceToHandEffectCard.id),
    false,
    "Return-source specs should remove the card from play",
  );
  assert.match(returnSourceToHandApplied.log ?? "", /Return Test: returns this card to hand/);
  const mismatchedReturnSourceToHandApplied = state.applyCardAgentEffect(
    returnSourceToHandEffectCard,
    {
      ...p2,
      hand: [],
      playArea: [{ ...returnSourceToHandEffectCard, agentPlacementSpaceId: shipping.id, agentPlacementTargetOwnerId: p2.id }],
    },
    p2,
    undefined,
    arrakeen,
  );
  assert.equal(
    mismatchedReturnSourceToHandApplied.returnedSourceToHand,
    undefined,
    "Return-source specs should not move a sole same-id card from a different Agent placement",
  );
  assert.equal(
    mismatchedReturnSourceToHandApplied.source.playArea.some((card) => card.id === returnSourceToHandEffectCard.id),
    true,
    "Return-source specs should leave mismatched placement cards in play",
  );
  const revealReturnSourceToHandCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-return-source-to-hand-card",
    name: "Effect Spec Reveal Return Source To Hand",
    effects: [revealSpec([{ kind: "return-source-to-hand", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealReturnSourceToHandCard], highCouncilSeat: false }),
    /Unsupported effect "return-source-to-hand" for reveal/,
    "Return-source specs should stay in Agent play",
  );
  const invalidReturnSourceToHandSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-return-source-to-hand-selector-card",
    name: "Effect Spec Invalid Return Source To Hand Selector",
    effects: [agentSpec([{ kind: "return-source-to-hand", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidReturnSourceToHandSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for return-source-to-hand/,
    "Return-source specs should reject activated Ally selectors",
  );
  const invalidReturnSourceToHandSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-return-source-to-hand-source-card",
    name: "Effect Spec Invalid Return Source To Hand Source",
    effects: [agentSpec([{ kind: "return-source-to-hand", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidReturnSourceToHandSourceCard, p2, p2),
    /Invalid return-source-to-hand source ""/,
    "Return-source specs should reject empty source labels",
  );
  const revealDeploymentBlockCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-deployment-block-card",
    name: "Effect Spec Reveal Deployment Block",
    effects: [revealSpec([{ kind: "block-conflict-deployment", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealDeploymentBlockCard], highCouncilSeat: false }),
    /Unsupported effect "block-conflict-deployment" for reveal/,
    "Deployment-block specs should stay in Agent play until other trigger resolvers support them",
  );
  const invalidDeploymentBlockSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-selector-card",
    name: "Effect Spec Invalid Deployment Block Selector",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for block-conflict-deployment/,
    "Deployment-block specs should reject activated Ally selectors",
  );
  const invalidDeploymentBlockSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployment-block-source-card",
    name: "Effect Spec Invalid Deployment Block Source",
    effects: [agentSpec([{ kind: "block-conflict-deployment", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDeploymentBlockSourceCard, p2, p2),
    /Invalid block-conflict-deployment source ""/,
    "Deployment-block specs should reject empty source labels",
  );
  const revealCommanderResourceSplitCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-commander-resource-split-card",
    name: "Effect Spec Reveal Commander Resource Split",
    effects: [revealSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealCommanderResourceSplitCard], highCouncilSeat: false }),
    /Unsupported effect "commander-resource-split" for reveal/,
    "Commander resource split specs should stay in Agent play",
  );
  const invalidCommanderResourceSplitSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-selector-card",
    name: "Effect Spec Invalid Commander Resource Split Selector",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "activated-ally", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for commander-resource-split/,
    "Commander resource split specs should reject activated Ally selectors",
  );
  const invalidCommanderResourceSplitSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-source-card",
    name: "Effect Spec Invalid Commander Resource Split Source",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", source: "", options: [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitSourceCard, p2, p2),
    /Invalid commander-resource-split source ""/,
    "Commander resource split specs should reject empty source labels",
  );
  const invalidCommanderResourceSplitOptionsCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-options-card",
    name: "Effect Spec Invalid Commander Resource Split Options",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitOptionsCard, p2, p2),
    /Invalid commander-resource-split options/,
    "Commander resource split specs should require at least one option",
  );
  const invalidCommanderResourceSplitResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-resource-card",
    name: "Effect Spec Invalid Commander Resource Split Resource",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "melange", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Commander resource split specs should reject unsupported resource ids",
  );
  const invalidCommanderResourceSplitAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-commander-resource-split-amount-card",
    name: "Effect Spec Invalid Commander Resource Split Amount",
    effects: [agentSpec([{ kind: "commander-resource-split", selector: "self", options: [
      { commanderResource: "water", commanderAmount: -1, allyResource: "spice", allyAmount: 1 },
    ] }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidCommanderResourceSplitAmountCard, p2, p2),
    /Invalid commander-resource-split commanderAmount "-1"/,
    "Commander resource split specs should reject negative amounts",
  );
  const revealThroneRowMoveCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-throne-row-move-card",
    name: "Effect Spec Reveal Throne Row Move",
    effects: [revealSpec([{ kind: "move-card-to-throne-row", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealThroneRowMoveCard], highCouncilSeat: false }),
    /Unsupported effect "move-card-to-throne-row" for reveal/,
    "Throne Row movement specs should stay in Agent play",
  );
  const invalidThroneRowMoveSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-throne-row-move-selector-card",
    name: "Effect Spec Invalid Throne Row Move Selector",
    effects: [agentSpec([{ kind: "move-card-to-throne-row", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidThroneRowMoveSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for move-card-to-throne-row/,
    "Throne Row movement specs should reject activated Ally selectors",
  );
  const invalidThroneRowMoveSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-throne-row-move-source-card",
    name: "Effect Spec Invalid Throne Row Move Source",
    effects: [agentSpec([{ kind: "move-card-to-throne-row", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidThroneRowMoveSourceCard, p2, p2),
    /Invalid move-card-to-throne-row source ""/,
    "Throne Row movement specs should reject empty source labels",
  );
  const revealRecallAgentCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-recall-agent-card",
    name: "Effect Spec Reveal Recall Agent",
    effects: [revealSpec([{ kind: "recall-agent", selector: "self" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealRecallAgentCard], highCouncilSeat: false }),
    /Unsupported effect "recall-agent" for reveal/,
    "Recall Agent specs should stay in Agent play",
  );
  const invalidRecallAgentSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recall-agent-selector-card",
    name: "Effect Spec Invalid Recall Agent Selector",
    effects: [agentSpec([{ kind: "recall-agent", selector: "activated-ally" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecallAgentSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for recall-agent/,
    "Recall Agent specs should reject activated Ally selectors",
  );
  const invalidRecallAgentSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recall-agent-source-card",
    name: "Effect Spec Invalid Recall Agent Source",
    effects: [agentSpec([{ kind: "recall-agent", selector: "self", source: "" }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecallAgentSourceCard, p2, p2),
    /Invalid recall-agent source ""/,
    "Recall Agent specs should reject empty source labels",
  );
  const recallAgentEffectCard = {
    ...convincingArgument,
    id: "effect-spec-recall-agent-effect-card",
    name: "Effect Spec Recall Agent",
    effects: [agentSpec([{ kind: "recall-agent", selector: "self", source: "Recall Test" }])],
  };
  const recallAgentApplied = state.applyCardAgentEffect(
    recallAgentEffectCard,
    { ...p2, agentsReady: 0, agentsTotal: 2 },
    { ...p2, agentsReady: 0, agentsTotal: 2 },
  );
  assert.equal(recallAgentApplied.source.agentsReady, 1, "Recall Agent should ready one spent Agent");
  assert.equal(recallAgentApplied.recalledAgents, 1, "Recall Agent should expose its immediate recall count");
  const duplicateRecallAgentEffectCard = {
    ...convincingArgument,
    id: "effect-spec-duplicate-recall-agent-effect-card",
    name: "Effect Spec Duplicate Recall Agent",
    effects: [agentSpec([
      { kind: "recall-agent", selector: "self", source: "Recall Test" },
      { kind: "recall-agent", selector: "self", source: "Recall Test" },
    ])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(duplicateRecallAgentEffectCard, p2, p2),
    /Unsupported multiple recall-agent effects/,
    "Recall Agent specs should reject multiple simultaneous Agent recalls",
  );
}
