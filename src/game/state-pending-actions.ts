import {
  resolveBoardInfluenceChoice as resolveBoardInfluenceChoiceForPending,
  resolveOptionalSpacePayment as resolveOptionalSpacePaymentForPending,
  skipOptionalSpacePayment as resolveSkipOptionalSpacePayment,
} from "./board-location-rules";
import {
  criticalLocationNames,
} from "./critical-locations";
import {
  canHaveMakerHooks,
  conflictDeploymentBlockedForOwner,
  playerConflictUnitCount,
} from "./conflict-rules";
import {
  recordTurnSpiceGainAndCompleteHarvestContracts,
  resolveAcquireCardForPending,
  resolveChoamContractFallback,
  resolveTakeChoamContract,
} from "./contract-rules";
import {
  playerTroopSupply,
} from "./deck-utils";
import {
  canDeployForDeployOrRetreatTroops,
  canResolveDeployOrRetreatTroopsChoice,
  canRetreatForDeployOrRetreatTroops,
  resolveDeployOrRetreatTroopsChoice as resolveDeployOrRetreatTroopsChoiceForPending,
  skipDeployOrRetreatTroopsChoice as resolveSkipDeployOrRetreatTroopsChoice,
  type DeployOrRetreatTroopsChoice,
} from "./deploy-or-retreat-rules";
import {
  resolveDiscardCardForDraw as resolveDiscardCardForDrawForPending,
  skipDiscardCardForDraw as resolveSkipDiscardCardForDraw,
} from "./discard-draw-rules";
import {
  resolveDiscardCardForInfluenceAndDraw as resolveDiscardCardForInfluenceAndDrawForPending,
  skipDiscardCardForInfluenceAndDraw as resolveSkipDiscardCardForInfluenceAndDraw,
} from "./discard-influence-draw-rules";
import {
  resolveDiscardCardsForReward as resolveDiscardCardsForRewardForPending,
  skipDiscardCardsForReward as resolveSkipDiscardCardsForReward,
} from "./discard-reward-rules";
import {
  resolveDiscardHandCard as resolveDiscardHandCardForPending,
} from "./discard-hand-rules";
import {
  resolvePayResourceForHighCouncilSeatChoice as resolvePayResourceForHighCouncilSeatForPending,
  skipPayResourceForHighCouncilSeat as resolveSkipPayResourceForHighCouncilSeat,
} from "./high-council-rules";
import {
  allPlayersDone,
} from "./game-flow";
import {
  resolveLoseInfluenceForIntrigues as resolveLoseInfluenceForIntriguesForPending,
  skipLoseInfluenceForIntrigues as resolveSkipLoseInfluenceForIntrigues,
} from "./influence-intrigue-rules";
import {
  resolveTrashIntrigueForReward as resolveTrashIntrigueForRewardForPending,
  skipTrashIntrigueForReward as resolveSkipTrashIntrigueForReward,
} from "./intrigue-trash-rules";
import {
  drawIntrigueCards,
} from "./intrigue-deck";
import {
  scoreGurneyAlwaysSmiling,
} from "./leader-rewards";
import {
  advancePendingAction,
} from "./pending-actions";
import {
  finishCombatIfNoActors,
  startNextRound,
} from "./round-transition-rules";
import {
  resolvePlaceSpyForPending,
  resolveStabanUnseenNetworkChoiceForPending,
} from "./spy-pending-rules";
import {
  recordTurnUnitDeployment,
} from "./turn-trackers";
import {
  resolveRetreatTroopsForStrength as resolveRetreatTroopsForStrengthForPending,
  skipRetreatTroopsForStrength as resolveSkipRetreatTroopsForStrength,
} from "./troop-retreat-rules";
import { skipTrashCard as resolveSkipTrashCard, trashPlayerCard as resolveTrashPlayerCard } from "./trash-rules";
import {
  resolveTopDeckSelection as resolveTopDeckSelectionForPending,
  skipTopDeckSelection as resolveSkipTopDeckSelection,
  type TopDeckSelectionChoice,
} from "./top-deck-selection-rules";
import type {
  FactionId,
  GameState,
  PendingAction,
  PostDeployIntrigueDraw,
  ResourceId,
  TrashCardZone,
} from "./types";

export type CunningPlotChoice = "draw" | "paid-trash";
export type StabanUnseenNetworkChoice = "pay" | "skip";

type ControlDefensePendingAction = Extract<PendingAction, { kind: "control-defense" }>;

