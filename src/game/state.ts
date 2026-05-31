import {
  applyCardAgentEffect,
} from "./agent-effects";
import {
  effectiveCost,
} from "./board-rules";
import {
  combatIntrigueActorIds,
  firstCombatSeat,
  nextCombatSeat,
} from "./combat-intrigue-rules";
import {
  criticalLocationNames,
} from "./critical-locations";
import {
  canHaveMakerHooks,
  conflictDeploymentBlockedForOwner,
} from "./conflict-rules";
import { resolveCurrentConflict } from "./conflict-awards";
import {
  drawCards,
  playerTroopSupply,
} from "./deck-utils";
import {
  scoreGurneyAlwaysSmiling,
} from "./leader-rewards";
import {
  activatedAllyEffectOwner,
} from "./market-rules";
import {
  advancePendingAction,
  pendingActionsFor,
  queuePendingActions,
} from "./pending-actions";
import {
  pendingActionForControlDefense,
  resolveLocationControlIncome,
} from "./location-control";
import {
  resolveAcquireCardForPending,
  resolveChoamContractFallback,
  resolveTakeChoamContract,
} from "./contract-rules";
import {
  canPlayDistractionPlotIntrigue,
  resolvePlaceSpyForPending,
  resolveStabanUnseenNetworkChoiceForPending,
} from "./spy-pending-rules";
import {
  playContingencyPlanPlotIntrigue,
  playCunningPlotIntrigue,
  playDistractionPlotIntrigue,
  playInspireAwePlotIntrigue,
  playIntelligenceReportPlotIntrigue,
  playLeveragePlotIntrigue,
  playManipulatePlotIntrigue,
} from "./plot-intrigue-basic-rules";
import {
  recordTurnSpiceGain,
  recordTurnUnitDeployment,
} from "./turn-trackers";
import {
  transferTradeGood,
  updateTradeSelection,
} from "./trade-rules";
import {
  skipTrashCard,
  trashPlayerCard,
} from "./trash-rules";
import {
  advanceMakerSpice,
  advanceSeat,
  allPlayersDone,
  endgameTriggerReason,
} from "./game-flow";
import {
  resolvePlayCombatIntrigue,
} from "./combat-intrigue-play-rules";
import type {
  CombatIntrigueChoice,
} from "./combat-intrigue-play-rules";
import type {
  GameState,
  PendingAction,
  ResourceId,
  Resources,
} from "./types";

export {
  applyBoardEffect,
  applyCardAgentEffect,
} from "./agent-effects";

export {
  setAllianceOwner,
} from "./alliance-rules";

export {
  boardSpaceRewardApplies,
  canMeetInfluenceRequirement,
  canPay,
  effectiveCost,
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
  highCouncilSeatsTaken,
} from "./board-rules";

export {
  combatIntrigueActorIds,
  combatIntrigueStrength,
  combatIntrigueTargets,
} from "./combat-intrigue-rules";

export type {
  CombatIntrigueChoice,
  SpiceIsPowerChoice,
  TacticalOptionChoice,
} from "./combat-intrigue-play-rules";

export {
  setChoamContractCompleted,
} from "./contract-rules";

export {
  endgameBattleIconChoices,
  endgameConditionalIntrigueChoices,
  playPlotBattleIconIntrigue,
  scoreEndgameBattleIconIntrigue,
  scoreEndgameConditionalIntrigue,
} from "./endgame-intrigues";

export {
  canPayConflictVpConversion,
  conflictVpConversionSpyChoices,
  payConflictVpConversion,
  recallSpyForConflictVpConversion,
  resolveConflictTie,
  resolveCurrentConflict,
  skipConflictVpConversion,
} from "./conflict-awards";

export {
  canHaveMakerHooks,
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerDoublesConflictRewards,
  playerHasConflictUnits,
} from "./conflict-rules";

export {
  buyAccessPairChoices,
  changeAllegiancesGainChoices,
  imperiumPoliticsFactionChoices,
  influenceLossChoices,
  influenceLossPairChoices,
  sietchRitualFactionChoices,
} from "./influence-choices";

export type {
  BuyAccessChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
} from "./influence-choices";

export {
  changeAllegiancesLossChoices,
  influenceLossOptions,
  loseInfluenceForPending,
  skipLoseInfluence,
} from "./influence-loss-rules";

