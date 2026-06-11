import {
  battleIconLabels,
  boardSpaces,
  factionIds,
  factionLabels,
  teams,
} from "./data";
import {
  criticalLocationForConflict,
  criticalLocationNames,
} from "./critical-locations";
import {
  conflictBattleRewardForSourceId,
  type ConflictBattleReward,
} from "./conflict-reward-data";
import {
  contenderGroupsByStrength,
  conflictRewardRankLabel,
  lowerRankRewardsAfterSameTeamConcession,
  lowerRankRewardsAfterUniqueWinner,
  pendingActionForCascadingThirdRewardTie,
  rankRewardsForFirstPlaceTie,
  sameTeamConcessionOpportunity,
  sameTeamThirdRewardTieAfterFirstTie,
  type LowerRankRewardAssignment,
} from "./conflict-rankings";
import {
  playerDoublesConflictRewards,
  playerHasConflictUnits,
  sandwormRewardReminderEntries,
} from "./conflict-rules";
import { advancePendingAction, queuePendingActions } from "./pending-actions";
import {
  removeSpyPostOwner,
  normalizeSpyObservationPosts,
  spyObservationPostLabelForSpace,
  spyPostCount,
  spyPostRecallCountForOwner,
} from "./spy-posts";
import {
  placeableSpySpaces,
  recallableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { playerTroopSupply } from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import { mainBoardInfluenceChoices } from "./influence-choices";
import { trashableCards } from "./trash-rules";
import { recordTurnSpyRecall } from "./turn-trackers";
import type {
  BattleIconId,
  ConflictCard,
  FactionId,
  GameState,
  PendingAction,
  Player,
  ResourceId,
} from "./types";

function isStandardBattleIcon(icon: ConflictCard["battleIcon"]): icon is BattleIconId {
  return icon !== "wild";
}

type ConflictVpConversionPendingAction = Extract<PendingAction, { kind: "conflict-vp-conversion" }>;
type ConflictInfluencePendingAction = Extract<PendingAction, { kind: "conflict-influence" }>;
type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type TrashPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

const resourceIds: ResourceId[] = ["solari", "spice", "water"];

function canPayConflictConversion(
  state: GameState,
  owner: Player,
  conversion: ConflictBattleReward["conversion"],
) {
  if (!conversion) return false;
  if (conversion.kind === "resource") return owner.resources[conversion.resource] >= conversion.amount;
  return spyPostCount(state, owner.id) >= conversion.count;
}

function pendingActionsForConflictInfluence(
  owner: Player,
  conflict: ConflictCard,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
): ConflictInfluencePendingAction[] {
  const choices = reward?.influenceChoices ?? 0;
  if (choices <= 0) return [];
  if (reward?.influenceChoiceOptions) {
    return Array.from({ length: multiplier }, () => ({
      kind: "conflict-influence",
      ownerId: owner.id,
      source: conflict.name,
      remaining: choices,
      choices: reward.influenceChoiceOptions,
    }));
  }
  return [{
    kind: "conflict-influence",
    ownerId: owner.id,
    source: conflict.name,
    remaining: choices * multiplier,
  }];
}

function pendingActionForConflictConversion(
  state: GameState,
  owner: Player,
  conflict: ConflictCard,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
): ConflictVpConversionPendingAction | undefined {
  const conversion = reward?.conversion;
  const delayedInfluenceMayEnablePayment = (reward?.influenceChoices ?? 0) > 0;
  if (!conversion || (!delayedInfluenceMayEnablePayment && !canPayConflictConversion(state, owner, conversion))) {
    return undefined;
  }
  if (conversion.kind === "resource") {
    return {
      kind: "conflict-vp-conversion",
      ownerId: owner.id,
      source: conflict.name,
      remaining: multiplier,
      vp: conversion.vp,
      cost: {
        kind: "resource",
        resource: conversion.resource,
        amount: conversion.amount,
      },
    };
  }
  return {
    kind: "conflict-vp-conversion",
    ownerId: owner.id,
    source: conflict.name,
    remaining: multiplier,
    vp: conversion.vp,
    cost: {
      kind: "recall-spies",
      count: conversion.count,
      recalled: 0,
    },
  };
}

function pendingActionsForContractReward(
  state: GameState,
  owner: Player,
  conflict: ConflictCard,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
): ContractPendingAction[] {
  const requested = (reward?.contracts ?? 0) * multiplier;
  const availablePublicContracts = state.contractOffer.length > 0
    ? state.contractOffer.length + state.contractDeck.length
    : 0;
  const count = Math.min(requested, availablePublicContracts);
  return Array.from({ length: count }, () => ({
    kind: "contract",
    ownerId: owner.id,
    publicOnly: true,
    source: conflict.name,
  }));
}

function pendingActionsForTrashReward(
  owner: Player,
  conflict: ConflictCard,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
): TrashPendingAction[] {
  const requested = (reward?.trashCards ?? 0) * multiplier;
  const count = Math.min(requested, trashableCards(owner).length);
  return Array.from({ length: count }, () => ({
    kind: "trash-card",
    ownerId: owner.id,
    optional: false,
    source: conflict.name,
  }));
}

function conflictConversionDescription(pending: ConflictVpConversionPendingAction) {
  if (pending.cost.kind === "resource") {
    return `${pending.cost.amount} ${pending.cost.resource} for ${pending.vp} VP`;
  }
  return `recall ${pending.cost.count} spies for ${pending.vp} VP`;
}

function pendingActionForSpyReward(
  state: GameState,
  owner: Player,
  conflict: ConflictCard,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
): SpyPendingAction | undefined {
  const remaining = (reward?.spies ?? 0) * multiplier;
  if (remaining <= 0) return undefined;
  const pending: SpyPendingAction = {
    kind: "spy",
    ownerId: owner.id,
    remaining,
    source: conflict.name,
    recallForSupply: true,
  };
  return placeableSpySpaces(state, pending).length > 0 ||
    recallableSpySupplySpaces(state, pending).length > 0
    ? pending
    : undefined;
}

function joinRewardParts(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function applyImmediatePrintedReward(
  player: Player,
  reward: ConflictBattleReward | undefined,
  multiplier: number,
) {
  const resourceGains = resourceIds.reduce<Partial<Record<ResourceId, number>>>((gains, resource) => {
    const amount = (reward?.resources?.[resource] ?? 0) * multiplier;
    if (amount > 0) gains[resource] = amount;
    return gains;
  }, {});
  const influenceGains = factionIds.reduce<Partial<Record<FactionId, number>>>((gains, faction) => {
    const amount = (reward?.influence?.[faction] ?? 0) * multiplier;
    if (amount > 0) gains[faction] = amount;
    return gains;
  }, {});
  const recruitedTroops = Math.min(playerTroopSupply(player), (reward?.troops ?? 0) * multiplier);
  const resources = { ...player.resources };
  for (const resource of resourceIds) {
    resources[resource] += resourceGains[resource] ?? 0;
  }
  const rewardedPlayer = factionIds.reduce(
    (nextPlayer, faction) => {
      const amount = influenceGains[faction] ?? 0;
      return amount > 0 ? adjustInfluence(nextPlayer, faction, amount) : nextPlayer;
    },
    { ...player, resources, garrison: player.garrison + recruitedTroops },
  );
  return {
    player: rewardedPlayer,
    influenceGains,
    resourceGains,
    recruitedTroops,
  };
}

function immediatePrintedRewardDescription(
  resourceGains: Partial<Record<ResourceId, number>>,
  influenceGains: Partial<Record<FactionId, number>>,
  recruitedTroops: number,
) {
  const resourceParts = resourceIds.flatMap((resource) => {
    const amount = resourceGains[resource] ?? 0;
    return amount > 0 ? [`${amount} ${resource}`] : [];
  });
  const influenceParts = factionIds.flatMap((faction) => {
    const amount = influenceGains[faction] ?? 0;
    return amount > 0 ? [`${amount} ${factionLabels[faction]} Influence`] : [];
  });
  const gainParts = [...resourceParts, ...influenceParts];
  const actions = [
    gainParts.length > 0 ? `gains ${joinRewardParts(gainParts)}` : undefined,
    recruitedTroops > 0 ? `recruits ${recruitedTroops} troop${recruitedTroops === 1 ? "" : "s"}` : undefined,
  ].filter((action): action is string => Boolean(action));
  return joinRewardParts(actions);
}

function scoreBattleIconMatch(player: Player, conflict: ConflictCard) {
  const wonConflict: ConflictCard = { ...conflict, rewards: [...conflict.rewards], scored: false };
  if (!isStandardBattleIcon(conflict.battleIcon)) {
    return {
      player: { ...player, wonConflicts: [...player.wonConflicts, wonConflict] },
      matched: false,
      icon: conflict.battleIcon,
    };
  }

  const objectiveIndex = player.objectives.findIndex(
    (objective) => !objective.scored && objective.battleIcon === conflict.battleIcon,
  );
  if (objectiveIndex >= 0) {
    const objectives = player.objectives.map((objective, index) =>
      index === objectiveIndex ? { ...objective, scored: true } : objective,
    );
    return {
      player: {
        ...player,
        vp: player.vp + 1,
        objectives,
        wonConflicts: [...player.wonConflicts, { ...wonConflict, scored: true }],
      },
      matched: true,
      icon: conflict.battleIcon,
    };
  }

  const conflictIndex = player.wonConflicts.findIndex(
    (candidate) => !candidate.scored && candidate.battleIcon === conflict.battleIcon,
  );
  if (conflictIndex >= 0) {
    const wonConflicts = player.wonConflicts.map((candidate, index) =>
      index === conflictIndex ? { ...candidate, scored: true } : candidate,
    );
    return {
      player: {
        ...player,
        vp: player.vp + 1,
        wonConflicts: [...wonConflicts, { ...wonConflict, scored: true }],
      },
      matched: true,
      icon: conflict.battleIcon,
    };
  }

  return {
    player: { ...player, wonConflicts: [...player.wonConflicts, wonConflict] },
    matched: false,
    icon: conflict.battleIcon,
  };
}

function applyRankReward(state: GameState, conflict: ConflictCard, assignment: LowerRankRewardAssignment): GameState {
  const owner = state.players.find((player) => player.id === assignment.playerId);
  if (!owner) return state;
  const reward = conflictBattleRewardForSourceId(conflict.sourceId, assignment.rank);
  const rankLabel = conflictRewardRankLabel(assignment.rank);
  const multiplier = playerDoublesConflictRewards(owner) ? 2 : 1;
  const printedVp = (reward?.fixedVp ?? 0) * multiplier;
  const intrigueDraws = (reward?.intrigues ?? 0) * multiplier;
  const conversionPending = pendingActionForConflictConversion(state, owner, conflict, reward, multiplier);
  const influencePendingActions = pendingActionsForConflictInfluence(owner, conflict, reward, multiplier);
  const contractPendingActions = pendingActionsForContractReward(state, owner, conflict, reward, multiplier);
  const trashPendingActions = pendingActionsForTrashReward(owner, conflict, reward, multiplier);
  const spyPending = pendingActionForSpyReward(state, owner, conflict, reward, multiplier);
  const rewardPendingActions: PendingAction[] = [];
  rewardPendingActions.push(...influencePendingActions);
  rewardPendingActions.push(...contractPendingActions);
  rewardPendingActions.push(...trashPendingActions);
  if (conversionPending) rewardPendingActions.push(conversionPending);
  if (spyPending) rewardPendingActions.push(spyPending);
  const immediatePrintedReward = applyImmediatePrintedReward(owner, reward, multiplier);
  const immediateRewardText = immediatePrintedRewardDescription(
    immediatePrintedReward.resourceGains,
    immediatePrintedReward.influenceGains,
    immediatePrintedReward.recruitedTroops,
  );
  const rewardedPlayer = printedVp > 0
    ? { ...immediatePrintedReward.player, vp: immediatePrintedReward.player.vp + printedVp }
    : immediatePrintedReward.player;
  let rewardedState: GameState = {
    ...state,
    ...queuePendingActions(state, rewardPendingActions),
    players: state.players.map((player) => (player.id === owner.id ? rewardedPlayer : player)),
    log: [
      conversionPending
        ? `${owner.leader} may pay ${conflictConversionDescription(conversionPending)} from the ${rankLabel} reward on ${conflict.name}${conversionPending.remaining > 1 ? ` up to ${conversionPending.remaining} times` : ""}.`
        : undefined,
      influencePendingActions.length > 0
        ? `${owner.leader} may gain ${influencePendingActions.reduce((sum, action) => sum + action.remaining, 0)} Influence from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      contractPendingActions.length > 0
        ? `${owner.leader} must take ${contractPendingActions.length} face-up CHOAM contract${contractPendingActions.length === 1 ? "" : "s"} from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      trashPendingActions.length > 0
        ? `${owner.leader} must trash ${trashPendingActions.length} card${trashPendingActions.length === 1 ? "" : "s"} from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      spyPending
        ? `${owner.leader} may place ${spyPending.remaining} ${spyPending.remaining === 1 ? "spy" : "spies"} from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      immediateRewardText
        ? `${owner.leader} ${immediateRewardText} from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      printedVp > 0
        ? `${owner.leader} gains ${printedVp} printed VP from the ${rankLabel} reward on ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      ...state.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
  if (intrigueDraws > 0) {
    rewardedState = drawIntrigueCards(rewardedState, owner.id, intrigueDraws, `${rankLabel} reward on ${conflict.name}`);
  }
  const gainedInfluence = Object.values(immediatePrintedReward.influenceGains).some((amount) => amount > 0);
  return gainedInfluence
    ? resolveLeaderInfluenceThresholdRewards(rewardedState, state.players)
    : rewardedState;
}

function applyRankRewards(
  state: GameState,
  conflict: ConflictCard,
  assignments: LowerRankRewardAssignment[],
) {
  return assignments.reduce((nextState, assignment) => applyRankReward(nextState, conflict, assignment), state);
}

function awardConflictToWinner(
  state: GameState,
  winner: Player,
  conflict: ConflictCard,
  rewardReminderEntries: string[] = [],
): GameState {
  const firstPlaceReward = conflictBattleRewardForSourceId(conflict.sourceId, 1);
  const multiplier = playerDoublesConflictRewards(winner) ? 2 : 1;
  const printedVp = (firstPlaceReward?.fixedVp ?? 0) * multiplier;
  const intrigueDraws = (firstPlaceReward?.intrigues ?? 0) * multiplier;
  const conversionPending = pendingActionForConflictConversion(
    state,
    winner,
    conflict,
    firstPlaceReward,
    multiplier,
  );
  const influencePendingActions = pendingActionsForConflictInfluence(winner, conflict, firstPlaceReward, multiplier);
  const contractPendingActions = pendingActionsForContractReward(state, winner, conflict, firstPlaceReward, multiplier);
  const trashPendingActions = pendingActionsForTrashReward(winner, conflict, firstPlaceReward, multiplier);
  const spyPending = pendingActionForSpyReward(state, winner, conflict, firstPlaceReward, multiplier);
  const rewardPendingActions: PendingAction[] = [];
  rewardPendingActions.push(...influencePendingActions);
  rewardPendingActions.push(...contractPendingActions);
  rewardPendingActions.push(...trashPendingActions);
  if (conversionPending) rewardPendingActions.push(conversionPending);
  if (spyPending) rewardPendingActions.push(spyPending);
  const [rewardPendingAction, ...queuedRewardActions] = rewardPendingActions;
  const location = criticalLocationForConflict(conflict);
  const immediatePrintedReward = applyImmediatePrintedReward(winner, firstPlaceReward, multiplier);
  const immediateRewardText = immediatePrintedRewardDescription(
    immediatePrintedReward.resourceGains,
    immediatePrintedReward.influenceGains,
    immediatePrintedReward.recruitedTroops,
  );
  const winnerWithPrintedRewards = printedVp > 0
    ? { ...immediatePrintedReward.player, vp: immediatePrintedReward.player.vp + printedVp }
    : immediatePrintedReward.player;
  const scored = scoreBattleIconMatch(winnerWithPrintedRewards, conflict);
  const players = state.players.map((player) => (player.id === winner.id ? scored.player : player));
  let awardedState: GameState = {
    ...state,
    players,
    locationControl: location
      ? { ...state.locationControl, [location]: winner.id }
      : state.locationControl,
    conflict: null,
    pendingAction: rewardPendingAction ?? state.pendingAction,
    pendingQueue: rewardPendingActions.length > 0
      ? [
          ...queuedRewardActions,
          ...(state.pendingAction ? [state.pendingAction, ...state.pendingQueue] : state.pendingQueue),
        ]
      : state.pendingQueue,
    log: [
      scored.matched && isStandardBattleIcon(scored.icon)
        ? `${winner.leader} matches ${battleIconLabels[scored.icon]} battle icons and gains 1 VP.`
        : undefined,
      conversionPending
        ? `${winner.leader} may pay ${conflictConversionDescription(conversionPending)} from ${conflict.name}${conversionPending.remaining > 1 ? ` up to ${conversionPending.remaining} times` : ""}.`
        : undefined,
      influencePendingActions.length > 0
        ? `${winner.leader} may gain ${influencePendingActions.reduce((sum, action) => sum + action.remaining, 0)} Influence from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      contractPendingActions.length > 0
        ? `${winner.leader} must take ${contractPendingActions.length} face-up CHOAM contract${contractPendingActions.length === 1 ? "" : "s"} from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      trashPendingActions.length > 0
        ? `${winner.leader} must trash ${trashPendingActions.length} card${trashPendingActions.length === 1 ? "" : "s"} from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      spyPending
        ? `${winner.leader} may place ${spyPending.remaining} ${spyPending.remaining === 1 ? "spy" : "spies"} from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      location
        ? `${winner.leader} takes control of ${criticalLocationNames[location]}.`
        : undefined,
      immediateRewardText
        ? `${winner.leader} ${immediateRewardText} from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      printedVp > 0
        ? `${winner.leader} gains ${printedVp} printed VP from ${conflict.name}${multiplier > 1 ? " with sandworm doubling" : ""}.`
        : undefined,
      `${winner.leader} wins ${conflict.name} and takes the Conflict card.`,
      ...rewardReminderEntries,
      ...state.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
  if (intrigueDraws > 0) {
    awardedState = drawIntrigueCards(awardedState, winner.id, intrigueDraws, conflict.name);
  }
  const gainedInfluence = Object.values(immediatePrintedReward.influenceGains).some((amount) => amount > 0);
  return gainedInfluence
    ? resolveLeaderInfluenceThresholdRewards(awardedState, state.players)
    : awardedState;
}

function conflictInfluenceChoices(pending: ConflictInfluencePendingAction) {
  return pending.choices ?? mainBoardInfluenceChoices;
}

function matchingConflictInfluencePending(first: ConflictInfluencePendingAction, second: ConflictInfluencePendingAction) {
  return (
    first.ownerId === second.ownerId &&
    first.source === second.source &&
    first.remaining === second.remaining &&
    JSON.stringify(first.choices ?? null) === JSON.stringify(second.choices ?? null)
  );
}

export function gainConflictInfluenceForPending(
  state: GameState,
  pending: ConflictInfluencePendingAction,
  faction: FactionId,
): GameState {
  if (state.pendingAction?.kind !== "conflict-influence") return state;
  if (!matchingConflictInfluencePending(state.pendingAction, pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !conflictInfluenceChoices(pending).includes(faction)) return state;

  const previousPlayers = state.players;
  const remaining = pending.remaining - 1;
  const choices = pending.choices?.filter((choice) => choice !== faction);
  const nextPending =
    remaining > 0
      ? { pendingAction: { ...pending, remaining, choices }, pendingQueue: state.pendingQueue }
      : advancePendingAction(state);
  const influencedState: GameState = {
    ...state,
    ...nextPending,
    players: state.players.map((player) =>
      player.id === owner.id ? adjustInfluence(player, faction, 1) : player,
    ),
    log: [
      `${owner.leader} gains 1 ${factionLabels[faction]} Influence from ${pending.source}.`,
      ...state.log,
    ],
  };
  return skipUnpayableConflictConversion(
    resolveLeaderInfluenceThresholdRewards(influencedState, previousPlayers),
  );
}

function skipUnpayableConflictConversion(state: GameState) {
  const pending = state.pendingAction;
  if (pending?.kind !== "conflict-vp-conversion" || canPayConflictVpConversion(state, pending)) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      `${owner?.leader ?? "Player"} cannot pay the VP conversion from ${pending.source}.`,
      ...state.log,
    ],
  };
}

export function conflictVpConversionSpyChoices(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
) {
  if (pending.cost.kind !== "recall-spies") return [];
  const choices = recallableSpySpaces(state, {
    kind: "recall-spy",
    ownerId: pending.ownerId,
    combatRecipientId: pending.ownerId,
    remaining: 1,
    strength: 0,
    source: pending.source,
    optional: false,
  });
  const needed = pending.cost.count - pending.cost.recalled;
  const recallCredit = choices.reduce(
    (total, choice) => total + spyPostRecallCountForOwner(state, choice.id, pending.ownerId),
    0,
  );
  return recallCredit >= needed ? choices : [];
}

export function canPayConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
) {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return false;
  if (pending.cost.kind === "resource") {
    return owner.resources[pending.cost.resource] >= pending.cost.amount;
  }
  const needed = pending.cost.count - pending.cost.recalled;
  return needed <= 0 || conflictVpConversionSpyChoices(state, pending).length > 0;
}

export function payConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || pending.cost.kind !== "resource" || !canPayConflictVpConversion(state, pending)) return state;

  const cost = pending.cost;
  const remaining = pending.remaining - 1;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            vp: player.vp + pending.vp,
            resources: {
              ...player.resources,
              [cost.resource]: player.resources[cost.resource] - cost.amount,
            },
          }
        : player,
    ),
    ...(remaining > 0
      ? { pendingAction: { ...pending, remaining } }
      : advancePendingAction(state)),
    log: [
      `${owner.leader} spends ${cost.amount} ${cost.resource} from ${pending.source} for ${pending.vp} VP.`,
      ...state.log,
    ],
  };
}

export function recallSpyForConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
  spaceId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || pending.cost.kind !== "recall-spies") return state;
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  const choices = conflictVpConversionSpyChoices(state, pending);
  if (!space || !choices.some((choice) => choice.id === space.id)) return state;

  const { spyPosts, sharedSpyPosts, removedSpyCount } = removeSpyPostOwner(state, space.id, owner.id);
  const recalled = pending.cost.recalled + Math.max(1, removedSpyCount);
  const completedConversions = Math.min(pending.remaining, Math.floor(recalled / pending.cost.count));
  const conversionComplete = completedConversions > 0;
  const remaining = pending.remaining - completedConversions;
  const remainingRecallCredit = remaining > 0
    ? recallableSpySpaces(
        {
          ...state,
          spyPosts,
          sharedSpyPosts,
        },
        {
          kind: "recall-spy",
          ownerId: pending.ownerId,
          combatRecipientId: pending.ownerId,
          remaining: 1,
          strength: 0,
          source: pending.source,
          optional: false,
        },
      ).reduce(
        (total, choice) => total + spyPostRecallCountForOwner({ spyPosts, sharedSpyPosts }, choice.id, pending.ownerId),
        0,
      )
    : 0;
  const surplusRecalled = recalled % pending.cost.count;
  const carriedRecalled = remaining > 0 && surplusRecalled + remainingRecallCredit >= pending.cost.count
    ? surplusRecalled
    : 0;
  const scoredVp = pending.vp * completedConversions;
  const nextPending: ConflictVpConversionPendingAction = {
    ...pending,
    remaining,
    cost: {
      ...pending.cost,
      recalled: conversionComplete ? carriedRecalled : recalled,
    },
  };

  const recalledState = recordTurnSpyRecall({
    ...state,
    players: state.players.map((player) => {
      if (player.id !== owner.id) return player;
      return {
        ...player,
        spies: player.spies + removedSpyCount,
        vp: conversionComplete ? player.vp + scoredVp : player.vp,
      };
    }),
    spyPosts,
    sharedSpyPosts,
    ...(conversionComplete
      ? remaining > 0
        ? { pendingAction: nextPending }
        : advancePendingAction(state)
      : { pendingAction: nextPending }),
    log: [
      conversionComplete
        ? `${owner.leader} recalls a spy from ${spyObservationPostLabelForSpace(space.id)} and completes ${pending.source} for ${scoredVp} VP.`
        : `${owner.leader} recalls a spy from ${spyObservationPostLabelForSpace(space.id)} for ${pending.source} (${recalled}/${pending.cost.count}).`,
      ...state.log,
    ],
  }, owner.id, Math.max(1, removedSpyCount));
  return conversionComplete ? normalizeSpyObservationPosts(recalledState) : recalledState;
}

export function skipConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (pending.cost.kind === "recall-spies" && pending.cost.recalled > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return normalizeSpyObservationPosts({
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines the remaining VP conversion from ${pending.source}.`, ...state.log],
  });
}

export function resolveCurrentConflict(state: GameState): GameState {
  if (!state.conflict) return state;

  const contenders = state.players.filter(
    (player) => player.role === "Ally" && playerHasConflictUnits(player) && player.conflict > 0,
  );
  const rewardReminderEntries = sandwormRewardReminderEntries(contenders);
  const bestStrength = Math.max(0, ...contenders.map((player) => player.conflict));
  const winners = contenders.filter((player) => player.conflict === bestStrength);
  const concessionOpportunity = sameTeamConcessionOpportunity(contenders);

  if (concessionOpportunity) {
    return {
      ...state,
      pendingAction: {
        kind: "conflict-tie",
        team: concessionOpportunity.team,
        tiedPlayerIds: concessionOpportunity.tiedPlayerIds,
        strength: concessionOpportunity.strength,
        rank: concessionOpportunity.rank,
        source: state.conflict.name,
      },
      log: [
        `${teams[concessionOpportunity.team].name} Allies tie for the ${conflictRewardRankLabel(concessionOpportunity.rank)} reward on ${state.conflict.name}; choose whether one Ally concedes the greater reward.`,
        ...state.log,
      ],
    };
  }

  if (winners.length !== 1) {
    const reason = bestStrength === 0
      ? `${state.conflict.name} resolves with no winner.`
      : `${state.conflict.name} ends tied at ${bestStrength} strength; no one takes the Conflict card.`;
    return applyRankRewards({
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      log: [reason, ...rewardReminderEntries, ...state.log],
    }, state.conflict, rankRewardsForFirstPlaceTie(contenders));
  }

  return applyRankRewards(
    awardConflictToWinner(state, winners[0], state.conflict, rewardReminderEntries),
    state.conflict,
    lowerRankRewardsAfterUniqueWinner(contenders, winners[0].id),
  );
}

type ConflictTiePendingAction = Extract<PendingAction, { kind: "conflict-tie" }>;

export function resolveConflictTie(
  state: GameState,
  pending: ConflictTiePendingAction,
  winnerId?: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (!state.conflict) return state;

  const contenders = state.players.filter(
    (player) => player.role === "Ally" && playerHasConflictUnits(player) && player.conflict > 0,
  );
  const rewardReminderEntries = sandwormRewardReminderEntries(contenders);

  if (!winnerId) {
    if (pending.resolvedRankRewards) {
      const clearedTieState = { ...state, ...advancePendingAction(state) };
      const conflictWinner = pending.conflictWinnerId
        ? state.players.find((player) => player.id === pending.conflictWinnerId)
        : undefined;
      if (pending.conflictWinnerId && !conflictWinner) return state;
      const baseAwarded = conflictWinner
        ? awardConflictToWinner(clearedTieState, conflictWinner, state.conflict, rewardReminderEntries)
        : {
            ...clearedTieState,
            conflict: null,
            conflictDiscard: [...state.conflictDiscard, state.conflict],
            log: [
              `${state.conflict.name} ends without a winner; no one takes the Conflict card.`,
              ...rewardReminderEntries,
              ...clearedTieState.log,
            ],
          };
      const awarded = applyRankRewards(baseAwarded, state.conflict, pending.resolvedRankRewards);
      return {
        ...awarded,
        log: [
          `No Ally concedes the ${conflictRewardRankLabel(pending.rank)} reward on ${state.conflict.name}.`,
          ...awarded.log,
        ],
      };
    }
    if (pending.rank > 1) {
      const winner = contenderGroupsByStrength(contenders)[0]?.[0];
      if (!winner) return state;
      const clearedTieState = { ...state, ...advancePendingAction(state) };
      const awarded = applyRankRewards(
        awardConflictToWinner(clearedTieState, winner, state.conflict, rewardReminderEntries),
        state.conflict,
        lowerRankRewardsAfterUniqueWinner(contenders, winner.id),
      );
      return {
        ...awarded,
        log: [
          `No Ally concedes the ${conflictRewardRankLabel(pending.rank)} reward on ${state.conflict.name}.`,
          ...awarded.log,
        ],
      };
    }
    const cascadingThirdTie = sameTeamThirdRewardTieAfterFirstTie(contenders, pending.tiedPlayerIds);
    if (cascadingThirdTie) {
      return {
        ...state,
        ...advancePendingAction(state),
        pendingAction: pendingActionForCascadingThirdRewardTie(
          state.conflict,
          cascadingThirdTie,
          null,
          rankRewardsForFirstPlaceTie(contenders),
        ),
        log: [
          `No Ally concedes ${state.conflict.name}; no one takes the Conflict card.`,
          `${teams[cascadingThirdTie[0].team].name} Allies tie for the third-place reward on ${state.conflict.name}; choose whether one Ally concedes the greater reward.`,
          ...state.log,
        ],
      };
    }
    return applyRankRewards({
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      ...advancePendingAction(state),
      log: [
        `No Ally concedes ${state.conflict.name}; no one takes the Conflict card.`,
        ...rewardReminderEntries,
        ...state.log,
      ],
    }, state.conflict, rankRewardsForFirstPlaceTie(contenders));
  }

  const winner = state.players.find((player) =>
    player.id === winnerId &&
    player.team === pending.team &&
    pending.tiedPlayerIds.includes(player.id) &&
    player.role === "Ally"
  );
  if (!winner) return state;
  if (pending.resolvedRankRewards) {
    const clearedTieState = { ...state, ...advancePendingAction(state) };
    const conflictWinner = pending.conflictWinnerId
      ? state.players.find((player) => player.id === pending.conflictWinnerId)
      : undefined;
    if (pending.conflictWinnerId && !conflictWinner) return state;
    const baseAwarded = conflictWinner
      ? awardConflictToWinner(clearedTieState, conflictWinner, state.conflict, rewardReminderEntries)
      : {
          ...clearedTieState,
          conflict: null,
          conflictDiscard: [...state.conflictDiscard, state.conflict],
          log: [
            `${state.conflict.name} ends without a winner; no one takes the Conflict card.`,
            ...rewardReminderEntries,
            ...clearedTieState.log,
          ],
        };
    const awarded = applyRankRewards(
      baseAwarded,
      state.conflict,
      [...pending.resolvedRankRewards, { playerId: winner.id, rank: pending.rank === 2 ? 2 : 3 }],
    );
    return {
      ...awarded,
      log: [
        `${winner.leader} takes the ${conflictRewardRankLabel(pending.rank)} reward after a same-team tie concession.`,
        ...awarded.log,
      ],
    };
  }
  if (pending.rank === 1) {
    const cascadingThirdTie = sameTeamThirdRewardTieAfterFirstTie(contenders, pending.tiedPlayerIds);
    if (cascadingThirdTie) {
      return {
        ...state,
        ...advancePendingAction(state),
        pendingAction: pendingActionForCascadingThirdRewardTie(
          state.conflict,
          cascadingThirdTie,
          winner.id,
          lowerRankRewardsAfterSameTeamConcession(contenders, pending.tiedPlayerIds, winner.id, pending.rank),
        ),
        log: [
          `${winner.leader} takes the ${conflictRewardRankLabel(pending.rank)} reward after a same-team tie concession.`,
          `${teams[cascadingThirdTie[0].team].name} Allies tie for the third-place reward on ${state.conflict.name}; choose whether one Ally concedes the greater reward.`,
          ...state.log,
        ],
      };
    }
  }
  const clearedTieState = { ...state, ...advancePendingAction(state) };
  const conflictWinner = pending.rank === 1 ? winner : contenderGroupsByStrength(contenders)[0]?.[0];
  if (!conflictWinner) return state;
  const awarded = applyRankRewards(
    awardConflictToWinner(
      clearedTieState,
      conflictWinner,
      state.conflict,
      rewardReminderEntries,
    ),
    state.conflict,
    lowerRankRewardsAfterSameTeamConcession(contenders, pending.tiedPlayerIds, winner.id, pending.rank),
  );
  return {
    ...awarded,
    log: [
      `${winner.leader} takes the ${conflictRewardRankLabel(pending.rank)} reward after a same-team tie concession.`,
      ...awarded.log,
    ],
  };
}
