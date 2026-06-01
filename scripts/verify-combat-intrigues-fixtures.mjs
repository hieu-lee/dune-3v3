import assert from "node:assert/strict";

export function playerById(game, playerId) {
  const player = game.players.find((candidate) => candidate.id === playerId);
  assert.ok(player, `Expected player ${playerId}`);
  return player;
}

export function conflictBySourceId(data, sourceId) {
  const conflict = data.conflictCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(conflict, `Expected Conflict source ${sourceId}`);
  return { ...conflict, rewards: [...conflict.rewards] };
}

export function intrigueBySourceId(data, sourceId) {
  const intrigue = data.intrigueCards.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(intrigue, `Expected Intrigue source ${sourceId}`);
  return { ...intrigue, traits: intrigue.traits ? [...intrigue.traits] : undefined };
}

export function completedContract(data, index) {
  return { card: data.standardContracts[index], completed: true, takenRound: 1 };
}

export function incompleteContract(data, index) {
  return { card: data.standardContracts[index], completed: false, takenRound: 1 };
}

export function starterCard(data, index) {
  const card = data.allyStarterCards[index];
  assert.ok(card, `Expected starter card ${index}`);
  return {
    ...card,
    icons: [...card.icons],
    revealGain: card.revealGain ? { ...card.revealGain } : undefined,
    traits: card.traits ? [...card.traits] : undefined,
  };
}

export function boardSpaceByName(data, name) {
  const space = data.boardSpaces.find((candidate) => candidate.name === name);
  assert.ok(space, `Expected board space ${name}`);
  return space;
}

export function combatFixture(state, data, setupPlayers, firstSeat = 1) {
  const game = state.initialGame();
  return {
    ...game,
    phase: "playing",
    firstSeat,
    activeSeat: firstSeat,
    conflict: conflictBySourceId(data, 453),
    conflictDeck: [conflictBySourceId(data, 452)],
    conflictDiscard: [],
    intrigueDiscard: [],
    pendingAction: undefined,
    pendingQueue: [],
    combatPasses: ["stale"],
    players: setupPlayers(game.players.map((player) => ({
      ...player,
      agentsReady: 0,
      revealed: true,
      persuasion: 0,
      conflict: 0,
      deployedTroops: 0,
      hand: [],
      playArea: [],
      discard: [],
      deck: [],
      intrigues: [],
      objectives: [],
      wonConflicts: [],
    }))),
  };
}

export function passCurrent(state, game) {
  return state.passCombatIntrigue(game, game.players[game.activeSeat].id);
}
