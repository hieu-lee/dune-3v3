import {
  boardSpaces,
  factionLabels,
  leaderCardByName,
} from "./data";
import {
  applyBoardEffect,
  applyCardAgentEffect,
} from "./agent-effects";
import {
  boardSpaceRewardApplies,
  effectiveCost,
  effectiveEmperorIconInfluence,
  effectiveFremenIconInfluence,
  effectiveRequirementInfluence,
} from "./board-rules";
import {
  combatIntrigueActorIds,
  combatIntrigueStrength,
  combatIntrigueTargets,
  firstCombatSeat,
  nextCombatSeat,
} from "./combat-intrigue-rules";
import { commanderPersonalFaction } from "./commander-rules";
import {
  conflictProtectedByShieldWall,
  criticalLocationNames,
} from "./critical-locations";
import {
  canHaveMakerHooks,
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  conflictDeploymentBlockedForOwner,
} from "./conflict-rules";
import {
  corrinoMightCost,
  pendingActionForReverendMotherJessicaRepeat,
  shaddamSignetRingInfluenceChoices,
  shaddamSignetRingInfluenceCost,
  shaddamSignetRingTroopCost,
} from "./card-pending-rules";
import { resolveCurrentConflict } from "./conflict-awards";
import {
  buyAccessPairChoices,
  changeAllegiancesGainChoices,
  imperiumPoliticsFactionChoices,
  influenceLossChoices,
  influenceLossPairChoices,
  sietchRitualFactionChoices,
  validBuyAccessChoice,
  validInfluenceLossPair,
  validSietchRitualChoice,
} from "./influence-choices";
import {
  allowedInfluenceLossChoices,
  changeAllegiancesLossChoices,
  influenceEffectOwnerForChoice,
} from "./influence-loss-rules";
import type {
  BuyAccessChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
} from "./influence-choices";
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
  adjustInfluenceAndResolveThresholdRewards,
  resolveLeaderInfluenceThresholdRewards,
  scoreGurneyAlwaysSmiling,
} from "./leader-rewards";
import {
  acquirableCardsForPending,
  activatedAllyEffectOwner,
  irulanSignetAcquireCards,
  irulanSignetAcquirePending,
  irulanSignetTrashableCards,
  irulanSignetTrashPending,
} from "./market-rules";
import {
  advancePendingAction,
  pendingActionsFor,
  prependPendingAction,
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
  canPlaySpecialMissionPlaceSpy,
  resolvePlaceSpyForPending,
  resolveStabanUnseenNetworkChoiceForPending,
  specialMissionRecallSpySpaces,
  specialMissionSpyPending,
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
import { pendingActionForSpace } from "./placement-rules";
import {
  removeSpyPostOwner,
  spyPostCount,
} from "./spy-posts";
import {
  placeableSpySpaces,
} from "./spy-choices";
import {
  hasUsedReverendMotherJessicaRepeat,
  recordReverendMotherJessicaRepeat,
  recordTurnSpiceGain,
  recordTurnUnitDeployment,
} from "./turn-trackers";
import {
  transferTradeGood,
  updateTradeSelection,
} from "./trade-rules";
import {
  skipTrashCard,
  trashableCards,
  trashPlayerCard,
} from "./trash-rules";
import {
  advanceMakerSpice,
  advanceSeat,
  allPlayersDone,
  endgameTriggerReason,
} from "./game-flow";
import {
  isBackedByChoamIntrigue,
  isBuyAccessIntrigue,
  isCallToArmsIntrigue,
  isChangeAllegiancesIntrigue,
  isCommandRespectCommanderCard,
  isCorrinoMightCommanderCard,
  isCouncilorsAmbitionIntrigue,
  isDemandAttentionCommanderCard,
  isDemandResultsCommanderCard,
  isDepartForArrakisIntrigue,
  isDesertCallCommanderCard,
  isDetonationIntrigue,
  isDevourIntrigue,
  isFindWeaknessIntrigue,
  isGenericSignetRingCard,
  isGoToGroundIntrigue,
  isImperiumPoliticsIntrigue,
  isImpressIntrigue,
  isMarketOpportunityIntrigue,
  isMercenariesIntrigue,
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
  isUnexpectedAlliesIntrigue,
} from "./card-identifiers";
import type {
  ContractCard,
  FactionId,
  GameState,
  PendingAction,
  Player,
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

export type SpiceIsPowerChoice = "spend-spice" | "retreat-troops";
export type TacticalOptionChoice = "add-strength" | { kind: "retreat-troops"; count: number };
export type CombatIntrigueChoice = SpiceIsPowerChoice | TacticalOptionChoice;
export type DepartForArrakisChoice = "draw" | "spend-spice";
export type CunningPlotChoice = "draw" | "paid-trash";
export type ChangeAllegiancesChoice =
  | { kind: "shift"; loseFaction: FactionId; gainFaction: FactionId }
  | { kind: "spend-spice"; gainFaction: FactionId }
  | { kind: "both"; loseFaction: FactionId; shiftGainFaction: FactionId; spiceGainFaction: FactionId };
export type SpecialMissionChoice =
  | { kind: "place-spy" }
  | { kind: "recall-spy"; spaceId: string };
export type StrategicStockpilingChoice = "spice" | "water" | "both";
export type MarketOpportunityChoice = "spice-to-solari" | "solari-to-spice";
export type ShaddamSignetRingChoice = "skip" | "troop" | { kind: "influence"; faction: FactionId };
export type IrulanSignetRingChoice = "skip" | "acquire" | "trash";
export type StabanUnseenNetworkChoice = "pay" | "skip";
export type LadyAmberDesertScoutsChoice = "retreat" | "skip";
export type JessicaSpiceAgonyChoice = "pay" | "skip";
export type JessicaWaterOfLifeChoice = "pay" | "skip";
export type JessicaReverendMotherChoice = "repeat" | "skip";
export type JessicaOtherMemoriesChoice = "flip" | "skip";

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
type TradePendingAction = Extract<PendingAction, { kind: "trade" }>;
type RevealAdjustPendingAction = Extract<PendingAction, { kind: "reveal-adjust" }>;
type CommanderResourceSplitPendingAction = Extract<PendingAction, { kind: "commander-resource-split" }>;
type CommandRespectPendingAction = Extract<PendingAction, { kind: "command-respect" }>;
type DemandResultsPendingAction = Extract<PendingAction, { kind: "demand-results" }>;
type CorrinoMightPendingAction = Extract<PendingAction, { kind: "corrino-might" }>;
type DemandAttentionPendingAction = Extract<PendingAction, { kind: "demand-attention" }>;
type DesertCallPendingAction = Extract<PendingAction, { kind: "desert-call" }>;
type ShaddamSignetRingPendingAction = Extract<PendingAction, { kind: "shaddam-signet-ring" }>;
type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;
type LadyAmberDesertScoutsPendingAction = Extract<PendingAction, { kind: "amber-desert-scouts" }>;
type JessicaSpiceAgonyPendingAction = Extract<PendingAction, { kind: "jessica-spice-agony" }>;
type JessicaWaterOfLifePendingAction = Extract<PendingAction, { kind: "jessica-water-of-life" }>;
type JessicaReverendMotherPendingAction = Extract<PendingAction, { kind: "jessica-reverend-mother" }>;
type JessicaOtherMemoriesPendingAction = Extract<PendingAction, { kind: "jessica-other-memories" }>;

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

export function playSietchRitualPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  discardCardId: string,
  faction: SietchRitualChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isSietchRitualIntrigue(intrigue)) return state;
  const discardedCard = player.hand.find((card) => card.id === discardCardId);
  if (!discardedCard || !validSietchRitualChoice(player, faction)) return state;
  const personalFaction = commanderPersonalFaction(player);
  const influenceOwnerResult =
    player.role === "Commander" && faction !== personalFaction
      ? activatedAllyEffectOwner(state, player, influenceOwnerId)
      : { valid: true, owner: player };
  if (!influenceOwnerResult.valid || !influenceOwnerResult.owner) return state;
  const influenceOwner = influenceOwnerResult.owner;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        hand: next.hand.filter((card) => card.id !== discardedCard.id),
        discard: [...next.discard, discardedCard],
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === influenceOwner.id) {
      next = adjustInfluence(next, faction, 1);
    }
    return next;
  });
  const influenceText = influenceOwner.id === player.id
    ? `gains 1 ${factionLabels[faction]} Influence`
    : `${influenceOwner.leader} gains 1 ${factionLabels[faction]} Influence`;

  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Sietch Ritual, discards ${discardedCard.name}, and ${influenceText}.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

