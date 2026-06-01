import { playerHasAnyAlliance } from "./alliance-rules";
import {
  automaticBoardInfluence,
  boardSpaceRewardApplies,
} from "./board-rules";
import {
  isDevastatingAssaultCommanderCard,
  isGenericSignetRingCard,
  isMuadDibSignetRingCard,
  isShaddamSignetRingCard,
} from "./card-identifiers";
import { drawCards } from "./deck-utils";
import { resolveCardEffects } from "./effect-resolver";
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

  const influence = automaticBoardInfluence(space, sourcePlayer);
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
  const genericEffect = applyGenericCardAgentEffect(card, sourcePlayer, targetPlayer, state);
  if (genericEffect) return genericEffect;

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

function applyGenericCardAgentEffect(
  card: Card,
  sourcePlayer: Player,
  targetPlayer: Player,
  state?: Pick<GameState, "players"> & Partial<Pick<GameState, "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts">>,
): {
  source: Player;
  target: Player;
  log?: string;
  recruitedTroops?: number;
  blocksDeploymentsThisTurn?: boolean;
  sourceSpiceGained?: number;
} | undefined {
  if (!card.effects) return undefined;
  const players = state?.players.map((player) => {
    if (player.id === sourcePlayer.id) return sourcePlayer;
    if (player.id === targetPlayer.id) return targetPlayer;
    return player;
  });
  const result = resolveCardEffects([card], {
    trigger: "agent-play",
    source: sourcePlayer,
    state: state ? { ...state, players } : undefined,
  });
  if (result.persuasion > 0 || result.swords > 0) {
    throw new Error(`Unsupported Agent effect result for ${card.name}`);
  }
  const hasResourceGain = Object.values(result.revealGain).some((amount) => (amount ?? 0) > 0);
  if (result.cardsToDraw === 0 && !hasResourceGain) return undefined;

  let source = {
    ...sourcePlayer,
    resources: {
      ...sourcePlayer.resources,
      solari: sourcePlayer.resources.solari + (result.revealGain.solari ?? 0),
      spice: sourcePlayer.resources.spice + (result.revealGain.spice ?? 0),
      water: sourcePlayer.resources.water + (result.revealGain.water ?? 0),
    },
  };
  const handBeforeDraw = source.hand.length;
  if (result.cardsToDraw > 0) {
    source = drawCards(source, source.hand.length + result.cardsToDraw);
  }
  const cardsDrawn = source.hand.length - handBeforeDraw;
  return {
    source,
    target: targetPlayer,
    log: agentEffectLog(card, sourcePlayer, result.revealGain, result.cardsToDraw, cardsDrawn),
    sourceSpiceGained: result.revealGain.spice ?? 0,
  };
}

function agentEffectLog(
  card: Card,
  sourcePlayer: Player,
  gain: Partial<Resources>,
  cardsToDraw: number,
  cardsDrawn: number,
) {
  const parts = [
    resourceGainText(gain),
    drawText(cardsToDraw, cardsDrawn),
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return undefined;
  return `${sourcePlayer.leader} resolves ${card.name}: ${parts.join("; ")}.`;
}

function drawText(cardsToDraw: number, cardsDrawn: number) {
  if (cardsToDraw === 0) return undefined;
  if (cardsDrawn === 0) {
    return "no card to draw";
  }
  return `draws ${cardsDrawn} card${cardsDrawn === 1 ? "" : "s"}`;
}

function resourceGainText(gain: Partial<Resources>) {
  const parts = [
    resourceAmountText("Solari", gain.solari),
    resourceAmountText("spice", gain.spice),
    resourceAmountText("water", gain.water),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? `gains ${parts.join(" and ")}` : undefined;
}

function resourceAmountText(label: string, amount: number | undefined) {
  if (!amount) return undefined;
  return `${amount} ${label}`;
}
