import type { FactionId, ResourceId } from "./types";

export type ConflictRewardRank = 1 | 2 | 3;

export type ConflictBattleReward = {
  fixedVp: number;
  contracts?: number;
  influence?: Partial<Record<FactionId, number>>;
  intrigues?: number;
  resources?: Partial<Record<ResourceId, number>>;
  influenceChoices?: number;
  influenceChoiceOptions?: FactionId[];
  spies?: number;
  trashCards?: number;
  troops?: number;
  conversion?:
    | { kind: "resource"; resource: ResourceId; amount: number; vp: number }
    | { kind: "recall-spies"; count: number; vp: number };
};

const propagandaInfluenceChoices: FactionId[] = ["greatHouses", "spacing", "bene", "fringeWorlds"];

export const conflictBattleRewardsBySourceId: Record<number, Record<ConflictRewardRank, ConflictBattleReward>> = {
  451: {
    1: { fixedVp: 0, influenceChoices: 1 },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 1 } },
    3: { fixedVp: 0, resources: { spice: 1 } },
  },
  452: {
    1: { fixedVp: 0, intrigues: 1, resources: { solari: 1 } },
    2: { fixedVp: 0, intrigues: 1, resources: { solari: 2 } },
    3: { fixedVp: 0, intrigues: 1 },
  },
  453: {
    1: { fixedVp: 0, resources: { solari: 2 } },
    2: { fixedVp: 0, resources: { solari: 3 } },
    3: { fixedVp: 0, resources: { solari: 2 } },
  },
  454: {
    1: { fixedVp: 0, contracts: 1, influence: { spacing: 1 }, troops: 1 },
    2: { fixedVp: 0, resources: { water: 1, solari: 2 }, troops: 2 },
    3: { fixedVp: 0, intrigues: 1, troops: 1 },
  },
  455: {
    1: {
      fixedVp: 0,
      influenceChoices: 1,
      conversion: { kind: "resource", resource: "spice", amount: 3, vp: 1 },
    },
    2: { fixedVp: 0, resources: { water: 1, spice: 1 }, troops: 1 },
    3: { fixedVp: 0, resources: { spice: 1 }, troops: 1 },
  },
  456: {
    1: { fixedVp: 0, resources: { solari: 2 }, troops: 2 },
    2: { fixedVp: 0, resources: { solari: 4 }, troops: 1 },
    3: { fixedVp: 0, resources: { solari: 3 } },
  },
  457: {
    1: { fixedVp: 0, resources: { spice: 2 }, spies: 1 },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 1 }, troops: 1 },
    3: { fixedVp: 0, resources: { spice: 2 } },
  },
  458: {
    1: { fixedVp: 0, influence: { greatHouses: 1 }, resources: { solari: 2 }, spies: 1 },
    2: { fixedVp: 0, resources: { solari: 4 }, troops: 1 },
    3: { fixedVp: 0, resources: { solari: 3 } },
  },
  459: {
    1: { fixedVp: 0, influence: { bene: 1 }, intrigues: 1 },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 1 }, troops: 1 },
    3: { fixedVp: 0, resources: { spice: 1 }, troops: 1 },
  },
  460: {
    1: { fixedVp: 0, resources: { spice: 2 }, troops: 1 },
    2: { fixedVp: 0, resources: { water: 2 }, troops: 1 },
    3: { fixedVp: 0, resources: { water: 1 }, troops: 1 },
  },
  461: {
    1: { fixedVp: 0, influence: { fringeWorlds: 1 }, resources: { water: 1 }, troops: 1 },
    2: { fixedVp: 0, resources: { spice: 3 }, troops: 1 },
    3: { fixedVp: 0, resources: { spice: 2 } },
  },
  462: {
    1: { fixedVp: 0, contracts: 1, resources: { water: 1 }, trashCards: 1 },
    2: { fixedVp: 0, resources: { water: 1, spice: 1 }, trashCards: 1 },
    3: { fixedVp: 0, resources: { water: 1 }, troops: 1 },
  },
  463: {
    1: {
      fixedVp: 0,
      influenceChoices: 2,
      influenceChoiceOptions: propagandaInfluenceChoices,
    },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 3 } },
    3: { fixedVp: 0, resources: { spice: 3 } },
  },
  464: {
    1: {
      fixedVp: 1,
      conversion: { kind: "resource", resource: "spice", amount: 4, vp: 1 },
    },
    2: { fixedVp: 0, resources: { spice: 5 } },
    3: { fixedVp: 0, resources: { spice: 3 } },
  },
  465: {
    1: {
      fixedVp: 1,
      conversion: { kind: "recall-spies", count: 2, vp: 1 },
    },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 1, solari: 3 } },
    3: { fixedVp: 0, resources: { spice: 2, solari: 2 } },
  },
  466: {
    1: {
      fixedVp: 1,
      conversion: { kind: "resource", resource: "solari", amount: 6, vp: 1 },
    },
    2: { fixedVp: 0, intrigues: 1, resources: { spice: 3 } },
    3: { fixedVp: 0, resources: { spice: 3 } },
  },
};

export function conflictBattleRewardForSourceId(
  sourceId: number | undefined,
  rank: ConflictRewardRank,
) {
  return sourceId ? conflictBattleRewardsBySourceId[sourceId]?.[rank] : undefined;
}
