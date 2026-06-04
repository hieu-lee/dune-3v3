import type { BoardSpace, FactionId, Player, ResourceId, Resources } from "./types";

const highCouncilSeatLimit = 4;

export function canPay(player: Player, cost: Partial<Resources> = {}) {
  return Object.entries(cost).every(([key, amount]) => player.resources[key as ResourceId] >= (amount ?? 0));
}

export function effectiveCost(space: BoardSpace, players: Player[]) {
  if (space.id === "swordmaster" && players.some((player) => player.swordmasterBonus)) {
    return { solari: 6 };
  }
  return space.cost;
}

export function highCouncilSeatsTaken(players: Player[]) {
  return players.filter((player) => player.highCouncilSeat).length;
}

export function boardSpaceRewardApplies(space: BoardSpace, player: Player) {
  return space.id !== "high-council" || player.highCouncilSeat;
}

export function canEnterSpace(
  space: BoardSpace,
  player: Player,
  swordmasterClaimed = false,
  players: Player[] = [player],
) {
  void swordmasterClaimed;
  if (space.id === "swordmaster" && player.swordmasterBonus) return false;
  if (space.id === "high-council" && !player.highCouncilSeat && highCouncilSeatsTaken(players) >= highCouncilSeatLimit) {
    return false;
  }
  if (!space.personal) return true;
  return player.role === "Commander" && player.team === space.personal;
}

export function effectiveRequirementInfluence(player: Player, faction: FactionId, players: Player[]) {
  if (player.role !== "Commander") return player.influence[faction];
  return Math.max(
    player.influence[faction],
    ...players
      .filter((candidate) => candidate.team === player.team && candidate.role === "Ally")
      .map((ally) => ally.influence[faction]),
  );
}

export function effectiveEmperorIconInfluence(player: Player, players: Player[]) {
  const greatHousesInfluence = effectiveRequirementInfluence(player, "greatHouses", players);
  if (player.role === "Commander" && player.team === "shaddam") {
    return Math.max(greatHousesInfluence, player.influence.emperor);
  }
  return greatHousesInfluence;
}

export function effectiveFremenIconInfluence(player: Player, players: Player[]) {
  const fringeWorldsInfluence = effectiveRequirementInfluence(player, "fringeWorlds", players);
  if (player.role === "Commander" && player.team === "muaddib") {
    return Math.max(fringeWorldsInfluence, player.influence.fremen);
  }
  return fringeWorldsInfluence;
}

export function canMeetInfluenceRequirement(space: BoardSpace, player: Player, players: Player[]) {
  if (!space.requirement) return true;
  if (space.requirement.faction === "emperor") {
    return effectiveEmperorIconInfluence(player, players) >= space.requirement.amount;
  }
  if (space.requirement.faction === "fremen") {
    return effectiveFremenIconInfluence(player, players) >= space.requirement.amount;
  }
  if (space.id === "sietch-tabr" && player.team === "muaddib" && player.role === "Commander") {
    return Math.max(
      player.influence.fremen,
      effectiveRequirementInfluence(player, "fringeWorlds", players),
    ) >= space.requirement.amount;
  }
  return effectiveRequirementInfluence(player, space.requirement.faction, players) >= space.requirement.amount;
}

export function needsCommanderMappedInfluenceChoice(space: BoardSpace, player: Player) {
  return (
    !space.personal &&
    (
      (space.influence === "emperor" && player.role === "Commander" && player.team === "shaddam") ||
      (space.influence === "fremen" && player.role === "Commander" && player.team === "muaddib")
    )
  );
}

export function automaticBoardInfluence(space: BoardSpace, player: Player): FactionId | null {
  if (!space.influence || space.id === "shipping" || needsCommanderMappedInfluenceChoice(space, player)) return null;
  if (space.personal) return space.influence;
  if (space.influence === "emperor") return "greatHouses";
  if (space.influence === "fremen") return "fringeWorlds";
  return space.influence;
}
