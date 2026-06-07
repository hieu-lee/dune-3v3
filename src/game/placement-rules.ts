import {
  canEnterSpace,
  canMeetInfluenceRequirement,
  canPay,
  needsCommanderMappedInfluenceChoice,
} from "./board-rules";
import {
  canHaveMakerHooks,
  canSummonSandworms,
} from "./conflict-rules";
import { playerTroopSupply } from "./deck-utils";
import { mainBoardInfluenceChoices, changeAllegiancesGainChoices } from "./influence-choices";
import { playerHasSpyPost } from "./spy-posts";
import { defaultTradePartnerId } from "./trade-rules";
import { trashableCardsForPending } from "./trash-rules";
import type { BoardSpace, Card, FactionId, GameState, PendingAction, Player, Resources } from "./types";

export function iconCanReach(
  card: Card,
  space: BoardSpace,
  player: Player,
  swordmasterClaimed = false,
  spyPosts: Record<string, string> = {},
  players: Player[] = [player],
  sharedSpyPosts: Record<string, string[]> = {},
) {
  if (!canEnterSpace(space, player, swordmasterClaimed, players)) return false;
  if (!card.ignoreInfluenceRequirements && !canMeetInfluenceRequirement(space, player, players)) return false;
  if (card.icons.includes(space.icon)) return true;
  if (card.icons.includes("spy") && playerHasSpyPost({ spyPosts, sharedSpyPosts }, space.id, player.id)) return true;
  if (player.role === "Commander" && player.team === "muaddib" && space.icon === "fremen") {
    return card.icons.includes("fremen");
  }
  if (player.role === "Commander" && player.team === "shaddam" && space.icon === "emperor") {
    return card.icons.includes("emperor");
  }
  return false;
}

export function canEnterOccupiedSpaceWithSpy(
  state: Pick<GameState, "agentPlacementCoOwners" | "agentPlacementOwners" | "sharedSpyPosts" | "spaces" | "spyPosts">,
  space: BoardSpace,
  player: Player,
) {
  const primaryOwnerId = state.agentPlacementOwners?.[space.id] ?? state.spaces[space.id];
  const alreadyOwnsAgentAtSpace =
    primaryOwnerId === player.id ||
    state.agentPlacementCoOwners?.[space.id]?.includes(player.id);
  return Boolean(
    state.spaces[space.id] &&
      !alreadyOwnsAgentAtSpace &&
      playerHasSpyPost(state, space.id, player.id)
  );
}

export function agentSpaceAvailable(
  state: Pick<GameState, "agentPlacementCoOwners" | "agentPlacementOwners" | "sharedSpyPosts" | "spaces" | "spyPosts">,
  space: BoardSpace,
  player: Player,
) {
  return !state.spaces[space.id] || canEnterOccupiedSpaceWithSpy(state, space, player);
}

export function defaultActivatedAllyId(player: Player, players: Player[]) {
  return players.find((candidate) => candidate.team === player.team && candidate.role === "Ally")?.id ?? player.id;
}

function influenceChoiceOwnerId(source: Player, target: Player, faction: FactionId) {
  if (source.role !== "Commander") return source.id;
  return faction === "emperor" || faction === "fremen" ? source.id : target.id;
}

export function pendingActionForBoardInfluenceChoice(
  space: BoardSpace,
  source: Player,
  target: Player,
): PendingAction | undefined {
  if (space.id === "shipping") {
    const factions = source.role === "Commander" ? changeAllegiancesGainChoices(source) : mainBoardInfluenceChoices;
    return {
      kind: "board-influence-choice",
      source: space.name,
      spaceId: space.id,
      targetOwnerId: target.id,
      choices: factions.map((faction) => ({
        faction,
        ownerId: influenceChoiceOwnerId(source, target, faction),
      })),
    };
  }

  if (!needsCommanderMappedInfluenceChoice(space, source) || !space.influence) return undefined;
  const mappedFaction = space.influence === "emperor" ? "greatHouses" : "fringeWorlds";
  return {
    kind: "board-influence-choice",
    source: space.name,
    spaceId: space.id,
    targetOwnerId: target.id,
    choices: [
      { faction: mappedFaction, ownerId: target.id },
      { faction: space.influence, ownerId: source.id },
    ],
  };
}

function optionalSpacePayment(space: BoardSpace): { cost: Partial<Resources>; gain: Partial<Resources> } | undefined {
  if (space.id === "gather-support") return { cost: { solari: 2 }, gain: { water: 1 } };
  if (space.id === "spice-refinery") return { cost: { spice: 1 }, gain: { solari: 2 } };
  return undefined;
}

export function pendingActionForOptionalSpacePayment(
  space: BoardSpace,
  source: Player,
): PendingAction | undefined {
  const payment = optionalSpacePayment(space);
  if (!payment || !canPay(source, payment.cost)) return undefined;
  return {
    kind: "optional-space-payment",
    ownerId: source.id,
    source: space.name,
    cost: payment.cost,
    gain: payment.gain,
  };
}

export function pendingActionForBoardTrash(space: BoardSpace, source: Player): PendingAction | undefined {
  if (space.id !== "controversial-tech") return undefined;
  const pending: PendingAction = {
    kind: "trash-card",
    ownerId: source.id,
    source: space.name,
    optional: false,
  };
  return trashableCardsForPending(source, pending).length > 0 ? pending : undefined;
}

