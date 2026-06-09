import {
  imperiumDeck,
  reserveMarket,
  teams,
} from "./data";
import { canMoveCardToThroneRow } from "./card-identifiers";
import { canHaveMakerHooks } from "./conflict-rules";
import {
  cloneCards,
  shuffleCards,
} from "./deck-utils";
import { dealSixPlayerObjectives } from "./objectives";
import { makePlayer } from "./player-setup";
import {
  buildChoamContractDeck,
  buildIntrigueDeck,
  buildSixPlayerConflictDeck,
  emptyMakerSpice,
} from "./setup-utils";
import type { GameState, PendingAction } from "./types";

const shaddamPersonalBoardThroneSource = "Emperor personal board";

export function pendingActionForShaddamPersonalBoard(state: GameState): PendingAction | undefined {
  const shaddam = state.players.find((player) => player.team === "shaddam" && player.role === "Commander");
  if (!shaddam || !state.imperiumRow.some(canMoveCardToThroneRow)) return undefined;
  return { kind: "throne-row", ownerId: shaddam.id, source: shaddamPersonalBoardThroneSource };
}

type InitialGameOptions = {
  includeSetupPending?: boolean;
};

export function initialGame({ includeSetupPending = true }: InitialGameOptions = {}): GameState {
  const market = shuffleCards(cloneCards(imperiumDeck));
  const [conflict, ...conflictDeck] = buildSixPlayerConflictDeck();
  if (!conflict) throw new Error("Missing Uprising conflict cards for six-player setup.");
  const contracts = buildChoamContractDeck();
  const intrigueDeck = buildIntrigueDeck();

  const playersBeforeObjectives = [
    makePlayer("p1", "Seat 1", "Muad'Dib", "muaddib", "Commander", "#45c4b0"),
    makePlayer("p2", "Seat 2", "Feyd-Rautha Harkonnen", "shaddam", "Ally", "#d26b48"),
    makePlayer("p3", "Seat 3", "Gurney Halleck", "muaddib", "Ally", "#2f8fdd"),
    makePlayer("p4", "Seat 4", "Shaddam Corrino IV", "shaddam", "Commander", "#efb447"),
    makePlayer("p5", "Seat 5", "Lady Jessica", "muaddib", "Ally", "#8ad5ff"),
    makePlayer("p6", "Seat 6", "Princess Irulan", "shaddam", "Ally", "#f08f82"),
  ];
  const { players, firstSeat } = dealSixPlayerObjectives(playersBeforeObjectives);

  const game: GameState = {
    phase: "playing",
    round: 1,
    activeSeat: firstSeat,
    firstSeat,
    agentTurnComplete: false,
    roundMakerSpaceVisits: {},
    turnHarvestContractIds: {},
    turnMakerSpaceVisits: {},
    turnAcquiredCardIds: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnSpyRecalls: {},
    turnUnitDeployments: {},
    players,
    spaces: {},
    agentPlacementOwners: {},
    agentPlacementCoOwners: {},
    agentPlacementCoOwnerTargets: {},
    spyPosts: {},
    sharedSpyPosts: {},
    alliances: {},
    locationControl: {},
    combatPasses: [],
    makerSpice: emptyMakerSpice(),
    imperiumRow: market.slice(0, 5),
    marketDeck: market.slice(5),
    reserveMarket: cloneCards(reserveMarket),
    throneRow: [],
    contractOffer: contracts.slice(0, 2),
    contractDeck: contracts.slice(2),
    intrigueDeck,
    intrigueDiscard: [],
    conflict,
    conflictDeck,
    conflictDiscard: [],
    shieldWall: true,
    swordmasterClaimed: false,
    pendingQueue: [],
    conflictDeploymentBlock: undefined,
    log: [
      `Round 1 begins. ${conflict.name} is revealed. ${players[firstSeat].leader} has first action.`,
      `Only Allies draw Objectives; ${players[firstSeat].leader} has the First Player marker.`,
    ],
  };
  const setupPending = includeSetupPending ? pendingActionForShaddamPersonalBoard(game) : undefined;
  return setupPending
    ? {
        ...game,
        pendingAction: setupPending,
        log: [
          "Resolve Shaddam's starting Throne Row choice from the Emperor personal board.",
          ...game.log,
        ],
      }
    : game;
}

export function setShieldWall(state: GameState, standing: boolean) {
  if (state.shieldWall === standing) return state;
  return {
    ...state,
    shieldWall: standing,
    log: [
      standing ? "The Shield Wall is standing." : "The Shield Wall has been removed.",
      ...state.log,
    ],
  };
}

export function setMakerHooks(state: GameState, playerId: string, hasHooks: boolean) {
  const owner = state.players.find((player) => player.id === playerId);
  if (!owner || !canHaveMakerHooks(owner) || owner.makerHooks === hasHooks) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      canHaveMakerHooks(player) ? { ...player, makerHooks: hasHooks } : player,
    ),
    log: [
      hasHooks
        ? `${teams.muaddib.name} Allies gain Maker Hooks.`
        : `${teams.muaddib.name} Allies return Maker Hooks.`,
      ...state.log,
    ],
  };
}