function continueAfterResolvedConflictReward(state: GameState): GameState {
  if (
    state.phase === "playing" &&
    !state.conflict &&
    !state.pendingAction &&
    state.pendingQueue.length === 0 &&
    allPlayersDone(state.players)
  ) {
    return startNextRound(state);
  }
  return state;
}

export function finishPendingAction(state: GameState): GameState {
  if (state.pendingAction?.kind === "spy" && state.pendingAction.mustPlaceSpy) return state;
  if (state.pendingAction?.kind === "acquire-card" && state.pendingAction.optional !== true) return state;
  if (state.pendingAction?.kind === "contract" && state.pendingAction.optional !== true) return state;
  if (state.pendingAction?.kind === "discard-hand-card") return state;
  const resolvedState = state.pendingAction?.kind === "deploy"
    ? resolvePostDeployIntrigueDraw(state, state.pendingAction.postDeployIntrigueDraw)
    : state;
  return continueAfterResolvedConflictReward(
    finishCombatIfNoActors({ ...resolvedState, ...advancePendingAction(resolvedState) }),
  );
}

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type MakerChoicePendingAction = Extract<PendingAction, { kind: "maker-choice" }>;
type ReinforcePendingAction = Extract<PendingAction, { kind: "reinforce" }>;
type SietchTabrPendingAction = Extract<PendingAction, { kind: "sietch-tabr" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type StabanUnseenNetworkPendingAction = Extract<PendingAction, { kind: "staban-unseen-network" }>;
type RevealAdjustPendingAction = Extract<PendingAction, { kind: "reveal-adjust" }>;
type RetreatTroopsForStrengthPendingAction = Extract<PendingAction, { kind: "retreat-troops-for-strength" }>;
type DeployOrRetreatTroopsPendingAction = Extract<PendingAction, { kind: "deploy-or-retreat-troops" }>;
type CommanderResourceSplitPendingAction = Extract<PendingAction, { kind: "commander-resource-split" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;
type DiscardCardForInfluenceAndDrawPendingAction = Extract<PendingAction, { kind: "discard-card-for-influence-and-draw" }>;
type DiscardCardForDrawPendingAction = Extract<PendingAction, { kind: "discard-card-for-draw" }>;
type DiscardCardsForRewardPendingAction = Extract<PendingAction, { kind: "discard-cards-for-reward" }>;
type TrashIntrigueForRewardPendingAction = Extract<PendingAction, { kind: "trash-intrigue-for-reward" }>;
type TopDeckSelectionPendingAction = Extract<PendingAction, { kind: "top-deck-selection" }>;
type DiscardHandCardPendingAction = Extract<PendingAction, { kind: "discard-hand-card" }>;
type LoseInfluenceForIntriguesPendingAction = Extract<PendingAction, { kind: "lose-influence-for-intrigues" }>;
type PayResourceForHighCouncilSeatPendingAction = Extract<PendingAction, { kind: "pay-resource-for-high-council-seat" }>;
type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;
type OptionalSpacePaymentPendingAction = Extract<PendingAction, { kind: "optional-space-payment" }>;
type PostDeployIntrigueDrawPendingAction = DeployPendingAction | MakerChoicePendingAction | SietchTabrPendingAction;

function matchingPostDeployIntrigueDraw(
  first: PostDeployIntrigueDraw | undefined,
  second: PostDeployIntrigueDraw,
) {
  return Boolean(
    first &&
    first.recipientId === second.recipientId &&
    first.conditionOwnerId === second.conditionOwnerId &&
    first.amount === second.amount &&
    first.minConflictUnits === second.minConflictUnits &&
    first.source === second.source,
  );
}

function withoutPostDeployIntrigueDraw(action: PostDeployIntrigueDrawPendingAction): PendingAction {
  if (action.kind === "deploy") {
    const { postDeployIntrigueDraw, ...nextAction } = action;
    void postDeployIntrigueDraw;
    return nextAction;
  }
  if (action.kind === "maker-choice") {
    const { postDeployIntrigueDraw, ...nextAction } = action;
    void postDeployIntrigueDraw;
    return nextAction;
  }
  const { postDeployIntrigueDraw, ...nextAction } = action;
  void postDeployIntrigueDraw;
  return nextAction;
}

function clearResolvedPostDeployIntrigueDraw(
  state: GameState,
  draw: PostDeployIntrigueDraw,
): GameState {
  const stripAction = (action: PendingAction): PendingAction => {
    if (action.kind !== "deploy" && action.kind !== "maker-choice" && action.kind !== "sietch-tabr") {
      return action;
    }
    if (!matchingPostDeployIntrigueDraw(action.postDeployIntrigueDraw, draw)) {
      return action;
    }
    return withoutPostDeployIntrigueDraw(action);
  };

  return {
    ...state,
    pendingAction: state.pendingAction ? stripAction(state.pendingAction) : undefined,
    pendingQueue: state.pendingQueue.map(stripAction),
  };
}

function resolvePostDeployIntrigueDraw(state: GameState, draw: PostDeployIntrigueDraw | undefined): GameState {
  if (!draw || draw.amount <= 0) return state;
  const conditionOwner = state.players.find((player) => player.id === draw.conditionOwnerId);
  if (!conditionOwner || playerConflictUnitCount(conditionOwner) < draw.minConflictUnits) return state;
  return clearResolvedPostDeployIntrigueDraw(
    drawIntrigueCards(state, draw.recipientId, draw.amount, draw.source),
    draw,
  );
}

export function takeChoamContract(state: GameState, pending: ContractPendingAction, contractId: string): GameState {
  return continueAfterResolvedConflictReward(
    resolveTakeChoamContract(state, pending, contractId, finishCombatIfNoActors),
  );
}

export function acquireCardForPending(
  state: GameState,
  pending: AcquireCardPendingAction,
  cardId: string,
  callToArmsRecruitOwnerId?: string,
): GameState {
  return resolveAcquireCardForPending(state, pending, cardId, finishCombatIfNoActors, callToArmsRecruitOwnerId);
}

export function collectChoamContractFallback(state: GameState, pending: ContractPendingAction): GameState {
  return continueAfterResolvedConflictReward(
    resolveChoamContractFallback(state, pending, finishCombatIfNoActors),
  );
}

export function trashPlayerCard(
  state: GameState,
  pending: TrashCardPendingAction,
  zone: TrashCardZone,
  cardId: string,
  choiceIndex?: number,
): GameState {
  return continueAfterResolvedConflictReward(resolveTrashPlayerCard(state, pending, zone, cardId, choiceIndex));
}

export function skipTrashCard(state: GameState, pending: TrashCardPendingAction): GameState {
  return continueAfterResolvedConflictReward(resolveSkipTrashCard(state, pending));
}

export function resolveBoardInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  ownerId: string,
  faction: FactionId,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveBoardInfluenceChoiceForPending(state, pending, ownerId, faction),
  );
}

