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
  if (!canMeetInfluenceRequirement(space, player, players)) return false;
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

export function pendingActionForSpace(
  space: BoardSpace,
  source: Player,
  target: Player,
  players: Player[],
  extraRecruitedTroops = 0,
  deploymentsBlocked = false,
): PendingAction | undefined {
  if (space.spy && source.spies > 0) {
    return { kind: "spy", ownerId: source.id, remaining: Math.min(space.spy, source.spies), source: space.name };
  }

  if (space.team === "reinforce") {
    return {
      kind: "reinforce",
      team: source.team,
      remaining: space.troops ?? 0,
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
    const deployable = Math.min(target.garrison, (space.troops ?? 0) + Math.max(0, extraRecruitedTroops) + 2);
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
