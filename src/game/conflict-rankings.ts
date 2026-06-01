import type { ConflictCard, PendingAction, Player } from "./types";
import type { ConflictRewardRank } from "./conflict-reward-data";

export type LowerRankRewardAssignment = {
  playerId: string;
  rank: 2 | 3;
};

type ConflictTiePendingAction = Extract<PendingAction, { kind: "conflict-tie" }>;

export function conflictRewardRankLabel(rank: ConflictRewardRank) {
  if (rank === 1) return "first-place";
  return rank === 2 ? "second-place" : "third-place";
}

export function contenderGroupsByStrength(contenders: Player[]) {
  const strengths = [...new Set(contenders.map((player) => player.conflict))].sort((a, b) => b - a);
  return strengths.map((strength) => contenders.filter((player) => player.conflict === strength));
}

export function sameTeamConcessionOpportunity(contenders: Player[]) {
  const groups = contenderGroupsByStrength(contenders);
  for (let index = 0; index < Math.min(groups.length, 3); index += 1) {
    const group = groups[index];
    if (group.length !== 2 || group[0].team !== group[1].team) continue;
    return {
      rank: (index + 1) as ConflictRewardRank,
      team: group[0].team,
      tiedPlayerIds: group.map((player) => player.id),
      strength: group[0].conflict,
    };
  }
  return undefined;
}

export function sameTeamThirdRewardTieAfterFirstTie(contenders: Player[], firstTiePlayerIds: string[]) {
  const tiedIds = new Set(firstTiePlayerIds);
  const remainingGroup = contenderGroupsByStrength(contenders.filter((player) => !tiedIds.has(player.id)))[0];
  return remainingGroup?.length === 2 && remainingGroup[0].team === remainingGroup[1].team
    ? remainingGroup
    : undefined;
}

export function pendingActionForCascadingThirdRewardTie(
  conflict: ConflictCard,
  group: Player[],
  conflictWinnerId: string | null,
  resolvedRankRewards: LowerRankRewardAssignment[],
): ConflictTiePendingAction {
  return {
    kind: "conflict-tie",
    team: group[0].team,
    tiedPlayerIds: group.map((player) => player.id),
    strength: group[0].conflict,
    rank: 3,
    conflictWinnerId,
    resolvedRankRewards,
    source: conflict.name,
  };
}

export function lowerRankRewardsAfterUniqueWinner(
  contenders: Player[],
  winnerId: string,
): LowerRankRewardAssignment[] {
  const groups = contenderGroupsByStrength(contenders);
  if (groups[0]?.some((player) => player.id !== winnerId)) return [];
  const secondGroup = groups[1];
  if (!secondGroup) return [];
  if (secondGroup.length > 1) {
    return secondGroup.map((player) => ({ playerId: player.id, rank: 3 }));
  }
  const thirdGroup = groups[2];
  return [
    { playerId: secondGroup[0].id, rank: 2 },
    ...(thirdGroup?.length === 1 ? [{ playerId: thirdGroup[0].id, rank: 3 } as const] : []),
  ];
}

export function rankRewardsForFirstPlaceTie(contenders: Player[]): LowerRankRewardAssignment[] {
  const groups = contenderGroupsByStrength(contenders);
  const firstGroup = groups[0] ?? [];
  const thirdGroup = groups[1];
  return [
    ...firstGroup.map((player) => ({ playerId: player.id, rank: 2 as const })),
    ...(firstGroup.length === 2 && thirdGroup?.length === 1
      ? [{ playerId: thirdGroup[0].id, rank: 3 as const }]
      : []),
  ];
}

export function lowerRankRewardsAfterSameTeamConcession(
  contenders: Player[],
  tiedPlayerIds: string[],
  winnerId: string,
  rank: ConflictRewardRank,
): LowerRankRewardAssignment[] {
  if (rank === 2) {
    return tiedPlayerIds.map((playerId) => ({
      playerId,
      rank: playerId === winnerId ? 2 : 3,
    }));
  }
  if (rank === 3) {
    const groups = contenderGroupsByStrength(contenders);
    const secondGroup = groups[1];
    return [
      ...(secondGroup?.length === 1 ? [{ playerId: secondGroup[0].id, rank: 2 as const }] : []),
      { playerId: winnerId, rank: 3 },
    ];
  }
  const tiedIds = new Set(tiedPlayerIds);
  const remainingGroup = contenderGroupsByStrength(contenders.filter((player) => !tiedIds.has(player.id)))[0];
  return [
    ...tiedPlayerIds
      .filter((playerId) => playerId !== winnerId)
      .map((playerId) => ({ playerId, rank: 2 as const })),
    ...(remainingGroup?.length === 1 ? [{ playerId: remainingGroup[0].id, rank: 3 as const }] : []),
  ];
}
