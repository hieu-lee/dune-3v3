import {
  boardSpaces,
  factionLabels,
  leaderCardByName,
} from "./data";
import {
  applyBoardEffect,
} from "./agent-effects";
import {
  boardSpaceRewardApplies,
} from "./board-rules";
import {
  pendingActionForReverendMotherJessicaRepeat,
  shaddamSignetRingInfluenceChoices,
  shaddamSignetRingInfluenceCost,
  shaddamSignetRingTroopCost,
} from "./card-pending-rules";
import {
  drawCards,
  playerTroopSupply,
} from "./deck-utils";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  ladyAmberMetulliLeaderName,
  ladyJessicaLeaderName,
  princessIrulanLeaderName,
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import {
  irulanSignetAcquireCards,
  irulanSignetAcquirePending,
  irulanSignetTrashableCards,
  irulanSignetTrashPending,
} from "./market-rules";
import {
  advancePendingAction,
  prependPendingAction,
} from "./pending-actions";
import { pendingActionForSpace } from "./placement-rules";
import {
  hasUsedReverendMotherJessicaRepeat,
  recordReverendMotherJessicaRepeat,
  recordTurnSpiceGain,
} from "./turn-trackers";
import {
  isGenericSignetRingCard,
  isShaddamSignetRingCard,
} from "./card-identifiers";
import type {
  FactionId,
  GameState,
  PendingAction,
} from "./types";

export type ShaddamSignetRingChoice = "skip" | "troop" | { kind: "influence"; faction: FactionId };
export type IrulanSignetRingChoice = "skip" | "acquire" | "trash";
export type LadyAmberDesertScoutsChoice = "retreat" | "skip";
export type JessicaSpiceAgonyChoice = "pay" | "skip";
export type JessicaWaterOfLifeChoice = "pay" | "skip";
export type JessicaReverendMotherChoice = "repeat" | "skip";
export type JessicaOtherMemoriesChoice = "flip" | "skip";

type ShaddamSignetRingPendingAction = Extract<PendingAction, { kind: "shaddam-signet-ring" }>;
type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;
type LadyAmberDesertScoutsPendingAction = Extract<PendingAction, { kind: "amber-desert-scouts" }>;
type JessicaSpiceAgonyPendingAction = Extract<PendingAction, { kind: "jessica-spice-agony" }>;
type JessicaWaterOfLifePendingAction = Extract<PendingAction, { kind: "jessica-water-of-life" }>;
type JessicaReverendMotherPendingAction = Extract<PendingAction, { kind: "jessica-reverend-mother" }>;
type JessicaOtherMemoriesPendingAction = Extract<PendingAction, { kind: "jessica-other-memories" }>;

