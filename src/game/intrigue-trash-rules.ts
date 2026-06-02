import { drawIntrigueCards } from "./intrigue-deck";
import { advancePendingAction } from "./pending-actions";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { GameState, IntrigueCard, PendingAction, Resources } from "./types";

type TrashIntrigueForRewardPendingAction = Extract<PendingAction, { kind: "trash-intrigue-for-reward" }>;

export function trashIntrigueForRewardChoices(
  player: GameState["players"][number],
  pending: TrashIntrigueForRewardPendingAction,
): IntrigueCard[] {
  if (player.id !== pending.ownerId) return [];
  return player.intrigues;
}

function addResources(resources: Resources, gain: Partial<Resources>): Resources {
  return {
    ...resources,
    solari: resources.solari + (gain.solari ?? 0),
    spice: resources.spice + (gain.spice ?? 0),
    water: resources.water + (gain.water ?? 0),
  };
}

function resourceRewardText(gain: Partial<Resources>) {
  const parts = [
    gain.solari ? `${gain.solari} Solari` : undefined,
    gain.spice ? `${gain.spice} spice` : undefined,
    gain.water ? `${gain.water} water` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? ` and gains ${parts.join(" and ")}` : "";
}

function intrigueRewardText(requested: number, actual: number) {
  if (requested <= 0) return "";
  if (actual <= 0) return " but draws no Intrigue cards";
  if (actual === requested) return ` to draw ${actual} Intrigue card${actual === 1 ? "" : "s"}`;
  return ` to draw ${actual} of ${requested} Intrigue cards`;
}

export function resolveTrashIntrigueForReward(
  state: GameState,
  pending: TrashIntrigueForRewardPendingAction,
  intrigueId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const trashedIntrigue = trashIntrigueForRewardChoices(owner, pending).find((card) => card.id === intrigueId);
  if (!trashedIntrigue) return state;

  const ownerAfterTrash = {
    ...owner,
    intrigues: owner.intrigues.filter((card) => card.id !== trashedIntrigue.id),
    resources: addResources(owner.resources, pending.gain),
  };
  const advancedState: GameState = {
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterTrash : player),
    ...advancePendingAction(state),
    log: state.log,
  };
  const intrigueState = pending.drawIntrigues > 0
    ? drawIntrigueCards(advancedState, owner.id, pending.drawIntrigues, pending.source)
    : advancedState;
  const ownerAfterDraw = intrigueState.players.find((player) => player.id === owner.id);
  const drawnIntrigues = Math.max(
    0,
    (ownerAfterDraw?.intrigues.length ?? ownerAfterTrash.intrigues.length) - ownerAfterTrash.intrigues.length,
  );
  const resolvedState = {
    ...intrigueState,
    log: [
      `${owner.leader} resolves ${pending.source}: trashes ${trashedIntrigue.name}${intrigueRewardText(pending.drawIntrigues, drawnIntrigues)}${resourceRewardText(pending.gain)}.`,
      ...intrigueState.log,
    ],
  };
  return pending.gain.spice ? recordTurnSpiceGain(resolvedState, owner.id, pending.gain.spice) : resolvedState;
}

export function skipTrashIntrigueForReward(
  state: GameState,
  pending: TrashIntrigueForRewardPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!pending.optional && owner && trashIntrigueForRewardChoices(owner, pending).length > 0) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      pending.optional
        ? `${owner?.leader ?? "Player"} declines to trash an Intrigue for ${pending.source}.`
        : `${owner?.leader ?? "Player"} has no Intrigues to trash for ${pending.source}.`,
      ...state.log,
    ],
  };
}
