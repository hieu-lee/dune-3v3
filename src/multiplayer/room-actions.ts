import {
  activatedAllyIdFor,
  placeAgentAction,
  revealTurnAction,
  revealTurnPlan,
} from "../app-turn-actions";
import { boardSpaces } from "../game/data";
import * as gameRules from "../game/state";
import {
  acquireMarketCard,
  advanceSeat,
  agentSpaceAvailable,
  canMoveCardToThroneRow,
  canPay,
  effectiveCost,
  finishRevealTurn,
  iconCanReach,
  maybeStartCombatPhase,
  moveImperiumCardToThroneRow,
} from "../game/state";
import type {
  FactionId,
  GameState,
  PendingAction,
  Player,
  TradeGoodId,
  TrashCardZone,
} from "../game/types";
import type {
  BuyAccessChoice,
  ChangeAllegiancesChoice,
  CombatIntrigueChoice,
  CunningPlotChoice,
  DepartForArrakisChoice,
  ImperiumPoliticsChoice,
  InfluenceExchangeChoice,
  InfluenceLossPair,
  LadyAmberDesertScoutsChoice,
  LeaderTransitionChoice,
  MarketOpportunityChoice,
  RepeatBoardSpaceChoice,
  SietchRitualChoice,
  SpecialMissionChoice,
  StabanUnseenNetworkChoice,
  StrategicStockpilingChoice,
  TopDeckSelectionChoice,
} from "../game/state";

export type RoomPendingActionCommand =
  | { kind: "acquire-pending-card"; cardId: string }
  | { kind: "adjust-team-resource-payment"; contributorId: string; delta: number }
  | { kind: "choose-board-agent-recall"; spaceId: string }
  | { kind: "choose-board-influence"; ownerId: string; faction: FactionId; trashCardId?: string }
  | { kind: "choose-commander-resource-split"; optionIndex: number }
  | { kind: "choose-conflict-influence"; faction: FactionId }
  | { kind: "choose-conflict-tie-winner"; winnerId?: string }
  | { kind: "choose-deploy-or-retreat-troops"; choice: "deploy" | "retreat" }
  | { kind: "choose-discard-card-for-draw"; discardCardId: string }
  | { kind: "choose-discard-card-for-influence-and-draw"; discardCardId: string; faction: FactionId }
  | { kind: "choose-discard-cards-for-reward"; discardCardId: string }
  | { kind: "choose-discard-hand-card"; discardCardId: string }
  | { kind: "choose-lady-amber-desert-scouts"; choice: LadyAmberDesertScoutsChoice }
  | { kind: "choose-leader-transition"; choice: LeaderTransitionChoice }
  | { kind: "choose-lose-influence-for-intrigues"; faction: FactionId }
  | { kind: "choose-lose-influence-for-influence"; choice: InfluenceExchangeChoice }
  | { kind: "choose-maker-reward"; choice: "spice" | "sandworms" }
  | { kind: "choose-feyd-training"; optionId: string }
  | { kind: "choose-paid-reward"; optionId: string }
  | { kind: "choose-pay-resource-for-contracts"; optionIndex: number }
  | { kind: "choose-pay-resource-for-draw-cards" }
  | { kind: "choose-pay-resource-for-high-council-seat" }
  | { kind: "choose-pay-resource-for-influence" }
  | { kind: "choose-pay-resource-for-sandworms" }
  | { kind: "choose-pay-resource-for-strength" }
  | { kind: "choose-pay-resource-for-troops" }
  | { kind: "choose-pending-action-choice"; optionId: string }
  | { kind: "choose-repeat-board-space"; choice: RepeatBoardSpaceChoice }
  | { kind: "choose-retreat-troops-for-strength" }
  | { kind: "choose-sietch-tabr"; choice: "hooks" | "shield-wall" }
  | { kind: "choose-staban-unseen-network"; choice: StabanUnseenNetworkChoice }
  | { kind: "choose-team-resource-payment" }
  | { kind: "choose-throne-row-card"; cardId: string }
  | { kind: "choose-top-deck-selection"; choice: TopDeckSelectionChoice }
  | { kind: "choose-trash-intrigue-for-reward"; intrigueId: string }
  | { kind: "choose-trash-source-for-trade"; partnerId: string }
  | { kind: "clear-pending-action" }
  | { kind: "collect-contract-fallback" }
  | { kind: "deploy-control-defense" }
  | { kind: "deploy-one" }
  | { kind: "lose-influence"; ownerId: string; faction: FactionId }
  | { kind: "pay-conflict-vp-reward" }
  | { kind: "pay-optional-space-payment" }
  | { kind: "place-spy"; spaceId: string }
  | { kind: "recall-conflict-reward-spy"; spaceId: string }
  | { kind: "recall-spy"; spaceId: string }
  | { kind: "recall-spy-for-supply"; spaceId: string }
  | { kind: "reinforce-one"; playerId: string; destination: "garrison" | "conflict" }
  | { kind: "skip-control-defense" }
  | { kind: "skip-conflict-vp-reward" }
  | { kind: "skip-discard-card-for-draw" }
  | { kind: "skip-discard-card-for-influence-and-draw" }
  | { kind: "skip-discard-cards-for-reward" }
  | { kind: "skip-deploy-or-retreat-troops" }
  | { kind: "skip-influence-loss" }
  | { kind: "skip-lose-influence-for-intrigues" }
  | { kind: "skip-lose-influence-for-influence" }
  | { kind: "skip-optional-space-payment" }
  | { kind: "skip-paid-reward" }
  | { kind: "skip-pay-resource-for-contracts" }
  | { kind: "skip-pay-resource-for-draw-cards" }
  | { kind: "skip-pay-resource-for-high-council-seat" }
  | { kind: "skip-pay-resource-for-influence" }
  | { kind: "skip-pay-resource-for-sandworms" }
  | { kind: "skip-pay-resource-for-strength" }
  | { kind: "skip-pay-resource-for-troops" }
  | { kind: "skip-pending-action-choice" }
  | { kind: "skip-recall" }
  | { kind: "skip-retreat-troops-for-strength" }
  | { kind: "skip-team-resource-payment" }
  | { kind: "skip-top-deck-selection" }
  | { kind: "skip-trash" }
  | { kind: "skip-trash-intrigue-for-reward" }
  | { kind: "skip-trash-source-for-trade" }
  | { kind: "take-contract"; contractId: string }
  | { kind: "transfer-trade"; fromId: string; toId: string; intrigueId?: string }
  | { kind: "trash-card"; zone: TrashCardZone; cardId: string; choiceIndex?: number }
  | { kind: "update-trade"; resource: TradeGoodId; partnerId?: string };