function changeAllegiancesChoiceValid(
  state: GameState,
  player: Player,
  choice: ChangeAllegiancesChoice,
  influenceOwnerId?: string,
) {
  if (!choice || typeof choice !== "object") return false;
  if (choice.kind === "spend-spice") {
    return changeAllegiancesGainChoices(player).includes(choice.gainFaction);
  }
  if (choice.kind === "shift") {
    return (
      changeAllegiancesLossChoices(state, player, influenceOwnerId).includes(choice.loseFaction) &&
      changeAllegiancesGainChoices(player).includes(choice.gainFaction)
    );
  }
  if (choice.kind === "both") {
    const gainChoices = changeAllegiancesGainChoices(player);
    return (
      changeAllegiancesLossChoices(state, player, influenceOwnerId).includes(choice.loseFaction) &&
      gainChoices.includes(choice.shiftGainFaction) &&
      gainChoices.includes(choice.spiceGainFaction)
    );
  }
  return false;
}

function changeAllegiancesShiftGainFaction(choice: ChangeAllegiancesChoice) {
  if (choice.kind === "shift") return choice.gainFaction;
  if (choice.kind === "both") return choice.shiftGainFaction;
  return undefined;
}

function changeAllegiancesSpiceGainFaction(choice: ChangeAllegiancesChoice) {
  if (choice.kind === "spend-spice") return choice.gainFaction;
  if (choice.kind === "both") return choice.spiceGainFaction;
  return undefined;
}

