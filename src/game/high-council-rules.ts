import { canPay, highCouncilSeatsTaken } from "./board-rules";
import { advancePendingAction } from "./pending-actions";
import type { GameState, PendingAction, ResourceId } from "./types";

type PayResourceForHighCouncilSeatPendingAction = Extract<
  PendingAction,
  { kind: "pay-resource-for-high-council-seat" }
>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

function paymentPendingIsValid(pending: PayResourceForHighCouncilSeatPendingAction) {
  return Boolean(
    resourceLabels[pending.resource] &&
      Number.isInteger(pending.cost) &&
      pending.cost > 0 &&
      Number.isInteger(pending.persuasionCost) &&
      pending.persuasionCost >= 0 &&
      Number.isInteger(pending.persuasionReward) &&
      pending.persuasionReward >= 0 &&
      typeof pending.cardId === "string" &&
      pending.cardId.length > 0 &&
      pending.optional === true,
  );
}

export function resolvePayResourceForHighCouncilSeatChoice(
  state: GameState,
  pending: PayResourceForHighCouncilSeatPendingAction,
): GameState {
  if (state.pendingAction !== pending || !paymentPendingIsValid(pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (
    !owner ||
    owner.highCouncilSeat ||
    highCouncilSeatsTaken(state.players) >= 4 ||
    !canPay(owner, { [pending.resource]: pending.cost }) ||
    owner.persuasion < pending.persuasionCost ||
    !owner.playArea.some((card) => card.id === pending.cardId)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    if (player.id !== owner.id) return player;
    return {
      ...player,
      highCouncilSeat: true,
      persuasion: player.persuasion - pending.persuasionCost + pending.persuasionReward,
      resources: {
        ...player.resources,
        [pending.resource]: player.resources[pending.resource] - pending.cost,
      },
    };
  });
  const rewardText = pending.persuasionReward > 0
    ? ` and gains ${pending.persuasionReward} persuasion`
    : "";

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} spends ${pending.cost} ${resourceLabels[pending.resource]} for ${pending.source}: takes a High Council seat${rewardText}.`,
      ...state.log,
    ],
  };
}

export function skipPayResourceForHighCouncilSeat(
  state: GameState,
  pending: PayResourceForHighCouncilSeatPendingAction,
): GameState {
  if (state.pendingAction !== pending || !paymentPendingIsValid(pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to pay for ${pending.source}.`, ...state.log],
  };
}