export type RoomPlotActionCommand =
  | { kind: "backed-by-choam"; intrigueId: string; faction: FactionId }
  | { kind: "buy-access"; intrigueId: string; choice: BuyAccessChoice }
  | { kind: "call-to-arms"; intrigueId: string }
  | { kind: "change-allegiances"; intrigueId: string; choice: ChangeAllegiancesChoice }
  | { kind: "contingency-plan"; intrigueId: string }
  | { kind: "councilors-ambition"; intrigueId: string }
  | { kind: "cunning"; intrigueId: string; choice: CunningPlotChoice }
  | { kind: "depart-for-arrakis"; intrigueId: string; choice: DepartForArrakisChoice }
  | { kind: "detonation"; intrigueId: string; choice: "shield-wall" | "deploy" }
  | { kind: "distraction"; intrigueId: string }
  | { kind: "imperium-politics"; intrigueId: string; faction: ImperiumPoliticsChoice }
  | { kind: "inspire-awe"; intrigueId: string }
  | { kind: "intelligence-report"; intrigueId: string }
  | { kind: "leverage"; intrigueId: string }
  | { kind: "manipulate"; intrigueId: string; cardId: string }
  | { kind: "market-opportunity"; intrigueId: string; choice: MarketOpportunityChoice }
  | { kind: "mercenaries"; intrigueId: string }
  | { kind: "opportunism"; intrigueId: string; choice: InfluenceLossPair }
  | { kind: "score-battle-icon"; intrigueId: string }
  | { kind: "shaddams-favor"; intrigueId: string }
  | { kind: "sietch-ritual"; intrigueId: string; discardCardId: string; faction: SietchRitualChoice }
  | { kind: "special-mission"; intrigueId: string; choice: SpecialMissionChoice }
  | { kind: "strategic-stockpiling"; intrigueId: string; choice: StrategicStockpilingChoice }
  | { kind: "unexpected-allies"; intrigueId: string; removeShieldWall: boolean };

export type RoomActionCommand =
  | {
      kind: "place-agent";
      cardId: string;
      spaceId: string;
      spyEntrySpaceId?: string;
      commanderTargets?: Record<string, string>;
    }
  | {
      kind: "end-agent";
    }
  | {
      kind: "reveal-turn";
      commanderTargets?: Record<string, string>;
    }
  | {
      kind: "buy-card";
      cardId: string;
      commanderTargets?: Record<string, string>;
    }
  | {
      kind: "end-reveal";
    }
  | {
      kind: "pass-combat";
    }
  | {
      kind: "play-combat-intrigue";
      intrigueId: string;
      targetId?: string;
      combatChoice?: CombatIntrigueChoice;
    }
  | {
      kind: "score-endgame-icon";
      playerId: string;
      intrigueId: string;
      conflictId: string;
    }
  | {
      kind: "score-endgame-conditional";
      playerId: string;
      intrigueId: string;
    }
  | {
      kind: "finalize-endgame";
    }
  | {
      kind: "plot-intrigue";
      command: RoomPlotActionCommand;
      commanderTargets?: Record<string, string>;
    }
  | {
      kind: "choose-throne-row-card";
      cardId: string;
    }
  | {
      kind: "pending";
      command: RoomPendingActionCommand;
    };

export class RoomActionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RoomActionError";
    this.status = status;
  }
}

function activePlayer(state: GameState) {
  return state.players[state.activeSeat];
}

function pendingLocksTableState(action: PendingAction | undefined) {
  return action?.kind === "maker-choice" ||
    action?.kind === "sietch-tabr" ||
    action?.kind === "pay-resource-for-sandworms" ||
    action?.kind === "pay-resource-for-high-council-seat" ||
    action?.kind === "control-defense";
}

function tableStateLockedByPendingActions(state: Pick<GameState, "pendingAction" | "pendingQueue">) {
  return pendingLocksTableState(state.pendingAction) || state.pendingQueue.some(pendingLocksTableState);
}

function assertActivePlayer(state: GameState, playerId: string): Player {
  const player = activePlayer(state);
  if (!player || player.id !== playerId) {
    throw new RoomActionError(403, "Only the active player can perform that action");
  }
  return player;
}

function assertPlayingWithoutPending(state: GameState) {
  if (state.phase !== "playing") throw new RoomActionError(409, "The table is not in the playing phase");
  if (state.pendingAction || state.pendingQueue.length > 0) {
    throw new RoomActionError(409, "Resolve the pending table action first");
  }
}

function commanderTargetsFor(player: Player, players: Player[], commanderTargets: Record<string, string> | undefined) {
  if (player.role !== "Commander") return {};
  const requestedTargetId = commanderTargets?.[player.id];
  const requestedTarget = players.find((candidate) =>
    candidate.id === requestedTargetId &&
    candidate.team === player.team &&
    candidate.role === "Ally"
  );
  return requestedTarget ? { [player.id]: requestedTarget.id } : {};
}

function routedCommanderTargetIdFor(
  state: GameState,
  player: Player,
  commanderTargets: Record<string, string> | undefined,
) {
  if (player.role !== "Commander") return undefined;
  return activatedAllyIdFor(player, state.players, commanderTargetsFor(player, state.players, commanderTargets));
}

