import assert from "node:assert/strict";
import { agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecPaymentValidation({
  cards,
  game,
  players,
  state,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p2 } = players;
  const agentInfluenceIntrigueCard = {
    ...convincingArgument,
    id: "effect-spec-agent-influence-intrigue-card",
    name: "Effect Spec Agent Influence Intrigue",
    effects: [
      agentSpec([
        { kind: "lose-influence-for-intrigues", selector: "self", amount: 1 },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentInfluenceIntrigueCard, p2, p2),
    /Unsupported effect "lose-influence-for-intrigues" for agent-play/,
    "Influence-for-Intrigue specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidInfluenceIntrigueSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-selector-card",
    name: "Effect Spec Invalid Influence Intrigue Selector",
    effects: [
      revealSpec([
        {
          kind: "lose-influence-for-intrigues",
          selector: "activated-ally",
          amount: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidInfluenceIntrigueSelectorCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Influence-for-Intrigue specs should reject activated Ally reveal selectors",
  );
  const invalidInfluenceIntrigueAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-intrigue-amount-card",
    name: "Effect Spec Invalid Influence Intrigue Amount",
    effects: [
      revealSpec([
        { kind: "lose-influence-for-intrigues", selector: "self", amount: -1 },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidInfluenceIntrigueAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Influence-for-Intrigue specs should require non-negative integer amounts",
  );
  const agentPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-strength-card",
    name: "Effect Spec Agent Pay Resource Strength",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: 1,
          strength: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceStrengthCard, p2, p2),
    /Unsupported effect "pay-resource-for-strength" for agent-play/,
    "Resource-for-strength specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidPayResourceStrengthSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-selector-card",
    name: "Effect Spec Invalid Pay Resource Strength Selector",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "activated-ally",
          resource: "spice",
          cost: 1,
          strength: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceStrengthSelectorCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Resource-for-strength specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceStrengthResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-resource-card",
    name: "Effect Spec Invalid Pay Resource Strength Resource",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "melange",
          cost: 1,
          strength: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceStrengthResourceCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect resource "melange"/,
    "Resource-for-strength specs should reject unsupported resource ids",
  );
  const invalidPayResourceStrengthCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-cost-card",
    name: "Effect Spec Invalid Pay Resource Strength Cost",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: -1,
          strength: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceStrengthCostCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Resource-for-strength specs should require non-negative costs",
  );
  const invalidPayResourceStrengthSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-source-card",
    name: "Effect Spec Invalid Pay Resource Strength Source",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: 1,
          strength: 2,
          source: "",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceStrengthSourceCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-strength source ""/,
    "Resource-for-strength specs should reject empty source labels",
  );
  const invalidPayResourceStrengthOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-strength-optional-card",
    name: "Effect Spec Invalid Pay Resource Strength Optional",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: 1,
          strength: 2,
          optional: "false",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceStrengthOptionalCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-strength optional "false"/,
    "Resource-for-strength specs should reject non-true optional values",
  );
  const requiredPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-strength-card",
    name: "Effect Spec Required Pay Resource Strength",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: 1,
          strength: 2,
          optional: false,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [requiredPayResourceStrengthCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-strength optional "false"/,
    "Resource-for-strength specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const selfPayResourceStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-self-pay-resource-strength-card",
    name: "Effect Spec Self Pay Resource Strength",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-strength",
          selector: "self",
          resource: "spice",
          cost: 1,
          strength: 2,
          source: "Self Pay Strength",
        },
      ]),
    ],
  };
  const selfPayOwner = {
    ...p2,
    resources: { ...p2.resources, spice: 1 },
    playArea: [selfPayResourceStrengthCard],
    conflict: 3,
    deployedSandworms: 0,
    deployedTroops: 1,
  };
  const selfPayState = {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) =>
      player.id === p2.id ? selfPayOwner : player,
    ),
  };
  const [selfPayPending] = state.pendingActionsForRevealPayResourceForStrength(
    selfPayResourceStrengthCard,
    selfPayOwner,
    selfPayState,
    p2.id,
  );
  assert.deepEqual(selfPayPending, {
    kind: "pay-resource-for-strength",
    ownerId: p2.id,
    combatRecipientId: p2.id,
    resource: "spice",
    cost: 1,
    strength: 2,
    optional: true,
    source: "Self Pay Strength",
    cardId: selfPayResourceStrengthCard.id,
  });
  const selfPayResolved = state.resolvePayResourceForStrengthChoice(
    { ...selfPayState, pendingAction: selfPayPending },
    selfPayPending,
  );
  assert.equal(
    playerById(selfPayResolved, p2.id).resources.spice,
    0,
    "Self resource-for-strength should spend the owner resource",
  );
  assert.equal(
    playerById(selfPayResolved, p2.id).conflict,
    5,
    "Self resource-for-strength should add strength to the same player",
  );
  const agentPayResourceHighCouncilCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-high-council-card",
    name: "Effect Spec Agent Pay Resource High Council",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 5,
          optional: true,
          source: "Agent High Council",
        },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceHighCouncilCard, p2, p2),
    /Unsupported effect "pay-resource-for-high-council-seat" for agent-play/,
    "High Council payment specs should stay in Reveal until other triggers support that timing",
  );
  const invalidPayResourceHighCouncilSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-selector-card",
    name: "Effect Spec Invalid Pay Resource High Council Selector",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "activated-ally",
          resource: "solari",
          cost: 5,
          optional: true,
          source: "High Council Selector",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilSelectorCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "High Council payment specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceHighCouncilResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-resource-card",
    name: "Effect Spec Invalid Pay Resource High Council Resource",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "melange",
          cost: 5,
          optional: true,
          source: "High Council Resource",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilResourceCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect resource "melange"/,
    "High Council payment specs should reject unsupported resource ids",
  );
  const invalidPayResourceHighCouncilCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-cost-card",
    name: "Effect Spec Invalid Pay Resource High Council Cost",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 0,
          optional: true,
          source: "High Council Cost",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilCostCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-high-council-seat cost "0"/,
    "High Council payment specs should require a positive resource cost",
  );
  const invalidPayResourceHighCouncilSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-source-card",
    name: "Effect Spec Invalid Pay Resource High Council Source",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 5,
          optional: true,
          source: "",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilSourceCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-high-council-seat source ""/,
    "High Council payment specs should reject empty source labels",
  );
  const invalidPayResourceHighCouncilOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-optional-card",
    name: "Effect Spec Invalid Pay Resource High Council Optional",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 5,
          optional: false,
          source: "High Council Optional",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilOptionalCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-high-council-seat optional "false"/,
    "High Council payment specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const invalidPayResourceHighCouncilPersuasionCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-persuasion-cost-card",
    name: "Effect Spec Invalid Pay Resource High Council Persuasion Cost",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 5,
          optional: true,
          persuasionCost: -1,
          source: "High Council Persuasion Cost",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilPersuasionCostCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "High Council payment specs should require non-negative persuasion replacement costs",
  );
  const invalidPayResourceHighCouncilPersuasionRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-high-council-persuasion-reward-card",
    name: "Effect Spec Invalid Pay Resource High Council Persuasion Reward",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-high-council-seat",
          selector: "self",
          resource: "solari",
          cost: 5,
          optional: true,
          persuasionReward: -1,
          source: "High Council Persuasion Reward",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceHighCouncilPersuasionRewardCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "High Council payment specs should require non-negative persuasion rewards",
  );
}
