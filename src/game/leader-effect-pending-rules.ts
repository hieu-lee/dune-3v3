import {
  resolveLeaderTransitionChoices,
} from "./effect-resolver";
import {
  leaderPlacementEffectSpecs,
} from "./leader-effect-data";
import type {
  BoardSpace,
  GameState,
  PendingAction,
  Player,
} from "./types";

export function pendingActionsForLeaderPlacementEffects(
  state: GameState,
  source: Player,
  space: BoardSpace,
): PendingAction[] {
  return resolveLeaderTransitionChoices(leaderPlacementEffectSpecs, {
    trigger: "agent-placement",
    source,
    state,
    space,
  }).flatMap((effect): PendingAction[] => {
    if (
      effect.selector !== "self" ||
      effect.fromLeader !== source.leader ||
      effect.counterAmount !== "all" ||
      effect.drawCardsPerCounter <= 0
    ) {
      return [];
    }
    if (effect.counter === "jessicaMemories" && source.jessicaMemories <= 0) return [];
    const followUp = effect.followUp
      ? {
          kind: "repeat-board-space" as const,
          spaceId: space.id,
          ability: effect.followUp.ability,
          source: effect.followUp.source,
          resource: effect.followUp.resource,
          cost: effect.followUp.cost,
        }
      : undefined;
    if (followUp && followUp.cost <= 0) return [];
    return [{
      kind: "leader-transition",
      ownerId: source.id,
      source: effect.source ?? "Leader",
      fromLeader: effect.fromLeader,
      toLeader: effect.toLeader,
      counter: effect.counter,
      counterAmount: effect.counterAmount,
      drawCardsPerCounter: effect.drawCardsPerCounter,
      ...(followUp ? { followUp } : {}),
    }];
  });
}
