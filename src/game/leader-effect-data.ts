import {
  agentPlacementEffects,
  hasLeader,
  hasLeaderCounter,
  hasRole,
  visitedSpaceIcon,
} from "./effect-specs";
import {
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