export {
  cloneCards,
  drawCards,
  playerTroopSupply,
} from "./deck-utils";

export {
  drawIntrigueCards,
} from "./intrigue-deck";

export {
  corrinoMightCost,
  pendingActionForCard,
  pendingActionForCorrinoMightReveal,
  pendingActionForJessicaOtherMemories,
  pendingActionForReverendMotherJessicaRepeat,
  pendingActionsForReveal,
} from "./card-pending-rules";

export {
  resolveCommandRespectTrade,
  resolveCorrinoMightChoice,
  resolveDemandAttentionChoice,
  resolveDemandResultsChoice,
  resolveDesertCallChoice,
  skipCommandRespect,
  skipCorrinoMight,
  skipDemandAttention,
  skipDemandResults,
  skipDesertCall,
} from "./commander-pending-rules";

export {
  resolveIrulanSignetRingChoice,
  resolveJessicaOtherMemoriesChoice,
  resolveJessicaReverendMotherChoice,
  resolveJessicaSpiceAgonyChoice,
  resolveJessicaWaterOfLifeChoice,
  resolveLadyAmberDesertScoutsChoice,
  resolveShaddamSignetRingChoice,
} from "./leader-pending-rules";

export type {
  IrulanSignetRingChoice,
  JessicaOtherMemoriesChoice,
  JessicaReverendMotherChoice,
  JessicaSpiceAgonyChoice,
  JessicaWaterOfLifeChoice,
  LadyAmberDesertScoutsChoice,
  ShaddamSignetRingChoice,
} from "./leader-pending-rules";

export {
  initialGame,
  pendingActionForShaddamPersonalBoard,
  setMakerHooks,
  setShieldWall,
} from "./game-setup";

export {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
  scoreGurneyAlwaysSmiling,
} from "./leader-rewards";

export {
  acquireMarketCard,
  acquirableCardsForPending,
  irulanSignetAcquireCards,
  irulanSignetAcquirePending,
  irulanSignetTrashableCards,
  manipulateAcquisitionCost,
  moveImperiumCardToThroneRow,
} from "./market-rules";

export {
  balanceSixPlayerObjectives,
  dealSixPlayerObjectives,
} from "./objectives";

export {
  advancePendingAction,
  pendingActionsFor,
  queuePendingActions,
} from "./pending-actions";

export {
  resolveLocationControlIncome,
} from "./location-control";

export {
  playContingencyPlanPlotIntrigue,
  playCunningPlotIntrigue,
  playDistractionPlotIntrigue,
  playInspireAwePlotIntrigue,
  playIntelligenceReportPlotIntrigue,
  playLeveragePlotIntrigue,
  playManipulatePlotIntrigue,
} from "./plot-intrigue-basic-rules";

export {
  playBuyAccessPlotIntrigue,
  playChangeAllegiancesPlotIntrigue,
  playImperiumPoliticsPlotIntrigue,
  playOpportunismPlotIntrigue,
  playSietchRitualPlotIntrigue,
} from "./plot-intrigue-influence-rules";

export type {
  ChangeAllegiancesChoice,
} from "./plot-intrigue-influence-rules";

export {
  playBackedByChoamPlotIntrigue,
  playCouncilorsAmbitionPlotIntrigue,
  playDepartForArrakisPlotIntrigue,
  playMarketOpportunityPlotIntrigue,
  playMercenariesPlotIntrigue,
  playShaddamsFavorPlotIntrigue,
  playStrategicStockpilingPlotIntrigue,
} from "./plot-intrigue-resource-rules";

export type {
  DepartForArrakisChoice,
  MarketOpportunityChoice,
  StrategicStockpilingChoice,
} from "./plot-intrigue-resource-rules";

export {
  playCallToArmsPlotIntrigue,
  playDetonationIntrigue,
  playSpecialMissionPlotIntrigue,
  playUnexpectedAlliesIntrigue,
} from "./plot-intrigue-tactical-rules";

export type {
  SpecialMissionChoice,
} from "./plot-intrigue-tactical-rules";

export {
  makerSpaceIds,
} from "./setup-utils";

export {
  leaderStarterDeckCards,
} from "./player-setup";

export {
  defaultActivatedAllyId,
  iconCanReach,
  pendingActionForMakerChoice,
  pendingActionForSietchTabr,
  pendingActionForSpace,
} from "./placement-rules";