function sameStateError(): never {
  throw new RoomActionError(409, "Action was not legal in the current room state");
}

function applyPlaceAgent(state: GameState, playerId: string, command: Extract<RoomActionCommand, { kind: "place-agent" }>) {
  assertPlayingWithoutPending(state);
  const player = assertActivePlayer(state, playerId);
  if (state.agentTurnComplete) throw new RoomActionError(409, "The Agent turn is already complete");
  if (player.agentsReady <= 0) throw new RoomActionError(409, "No Agent is ready");

  const selectedCard = player.hand.find((card) => card.id === command.cardId);
  if (!selectedCard) throw new RoomActionError(404, "Card is not in the active player's hand");
  const selectedSpace = boardSpaces.find((space) => space.id === command.spaceId);
  if (!selectedSpace) throw new RoomActionError(404, "Board space not found");
  if (!agentSpaceAvailable(state, selectedSpace, player)) throw new RoomActionError(409, "Board space is occupied");
  const spyEntrySpaceIds = state.spaces[selectedSpace.id]
    ? gameRules.spyEntrySpaceIdsForOccupiedSpace(state, selectedSpace.id, player.id)
    : [];
  const spyEntrySpaceId = command.spyEntrySpaceId ?? (spyEntrySpaceIds.length === 1 ? spyEntrySpaceIds[0] : undefined);
  if (spyEntrySpaceIds.length > 0 && (!spyEntrySpaceId || !spyEntrySpaceIds.includes(spyEntrySpaceId))) {
    throw new RoomActionError(409, "Choose a spy post to enter that occupied space");
  }
  if (!iconCanReach(selectedCard, selectedSpace, player, state.swordmasterClaimed, state.spyPosts, state.players, state.sharedSpyPosts)) {
    throw new RoomActionError(409, "Selected card cannot reach that board space");
  }
  if (!canPay(player, effectiveCost(selectedSpace, state.players))) {
    throw new RoomActionError(409, "Active player cannot pay that board-space cost");
  }

  const nextState = placeAgentAction(state, {
    commanderTargets: commanderTargetsFor(player, state.players, command.commanderTargets),
    selectedCard,
    selectedSpace,
    spyEntrySpaceId,
  });
  return nextState === state ? sameStateError() : nextState;
}

function applyEndAgent(state: GameState, playerId: string) {
  assertPlayingWithoutPending(state);
  assertActivePlayer(state, playerId);
  if (!state.agentTurnComplete) throw new RoomActionError(409, "Agent turn is not complete");
  const advancedState = {
    ...state,
    agentTurnComplete: false,
    turnHarvestContractIds: {},
    turnMakerSpaceVisits: {},
    turnAcquiredCardIds: {},
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnSpyRecalls: {},
    turnUnitDeployments: {},
    activeSeat: advanceSeat(state),
  };
  return maybeStartCombatPhase(advancedState);
}

function applyRevealTurn(state: GameState, playerId: string, command: Extract<RoomActionCommand, { kind: "reveal-turn" }>) {
  assertPlayingWithoutPending(state);
  const player = assertActivePlayer(state, playerId);
  if (state.agentTurnComplete) throw new RoomActionError(409, "Finish the Agent turn before revealing");
  if (player.revealed) throw new RoomActionError(409, "Active player has already revealed");
  const commanderTargets = commanderTargetsFor(player, state.players, command.commanderTargets);
  const targetId =
    player.role === "Commander"
      ? activatedAllyIdFor(player, state.players, commanderTargets)
      : player.id;
  const target = state.players.find((candidate) => candidate.id === targetId);
  return revealTurnAction(state, {
    commanderTargets,
    revealPlan: revealTurnPlan(player, state, target),
  });
}

function applyBuyCard(state: GameState, playerId: string, command: Extract<RoomActionCommand, { kind: "buy-card" }>) {
  assertPlayingWithoutPending(state);
  const player = assertActivePlayer(state, playerId);
  if (!player.revealed) throw new RoomActionError(409, "Active player must reveal before acquiring cards");
  const commanderTargets = commanderTargetsFor(player, state.players, command.commanderTargets);
  const callToArmsRecruitOwnerId =
    player.callToArmsActive && player.role === "Commander"
      ? activatedAllyIdFor(player, state.players, commanderTargets)
      : undefined;
  const nextState = acquireMarketCard(state, player.id, command.cardId, callToArmsRecruitOwnerId);
  return nextState === state ? sameStateError() : nextState;
}

function applyEndReveal(state: GameState, playerId: string) {
  assertPlayingWithoutPending(state);
  const player = assertActivePlayer(state, playerId);
  if (!player.revealed) throw new RoomActionError(409, "Active player has not revealed");
  const nextState = finishRevealTurn(state, player.id);
  return nextState === state ? sameStateError() : nextState;
}

