import assert from "node:assert/strict";
import { createServer } from "vite";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

function resolveSetupPendingActions(state, game) {
  let current = game;
  while (current.pendingAction?.kind === "throne-row") {
    const card = current.imperiumRow.find(state.canMoveCardToThroneRow);
    assert.ok(card, "Expected an eligible Throne Row setup card");
    current = state.moveImperiumCardToThroneRow(current, current.pendingAction, card.id);
  }
  assert.equal(current.pendingAction, undefined, "Devastating Assault verifier setup should not leave pending actions");
  return current;
}

function withPlayers(game, replacements) {
  return {
    ...game,
    pendingAction: undefined,
    pendingQueue: [],
    players: game.players.map((player) => replacements[player.id] ?? player),
  };
}

try {
  const data = await server.ssrLoadModule("/src/game/data.ts");
  const state = await server.ssrLoadModule("/src/game/state.ts");
  const turnActions = await server.ssrLoadModule("/src/app-turn-actions.ts");

  const game = resolveSetupPendingActions(state, state.initialGame());
  const devastatingAssault = data.emperorCommanderCards.find((card) => card.name === "Devastating Assault");
  assert.ok(devastatingAssault, "Emperor Commander deck should include Devastating Assault");
  assert.equal(state.isDevastatingAssaultCommanderCard(devastatingAssault), true);
  assert.match(devastatingAssault.reveal, /spend 3 Solari/i);
  assert.ok(
    devastatingAssault.effects?.some((spec) =>
      spec.trigger === "reveal" &&
      spec.conditions?.some((condition) => condition.kind === "has-team" && condition.team === "shaddam") &&
      spec.conditions?.some((condition) => condition.kind === "has-role" && condition.role === "Commander") &&
      spec.conditions?.some((condition) => condition.kind === "has-swordmaster-bonus") &&
      spec.conditions?.some((condition) => condition.kind === "has-conflict-units" && condition.count === 1) &&
      spec.effects.some((effect) =>
        effect.kind === "pay-resource-for-strength" &&
        effect.resource === "solari" &&
        effect.cost === 3 &&
        effect.strength === 5 &&
        effect.source === "Devastating Assault"
      )
    ),
    "Devastating Assault should carry a declarative reveal payment spec",
  );

  const shaddam = playerById(game, "p4");
  const ally = playerById(game, "p2");
  const commander = {
    ...shaddam,
    resources: { solari: 3, spice: 0, water: 0 },
    swordmasterBonus: true,
    playArea: [devastatingAssault],
  };
  const recipient = {
    ...ally,
    conflict: 4,
    deployedSandworms: 0,
    deployedTroops: 1,
  };
  const pendingFixture = withPlayers(game, { [commander.id]: commander, [recipient.id]: recipient });
  const [pending] = state.pendingActionsForRevealPayResourceForStrength(
    devastatingAssault,
    commander,
    pendingFixture,
    recipient.id,
  );
  assert.deepEqual(pending, {
    kind: "pay-resource-for-strength",
    ownerId: commander.id,
    combatRecipientId: recipient.id,
    resource: "solari",
    cost: 3,
    strength: 5,
    optional: true,
    cardId: devastatingAssault.id,
    source: "Devastating Assault",
  });
  assert.equal(
    state.pendingActionsForRevealPayResourceForStrength(devastatingAssault, { ...commander, swordmasterBonus: false }, pendingFixture, recipient.id).length,
    0,
    "Devastating Assault should require the Swordmaster bonus token",
  );
  assert.equal(
    state.pendingActionsForRevealPayResourceForStrength(
      devastatingAssault,
      { ...commander, resources: { solari: 2, spice: 0, water: 0 } },
      pendingFixture,
      recipient.id,
    ).length,
    0,
    "Devastating Assault should require 3 Solari",
  );
  assert.equal(
    state.pendingActionsForRevealPayResourceForStrength(devastatingAssault, { ...commander, playArea: [] }, pendingFixture, recipient.id).length,
    0,
    "Devastating Assault should require the revealed card in play",
  );
  assert.equal(
    state.pendingActionsForRevealPayResourceForStrength(
      devastatingAssault,
      commander,
      withPlayers(game, { [commander.id]: commander, [recipient.id]: { ...recipient, deployedTroops: 0 } }),
      recipient.id,
    ).length,
    0,
    "Devastating Assault should not queue when the activated Ally has no conflict units",
  );
  assert.equal(
    state.pendingActionsForRevealPayResourceForStrength(devastatingAssault, recipient, pendingFixture, recipient.id).length,
    0,
    "Devastating Assault should not trigger from an Ally owner",
  );

  const revealFixture = {
    ...withPlayers(game, {
      [shaddam.id]: {
        ...shaddam,
        agentsReady: 0,
        hand: [devastatingAssault],
        playArea: [],
        persuasion: 0,
        resources: { solari: 3, spice: 0, water: 0 },
        revealed: false,
        swordmasterBonus: true,
      },
      [ally.id]: recipient,
    }),
    activeSeat: game.players.findIndex((player) => player.id === shaddam.id),
    agentTurnComplete: false,
  };
  const plan = turnActions.revealTurnPlan(playerById(revealFixture, shaddam.id), revealFixture);
  assert.equal(plan.persuasion, 1, "Devastating Assault should reveal for 1 persuasion");
  assert.equal(plan.swords, 2, "Swordmaster bonus should still add its printed 2 strength");
  const revealed = turnActions.revealTurnAction(revealFixture, {
    commanderTargets: { [shaddam.id]: ally.id },
    revealPlan: plan,
  });
  assert.equal(playerById(revealed, ally.id).conflict, 6, "Reveal should route Swordmaster strength to the activated Ally");
  assert.equal(revealed.pendingAction?.kind, "pay-resource-for-strength");
  const resolved = state.resolvePayResourceForStrengthChoice(revealed, revealed.pendingAction);
  assert.equal(playerById(resolved, shaddam.id).resources.solari, 0, "Devastating Assault should spend 3 Solari");
  assert.equal(playerById(resolved, ally.id).conflict, 11, "Devastating Assault should add 5 strength to the activated Ally");
  assert.ok(
    playerById(resolved, shaddam.id).playArea.some((card) => card.id === devastatingAssault.id),
    "Devastating Assault payment should not trash the card",
  );
  assert.equal(resolved.pendingAction, undefined);

  const skipped = state.skipPayResourceForStrength(revealed, revealed.pendingAction);
  assert.equal(playerById(skipped, shaddam.id).resources.solari, 3, "Skipping Devastating Assault should not spend Solari");
  assert.equal(playerById(skipped, ally.id).conflict, 6, "Skipping Devastating Assault should keep only Swordmaster strength");
  assert.equal(skipped.pendingAction, undefined);
  const requiredStrengthPending = {
    ...revealed.pendingAction,
    optional: false,
  };
  const requiredStrengthState = { ...revealed, pendingAction: requiredStrengthPending };
  assert.equal(
    state.resolvePayResourceForStrengthChoice(requiredStrengthState, requiredStrengthPending),
    requiredStrengthState,
    "Devastating Assault should reject malformed required resource-for-strength pending actions",
  );
  assert.equal(
    state.skipPayResourceForStrength(requiredStrengthState, requiredStrengthPending),
    requiredStrengthState,
    "Devastating Assault skip should reject malformed required resource-for-strength pending actions",
  );

  const noUnitsReveal = turnActions.revealTurnAction(
    {
      ...revealFixture,
      players: revealFixture.players.map((player) =>
        player.id === ally.id
          ? { ...player, conflict: 0, deployedSandworms: 0, deployedTroops: 0 }
          : player,
      ),
    },
    { commanderTargets: { [shaddam.id]: ally.id }, revealPlan: plan },
  );
  assert.equal(playerById(noUnitsReveal, ally.id).conflict, 0, "Reveal swords should not apply without conflict units");
  assert.equal(noUnitsReveal.pendingAction, undefined, "Devastating Assault should not queue without conflict units");

  const mixedPending = state.pendingActionsForReveal(
    { ...commander, playArea: [devastatingAssault] },
    pendingFixture,
    [devastatingAssault],
    recipient.id,
  );
  assert.equal(mixedPending[0].kind, "pay-resource-for-strength");

  console.log("Devastating Assault starter deck verification passed");
} finally {
  await server.close();
}
