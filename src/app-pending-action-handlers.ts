import type { Dispatch, SetStateAction } from "react";
import { legalActivatedAllyIdFor } from "./app-turn-actions";
import {
  acquireCardForPending,
  adjustTeamResourcePaymentContribution,
  collectChoamContractFallback,
  deployControlDefenseTroop,
  deployTroopToConflict,
  finishPendingAction,
  gainConflictInfluenceForPending,
  loseInfluenceForPending,
  maybeStartCombatPhase,
  moveImperiumCardToThroneRow,
  payConflictVpConversion,
  placeSpyForPending,
  recallSpyForConflictVpConversion,
  recallSpyForPending,
  recallSpyForSupplyForPending,
  reinforceTroop,
  resolveCommanderResourceSplitChoice,
  resolveConflictTie,
  resolveDiscardCardsForRewardChoice,
  resolveDiscardCardForDrawChoice,
  resolveDiscardHandCardChoice,
  resolveDiscardCardForInfluenceAndDrawChoice,
  resolveBoardInfluenceChoice,
  resolveBoardAgentRecallChoice,
  resolveFeydTrainingChoice,
  resolveLeaderTransitionChoice,
  resolveLadyAmberDesertScoutsChoice,
  resolveLoseInfluenceForInfluenceChoice,
  resolveLoseInfluenceForIntriguesChoice,
  resolveMakerChoice,
  resolveOptionalSpacePayment,
  resolvePayResourceForHighCouncilSeatChoice,
  resolvePaidRewardChoice,
  resolvePendingActionChoice,
  resolvePayResourceForContractsChoice,
  resolvePayResourceForDrawCardsChoice,
  resolvePayResourceForInfluenceChoice,
  resolvePayResourceForSandwormsChoice,
  resolvePayResourceForStrengthChoice,
  resolvePayResourceForTroopsChoice,
  resolveRepeatBoardSpaceChoice,
  resolveDeployOrRetreatTroopsChoice,
  resolveRetreatTroopsForStrength,
  resolveSietchTabrChoice,
  resolveStabanUnseenNetworkChoice,
  resolveTeamResourcePaymentChoice,
  resolveTopDeckSelectionChoice,
  resolveTrashIntrigueForRewardChoice,
  resolveTrashSourceForTradeChoice,
  scoreGurneyAlwaysSmiling,
  skipConflictVpConversion,
  skipControlDefenseTroop,
  skipDiscardCardsForReward,
  skipDiscardCardForDraw,
  skipDiscardCardForInfluenceAndDraw,
  skipLoseInfluence,
  skipLoseInfluenceForInfluence,
  skipLoseInfluenceForIntrigues,
  skipOptionalSpacePayment,
  skipPayResourceForHighCouncilSeat,
  skipPaidRewardChoice,
  skipPendingActionChoice,
  skipPayResourceForContracts,
  skipPayResourceForDrawCards,
  skipPayResourceForInfluence,
  skipPayResourceForSandworms,
  skipPayResourceForStrength,
  skipPayResourceForTroops,
  skipRecallSpy,
  skipDeployOrRetreatTroopsChoice,
  skipRetreatTroopsForStrength,
  skipTeamResourcePayment,
  skipTopDeckSelectionChoice,
  skipTrashCard,
  skipTrashIntrigueForReward,
  skipTrashSourceForTrade,
  startNextRound,
  takeChoamContract,
  trashPlayerCard,
  transferTradeGood,
  updateTradeSelection,
} from "./game/state";
import type {
  FactionId,
  GameState,
  PendingAction,
  TradeGoodId,
  TrashCardZone,
} from "./game/types";
import type {
  LadyAmberDesertScoutsChoice,
  InfluenceExchangeChoice,
  LeaderTransitionChoice,
  RepeatBoardSpaceChoice,
  StabanUnseenNetworkChoice,
  TopDeckSelectionChoice,
} from "./game/state";

type SetGame = Dispatch<SetStateAction<GameState>>;
type PendingOf<K extends PendingAction["kind"]> = Extract<PendingAction, { kind: K }>;