function applyPlotIntrigue(
  state: GameState,
  playerId: string,
  command: Extract<RoomActionCommand, { kind: "plot-intrigue" }>,
) {
  assertPlayingWithoutPending(state);
  const player = assertActivePlayer(state, playerId);
  const routedTargetId = routedCommanderTargetIdFor(state, player, command.commanderTargets);
  const plotCommand = command.command;
  if (!plotCommand || typeof plotCommand !== "object") throw new RoomActionError(400, "Unsupported room Plot Intrigue action");

  let nextState: GameState;
  switch (plotCommand.kind) {
    case "score-battle-icon":
      nextState = gameRules.playPlotBattleIconIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "contingency-plan":
      nextState = gameRules.playContingencyPlanPlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "call-to-arms":
      nextState = gameRules.playCallToArmsPlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "intelligence-report":
      nextState = gameRules.playIntelligenceReportPlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "inspire-awe":
      nextState = gameRules.playInspireAwePlotIntrigue(state, player.id, plotCommand.intrigueId, routedTargetId);
      break;
    case "manipulate":
      nextState = gameRules.playManipulatePlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.cardId);
      break;
    case "leverage":
      nextState = gameRules.playLeveragePlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "distraction":
      nextState = gameRules.playDistractionPlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "cunning":
      nextState = gameRules.playCunningPlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.choice);
      break;
    case "sietch-ritual":
      nextState = gameRules.playSietchRitualPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.discardCardId,
        plotCommand.faction,
        routedTargetId,
      );
      break;
    case "change-allegiances":
      nextState = gameRules.playChangeAllegiancesPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.choice,
        routedTargetId,
      );
      break;
    case "special-mission":
      nextState = gameRules.playSpecialMissionPlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.choice);
      break;
    case "opportunism":
      nextState = gameRules.playOpportunismPlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.choice);
      break;
    case "imperium-politics":
      nextState = gameRules.playImperiumPoliticsPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.faction,
        routedTargetId,
      );
      break;
    case "buy-access":
      nextState = gameRules.playBuyAccessPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.choice,
        routedTargetId,
      );
      break;
    case "depart-for-arrakis":
      nextState = gameRules.playDepartForArrakisPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.choice,
        routedTargetId,
      );
      break;
    case "councilors-ambition":
      nextState = gameRules.playCouncilorsAmbitionPlotIntrigue(state, player.id, plotCommand.intrigueId);
      break;
    case "strategic-stockpiling":
      nextState = gameRules.playStrategicStockpilingPlotIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.choice,
      );
      break;
    case "shaddams-favor":
      nextState = gameRules.playShaddamsFavorPlotIntrigue(state, player.id, plotCommand.intrigueId, routedTargetId);
      break;
    case "market-opportunity":
      nextState = gameRules.playMarketOpportunityPlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.choice);
      break;
    case "mercenaries":
      nextState = gameRules.playMercenariesPlotIntrigue(state, player.id, plotCommand.intrigueId, routedTargetId);
      break;
    case "backed-by-choam":
      nextState = gameRules.playBackedByChoamPlotIntrigue(state, player.id, plotCommand.intrigueId, plotCommand.faction);
      break;
    case "detonation":
      nextState = gameRules.playDetonationIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.choice,
        routedTargetId,
      );
      break;
    case "unexpected-allies": {
      const resolved = gameRules.playUnexpectedAlliesIntrigue(
        state,
        player.id,
        plotCommand.intrigueId,
        plotCommand.removeShieldWall,
        routedTargetId,
      );
      nextState = gameRules.scoreGurneyAlwaysSmiling(resolved, player.id);
      break;
    }
    default:
      throw new RoomActionError(400, "Unsupported room Plot Intrigue action");
  }

  return nextState === state ? sameStateError() : nextState;
}

function applyPassCombat(state: GameState, playerId: string) {
  const player = assertActivePlayer(state, playerId);
  if (state.phase !== "combat") throw new RoomActionError(409, "The table is not in combat");
  if (state.pendingAction || state.pendingQueue.length > 0) throw new RoomActionError(409, "Resolve the pending table action first");
  const nextState = gameRules.passCombatIntrigue(state, player.id);
  return nextState === state ? sameStateError() : nextState;
}

function applyPlayCombatIntrigue(
  state: GameState,
  playerId: string,
  command: Extract<RoomActionCommand, { kind: "play-combat-intrigue" }>,
) {
  const player = assertActivePlayer(state, playerId);
  if (state.phase !== "combat") throw new RoomActionError(409, "The table is not in combat");
  if (state.pendingAction || state.pendingQueue.length > 0) throw new RoomActionError(409, "Resolve the pending table action first");
  const nextState = gameRules.playCombatIntrigue(
    state,
    player.id,
    command.intrigueId,
    command.targetId,
    command.combatChoice,
  );
  return nextState === state ? sameStateError() : nextState;
}

function applyScoreEndgameIcon(
  state: GameState,
  playerId: string,
  command: Extract<RoomActionCommand, { kind: "score-endgame-icon" }>,
) {
  if (state.phase !== "endgame") throw new RoomActionError(409, "The table is not in endgame scoring");
  if (command.playerId !== playerId) throw new RoomActionError(403, "Only the Intrigue owner can score that Endgame card");
  const nextState = gameRules.scoreEndgameBattleIconIntrigue(
    state,
    command.playerId,
    command.intrigueId,
    command.conflictId,
  );
  return nextState === state ? sameStateError() : nextState;
}

function applyScoreEndgameConditional(
  state: GameState,
  playerId: string,
  command: Extract<RoomActionCommand, { kind: "score-endgame-conditional" }>,
) {
  if (state.phase !== "endgame") throw new RoomActionError(409, "The table is not in endgame scoring");
  if (command.playerId !== playerId) throw new RoomActionError(403, "Only the Intrigue owner can score that Endgame card");
  const nextState = gameRules.scoreEndgameConditionalIntrigue(state, command.playerId, command.intrigueId);
  return nextState === state ? sameStateError() : nextState;
}

export function assertPlayerCanMarkEndgameReady(state: GameState, playerId: string) {
  if (state.phase !== "endgame") throw new RoomActionError(409, "The table is not ready to finalize scores");
  if (
    gameRules.endgameBattleIconChoices(state).some((choice) => choice.playerId === playerId) ||
    gameRules.endgameConditionalIntrigueChoices(state).some((choice) => choice.playerId === playerId)
  ) {
    throw new RoomActionError(409, "Resolve your Endgame Intrigues before marking ready");
  }
}

export function finishEndgameAfterReady(state: GameState) {
  if (state.phase !== "endgame") throw new RoomActionError(409, "The table is not ready to finalize scores");
  if (
    gameRules.endgameBattleIconChoices(state).length > 0 ||
    gameRules.endgameConditionalIntrigueChoices(state).length > 0
  ) {
    throw new RoomActionError(409, "Resolve scoreable Endgame Intrigues before finalizing");
  }
  const nextState = gameRules.finishEndgame(state);
  return nextState === state ? sameStateError() : nextState;
}

