import {
  boardSpaces,
  leaderCardByName,
} from "./data";
import {
  pendingActionForReverendMotherJessicaRepeat,
} from "./leader-effect-pending-rules";
import {
  drawCards,
} from "./deck-utils";
import {
  ladyAmberMetulliLeaderName,
} from "./leader-constants";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import {
  advancePendingAction,
  prependPendingAction,
} from "./pending-actions";
import type {
  GameState,
  PendingAction,
} from "./types";

export type LadyAmberDesertScoutsChoice = "retreat" | "skip";
export type LeaderTransitionChoice = "transition" | "skip";

type LadyAmberDesertScoutsPendingAction = Extract<PendingAction, { kind: "amber-desert-scouts" }>;
type LeaderTransitionPendingAction = Extract<PendingAction, { kind: "leader-transition" }>;

export function resolveLadyAmberDesertScoutsChoice(
  state: GameState,
  pending: LadyAmberDesertScoutsPendingAction,
  choice: LadyAmberDesertScoutsChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.leader !== ladyAmberMetulliLeaderName || owner.role !== "Ally") return state;

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} keeps her deployed troops for ${pending.source}.`, ...state.log],
    };
  }

  if (owner.deployedTroops <= 0) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            garrison: player.garrison + 1,
            deployedTroops: player.deployedTroops - 1,
            conflict: Math.max(0, player.conflict - 2),
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [`${owner.leader} resolves ${pending.source}: retreats 1 troop.`, ...state.log],
  };
}

function leaderCounterAmount(owner: GameState["players"][number], counter: LeaderTransitionPendingAction["counter"]) {
  if (counter === "jessicaMemories") return owner.jessicaMemories;
  return 0;
}

function resetLeaderCounter(owner: GameState["players"][number], counter: LeaderTransitionPendingAction["counter"]) {
  if (counter === "jessicaMemories") return { ...owner, jessicaMemories: 0 };
  return owner;
}

function counterText(counter: LeaderTransitionPendingAction["counter"], amount: number) {
  if (counter === "jessicaMemories") return `${amount} ${amount === 1 ? "memory" : "memories"}`;
  return `${amount} counter${amount === 1 ? "" : "s"}`;
}

export function resolveLeaderTransitionChoice(
  state: GameState,
  pending: LeaderTransitionPendingAction,
  choice: LeaderTransitionChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const counterAmount = owner ? leaderCounterAmount(owner, pending.counter) : 0;
  if (
    !owner ||
    owner.leader !== pending.fromLeader ||
    owner.role !== "Ally" ||
    pending.counterAmount !== "all" ||
    counterAmount <= 0 ||
    pending.drawCardsPerCounter <= 0
  ) {
    return state;
  }

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  const cardsToDraw = counterAmount * pending.drawCardsPerCounter;
  const drawnOwner = drawCards(
    {
      ...resetLeaderCounter(owner, pending.counter),
      leader: pending.toLeader,
      leaderCard: leaderCardByName(pending.toLeader),
    },
    owner.hand.length + cardsToDraw,
  );
  const drawn = drawnOwner.hand.length - owner.hand.length;
  const returnedText = counterText(pending.counter, counterAmount);
  const cardText = `${drawn} ${drawn === 1 ? "card" : "cards"}`;
  const baseState = {
    ...state,
    players: state.players.map((player) => (player.id === owner.id ? drawnOwner : player)),
    ...advancePendingAction(state),
    log: [`${owner.leader} returns ${returnedText} for ${cardText} and becomes ${pending.toLeader}.`, ...state.log],
  };
  if (
    pending.followUp?.kind !== "repeat-board-space" ||
    pending.followUp.ability !== "reverend-mother-jessica" ||
    pending.followUp.resource !== "water" ||
    pending.followUp.cost !== 1
  ) {
    return baseState;
  }
  const space = boardSpaces.find((candidate) => candidate.id === pending.followUp?.spaceId);
  return prependPendingAction(
    baseState,
    space ? pendingActionForReverendMotherJessicaRepeat(baseState, drawnOwner, space) : undefined,
  );
}