export function playChangeAllegiancesPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: ChangeAllegiancesChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isChangeAllegiancesIntrigue(intrigue)) return state;
  if (!changeAllegiancesChoiceValid(state, player, choice, influenceOwnerId)) return state;
  const spendsSpice = choice.kind === "spend-spice" || choice.kind === "both";
  if (spendsSpice && player.resources.spice < 3) return state;

  const shiftGainFaction = changeAllegiancesShiftGainFaction(choice);
  const spiceGainFaction = changeAllegiancesSpiceGainFaction(choice);
  const shiftGainOwnerResult = shiftGainFaction
    ? influenceEffectOwnerForChoice(state, player, shiftGainFaction, influenceOwnerId)
    : undefined;
  if (shiftGainOwnerResult && (!shiftGainOwnerResult.valid || !shiftGainOwnerResult.owner)) return state;
  const spiceGainOwnerResult = spiceGainFaction
    ? influenceEffectOwnerForChoice(state, player, spiceGainFaction, influenceOwnerId)
    : undefined;
  if (spiceGainOwnerResult && (!spiceGainOwnerResult.valid || !spiceGainOwnerResult.owner)) return state;
  const lossFaction = choice.kind === "shift" || choice.kind === "both" ? choice.loseFaction : undefined;
  const lossOwnerResult = lossFaction
    ? influenceEffectOwnerForChoice(state, player, lossFaction, influenceOwnerId)
    : undefined;
  if (lossOwnerResult && (!lossOwnerResult.valid || !lossOwnerResult.owner)) return state;
  if (lossOwnerResult?.owner && lossFaction && lossOwnerResult.owner.influence[lossFaction] <= 0) return state;

  const lossOwner = lossOwnerResult?.owner;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: spendsSpice
          ? { ...next.resources, spice: next.resources.spice - 3 }
          : next.resources,
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    return next;
  });
  const gainEffects = [
    ...(shiftGainFaction && shiftGainOwnerResult?.owner
      ? [{ owner: shiftGainOwnerResult.owner, faction: shiftGainFaction }]
      : []),
    ...(spiceGainFaction && spiceGainOwnerResult?.owner
      ? [{ owner: spiceGainOwnerResult.owner, faction: spiceGainFaction }]
      : []),
  ];
  const gainText = gainEffects
    .map(({ owner, faction }) =>
      owner.id === player.id
        ? `gains 1 ${factionLabels[faction]} Influence`
        : `${owner.leader} gains 1 ${factionLabels[faction]} Influence`
    )
    .join(" and ");
  const logEntry = choice.kind === "spend-spice"
    ? `${player.leader} plays Change Allegiances, spends 3 spice, and ${gainText}.`
    : choice.kind === "shift"
      ? `${player.leader} plays Change Allegiances; ${lossOwner?.leader ?? player.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence and ${gainText}.`
      : `${player.leader} plays Change Allegiances; ${lossOwner?.leader ?? player.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence, ${player.leader} spends 3 spice, and ${gainText}.`;

  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [logEntry, ...state.log],
  };
  const influenceSteps = [
    ...(lossOwner && lossFaction
      ? [{ ownerId: lossOwner.id, faction: lossFaction, amount: -1 }]
      : []),
    ...(shiftGainFaction && shiftGainOwnerResult?.owner
      ? [{ ownerId: shiftGainOwnerResult.owner.id, faction: shiftGainFaction, amount: 1 }]
      : []),
    ...(spiceGainFaction && spiceGainOwnerResult?.owner
      ? [{ ownerId: spiceGainOwnerResult.owner.id, faction: spiceGainFaction, amount: 1 }]
      : []),
  ];
  return influenceSteps.reduce(
    (next, { ownerId, faction, amount }) =>
      adjustInfluenceAndResolveThresholdRewards(next, ownerId, faction, amount),
    nextState,
  );
}

export function playSpecialMissionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: SpecialMissionChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isSpecialMissionIntrigue(intrigue) || !choice || typeof choice !== "object") return state;

  if (choice.kind === "place-spy") {
    if (!canPlaySpecialMissionPlaceSpy(state, player)) return state;
    return {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id) }
          : candidate,
      ),
      pendingAction: specialMissionSpyPending(player),
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [
        `${player.leader} plays Special Mission and may place a spy on a City observation post.`,
        ...state.log,
      ],
    };
  }

  if (choice.kind === "recall-spy") {
    const space = specialMissionRecallSpySpaces(state, player).find((candidate) => candidate.id === choice.spaceId);
    if (!space) return state;
    const { spyPosts, sharedSpyPosts } = removeSpyPostOwner(state, space.id, player.id);
    const shieldWallText = state.shieldWall ? ", removes the Shield Wall," : "";
    return recordTurnSpiceGain({
      ...state,
      shieldWall: false,
      spyPosts,
      sharedSpyPosts,
      players: state.players.map((candidate) =>
        candidate.id === player.id
          ? {
              ...candidate,
              resources: { ...candidate.resources, spice: candidate.resources.spice + 2 },
              spies: candidate.spies + 1,
              intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
            }
          : candidate,
      ),
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [
        `${player.leader} plays Special Mission, recalls a spy from ${space.name}${shieldWallText} and gains 2 spice.`,
        ...state.log,
      ],
    }, player.id, 2);
  }

  return state;
}

function influenceLossPairLog(choice: InfluenceLossPair) {
  const [first, second] = choice;
  if (first === second) return `2 ${factionLabels[first]} Influence`;
  return `1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence`;
}