export function resolveOptionalSpacePayment(
  state: GameState,
  pending: OptionalSpacePaymentPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveOptionalSpacePaymentForPending(state, pending));
}

export function skipOptionalSpacePayment(state: GameState, pending: OptionalSpacePaymentPendingAction): GameState {
  return continueAfterResolvedConflictReward(resolveSkipOptionalSpacePayment(state, pending));
}

export function resolveDiscardCardForInfluenceAndDrawChoice(
  state: GameState,
  pending: DiscardCardForInfluenceAndDrawPendingAction,
  discardCardId: string,
  faction: FactionId,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveDiscardCardForInfluenceAndDrawForPending(state, pending, discardCardId, faction),
  );
}

export function skipDiscardCardForInfluenceAndDraw(
  state: GameState,
  pending: DiscardCardForInfluenceAndDrawPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipDiscardCardForInfluenceAndDraw(state, pending));
}

export function resolveDiscardCardForDrawChoice(
  state: GameState,
  pending: DiscardCardForDrawPendingAction,
  discardCardId: string,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveDiscardCardForDrawForPending(state, pending, discardCardId),
  );
}

export function skipDiscardCardForDraw(
  state: GameState,
  pending: DiscardCardForDrawPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipDiscardCardForDraw(state, pending));
}

export function resolveDiscardCardsForRewardChoice(
  state: GameState,
  pending: DiscardCardsForRewardPendingAction,
  discardCardId: string,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveDiscardCardsForRewardForPending(state, pending, discardCardId),
  );
}

export function skipDiscardCardsForReward(
  state: GameState,
  pending: DiscardCardsForRewardPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipDiscardCardsForReward(state, pending));
}

export function resolveTopDeckSelectionChoice(
  state: GameState,
  pending: TopDeckSelectionPendingAction,
  choice: TopDeckSelectionChoice,
): GameState {
  return continueAfterResolvedConflictReward(resolveTopDeckSelectionForPending(state, pending, choice));
}

