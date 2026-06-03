import assert from "node:assert/strict";

export function withActivePlayer(game, playerId, patch) {
  const activeSeat = game.players.findIndex((player) => player.id === playerId);
  assert.notEqual(activeSeat, -1, `Expected ${playerId}`);
  return {
    ...game,
    activeSeat,
    agentTurnComplete: false,
    pendingAction: undefined,
    pendingQueue: [],
    spaces: {},
    roundMakerSpaceVisits: {},
    turnSpiceGains: {},
    turnSpyRecalls: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    players: game.players.map((player) => player.id === playerId ? { ...player, ...patch(player) } : player),
  };
}