export function playOpportunismPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: InfluenceLossPair,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isOpportunismIntrigue(intrigue)) return state;
  if (!validInfluenceLossPair(player, choice)) return state;
  if (player.resources.solari < 2) return state;
  const [first, second] = choice;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    let next = {
      ...candidate,
      resources: { ...candidate.resources, solari: candidate.resources.solari - 2 },
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
    };
    next = adjustInfluence(next, first, -1);
    next = adjustInfluence(next, second, -1);
    return { ...next, vp: next.vp + 1 };
  });

  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Opportunism, spends 2 Solari, loses ${influenceLossPairLog(choice)}, and gains 1 VP.`,
      ...state.log,
    ],
  };
}

export function playImperiumPoliticsPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  faction: ImperiumPoliticsChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isImperiumPoliticsIntrigue(intrigue)) return state;
  if (!imperiumPoliticsFactionChoices(player).includes(faction)) return state;
  if (player.resources.solari < 1) return state;

  const influenceOwnerResult = player.role === "Commander" && faction !== "emperor"
    ? activatedAllyEffectOwner(state, player, influenceOwnerId)
    : { valid: true, owner: player };
  if (!influenceOwnerResult.valid || !influenceOwnerResult.owner) return state;
  const influenceOwner = influenceOwnerResult.owner;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 1 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === influenceOwner.id) {
      next = adjustInfluence(next, faction, 1);
    }
    return next;
  });
  const influenceText = influenceOwner.id === player.id
    ? "gains"
    : `${influenceOwner.leader} gains`;
  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Imperium Politics, spends 1 Solari, and ${influenceText} 1 ${factionLabels[faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function playBuyAccessPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: BuyAccessChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isBuyAccessIntrigue(intrigue)) return state;
  if (!validBuyAccessChoice(player, choice)) return state;
  if (player.resources.solari < 5) return state;

  const personalFaction = commanderPersonalFaction(player);
  const influenceEffects = choice.map((faction) => {
    const ownerResult = player.role === "Commander" && faction !== personalFaction
      ? activatedAllyEffectOwner(state, player, influenceOwnerId)
      : { valid: true, owner: player };
    return { faction, ownerResult };
  });
  if (influenceEffects.some((effect) => !effect.ownerResult.valid || !effect.ownerResult.owner)) return state;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 5 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    influenceEffects.forEach((effect) => {
      const owner = effect.ownerResult.owner;
      if (owner && candidate.id === owner.id) {
        next = adjustInfluence(next, effect.faction, 1);
      }
    });
    return next;
  });

  const selfOnly = influenceEffects.every((effect) => effect.ownerResult.owner?.id === player.id);
  const effectText = selfOnly
    ? influenceEffects
      .map((effect) => `1 ${factionLabels[effect.faction]} Influence`)
      .join(" and ")
    : influenceEffects
      .map((effect) => {
        const owner = effect.ownerResult.owner;
        return `${owner?.leader ?? "the activated Ally"} gains 1 ${factionLabels[effect.faction]} Influence`;
      })
      .join(" and ");
  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Buy Access, spends 5 Solari, and ${selfOnly ? `gains ${effectText}` : effectText}.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function playDepartForArrakisPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: DepartForArrakisChoice,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDepartForArrakisIntrigue(intrigue)) return state;
  if (choice !== "draw" && choice !== "spend-spice") return state;

  const canDraw = effectiveFremenIconInfluence(player, state.players) >= 3;
  const spendsSpice = choice === "spend-spice";
  if (choice === "draw" && !canDraw) return state;
  if (spendsSpice && player.resources.spice < 2) return state;

  const troopOwnerResult = spendsSpice
    ? activatedAllyEffectOwner(state, player, troopOwnerId)
    : { valid: true, owner: undefined };
  if (!troopOwnerResult.valid) return state;
  const troopOwner = troopOwnerResult.owner;

  let cardsDrawn = 0;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: {
          ...next.resources,
          spice: next.resources.spice - (spendsSpice ? 2 : 0),
        },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
      if (canDraw) {
        const drawn = drawCards(next, next.hand.length + 1);
        cardsDrawn = drawn.hand.length - next.hand.length;
        next = drawn;
      }
    }
    if (spendsSpice && troopOwner && candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 3 };
    }
    return next;
  });

  const cardText = cardsDrawn === 1 ? "1 card" : `${cardsDrawn} cards`;
  const drawText = canDraw ? `draws ${cardText}` : "";
  const troopLabel = troopOwner && troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const troopText = spendsSpice ? `spends 2 spice and recruits 3 troops${troopLabel}` : "";
  const joiner = canDraw && spendsSpice ? ", " : "";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Depart For Arrakis, ${drawText}${joiner}${troopText}.`,
      ...state.log,
    ],
  };
}

export function playCouncilorsAmbitionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isCouncilorsAmbitionIntrigue(intrigue) || !player.highCouncilSeat) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          resources: { ...candidate.resources, water: candidate.resources.water + 2 },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [`${player.leader} plays Councilor's Ambition and gains 2 water.`, ...state.log],
  };
}

export function playMercenariesPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isMercenariesIntrigue(intrigue) || player.resources.solari < 3) return state;

  const troopOwnerResult = activatedAllyEffectOwner(state, player, troopOwnerId);
  if (!troopOwnerResult.valid || !troopOwnerResult.owner) return state;
  const troopOwner = troopOwnerResult.owner;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 3 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 2 };
    }
    return next;
  });
  const troopLabel = troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const drawnState = drawIntrigueCards(
    {
      ...state,
      players,
    },
    player.id,
    1,
    "Mercenaries",
  );
  return {
    ...drawnState,
    intrigueDiscard: [...drawnState.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Mercenaries${troopLabel}, spends 3 Solari, and recruits 2 troops.`,
      ...drawnState.log,
    ],
  };
}

export function playStrategicStockpilingPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: StrategicStockpilingChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isStrategicStockpilingIntrigue(intrigue)) return state;

  const spendSpice = choice === "spice" || choice === "both";
  const spendWater = choice === "water" || choice === "both";
  if (!spendSpice && !spendWater) return state;
  if (spendSpice && player.resources.spice < 5) return state;
  if (
    spendWater &&
    (player.resources.water < 3 || effectiveRequirementInfluence(player, "spacing", state.players) < 3)
  ) {
    return state;
  }

  const vp = (spendSpice ? 1 : 0) + (spendWater ? 1 : 0);
  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          vp: candidate.vp + vp,
          resources: {
            ...candidate.resources,
            spice: candidate.resources.spice - (spendSpice ? 5 : 0),
            water: candidate.resources.water - (spendWater ? 3 : 0),
          },
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  const paymentText = spendSpice && spendWater
    ? "spends 5 spice and 3 water"
    : spendSpice
      ? "spends 5 spice"
      : "spends 3 water";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Strategic Stockpiling, ${paymentText}, and gains ${vp} VP.`,
      ...state.log,
    ],
  };
}

