import {
  isContingencyPlanIntrigue,
  isCunningIntrigue,
  isDistractionIntrigue,
  isInspireAweIntrigue,
  isIntelligenceReportIntrigue,
  isLeverageIntrigue,
  isManipulateIntrigue,
} from "./card-identifiers";
import {
  drawCards,
} from "./deck-utils";
import {
  acquirableCardsForPending,
  activatedAllyEffectOwner,
} from "./market-rules";
import {
  canPlayDistractionPlotIntrigue,
  distractionSpyPending,
} from "./spy-pending-rules";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import { trashableCards } from "./trash-rules";
import type {
  GameState,
  PendingAction,
} from "./types";

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type CunningPlotChoice = "draw" | "paid-trash";

export function playContingencyPlanPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isContingencyPlanIntrigue,
    (player) => `${player.leader} plays Contingency Plan as a Plot Intrigue for 2 Solari.`,
  );
}

export function playManipulatePlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  cardId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isManipulateIntrigue(intrigue)) return state;

  const rowIndex = state.imperiumRow.findIndex((card) => card.id === cardId);
  const manipulatedCard = state.imperiumRow[rowIndex];
  if (!manipulatedCard) return state;
  const [replacement, ...marketDeck] = state.marketDeck;
  const imperiumRow = state.imperiumRow.flatMap((candidate, index) => {
    if (index !== rowIndex) return [candidate];
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          manipulatedCards: [...candidate.manipulatedCards, manipulatedCard],
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );

  return {
    ...state,
    players,
    imperiumRow,
    marketDeck,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Manipulate, removes ${manipulatedCard.name} from the Imperium Row, and may acquire it for 1 Persuasion less this round.`,
      ...state.log,
    ],
  };
}

export function playLeveragePlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isLeverageIntrigue,
    (player, contractPending) => {
      const contractText = contractPending ? " and may take a face-up CHOAM contract" : "";
      return `${player.leader} plays Leverage, gains 1 Solari${contractText}.`;
    },
  );
}

export function playDistractionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId || !canPlayDistractionPlotIntrigue(state, player)) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDistractionIntrigue(intrigue)) return state;

  return {
    ...state,
    players: state.players.map((candidate) =>
      candidate.id === player.id
        ? { ...candidate, intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id) }
        : candidate,
    ),
    pendingAction: distractionSpyPending(player),
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Distraction and may place a spy on another player's observation post.`,
      ...state.log,
    ],
  };
}

export function playInspireAwePlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  sandwormOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isInspireAweIntrigue(intrigue)) return state;

  const sandwormOwnerResult =
    player.role === "Commander"
      ? activatedAllyEffectOwner(state, player, sandwormOwnerId)
      : { valid: true, owner: player };
  if (!sandwormOwnerResult.valid || !sandwormOwnerResult.owner) return state;
  const sandwormOwner = sandwormOwnerResult.owner;
  const hasSharedSandworm =
    player.deployedSandworms > 0 ||
    (player.role === "Commander" && sandwormOwner.deployedSandworms > 0);
  const acquirePending: AcquireCardPendingAction = {
    kind: "acquire-card",
    ownerId: player.id,
    source: "Inspire Awe",
    maxCost: 3,
    destination: hasSharedSandworm ? "hand" : "discard",
  };
  const canAcquire = acquirableCardsForPending(state, acquirePending).length > 0;
  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? { ...candidate, intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id) }
      : candidate,
  );
  const destinationText = hasSharedSandworm ? "hand" : "discard pile";
  const acquireText = canAcquire
    ? ` and must acquire a card that costs 3 or less to their ${destinationText}`
    : ", but no eligible card is available";
  const sandwormText =
    player.role === "Commander" && sandwormOwner.id !== player.id && sandwormOwner.deployedSandworms > 0
      ? ` through ${sandwormOwner.leader}'s sandworm`
      : "";

  return {
    ...state,
    players,
    pendingAction: canAcquire ? acquirePending : undefined,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [`${player.leader} plays Inspire Awe${sandwormText}${acquireText}.`, ...state.log],
  };
}

export function playIntelligenceReportPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isIntelligenceReportIntrigue,
    (player, _contractPending, _activatedAlly, _resolved, outcome) => {
      const cardText = outcome.cardsDrawn === 1 ? "1 card" : `${outcome.cardsDrawn} cards`;
      return `${player.leader} plays Intelligence Report as a Plot Intrigue and draws ${cardText}.`;
    },
  );
}

export function playCunningPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: CunningPlotChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isCunningIntrigue(intrigue)) return state;
  if (choice !== "draw" && choice !== "paid-trash") return state;
  if (choice === "paid-trash" && player.resources.spice < 1) return state;

  let cardsDrawn = 0;
  let canTrashAfterDraw = false;
  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    const withoutIntrigue = {
      ...candidate,
      resources: {
        ...candidate.resources,
        spice: candidate.resources.spice - (choice === "paid-trash" ? 1 : 0),
      },
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
    };
    const drawn = drawCards(withoutIntrigue, withoutIntrigue.hand.length + 1);
    cardsDrawn = drawn.hand.length - withoutIntrigue.hand.length;
    canTrashAfterDraw = trashableCards(drawn).length > 0;
    return drawn;
  });
  if (choice === "paid-trash" && !canTrashAfterDraw) return state;

  const trashPending: PendingAction | undefined = choice === "paid-trash"
    ? { kind: "trash-card", ownerId: player.id, source: "Cunning", optional: false }
    : undefined;
  const cardText = cardsDrawn === 1 ? "1 card" : `${cardsDrawn} cards`;
  const log = choice === "paid-trash"
    ? `${player.leader} plays Cunning, spends 1 spice, draws ${cardText}, and must trash 1 card.`
    : `${player.leader} plays Cunning and draws ${cardText}.`;
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    pendingAction: trashPending,
    log: [log, ...state.log],
  };
}