export function pendingActionForBoardIntrigueSwap(
  space: BoardSpace,
  source: Player,
  futureIntrigues = 0,
): PendingAction | undefined {
  if (!space.intrigueSwap || source.intrigues.length + futureIntrigues <= 0) return undefined;
  return {
    kind: "trash-intrigue-for-reward",
    ownerId: source.id,
    source: space.name,
    cost: {},
    drawIntrigues: 1,
    gain: {},
    gainVp: 0,
    optional: true,
    discard: true,
  };
}

export function pendingActionForBoardCardDraw(
  space: BoardSpace,
  source: Player,
): PendingAction | undefined {
  if (!space.deferDraw || !space.draw || space.draw <= 0) return undefined;
  return {
    kind: "draw-cards",
    ownerId: source.id,
    source: space.name,
    amount: space.draw,
  };
}

export function boardAgentRecallSpaceIds(
  state: Pick<GameState, "agentPlacementCoOwners" | "agentPlacementOwners" | "spaces">,
  pending: Pick<Extract<PendingAction, { kind: "recall-agent-from-board" }>, "ownerId" | "spaceIds">,
) {
  return pending.spaceIds.filter((spaceId) =>
    state.spaces[spaceId] !== undefined &&
    (
      state.agentPlacementOwners?.[spaceId] === pending.ownerId ||
      state.agentPlacementCoOwners?.[spaceId]?.includes(pending.ownerId)
    )
  );
}

export function pendingActionForBoardAgentRecall(
  state: Pick<GameState, "agentPlacementCoOwners" | "agentPlacementOwners" | "spaces">,
  space: BoardSpace,
  source: Player,
): PendingAction | undefined {
  if (!space.recallAgent) return undefined;
  const ownedSpaceIds = new Set([
    ...Object.keys(state.agentPlacementOwners ?? {}).filter((spaceId) => state.agentPlacementOwners?.[spaceId] === source.id),
    ...Object.keys(state.agentPlacementCoOwners ?? {}).filter((spaceId) => state.agentPlacementCoOwners?.[spaceId]?.includes(source.id)),
  ]);
  const spaceIds = [...ownedSpaceIds].filter((spaceId) =>
    spaceId !== space.id && state.spaces[spaceId] !== undefined
  );
  if (spaceIds.length === 0) return undefined;
  return {
    kind: "recall-agent-from-board",
    ownerId: source.id,
    source: space.name,
    spaceIds,
  };
}

export function pendingActionForSpace(
  space: BoardSpace,
  source: Player,
  target: Player,
  players: Player[],
  extraRecruitedTroops = 0,
  deploymentsBlocked = false,
  boardRecruitedTroops = space.troops ?? 0,
): PendingAction | undefined {
  if (space.spy && source.spies > 0) {
    return { kind: "spy", ownerId: source.id, remaining: Math.min(space.spy, source.spies), source: space.name };
  }

  if (space.team === "reinforce") {
    const teamTroopSupply = players
      .filter((player) => player.team === source.team && player.role === "Ally")
      .reduce((total, player) => total + playerTroopSupply(player), 0);
    const remaining = Math.min(space.troops ?? 0, teamTroopSupply);
    if (remaining <= 0) return undefined;
    return {
      kind: "reinforce",
      team: source.team,
      remaining,
      source: space.name,
      ...(deploymentsBlocked ? { conflictBlocked: true } : {}),
    };
  }

  if (space.team === "trade") {
    return {
      kind: "trade",
      actorId: source.id,
      partnerId: defaultTradePartnerId(source, target, players),
      resource: "spice",
      actorGiven: 0,
      partnerGiven: 0,
      source: space.name,
    };
  }

  if (space.contract) {
    return { kind: "contract", ownerId: source.id, source: space.name, spaceId: space.id };
  }

  if (space.combat && !deploymentsBlocked) {
    const deployable = Math.min(
      target.garrison,
      Math.max(0, boardRecruitedTroops) + Math.max(0, extraRecruitedTroops) + 2,
    );
    if (deployable > 0) {
      return { kind: "deploy", ownerId: target.id, remaining: deployable, source: space.name };
    }
  }

  return undefined;
}

export function pendingActionForMakerChoice(
  state: GameState,
  space: BoardSpace,
  owner: Player,
  spiceOwner: Player = owner,
): PendingAction | undefined {
  const spice = space.gain?.spice ?? 0;
  const canSummon = canSummonSandworms(state, owner, space.makerWorms ?? 0);
  if (!space.makerWorms || spice <= 0 || !canSummon) return undefined;
  return {
    kind: "maker-choice",
    ownerId: owner.id,
    spiceOwnerId: spiceOwner.id,
    spice,
    sandworms: space.makerWorms,
    canSummonSandworms: canSummon,
    source: space.name,
    spaceId: space.id,
  };
}

export function pendingActionForSietchTabr(
  state: GameState,
  space: BoardSpace,
  owner: Player,
  waterOwner: Player = owner,
): Extract<PendingAction, { kind: "sietch-tabr" }> | undefined {
  if (!space.sietchTabr) return undefined;
  return {
    kind: "sietch-tabr",
    ownerId: owner.id,
    waterOwnerId: waterOwner.id,
    canTakeMakerHooks: canHaveMakerHooks(owner) && !owner.makerHooks,
    canRemoveShieldWall: state.shieldWall,
    source: space.name,
    spaceId: space.id,
  };
}