export function playShaddamsFavorPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  troopOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isShaddamsFavorIntrigue(intrigue)) return state;

  const troopOwnerResult = activatedAllyEffectOwner(state, player, troopOwnerId);
  if (!troopOwnerResult.valid || !troopOwnerResult.owner) return state;
  const troopOwner = troopOwnerResult.owner;

  const gainsSolari = effectiveEmperorIconInfluence(player, state.players) >= 3;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: {
          ...next.resources,
          solari: next.resources.solari + (gainsSolari ? 3 : 0),
        },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === troopOwner.id) {
      next = { ...next, garrison: next.garrison + 1 };
    }
    return next;
  });
  const troopLabel = troopOwner.id !== player.id ? ` for ${troopOwner.leader}` : "";
  const solariLabel = gainsSolari ? " and gains 3 Solari" : "";
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Shaddam's Favor${troopLabel}, recruits 1 troop${solariLabel}.`,
      ...state.log,
    ],
  };
}

export function playMarketOpportunityPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: MarketOpportunityChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isMarketOpportunityIntrigue(intrigue)) return state;
  if (choice !== "spice-to-solari" && choice !== "solari-to-spice") return state;
  if (choice === "spice-to-solari" && player.resources.spice < 2) return state;
  if (choice === "solari-to-spice" && player.resources.solari < 5) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    const resources = { ...candidate.resources };
    if (choice === "spice-to-solari") {
      resources.spice -= 2;
      resources.solari += 5;
    } else {
      resources.solari -= 5;
      resources.spice += 5;
    }
    return {
      ...candidate,
      resources,
      intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
    };
  });
  const logText = choice === "spice-to-solari"
    ? `${player.leader} plays Market Opportunity, spends 2 spice, and gains 5 Solari.`
    : `${player.leader} plays Market Opportunity, spends 5 Solari, and gains 5 spice.`;
  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [logText, ...state.log],
  };
  return choice === "solari-to-spice" ? recordTurnSpiceGain(nextState, player.id, 5) : nextState;
}

export function playBackedByChoamPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  faction: FactionId,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isBackedByChoamIntrigue(intrigue) || !influenceLossChoices(player).includes(faction)) return state;

  const players = state.players.map((candidate) => {
    if (candidate.id !== player.id) return candidate;
    const influenced = adjustInfluence(candidate, faction, -1);
    return {
      ...influenced,
      resources: { ...influenced.resources, solari: influenced.resources.solari + 4 },
      intrigues: influenced.intrigues.filter((card) => card.id !== intrigue.id),
    };
  });
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Backed by CHOAM as a Plot Intrigue, loses 1 ${factionLabels[faction]} Influence, and gains 4 Solari.`,
      ...state.log,
    ],
  };
}

export function playDetonationIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: "shield-wall" | "deploy",
  deployOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isDetonationIntrigue(intrigue)) return state;
  if (choice === "shield-wall" && !state.shieldWall) return state;
  const deployOwnerResult = choice === "deploy"
    ? activatedAllyEffectOwner(state, player, deployOwnerId)
    : { valid: true, owner: undefined };
  if (choice === "deploy" && (!state.conflict || !deployOwnerResult.valid || !deployOwnerResult.owner)) return state;
  if (
    choice === "deploy" &&
    deployOwnerResult.owner &&
    conflictDeploymentBlockedFor(state, player.id, deployOwnerResult.owner.id)
  ) {
    return state;
  }

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? { ...candidate, intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id) }
      : candidate,
  );
  const baseState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
  };

  if (choice === "shield-wall") {
    return {
      ...baseState,
      shieldWall: false,
      log: [`${player.leader} plays Detonation and removes the Shield Wall.`, ...state.log],
    };
  }

  const deployOwner = deployOwnerResult.owner;
  if (!deployOwner) return state;
  const deployable = Math.min(deployOwner.garrison, 4);
  const deployLabel = deployOwner && deployOwner.id !== player.id ? ` for ${deployOwner.leader}` : "";
  const deployPending: PendingAction | undefined = deployable > 0
    ? { kind: "deploy", ownerId: deployOwner.id, remaining: deployable, source: "Detonation" }
    : undefined;
  return {
    ...baseState,
    pendingAction: deployPending,
    log: [
      deployable > 0
        ? `${player.leader} plays Detonation${deployLabel} and may deploy up to ${deployable} troops.`
        : `${player.leader} plays Detonation${deployLabel} and deploys no troops.`,
      ...state.log,
    ],
  };
}

export function playUnexpectedAlliesIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  removeShieldWall: boolean,
  sandwormOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isUnexpectedAlliesIntrigue(intrigue)) return state;
  if (!state.conflict || player.resources.water < 2) return state;
  if (state.shieldWall && conflictProtectedByShieldWall(state.conflict) && !removeShieldWall) return state;

  const sandwormOwnerResult = activatedAllyEffectOwner(state, player, sandwormOwnerId);
  if (!sandwormOwnerResult.valid || !sandwormOwnerResult.owner) return state;
  const sandwormOwner = sandwormOwnerResult.owner;
  if (conflictDeploymentBlockedFor(state, player.id, sandwormOwner.id)) return state;

  const removedShieldWall = removeShieldWall && state.shieldWall;
  const ownerLabel = sandwormOwner.id !== player.id ? ` for ${sandwormOwner.leader}` : "";
  const shieldLabel = removedShieldWall ? " removes the Shield Wall," : "";

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: { ...next.resources, water: next.resources.water - 2 },
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === sandwormOwner.id) {
      next = {
        ...next,
        conflict: next.conflict + 3,
        deployedSandworms: next.deployedSandworms + 1,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    shieldWall: removedShieldWall ? false : state.shieldWall,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Unexpected Allies${ownerLabel}, spends 2 water,${shieldLabel} and summons 1 sandworm.`,
      ...state.log,
    ],
  };
  return recordTurnUnitDeployment(nextState, player.id, 1);
}

