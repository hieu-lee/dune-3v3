import { isGenericSignetRingCard } from "./card-identifiers";
import { recordTurnSpiceGainAndCompleteHarvestContracts } from "./contract-rules";
import { playerTroopSupply } from "./deck-utils";
import { feydRauthaLeaderName } from "./leader-constants";
import { advancePendingAction } from "./pending-actions";
import { placeableSpySpaces, recallableSpySupplySpaces } from "./spy-choices";
import { spyPendingForPlacement } from "./spy-effect-pending-rules";
import { trashableCardsForPending } from "./trash-rules";
import type {
  BoardSpace,
  Card,
  FeydTrainingPendingOption,
  GameState,
  PendingAction,
  Player,
} from "./types";

const feydTrainingMaxPosition = 4;
const feydTrainingSource = "Personal Training";

type FeydTrainingPendingAction = Extract<PendingAction, { kind: "feyd-training" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

function feydTrainingPosition(player: Player) {
  return Math.min(feydTrainingMaxPosition, Math.max(0, player.feydTraining ?? 0));
}

function feydTrainingOptions(nextPosition: number): FeydTrainingPendingOption[] {
  if (nextPosition === 1) {
    return [
      {
        id: "pay-solari-trash",
        label: "Spend 1 Solari to trash a card",
        reward: "pay-solari-trash",
      },
      {
        id: "spy",
        label: "Place 1 Spy",
        reward: "spy",
      },
    ];
  }
  if (nextPosition === 2) {
    return [{
      id: "trash",
      label: "Trash a card",
      reward: "trash",
    }];
  }
  if (nextPosition === 3) {
    return [
      {
        id: "trash",
        label: "Trash a card",
        reward: "trash",
      },
      {
        id: "spy-spice",
        label: "Place 1 Spy and gain 2 spice",
        reward: "spy-spice",
      },
    ];
  }
  if (nextPosition === 4) {
    return [{
      id: "troop-spy",
      label: "Recruit 1 troop and place 1 Spy",
      reward: "troop-spy",
    }];
  }
  return [];
}

function trashPendingFor(owner: Player, source: string, resourceCost?: TrashCardPendingAction["resourceCost"]) {
  return {
    kind: "trash-card" as const,
    ownerId: owner.id,
    source,
    optional: false,
    ...(resourceCost ? { resourceCost } : {}),
  };
}

function spyPendingFor(state: GameState, owner: Player, source: string) {
  return spyPendingForPlacement(
    source,
    owner,
    {
      count: 1,
      recallForSupply: true,
      source,
    },
    state,
  ) as SpyPendingAction | undefined;
}

function spyPendingCanResolve(state: GameState, pending: SpyPendingAction | undefined) {
  return Boolean(
    pending &&
      (placeableSpySpaces(state, pending).length > 0 ||
        recallableSpySupplySpaces(state, pending).length > 0),
  );
}

function advanceFeydTrainingPosition(state: GameState, owner: Player, nextPosition: number) {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? { ...player, feydTraining: nextPosition } : player
    ),
  };
}

function actionAfterTrainingChoice(
  state: GameState,
  nextAction: PendingAction | undefined,
  queuedAction?: PendingAction,
) {
  const advanced = advancePendingAction(state);
  const queuedActions = [
    queuedAction,
    advanced.pendingAction,
  ].filter((action): action is PendingAction => Boolean(action));
  if (!nextAction) {
    if (queuedActions.length === 0) return { ...state, ...advanced };
    const [pendingAction, ...pendingQueue] = queuedActions;
    return {
      ...state,
      pendingAction,
      pendingQueue: [...pendingQueue, ...advanced.pendingQueue],
    };
  }
  return {
    ...state,
    pendingAction: nextAction,
    pendingQueue: [
      ...queuedActions,
      ...advanced.pendingQueue,
    ],
  };
}

export function pendingActionForFeydPersonalTraining(
  card: Card,
  source: Player,
  state: GameState | undefined,
  space: BoardSpace | undefined,
): PendingAction | undefined {
  if (!state || !isGenericSignetRingCard(card)) return undefined;
  if (!source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (source.leader !== feydRauthaLeaderName || source.role !== "Ally") return undefined;
  const nextPosition = feydTrainingPosition(source) + 1;
  const options = feydTrainingOptions(nextPosition);
  if (options.length === 0) return undefined;
  return {
    kind: "feyd-training",
    ownerId: source.id,
    cardId: card.id,
    source: feydTrainingSource,
    nextPosition,
    ...(space?.combat ? { canDeployTroop: true } : {}),
    options,
  };
}

export function feydTrainingOptionIsResolvable(
  state: GameState,
  pending: FeydTrainingPendingAction,
  option: FeydTrainingPendingOption,
) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.leader !== feydRauthaLeaderName || owner.role !== "Ally") return false;
  if (!owner.playArea.some((card) => card.id === pending.cardId)) return false;
  if (pending.nextPosition !== feydTrainingPosition(owner) + 1) return false;
  if (option.reward !== "pay-solari-trash") return true;
  const paidTrashPending = trashPendingFor(owner, pending.source, { solari: 1 });
  return owner.resources.solari >= 1 && trashableCardsForPending(owner, paidTrashPending).length > 0;
}