function applyChooseThroneRowCard(state: GameState, playerId: string, command: Extract<RoomActionCommand, { kind: "choose-throne-row-card" }>) {
  const pending = state.pendingAction;
  if (!pending || pending.kind !== "throne-row") {
    throw new RoomActionError(409, "No Throne Row choice is pending");
  }
  if (pending.ownerId !== playerId) {
    throw new RoomActionError(403, "Only the pending action owner can choose a Throne Row card");
  }
  const card = state.imperiumRow.find((candidate) => candidate.id === command.cardId);
  if (!card || !canMoveCardToThroneRow(card)) {
    throw new RoomActionError(409, "That Imperium Row card cannot move to the Throne Row");
  }
  const nextState = maybeStartCombatPhase(moveImperiumCardToThroneRow(state, pending, card.id));
  return nextState === state ? sameStateError() : nextState;
}

type PendingOf<K extends PendingAction["kind"]> = Extract<PendingAction, { kind: K }>;

function unique(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function boardInfluenceChoiceResolverIds(pending: Extract<PendingAction, { kind: "board-influence-choice" }>) {
  return pending.requiredHandTrashTrait
    ? unique([pending.cardOwnerId])
    : unique(pending.choices.map((choice) => choice.ownerId));
}

function pendingActionPlayerIds(state: GameState, pending: PendingAction): string[] {
  switch (pending.kind) {
    case "trade":
      return unique([pending.actorId, pending.partnerId]);
    case "reinforce":
    case "conflict-tie":
      return state.players
        .filter((player) => player.team === pending.team)
        .map((player) => player.id);
    case "commander-resource-split":
      return unique([pending.commanderId, pending.allyId]);
    case "board-influence-choice":
      return boardInfluenceChoiceResolverIds(pending);
    case "team-resource-payment":
      return unique([pending.ownerId, ...pending.contributorIds]);
    case "lose-influence":
      return unique([pending.ownerId, ...(pending.alternateOwnerIds ?? [])]);
    case "maker-choice":
      return unique([pending.ownerId, pending.spiceOwnerId]);
    case "sietch-tabr":
      return unique([pending.ownerId, pending.waterOwnerId]);
    case "control-defense":
    case "deploy":
    case "spy":
    case "recall-spy":
    case "conflict-influence":
    case "optional-space-payment":
    case "trash-card":
    case "recall-agent-from-board":
    case "draw-cards":
    case "retreat-troops-for-strength":
    case "deploy-or-retreat-troops":
    case "contract":
    case "acquire-card":
    case "discard-card-for-influence-and-draw":
    case "discard-card-for-draw":
    case "discard-cards-for-reward":
    case "top-deck-selection":
    case "trash-intrigue-for-reward":
    case "lose-influence-for-intrigues":
    case "lose-influence-for-influence":
    case "discard-hand-card":
    case "pay-resource-for-influence":
    case "pay-resource-for-strength":
    case "pay-resource-for-high-council-seat":
    case "pay-resource-for-troops":
    case "pay-resource-for-draw-cards":
    case "pay-resource-for-sandworms":
    case "paid-reward-choice":
    case "pending-action-choice":
    case "feyd-training":
    case "trash-source-for-trade":
    case "pay-resource-for-contracts":
    case "staban-unseen-network":
    case "amber-desert-scouts":
    case "repeat-board-space":
    case "leader-transition":
    case "conflict-vp-conversion":
    case "throne-row":
      return [pending.ownerId];
    default:
      return [];
  }
}

export function roomPendingActionCanResolve(state: GameState, playerId?: string) {
  if (!playerId || !state.pendingAction) return false;
  return pendingActionPlayerIds(state, state.pendingAction).includes(playerId);
}

function assertCanResolvePending(state: GameState, playerId: string) {
  const pending = state.pendingAction;
  if (!pending) throw new RoomActionError(409, "No pending action to resolve");
  if (!pendingActionPlayerIds(state, pending).includes(playerId)) {
    throw new RoomActionError(403, "Only the pending action owner can resolve that choice");
  }
}

function pendingOf<K extends PendingAction["kind"]>(state: GameState, kind: K): PendingOf<K> {
  const pending = state.pendingAction;
  if (!pending || pending.kind !== kind) {
    throw new RoomActionError(409, `Expected pending action ${kind}`);
  }
  return pending as PendingOf<K>;
}

function clearPendingIsAllowed(state: GameState) {
  const pending = state.pendingAction;
  if (!pending) return false;
  if (pending.kind === "deploy" || pending.kind === "spy" || pending.kind === "trade") return true;
  if (pending.kind === "draw-cards") return true;
  if (pending.kind === "contract") return pending.optional === true;
  if (pending.kind === "acquire-card") return pending.optional === true;
  if (pending.kind === "throne-row") return !state.imperiumRow.some(canMoveCardToThroneRow);
  return false;
}

function applyRoomPendingAction(state: GameState, playerId: string, command: RoomPendingActionCommand): GameState {
  assertCanResolvePending(state, playerId);
  switch (command.kind) {
    case "deploy-one": {
      const pending = pendingOf(state, "deploy");
      const deployed = gameRules.deployTroopToConflict(state, pending);
      return maybeStartCombatPhase(gameRules.scoreGurneyAlwaysSmiling(deployed, state.players[state.activeSeat].id));
    }
    case "clear-pending-action":
      if (!clearPendingIsAllowed(state)) throw new RoomActionError(409, "That pending action cannot be cleared directly");
      if (state.pendingAction?.kind === "trade" && state.pendingAction.actorId !== playerId) {
        throw new RoomActionError(403, "Only the trade actor can finish the trade");
      }
      return maybeStartCombatPhase(gameRules.finishPendingAction(state));
    case "deploy-control-defense":
      return gameRules.deployControlDefenseTroop(state, pendingOf(state, "control-defense"));
    case "skip-control-defense":
      return gameRules.skipControlDefenseTroop(state, pendingOf(state, "control-defense"));
    case "place-spy":
      return maybeStartCombatPhase(gameRules.placeSpyForPending(state, pendingOf(state, "spy"), command.spaceId));
    case "recall-spy-for-supply":
      return gameRules.recallSpyForSupplyForPending(state, pendingOf(state, "spy"), command.spaceId);
    case "trash-card":
      return maybeStartCombatPhase(gameRules.trashPlayerCard(state, pendingOf(state, "trash-card"), command.zone, command.cardId, command.choiceIndex));
    case "skip-trash":
      return maybeStartCombatPhase(gameRules.skipTrashCard(state, pendingOf(state, "trash-card")));
    case "recall-spy":
      return maybeStartCombatPhase(gameRules.recallSpyForPending(state, pendingOf(state, "recall-spy"), command.spaceId));
    case "skip-recall":
      return maybeStartCombatPhase(gameRules.skipRecallSpy(state, pendingOf(state, "recall-spy")));
    case "lose-influence":
      if (command.ownerId !== playerId) {
        throw new RoomActionError(403, "You can only lose Influence from your own seat");
      }
      return maybeStartCombatPhase(gameRules.loseInfluenceForPending(state, pendingOf(state, "lose-influence"), command.ownerId, command.faction));
    case "skip-influence-loss": {
      const pending = pendingOf(state, "lose-influence");
      if (pending.ownerId !== playerId) {
        throw new RoomActionError(403, "Only the pending Influence-loss owner can decline that choice");
      }
      return maybeStartCombatPhase(gameRules.skipLoseInfluence(state, pending));
    }
    case "choose-retreat-troops-for-strength":
      return maybeStartCombatPhase(gameRules.resolveRetreatTroopsForStrength(state, pendingOf(state, "retreat-troops-for-strength")));
    case "skip-retreat-troops-for-strength":
      return maybeStartCombatPhase(gameRules.skipRetreatTroopsForStrength(state, pendingOf(state, "retreat-troops-for-strength")));
    case "choose-deploy-or-retreat-troops":
      return maybeStartCombatPhase(gameRules.resolveDeployOrRetreatTroopsChoice(state, pendingOf(state, "deploy-or-retreat-troops"), command.choice));
    case "skip-deploy-or-retreat-troops":
      return maybeStartCombatPhase(gameRules.skipDeployOrRetreatTroopsChoice(state, pendingOf(state, "deploy-or-retreat-troops")));
    case "choose-maker-reward": {
      const pending = pendingOf(state, "maker-choice");
      const choiceOwnerId = command.choice === "spice" ? pending.spiceOwnerId : pending.ownerId;
      if (choiceOwnerId !== playerId) {
        throw new RoomActionError(403, "You can only choose the Maker reward for your own seat");
      }
      if (command.choice === "sandworms" && !pending.canSummonSandworms) {
        throw new RoomActionError(409, "Sandworms cannot be summoned from this Maker space");
      }
      const nextState = gameRules.resolveMakerChoice(state, pending, command.choice);
      return nextState === state ? sameStateError() : maybeStartCombatPhase(nextState);
    }
    case "choose-sietch-tabr": {
      const pending = pendingOf(state, "sietch-tabr");
      const choiceOwnerId = command.choice === "hooks" ? pending.ownerId : pending.waterOwnerId;
      if (choiceOwnerId !== playerId) {
        throw new RoomActionError(403, "You can only choose the Sietch Tabr reward for your own seat");
      }
      return maybeStartCombatPhase(gameRules.resolveSietchTabrChoice(state, pending, command.choice));
    }
    case "choose-commander-resource-split":
      return maybeStartCombatPhase(gameRules.resolveCommanderResourceSplitChoice(state, pendingOf(state, "commander-resource-split"), command.optionIndex));
    case "choose-paid-reward":
      return maybeStartCombatPhase(gameRules.resolvePaidRewardChoice(state, pendingOf(state, "paid-reward-choice"), command.optionId));
    case "skip-paid-reward":
      return maybeStartCombatPhase(gameRules.skipPaidRewardChoice(state, pendingOf(state, "paid-reward-choice")));
    case "choose-pending-action-choice":
      return maybeStartCombatPhase(gameRules.resolvePendingActionChoice(state, pendingOf(state, "pending-action-choice"), command.optionId));
    case "skip-pending-action-choice":
      return maybeStartCombatPhase(gameRules.skipPendingActionChoice(state, pendingOf(state, "pending-action-choice")));
    case "choose-feyd-training":
      return maybeStartCombatPhase(gameRules.resolveFeydTrainingChoice(state, pendingOf(state, "feyd-training"), command.optionId));
    case "choose-staban-unseen-network":
      return maybeStartCombatPhase(gameRules.resolveStabanUnseenNetworkChoice(state, pendingOf(state, "staban-unseen-network"), command.choice));
    case "choose-lady-amber-desert-scouts":
      return maybeStartCombatPhase(gameRules.resolveLadyAmberDesertScoutsChoice(state, pendingOf(state, "amber-desert-scouts"), command.choice));
    case "choose-repeat-board-space":
      return maybeStartCombatPhase(gameRules.resolveRepeatBoardSpaceChoice(state, pendingOf(state, "repeat-board-space"), command.choice));
    case "choose-leader-transition":
      return maybeStartCombatPhase(gameRules.resolveLeaderTransitionChoice(state, pendingOf(state, "leader-transition"), command.choice));
    case "choose-trash-source-for-trade":
      return gameRules.resolveTrashSourceForTradeChoice(state, pendingOf(state, "trash-source-for-trade"), command.partnerId);
    case "skip-trash-source-for-trade":
      return maybeStartCombatPhase(gameRules.skipTrashSourceForTrade(state, pendingOf(state, "trash-source-for-trade")));
    case "choose-pay-resource-for-contracts":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForContractsChoice(state, pendingOf(state, "pay-resource-for-contracts"), command.optionIndex));
    case "skip-pay-resource-for-contracts":
      return maybeStartCombatPhase(gameRules.skipPayResourceForContracts(state, pendingOf(state, "pay-resource-for-contracts")));
    case "choose-pay-resource-for-strength":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForStrengthChoice(state, pendingOf(state, "pay-resource-for-strength")));
    case "skip-pay-resource-for-strength":
      return maybeStartCombatPhase(gameRules.skipPayResourceForStrength(state, pendingOf(state, "pay-resource-for-strength")));
    case "choose-pay-resource-for-high-council-seat":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForHighCouncilSeatChoice(state, pendingOf(state, "pay-resource-for-high-council-seat")));
    case "skip-pay-resource-for-high-council-seat":
      return maybeStartCombatPhase(gameRules.skipPayResourceForHighCouncilSeat(state, pendingOf(state, "pay-resource-for-high-council-seat")));
    case "choose-pay-resource-for-troops":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForTroopsChoice(state, pendingOf(state, "pay-resource-for-troops")));
    case "skip-pay-resource-for-troops":
      return maybeStartCombatPhase(gameRules.skipPayResourceForTroops(state, pendingOf(state, "pay-resource-for-troops")));
    case "choose-pay-resource-for-draw-cards":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForDrawCardsChoice(state, pendingOf(state, "pay-resource-for-draw-cards")));
    case "skip-pay-resource-for-draw-cards":
      return maybeStartCombatPhase(gameRules.skipPayResourceForDrawCards(state, pendingOf(state, "pay-resource-for-draw-cards")));
    case "choose-pay-resource-for-influence":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForInfluenceChoice(state, pendingOf(state, "pay-resource-for-influence")));
    case "skip-pay-resource-for-influence":
      return maybeStartCombatPhase(gameRules.skipPayResourceForInfluence(state, pendingOf(state, "pay-resource-for-influence")));
    case "choose-pay-resource-for-sandworms":
      return maybeStartCombatPhase(gameRules.resolvePayResourceForSandwormsChoice(state, pendingOf(state, "pay-resource-for-sandworms")));
    case "skip-pay-resource-for-sandworms":
      return maybeStartCombatPhase(gameRules.skipPayResourceForSandworms(state, pendingOf(state, "pay-resource-for-sandworms")));
    case "adjust-team-resource-payment":
      if (command.contributorId !== playerId) {
        throw new RoomActionError(403, "You can only adjust your own team-resource contribution");
      }
      return gameRules.adjustTeamResourcePaymentContribution(state, pendingOf(state, "team-resource-payment"), command.contributorId, command.delta);
    case "choose-team-resource-payment": {
      const pending = pendingOf(state, "team-resource-payment");
      if (pending.ownerId !== playerId) {
        throw new RoomActionError(403, "Only the payment owner can resolve team-resource payment");
      }
      return maybeStartCombatPhase(gameRules.resolveTeamResourcePaymentChoice(state, pending));
    }
    case "skip-team-resource-payment": {
      const pending = pendingOf(state, "team-resource-payment");
      if (pending.ownerId !== playerId) {
        throw new RoomActionError(403, "Only the payment owner can decline team-resource payment");
      }
      return maybeStartCombatPhase(gameRules.skipTeamResourcePayment(state, pending));
    }
    case "reinforce-one":
      return maybeStartCombatPhase(gameRules.reinforceTroop(state, pendingOf(state, "reinforce"), command.playerId, command.destination));
    case "update-trade": {
      const pending = pendingOf(state, "trade");
      if (pending.actorId !== playerId) {
        throw new RoomActionError(403, "Only the trade actor can change the trade selection");
      }
      const nextState = gameRules.updateTradeSelection(state, pending, command.resource, command.partnerId);
      return nextState === state ? sameStateError() : nextState;
    }
    case "transfer-trade": {
      if (command.fromId !== playerId) {
        throw new RoomActionError(403, "You can only trade goods from your own seat");
      }
      const nextState = gameRules.transferTradeGood(state, pendingOf(state, "trade"), command.fromId, command.toId, command.intrigueId);
      return nextState === state ? sameStateError() : nextState;
    }
    case "take-contract":
      return maybeStartCombatPhase(gameRules.takeChoamContract(state, pendingOf(state, "contract"), command.contractId));
    case "collect-contract-fallback":
      return maybeStartCombatPhase(gameRules.collectChoamContractFallback(state, pendingOf(state, "contract")));
    case "acquire-pending-card": {
      const pending = pendingOf(state, "acquire-card");
      const owner = state.players.find((candidate) => candidate.id === pending.ownerId);
      const recruitOwnerId = owner?.role === "Commander" ? activatedAllyIdFor(owner, state.players, {}) : undefined;
      return maybeStartCombatPhase(gameRules.acquireCardForPending(state, pending, command.cardId, recruitOwnerId));
    }
    case "choose-discard-card-for-influence-and-draw":
      return maybeStartCombatPhase(gameRules.resolveDiscardCardForInfluenceAndDrawChoice(state, pendingOf(state, "discard-card-for-influence-and-draw"), command.discardCardId, command.faction));
    case "skip-discard-card-for-influence-and-draw":
      return maybeStartCombatPhase(gameRules.skipDiscardCardForInfluenceAndDraw(state, pendingOf(state, "discard-card-for-influence-and-draw")));
    case "choose-discard-card-for-draw":
      return maybeStartCombatPhase(gameRules.resolveDiscardCardForDrawChoice(state, pendingOf(state, "discard-card-for-draw"), command.discardCardId));
    case "skip-discard-card-for-draw":
      return maybeStartCombatPhase(gameRules.skipDiscardCardForDraw(state, pendingOf(state, "discard-card-for-draw")));
    case "choose-discard-cards-for-reward":
      return maybeStartCombatPhase(gameRules.resolveDiscardCardsForRewardChoice(state, pendingOf(state, "discard-cards-for-reward"), command.discardCardId));
    case "skip-discard-cards-for-reward":
      return maybeStartCombatPhase(gameRules.skipDiscardCardsForReward(state, pendingOf(state, "discard-cards-for-reward")));
    case "choose-top-deck-selection":
      return maybeStartCombatPhase(gameRules.resolveTopDeckSelectionChoice(state, pendingOf(state, "top-deck-selection"), command.choice));
    case "skip-top-deck-selection":
      return maybeStartCombatPhase(gameRules.skipTopDeckSelectionChoice(state, pendingOf(state, "top-deck-selection")));
    case "choose-trash-intrigue-for-reward":
      return maybeStartCombatPhase(gameRules.resolveTrashIntrigueForRewardChoice(state, pendingOf(state, "trash-intrigue-for-reward"), command.intrigueId));
    case "skip-trash-intrigue-for-reward":
      return maybeStartCombatPhase(gameRules.skipTrashIntrigueForReward(state, pendingOf(state, "trash-intrigue-for-reward")));
    case "choose-discard-hand-card":
      return maybeStartCombatPhase(gameRules.resolveDiscardHandCardChoice(state, pendingOf(state, "discard-hand-card"), command.discardCardId));
    case "choose-lose-influence-for-intrigues":
      return maybeStartCombatPhase(gameRules.resolveLoseInfluenceForIntriguesChoice(state, pendingOf(state, "lose-influence-for-intrigues"), command.faction));
    case "skip-lose-influence-for-intrigues":
      return maybeStartCombatPhase(gameRules.skipLoseInfluenceForIntrigues(state, pendingOf(state, "lose-influence-for-intrigues")));
    case "choose-lose-influence-for-influence":
      return maybeStartCombatPhase(gameRules.resolveLoseInfluenceForInfluenceChoice(state, pendingOf(state, "lose-influence-for-influence"), command.choice));
    case "skip-lose-influence-for-influence":
      return maybeStartCombatPhase(gameRules.skipLoseInfluenceForInfluence(state, pendingOf(state, "lose-influence-for-influence")));
    case "choose-throne-row-card":
      return applyChooseThroneRowCard(state, playerId, { kind: "choose-throne-row-card", cardId: command.cardId });
    case "choose-conflict-tie-winner":
      return gameRules.startNextRound(gameRules.resolveConflictTie(state, pendingOf(state, "conflict-tie"), command.winnerId));
    case "pay-conflict-vp-reward":
      return gameRules.startNextRound(gameRules.payConflictVpConversion(state, pendingOf(state, "conflict-vp-conversion")));
    case "recall-conflict-reward-spy":
      return gameRules.startNextRound(gameRules.recallSpyForConflictVpConversion(state, pendingOf(state, "conflict-vp-conversion"), command.spaceId));
    case "skip-conflict-vp-reward":
      return gameRules.startNextRound(gameRules.skipConflictVpConversion(state, pendingOf(state, "conflict-vp-conversion")));
    case "choose-conflict-influence":
      return gameRules.startNextRound(gameRules.gainConflictInfluenceForPending(state, pendingOf(state, "conflict-influence"), command.faction));
    case "choose-board-influence": {
      const boardInfluencePending = pendingOf(state, "board-influence-choice");
      if (
        command.ownerId !== playerId &&
        !(
          boardInfluencePending.requiredHandTrashTrait &&
          boardInfluencePending.cardOwnerId === playerId &&
          typeof command.trashCardId === "string"
        )
      ) {
        throw new RoomActionError(403, "You can only choose Influence for your own seat");
      }
      return maybeStartCombatPhase(gameRules.resolveBoardInfluenceChoice(
        state,
        boardInfluencePending,
        command.ownerId,
        command.faction,
        command.trashCardId,
      ));
    }
    case "choose-board-agent-recall": {
      const pending = pendingOf(state, "recall-agent-from-board");
      if (!gameRules.boardAgentRecallSpacesForPending(state, pending).includes(command.spaceId)) {
        throw new RoomActionError(409, "That Agent cannot be recalled");
      }
      return maybeStartCombatPhase(gameRules.resolveBoardAgentRecallChoice(state, pending, command.spaceId));
    }
    case "pay-optional-space-payment":
      return maybeStartCombatPhase(gameRules.resolveOptionalSpacePayment(state, pendingOf(state, "optional-space-payment")));
    case "skip-optional-space-payment":
      return maybeStartCombatPhase(gameRules.skipOptionalSpacePayment(state, pendingOf(state, "optional-space-payment")));
    default:
      throw new RoomActionError(400, "Unsupported room pending action");
  }
}