export function skipTopDeckSelectionChoice(
  state: GameState,
  pending: TopDeckSelectionPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipTopDeckSelection(state, pending));
}

export function resolveTrashIntrigueForRewardChoice(
  state: GameState,
  pending: TrashIntrigueForRewardPendingAction,
  intrigueId: string,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveTrashIntrigueForRewardForPending(state, pending, intrigueId),
  );
}

export function skipTrashIntrigueForReward(
  state: GameState,
  pending: TrashIntrigueForRewardPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipTrashIntrigueForReward(state, pending));
}

export function resolveDiscardHandCardChoice(
  state: GameState,
  pending: DiscardHandCardPendingAction,
  discardCardId: string,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveDiscardHandCardForPending(state, pending, discardCardId),
  );
}

export function resolveLoseInfluenceForIntriguesChoice(
  state: GameState,
  pending: LoseInfluenceForIntriguesPendingAction,
  faction: FactionId,
): GameState {
  return continueAfterResolvedConflictReward(
    resolveLoseInfluenceForIntriguesForPending(state, pending, faction),
  );
}

export function skipLoseInfluenceForIntrigues(
  state: GameState,
  pending: LoseInfluenceForIntriguesPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipLoseInfluenceForIntrigues(state, pending));
}

export function resolvePayResourceForHighCouncilSeatChoice(
  state: GameState,
  pending: PayResourceForHighCouncilSeatPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolvePayResourceForHighCouncilSeatForPending(state, pending));
}

export function skipPayResourceForHighCouncilSeat(
  state: GameState,
  pending: PayResourceForHighCouncilSeatPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipPayResourceForHighCouncilSeat(state, pending));
}

export function placeSpyForPending(
  state: GameState,
  pending: SpyPendingAction,
  spaceId: string,
): GameState {
  return continueAfterResolvedConflictReward(
    resolvePlaceSpyForPending(state, pending, spaceId, finishCombatIfNoActors),
  );
}

export function resolveStabanUnseenNetworkChoice(
  state: GameState,
  pending: StabanUnseenNetworkPendingAction,
  choice: StabanUnseenNetworkChoice,
): GameState {
  return resolveStabanUnseenNetworkChoiceForPending(state, pending, choice, finishCombatIfNoActors);
}

function signedAdjustment(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function finishRevealAdjustment(state: GameState, pending: RevealAdjustPendingAction): GameState {
  const resolvedState = {
    ...state,
    ...advancePendingAction(state),
    log: [
      `Printed reveal adjustment resolved: ${signedAdjustment(pending.persuasionAdjustment)} persuasion, ${signedAdjustment(pending.strengthAdjustment)} strength.`,
      ...state.log,
    ],
  };
  return scoreGurneyAlwaysSmiling(resolvedState, pending.ownerId);
}

export function resolveRetreatTroopsForStrength(
  state: GameState,
  pending: RetreatTroopsForStrengthPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveRetreatTroopsForStrengthForPending(state, pending));
}

export function skipRetreatTroopsForStrength(
  state: GameState,
  pending: RetreatTroopsForStrengthPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipRetreatTroopsForStrength(state, pending));
}

export {
  canDeployForDeployOrRetreatTroops,
  canResolveDeployOrRetreatTroopsChoice,
  canRetreatForDeployOrRetreatTroops,
};

export function resolveDeployOrRetreatTroopsChoice(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
  choice: DeployOrRetreatTroopsChoice,
): GameState {
  const resolvedState = resolveDeployOrRetreatTroopsChoiceForPending(state, pending, choice);
  if (resolvedState === state) return state;
  const scoredState = choice === "deploy"
    ? scoreGurneyAlwaysSmiling(resolvedState, pending.ownerId)
    : resolvedState;
  return continueAfterResolvedConflictReward(scoredState);
}

export function skipDeployOrRetreatTroopsChoice(
  state: GameState,
  pending: DeployOrRetreatTroopsPendingAction,
): GameState {
  return continueAfterResolvedConflictReward(resolveSkipDeployOrRetreatTroopsChoice(state, pending));
}

function resourceLogLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function resourceGainLog(amount: number, resource: ResourceId) {
  return `${amount} ${resourceLogLabel(resource)}`;
}

