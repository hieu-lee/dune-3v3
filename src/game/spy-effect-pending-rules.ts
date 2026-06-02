import type { SpyPlacementEffectResult } from "./effect-resolver";
import {
  placeableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import type {
  GameState,
  PendingAction,
  Player,
} from "./types";

function sameSpyPlacementDetails(first: SpyPlacementEffectResult, second: SpyPlacementEffectResult) {
  return first.recallForSupply === second.recallForSupply &&
    first.mustPlace === second.mustPlace &&
    first.placementIcon === second.placementIcon &&
    first.allowSharedPost === second.allowSharedPost &&
    first.source === second.source &&
    first.postPlacementAction === second.postPlacementAction;
}

export function mergedSpyPlacement(sourceName: string, placements: SpyPlacementEffectResult[]) {
  if (placements.length === 0) return undefined;
  const [first, ...rest] = placements;
  if (rest.some((placement) => !sameSpyPlacementDetails(first, placement))) {
    throw new Error(`Unsupported mixed spy placement specs for ${sourceName}`);
  }
  return {
    ...first,
    count: placements.reduce((sum, placement) => sum + placement.count, 0),
  };
}

export function spyPendingForPlacement(
  sourceName: string,
  owner: Player,
  placement: SpyPlacementEffectResult,
  state?: GameState,
): PendingAction | undefined {
  if (placement.count <= 0) return undefined;
  const pending: Extract<PendingAction, { kind: "spy" }> = {
    kind: "spy",
    ownerId: owner.id,
    remaining: placement.count,
    ...(placement.recallForSupply ? { recallForSupply: true } : {}),
    ...(placement.mustPlace ? { mustPlaceSpy: true } : {}),
    ...(placement.placementIcon ? { placementIcon: placement.placementIcon } : {}),
    ...(placement.allowSharedPost ? { allowSharedPost: true } : {}),
    ...(placement.postPlacementAction ? { postPlacementAction: placement.postPlacementAction } : {}),
    source: placement.source ?? sourceName,
  };
  const canPlace = state
    ? placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0
    : owner.spies > 0;
  return canPlace ? pending : undefined;
}

export function pendingActionForSpyPlacements(
  sourceName: string,
  owner: Player,
  placements: SpyPlacementEffectResult[],
  state?: GameState,
): PendingAction | undefined {
  const placement = mergedSpyPlacement(sourceName, placements);
  return placement ? spyPendingForPlacement(sourceName, owner, placement, state) : undefined;
}
