import assert from "node:assert/strict";
import { agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecPaymentTroopsDrawValidation({
  cards,
  game,
  players,
  state,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p2, p4, p6 } = players;
  const agentPayResourceTroopsCard = {
    ...convincingArgument,
    id: "effect-spec-agent-pay-resource-troops-card",
    name: "Effect Spec Agent Pay Resource Troops",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentPayResourceTroopsCard, p2, p2),
    /Unsupported effect "pay-resource-for-troops" for agent-play/,
    "Resource-for-troops specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidPayResourceTroopsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-selector-card",
    name: "Effect Spec Invalid Pay Resource Troops Selector",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "activated-ally",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsSelectorCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Resource-for-troops specs should reject activated Ally reveal selectors",
  );
  const invalidPayResourceTroopsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-resource-card",
    name: "Effect Spec Invalid Pay Resource Troops Resource",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "melange",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsResourceCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect resource "melange"/,
    "Resource-for-troops specs should reject unsupported resource ids",
  );
  const invalidPayResourceTroopsRecipientCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-recipient-card",
    name: "Effect Spec Invalid Pay Resource Troops Recipient",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "self",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsRecipientCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops recipient "self"/,
    "Resource-for-troops specs should reject unsupported recipient routing",
  );
  const invalidPayResourceTroopsDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-destination-card",
    name: "Effect Spec Invalid Pay Resource Troops Destination",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "conflict",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsDestinationCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops destination "conflict"/,
    "Resource-for-troops specs should reject unsupported troop destinations",
  );
  const invalidPayResourceTroopsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-cost-card",
    name: "Effect Spec Invalid Pay Resource Troops Cost",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: -1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsCostCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Resource-for-troops specs should require non-negative costs",
  );
  const invalidPayResourceTroopsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-amount-card",
    name: "Effect Spec Invalid Pay Resource Troops Amount",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: -1,
          recipient: "same-team-allies",
          destination: "garrison",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Resource-for-troops specs should require non-negative troop amounts",
  );
  const invalidPayResourceTroopsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-source-card",
    name: "Effect Spec Invalid Pay Resource Troops Source",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
          source: "",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsSourceCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops source ""/,
    "Resource-for-troops specs should reject empty source labels",
  );
  const invalidPayResourceTroopsTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-trash-source-card",
    name: "Effect Spec Invalid Pay Resource Troops Trash Source",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
          trashSource: "false",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsTrashSourceCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops trashSource "false"/,
    "Resource-for-troops specs should reject non-boolean trashSource values",
  );
  const invalidPayResourceTroopsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-troops-optional-card",
    name: "Effect Spec Invalid Pay Resource Troops Optional",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
          optional: "false",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidPayResourceTroopsOptionalCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops optional "false"/,
    "Resource-for-troops specs should reject non-true optional values",
  );
  const requiredPayResourceTroopsCard = {
    ...convincingArgument,
    id: "effect-spec-required-pay-resource-troops-card",
    name: "Effect Spec Required Pay Resource Troops",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-troops",
          selector: "self",
          resource: "spice",
          cost: 1,
          troops: 2,
          recipient: "same-team-allies",
          destination: "garrison",
          optional: false,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [requiredPayResourceTroopsCard],
        highCouncilSeat: false,
      }),
    /Invalid pay-resource-for-troops optional "false"/,
    "Resource-for-troops specs should stay optional so queued payments cannot deadlock if resources change",
  );
  const stalePayResourceTroopsPending = {
    kind: "pay-resource-for-troops",
    ownerId: p4.id,
    recipientIds: [p2.id, p6.id],
    resource: "solari",
    cost: 1,
    troops: 1,
    destination: "garrison",
    optional: true,
    source: "Stale Pay Troops",
  };
  const stalePayResourceTroopsState = {
    ...game,
    pendingAction: stalePayResourceTroopsPending,
    pendingQueue: [],
    players: game.players.map((player) => {
      if (player.id === p4.id)
        return { ...player, resources: { ...player.resources, solari: 1 } };
      if (player.id === p2.id)
        return {
          ...player,
          deployedTroops: 0,
          garrison: 12,
          jessicaMemories: 0,
        };
      if (player.id === p6.id)
        return {
          ...player,
          deployedTroops: 0,
          garrison: 0,
          jessicaMemories: 0,
        };
      return player;
    }),
  };
  assert.equal(
    state.resolvePayResourceForTroopsChoice(
      stalePayResourceTroopsState,
      stalePayResourceTroopsPending,
    ),
    stalePayResourceTroopsState,
    "Resource-for-troops resolver should reject stale payments when any recipient lacks troop supply",
  );
  const revealPayResourceDrawCardsCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pay-resource-draw-cards-card",
    name: "Effect Spec Reveal Pay Resource Draw Cards",
    effects: [
      revealSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "water",
          cost: 2,
          drawCards: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [revealPayResourceDrawCardsCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect "pay-resource-for-draw-cards" for reveal/,
    "Resource-for-draw specs should stay in Agent play",
  );
  const invalidPayResourceDrawCardsSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-selector-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Selector",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "activated-ally",
          resource: "water",
          cost: 2,
          drawCards: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(
        invalidPayResourceDrawCardsSelectorCard,
        p2,
        p2,
      ),
    /Unsupported effect selector "activated-ally" for pay-resource-for-draw-cards/,
    "Resource-for-draw specs should reject activated Ally selectors",
  );
  const invalidPayResourceDrawCardsResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-resource-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Resource",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "melange",
          cost: 2,
          drawCards: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(
        invalidPayResourceDrawCardsResourceCard,
        p2,
        p2,
      ),
    /Unsupported effect resource "melange"/,
    "Resource-for-draw specs should reject unsupported resource ids",
  );
  const invalidPayResourceDrawCardsCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-cost-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Cost",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "water",
          cost: -1,
          drawCards: 2,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(invalidPayResourceDrawCardsCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-draw specs should require non-negative costs",
  );
  const invalidPayResourceDrawCardsAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-amount-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Amount",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "water",
          cost: 2,
          drawCards: -1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(invalidPayResourceDrawCardsAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Resource-for-draw specs should require non-negative draw amounts",
  );
  const invalidPayResourceDrawCardsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-source-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Source",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "water",
          cost: 2,
          drawCards: 2,
          source: "",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(invalidPayResourceDrawCardsSourceCard, p2, p2),
    /Invalid pay-resource-for-draw-cards source ""/,
    "Resource-for-draw specs should reject empty source labels",
  );
  const invalidPayResourceDrawCardsOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-pay-resource-draw-cards-optional-card",
    name: "Effect Spec Invalid Pay Resource Draw Cards Optional",
    effects: [
      agentSpec([
        {
          kind: "pay-resource-for-draw-cards",
          selector: "self",
          resource: "water",
          cost: 2,
          drawCards: 2,
          optional: "false",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      state.applyCardAgentEffect(
        invalidPayResourceDrawCardsOptionalCard,
        p2,
        p2,
      ),
    /Invalid pay-resource-for-draw-cards optional "false"/,
    "Resource-for-draw specs should reject non-true optional values",
  );
}
