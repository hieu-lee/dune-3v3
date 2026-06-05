import type { GameState, PendingAction } from "./types";

type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;

function isSpyPending(action: PendingAction | undefined): action is SpyPendingAction {
  return action?.kind === "spy";
}

function matchingSpyPendingDetails(first: SpyPendingAction, second: SpyPendingAction) {
  return (
    first.ownerId === second.ownerId &&
    first.placementIcon === second.placementIcon &&
    JSON.stringify(first.placementIcons ?? []) === JSON.stringify(second.placementIcons ?? []) &&
    first.recallForSupply === second.recallForSupply &&
    first.mustPlaceSpy === second.mustPlaceSpy &&
    first.allowSharedPost === second.allowSharedPost &&
    first.postPlacementAction === second.postPlacementAction
  );
}

function mergedSpyRemaining(first: SpyPendingAction, second: SpyPendingAction, spySupply: number) {
  const combined = first.remaining + second.remaining;
  return first.recallForSupply ? combined : Math.min(spySupply, combined);
}

export function pendingActionsFor(
  spacePending: PendingAction | undefined,
  cardPending: PendingAction | undefined,
  spySupply: number,
): PendingAction[] {
  if (isSpyPending(spacePending) && isSpyPending(cardPending) && matchingSpyPendingDetails(spacePending, cardPending)) {
    return [{
      ...spacePending,
      remaining: mergedSpyRemaining(spacePending, cardPending, spySupply),
      source: `${spacePending.source} / ${cardPending.source}`,
    }];
  }
  return [spacePending, cardPending].filter((action): action is PendingAction => Boolean(action));
}

export function queuePendingActions(state: GameState, actions: PendingAction[]) {
  if (actions.length === 0) {
    return { pendingAction: state.pendingAction, pendingQueue: state.pendingQueue };
  }
  if (state.pendingAction) {
    return { pendingAction: state.pendingAction, pendingQueue: [...state.pendingQueue, ...actions] };
  }
  return { pendingAction: actions[0], pendingQueue: [...state.pendingQueue, ...actions.slice(1)] };
}

export function advancePendingAction(state: GameState) {
  const [pendingAction, ...pendingQueue] = state.pendingQueue;
  return {
    pendingAction,
    pendingQueue,
    ...(!pendingAction ? { conflictDeploymentBlock: undefined } : {}),
  };
}

export function prependPendingAction(state: GameState, action: PendingAction | undefined) {
  if (!action) return state;
  if (isSpyPending(action) && isSpyPending(state.pendingAction) && matchingSpyPendingDetails(action, state.pendingAction)) {
    const owner = state.players.find((player) => player.id === action.ownerId);
    return {
      ...state,
      pendingAction: {
        ...state.pendingAction,
        remaining: mergedSpyRemaining(state.pendingAction, action, owner?.spies ?? 0),
        source: `${state.pendingAction.source} / ${action.source}`,
      },
    };
  }
  return {
    ...state,
    pendingAction: action,
    pendingQueue: state.pendingAction ? [state.pendingAction, ...state.pendingQueue] : state.pendingQueue,
  };
}
