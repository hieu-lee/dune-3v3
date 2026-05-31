import {
  battleIconLabels,
  boardSpaces,
  teams,
} from "./data";
import {
  criticalLocationForConflict,
  criticalLocationNames,
} from "./critical-locations";
import {
  playerDoublesConflictRewards,
  playerHasConflictUnits,
  sandwormRewardReminderEntries,
} from "./conflict-rules";
import { advancePendingAction } from "./pending-actions";
import {
  playerHasSpyPost,
  removeSpyPostOwner,
} from "./spy-posts";
import { playerTroopSupply } from "./deck-utils";
import type {
  BattleIconId,
  ConflictCard,
  GameState,
  PendingAction,
  Player,
  ResourceId,
} from "./types";

function isStandardBattleIcon(icon: ConflictCard["battleIcon"]): icon is BattleIconId {
  return icon !== "wild";
}

type FirstPlaceBattleReward = {
  fixedVp: number;
  resources?: Partial<Record<ResourceId, number>>;
  troops?: number;
  conversion?:
    | { kind: "resource"; resource: ResourceId; amount: number; vp: number }
    | { kind: "recall-spies"; count: number; vp: number };
};
type ConflictVpConversionPendingAction = Extract<PendingAction, { kind: "conflict-vp-conversion" }>;

const resourceIds: ResourceId[] = ["solari", "spice", "water"];

const firstPlaceBattleRewardsBySourceId: Record<number, FirstPlaceBattleReward> = {
  460: {
    fixedVp: 0,
    resources: { spice: 2 },
    troops: 1,
  },
  464: {
    fixedVp: 1,
    conversion: { kind: "resource", resource: "spice", amount: 4, vp: 1 },
  },
  465: {
    fixedVp: 1,
    conversion: { kind: "recall-spies", count: 2, vp: 1 },
  },
  466: {
    fixedVp: 1,
    conversion: { kind: "resource", resource: "solari", amount: 6, vp: 1 },
  },
};

function canPayConflictConversion(
  state: GameState,
  owner: Player,
  conversion: FirstPlaceBattleReward["conversion"],
) {
  if (!conversion) return false;
  if (conversion.kind === "resource") return owner.resources[conversion.resource] >= conversion.amount;
  return boardSpaces.filter((space) => playerHasSpyPost(state, space.id, owner.id)).length >= conversion.count;
}

