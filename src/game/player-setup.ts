import {
  allyStarterCards,
  commanderStarterDecks,
  leaderCardByName,
} from "./data";
import {
  cloneCards,
  drawCards,
  shuffleCards,
} from "./deck-utils";
import { buildShaddamContractReserve } from "./setup-utils";
import type { Influence, Player, Role, TeamId } from "./types";

export const stabanTuekLeaderName = "Staban Tuek";

export const emptyInfluence = (): Influence => ({
  emperor: 0,
  spacing: 0,
  bene: 0,
  fremen: 0,
  greatHouses: 0,
  fringeWorlds: 0,
});

export function leaderStarterDeckCards(leader: string, team: TeamId, role: Role) {
  const starterDeck = role === "Commander" ? commanderStarterDecks[team] : allyStarterCards;
  return leader === stabanTuekLeaderName && role === "Ally"
    ? starterDeck.filter((card) => card.name !== "Diplomacy")
    : starterDeck;
}

function buildStarterDeck(playerId: string, team: TeamId, role: Role, leader: string) {
  const starterDeck = leaderStarterDeckCards(leader, team, role);
  const expectedSize = leader === stabanTuekLeaderName && role === "Ally" ? 9 : 10;
  if (starterDeck.length !== expectedSize) {
    throw new Error(`${leader} ${team} ${role} starter deck must contain ${expectedSize} cards, found ${starterDeck.length}.`);
  }
  return shuffleCards(
    cloneCards(starterDeck).map((card, index) => ({ ...card, id: `${playerId}-${card.id}-${index + 1}` })),
  );
}

export function makePlayer(
  id: string,
  name: string,
  leader: string,
  team: TeamId,
  role: Role,
  color: string,
): Player {
  const player: Player = {
    id,
    name,
    leader,
    leaderCard: leaderCardByName(leader),
    team,
    role,
    color,
    vp: role === "Commander" ? 4 : 1,
    resources: { solari: 2, spice: 0, water: 1 },
    influence: emptyInfluence(),
    deck: buildStarterDeck(id, team, role, leader),
    hand: [],
    discard: [],
    playArea: [],
    manipulatedCards: [],
    intrigues: [],
    agentsReady: 2,
    agentsTotal: 2,
    garrison: role === "Commander" ? 0 : 3,
    conflict: 0,
    deployedTroops: 0,
    deployedSandworms: 0,
    makerHooks: false,
    spies: 3,
    revealed: false,
    persuasion: 0,
    highCouncilSeat: false,
    callToArmsActive: false,
    gurneyAlwaysSmilingScored: false,
    jessicaMemories: 0,
    purchaseSequence: 0,
    swordmasterBonus: false,
    contracts: [],
    reservedContracts: team === "shaddam" && role === "Commander" ? buildShaddamContractReserve() : [],
    objectives: [],
    wonConflicts: [],
  };
  return drawCards(player, 5);
}