export function resolveFeydTrainingChoice(
  state: GameState,
  pending: FeydTrainingPendingAction,
  optionId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const option = pending.options.find((candidate) => candidate.id === optionId);
  if (!owner || !option || !feydTrainingOptionIsResolvable(state, pending, option)) return state;

  const trainingState = advanceFeydTrainingPosition(state, owner, pending.nextPosition);
  const trainingOwner = trainingState.players.find((player) => player.id === owner.id) ?? owner;
  const advanceLog = `${owner.leader} advances to Training ${pending.nextPosition}/${feydTrainingMaxPosition} for ${pending.source}.`;

  if (option.reward === "pay-solari-trash") {
    return {
      ...actionAfterTrainingChoice(
        trainingState,
        trashPendingFor(trainingOwner, pending.source, { solari: 1 }),
      ),
      log: [advanceLog, ...state.log],
    };
  }

  if (option.reward === "trash") {
    const trashPending = trashPendingFor(trainingOwner, pending.source);
    const canTrash = trashableCardsForPending(trainingOwner, trashPending).length > 0;
    return {
      ...actionAfterTrainingChoice(trainingState, canTrash ? trashPending : undefined),
      log: [
        canTrash ? advanceLog : `${advanceLog} ${owner.leader} has no trashable cards.`,
        ...state.log,
      ],
    };
  }

  if (option.reward === "spy") {
    const spyPending = spyPendingFor(trainingState, trainingOwner, pending.source);
    return {
      ...actionAfterTrainingChoice(trainingState, spyPending),
      log: [
        spyPendingCanResolve(trainingState, spyPending)
          ? advanceLog
          : `${advanceLog} ${owner.leader} has no legal Spy placement.`,
        ...state.log,
      ],
    };
  }

  if (option.reward === "spy-spice") {
    const spicedState: GameState = {
      ...trainingState,
      players: trainingState.players.map((player) =>
        player.id === owner.id
          ? {
              ...player,
              resources: {
                ...player.resources,
                spice: player.resources.spice + 2,
              },
            }
          : player
      ),
    };
    const spicedOwner = spicedState.players.find((player) => player.id === owner.id) ?? trainingOwner;
    const spyPendingBeforeContracts = spyPendingFor(spicedState, spicedOwner, pending.source);
    const rewardLog = spyPendingCanResolve(spicedState, spyPendingBeforeContracts)
      ? `${advanceLog} ${owner.leader} gains 2 spice.`
      : `${advanceLog} ${owner.leader} gains 2 spice and has no legal Spy placement.`;
    const trackedState = recordTurnSpiceGainAndCompleteHarvestContracts(
      { ...spicedState, log: [rewardLog, ...state.log] },
      owner.id,
      2,
      rewardLog,
    ).state;
    const trackedOwner = trackedState.players.find((player) => player.id === owner.id) ?? spicedOwner;
    const spyPending = spyPendingFor(trackedState, trackedOwner, pending.source);
    return {
      ...actionAfterTrainingChoice(trackedState, spyPending),
      log: trackedState.log,
    };
  }

  if (option.reward === "troop-spy") {
    const recruitCount = Math.min(playerTroopSupply(trainingOwner), 1);
    const recruitedState: GameState = {
      ...trainingState,
      players: trainingState.players.map((player) =>
        player.id === owner.id && recruitCount > 0
          ? { ...player, garrison: player.garrison + recruitCount }
          : player
      ),
    };
    const recruitedOwner = recruitedState.players.find((player) => player.id === owner.id) ?? trainingOwner;
    const spyPending = spyPendingFor(recruitedState, recruitedOwner, pending.source);
    const deployPending: PendingAction | undefined =
      pending.canDeployTroop && recruitCount > 0
        ? {
            kind: "deploy",
            ownerId: owner.id,
            remaining: 1,
            source: pending.source,
          }
        : undefined;
    const rewardParts = [
      recruitCount > 0 ? "recruits 1 troop" : "has no troop supply",
      spyPendingCanResolve(recruitedState, spyPending) ? "may place 1 Spy" : "has no legal Spy placement",
    ];
    return {
      ...actionAfterTrainingChoice(recruitedState, spyPending, deployPending),
      log: [`${advanceLog} ${owner.leader} ${rewardParts.join(" and ")}.`, ...state.log],
    };
  }

  return state;
}
