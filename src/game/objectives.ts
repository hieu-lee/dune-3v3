import { sixPlayerObjectiveCards } from "./data";
import { cloneObjectives, shuffleItems } from "./deck-utils";
import type { ObjectiveCard, Player, TeamId } from "./types";

const opposingAdjacentAllyIds: Record<string, string> = {
  p2: "p3",
  p3: "p2",
  p5: "p6",
  p6: "p5",
};

function objectiveIconCount(players: Player[], team: TeamId, battleIcon: ObjectiveCard["battleIcon"]) {
  return players
    .filter((player) => player.team === team)
    .flatMap((player) => player.objectives)
    .filter((objective) => objective.battleIcon === battleIcon)
    .length;
}

export function balanceSixPlayerObjectives(players: Player[]) {
  const overloadedTeam = (["muaddib", "shaddam"] as TeamId[]).find(
    (team) => objectiveIconCount(players, team, "desertMouse") === 2,
  );
  if (!overloadedTeam) return players;

  const desertMouseOwner = players.find((player) =>
    player.team === overloadedTeam
      && player.objectives.some((objective) => objective.id === "objective-desert-mouse-4-6p")
  );
  if (!desertMouseOwner) return players;

  const tradePartnerId = opposingAdjacentAllyIds[desertMouseOwner.id];
  const tradePartner = players.find((player) => player.id === tradePartnerId);
  if (!tradePartner || tradePartner.team === desertMouseOwner.team || tradePartner.objectives.length !== 1) {
    return players;
  }

  const ownerObjective = desertMouseOwner.objectives[0];
  const partnerObjective = tradePartner.objectives[0];
  return players.map((player) => {
    if (player.id === desertMouseOwner.id) return { ...player, objectives: [partnerObjective] };
    if (player.id === tradePartner.id) return { ...player, objectives: [ownerObjective] };
    return player;
  });
}

export function dealSixPlayerObjectives(players: Player[]) {
  const objectives = shuffleItems(cloneObjectives(sixPlayerObjectiveCards));
  const allies = players.filter((player) => player.role === "Ally");
  if (allies.length !== objectives.length) {
    throw new Error(`Expected ${objectives.length} Allies for six-player Objectives, found ${allies.length}.`);
  }

  const objectiveByPlayerId = new Map(allies.map((player, index) => [player.id, objectives[index]]));
  const assignedPlayers = players.map((player) => ({
    ...player,
    objectives: player.role === "Ally" ? [objectiveByPlayerId.get(player.id)!] : [],
  }));
  const balancedPlayers = balanceSixPlayerObjectives(assignedPlayers);
  const firstPlayerId = balancedPlayers.find((player) =>
    player.objectives.some((objective) => objective.firstPlayer)
  )?.id;
  const firstSeat = Math.max(0, balancedPlayers.findIndex((player) => player.id === firstPlayerId));
  return { players: balancedPlayers, firstSeat };
}