export function resolveCommanderResourceSplitChoice(
  state: GameState,
  pending: CommanderResourceSplitPendingAction,
  optionIndex: number,
): GameState {
  const option = pending.options[optionIndex];
  if (!option) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const ally = state.players.find((player) => player.id === pending.allyId);
  if (
    !commander ||
    commander.role !== "Commander" ||
    commander.team !== pending.team ||
    !ally ||
    ally.team !== commander.team ||
    ally.role !== "Ally"
  ) {
    return { ...state, ...advancePendingAction(state) };
  }

  const players = state.players.map((player) => {
    if (player.id === commander.id) {
      return {
        ...player,
        resources: {
          ...player.resources,
          [option.commanderResource]: player.resources[option.commanderResource] + option.commanderAmount,
        },
      };
    }
    if (player.id === ally.id) {
      return {
        ...player,
        resources: {
          ...player.resources,
          [option.allyResource]: player.resources[option.allyResource] + option.allyAmount,
        },
      };
    }
    return player;
  });

  let nextState: GameState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} resolves ${pending.source}: gains ${resourceGainLog(option.commanderAmount, option.commanderResource)}; ${ally.leader} gains ${resourceGainLog(option.allyAmount, option.allyResource)}.`,
      ...state.log,
    ],
  };
  if (option.commanderResource === "spice") {
    nextState = recordTurnSpiceGainAndCompleteHarvestContracts(nextState, commander.id, option.commanderAmount).state;
  }
  if (option.allyResource === "spice") {
    nextState = recordTurnSpiceGainAndCompleteHarvestContracts(nextState, ally.id, option.allyAmount).state;
  }
  return nextState;
}

export function resolveMakerChoice(
  state: GameState,
  pending: MakerChoicePendingAction,
  choice: "spice" | "sandworms",
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const spiceOwner = state.players.find((player) => player.id === pending.spiceOwnerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  const spiceRecipient = spiceOwner ?? owner;

  if (choice === "sandworms" && conflictDeploymentBlockedForOwner(state, pending.ownerId)) return state;
  const summon = choice === "sandworms" && pending.canSummonSandworms;
  const players = state.players.map((player) => {
    if (!summon && player.id !== spiceRecipient.id) return player;
    if (summon && player.id !== owner.id) return player;
    if (summon) {
      return {
        ...player,
        conflict: player.conflict + pending.sandworms * 3,
        deployedSandworms: player.deployedSandworms + pending.sandworms,
      };
    }
    return {
      ...player,
      resources: { ...player.resources, spice: player.resources.spice + pending.spice },
    };
  });

  const actionLog = summon
    ? `${owner.leader} summons ${pending.sandworms} sandworm${pending.sandworms === 1 ? "" : "s"} from ${pending.source}.`
    : `${spiceRecipient.leader} gains ${pending.spice} spice from ${pending.source}.`;
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [actionLog, ...state.log],
  };
  const postChoiceState = summon
    ? resolvePostDeployIntrigueDraw(nextState, pending.postDeployIntrigueDraw)
    : nextState;
  if (summon) {
    const actor = state.players[state.activeSeat];
    return actor ? recordTurnUnitDeployment(postChoiceState, actor.id, pending.sandworms) : postChoiceState;
  }
  return recordTurnSpiceGainAndCompleteHarvestContracts(postChoiceState, spiceRecipient.id, pending.spice, actionLog).state;
}

export function resolveSietchTabrChoice(
  state: GameState,
  pending: SietchTabrPendingAction,
  choice: "hooks" | "shield-wall",
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const waterOwner = state.players.find((player) => player.id === pending.waterOwnerId);
  if (!owner || !waterOwner) return { ...state, ...advancePendingAction(state) };

  const takeHooks = choice === "hooks";
  const shareMakerHooks = takeHooks && canHaveMakerHooks(owner);
  const recruitedTroops = takeHooks ? Math.min(playerTroopSupply(owner), 1) : 0;
  const players = state.players.map((player) => {
    let next = player;
    if (shareMakerHooks && canHaveMakerHooks(next)) {
      next = { ...next, makerHooks: true };
    }
    if (next.id === owner.id && recruitedTroops > 0) {
      next = { ...next, garrison: next.garrison + recruitedTroops };
    }
    if (next.id === waterOwner.id) {
      next = { ...next, resources: { ...next.resources, water: next.resources.water + 1 } };
    }
    return next;
  });
  const ownerAfter = players.find((player) => player.id === owner.id) ?? owner;
  const deployable = Math.min(ownerAfter.garrison, recruitedTroops + Math.max(0, pending.extraRecruitedTroops ?? 0) + 2);
  const deployPending: PendingAction | undefined = !pending.conflictBlocked && deployable > 0
    ? {
        kind: "deploy",
        ownerId: owner.id,
        remaining: deployable,
        source: pending.source,
        ...(pending.postDeployIntrigueDraw ? { postDeployIntrigueDraw: pending.postDeployIntrigueDraw } : {}),
      }
    : undefined;
  const [nextAction, ...nextQueue] = state.pendingQueue;
  const hookChoiceParts = [
    shareMakerHooks && pending.canTakeMakerHooks ? "takes Maker Hooks" : undefined,
    recruitedTroops > 0 ? "recruits 1 troop" : undefined,
    `${waterOwner.leader} gains 1 water`,
  ].filter((part): part is string => Boolean(part));
  const hookChoiceText = hookChoiceParts.length <= 1
    ? hookChoiceParts[0] ?? ""
    : hookChoiceParts.length === 2
      ? hookChoiceParts.join(" and ")
      : `${hookChoiceParts.slice(0, -1).join(", ")}, and ${hookChoiceParts.at(-1)}`;

  return {
    ...state,
    players,
    shieldWall: takeHooks ? state.shieldWall : false,
    pendingAction: deployPending ?? nextAction,
    pendingQueue: deployPending ? state.pendingQueue : nextQueue,
    log: [
      takeHooks
        ? `${owner.leader} resolves ${pending.source}: ${hookChoiceText}.`
        : `${waterOwner.leader} gains 1 water from ${pending.source}${pending.canRemoveShieldWall ? " and removes the Shield Wall" : ""}.`,
      ...state.log,
    ],
  };
}

export function deployTroopToConflict(state: GameState, pending: DeployPendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (pending.conflictBlocked || conflictDeploymentBlockedForOwner(state, pending.ownerId)) {
    return { ...state, ...advancePendingAction(state) };
  }
  if (!owner || owner.garrison <= 0 || pending.remaining <= 0) return { ...state, ...advancePendingAction(state) };

  const players = state.players.map((player) =>
    player.id === pending.ownerId
      ? {
          ...player,
          garrison: player.garrison - 1,
          conflict: player.conflict + 2,
          deployedTroops: player.deployedTroops + 1,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  const deployedState = {
    ...state,
    players,
    ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${owner.leader} deploys 1 troop from ${pending.source}.`, ...state.log],
  };
  const postDeployState = resolvePostDeployIntrigueDraw(deployedState, pending.postDeployIntrigueDraw);
  const actor = state.players[state.activeSeat];
  return actor ? recordTurnUnitDeployment(postDeployState, actor.id, 1) : postDeployState;
}

