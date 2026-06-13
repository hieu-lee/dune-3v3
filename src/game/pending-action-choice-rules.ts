import {
  acquirableCardsForPending,
} from "./market-rules";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  canPay,
  highCouncilSeatsTaken,
} from "./board-rules";
import { playerHasConflictUnits } from "./conflict-rules";
import { addLeadershipBonusForResolvedRevealStrength } from "./leadership-reveal-bonus";
import { scoreActiveGurneyAlwaysSmilingForRecipient } from "./leader-rewards";
import {
  trashableCardsForPending,
} from "./trash-rules";
import {
  placeableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { recordTurnSpiceGainAndCompleteHarvestContracts } from "./contract-rules";
import type {
  GameState,
  PendingAction,
  PendingActionChoicePendingOption,
} from "./types";

type PendingActionChoicePendingAction = Extract<PendingAction, { kind: "pending-action-choice" }>;

export function pendingActionChoiceOptionIsResolvable(
  state: GameState,
  option: PendingActionChoicePendingOption,
) {
  const nestedPending = option.pending;
  if (nestedPending.kind === "acquire-card") {
    return acquirableCardsForPending(state, nestedPending).length > 0;
  }
  if (nestedPending.kind === "trash-card") {
    const owner = state.players.find((player) => player.id === nestedPending.ownerId);
    return Boolean(owner && trashableCardsForPending(owner, nestedPending).length > 0);
  }
  if (nestedPending.kind === "gain-persuasion") {
    return nestedPending.amount > 0;
  }
  if (nestedPending.kind === "gain-resource") {
    return nestedPending.amount > 0;
  }
  if (nestedPending.kind === "gain-strength") {
    const recipient = state.players.find((player) => player.id === nestedPending.combatRecipientId);
    return Boolean(recipient && nestedPending.amount > 0 && playerHasConflictUnits(recipient));
  }
  if (nestedPending.kind === "pay-resource-for-high-council-seat") {
    const owner = state.players.find((player) => player.id === nestedPending.ownerId);
    return Boolean(
      owner &&
        !owner.highCouncilSeat &&
        highCouncilSeatsTaken(state.players) < 4 &&
        canPay(owner, { [nestedPending.resource]: nestedPending.cost }) &&
        owner.persuasion >= nestedPending.persuasionCost,
    );
  }
  if (nestedPending.kind === "spy") {
    return placeableSpySpaces(state, nestedPending).length > 0 ||
      recallableSpySupplySpaces(state, nestedPending).length > 0;
  }
  return false;
}

export function resolvePendingActionChoice(
  state: GameState,
  pending: PendingActionChoicePendingAction,
  optionId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || (pending.cardId !== undefined && !owner.playArea.some((card) => card.id === pending.cardId))) return state;
  const option = pending.options.find((candidate) => candidate.id === optionId);
  if (!option || !pendingActionChoiceOptionIsResolvable(state, option)) return state;
  const nestedPending = option.pending;
  if (nestedPending.kind === "gain-persuasion") {
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.ownerId
          ? { ...player, persuasion: player.persuasion + nestedPending.amount }
          : player
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: gains ${nestedPending.amount} persuasion.`,
        ...state.log,
      ],
    };
  }
  if (nestedPending.kind === "gain-resource") {
    const actionLog = `${owner.leader} chooses ${option.label} for ${pending.source}: gains ${nestedPending.amount} ${nestedPending.resource}.`;
    const resourceGainedState = {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.ownerId
          ? {
              ...player,
              resources: {
                ...player.resources,
                [nestedPending.resource]: player.resources[nestedPending.resource] + nestedPending.amount,
              },
            }
          : player
      ),
      ...advancePendingAction(state),
      log: [actionLog, ...state.log],
    };
    return nestedPending.resource === "spice"
      ? recordTurnSpiceGainAndCompleteHarvestContracts(
        resourceGainedState,
        nestedPending.ownerId,
        nestedPending.amount,
        actionLog,
      ).state
      : resourceGainedState;
  }
  if (nestedPending.kind === "gain-strength") {
    const strengthenedState = {
      ...state,
      players: state.players.map((player) =>
        player.id === nestedPending.combatRecipientId
          ? { ...player, conflict: player.conflict + nestedPending.amount }
          : player
      ),
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: adds ${nestedPending.amount} strength.`,
        ...state.log,
      ],
    };
    const gurneyState = scoreActiveGurneyAlwaysSmilingForRecipient(strengthenedState, nestedPending.combatRecipientId);
    return addLeadershipBonusForResolvedRevealStrength(
      gurneyState,
      nestedPending.ownerId,
      nestedPending.combatRecipientId,
      nestedPending.source,
      nestedPending.cardId,
      nestedPending.leadershipBonus,
    );
  }
  if (nestedPending.kind === "pay-resource-for-high-council-seat") {
    const players = state.players.map((player) => {
      if (player.id !== nestedPending.ownerId) return player;
      return {
        ...player,
        highCouncilSeat: true,
        persuasion: player.persuasion - nestedPending.persuasionCost + nestedPending.persuasionReward,
        resources: {
          ...player.resources,
          [nestedPending.resource]: player.resources[nestedPending.resource] - nestedPending.cost,
        },
      };
    });
    const rewardText = nestedPending.persuasionReward > 0
      ? ` and gains ${nestedPending.persuasionReward} persuasion`
      : "";
    return {
      ...state,
      players,
      ...advancePendingAction(state),
      log: [
        `${owner.leader} chooses ${option.label} for ${pending.source}: spends ${nestedPending.cost} ${nestedPending.resource} and takes a High Council seat${rewardText}.`,
        ...state.log,
      ],
    };
  }
  return {
    ...state,
    pendingAction: nestedPending,
    log: [`${owner.leader} chooses ${option.label} for ${pending.source}.`, ...state.log],
  };
}

export function skipPendingActionChoice(
  state: GameState,
  pending: PendingActionChoicePendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (pending.optional !== true) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines ${pending.source}.`, ...state.log],
  };
}