export {
  canPlaceSpyPost,
  spyPostCount,
  spyPostOwnerIds,
} from "./spy-posts";

export {
  placeableSpySpaces,
  recallableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";

export {
  canPlayDistractionPlotIntrigue,
  canPlaySpecialMissionPlaceSpy,
  distractionSpySpaces,
  recallSpyForPending,
  recallSpyForSupplyForPending,
  resolveStabanSmuggleSpice,
  skipRecallSpy,
  specialMissionCitySpySpaces,
  specialMissionRecallSpySpaces,
} from "./spy-pending-rules";

export {
  hasDeployedThreeOrMoreUnitsThisTurn,
  hasGainedSpiceThisTurn,
  hasUsedReverendMotherJessicaRepeat,
  recordTurnSpiceGain,
  recordTurnUnitDeployment,
} from "./turn-trackers";

export {
  transferTradeGood,
  updateTradeSelection,
} from "./trade-rules";

export {
  adjustThreatenSpiceProductionContribution,
  resolveThreatenSpiceProductionChoice,
  skipThreatenSpiceProduction,
  threatenSpiceProductionContributionTotal,
  threatenSpiceProductionCost,
} from "./threaten-spice-production";

export {
  skipTrashCard,
  trashableCards,
  trashableCardsForPending,
  trashPlayerCard,
} from "./trash-rules";

export {
  advanceMakerSpice,
  advanceSeat,
  allPlayersDone,
  collectMakerSpice,
  endgameTriggerReason,
  finishEndgame,
} from "./game-flow";

export {
  canMoveCardToThroneRow,
  isBackedByChoamIntrigue,
  isBuyAccessIntrigue,
  isCallToArmsIntrigue,
  isChangeAllegiancesIntrigue,
  isCommandRespectCommanderCard,
  isContingencyPlanIntrigue,
  isCorrinoMightCommanderCard,
  isCriticalShipmentsCommanderCard,
  isCunningIntrigue,
  isCouncilorsAmbitionIntrigue,
  isDemandAttentionCommanderCard,
  isDemandResultsCommanderCard,
  isDepartForArrakisIntrigue,
  isDesertCallCommanderCard,
  isDetonationIntrigue,
  isDevastatingAssaultCommanderCard,
  isDevourIntrigue,
  isDistractionIntrigue,
  isFindWeaknessIntrigue,
  isFremenCard,
  isGenericSignetRingCard,
  isGoToGroundIntrigue,
  isImperiumPoliticsIntrigue,
  isImpressIntrigue,
  isInspireAweIntrigue,
  isIntelligenceReportIntrigue,
  isLeverageIntrigue,
  isManipulateIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
  isMuadDibSignetRingCard,
  isOpportunismIntrigue,
  isQuestionableMethodsIntrigue,
  isReachAgreementIntrigue,
  isShaddamsFavorIntrigue,
  isShaddamSignetRingCard,
  isSietchRitualIntrigue,
  isSpecialMissionIntrigue,
  isSpiceIsPowerIntrigue,
  isSpringTheTrapIntrigue,
  isStrategicStockpilingIntrigue,
  isTacticalOptionIntrigue,
  isThreatenSpiceProductionCommanderCard,
  isUnexpectedAlliesIntrigue,
  isUsulCommanderCard,
  isWeirdingCombatIntrigue,
} from "./card-identifiers";

export type CunningPlotChoice = "draw" | "paid-trash";
export type StabanUnseenNetworkChoice = "pay" | "skip";

type ControlDefensePendingAction = Extract<PendingAction, { kind: "control-defense" }>;

export function finishPendingAction(state: GameState): GameState {
  if (state.pendingAction?.kind === "spy" && state.pendingAction.mustPlaceSpy) return state;
  if (state.pendingAction?.kind === "acquire-card" && !state.pendingAction.optional) return state;
  return finishCombatIfNoActors({ ...state, ...advancePendingAction(state) });
}

type ContractPendingAction = Extract<PendingAction, { kind: "contract" }>;
type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type MakerChoicePendingAction = Extract<PendingAction, { kind: "maker-choice" }>;
type ReinforcePendingAction = Extract<PendingAction, { kind: "reinforce" }>;
type SietchTabrPendingAction = Extract<PendingAction, { kind: "sietch-tabr" }>;
type SpyPendingAction = Extract<PendingAction, { kind: "spy" }>;
type StabanUnseenNetworkPendingAction = Extract<PendingAction, { kind: "staban-unseen-network" }>;
type RevealAdjustPendingAction = Extract<PendingAction, { kind: "reveal-adjust" }>;
type CommanderResourceSplitPendingAction = Extract<PendingAction, { kind: "commander-resource-split" }>;

export function takeChoamContract(state: GameState, pending: ContractPendingAction, contractId: string): GameState {
  return resolveTakeChoamContract(state, pending, contractId, finishCombatIfNoActors);
}

export function acquireCardForPending(
  state: GameState,
  pending: AcquireCardPendingAction,
  cardId: string,
  callToArmsRecruitOwnerId?: string,
): GameState {
  return resolveAcquireCardForPending(state, pending, cardId, finishCombatIfNoActors, callToArmsRecruitOwnerId);
}

export function collectChoamContractFallback(state: GameState, pending: ContractPendingAction): GameState {
  return resolveChoamContractFallback(state, pending, finishCombatIfNoActors);
}

export function placeSpyForPending(
  state: GameState,
  pending: SpyPendingAction,
  spaceId: string,
): GameState {
  return resolvePlaceSpyForPending(state, pending, spaceId, finishCombatIfNoActors);
}

export function resolveStabanUnseenNetworkChoice(
  state: GameState,
  pending: StabanUnseenNetworkPendingAction,
  choice: StabanUnseenNetworkChoice,
): GameState {
  return resolveStabanUnseenNetworkChoiceForPending(state, pending, choice, finishCombatIfNoActors);
}

function advanceAfterCombatIntriguePlay(state: GameState): GameState {
  const actorIds = combatIntrigueActorIds(state);
  if (actorIds.length === 0 && (state.pendingAction || state.pendingQueue.length > 0)) return state;
  if (actorIds.length === 0) return startNextRound({ ...state, phase: "playing", combatPasses: [] });
  return { ...state, activeSeat: nextCombatSeat(state, actorIds) };
}

function finishCombatIfNoActors(state: GameState): GameState {
  if (state.phase !== "combat" || state.pendingAction || state.pendingQueue.length > 0) return state;
  if (combatIntrigueActorIds(state).length > 0) return state;
  return startNextRound({ ...state, phase: "playing", combatPasses: [] });
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
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    activeSeat,
    combatPasses: [],
    pendingAction: undefined,
    pendingQueue: [],
    log: [`Combat begins. ${state.players[activeSeat].leader} may play Combat Intrigues or pass.`, ...state.log],
  };
}

