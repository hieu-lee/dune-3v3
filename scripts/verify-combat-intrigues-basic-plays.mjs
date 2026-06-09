import assert from "node:assert/strict";
import { combatFixture, intrigueBySourceId, playerById } from "./verify-combat-intrigues-fixtures.mjs";

export function verifyCombatIntrigueBasicPlays({
  cards: { contingencyPlan, impress, verifierCombat },
  data,
  marketCards: { lowCostImperiumCard, replacementImperiumCard },
  state,
}) {
  const plotIntrigue = intrigueBySourceId(data, 143);
  const allyPlayFixture = combatFixture(state, data, (players) =>
    players.map((player) => {
      if (player.id === "p2") return { ...player, conflict: 2, deployedTroops: 1, intrigues: [verifierCombat] };
      if (player.id === "p3") return { ...player, conflict: 3, deployedTroops: 1, intrigues: [plotIntrigue] };
      return player;
    }),
  );
  const allyCombat = state.startCombatPhase(allyPlayFixture);
  const allyExplicitTargetPlayed = state.playCombatIntrigue(allyCombat, "p2", verifierCombat.id, "p2");
  assert.equal(playerById(allyExplicitTargetPlayed, "p2").conflict, 4, "Ally Combat Intrigues should allow explicit self-targeting");
  const allyPlayed = state.playCombatIntrigue(allyCombat, "p2", verifierCombat.id);
  assert.equal(playerById(allyPlayed, "p2").conflict, 4, "Ally Combat Intrigues should add strength to that Ally");
  assert.deepEqual(playerById(allyPlayed, "p2").intrigues, [], "Played Combat Intrigue should leave the player's hand");
  assert.equal(allyPlayed.intrigueDiscard.at(-1).id, verifierCombat.id, "Played Combat Intrigue should be discarded");
  assert.deepEqual(allyPlayed.combatPasses, [], "A Combat Intrigue play should restart the pass chain");
  assert.equal(allyPlayed.players[allyPlayed.activeSeat].id, "p3", "Play should advance to the next Combat actor");

  const impressFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [impress] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
        : player,
    ),
  );
  const impressCombat = state.startCombatPhase({
    ...impressFixture,
    imperiumRow: [lowCostImperiumCard],
    marketDeck: [replacementImperiumCard],
  });
  const impressPlayed = state.playCombatIntrigue(impressCombat, "p2", impress.id);
  assert.equal(playerById(impressPlayed, "p2").conflict, 4, "Impress should add 2 strength to the recipient");
  assert.deepEqual(playerById(impressPlayed, "p2").intrigues, []);
  assert.equal(impressPlayed.intrigueDiscard.at(-1).id, impress.id);
  assert.deepEqual(
    impressPlayed.pendingAction,
    { kind: "acquire-card", ownerId: "p2", source: "Impress", maxCost: 3, destination: "discard" },
    "Impress should require the actor to acquire a card that costs 3 or less",
  );
  assert.equal(
    state.finishPendingAction(impressPlayed),
    impressPlayed,
    "Impress acquisition should not be skippable while eligible cards are available",
  );
  const impressAcquireChoice = state
    .acquirableCardsForPending(impressPlayed, impressPlayed.pendingAction)
    .find((card) => card.id === lowCostImperiumCard.id);
  assert.ok(impressAcquireChoice, "Impress should offer eligible Imperium Row cards");
  const impressAcquired = state.acquireCardForPending(impressPlayed, impressPlayed.pendingAction, impressAcquireChoice.id);
  assert.equal(playerById(impressAcquired, "p2").discard.length, 1, "Impress should put the acquired card in discard");
  assert.equal(playerById(impressAcquired, "p2").discard[0].id, impressAcquireChoice.id);
  assert.deepEqual(impressAcquired.imperiumRow.map((card) => card.id), [replacementImperiumCard.id]);
  assert.equal(playerById(impressAcquired, "p2").persuasion, 0, "Impress should not spend persuasion");
  assert.equal(impressAcquired.pendingAction, undefined);
  assert.equal(impressAcquired.players[impressAcquired.activeSeat].id, "p3", "Impress pending resolution should not advance Combat again");

  const commanderImpressFixture = combatFixture(
    state,
    data,
    (players) =>
      players.map((player) =>
        player.id === "p4"
          ? { ...player, intrigues: [impress] }
          : player.id === "p6"
            ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [plotIntrigue] }
            : player,
      ),
    3,
  );
  const commanderImpressCombat = state.startCombatPhase({
    ...commanderImpressFixture,
    imperiumRow: [lowCostImperiumCard],
    marketDeck: [replacementImperiumCard],
  });
  const commanderImpressPlayed = state.playCombatIntrigue(commanderImpressCombat, "p4", impress.id, "p6");
  assert.equal(playerById(commanderImpressPlayed, "p6").conflict, 4, "Commander Impress should add strength to the chosen Ally");
  assert.deepEqual(
    commanderImpressPlayed.pendingAction,
    { kind: "acquire-card", ownerId: "p6", source: "Impress", maxCost: 3, destination: "discard" },
    "Commander Impress should make the chosen Ally acquire the card",
  );
  const commanderImpressChoice = state.acquirableCardsForPending(
    commanderImpressPlayed,
    commanderImpressPlayed.pendingAction,
  )[0];
  assert.ok(commanderImpressChoice, "Commander Impress should offer an acquisition to the chosen Ally");
  const commanderImpressAcquired = state.acquireCardForPending(
    commanderImpressPlayed,
    commanderImpressPlayed.pendingAction,
    commanderImpressChoice.id,
  );
  assert.equal(playerById(commanderImpressAcquired, "p6").discard.length, 1);
  assert.equal(playerById(commanderImpressAcquired, "p4").discard.length, 0, "Commander should not receive the Impress acquisition");

  const contingencyFixture = combatFixture(state, data, (players) =>
    players.map((player) =>
      player.id === "p2"
        ? { ...player, conflict: 2, deployedTroops: 1, intrigues: [contingencyPlan] }
        : player.id === "p3"
          ? { ...player, conflict: 4, deployedTroops: 1, intrigues: [plotIntrigue] }
          : player,
    ),
  );
  const contingencyCombat = state.startCombatPhase(contingencyFixture);
  const contingencyPlayed = state.playCombatIntrigue(contingencyCombat, "p2", contingencyPlan.id);
  assert.equal(playerById(contingencyPlayed, "p2").conflict, 5, "Contingency Plan Combat should add 3 strength");
  assert.deepEqual(playerById(contingencyPlayed, "p2").intrigues, []);
  assert.equal(contingencyPlayed.intrigueDiscard.at(-1).id, contingencyPlan.id);
  assert.match(contingencyPlayed.log[0], /plays Contingency Plan for Feyd-Rautha Harkonnen, adding 3 strength/);
}