export function deployControlDefenseTroop(state: GameState, pending: ControlDefensePendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || playerTroopSupply(owner) <= 0) return { ...state, ...advancePendingAction(state) };

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            conflict: player.conflict + 2,
            deployedTroops: player.deployedTroops + 1,
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} deploys 1 troop from supply to defend ${criticalLocationNames[pending.location]}.`,
      ...state.log,
    ],
  };
}

export function skipControlDefenseTroop(state: GameState, pending: ControlDefensePendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      `${owner?.leader ?? "Player"} declines the defensive deployment for ${pending.source}.`,
      ...state.log,
    ],
  };
}

export function reinforceTroop(
  state: GameState,
  pending: ReinforcePendingAction,
  playerId: string,
  destination: "garrison" | "conflict",
): GameState {
  if (pending.remaining <= 0) return state;
  if (destination === "conflict" && pending.conflictBlocked) return state;
  const recipient = state.players.find((player) => player.id === playerId);
  if (!recipient || recipient.team !== pending.team || recipient.role !== "Ally") return state;
  if (playerTroopSupply(recipient) <= 0) return state;

  const players = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          garrison: destination === "garrison" ? player.garrison + 1 : player.garrison,
          conflict: destination === "conflict" ? player.conflict + 2 : player.conflict,
          deployedTroops: destination === "conflict" ? player.deployedTroops + 1 : player.deployedTroops,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  const teamTroopSupply = players
    .filter((player) => player.team === pending.team && player.role === "Ally")
    .reduce((total, player) => total + playerTroopSupply(player), 0);
  const canContinue = remaining > 0 && teamTroopSupply > 0;
  const reinforcedState = {
    ...state,
    players,
    ...(canContinue ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${recipient.leader} receives Military Support into ${destination}.`, ...state.log],
  };
  const actor = state.players[state.activeSeat];
  return destination === "conflict" && actor
    ? recordTurnUnitDeployment(reinforcedState, actor.id, 1)
    : reinforcedState;
}
