import assert from "node:assert/strict";
import { withActivePlayer } from "./verify-imperium-cards-fixtures.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";
export function verifyImperiumCardCalculusRevealEffects({
  cards,
  fixtures,
  game,
  playerIds,
  state,
  turnActions,
}) {
  const { calculus } = cards;
  const { calculusBlockedTarget, calculusTrashTarget } = fixtures;
  const { allyId, commanderId } = playerIds;
  const p2 = playerById(game, allyId);
  const p4 = playerById(game, commanderId);
  const calculusFixture = withActivePlayer(game, p2.id, () => ({
    agentsReady: 0,
    conflict: 4,
    deployedSandworms: 0,
    deployedTroops: 1,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget, calculusBlockedTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const calculusPlan = turnActions.revealTurnPlan(
    playerById(calculusFixture, p2.id),
    calculusFixture,
  );
  assert.equal(
    calculusPlan.persuasion,
    2,
    "Calculus of Power should keep its printed 2 persuasion",
  );
  assert.equal(
    calculusPlan.swords,
    0,
    "Calculus of Power optional swords should not be added before trashing",
  );
  const calculusRevealed = turnActions.revealTurnAction(calculusFixture, {
    commanderTargets: {},
    revealPlan: calculusPlan,
  });
  assert.equal(
    calculusRevealed.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should queue optional trash",
  );
  const calculusPending = calculusRevealed.pendingAction;
  assert.equal(calculusPending.source, "Calculus of Power");
  assert.equal(calculusPending.optional, true);
  assert.deepEqual(calculusPending.zones, ["playArea"]);
  assert.equal(calculusPending.excludeCardId, calculus.id);
  assert.equal(calculusPending.requiredTrait, "Faction: Emperor");
  assert.equal(calculusPending.combatRecipientId, p2.id);
  assert.equal(calculusPending.strengthReward, 3);
  assert.deepEqual(
    state
      .trashableCardsForPending(
        playerById(calculusRevealed, p2.id),
        calculusPending,
      )
      .map(({ card }) => card.id),
    [calculusTrashTarget.id],
    "Calculus of Power should only allow another Emperor card in play",
  );
  const blockedCalculusTrash = state.trashPlayerCard(
    calculusRevealed,
    calculusPending,
    "playArea",
    calculusBlockedTarget.id,
  );
  assert.equal(
    blockedCalculusTrash.pendingAction?.kind,
    "trash-card",
    "Calculus of Power should reject non-Emperor trash choices",
  );
  assert.equal(playerById(blockedCalculusTrash, p2.id).conflict, 4);
  const afterCalculusTrash = state.trashPlayerCard(
    calculusRevealed,
    calculusPending,
    "playArea",
    calculusTrashTarget.id,
  );
  assert.equal(
    playerById(afterCalculusTrash, p2.id).conflict,
    7,
    "Calculus of Power trash should add 3 strength",
  );
  assert.equal(afterCalculusTrash.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusTrash, p2.id).playArea.some(
      (card) => card.id === calculus.id,
    ),
    "Calculus of Power should not trash itself",
  );
  assert.equal(
    playerById(afterCalculusTrash, p2.id).playArea.some(
      (card) => card.id === calculusTrashTarget.id,
    ),
    false,
    "Calculus of Power should trash the selected Emperor card",
  );
  const afterCalculusSkip = state.skipTrashCard(
    calculusRevealed,
    calculusPending,
  );
  assert.equal(
    playerById(afterCalculusSkip, p2.id).conflict,
    4,
    "Skipping Calculus of Power should not add strength",
  );
  assert.equal(afterCalculusSkip.pendingAction, undefined);
  assert.ok(
    playerById(afterCalculusSkip, p2.id).playArea.some(
      (card) => card.id === calculusTrashTarget.id,
    ),
    "Skipping Calculus of Power should leave eligible cards in play",
  );
  const baseCommanderCalculusFixture = withActivePlayer(game, p4.id, () => ({
    agentsReady: 0,
    conflict: 0,
    discard: [],
    hand: [calculus],
    playArea: [calculusTrashTarget],
    persuasion: 0,
    resources: { solari: 0, spice: 0, water: 0 },
  }));
  const commanderCalculusFixture = {
    ...baseCommanderCalculusFixture,
    players: baseCommanderCalculusFixture.players.map((player) =>
      player.id === p2.id
        ? { ...player, conflict: 5, deployedSandworms: 0, deployedTroops: 1 }
        : player,
    ),
  };
  const commanderCalculusPlan = turnActions.revealTurnPlan(
    playerById(commanderCalculusFixture, p4.id),
    commanderCalculusFixture,
  );
  const commanderCalculusRevealed = turnActions.revealTurnAction(
    commanderCalculusFixture,
    {
      commanderTargets: { [p4.id]: p2.id },
      revealPlan: commanderCalculusPlan,
    },
  );
  assert.equal(
    commanderCalculusRevealed.pendingAction?.kind,
    "trash-card",
    "Commander Calculus of Power should queue trash from the Commander's play area",
  );
  assert.equal(commanderCalculusRevealed.pendingAction.ownerId, p4.id);
  assert.equal(
    commanderCalculusRevealed.pendingAction.combatRecipientId,
    p2.id,
  );
  const afterCommanderCalculusTrash = state.trashPlayerCard(
    commanderCalculusRevealed,
    commanderCalculusRevealed.pendingAction,
    "playArea",
    calculusTrashTarget.id,
  );
  assert.equal(
    playerById(afterCommanderCalculusTrash, p4.id).conflict,
    0,
    "Commander should not receive Calculus strength",
  );
  assert.equal(
    playerById(afterCommanderCalculusTrash, p2.id).conflict,
    8,
    "Activated Ally should receive Calculus strength",
  );
}
