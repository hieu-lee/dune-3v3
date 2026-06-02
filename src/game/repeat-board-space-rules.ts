import {
  applyBoardEffect,
} from "./agent-effects";
import {
  boardSpaceRewardApplies,
} from "./board-rules";
import { resolveSecretsIntriguePressure } from "./board-location-rules";
import {
  boardSpaces,
} from "./data";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import {
  advancePendingAction,
  prependPendingAction,
} from "./pending-actions";
import {
  pendingActionForBoardTrash,
  pendingActionForSpace,
} from "./placement-rules";
import {
  hasUsedReverendMotherJessicaRepeat,
  recordReverendMotherJessicaRepeat,
  recordTurnSpiceGain,
} from "./turn-trackers";
import type {
  GameState,
  PendingAction,
  ResourceId,
} from "./types";

export type RepeatBoardSpaceChoice = "repeat" | "skip";

type RepeatBoardSpacePendingAction = Extract<PendingAction, { kind: "repeat-board-space" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function repeatBoardSpaceAbilityApplies(
  state: GameState,
  pending: RepeatBoardSpacePendingAction,
): boolean {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  if (!owner || !space) return false;

  if (
    pending.ability === "reverend-mother-jessica" &&
    pending.source === "Reverend Mother" &&
    pending.resource === "water" &&
    pending.cost === 1 &&
    owner.leader === reverendMotherJessicaLeaderName &&
    owner.role === "Ally" &&
    (space.icon === "bene" || space.icon === "fremen") &&
    !space.personal &&
    !hasUsedReverendMotherJessicaRepeat(state, owner.id)
  ) {
    return true;
  }

  return false;
}

function recordRepeatUse(
  state: GameState,
  pending: RepeatBoardSpacePendingAction,
): GameState {
  if (pending.ability === "reverend-mother-jessica") {
    return recordReverendMotherJessicaRepeat(state, pending.ownerId);
  }
  return state;
}

export function resolveRepeatBoardSpaceChoice(
  state: GameState,
  pending: RepeatBoardSpacePendingAction,
  choice: RepeatBoardSpaceChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  if (!owner || !space) return state;

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  if (!repeatBoardSpaceAbilityApplies(state, pending) || owner.resources[pending.resource] < pending.cost) {
    return state;
  }

  const paidOwner = {
    ...owner,
    resources: {
      ...owner.resources,
      [pending.resource]: owner.resources[pending.resource] - pending.cost,
    },
  };
  const { source: repeatedOwner } = applyBoardEffect(paidOwner, paidOwner, space);
  const players = state.players.map((player) => (player.id === owner.id ? repeatedOwner : player));
  const resourceLabel = resourceLabels[pending.resource];
  const baseState = recordRepeatUse({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [`${owner.leader} spends ${pending.cost} ${resourceLabel} for ${pending.source} to repeat ${space.name}.`, ...state.log],
  }, pending);
  const repeatedPending = pendingActionForSpace(space, repeatedOwner, repeatedOwner, players);
  const repeatedTrashPending = pendingActionForBoardTrash(space, repeatedOwner);
  const withPending = prependPendingAction(
    prependPendingAction(baseState, repeatedPending),
    repeatedTrashPending,
  );
  const intrigueGain = boardSpaceRewardApplies(space, paidOwner) ? space.gain?.intrigue ?? 0 : 0;
  const withIntrigue = intrigueGain > 0
    ? drawIntrigueCards(withPending, owner.id, intrigueGain, `${pending.source} / ${space.name}`)
    : withPending;
  const spiceGain = boardSpaceRewardApplies(space, paidOwner) ? space.gain?.spice ?? 0 : 0;
  const secretsState = space.id === "secrets" ? resolveSecretsIntriguePressure(withIntrigue, owner.id) : withIntrigue;
  return spiceGain > 0 ? recordTurnSpiceGain(secretsState, owner.id, spiceGain) : secretsState;
}
