import { playerHasAnyAlliance } from "./alliance-rules";
import {
  boardSpaceRewardApplies,
  effectiveRequirementInfluence,
} from "./board-rules";
import {
  isDevastatingAssaultCommanderCard,
  isGenericSignetRingCard,
  isMuadDibSignetRingCard,
  isPrepareTheWayCard,
  isShaddamSignetRingCard,
} from "./card-identifiers";
import { drawCards } from "./deck-utils";
import {
  gurneyHalleckLeaderName,
  ladyAmberMetulliLeaderName,
} from "./leader-constants";
import { adjustInfluence } from "./leader-rewards";
import type { BoardSpace, Card, FactionId, GameState, Player, ResourceId, Resources } from "./types";

export function resolveInfluence(space: BoardSpace, player: Player): FactionId | null {
  if (!space.influence) return null;
  if (space.personal) return space.influence;
  if (space.influence === "emperor") return "greatHouses";
  if (space.influence === "fremen") return "fringeWorlds";
  return space.influence;
}

export function applyBoardEffect(
  sourcePlayer: Player,
  targetPlayer: Player,
  space: BoardSpace,
  cost: Partial<Resources> = {},
  bonusSpice = 0,
  deferMakerChoice = false,
): { source: Player; target: Player } {
  const resourcesNext = { ...sourcePlayer.resources };
  Object.entries(cost).forEach(([key, amount]) => {
    resourcesNext[key as ResourceId] -= amount ?? 0;
  });
  const rewardsApply = boardSpaceRewardApplies(space, sourcePlayer);
  const gain = rewardsApply
    ? deferMakerChoice && space.makerWorms && space.gain ? { ...space.gain, spice: 0 } : space.gain
    : undefined;
  Object.entries(gain ?? {}).forEach(([key, amount]) => {
    if (key === "intrigue") return;
    resourcesNext[key as ResourceId] += amount ?? 0;
  });
  resourcesNext.spice += bonusSpice;

  let source: Player = { ...sourcePlayer, resources: resourcesNext };
  let target: Player = targetPlayer;

  const influence = resolveInfluence(space, sourcePlayer);
  if (influence) {
    if (sourcePlayer.role === "Commander" && !space.personal) {
      target = adjustInfluence(target, influence, 1);
    } else {
      source = adjustInfluence(source, influence, 1);
    }
  }

  if (rewardsApply && space.draw) source = drawCards(source, source.hand.length + space.draw);

  if (rewardsApply && space.troops && space.team !== "reinforce") {
    const troopOwner = sourcePlayer.role === "Commander" ? target : source;
    const troopNext = { ...troopOwner, garrison: troopOwner.garrison + space.troops };
    if (sourcePlayer.role === "Commander") target = troopNext;
    else source = troopNext;
  }

  if (space.id === "swordmaster" && !source.swordmasterBonus) {
    source = { ...source, agentsTotal: 3, agentsReady: source.agentsReady + 1, swordmasterBonus: true };
  }

  if (space.id === "high-council" && !source.highCouncilSeat) {
    source = { ...source, highCouncilSeat: true };
  }

  return { source, target };
}

export function applyCardAgentEffect(
  card: Card,
  sourcePlayer: Player,
  targetPlayer: Player,
  state?: Pick<GameState, "alliances" | "players">,
): {
  source: Player;
  target: Player;
  log?: string;
  recruitedTroops?: number;
  blocksDeploymentsThisTurn?: boolean;
  sourceSpiceGained?: number;
} {
  if (state && isPrepareTheWayCard(card)) {
    const players = state.players.map((player) => {
      if (player.id === sourcePlayer.id) return sourcePlayer;
      if (player.id === targetPlayer.id) return targetPlayer;
      return player;
    });
    if (effectiveRequirementInfluence(sourcePlayer, "bene", players) >= 2) {
      const source = drawCards(sourcePlayer, sourcePlayer.hand.length + 1);
      const drewCard = source.hand.length > sourcePlayer.hand.length;
      return {
        source,
        target: targetPlayer,
        log: drewCard
          ? `${sourcePlayer.leader} resolves Prepare The Way: draws 1 card.`
          : `${sourcePlayer.leader} resolves Prepare The Way: no card to draw.`,
      };
    }
  }

  if (
    isMuadDibSignetRingCard(card) &&
    sourcePlayer.team === "muaddib" &&
    sourcePlayer.role === "Commander"
  ) {
    const source = drawCards(sourcePlayer, sourcePlayer.hand.length + 1);
    const drewCard = source.hand.length > sourcePlayer.hand.length;
    return {
      source,
      target: targetPlayer,
      log: drewCard
        ? `${sourcePlayer.leader} resolves Lead the Way: draws 1 card.`
        : `${sourcePlayer.leader} resolves Lead the Way: no card to draw.`,
    };
  }

  if (
    isShaddamSignetRingCard(card) &&
    sourcePlayer.team === "shaddam" &&
    sourcePlayer.role === "Commander"
  ) {
    return {
      source: sourcePlayer,
      target: targetPlayer,
      blocksDeploymentsThisTurn: true,
      log: `${sourcePlayer.leader} resolves Emperor of the Known Universe: units can't be deployed to the Conflict this turn.`,
    };
  }

  if (
    isGenericSignetRingCard(card) &&
    sourcePlayer.leader === gurneyHalleckLeaderName &&
    sourcePlayer.role === "Ally"
  ) {
    return {
      source: {
        ...sourcePlayer,
        garrison: sourcePlayer.garrison + 1,
      },
      target: targetPlayer,
      log: `${sourcePlayer.leader} resolves Warmaster: recruits 1 troop.`,
      recruitedTroops: 1,
    };
  }

  if (
    state &&
    isGenericSignetRingCard(card) &&
    sourcePlayer.leader === ladyAmberMetulliLeaderName &&
    sourcePlayer.role === "Ally" &&
    playerHasAnyAlliance(state, sourcePlayer.id)
  ) {
    return {
      source: {
        ...sourcePlayer,
        resources: {
          ...sourcePlayer.resources,
          solari: sourcePlayer.resources.solari + 1,
          spice: sourcePlayer.resources.spice + 1,
        },
      },
      target: targetPlayer,
      log: `${sourcePlayer.leader} resolves Fill Coffers: gains 1 Solari and 1 spice.`,
      sourceSpiceGained: 1,
    };
  }

  if (
    isDevastatingAssaultCommanderCard(card) &&
    sourcePlayer.team === "shaddam" &&
    sourcePlayer.role === "Commander" &&
    targetPlayer.team === sourcePlayer.team &&
    targetPlayer.role === "Ally"
  ) {
    return {
      source: {
        ...sourcePlayer,
        resources: {
          ...sourcePlayer.resources,
          solari: sourcePlayer.resources.solari + 1,
        },
      },
      target: {
        ...targetPlayer,
        garrison: targetPlayer.garrison + 1,
      },
      log: `${sourcePlayer.leader} resolves ${card.name}: gains 1 Solari; ${targetPlayer.leader} recruits 1 troop.`,
      recruitedTroops: 1,
    };
  }

  return { source: sourcePlayer, target: targetPlayer };
}
