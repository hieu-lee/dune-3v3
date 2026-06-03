import assert from "node:assert/strict";
import { agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecPaymentInfluenceSandwormsValidation({
  cards,
  data,
  game,
  players,
  state,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p1, p2, p3, p4 } = players;
  const revealPayResourceInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-influence-card",
    name: "Effect Spec Reveal Pay Resource Influence",
    effects: [revealSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealPayResourceInfluenceCard], highCouncilSeat: false }),
    /Unsupported effect "pay-resource-for-influence" for reveal/,
    "Resource-for-Influence specs should stay in Agent play",
  );
  const invalidPayResourceInfluenceSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-selector-card",
    name: "Effect Spec Invalid Pay Resource Influence Selector",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "activated-ally",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for pay-resource-for-influence/,
    "Resource-for-Influence specs should reject activated Ally selectors",
  );
  const invalidPayResourceInfluenceResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-resource-card",
    name: "Effect Spec Invalid Pay Resource Influence Resource",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "melange",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Resource-for-Influence specs should reject unsupported resource ids",
  );
  const invalidPayResourceInfluenceFactionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-faction-card",
    name: "Effect Spec Invalid Pay Resource Influence Faction",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "sardaukar",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceFactionCard, p2, p2),
    /Unsupported effect faction "sardaukar"/,
    "Resource-for-Influence specs should reject unsupported faction ids",
  );
  const invalidPayResourceInfluenceRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-recipient-card",
    name: "Effect Spec Invalid Pay Resource Influence Recipient",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "self",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceRecipientCard, p2, p2),
    /Invalid pay-resource-for-influence recipient "self"/,
    "Resource-for-Influence specs should reject unsupported recipient routing",
  );
  const invalidPayResourceInfluenceCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-cost-card",
    name: "Effect Spec Invalid Pay Resource Influence Cost",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: -1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-Influence specs should require non-negative costs",
  );
  const invalidPayResourceInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-amount-card",
    name: "Effect Spec Invalid Pay Resource Influence Amount",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: -1,
      recipient: "board-effect-recipient",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-Influence specs should require non-negative Influence amounts",
  );
  const invalidPayResourceInfluenceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-source-card",
    name: "Effect Spec Invalid Pay Resource Influence Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceSourceCard, p2, p2),
    /Invalid pay-resource-for-influence source ""/,
    "Resource-for-Influence specs should reject empty source labels",
  );
  const invalidPayResourceInfluenceTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Influence Trash Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      trashSource: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceTrashSourceCard, p2, p2),
    /Invalid pay-resource-for-influence trashSource "false"/,
    "Resource-for-Influence specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceInfluenceOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-influence-optional-card",
    name: "Effect Spec Invalid Pay Resource Influence Optional",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceInfluenceOptionalCard, p2, p2),
    /Invalid pay-resource-for-influence optional "false"/,
    "Resource-for-Influence specs should reject non-true optional values",
  );
  const requiredPayResourceInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-influence-card",
    name: "Effect Spec Required Pay Resource Influence",
    effects: [agentSpec([{
      kind: "pay-resource-for-influence",
      selector: "self",
      resource: "solari",
      cost: 1,
      faction: "bene",
      amount: 1,
      recipient: "board-effect-recipient",
      optional: false,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(requiredPayResourceInfluenceCard, p2, p2),
    /Invalid pay-resource-for-influence optional "false"/,
    "Resource-for-Influence specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const revealPayResourceSandwormsCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-sandworms-card",
    name: "Effect Spec Reveal Pay Resource Sandworms",
    effects: [revealSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "combat-recipient",
      destination: "conflict",
      persuasionCost: 2,
      source: "Reveal Worms",
    }])],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({ ...p3, hand: [revealPayResourceSandwormsCard], highCouncilSeat: false }, game),
    { influenceGains: {}, persuasion: 0, printedRevealCards: [], recruitedTroops: 0, revealGain: {}, swords: 0 },
    "Reveal sandworm payment specs should not add immediate reveal rewards by themselves",
  );
  const unprotectedConflict = data.conflictCards.find((card) => card.name === "Skirmish (Desert Mouse)");
  assert.ok(unprotectedConflict, "Verifier needs an unprotected Conflict fixture");
  const revealSandwormOwner = {
    ...p3,
    makerHooks: true,
    playArea: [revealPayResourceSandwormsCard],
    persuasion: 2,
    resources: { ...p3.resources, water: 1 },
  };
  const revealSandwormState = {
    ...game,
    conflict: unprotectedConflict,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => player.id === p3.id ? revealSandwormOwner : player),
    shieldWall: false,
  };
  const [revealSandwormPending] = state.pendingActionsForRevealPayResourceForSandworms(
    revealPayResourceSandwormsCard,
    revealSandwormOwner,
    revealSandwormState,
    p3.id,
  );
  assert.deepEqual(
    revealSandwormPending,
    {
      kind: "pay-resource-for-sandworms",
      ownerId: p3.id,
      recipientId: p3.id,
      resource: "water",
      cost: 1,
      sandworms: 1,
      strength: 3,
      destination: "conflict",
      optional: true,
      persuasionCost: 2,
      source: "Reveal Worms",
      cardId: revealPayResourceSandwormsCard.id,
    },
    "Reveal sandworm payments should queue against the combat recipient and carry the replaced persuasion",
  );
  const revealSandwormResolved = state.resolvePayResourceForSandwormsChoice(
    { ...revealSandwormState, pendingAction: revealSandwormPending },
    revealSandwormPending,
  );
  assert.equal(playerById(revealSandwormResolved, p3.id).resources.water, 0, "Reveal sandworm payment should spend water");
  assert.equal(playerById(revealSandwormResolved, p3.id).persuasion, 0, "Reveal sandworm payment should forgo the configured persuasion");
  assert.equal(playerById(revealSandwormResolved, p3.id).deployedSandworms, 1, "Reveal sandworm payment should deploy a sandworm");
  assert.equal(playerById(revealSandwormResolved, p3.id).conflict, p3.conflict + 3, "Reveal sandworm payment should add sandworm strength");
  assert.match(revealSandwormResolved.log[0], /spends 1 water and forgoes 2 persuasion for Reveal Worms/);
  const revealSandwormSkipped = state.skipPayResourceForSandworms(
    { ...revealSandwormState, pendingAction: revealSandwormPending },
    revealSandwormPending,
  );
  assert.equal(playerById(revealSandwormSkipped, p3.id).resources.water, 1, "Skipping Reveal sandworm payment should preserve water");
  assert.equal(playerById(revealSandwormSkipped, p3.id).persuasion, 2, "Skipping Reveal sandworm payment should keep persuasion");
  assert.deepEqual(
    state.pendingActionsForRevealPayResourceForSandworms(
      revealPayResourceSandwormsCard,
      { ...revealSandwormOwner, makerHooks: false },
      {
        ...revealSandwormState,
        players: revealSandwormState.players.map((player) =>
          player.id === p3.id ? { ...revealSandwormOwner, makerHooks: false } : player,
        ),
      },
      p3.id,
    ),
    [],
    "Reveal sandworm payments should not queue without Maker Hooks",
  );
  const commanderRevealSandwormOwner = {
    ...p1,
    playArea: [revealPayResourceSandwormsCard],
    persuasion: 2,
    resources: { ...p1.resources, water: 1 },
  };
  const commanderRevealSandwormRecipient = {
    ...p3,
    conflict: 0,
    deployedSandworms: 0,
    makerHooks: true,
  };
  const commanderRevealSandwormState = {
    ...game,
    conflict: unprotectedConflict,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === p1.id) return commanderRevealSandwormOwner;
      if (player.id === p3.id) return commanderRevealSandwormRecipient;
      return player;
    }),
    shieldWall: false,
  };
  const [commanderRevealSandwormPending] = state.pendingActionsForRevealPayResourceForSandworms(
    revealPayResourceSandwormsCard,
    commanderRevealSandwormOwner,
    commanderRevealSandwormState,
    p3.id,
  );
  assert.equal(commanderRevealSandwormPending.ownerId, p1.id, "Commander Reveal sandworm payment should be paid by the Commander");
  assert.equal(commanderRevealSandwormPending.recipientId, p3.id, "Commander Reveal sandworm payment should summon for the selected Ally");
  const commanderRevealSandwormResolved = state.resolvePayResourceForSandwormsChoice(
    { ...commanderRevealSandwormState, pendingAction: commanderRevealSandwormPending },
    commanderRevealSandwormPending,
  );
  assert.equal(playerById(commanderRevealSandwormResolved, p1.id).resources.water, 0, "Commander Reveal sandworm payment should spend Commander water");
  assert.equal(playerById(commanderRevealSandwormResolved, p1.id).persuasion, 0, "Commander Reveal sandworm payment should forgo Commander persuasion");
  assert.equal(playerById(commanderRevealSandwormResolved, p3.id).deployedSandworms, 1, "Commander Reveal sandworm payment should deploy the Ally sandworm");
  assert.equal(playerById(commanderRevealSandwormResolved, p3.id).conflict, 3, "Commander Reveal sandworm payment should add Ally strength");
  assert.equal(commanderRevealSandwormResolved.turnUnitDeployments[p1.id], 1, "Commander Reveal sandworms should count for the Commander turn");
  const invalidVisitedSpaceIconConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-visited-space-icon-card",
    name: "Effect Spec Invalid Visited Space Icon",
    effects: [agentSpec(
      [{ kind: "draw-cards", selector: "self", amount: 1 }],
      [{ kind: "visited-space-icon", icon: "desert" }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidVisitedSpaceIconConditionCard, p2, p2),
    /Unsupported effect icon "desert"/,
    "Visited-space-icon conditions should reject unsupported icon ids",
  );
  const invalidPayResourceSandwormsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-selector-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Selector",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "activated-ally",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for pay-resource-for-sandworms/,
    "Resource-for-sandworms specs should reject activated Ally selectors",
  );
  const invalidPayResourceSandwormsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-resource-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Resource",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "melange",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Resource-for-sandworms specs should reject unsupported resource ids",
  );
  const invalidPayResourceSandwormsRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-recipient-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Recipient",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "self",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsRecipientCard, p2, p2),
    /Invalid pay-resource-for-sandworms recipient "self"/,
    "Resource-for-sandworms specs should reject unsupported recipient routing",
  );
  const invalidPayResourceSandwormsDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-destination-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Destination",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "garrison",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsDestinationCard, p2, p2),
    /Invalid pay-resource-for-sandworms destination "garrison"/,
    "Resource-for-sandworms specs should reject unsupported destinations",
  );
  const invalidPayResourceSandwormsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-cost-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Cost",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: -1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-sandworms specs should require non-negative costs",
  );
  const invalidPayResourceSandwormsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-amount-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Amount",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: -1,
      recipient: "activated-ally",
      destination: "conflict",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-sandworms specs should require non-negative sandworm amounts",
  );
  const invalidPayResourceSandwormsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-source-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsSourceCard, p2, p2),
    /Invalid pay-resource-for-sandworms source ""/,
    "Resource-for-sandworms specs should reject empty source labels",
  );
  const invalidPayResourceSandwormsTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Trash Source",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      trashSource: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsTrashSourceCard, p2, p2),
    /Invalid pay-resource-for-sandworms trashSource "false"/,
    "Resource-for-sandworms specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceSandwormsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-sandworms-optional-card",
    name: "Effect Spec Invalid Pay Resource Sandworms Optional",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      optional: "false",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidPayResourceSandwormsOptionalCard, p2, p2),
    /Invalid pay-resource-for-sandworms optional "false"/,
    "Resource-for-sandworms specs should reject non-true optional values",
  );
  const requiredPayResourceSandwormsCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-sandworms-card",
    name: "Effect Spec Required Pay Resource Sandworms",
    effects: [agentSpec([{
      kind: "pay-resource-for-sandworms",
      selector: "self",
      resource: "water",
      cost: 1,
      sandworms: 1,
      recipient: "activated-ally",
      destination: "conflict",
      optional: false,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(requiredPayResourceSandwormsCard, p2, p2),
    /Invalid pay-resource-for-sandworms optional "false"/,
    "Resource-for-sandworms specs should stay optional so queued payments cannot deadlock if resources change",
  );
}
