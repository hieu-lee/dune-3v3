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
  activatedAllyEffectOwner,
} from "./market-rules";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import type {
  GameState,
} from "./types";

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
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isManipulateIntrigue,
    (player, _contractPending, _activatedAlly, _resolved, outcome) =>
      `${player.leader} plays Manipulate, removes ${outcome.manipulatedCard?.name ?? "a card"} from the Imperium Row, and may acquire it for 1 Persuasion less this round.`,
    { targetCardId: cardId },
  );
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
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isDistractionIntrigue,
    (player) => `${player.leader} plays Distraction and may place a spy on another player's observation post.`,
  );
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
  const choiceId = hasSharedSandworm ? "to-hand" : "to-discard";
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isInspireAweIntrigue,
    (actor, _contractPending, activatedAlly, _resolved, outcome) => {
      const destinationText = outcome.acquireDestination === "hand" ? "hand" : "discard pile";
      const acquireText = outcome.acquirePending
        ? ` and must acquire a card that costs 3 or less to their ${destinationText}`
        : ", but no eligible card is available";
      const sandwormText =
        actor.role === "Commander" && activatedAlly && activatedAlly.deployedSandworms > 0
          ? ` through ${activatedAlly.leader}'s sandworm`
          : "";
      return `${actor.leader} plays Inspire Awe${sandwormText}${acquireText}.`;
    },
    {
      choiceId,
      ...(player.role === "Commander" ? { activatedAllyOwnerId: sandwormOwnerId, requireActivatedAlly: true } : {}),
    },
  );
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
  if (choice !== "draw" && choice !== "paid-trash") return state;

  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isCunningIntrigue,
    (player, _contractPending, _activatedAlly, resolved, outcome) => {
      const cardText = outcome.cardsDrawn === 1 ? "1 card" : `${outcome.cardsDrawn} cards`;
      return (resolved.spentResources.spice ?? 0) > 0
        ? `${player.leader} plays Cunning, spends 1 spice, draws ${cardText}, and must trash 1 card.`
        : `${player.leader} plays Cunning and draws ${cardText}.`;
    },
    { choiceId: choice },
  );
}
