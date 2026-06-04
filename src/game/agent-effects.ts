import {
  automaticBoardInfluence,
  boardSpaceRewardApplies,
} from "./board-rules";
import { drawCards, playerTroopSupply } from "./deck-utils";
import { resolveCardEffects, type GameEffectResult } from "./effect-resolver";
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
): { recruitedTroops: number; source: Player; target: Player } {
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
  let recruitedTroops = 0;

  const influence = automaticBoardInfluence(space, sourcePlayer);
  if (influence) {
    if (sourcePlayer.role === "Commander" && !space.personal) {
      target = adjustInfluence(target, influence, 1);
    } else {
      source = adjustInfluence(source, influence, 1);
    }
  }

  if (rewardsApply && space.draw && !space.deferDraw) source = drawCards(source, source.hand.length + space.draw);

  if (rewardsApply && space.troops && space.team !== "reinforce") {
    const troopOwner = sourcePlayer.role === "Commander" ? target : source;
    recruitedTroops = Math.min(playerTroopSupply(troopOwner), space.troops);
    const troopNext = { ...troopOwner, garrison: troopOwner.garrison + recruitedTroops };
    if (sourcePlayer.role === "Commander") target = troopNext;
    else source = troopNext;
  }

  if (space.id === "swordmaster" && !source.swordmasterBonus) {
    source = { ...source, agentsTotal: 3, agentsReady: source.agentsReady + 1, swordmasterBonus: true };
  }

  if (space.id === "high-council" && !source.highCouncilSeat) {
    source = { ...source, highCouncilSeat: true };
  }

  return { recruitedTroops, source, target };
}

export function applyCardAgentEffect(
  card: Card,
  sourcePlayer: Player,
  targetPlayer: Player,
  state?: Pick<GameState, "alliances" | "players"> &
    Partial<Pick<GameState, "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts" | "turnSpyRecalls">>,
  space?: Pick<BoardSpace, "id" | "icon" | "maker">,
): {
  source: Player;
  target: Player;
  log?: string;
  recruitedTroops?: number;
  blocksDeploymentsThisTurn?: boolean;
  sourceSpiceGained?: number;
  sourceIntriguesToDraw?: number;
  targetIntriguesToDraw?: number;
  recalledAgents?: number;
  returnedSourceToHand?: boolean;
  deployRecruitedTroops?: boolean;
  deployRecruitedTroopsSource?: string;
} {
  const genericEffect = applyGenericCardAgentEffect(card, sourcePlayer, targetPlayer, state, space);
  if (genericEffect) return genericEffect;

  return { source: sourcePlayer, target: targetPlayer };
}

