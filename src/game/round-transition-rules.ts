import {
  combatIntrigueActorIds,
  firstCombatSeat,
  nextCombatSeat,
} from "./combat-intrigue-rules";
import { criticalLocationNames } from "./critical-locations";
import { resolveCurrentConflict } from "./conflict-awards";
import { drawCards } from "./deck-utils";
import {
  advanceMakerSpice,
  advanceSeat,
  allPlayersDone,
  endgameTriggerReason,
} from "./game-flow";
import { pendingActionForControlDefense } from "./location-control";
import { resolvePlayCombatIntrigue } from "./combat-intrigue-play-rules";
import { advancePastUnresolvableMandatoryTrash } from "./trash-rules";
import type { CombatIntrigueChoice } from "./combat-intrigue-play-rules";
import type { GameState } from "./types";

function clearRevealTurnEffects(state: GameState): GameState {
  return {
    ...state,
    conflictDeploymentBlock: undefined,
    players: state.players.map((player) =>
      player.callToArmsActive || player.revealActivatedAllyId || player.manipulatedCards.length > 0
        ? { ...player, callToArmsActive: false, revealActivatedAllyId: undefined, manipulatedCards: [] }
        : player,
    ),
  };
}

export function startNextRound(state: GameState): GameState {
  const resolvedState = resolveCurrentConflict(clearRevealTurnEffects(state));
  if (resolvedState.pendingAction || resolvedState.pendingQueue.length > 0) return resolvedState;

  const endgameReason = endgameTriggerReason(resolvedState);
  if (endgameReason) {
    return {
      ...resolvedState,
      phase: "endgame",
      pendingAction: undefined,
      pendingQueue: [],
      combatPasses: [],
      endgameReason,
      log: [
        `Endgame triggered: ${endgameReason} Resolve Endgame Intrigue cards, then finalize team scores.`,
        ...resolvedState.log,
      ],
    };
  }

  const firstSeat = (resolvedState.firstSeat + 1) % resolvedState.players.length;
  const [nextConflict, ...conflictDeck] = resolvedState.conflictDeck;
  const players = resolvedState.players.map((player) => {
    const agentsTotal = player.swordmasterAgentSpent ? 2 : player.agentsTotal;
    return drawCards(
      {
        ...player,
        agentsTotal,
        agentsReady: agentsTotal,
        revealed: false,
        persuasion: 0,
        highCouncilSeat: player.highCouncilSeat,
        revealActivatedAllyId: undefined,
        commanderActivatedAllyIds: [],
        callToArmsActive: false,
        gurneyAlwaysSmilingScored: false,
        muadDibUnpredictableFoeResolved: false,
        conflict: 0,
        deployedTroops: 0,
        deployedSandworms: 0,
        hand: [],
        discard: [...player.discard, ...player.playArea, ...player.hand],
        playArea: [],
        manipulatedCards: [],
      },
      5,
    );
  });
  const controlDefensePending = pendingActionForControlDefense(resolvedState, nextConflict, players);
  return {
    ...resolvedState,
    phase: "playing",
    round: resolvedState.round + 1,
    agentTurnComplete: false,
    roundMakerSpaceVisits: {},
    turnHarvestContractIds: {},
    turnMakerSpaceVisits: {},
    turnAcquiredCardIds: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnSpyRecalls: {},
    turnUnitDeployments: {},
    firstSeat,
    activeSeat: firstSeat,
    players,
    spaces: {},
    agentPlacementOwners: {},
    agentPlacementCoOwners: {},
    agentPlacementCoOwnerTargets: {},
    makerSpice: advanceMakerSpice(resolvedState),
    pendingAction: controlDefensePending,
    pendingQueue: [],
    conflictDeploymentBlock: undefined,
    combatPasses: [],
    conflict: nextConflict ?? null,
    conflictDeck,
    log: [
      controlDefensePending
        ? `${players.find((player) => player.id === controlDefensePending.ownerId)?.leader ?? "Player"} controls ${criticalLocationNames[controlDefensePending.location]} and may deploy 1 troop from supply to the Conflict.`
        : undefined,
      nextConflict
        ? `Round ${resolvedState.round + 1} begins. ${nextConflict.name} is revealed. ${players[firstSeat].leader} has first action.`
        : `Round ${resolvedState.round + 1} begins with no conflict cards remaining. ${players[firstSeat].leader} has first action.`,
      ...resolvedState.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

export function finishCombatIfNoActors(state: GameState): GameState {
  if (state.phase !== "combat" || state.pendingAction || state.pendingQueue.length > 0) return state;
  if (combatIntrigueActorIds(state).length > 0) return state;
  return startNextRound({ ...state, phase: "playing", combatPasses: [] });
}

function advanceAfterCombatIntriguePlay(state: GameState): GameState {
  const actorIds = combatIntrigueActorIds(state);
  if (actorIds.length === 0 && (state.pendingAction || state.pendingQueue.length > 0)) return state;
  if (actorIds.length === 0) return startNextRound({ ...state, phase: "playing", combatPasses: [] });
  return { ...state, activeSeat: nextCombatSeat(state, actorIds) };
}

export function startCombatPhase(state: GameState): GameState {
  if (state.pendingAction || state.pendingQueue.length > 0) return state;
  const clearedState = clearRevealTurnEffects(state);
  const actorIds = combatIntrigueActorIds(clearedState);
  if (actorIds.length === 0) return startNextRound(clearedState);
  const activeSeat = firstCombatSeat(clearedState, actorIds);
  return {
    ...clearedState,
    phase: "combat",
    agentTurnComplete: false,
    turnHarvestContractIds: {},
    turnMakerSpaceVisits: {},
    turnAcquiredCardIds: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnSpyRecalls: {},
    turnUnitDeployments: {},
    activeSeat,
    combatPasses: [],
    pendingAction: undefined,
    pendingQueue: [],
    log: [`Combat begins. ${state.players[activeSeat].leader} may play Combat Intrigues or pass.`, ...state.log],
  };
}

export function maybeStartCombatPhase(state: GameState): GameState {
  const resolvedState = advancePastUnresolvableMandatoryTrash(state);
  if (resolvedState.phase !== "playing") return resolvedState;
  if (resolvedState.pendingAction || resolvedState.pendingQueue.length > 0) return resolvedState;
  const activePlayer = resolvedState.players[resolvedState.activeSeat];
  if (
    activePlayer &&
    resolvedState.agentTurnComplete &&
    !activePlayer.revealed &&
    activePlayer.intrigues.length === 0
  ) {
    return maybeStartCombatPhase({
      ...resolvedState,
      agentTurnComplete: false,
      turnHarvestContractIds: {},
      turnMakerSpaceVisits: {},
      turnAcquiredCardIds: {},
      turnSpiceGains: {},
      turnReverendMotherJessicaRepeats: {},
      turnSpyRecalls: {},
      turnUnitDeployments: {},
      activeSeat: advanceSeat(resolvedState),
    });
  }
  if (resolvedState.players[resolvedState.activeSeat]?.revealed) return resolvedState;
  if (!allPlayersDone(resolvedState.players)) return resolvedState;
  return startCombatPhase(resolvedState);
}

export function finishRevealTurn(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId || !player.revealed) return state;
  const clearedState = {
    ...state,
    agentTurnComplete: false,
    turnHarvestContractIds: {},
    turnMakerSpaceVisits: {},
    turnAcquiredCardIds: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnSpyRecalls: {},
    turnUnitDeployments: {},
    conflictDeploymentBlock: undefined,
    players: state.players.map((candidate) =>
      candidate.id === player.id
        ? { ...candidate, callToArmsActive: false, revealActivatedAllyId: undefined, manipulatedCards: [] }
        : candidate,
    ),
  };
  if (allPlayersDone(clearedState.players)) return startCombatPhase(clearedState);
  return { ...clearedState, activeSeat: advanceSeat(clearedState) };
}

export function passCombatIntrigue(state: GameState, actorId: string): GameState {
  if (state.phase !== "combat" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const actor = state.players[state.activeSeat];
  const actorIds = combatIntrigueActorIds(state);
  if (!actor || actor.id !== actorId || !actorIds.includes(actorId)) return state;

  const passLog = [`${actor.leader} passes Combat Intrigues.`, ...state.log];
  const combatPasses = [...state.combatPasses, actorId];
  if (combatPasses.length >= actorIds.length) {
    return startNextRound({ ...state, phase: "playing", combatPasses: [], log: passLog });
  }

  return {
    ...state,
    combatPasses,
    activeSeat: nextCombatSeat(state, actorIds),
    log: passLog,
  };
}

export function playCombatIntrigue(
  state: GameState,
  actorId: string,
  intrigueId: string,
  targetId?: string,
  combatChoice?: CombatIntrigueChoice,
): GameState {
  return resolvePlayCombatIntrigue(
    state,
    actorId,
    intrigueId,
    targetId,
    combatChoice,
    advanceAfterCombatIntriguePlay,
  );
}