export function playCallToArmsPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isCallToArmsIntrigue(intrigue)) return state;

  const players = state.players.map((candidate) =>
    candidate.id === player.id
      ? {
          ...candidate,
          callToArmsActive: true,
          intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
        }
      : candidate,
  );
  return {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Call to Arms; acquisitions during this Reveal turn will recruit 1 troop.`,
      ...state.log,
    ],
  };
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
  if (state.phase !== "combat" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const actor = state.players[state.activeSeat];
  if (!actor || actor.id !== actorId) return state;
  const intrigue = actor.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue) return state;
  const targets = combatIntrigueTargets(state, actor.id);
  if (actor.role === "Commander" && !targetId) return state;
  const resolvedTargetId = targetId ?? targets[0];
  if (!resolvedTargetId || !targets.includes(resolvedTargetId)) return state;
  const target = state.players.find((player) => player.id === resolvedTargetId);
  if (!target) return state;
  if (isImpressIntrigue(intrigue)) {
    const acquirePending: AcquireCardPendingAction = {
      kind: "acquire-card",
      ownerId: target.id,
      source: "Impress",
      maxCost: 3,
      destination: "discard",
    };
    const canAcquire = acquirableCardsForPending(state, acquirePending).length > 0;
    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = { ...next, conflict: next.conflict + 2 };
      }
      return next;
    });
    const acquireText = canAcquire
      ? ` and ${target.leader} must acquire a card that costs 3 or less`
      : ` and ${target.leader} has no eligible card to acquire`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: canAcquire ? acquirePending : undefined,
      log: [
        `${actor.leader} plays Impress for ${target.leader}, adding 2 strength${acquireText}.`,
        ...state.log,
      ],
    });
  }
  if (isGoToGroundIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    if (
      !Number.isInteger(retreatCount) ||
      (retreatCount ?? 0) < 1 ||
      (retreatCount ?? 0) > 2 ||
      (retreatCount ?? 0) > target.deployedTroops
    ) return state;
    const count = retreatCount ?? 0;
    const spyPending: SpyPendingAction = { kind: "spy", ownerId: target.id, remaining: 1, source: "Go To Ground" };
    const canPlaceSpy = placeableSpySpaces(state, spyPending).length > 0;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - count * 2),
          deployedTroops: next.deployedTroops - count,
          garrison: next.garrison + count,
        };
      }
      return next;
    });
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: canPlaceSpy ? spyPending : undefined,
      log: [
        `${actor.leader} plays Go To Ground for ${target.leader}; ${target.leader} retreats ${count} ${count === 1 ? "troop" : "troops"}${canPlaceSpy ? " and may place a spy" : ""}.`,
        ...state.log,
      ],
    });
  }
  if (isSpiceIsPowerIntrigue(intrigue)) {
    if (combatChoice !== "spend-spice" && combatChoice !== "retreat-troops") return state;
    if (combatChoice === "spend-spice" && target.resources.spice < 3) return state;
    if (combatChoice === "retreat-troops" && target.deployedTroops < 3) return state;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id && combatChoice === "spend-spice") {
        next = {
          ...next,
          conflict: next.conflict + 6,
          resources: { ...next.resources, spice: next.resources.spice - 3 },
        };
      }
      if (player.id === target.id && combatChoice === "retreat-troops") {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - 6),
          deployedTroops: next.deployedTroops - 3,
          garrison: next.garrison + 3,
          resources: { ...next.resources, spice: next.resources.spice + 3 },
        };
      }
      return next;
    });
    const logEntry = combatChoice === "spend-spice"
      ? `${actor.leader} plays Spice is Power for ${target.leader}; ${target.leader} spends 3 spice to add 6 strength.`
      : `${actor.leader} plays Spice is Power for ${target.leader}; ${target.leader} retreats 3 troops and gains 3 spice.`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [logEntry, ...state.log],
    });
  }
  if (isTacticalOptionIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    const addsStrength = combatChoice === "add-strength";
    if (!addsStrength && !retreatCount) return state;
    if (
      retreatCount !== undefined &&
      (!Number.isInteger(retreatCount) || retreatCount < 1 || retreatCount > target.deployedTroops)
    ) return state;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id && addsStrength) {
        next = { ...next, conflict: next.conflict + 2 };
      }
      if (player.id === target.id && retreatCount !== undefined) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - retreatCount * 2),
          deployedTroops: next.deployedTroops - retreatCount,
          garrison: next.garrison + retreatCount,
        };
      }
      return next;
    });
    const logEntry = addsStrength
      ? `${actor.leader} plays Tactical Option for ${target.leader}, adding 2 strength.`
      : `${actor.leader} plays Tactical Option for ${target.leader}; ${target.leader} retreats ${retreatCount} ${retreatCount === 1 ? "troop" : "troops"}.`;
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      log: [logEntry, ...state.log],
    });
  }
  if (isReachAgreementIntrigue(intrigue)) {
    const retreatCount =
      typeof combatChoice === "object" && combatChoice.kind === "retreat-troops" ? combatChoice.count : undefined;
    if (
      !Number.isInteger(retreatCount) ||
      (retreatCount ?? 0) < 1 ||
      (retreatCount ?? 0) > 2 ||
      (retreatCount ?? 0) > target.deployedTroops
    ) return state;
    const count = retreatCount ?? 0;

    const players = state.players.map((player) => {
      let next = player;
      if (player.id === actor.id) {
        next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
      }
      if (player.id === target.id) {
        next = {
          ...next,
          conflict: Math.max(0, next.conflict - count * 2),
          deployedTroops: next.deployedTroops - count,
          garrison: next.garrison + count,
        };
      }
      return next;
    });
    return advanceAfterCombatIntriguePlay({
      ...state,
      players,
      combatPasses: [],
      intrigueDiscard: [...state.intrigueDiscard, intrigue],
      pendingAction: { kind: "contract", ownerId: target.id, source: "Reach Agreement" },
      log: [
        `${actor.leader} plays Reach Agreement for ${target.leader}; ${target.leader} retreats ${count} ${count === 1 ? "troop" : "troops"} and takes a CHOAM contract.`,
        ...state.log,
      ],
    });
  }
  const combatSwords = combatIntrigueStrength(state, actor, intrigue, target);
  if (!combatSwords) return state;
  const canTrashFromDevour = isDevourIntrigue(intrigue) && target.deployedSandworms > 0 && trashableCards(target).length > 0;
  const trashPending: PendingAction | undefined = canTrashFromDevour
    ? { kind: "trash-card", ownerId: target.id, source: "Devour", optional: true }
    : undefined;
  const canRecallSpyForFindWeakness = isFindWeaknessIntrigue(intrigue) && spyPostCount(state, actor.id) > 0;
  const recallSpyPending: PendingAction | undefined = canRecallSpyForFindWeakness
    ? {
        kind: "recall-spy",
        ownerId: actor.id,
        combatRecipientId: target.id,
        remaining: 1,
        strength: 3,
        source: "Find Weakness",
        optional: true,
      }
    : undefined;
  const springTheTrapPending: PendingAction | undefined = isSpringTheTrapIntrigue(intrigue)
    ? {
        kind: "recall-spy",
        ownerId: actor.id,
        combatRecipientId: target.id,
        remaining: 2,
        strength: 7,
        source: "Spring The Trap",
        optional: false,
      }
    : undefined;
  const alternateInfluenceLossOwnerIds =
    actor.role === "Commander" && allowedInfluenceLossChoices(actor).length > 0 ? [actor.id] : undefined;
  const canLoseInfluenceForQuestionableMethods =
    isQuestionableMethodsIntrigue(intrigue)
    && (allowedInfluenceLossChoices(target).length > 0 || Boolean(alternateInfluenceLossOwnerIds));
  const influenceLossPending: PendingAction | undefined = canLoseInfluenceForQuestionableMethods
    ? {
        kind: "lose-influence",
        ownerId: target.id,
        ...(alternateInfluenceLossOwnerIds ? { alternateOwnerIds: alternateInfluenceLossOwnerIds } : {}),
        combatRecipientId: target.id,
        strength: 4,
        source: "Questionable Methods",
        optional: true,
      }
    : undefined;
  const immediateCombatSwords = isSpringTheTrapIntrigue(intrigue) ? 0 : combatSwords;

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === actor.id) {
      next = { ...next, intrigues: next.intrigues.filter((card) => card.id !== intrigue.id) };
    }
    if (immediateCombatSwords > 0 && player.id === target.id) {
      next = { ...next, conflict: next.conflict + immediateCombatSwords };
    }
    return next;
  });
  const nextState = {
    ...state,
    players,
    combatPasses: [],
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    pendingAction: trashPending ?? recallSpyPending ?? springTheTrapPending ?? influenceLossPending,
  };
  const pendingText = canTrashFromDevour
    ? " and may trash a card"
    : canRecallSpyForFindWeakness
      ? " and may recall a spy"
      : springTheTrapPending
        ? " and must recall 2 spies"
        : influenceLossPending
          ? " and may lose 1 Influence"
      : "";
  const strengthText = isSpringTheTrapIntrigue(intrigue)
    ? "preparing to add 7 strength"
    : `adding ${combatSwords} strength`;
  return advanceAfterCombatIntriguePlay({
    ...nextState,
    log: [
      `${actor.leader} plays ${intrigue.name} for ${target.leader}, ${strengthText}${pendingText}.`,
      ...state.log,
    ],
  });
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

export function resolveCommandRespectTrade(
  state: GameState,
  pending: CommandRespectPendingAction,
  partnerId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const partner = state.players.find((player) => player.id === partnerId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    !commander.swordmasterBonus ||
    !commander.playArea.some((card) => card.id === pending.cardId && isCommandRespectCommanderCard(card)) ||
    !partner ||
    partner.team !== commander.team ||
    partner.role !== "Ally" ||
    !pending.partnerIds.includes(partner.id)
  ) {
    return state;
  }

  const players = state.players.map((player) =>
    player.id === commander.id
      ? { ...player, playArea: player.playArea.filter((card) => card.id !== pending.cardId) }
      : player,
  );
  const tradePending: PendingAction = {
    kind: "trade",
    actorId: commander.id,
    partnerId: partner.id,
    resource: "intrigue",
    actorGiven: 0,
    partnerGiven: 0,
    partnerLocked: true,
    source: pending.source,
  };

  return {
    ...state,
    players,
    pendingAction: tradePending,
    log: [
      `${commander.leader} trashes ${pending.source} to trade with ${partner.leader}.`,
      ...state.log,
    ],
  };
}

export function skipCommandRespect(state: GameState, pending: CommandRespectPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} keeps ${pending.source} and declines to trade.`, ...state.log],
  };
}