export function maybeStartCombatPhase(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  if (state.pendingAction || state.pendingQueue.length > 0) return state;
  if (state.players[state.activeSeat]?.revealed) return state;
  if (!allPlayersDone(state.players)) return state;
  return startCombatPhase(state);
}

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

export function finishRevealTurn(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId || !player.revealed) return state;
  const clearedState = {
    ...state,
    agentTurnComplete: false,
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
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

function signedAdjustment(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function finishRevealAdjustment(state: GameState, pending: RevealAdjustPendingAction): GameState {
  const resolvedState = {
    ...state,
    ...advancePendingAction(state),
    log: [
      `Printed reveal adjustment resolved: ${signedAdjustment(pending.persuasionAdjustment)} persuasion, ${signedAdjustment(pending.strengthAdjustment)} strength.`,
      ...state.log,
    ],
  };
  return scoreGurneyAlwaysSmiling(resolvedState, pending.ownerId);
}

function resourceLogLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function resourceGainLog(amount: number, resource: ResourceId) {
  return `${amount} ${resourceLogLabel(resource)}`;
}

export function resolveCommanderResourceSplitChoice(
  state: GameState,
  pending: CommanderResourceSplitPendingAction,
  optionIndex: number,
): GameState {
  const option = pending.options[optionIndex];
  if (!option) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const ally = state.players.find((player) => player.id === pending.allyId);
  if (
    !commander ||
    commander.role !== "Commander" ||
    commander.team !== pending.team ||
    !ally ||
    ally.team !== commander.team ||
    ally.role !== "Ally"
  ) {
    return { ...state, ...advancePendingAction(state) };
  }

  const players = state.players.map((player) => {
    if (player.id === commander.id) {
      return {
        ...player,
        resources: {
          ...player.resources,
          [option.commanderResource]: player.resources[option.commanderResource] + option.commanderAmount,
        },
      };
    }
    if (player.id === ally.id) {
      return {
        ...player,
        resources: {
          ...player.resources,
          [option.allyResource]: player.resources[option.allyResource] + option.allyAmount,
        },
      };
    }
    return player;
  });

  let nextState: GameState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} resolves ${pending.source}: gains ${resourceGainLog(option.commanderAmount, option.commanderResource)}; ${ally.leader} gains ${resourceGainLog(option.allyAmount, option.allyResource)}.`,
      ...state.log,
    ],
  };
  if (option.commanderResource === "spice") {
    nextState = recordTurnSpiceGain(nextState, commander.id, option.commanderAmount);
  }
  if (option.allyResource === "spice") {
    nextState = recordTurnSpiceGain(nextState, ally.id, option.allyAmount);
  }
  return nextState;
}

export function resolveMakerChoice(
  state: GameState,
  pending: MakerChoicePendingAction,
  choice: "spice" | "sandworms",
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const spiceOwner = state.players.find((player) => player.id === pending.spiceOwnerId);
  if (!owner) return { ...state, ...advancePendingAction(state) };
  const spiceRecipient = spiceOwner ?? owner;

  if (choice === "sandworms" && conflictDeploymentBlockedForOwner(state, pending.ownerId)) return state;
  const summon = choice === "sandworms" && pending.canSummonSandworms;
  const players = state.players.map((player) => {
    if (!summon && player.id !== spiceRecipient.id) return player;
    if (summon && player.id !== owner.id) return player;
    if (summon) {
      return {
        ...player,
        conflict: player.conflict + pending.sandworms * 3,
        deployedSandworms: player.deployedSandworms + pending.sandworms,
      };
    }
    return {
      ...player,
      resources: { ...player.resources, spice: player.resources.spice + pending.spice },
    };
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      summon
        ? `${owner.leader} summons ${pending.sandworms} sandworm${pending.sandworms === 1 ? "" : "s"} from ${pending.source}.`
        : `${spiceRecipient.leader} gains ${pending.spice} spice from ${pending.source}.`,
      ...state.log,
    ],
  };
  if (summon) {
    const actor = state.players[state.activeSeat];
    return actor ? recordTurnUnitDeployment(nextState, actor.id, pending.sandworms) : nextState;
  }
  return recordTurnSpiceGain(nextState, spiceRecipient.id, pending.spice);
}

export function resolveSietchTabrChoice(
  state: GameState,
  pending: SietchTabrPendingAction,
  choice: "hooks" | "shield-wall",
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  const waterOwner = state.players.find((player) => player.id === pending.waterOwnerId);
  if (!owner || !waterOwner) return { ...state, ...advancePendingAction(state) };

  const takeHooks = choice === "hooks";
  const shareMakerHooks = takeHooks && canHaveMakerHooks(owner);
  const players = state.players.map((player) => {
    let next = player;
    if (shareMakerHooks && canHaveMakerHooks(next)) {
      next = { ...next, makerHooks: true };
    }
    if (next.id === owner.id && takeHooks) {
      next = { ...next, garrison: next.garrison + 1 };
    }
    if (next.id === waterOwner.id) {
      next = { ...next, resources: { ...next.resources, water: next.resources.water + 1 } };
    }
    return next;
  });
  const ownerAfter = players.find((player) => player.id === owner.id) ?? owner;
  const deployable = Math.min(ownerAfter.garrison, (takeHooks ? 1 : 0) + Math.max(0, pending.extraRecruitedTroops ?? 0) + 2);
  const deployPending: PendingAction | undefined = !pending.conflictBlocked && deployable > 0
    ? { kind: "deploy", ownerId: owner.id, remaining: deployable, source: pending.source }
    : undefined;
  const [nextAction, ...nextQueue] = state.pendingQueue;

  return {
    ...state,
    players,
    shieldWall: takeHooks ? state.shieldWall : false,
    pendingAction: deployPending ?? nextAction,
    pendingQueue: deployPending ? state.pendingQueue : nextQueue,
    log: [
      takeHooks
        ? `${owner.leader} resolves ${pending.source}: ${pending.canTakeMakerHooks ? "takes Maker Hooks, " : ""}recruits 1 troop, and ${waterOwner.leader} gains 1 water.`
        : `${waterOwner.leader} gains 1 water from ${pending.source}${pending.canRemoveShieldWall ? " and removes the Shield Wall" : ""}.`,
      ...state.log,
    ],
  };
}

export function deployTroopToConflict(state: GameState, pending: DeployPendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (pending.conflictBlocked || conflictDeploymentBlockedForOwner(state, pending.ownerId)) {
    return { ...state, ...advancePendingAction(state) };
  }
  if (!owner || owner.garrison <= 0 || pending.remaining <= 0) return { ...state, ...advancePendingAction(state) };

  const players = state.players.map((player) =>
    player.id === pending.ownerId
      ? {
          ...player,
          garrison: player.garrison - 1,
          conflict: player.conflict + 2,
          deployedTroops: player.deployedTroops + 1,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  const deployedState = {
    ...state,
    players,
    ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${owner.leader} deploys 1 troop from ${pending.source}.`, ...state.log],
  };
  const actor = state.players[state.activeSeat];
  return actor ? recordTurnUnitDeployment(deployedState, actor.id, 1) : deployedState;
}