function pendingActionForConflictConversion(
  state: GameState,
  owner: Player,
  conflict: ConflictCard,
  reward: FirstPlaceBattleReward | undefined,
  multiplier: number,
): ConflictVpConversionPendingAction | undefined {
  const conversion = reward?.conversion;
  if (!conversion || !canPayConflictConversion(state, owner, conversion)) return undefined;
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

function conflictConversionDescription(pending: ConflictVpConversionPendingAction) {
  if (pending.cost.kind === "resource") {
    return `${pending.cost.amount} ${pending.cost.resource} for ${pending.vp} VP`;
  }
  return `recall ${pending.cost.count} spies for ${pending.vp} VP`;
}

function joinRewardParts(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function applyImmediateFirstPlacePrintedReward(
  player: Player,
  reward: FirstPlaceBattleReward | undefined,
  multiplier: number,
) {
  const resourceGains = resourceIds.reduce<Partial<Record<ResourceId, number>>>((gains, resource) => {
    const amount = (reward?.resources?.[resource] ?? 0) * multiplier;
    if (amount > 0) gains[resource] = amount;
    return gains;
  }, {});
  const recruitedTroops = Math.min(playerTroopSupply(player), (reward?.troops ?? 0) * multiplier);
  const resources = { ...player.resources };
  for (const resource of resourceIds) {
    resources[resource] += resourceGains[resource] ?? 0;
  }
  return {
    player: {
      ...player,
      resources,
      garrison: player.garrison + recruitedTroops,
    },
    resourceGains,
    recruitedTroops,
  };
}

function immediatePrintedRewardDescription(
  resourceGains: Partial<Record<ResourceId, number>>,
  recruitedTroops: number,
) {
  const gainParts = resourceIds.flatMap((resource) => {
    const amount = resourceGains[resource] ?? 0;
    return amount > 0 ? [`${amount} ${resource}`] : [];
  });
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

function awardConflictToWinner(
  state: GameState,
  winner: Player,
  conflict: ConflictCard,
  rewardReminderEntries: string[] = [],
): GameState {
  const firstPlaceReward = conflict.sourceId ? firstPlaceBattleRewardsBySourceId[conflict.sourceId] : undefined;
  const multiplier = playerDoublesConflictRewards(winner) ? 2 : 1;
  const printedVp = (firstPlaceReward?.fixedVp ?? 0) * multiplier;
  const conversionPending = pendingActionForConflictConversion(
    state,
    winner,
    conflict,
    firstPlaceReward,
    multiplier,
  );
  const location = criticalLocationForConflict(conflict);
  const immediatePrintedReward = applyImmediateFirstPlacePrintedReward(winner, firstPlaceReward, multiplier);
  const immediateRewardText = immediatePrintedRewardDescription(
    immediatePrintedReward.resourceGains,
    immediatePrintedReward.recruitedTroops,
  );
  const winnerWithPrintedRewards = printedVp > 0
    ? { ...immediatePrintedReward.player, vp: immediatePrintedReward.player.vp + printedVp }
    : immediatePrintedReward.player;
  const scored = scoreBattleIconMatch(winnerWithPrintedRewards, conflict);
  const players = state.players.map((player) => (player.id === winner.id ? scored.player : player));
  return {
    ...state,
    players,
    locationControl: location
      ? { ...state.locationControl, [location]: winner.id }
      : state.locationControl,
    conflict: null,
    pendingAction: conversionPending ?? state.pendingAction,
    log: [
      scored.matched && isStandardBattleIcon(scored.icon)
        ? `${winner.leader} matches ${battleIconLabels[scored.icon]} battle icons and gains 1 VP.`
        : undefined,
      conversionPending
        ? `${winner.leader} may pay ${conflictConversionDescription(conversionPending)} from ${conflict.name}${conversionPending.remaining > 1 ? ` up to ${conversionPending.remaining} times` : ""}.`
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
}

export function conflictVpConversionSpyChoices(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
) {
  if (pending.cost.kind !== "recall-spies") return [];
  const choices = boardSpaces.filter((space) => playerHasSpyPost(state, space.id, pending.ownerId));
  const needed = pending.cost.count - pending.cost.recalled;
  return choices.length >= needed ? choices : [];
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
  return conflictVpConversionSpyChoices(state, pending).length >= pending.cost.count - pending.cost.recalled;
}

export function payConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
): GameState {
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
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || pending.cost.kind !== "recall-spies") return state;
  const space = boardSpaces.find((candidate) => candidate.id === spaceId);
  const choices = conflictVpConversionSpyChoices(state, pending);
  if (!space || !choices.some((choice) => choice.id === space.id)) return state;

  const { spyPosts, sharedSpyPosts } = removeSpyPostOwner(state, space.id, owner.id);
  const recalled = pending.cost.recalled + 1;
  const conversionComplete = recalled >= pending.cost.count;
  const remaining = conversionComplete ? pending.remaining - 1 : pending.remaining;
  const nextPending: ConflictVpConversionPendingAction = {
    ...pending,
    remaining,
    cost: {
      ...pending.cost,
      recalled: conversionComplete ? 0 : recalled,
    },
  };

  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== owner.id) return player;
      return {
        ...player,
        spies: player.spies + 1,
        vp: conversionComplete ? player.vp + pending.vp : player.vp,
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
        ? `${owner.leader} recalls a spy from ${space.name} and completes ${pending.source} for ${pending.vp} VP.`
        : `${owner.leader} recalls a spy from ${space.name} for ${pending.source} (${recalled}/${pending.cost.count}).`,
      ...state.log,
    ],
  };
}

export function skipConflictVpConversion(
  state: GameState,
  pending: ConflictVpConversionPendingAction,
): GameState {
  if (pending.cost.kind === "recall-spies" && pending.cost.recalled > 0) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines the remaining VP conversion from ${pending.source}.`, ...state.log],
  };
}

export function resolveCurrentConflict(state: GameState): GameState {
  if (!state.conflict) return state;

  const contenders = state.players.filter(
    (player) => player.role === "Ally" && playerHasConflictUnits(player) && player.conflict > 0,
  );
  const rewardReminderEntries = sandwormRewardReminderEntries(contenders);
  const bestStrength = Math.max(0, ...contenders.map((player) => player.conflict));
  const winners = contenders.filter((player) => player.conflict === bestStrength);

  if (winners.length !== 1) {
    const tiedTeam = winners[0]?.team;
    const sameTeamTie = winners.length > 1 && tiedTeam && winners.every((winner) => winner.team === tiedTeam);
    if (sameTeamTie) {
      return {
        ...state,
        pendingAction: {
          kind: "conflict-tie",
          team: tiedTeam,
          tiedPlayerIds: winners.map((winner) => winner.id),
          strength: bestStrength,
          source: state.conflict.name,
        },
        log: [
          `${teams[tiedTeam].name} Allies tie for ${state.conflict.name}; choose whether one Ally concedes first place.`,
          ...state.log,
        ],
      };
    }

    const reason = bestStrength === 0
      ? `${state.conflict.name} resolves with no winner.`
      : `${state.conflict.name} ends tied at ${bestStrength} strength; no one takes the Conflict card.`;
    return {
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      log: [reason, ...rewardReminderEntries, ...state.log],
    };
  }

  return awardConflictToWinner(state, winners[0], state.conflict, rewardReminderEntries);
}

type ConflictTiePendingAction = Extract<PendingAction, { kind: "conflict-tie" }>;

export function resolveConflictTie(
  state: GameState,
  pending: ConflictTiePendingAction,
  winnerId?: string,
): GameState {
  if (!state.conflict) return state;

  const contenders = state.players.filter(
    (player) => player.role === "Ally" && playerHasConflictUnits(player) && player.conflict > 0,
  );
  const rewardReminderEntries = sandwormRewardReminderEntries(contenders);

  if (!winnerId) {
    return {
      ...state,
      conflict: null,
      conflictDiscard: [...state.conflictDiscard, state.conflict],
      ...advancePendingAction(state),
      log: [
        `No Ally concedes ${state.conflict.name}; no one takes the Conflict card.`,
        ...rewardReminderEntries,
        ...state.log,
      ],
    };
  }

  const winner = state.players.find((player) =>
    player.id === winnerId &&
    player.team === pending.team &&
    pending.tiedPlayerIds.includes(player.id) &&
    player.role === "Ally"
  );
  if (!winner) return state;
  const clearedTieState = { ...state, ...advancePendingAction(state) };
  const awarded = awardConflictToWinner(
    clearedTieState,
    winner,
    state.conflict,
    rewardReminderEntries,
  );
  return {
    ...awarded,
    log: [
      `${winner.leader} takes first place after a same-team tie concession.`,
      ...awarded.log,
    ],
  };
}