function applyGenericCardAgentEffect(
  card: Card,
  sourcePlayer: Player,
  targetPlayer: Player,
  state?: Pick<GameState, "players"> &
    Partial<Pick<GameState, "alliances" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts" | "turnSpyRecalls">>,
  space?: Pick<BoardSpace, "id" | "icon" | "maker">,
): {
  source: Player;
  target: Player;
  log?: string;
  recruitedTroops?: number;
  blocksDeploymentsThisTurn?: boolean;
  sourceSpiceGained?: number;
  sourceIntriguesToDraw?: number;
  targetIntriguesToDraw?: number;
  recalledAgents?: number;
  returnedSourceToHand?: boolean;
  deployRecruitedTroops?: boolean;
  deployRecruitedTroopsSource?: string;
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
    target: targetPlayer,
    space,
    state: state ? { ...state, players } : undefined,
  });
  if (result.persuasion > 0 || result.swords > 0) {
    throw new Error(`Unsupported Agent effect result for ${card.name}`);
  }
  if (result.activatedAlly.cardsToDraw > 0) {
    throw new Error(`Unsupported activated Ally draw result for ${card.name}`);
  }
  const sourceRecruitedTroops = Math.min(playerTroopSupply(sourcePlayer), result.recruitedTroops);
  const targetRecruitedTroops = Math.min(playerTroopSupply(targetPlayer), result.activatedAlly.recruitedTroops);
  const recruitedTroops = sourceRecruitedTroops + targetRecruitedTroops;
  const intriguesToDraw = result.intriguesToDraw + result.activatedAlly.intriguesToDraw;
  const blocksDeploymentsThisTurn = result.blocksDeploymentsThisTurn;
  const hasSourceResourceGain = hasResourceGain(result.revealGain);
  const hasTargetResourceGain = hasResourceGain(result.activatedAlly.revealGain);
  const canReturnSourceToHand =
    result.returnSourceToHand && sourceCardIndexForCurrentAgent(card, sourcePlayer, targetPlayer, space) >= 0;
  if (
    result.cardsToDraw === 0 &&
    result.recalledAgents === 0 &&
    recruitedTroops === 0 &&
    intriguesToDraw === 0 &&
    result.vp === 0 &&
    !canReturnSourceToHand &&
    !result.deployRecruitedTroops &&
    !blocksDeploymentsThisTurn &&
    !hasSourceResourceGain &&
    !hasTargetResourceGain
  ) {
    return undefined;
  }

  let source = {
    ...sourcePlayer,
    agentsReady: Math.min(sourcePlayer.agentsTotal, sourcePlayer.agentsReady + result.recalledAgents),
    garrison: sourcePlayer.garrison + sourceRecruitedTroops,
    resources: addResources(sourcePlayer.resources, result.revealGain),
    vp: sourcePlayer.vp + result.vp,
  };
  let target = {
    ...targetPlayer,
    garrison: targetPlayer.garrison + targetRecruitedTroops,
    resources: addResources(targetPlayer.resources, result.activatedAlly.revealGain),
  };
  const handBeforeDraw = source.hand.length;
  if (result.cardsToDraw > 0) {
    source = drawCards(source, source.hand.length + result.cardsToDraw);
  }
  const cardsDrawn = source.hand.length - handBeforeDraw;
  const sourceCardIndex = sourceCardIndexForCurrentAgent(card, source, targetPlayer, space);
  const sourceCardInPlay = sourceCardIndex >= 0 ? source.playArea[sourceCardIndex] : undefined;
  const returnedSourceToHand = result.returnSourceToHand && sourceCardInPlay !== undefined;
  if (returnedSourceToHand && sourceCardInPlay) {
    const returnedCard = { ...sourceCardInPlay };
    delete returnedCard.agentPlacementSpaceId;
    delete returnedCard.agentPlacementTargetOwnerId;
    source = {
      ...source,
      hand: [...source.hand, returnedCard],
      playArea: source.playArea.filter((_, index) => index !== sourceCardIndex),
    };
  }
  if (target.id === source.id) target = source;
  const logResult = returnedSourceToHand ? result : { ...result, returnSourceToHand: false };
  return {
    source,
    target,
    log: agentEffectLog(card, sourcePlayer, targetPlayer, logResult, cardsDrawn, sourceRecruitedTroops, targetRecruitedTroops),
    recruitedTroops,
    blocksDeploymentsThisTurn,
    sourceSpiceGained: result.revealGain.spice ?? 0,
    sourceIntriguesToDraw: result.intriguesToDraw,
    targetIntriguesToDraw: result.activatedAlly.intriguesToDraw,
    recalledAgents: result.recalledAgents,
    returnedSourceToHand,
    deployRecruitedTroops: result.deployRecruitedTroops,
    deployRecruitedTroopsSource: result.deployRecruitedTroopsSource,
  };
}

function hasResourceGain(gain: Partial<Resources>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function sourceCardIndexForCurrentAgent(
  card: Card,
  source: Player,
  target: Player,
  space?: Pick<BoardSpace, "id">,
) {
  const sameIdMatches = source.playArea
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.id === card.id);
  if (sameIdMatches.length === 0) return -1;

  const contextualMatches = sameIdMatches.filter(({ candidate }) =>
    space !== undefined &&
    candidate.agentPlacementSpaceId === space.id &&
    candidate.agentPlacementTargetOwnerId === target.id
  );
  if (contextualMatches.length === 1) return contextualMatches[0].index;

  if (sameIdMatches.length === 1) {
    const [match] = sameIdMatches;
    if (!match.candidate.agentPlacementSpaceId && !match.candidate.agentPlacementTargetOwnerId) {
      return match.index;
    }
  }
  return -1;
}

