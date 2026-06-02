import type { Dispatch, SetStateAction } from "react";
import { activatedAllyIdFor } from "./app-turn-actions";
import {
  acquireCardForPending,
  adjustTeamResourcePaymentContribution,
  collectChoamContractFallback,
  deployControlDefenseTroop,
  deployTroopToConflict,
  finishPendingAction,
  finishRevealAdjustment as resolveRevealAdjustment,
  gainConflictInfluenceForPending,
  loseInfluenceForPending,
  maybeStartCombatPhase,
  moveImperiumCardToThroneRow,
  payConflictVpConversion,
  placeSpyForPending,
  playerHasConflictUnits,
  recallSpyForConflictVpConversion,
  recallSpyForPending,
  recallSpyForSupplyForPending,
  reinforceTroop,
  resolveCommanderResourceSplitChoice,
  resolveConflictTie,
  resolveDiscardCardForDrawChoice,
  resolveDiscardHandCardChoice,
  resolveDiscardCardForInfluenceAndDrawChoice,
  resolveIrulanSignetRingChoice,
  resolveBoardInfluenceChoice,
  resolveJessicaOtherMemoriesChoice,
  resolveJessicaReverendMotherChoice,
  resolveJessicaSpiceAgonyChoice,
  resolveJessicaWaterOfLifeChoice,
  resolveLadyAmberDesertScoutsChoice,
  resolveLoseInfluenceForIntriguesChoice,
  resolveMakerChoice,
  resolveOptionalSpacePayment,
  resolvePayResourceForContractsChoice,
  resolvePayResourceForDrawCardsChoice,
  resolvePayResourceForInfluenceChoice,
  resolvePayResourceForSandwormsChoice,
  resolvePayResourceForStrengthChoice,
  resolvePayResourceForTroopsChoice,
  resolveRetreatTroopsForStrength,
  resolveShaddamSignetRingChoice,
  resolveSietchTabrChoice,
  resolveStabanUnseenNetworkChoice,
  resolveTeamResourcePaymentChoice,
  resolveTrashSourceForTradeChoice,
  scoreGurneyAlwaysSmiling,
  skipConflictVpConversion,
  skipControlDefenseTroop,
  skipDiscardCardForDraw,
  skipDiscardCardForInfluenceAndDraw,
  skipLoseInfluence,
  skipLoseInfluenceForIntrigues,
  skipOptionalSpacePayment,
  skipPayResourceForContracts,
  skipPayResourceForDrawCards,
  skipPayResourceForInfluence,
  skipPayResourceForSandworms,
  skipPayResourceForStrength,
  skipPayResourceForTroops,
  skipRecallSpy,
  skipRetreatTroopsForStrength,
  skipTeamResourcePayment,
  skipTrashCard,
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
  IrulanSignetRingChoice,
  JessicaOtherMemoriesChoice,
  JessicaReverendMotherChoice,
  JessicaSpiceAgonyChoice,
  JessicaWaterOfLifeChoice,
  LadyAmberDesertScoutsChoice,
  ShaddamSignetRingChoice,
  StabanUnseenNetworkChoice,
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
  const trashCard = (zone: TrashCardZone, cardId: string) =>
    runPending("trash-card", (current, pending) => maybeStartCombatPhase(trashPlayerCard(current, pending, zone, cardId)));
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

  const adjustRevealReward = (persuasionDelta: number, strengthDelta: number) =>
    runPending("reveal-adjust", (current, pending) => {
      const owner = current.players.find((player) => player.id === pending.ownerId);
      const recipient = current.players.find((player) => player.id === pending.combatRecipientId);
      const appliedPersuasion = owner && pending.allowPersuasionAdjustment !== false
        ? Math.max(-pending.persuasionAdjustment, persuasionDelta)
        : 0;
      const appliedStrength = recipient && pending.allowStrengthAdjustment !== false
        ? Math.max(-pending.strengthAdjustment, playerHasConflictUnits(recipient) ? strengthDelta : Math.min(0, strengthDelta))
        : 0;
      if (appliedPersuasion === 0 && appliedStrength === 0) return current;
      const players = current.players.map((player) => {
        let next = player;
        if (player.id === pending.ownerId) next = { ...next, persuasion: next.persuasion + appliedPersuasion };
        if (player.id === pending.combatRecipientId) next = { ...next, conflict: next.conflict + appliedStrength };
        return next;
      });
      return {
        ...current,
        players,
        pendingAction: {
          ...pending,
          persuasionAdjustment: pending.persuasionAdjustment + appliedPersuasion,
          strengthAdjustment: pending.strengthAdjustment + appliedStrength,
        },
      };
    });

  const finishRevealAdjust = () =>
    runPending("reveal-adjust", (current, pending) => resolveRevealAdjustment(current, pending));
  const chooseRetreatTroopsForStrength = () =>
    runPending("retreat-troops-for-strength", (current, pending) =>
      maybeStartCombatPhase(resolveRetreatTroopsForStrength(current, pending))
    );
  const skipRetreatTroopsForStrengthChoice = () =>
    runPending("retreat-troops-for-strength", (current, pending) =>
      maybeStartCombatPhase(skipRetreatTroopsForStrength(current, pending))
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
  const chooseShaddamSignet = (choice: ShaddamSignetRingChoice) =>
    runPending("shaddam-signet-ring", (current, pending) => maybeStartCombatPhase(resolveShaddamSignetRingChoice(current, pending, choice)));
  const chooseIrulanSignet = (choice: IrulanSignetRingChoice) =>
    runPending("irulan-signet-ring", (current, pending) => maybeStartCombatPhase(resolveIrulanSignetRingChoice(current, pending, choice)));
  const chooseStabanUnseenNetwork = (choice: StabanUnseenNetworkChoice) =>
    runPending("staban-unseen-network", (current, pending) => maybeStartCombatPhase(resolveStabanUnseenNetworkChoice(current, pending, choice)));
  const chooseLadyAmberDesertScouts = (choice: LadyAmberDesertScoutsChoice) =>
    runPending("amber-desert-scouts", (current, pending) => maybeStartCombatPhase(resolveLadyAmberDesertScoutsChoice(current, pending, choice)));
  const chooseJessicaSpiceAgony = (choice: JessicaSpiceAgonyChoice) =>
    runPending("jessica-spice-agony", (current, pending) => maybeStartCombatPhase(resolveJessicaSpiceAgonyChoice(current, pending, choice)));
  const chooseJessicaWaterOfLife = (choice: JessicaWaterOfLifeChoice) =>
    runPending("jessica-water-of-life", (current, pending) => maybeStartCombatPhase(resolveJessicaWaterOfLifeChoice(current, pending, choice)));
  const chooseJessicaReverendMother = (choice: JessicaReverendMotherChoice) =>
    runPending("jessica-reverend-mother", (current, pending) => maybeStartCombatPhase(resolveJessicaReverendMotherChoice(current, pending, choice)));
  const chooseJessicaOtherMemories = (choice: JessicaOtherMemoriesChoice) =>
    runPending("jessica-other-memories", (current, pending) => maybeStartCombatPhase(resolveJessicaOtherMemoriesChoice(current, pending, choice)));
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
      const recruitOwnerId = owner?.role === "Commander" ? activatedAllyIdFor(owner, current.players, commanderTargets) : undefined;
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
  const chooseBoardInfluence = (ownerId: string, faction: FactionId) =>
    runPending("board-influence-choice", (current, pending) => maybeStartCombatPhase(resolveBoardInfluenceChoice(current, pending, ownerId, faction)));
  const payOptionalSpacePayment = () =>
    runPending("optional-space-payment", (current, pending) => maybeStartCombatPhase(resolveOptionalSpacePayment(current, pending)));
  const skipOptionalSpacePaymentChoice = () =>
    runPending("optional-space-payment", (current, pending) => maybeStartCombatPhase(skipOptionalSpacePayment(current, pending)));

  return {
    acquirePendingCard,
    adjustRevealReward,
    adjustTeamResourcePayment,
    chooseCommanderResourceSplit,
    chooseConflictInfluence,
    chooseBoardInfluence,
    chooseConflictTieWinner,
    chooseDiscardCardForDraw,
    chooseDiscardHandCard,
    chooseDiscardCardForInfluenceAndDraw,
    chooseIrulanSignet,
    chooseJessicaOtherMemories,
    chooseJessicaReverendMother,
    chooseJessicaSpiceAgony,
    chooseJessicaWaterOfLife,
    chooseLadyAmberDesertScouts,
    chooseLoseInfluenceForIntrigues,
    chooseMakerReward,
    choosePayResourceForContracts,
    choosePayResourceForDrawCards,
    choosePayResourceForInfluence,
    choosePayResourceForSandworms,
    choosePayResourceForStrength,
    choosePayResourceForTroops,
    chooseRetreatTroopsForStrength,
    chooseShaddamSignet,
    chooseSietchTabr,
    chooseStabanUnseenNetwork,
    chooseTeamResourcePayment,
    chooseTrashSourceForTrade,
    chooseThroneRowCard,
    clearPendingAction,
    collectContractFallback,
    deployControlDefense,
    deployOne,
    finishRevealAdjust,
    loseInfluence,
    payConflictVpReward,
    payOptionalSpacePayment,
    placeSpy,
    recallConflictRewardSpy,
    recallSpy,
    recallSpyForSupply,
    reinforceOne,
    skipControlDefense,
    skipConflictVpReward,
    skipDiscardCardForDrawChoice,
    skipDiscardCardForInfluenceAndDrawChoice,
    skipInfluenceLoss,
    skipLoseInfluenceForIntriguesChoice,
    skipOptionalSpacePaymentChoice,
    skipPayResourceForContractsChoice,
    skipPayResourceForDrawCardsChoice,
    skipPayResourceForInfluenceChoice,
    skipPayResourceForSandwormsChoice,
    skipPayResourceForStrengthChoice,
    skipPayResourceForTroopsChoice,
    skipRecall,
    skipRetreatTroopsForStrengthChoice,
    skipTeamResourcePaymentChoice,
    skipTrash,
    skipTrashSourceForTradeChoice,
    takeContract,
    transferTrade,
    trashCard,
    updateTrade,
  };
}