export function deployControlDefenseTroop(state: GameState, pending: ControlDefensePendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || playerTroopSupply(owner) <= 0) return { ...state, ...advancePendingAction(state) };

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id
        ? {
            ...player,
            conflict: player.conflict + 2,
            deployedTroops: player.deployedTroops + 1,
          }
        : player,
    ),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} deploys 1 troop from supply to defend ${criticalLocationNames[pending.location]}.`,
      ...state.log,
    ],
  };
}

export function skipControlDefenseTroop(state: GameState, pending: ControlDefensePendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [
      `${owner?.leader ?? "Player"} declines the defensive deployment for ${pending.source}.`,
      ...state.log,
    ],
  };
}

export function reinforceTroop(
  state: GameState,
  pending: ReinforcePendingAction,
  playerId: string,
  destination: "garrison" | "conflict",
): GameState {
  if (pending.remaining <= 0) return state;
  if (destination === "conflict" && pending.conflictBlocked) return state;
  const recipient = state.players.find((player) => player.id === playerId);
  if (!recipient || recipient.team !== pending.team || recipient.role !== "Ally") return state;

  const players = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          garrison: destination === "garrison" ? player.garrison + 1 : player.garrison,
          conflict: destination === "conflict" ? player.conflict + 2 : player.conflict,
          deployedTroops: destination === "conflict" ? player.deployedTroops + 1 : player.deployedTroops,
        }
      : player,
  );
  const remaining = pending.remaining - 1;
  const reinforcedState = {
    ...state,
    players,
    ...(remaining > 0 ? { pendingAction: { ...pending, remaining } } : advancePendingAction(state)),
    log: [`${recipient.leader} receives Military Support into ${destination}.`, ...state.log],
  };
  const actor = state.players[state.activeSeat];
  return destination === "conflict" && actor
    ? recordTurnUnitDeployment(reinforcedState, actor.id, 1)
    : reinforcedState;
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
  const players = resolvedState.players.map((player) =>
    drawCards(
      {
        ...player,
        agentsReady: player.agentsTotal,
        revealed: false,
        persuasion: 0,
        highCouncilSeat: player.highCouncilSeat,
        revealActivatedAllyId: undefined,
        callToArmsActive: false,
        gurneyAlwaysSmilingScored: false,
        conflict: 0,
        deployedTroops: 0,
        deployedSandworms: 0,
        hand: [],
        discard: [...player.discard, ...player.playArea, ...player.hand],
        playArea: [],
        manipulatedCards: [],
      },
      5,
    ),
  );
  const controlDefensePending = pendingActionForControlDefense(resolvedState, nextConflict, players);
  return {
    ...resolvedState,
    phase: "playing",
    round: resolvedState.round + 1,
    agentTurnComplete: false,
    turnSpiceGains: {},
    turnReverendMotherJessicaRepeats: {},
    turnUnitDeployments: {},
    firstSeat,
    activeSeat: firstSeat,
    players,
    spaces: {},
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