function addResources(resources: Resources, gain: Partial<Resources>): Resources {
  return {
    ...resources,
    solari: resources.solari + (gain.solari ?? 0),
    spice: resources.spice + (gain.spice ?? 0),
    water: resources.water + (gain.water ?? 0),
  };
}

function agentEffectLog(
  card: Card,
  sourcePlayer: Player,
  targetPlayer: Player,
  result: GameEffectResult,
  cardsDrawn: number,
  sourceRecruitedTroops: number,
  targetRecruitedTroops: number,
) {
  const parts = [
    resourceGainText(result.revealGain),
    vpGainText(result.vp),
    recruitText(undefined, sourceRecruitedTroops),
    drawText(result.cardsToDraw, cardsDrawn),
    recallAgentText(result.recalledAgents),
    returnSourceToHandText(result.returnSourceToHand),
    deploymentBlockText(result.blocksDeploymentsThisTurn),
    playerResourceGainText(targetPlayer, result.activatedAlly.revealGain),
    recruitText(targetPlayer.leader, targetRecruitedTroops),
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return undefined;
  const sourceLabel = agentEffectSourceLabel(card, result, parts.length);
  return `${sourcePlayer.leader} resolves ${sourceLabel}: ${parts.join("; ")}.`;
}

function agentEffectSourceLabel(card: Card, result: GameEffectResult, partCount: number) {
  if (partCount === 1 && result.revealGainSource && hasResourceGain(result.revealGain)) return result.revealGainSource;
  if (partCount === 1 && result.recruitedTroopsSource && result.recruitedTroops > 0) {
    return result.recruitedTroopsSource;
  }
  if (partCount === 1 && result.drawCardsSource && result.cardsToDraw > 0) return result.drawCardsSource;
  if (partCount === 1 && result.returnSourceToHand) {
    return result.returnSourceToHandSource ?? card.name;
  }
  if (partCount === 1 && result.blocksDeploymentsThisTurn && result.deploymentBlockSource) {
    return result.deploymentBlockSource;
  }
  return card.name;
}

function drawText(cardsToDraw: number, cardsDrawn: number) {
  if (cardsToDraw === 0) return undefined;
  if (cardsDrawn === 0) {
    return "no card to draw";
  }
  return `draws ${cardsDrawn} card${cardsDrawn === 1 ? "" : "s"}`;
}

function recallAgentText(recalledAgents: number) {
  if (recalledAgents === 0) return undefined;
  return `recalls ${recalledAgents === 1 ? "the Agent" : `${recalledAgents} Agents`}`;
}

function returnSourceToHandText(returnSourceToHand: boolean) {
  return returnSourceToHand ? "returns this card to hand" : undefined;
}

function deploymentBlockText(blocksDeploymentsThisTurn: boolean) {
  return blocksDeploymentsThisTurn ? "units can't be deployed to the Conflict this turn" : undefined;
}

function resourceGainText(gain: Partial<Resources>) {
  const parts = [
    resourceAmountText("Solari", gain.solari),
    resourceAmountText("spice", gain.spice),
    resourceAmountText("water", gain.water),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? `gains ${parts.join(" and ")}` : undefined;
}

function vpGainText(amount: number) {
  return amount > 0 ? `gains ${amount} VP` : undefined;
}

function playerResourceGainText(player: Player, gain: Partial<Resources>) {
  const text = resourceGainText(gain);
  return text ? `${player.leader} ${text}` : undefined;
}

function recruitText(leader: string | undefined, amount: number) {
  if (amount === 0) return undefined;
  return `${leader ? `${leader} recruits` : "recruits"} ${amount} troop${amount === 1 ? "" : "s"}`;
}

function resourceAmountText(label: string, amount: number | undefined) {
  if (!amount) return undefined;
  return `${amount} ${label}`;
}
