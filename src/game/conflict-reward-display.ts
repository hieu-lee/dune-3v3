import {
  criticalLocationForConflict,
  criticalLocationNames,
} from "./critical-locations";
import {
  conflictBattleRewardForSourceId,
  type ConflictBattleReward,
  type ConflictRewardRank,
} from "./conflict-reward-data";
import type {
  ConflictCard,
  FactionId,
  ResourceId,
} from "./types";

const rankLabels: Record<ConflictRewardRank, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

const factionLabels: Record<FactionId, string> = {
  bene: "Bene Gesserit",
  emperor: "Emperor",
  fringeWorlds: "Fremen/Fringe",
  fremen: "Fremen",
  greatHouses: "Great Houses",
  spacing: "Spacing Guild",
};

const rewardRanks: ConflictRewardRank[] = [1, 2, 3];
const resourceOrder: ResourceId[] = ["solari", "spice", "water"];
const factionOrder: FactionId[] = ["greatHouses", "spacing", "bene", "fringeWorlds"];

function plural(amount: number, singular: string, pluralLabel = `${singular}s`) {
  return `${amount} ${amount === 1 ? singular : pluralLabel}`;
}

function resourceAmount(resource: ResourceId, amount: number) {
  return `${amount} ${resourceLabels[resource]}`;
}

function rewardParts(reward: ConflictBattleReward) {
  const parts: string[] = [];
  if (reward.fixedVp > 0) parts.push(`${reward.fixedVp} VP`);
  if (reward.conversion?.kind === "resource") {
    parts.push(
      `pay ${resourceAmount(reward.conversion.resource, reward.conversion.amount)} -> +${reward.conversion.vp} VP`,
    );
  }
  if (reward.conversion?.kind === "recall-spies") {
    parts.push(`recall ${plural(reward.conversion.count, "spy", "spies")} -> +${reward.conversion.vp} VP`);
  }
  if (reward.contracts) parts.push(`take ${plural(reward.contracts, "face-up CHOAM contract")}`);

  for (const faction of factionOrder) {
    const amount = reward.influence?.[faction] ?? 0;
    if (amount > 0) parts.push(`${amount} ${factionLabels[faction]} Influence`);
  }

  if (reward.influenceChoices) {
    const labels = reward.influenceChoiceOptions?.map((faction) => factionLabels[faction]);
    const suffix = labels ? ` (${labels.join(", ")})` : "";
    parts.push(`choose ${reward.influenceChoices} Influence${suffix}`);
  }
  if (reward.intrigues) parts.push(`draw ${plural(reward.intrigues, "Intrigue")}`);

  for (const resource of resourceOrder) {
    const amount = reward.resources?.[resource] ?? 0;
    if (amount > 0) parts.push(`gain ${resourceAmount(resource, amount)}`);
  }

  if (reward.spies) parts.push(`place ${plural(reward.spies, "spy", "spies")}`);
  if (reward.trashCards) parts.push(`trash ${plural(reward.trashCards, "card")}`);
  if (reward.troops) parts.push(`recruit ${plural(reward.troops, "troop")}`);
  return parts;
}

export function conflictRewardRows(conflict: ConflictCard) {
  return rewardRanks.flatMap((rank) => {
    const reward = conflictBattleRewardForSourceId(conflict.sourceId, rank);
    if (!reward) return [];
    const parts = rewardParts(reward);
    return parts.length > 0 ? [`${rankLabels[rank]}: ${parts.join("; ")}`] : [];
  });
}

export function conflictStakesText(conflict: ConflictCard) {
  const location = criticalLocationForConflict(conflict);
  const battleIconText = conflict.battleIcon === "wild"
    ? "Wild battle icon can score Endgame VP."
    : "Battle icon can score Endgame VP.";
  return location
    ? `Winner takes control of ${criticalLocationNames[location]}. ${battleIconText}`
    : `Resolve printed rank rewards. ${battleIconText}`;
}
