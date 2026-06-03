import {
  agentPlacementEffects,
  hasConflictUnits,
  hasLeader,
  hasLeaderCounter,
  hasRole,
  hasSpyPosts,
  revealEffects,
  visitedSpaceIcon,
} from "./effect-specs";
import {
  feydRauthaLeaderName,
  ladyAmberMetulliLeaderName,
  ladyJessicaLeaderName,
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import type { CardEffectSpec } from "./types";

export const leaderPlacementEffectSpecs: CardEffectSpec[] = [
  agentPlacementEffects(
    [{
      kind: "leader-transition-choice",
      selector: "self",
      source: "Other Memories",
      fromLeader: ladyJessicaLeaderName,
      toLeader: reverendMotherJessicaLeaderName,
      counter: "jessicaMemories",
      counterAmount: "all",
      drawCardsPerCounter: 1,
      followUp: {
        kind: "repeat-board-space",
        sameSpace: true,
        ability: "reverend-mother-jessica",
        source: "Reverend Mother",
        resource: "water",
        cost: 1,
      },
    }],
    [
      hasLeader(ladyJessicaLeaderName),
      hasRole("Ally"),
      hasLeaderCounter("jessicaMemories", 1),
      visitedSpaceIcon("bene"),
    ],
  ),
];

export const leaderRevealEffectSpecs: CardEffectSpec[] = [
  revealEffects(
    [{
      kind: "recall-spy",
      selector: "self",
      amount: 1,
      strengthReward: 2,
      optional: true,
      source: "Devious Strength",
    }],
    [
      hasLeader(feydRauthaLeaderName),
      hasRole("Ally"),
      hasConflictUnits(1),
      hasSpyPosts(1),
    ],
  ),
  revealEffects(
    [{
      kind: "retreat-troops",
      selector: "self",
      min: 1,
      max: 1,
      optional: true,
      source: "Desert Scouts",
    }],
    [
      hasLeader(ladyAmberMetulliLeaderName),
      hasRole("Ally"),
      hasConflictUnits(1),
    ],
  ),
];