export function resolveDemandResultsChoice(
  state: GameState,
  pending: DemandResultsPendingAction,
  optionIndex: number,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const allyA = state.players.find((player) => player.id === pending.allyIds[0]);
  const allyB = state.players.find((player) => player.id === pending.allyIds[1]);
  const contractA = state.contractOffer.find((contract) => contract.id === pending.contractIds[0]);
  const contractB = state.contractOffer.find((contract) => contract.id === pending.contractIds[1]);
  const choices = optionIndex === 0
    ? [
        { ally: allyA, contract: contractA },
        { ally: allyB, contract: contractB },
      ]
    : optionIndex === 1
      ? [
          { ally: allyA, contract: contractB },
          { ally: allyB, contract: contractA },
        ]
      : undefined;

  if (
    !commander ||
    commander.team !== "shaddam" ||
    commander.role !== "Commander" ||
    commander.resources.solari < 2 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDemandResultsCommanderCard(card)) ||
    !allyA ||
    allyA.team !== commander.team ||
    allyA.role !== "Ally" ||
    !allyB ||
    allyB.team !== commander.team ||
    allyB.role !== "Ally" ||
    allyA.id === allyB.id ||
    !contractA ||
    !contractB ||
    contractA.id === contractB.id ||
    !choices
  ) {
    return state;
  }

  const assigned = choices as Array<{ ally: Player; contract: ContractCard }>;
  const assignedText = assigned
    .map(({ ally, contract }) => `${ally.leader} takes ${contract.name}`)
    .join("; ");
  const replacementIds = new Set(pending.contractIds);
  const contractDeck = [...state.contractDeck];
  const contractOffer = state.contractOffer.flatMap((contract) => {
    if (!replacementIds.has(contract.id)) return [contract];
    const replacement = contractDeck.shift();
    return replacement ? [replacement] : [];
  });
  const players = state.players.map((player) => {
    if (player.id === commander.id) {
      return {
        ...player,
        resources: { ...player.resources, solari: player.resources.solari - 2 },
        playArea: player.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    const assignment = assigned.find(({ ally }) => ally.id === player.id);
    if (assignment) {
      return {
        ...player,
        contracts: [
          ...player.contracts,
          {
            card: assignment.contract,
            completed: false,
            takenRound: state.round,
          },
        ],
      };
    }
    return player;
  });

  return {
    ...state,
    players,
    contractOffer,
    contractDeck,
    ...advancePendingAction(state),
    log: [`${commander.leader} spends 2 Solari for ${pending.source}; ${assignedText}.`, ...state.log],
  };
}

export function skipDemandResults(state: GameState, pending: DemandResultsPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Shaddam"} declines to pay 2 Solari for ${pending.source}.`, ...state.log],
  };
}