export function resolveLadyAmberDesertScoutsChoice(
  state: GameState,
  pending: LadyAmberDesertScoutsPendingAction,
  choice: LadyAmberDesertScoutsChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || owner.leader !== ladyAmberMetulliLeaderName || owner.role !== "Ally") return state;

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} keeps her deployed troops for ${pending.source}.`, ...state.log],
    };
  }

  if (owner.deployedTroops <= 0) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            garrison: player.garrison + 1,
            deployedTroops: player.deployedTroops - 1,
            conflict: Math.max(0, player.conflict - 2),
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [`${owner.leader} resolves ${pending.source}: retreats 1 troop.`, ...state.log],
  };
}

export function resolveShaddamSignetRingChoice(
  state: GameState,
  pending: ShaddamSignetRingPendingAction,
  choice: ShaddamSignetRingChoice,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const ally = state.players.find((player) => player.id === pending.allyId);
  if (
    !commander ||
    commander.team !== "shaddam" ||
    commander.role !== "Commander" ||
    !commander.playArea.some((card) => card.id === pending.cardId && isShaddamSignetRingCard(card)) ||
    !ally ||
    ally.team !== commander.team ||
    ally.role !== "Ally"
  ) {
    return state;
  }

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${commander.leader} declines to pay for ${pending.source}.`, ...state.log],
    };
  }

  if (choice === "troop") {
    if (commander.resources.solari < shaddamSignetRingTroopCost) return state;
    return {
      ...state,
      players: state.players.map((player) => {
        if (player.id === commander.id) {
          return {
            ...player,
            resources: {
              ...player.resources,
              solari: player.resources.solari - shaddamSignetRingTroopCost,
            },
          };
        }
        if (player.id === ally.id) return { ...player, garrison: player.garrison + 1 };
        return player;
      }),
      ...advancePendingAction(state),
      log: [
        `${commander.leader} spends 1 Solari for ${pending.source}: ${ally.leader} recruits 1 troop.`,
        ...state.log,
      ],
    };
  }

  if (
    commander.resources.solari < shaddamSignetRingInfluenceCost ||
    !shaddamSignetRingInfluenceChoices.includes(choice.faction)
  ) {
    return state;
  }
  const influenceOwnerId = choice.faction === "emperor" ? commander.id : ally.id;
  const influenceOwner = influenceOwnerId === commander.id ? commander : ally;
  const nextState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id === commander.id) {
        const paid = {
          ...player,
          resources: { ...player.resources, solari: player.resources.solari - shaddamSignetRingInfluenceCost },
        };
        return influenceOwnerId === commander.id ? adjustInfluence(paid, choice.faction, 1) : paid;
      }
      if (player.id !== influenceOwnerId) return player;
      return adjustInfluence(
        player,
        choice.faction,
        1,
      );
    }),
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 3 Solari for ${pending.source}: ${influenceOwner.leader} gains 1 ${factionLabels[choice.faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function resolveIrulanSignetRingChoice(
  state: GameState,
  pending: IrulanSignetRingPendingAction,
  choice: IrulanSignetRingChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (
    !owner ||
    owner.leader !== princessIrulanLeaderName ||
    owner.role !== "Ally" ||
    !owner.playArea.some((card) => card.id === pending.cardId && isGenericSignetRingCard(card))
  ) {
    return state;
  }

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  if (choice === "acquire") {
    if (irulanSignetAcquireCards(state, pending).length === 0) return state;
    return {
      ...state,
      pendingAction: irulanSignetAcquirePending(owner.id),
      log: [`${owner.leader} chooses the acquisition branch for ${pending.source}.`, ...state.log],
    };
  }

  if (irulanSignetTrashableCards(state, pending).length === 0) return state;
  return {
    ...state,
    pendingAction: irulanSignetTrashPending(owner.id),
    log: [`${owner.leader} chooses the trash branch for ${pending.source}.`, ...state.log],
  };
}

export function resolveJessicaSpiceAgonyChoice(
  state: GameState,
  pending: JessicaSpiceAgonyPendingAction,
  choice: JessicaSpiceAgonyChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (
    !owner ||
    owner.leader !== ladyJessicaLeaderName ||
    owner.role !== "Ally" ||
    !owner.playArea.some((card) => card.id === pending.cardId && isGenericSignetRingCard(card))
  ) {
    return state;
  }

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  if (owner.resources.spice < 1 || playerTroopSupply(owner) <= 0) return state;
  const paidState: GameState = {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            resources: { ...player.resources, spice: player.resources.spice - 1 },
            jessicaMemories: player.jessicaMemories + 1,
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [`${owner.leader} spends 1 spice for ${pending.source} and moves a supply troop as 1 memory.`, ...state.log],
  };
  return drawIntrigueCards(paidState, owner.id, 1, pending.source);
}

export function resolveJessicaWaterOfLifeChoice(
  state: GameState,
  pending: JessicaWaterOfLifePendingAction,
  choice: JessicaWaterOfLifeChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (
    !owner ||
    owner.leader !== reverendMotherJessicaLeaderName ||
    owner.role !== "Ally" ||
    !owner.playArea.some((card) => card.id === pending.cardId && isGenericSignetRingCard(card))
  ) {
    return state;
  }

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  if (owner.resources.spice < 1) return state;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            resources: {
              ...player.resources,
              spice: player.resources.spice - 1,
              water: player.resources.water + 1,
            },
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [`${owner.leader} spends 1 spice for ${pending.source} and gains 1 water.`, ...state.log],
  };
}

export function resolveJessicaReverendMotherChoice(
  state: GameState,
  pending: JessicaReverendMotherPendingAction,
  choice: JessicaReverendMotherChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  if (!owner || !space) return state;

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} declines ${pending.source}.`, ...state.log],
    };
  }

  if (
    owner.leader !== reverendMotherJessicaLeaderName ||
    owner.role !== "Ally" ||
    owner.resources.water < 1 ||
    (space.icon !== "bene" && space.icon !== "fremen") ||
    Boolean(space.personal) ||
    hasUsedReverendMotherJessicaRepeat(state, owner.id)
  ) {
    return state;
  }

  const paidOwner = {
    ...owner,
    resources: { ...owner.resources, water: owner.resources.water - 1 },
  };
  const { source: repeatedOwner } = applyBoardEffect(paidOwner, paidOwner, space);
  const players = state.players.map((player) => (player.id === owner.id ? repeatedOwner : player));
  const baseState = recordReverendMotherJessicaRepeat({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [`${owner.leader} spends 1 water for ${pending.source} to repeat ${space.name}.`, ...state.log],
  }, owner.id);
  const repeatedPending = pendingActionForSpace(space, repeatedOwner, repeatedOwner, players);
  const withPending = prependPendingAction(baseState, repeatedPending);
  const intrigueGain = boardSpaceRewardApplies(space, paidOwner) ? space.gain?.intrigue ?? 0 : 0;
  const withIntrigue = intrigueGain > 0
    ? drawIntrigueCards(withPending, owner.id, intrigueGain, `${pending.source} / ${space.name}`)
    : withPending;
  const spiceGain = boardSpaceRewardApplies(space, paidOwner) ? space.gain?.spice ?? 0 : 0;
  return spiceGain > 0 ? recordTurnSpiceGain(withIntrigue, owner.id, spiceGain) : withIntrigue;
}

export function resolveJessicaOtherMemoriesChoice(
  state: GameState,
  pending: JessicaOtherMemoriesPendingAction,
  choice: JessicaOtherMemoriesChoice,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  if (!owner || owner.leader !== ladyJessicaLeaderName || owner.role !== "Ally" || owner.jessicaMemories <= 0 || space?.icon !== "bene") return state;

  if (choice === "skip") {
    return {
      ...state,
      ...advancePendingAction(state),
      log: [`${owner.leader} keeps her memories and remains Lady Jessica.`, ...state.log],
    };
  }

  const memories = owner.jessicaMemories;
  const drawnOwner = drawCards(
    {
      ...owner,
      leader: reverendMotherJessicaLeaderName,
      leaderCard: leaderCardByName(reverendMotherJessicaLeaderName),
      jessicaMemories: 0,
    },
    owner.hand.length + memories,
  );
  const drawn = drawnOwner.hand.length - owner.hand.length;
  const memoryText = `${memories} ${memories === 1 ? "memory" : "memories"}`;
  const cardText = `${drawn} ${drawn === 1 ? "card" : "cards"}`;
  const baseState = {
    ...state,
    players: state.players.map((player) => (player.id === owner.id ? drawnOwner : player)),
    ...advancePendingAction(state),
    log: [`${owner.leader} returns ${memoryText} for ${cardText} and becomes Reverend Mother Jessica.`, ...state.log],
  };
  return prependPendingAction(
    baseState,
    pendingActionForReverendMotherJessicaRepeat(baseState, drawnOwner, space),
  );
}