export function applyRoomAction(state: GameState, playerId: string, command: RoomActionCommand): GameState {
  if (!command || typeof command !== "object" || typeof (command as { kind?: unknown }).kind !== "string") {
    throw new RoomActionError(400, "Unsupported room action");
  }
  switch (command.kind) {
    case "place-agent":
      return applyPlaceAgent(state, playerId, command);
    case "end-agent":
      return applyEndAgent(state, playerId);
    case "reveal-turn":
      return applyRevealTurn(state, playerId, command);
    case "buy-card":
      return applyBuyCard(state, playerId, command);
    case "end-reveal":
      return applyEndReveal(state, playerId);
    case "plot-intrigue":
      return applyPlotIntrigue(state, playerId, command);
    case "pass-combat":
      return applyPassCombat(state, playerId);
    case "play-combat-intrigue":
      return applyPlayCombatIntrigue(state, playerId, command);
    case "score-endgame-icon":
      return applyScoreEndgameIcon(state, playerId, command);
    case "score-endgame-conditional":
      return applyScoreEndgameConditional(state, playerId, command);
    case "finalize-endgame":
      throw new RoomActionError(400, "Endgame finalization must be handled by the room server");
    case "choose-throne-row-card":
      return applyChooseThroneRowCard(state, playerId, command);
    case "pending":
      if (!command.command || typeof command.command !== "object") {
        throw new RoomActionError(400, "Unsupported room pending action");
      }
      {
        const nextState = applyRoomPendingAction(state, playerId, command.command);
        return nextState === state ? sameStateError() : nextState;
      }
    default:
      throw new RoomActionError(400, "Unsupported room action");
  }
}
