import assert from "node:assert/strict";
import { agentSpec, combatSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecRetreatValidation({
  cards,
  effectResolver,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { convincingArgument } = cards;
  const { p2, p4 } = players;
  const conditionalRevealRetreatCard = {
    ...convincingArgument,
    id: "effect-spec-conditional-reveal-retreat-card",
    name: "Effect Spec Conditional Reveal Retreat",
    conditionalPersuasion: false,
    effects: [revealSpec(
      [{ kind: "retreat-troops-for-strength", selector: "self", amount: 1, strength: 3 }],
      [{ kind: "has-conflict-units", count: 2 }],
    )],
  };
  const commanderRetreatFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    conflict: 0,
    deployedTroops: 0,
    hand: [conditionalRevealRetreatCard],
    playArea: [],
  }));
  const commanderRetreatState = {
    ...commanderRetreatFixture,
    players: commanderRetreatFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 4, deployedTroops: 2, garrison: 0 }
        : player,
    ),
  };
  const commanderRetreatPlan = turnActions.revealTurnPlan(playerById(commanderRetreatState, p4.id), commanderRetreatState);
  const commanderRetreatRevealed = turnActions.revealTurnAction(commanderRetreatState, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderRetreatPlan,
  });
  assert.equal(
    commanderRetreatRevealed.pendingAction?.kind,
    "retreat-troops-for-strength",
    "Conditional Reveal retreat should evaluate conflict-unit conditions against the activated Ally",
  );
  const commanderRetreatUnqualifiedState = {
    ...commanderRetreatFixture,
    players: commanderRetreatFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 2, deployedTroops: 1, garrison: 0 }
        : player,
    ),
  };
  const commanderRetreatUnqualifiedPlan = turnActions.revealTurnPlan(
    playerById(commanderRetreatUnqualifiedState, p4.id),
    commanderRetreatUnqualifiedState,
  );
  const commanderRetreatUnqualified = turnActions.revealTurnAction(commanderRetreatUnqualifiedState, {
    commanderTargets: { [p4.id]: p2.id },
    revealPlan: commanderRetreatUnqualifiedPlan,
  });
  assert.equal(
    commanderRetreatUnqualified.pendingAction,
    undefined,
    "Conditional Reveal retreat should not use the Commander as the conflict-unit condition owner",
  );
  const invalidConflictUnitsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-conflict-units-count-card",
    name: "Effect Spec Invalid Conflict Units Count",
    effects: [agentSpec(
      [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
      [{ kind: "has-conflict-units", count: -1 }],
    )],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidConflictUnitsCountCard, p2, p2),
    /Invalid has-conflict-units count "-1"/,
    "Conflict-unit conditions should require a non-negative integer threshold",
  );
  const choiceDeferredIntrigueDrawSpecs = [agentSpec(
    [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
    [{ kind: "has-conflict-units", count: 2 }],
  )].map((spec) => ({ ...spec, choiceId: "deploy-draw" }));
  assert.throws(
    () => effectResolver.resolveDeferredAgentConflictUnitIntrigueDraws(choiceDeferredIntrigueDrawSpecs, {
      trigger: "agent-play",
      source: p2,
    }),
    /Unsupported choiceId for agent-play/,
    "Choice ids should stay on Plot Intrigue specs until Agent selected-choice plumbing exists",
  );
  const revealIntrigueDrawCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-intrigue-draw-card",
    name: "Effect Spec Reveal Intrigue Draw",
    effects: [revealSpec([{ kind: "draw-intrigues", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealIntrigueDrawCard], highCouncilSeat: false }),
    /Unsupported effect "draw-intrigues" for reveal/,
    "Intrigue draw specs should stay out of Reveal until a reveal-time state resolver supports them",
  );
  const agentRetreatStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-agent-retreat-strength-card",
    name: "Effect Spec Agent Retreat Strength",
    effects: [{
      trigger: "agent-play",
      effects: [{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: 4 }],
    }],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentRetreatStrengthCard, p2, p2),
    /Unsupported effect "retreat-troops-for-strength" for agent-play/,
    "Retreat-for-strength specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidRetreatStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-retreat-strength-card",
    name: "Effect Spec Invalid Retreat Strength",
    effects: [revealSpec([{ kind: "retreat-troops-for-strength", selector: "self", amount: 2, strength: -4 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidRetreatStrengthCard], highCouncilSeat: false }),
    /Invalid effect amount "-4"/,
    "Retreat-for-strength specs should require non-negative strength",
  );
  const deployOrRetreatCard = {
    ...convincingArgument,
    id: "effect-spec-deploy-or-retreat-card",
    name: "Effect Spec Deploy Or Retreat",
    effects: [revealSpec([{
      kind: "deploy-or-retreat-troops",
      selector: "self",
      amount: 1,
      optional: true,
      source: "Deploy Or Retreat Test",
    }])],
  };
  assert.deepEqual(
    effectResolver.resolveRevealDeployOrRetreatTroops(deployOrRetreatCard.effects, {
      trigger: "reveal",
      source: p2,
      state: game,
    }),
    [{ selector: "self", troopCount: 1, optional: true, source: "Deploy Or Retreat Test" }],
    "Deploy-or-retreat specs should resolve as reveal pending effects",
  );
  assert.deepEqual(
    effectResolver.resolveRevealRetreatTroops(
      [revealSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: 1, optional: true, source: "Retreat Test" }])],
      { trigger: "reveal", source: { ...p2, deployedTroops: 1 }, state: game },
    ),
    [{ selector: "self", count: 1, optional: true, source: "Retreat Test" }],
    "Exact retreat specs should resolve as reveal pending effects",
  );
  assert.throws(
    () => effectResolver.resolveRevealRetreatTroops(
      [revealSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: 2, optional: true, source: "Retreat Test" }])],
      { trigger: "reveal", source: { ...p2, deployedTroops: 2 }, state: game },
    ),
    /Unsupported Reveal retreat-troops range/,
    "Reveal retreat specs should require exact troop counts until a count-choice UI exists",
  );
  const agentDeployOrRetreatCard = {
    ...convincingArgument,
    id: "effect-spec-agent-deploy-or-retreat-card",
    name: "Effect Spec Agent Deploy Or Retreat",
    effects: [agentSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(agentDeployOrRetreatCard, p2, p2),
    /Unsupported effect "deploy-or-retreat-troops" for agent-play/,
    "Deploy-or-retreat specs should stay in Reveal until other trigger resolvers support them",
  );
  const invalidDeployOrRetreatSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-selector-card",
    name: "Effect Spec Invalid Deploy Or Retreat Selector",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "activated-ally", amount: 1 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatSelectorCard], highCouncilSeat: false }),
    /Unsupported effect selector "activated-ally" for reveal/,
    "Deploy-or-retreat specs should reject activated Ally selectors",
  );
  const invalidDeployOrRetreatAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-amount-card",
    name: "Effect Spec Invalid Deploy Or Retreat Amount",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 0 }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatAmountCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops amount "0"/,
    "Deploy-or-retreat specs should require a positive troop count",
  );
  const invalidDeployOrRetreatOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-optional-card",
    name: "Effect Spec Invalid Deploy Or Retreat Optional",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1, optional: "true" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatOptionalCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops optional "true"/,
    "Deploy-or-retreat specs should reject non-boolean optional values",
  );
  const invalidDeployOrRetreatSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deploy-or-retreat-source-card",
    name: "Effect Spec Invalid Deploy Or Retreat Source",
    effects: [revealSpec([{ kind: "deploy-or-retreat-troops", selector: "self", amount: 1, source: "" }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [invalidDeployOrRetreatSourceCard], highCouncilSeat: false }),
    /Invalid deploy-or-retreat-troops source ""/,
    "Deploy-or-retreat specs should reject empty source labels",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [agentSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: 2 }])],
      { trigger: "agent-play", source: p2, state: game },
    ),
    /Unsupported effect "retreat-troops" for agent-play/,
    "Selected retreat specs should stay on Combat Intrigues",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "activated-ally", min: 1, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Unsupported effect selector "activated-ally" for combat-intrigue/,
    "Combat selected retreat specs should reject activated Ally selectors",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 0, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops min "0"/,
    "Combat selected retreat specs should require positive minimum troop counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 2, max: 1 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops bounds "2-1"/,
    "Combat selected retreat specs should reject inverted troop-count bounds",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: { kind: "deployed-troops" }, max: 2 }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Invalid retreat-troops min/,
    "Combat selected retreat specs should reject dynamic minimum troop counts",
  );
  assert.throws(
    () => effectResolver.resolveCombatRetreatTroops(
      [combatSpec([{ kind: "retreat-troops", selector: "self", min: 1, max: { kind: "garrison" } }])],
      { trigger: "combat-intrigue", source: p2, state: game },
    ),
    /Unsupported retreat-troops max "garrison"/,
    "Combat selected retreat specs should reject unsupported dynamic maximum troop bounds",
  );
}