export function resolveCorrinoMightChoice(
  state: GameState,
  pending: CorrinoMightPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const allyA = state.players.find((player) => player.id === pending.allyIds[0]);
  const allyB = state.players.find((player) => player.id === pending.allyIds[1]);
  if (
    !commander ||
    commander.team !== "shaddam" ||
    commander.role !== "Commander" ||
    commander.resources.spice < pending.cost ||
    pending.cost !== corrinoMightCost ||
    !commander.playArea.some((card) => card.id === pending.cardId && isCorrinoMightCommanderCard(card)) ||
    !allyA ||
    allyA.team !== commander.team ||
    allyA.role !== "Ally" ||
    !allyB ||
    allyB.team !== commander.team ||
    allyB.role !== "Ally" ||
    allyA.id === allyB.id
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...player,
        resources: { ...player.resources, spice: player.resources.spice - pending.cost },
        playArea: player.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === allyA.id || player.id === allyB.id) {
      next = { ...next, garrison: next.garrison + 2 };
    }
    return next;
  });

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 3 spice for ${pending.source}; ${allyA.leader} and ${allyB.leader} each gain 2 troops.`,
      ...state.log,
    ],
  };
}

export function skipCorrinoMight(state: GameState, pending: CorrinoMightPendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Shaddam"} declines to pay 3 spice for ${pending.source}.`, ...state.log],
  };
}

export function resolveDemandAttentionChoice(
  state: GameState,
  pending: DemandAttentionPendingAction,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const recipient = state.players.find((player) => player.id === pending.recipientId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    commander.resources.solari < 4 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDemandAttentionCommanderCard(card)) ||
    !recipient ||
    recipient.team !== commander.team ||
    (recipient.id !== commander.id && recipient.role !== "Ally")
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...next,
        resources: { ...next.resources, solari: next.resources.solari - 4 },
        playArea: next.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === recipient.id) {
      next = adjustInfluence(next, pending.faction, 1);
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 4 Solari for ${pending.source}; ${recipient.leader} gains 1 more ${factionLabels[pending.faction]} Influence.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

export function skipDemandAttention(state: GameState, pending: DemandAttentionPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} declines to pay 4 Solari for ${pending.source}.`, ...state.log],
  };
}

export function resolveDesertCallChoice(
  state: GameState,
  pending: DesertCallPendingAction,
): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  const ally = state.players.find((player) => player.id === pending.allyId);
  if (
    !commander ||
    commander.team !== "muaddib" ||
    commander.role !== "Commander" ||
    commander.resources.water < 1 ||
    !commander.playArea.some((card) => card.id === pending.cardId && isDesertCallCommanderCard(card)) ||
    !ally ||
    ally.team !== commander.team ||
    ally.role !== "Ally" ||
    conflictDeploymentBlockedFor(state, commander.id, ally.id) ||
    !canSummonSandworms(state, ally, 1)
  ) {
    return state;
  }

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === commander.id) {
      next = {
        ...next,
        resources: { ...next.resources, water: next.resources.water - 1 },
        playArea: next.playArea.filter((card) => card.id !== pending.cardId),
      };
    }
    if (player.id === ally.id) {
      next = {
        ...next,
        conflict: next.conflict + 3,
        deployedSandworms: next.deployedSandworms + 1,
      };
    }
    return next;
  });

  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${commander.leader} spends 1 water for ${pending.source}; ${ally.leader} summons 1 sandworm.`,
      ...state.log,
    ],
  };
  return recordTurnUnitDeployment(nextState, commander.id, 1);
}

export function skipDesertCall(state: GameState, pending: DesertCallPendingAction): GameState {
  const commander = state.players.find((player) => player.id === pending.commanderId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${commander?.leader ?? "Muad'Dib"} declines to pay 1 water for ${pending.source}.`, ...state.log],
  };
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
