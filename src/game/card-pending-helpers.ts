import {
  canSummonSandworms,
} from "./conflict-rules";
import type {
  BoardSpace,
  GameState,
  Player,
} from "./types";

export function sameTeamAllies(players: Player[], source: Player): [Player, Player] | undefined {
  const allies = players.filter((player) => player.team === source.team && player.role === "Ally");
  if (allies.length < 2) return undefined;
  return [allies[0], allies[1]];
}

export function playersWithPendingCardEffect(state: GameState, source: Player, target?: Player) {
  return state.players.map((player) => {
    if (player.id === source.id) return source;
    if (target && player.id === target.id) return target;
    return player;
  });
}

export function potentialDeferredMakerChoiceSpice(
  state: GameState,
  source: Player,
  target: Player | undefined,
  space: BoardSpace,
) {
  const spice = space.gain?.spice ?? 0;
  const owner = source.role === "Commander" ? target : source;
  if (!space.makerWorms || spice <= 0 || !owner || !canSummonSandworms(state, owner, space.makerWorms)) {
    return 0;
  }
  return spice;
}

export function canPayResourceCost(
  resources: Player["resources"],
  cost: Partial<Record<keyof Player["resources"], number>>,
  deferredResources: Partial<Record<keyof Player["resources"], number>> = {},
) {
  return Object.entries(cost).every(([resource, amount]) =>
    resources[resource as keyof Player["resources"]] + (deferredResources[resource as keyof Player["resources"]] ?? 0) >=
      (amount ?? 0)
  );
}

export function potentialDeferredResourcesForCost(
  state: GameState | undefined,
  source: Player,
  target: Player | undefined,
  space: BoardSpace | undefined,
  cost: Partial<Record<keyof Player["resources"], number>>,
) {
  const deferredResources: Partial<Record<keyof Player["resources"], number>> = {};
  if (!state || !space) return deferredResources;
  if ((cost.spice ?? 0) > 0) {
    deferredResources.spice = potentialDeferredMakerChoiceSpice(state, source, target, space);
  }
  return deferredResources;
}