type PendingActionHandlerDeps = {
  commanderTargets: Record<string, string>;
  game: GameState;
  setGame: SetGame;
};

export function createPendingActionHandlers({ commanderTargets, game, setGame }: PendingActionHandlerDeps) {
  const runPending = <K extends PendingAction["kind"]>(
    kind: K,
    resolve: (current: GameState, pending: PendingOf<K>) => GameState,
  ) => {
    if (game.pendingAction?.kind !== kind) return;
    setGame((current) => {
      const pending = current.pendingAction;
      if (!pending || pending.kind !== kind) return current;
      return resolve(current, pending as PendingOf<K>);
    });
  };

  const chooseThroneRowCard = (cardId: string) =>
    runPending("throne-row", (current, pending) => maybeStartCombatPhase(moveImperiumCardToThroneRow(current, pending, cardId)));
  const clearPendingAction = () => setGame((current) => maybeStartCombatPhase(finishPendingAction(current)));
  const trashCard = (zone: TrashCardZone, cardId: string, choiceIndex?: number) =>
    runPending("trash-card", (current, pending) =>
      maybeStartCombatPhase(trashPlayerCard(current, pending, zone, cardId, choiceIndex))
    );
  const skipTrash = () =>
    runPending("trash-card", (current, pending) => maybeStartCombatPhase(skipTrashCard(current, pending)));
  const recallSpy = (spaceId: string) =>
    runPending("recall-spy", (current, pending) => maybeStartCombatPhase(recallSpyForPending(current, pending, spaceId)));
  const skipRecall = () =>
    runPending("recall-spy", (current, pending) => maybeStartCombatPhase(skipRecallSpy(current, pending)));
  const loseInfluence = (ownerId: string, faction: FactionId) =>
    runPending("lose-influence", (current, pending) => maybeStartCombatPhase(loseInfluenceForPending(current, pending, ownerId, faction)));
  const skipInfluenceLoss = () =>
    runPending("lose-influence", (current, pending) => maybeStartCombatPhase(skipLoseInfluence(current, pending)));
  const placeSpy = (spaceId: string) =>
    runPending("spy", (current, pending) => maybeStartCombatPhase(placeSpyForPending(current, pending, spaceId)));
  const recallSpyForSupply = (spaceId: string) =>
    runPending("spy", (current, pending) => recallSpyForSupplyForPending(current, pending, spaceId));

  const chooseRetreatTroopsForStrength = () =>
    runPending("retreat-troops-for-strength", (current, pending) =>
      maybeStartCombatPhase(resolveRetreatTroopsForStrength(current, pending))
    );
  const chooseDeployOrRetreatTroops = (choice: "deploy" | "retreat") =>
    runPending("deploy-or-retreat-troops", (current, pending) =>
      maybeStartCombatPhase(resolveDeployOrRetreatTroopsChoice(current, pending, choice))
    );
  const skipRetreatTroopsForStrengthChoice = () =>
    runPending("retreat-troops-for-strength", (current, pending) =>
      maybeStartCombatPhase(skipRetreatTroopsForStrength(current, pending))
    );
  const skipDeployOrRetreatTroops = () =>
    runPending("deploy-or-retreat-troops", (current, pending) =>
      maybeStartCombatPhase(skipDeployOrRetreatTroopsChoice(current, pending))
    );
  const chooseMakerReward = (choice: "spice" | "sandworms") =>
    runPending("maker-choice", (current, pending) =>
      choice === "sandworms" && !pending.canSummonSandworms
        ? current
        : maybeStartCombatPhase(resolveMakerChoice(current, pending, choice)),
    );
  const chooseSietchTabr = (choice: "hooks" | "shield-wall") =>
    runPending("sietch-tabr", (current, pending) => maybeStartCombatPhase(resolveSietchTabrChoice(current, pending, choice)));
  const chooseCommanderResourceSplit = (optionIndex: number) =>
    runPending("commander-resource-split", (current, pending) => maybeStartCombatPhase(resolveCommanderResourceSplitChoice(current, pending, optionIndex)));
  const choosePaidReward = (optionId: string) =>
    runPending("paid-reward-choice", (current, pending) => maybeStartCombatPhase(resolvePaidRewardChoice(current, pending, optionId)));
  const skipPaidReward = () =>
    runPending("paid-reward-choice", (current, pending) => maybeStartCombatPhase(skipPaidRewardChoice(current, pending)));
  const choosePendingActionChoice = (optionId: string) =>
    runPending("pending-action-choice", (current, pending) => maybeStartCombatPhase(resolvePendingActionChoice(current, pending, optionId)));
  const skipPendingActionChoiceHandler = () =>
    runPending("pending-action-choice", (current, pending) => maybeStartCombatPhase(skipPendingActionChoice(current, pending)));
  const chooseFeydTraining = (optionId: string) =>
    runPending("feyd-training", (current, pending) => maybeStartCombatPhase(resolveFeydTrainingChoice(current, pending, optionId)));
  const chooseStabanUnseenNetwork = (choice: StabanUnseenNetworkChoice) =>
    runPending("staban-unseen-network", (current, pending) => maybeStartCombatPhase(resolveStabanUnseenNetworkChoice(current, pending, choice)));
  const chooseLadyAmberDesertScouts = (choice: LadyAmberDesertScoutsChoice) =>
    runPending("amber-desert-scouts", (current, pending) => maybeStartCombatPhase(resolveLadyAmberDesertScoutsChoice(current, pending, choice)));
  const chooseRepeatBoardSpace = (choice: RepeatBoardSpaceChoice) =>
    runPending("repeat-board-space", (current, pending) => maybeStartCombatPhase(resolveRepeatBoardSpaceChoice(current, pending, choice)));
  const chooseLeaderTransition = (choice: LeaderTransitionChoice) =>
    runPending("leader-transition", (current, pending) => maybeStartCombatPhase(resolveLeaderTransitionChoice(current, pending, choice)));
  const chooseTrashSourceForTrade = (partnerId: string) =>
    runPending("trash-source-for-trade", (current, pending) => resolveTrashSourceForTradeChoice(current, pending, partnerId));
  const skipTrashSourceForTradeChoice = () =>
    runPending("trash-source-for-trade", (current, pending) => maybeStartCombatPhase(skipTrashSourceForTrade(current, pending)));
  const choosePayResourceForContracts = (optionIndex: number) =>
    runPending("pay-resource-for-contracts", (current, pending) =>
      maybeStartCombatPhase(resolvePayResourceForContractsChoice(current, pending, optionIndex))
    );
  const skipPayResourceForContractsChoice = () =>
    runPending("pay-resource-for-contracts", (current, pending) => maybeStartCombatPhase(skipPayResourceForContracts(current, pending)));
  const choosePayResourceForStrength = () =>
    runPending("pay-resource-for-strength", (current, pending) => maybeStartCombatPhase(resolvePayResourceForStrengthChoice(current, pending)));
  const skipPayResourceForStrengthChoice = () =>
    runPending("pay-resource-for-strength", (current, pending) => maybeStartCombatPhase(skipPayResourceForStrength(current, pending)));
  const choosePayResourceForHighCouncilSeat = () =>
    runPending("pay-resource-for-high-council-seat", (current, pending) =>
      maybeStartCombatPhase(resolvePayResourceForHighCouncilSeatChoice(current, pending))
    );
  const skipPayResourceForHighCouncilSeatChoice = () =>
    runPending("pay-resource-for-high-council-seat", (current, pending) =>
      maybeStartCombatPhase(skipPayResourceForHighCouncilSeat(current, pending))
    );
  const choosePayResourceForTroops = () =>
    runPending("pay-resource-for-troops", (current, pending) => maybeStartCombatPhase(resolvePayResourceForTroopsChoice(current, pending)));
  const skipPayResourceForTroopsChoice = () =>
    runPending("pay-resource-for-troops", (current, pending) => maybeStartCombatPhase(skipPayResourceForTroops(current, pending)));
  const choosePayResourceForDrawCards = () =>
    runPending("pay-resource-for-draw-cards", (current, pending) =>
      maybeStartCombatPhase(resolvePayResourceForDrawCardsChoice(current, pending))
    );
  const skipPayResourceForDrawCardsChoice = () =>
    runPending("pay-resource-for-draw-cards", (current, pending) =>
      maybeStartCombatPhase(skipPayResourceForDrawCards(current, pending))
    );
  const choosePayResourceForInfluence = () =>
    runPending("pay-resource-for-influence", (current, pending) => maybeStartCombatPhase(resolvePayResourceForInfluenceChoice(current, pending)));
  const skipPayResourceForInfluenceChoice = () =>
    runPending("pay-resource-for-influence", (current, pending) => maybeStartCombatPhase(skipPayResourceForInfluence(current, pending)));
  const choosePayResourceForSandworms = () =>
    runPending("pay-resource-for-sandworms", (current, pending) => maybeStartCombatPhase(resolvePayResourceForSandwormsChoice(current, pending)));
  const skipPayResourceForSandwormsChoice = () =>
    runPending("pay-resource-for-sandworms", (current, pending) => maybeStartCombatPhase(skipPayResourceForSandworms(current, pending)));
  const adjustTeamResourcePayment = (contributorId: string, delta: number) =>
    runPending("team-resource-payment", (current, pending) => adjustTeamResourcePaymentContribution(current, pending, contributorId, delta));
  const chooseTeamResourcePayment = () =>
    runPending("team-resource-payment", (current, pending) => maybeStartCombatPhase(resolveTeamResourcePaymentChoice(current, pending)));
  const skipTeamResourcePaymentChoice = () =>
    runPending("team-resource-payment", (current, pending) => maybeStartCombatPhase(skipTeamResourcePayment(current, pending)));
  const deployOne = () =>
    runPending("deploy", (current, pending) => {
      const deployed = deployTroopToConflict(current, pending);
      return maybeStartCombatPhase(scoreGurneyAlwaysSmiling(deployed, current.players[current.activeSeat].id));
    });
  const deployControlDefense = () =>
    runPending("control-defense", (current, pending) => deployControlDefenseTroop(current, pending));
  const skipControlDefense = () =>
    runPending("control-defense", (current, pending) => skipControlDefenseTroop(current, pending));
  const reinforceOne = (playerId: string, destination: "garrison" | "conflict") =>
    runPending("reinforce", (current, pending) => maybeStartCombatPhase(reinforceTroop(current, pending, playerId, destination)));
  const updateTrade = (resource: TradeGoodId, partnerId?: string) =>
    runPending("trade", (current, pending) => updateTradeSelection(current, pending, resource, partnerId));
  const transferTrade = (fromId: string, toId: string, intrigueId?: string) =>
    runPending("trade", (current, pending) => transferTradeGood(current, pending, fromId, toId, intrigueId));
  const takeContract = (contractId: string) =>
    runPending("contract", (current, pending) => maybeStartCombatPhase(takeChoamContract(current, pending, contractId)));
  const acquirePendingCard = (cardId: string) =>
    runPending("acquire-card", (current, pending) => {
      const owner = current.players.find((player) => player.id === pending.ownerId);
      const recruitOwnerId = owner?.role === "Commander" ? legalActivatedAllyIdFor(owner, current.players, commanderTargets) : undefined;
      return maybeStartCombatPhase(acquireCardForPending(current, pending, cardId, recruitOwnerId));
    });
  const chooseDiscardCardForInfluenceAndDraw = (discardCardId: string, faction: FactionId) =>
    runPending("discard-card-for-influence-and-draw", (current, pending) =>
      maybeStartCombatPhase(resolveDiscardCardForInfluenceAndDrawChoice(current, pending, discardCardId, faction))
    );
  const skipDiscardCardForInfluenceAndDrawChoice = () =>
    runPending("discard-card-for-influence-and-draw", (current, pending) =>
      maybeStartCombatPhase(skipDiscardCardForInfluenceAndDraw(current, pending))
    );
  const chooseDiscardCardForDraw = (discardCardId: string) =>
    runPending("discard-card-for-draw", (current, pending) =>
      maybeStartCombatPhase(resolveDiscardCardForDrawChoice(current, pending, discardCardId))
    );
  const skipDiscardCardForDrawChoice = () =>
    runPending("discard-card-for-draw", (current, pending) =>
      maybeStartCombatPhase(skipDiscardCardForDraw(current, pending))
    );
  const chooseDiscardCardsForReward = (discardCardId: string) =>
    runPending("discard-cards-for-reward", (current, pending) =>
      maybeStartCombatPhase(resolveDiscardCardsForRewardChoice(current, pending, discardCardId))
    );
  const skipDiscardCardsForRewardChoice = () =>
    runPending("discard-cards-for-reward", (current, pending) =>
      maybeStartCombatPhase(skipDiscardCardsForReward(current, pending))
    );
  const chooseTopDeckSelection = (choice: TopDeckSelectionChoice) =>
    runPending("top-deck-selection", (current, pending) =>
      maybeStartCombatPhase(resolveTopDeckSelectionChoice(current, pending, choice))
    );
  const skipTopDeckSelection = () =>
    runPending("top-deck-selection", (current, pending) =>
      maybeStartCombatPhase(skipTopDeckSelectionChoice(current, pending))
    );
  const chooseTrashIntrigueForReward = (intrigueId: string) =>
    runPending("trash-intrigue-for-reward", (current, pending) =>
      maybeStartCombatPhase(resolveTrashIntrigueForRewardChoice(current, pending, intrigueId))
    );
  const skipTrashIntrigueForRewardChoice = () =>
    runPending("trash-intrigue-for-reward", (current, pending) =>
      maybeStartCombatPhase(skipTrashIntrigueForReward(current, pending))
    );
  const chooseDiscardHandCard = (discardCardId: string) =>
    runPending("discard-hand-card", (current, pending) =>
      maybeStartCombatPhase(resolveDiscardHandCardChoice(current, pending, discardCardId))
    );
  const chooseLoseInfluenceForIntrigues = (faction: FactionId) =>
    runPending("lose-influence-for-intrigues", (current, pending) =>
      maybeStartCombatPhase(resolveLoseInfluenceForIntriguesChoice(current, pending, faction))
    );
  const skipLoseInfluenceForIntriguesChoice = () =>
    runPending("lose-influence-for-intrigues", (current, pending) => maybeStartCombatPhase(skipLoseInfluenceForIntrigues(current, pending)));
  const chooseLoseInfluenceForInfluence = (choice: InfluenceExchangeChoice) =>
    runPending("lose-influence-for-influence", (current, pending) =>
      maybeStartCombatPhase(resolveLoseInfluenceForInfluenceChoice(current, pending, choice))
    );
  const skipLoseInfluenceForInfluenceChoice = () =>
    runPending("lose-influence-for-influence", (current, pending) =>
      maybeStartCombatPhase(skipLoseInfluenceForInfluence(current, pending))
    );
  const collectContractFallback = () =>
    runPending("contract", (current, pending) => maybeStartCombatPhase(collectChoamContractFallback(current, pending)));
  const chooseConflictTieWinner = (winnerId?: string) =>
    runPending("conflict-tie", (current, pending) => startNextRound(resolveConflictTie(current, pending, winnerId)));
  const payConflictVpReward = () =>
    runPending("conflict-vp-conversion", (current, pending) => startNextRound(payConflictVpConversion(current, pending)));
  const recallConflictRewardSpy = (spaceId: string) =>
    runPending("conflict-vp-conversion", (current, pending) => startNextRound(recallSpyForConflictVpConversion(current, pending, spaceId)));
  const skipConflictVpReward = () =>
    runPending("conflict-vp-conversion", (current, pending) => startNextRound(skipConflictVpConversion(current, pending)));
  const chooseConflictInfluence = (faction: FactionId) =>
    runPending("conflict-influence", (current, pending) => startNextRound(gainConflictInfluenceForPending(current, pending, faction)));
  const chooseBoardInfluence = (ownerId: string, faction: FactionId, trashCardId?: string) =>
    runPending("board-influence-choice", (current, pending) => maybeStartCombatPhase(resolveBoardInfluenceChoice(current, pending, ownerId, faction, trashCardId)));
  const chooseBoardAgentRecall = (spaceId: string) =>
    runPending("recall-agent-from-board", (current, pending) =>
      maybeStartCombatPhase(resolveBoardAgentRecallChoice(current, pending, spaceId))
    );
  const payOptionalSpacePayment = () =>
    runPending("optional-space-payment", (current, pending) => maybeStartCombatPhase(resolveOptionalSpacePayment(current, pending)));
  const skipOptionalSpacePaymentChoice = () =>
    runPending("optional-space-payment", (current, pending) => maybeStartCombatPhase(skipOptionalSpacePayment(current, pending)));

  return {
    acquirePendingCard,
    adjustTeamResourcePayment,
    chooseCommanderResourceSplit,
    chooseConflictInfluence,
    chooseBoardInfluence,
    chooseBoardAgentRecall,
    chooseConflictTieWinner,
    chooseDiscardCardsForReward,
    chooseDiscardCardForDraw,
    chooseDiscardHandCard,
    chooseDiscardCardForInfluenceAndDraw,
    chooseDeployOrRetreatTroops,
    chooseFeydTraining,
    chooseLadyAmberDesertScouts,
    chooseLeaderTransition,
    chooseLoseInfluenceForIntrigues,
    chooseLoseInfluenceForInfluence,
    chooseMakerReward,
    choosePayResourceForContracts,
    choosePayResourceForDrawCards,
    choosePayResourceForHighCouncilSeat,
    choosePayResourceForInfluence,
    choosePayResourceForSandworms,
    choosePayResourceForStrength,
    choosePayResourceForTroops,
    choosePaidReward,
    choosePendingActionChoice,
    chooseRetreatTroopsForStrength,
    chooseRepeatBoardSpace,
    chooseSietchTabr,
    chooseStabanUnseenNetwork,
    chooseTeamResourcePayment,
    chooseTrashIntrigueForReward,
    chooseTrashSourceForTrade,
    chooseThroneRowCard,
    chooseTopDeckSelection,
    clearPendingAction,
    collectContractFallback,
    deployControlDefense,
    deployOne,
    loseInfluence,
    payConflictVpReward,
    payOptionalSpacePayment,
    placeSpy,
    recallConflictRewardSpy,
    recallSpy,
    recallSpyForSupply,
    reinforceOne,
    skipControlDefense,
    skipDeployOrRetreatTroops,
    skipConflictVpReward,
    skipDiscardCardsForRewardChoice,
    skipDiscardCardForDrawChoice,
    skipDiscardCardForInfluenceAndDrawChoice,
    skipInfluenceLoss,
    skipLoseInfluenceForIntriguesChoice,
    skipLoseInfluenceForInfluenceChoice,
    skipOptionalSpacePaymentChoice,
    skipPaidReward,
    skipPendingActionChoiceHandler,
    skipPayResourceForContractsChoice,
    skipPayResourceForDrawCardsChoice,
    skipPayResourceForHighCouncilSeatChoice,
    skipPayResourceForInfluenceChoice,
    skipPayResourceForSandwormsChoice,
    skipPayResourceForStrengthChoice,
    skipPayResourceForTroopsChoice,
    skipRecall,
    skipRetreatTroopsForStrengthChoice,
    skipTeamResourcePaymentChoice,
    skipTopDeckSelection,
    skipTrash,
    skipTrashIntrigueForRewardChoice,
    skipTrashSourceForTradeChoice,
    takeContract,
    transferTrade,
    trashCard,
    updateTrade,
  };
}
