import type { Dispatch, SetStateAction } from "react";
import { activatedAllyIdFor } from "./app-turn-actions";
import {
  acquireCardForPending,
  adjustThreatenSpiceProductionContribution,
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
  resolveCommandRespectTrade,
  resolveConflictTie,
  resolveCorrinoMightChoice,
  resolveDemandAttentionChoice,
  resolveDemandResultsChoice,
  resolveDevastatingAssaultChoice,
  resolveDesertCallChoice,
  resolveIrulanSignetRingChoice,
  resolveJessicaOtherMemoriesChoice,
  resolveJessicaReverendMotherChoice,
  resolveJessicaSpiceAgonyChoice,
  resolveJessicaWaterOfLifeChoice,
  resolveLadyAmberDesertScoutsChoice,
  resolveMakerChoice,
  resolveShaddamSignetRingChoice,
  resolveSietchTabrChoice,
  resolveStabanUnseenNetworkChoice,
  resolveThreatenSpiceProductionChoice,
  scoreGurneyAlwaysSmiling,
  skipCommandRespect,
  skipConflictVpConversion,
  skipControlDefenseTroop,
  skipCorrinoMight,
  skipDemandAttention,
  skipDemandResults,
  skipDevastatingAssault,
  skipDesertCall,
  skipLoseInfluence,
  skipRecallSpy,
  skipThreatenSpiceProduction,
  skipTrashCard,
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
      const appliedPersuasion = owner ? Math.max(-pending.persuasionAdjustment, persuasionDelta) : 0;
      const appliedStrength = recipient
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
  const chooseCommandRespectTrade = (partnerId: string) =>
    runPending("command-respect", (current, pending) => resolveCommandRespectTrade(current, pending, partnerId));
  const skipCommandRespectChoice = () =>
    runPending("command-respect", (current, pending) => maybeStartCombatPhase(skipCommandRespect(current, pending)));
  const chooseDemandResults = (optionIndex: number) =>
    runPending("demand-results", (current, pending) => maybeStartCombatPhase(resolveDemandResultsChoice(current, pending, optionIndex)));
  const skipDemandResultsChoice = () =>
    runPending("demand-results", (current, pending) => maybeStartCombatPhase(skipDemandResults(current, pending)));
  const chooseCorrinoMight = () =>
    runPending("corrino-might", (current, pending) => maybeStartCombatPhase(resolveCorrinoMightChoice(current, pending)));
  const skipCorrinoMightChoice = () =>
    runPending("corrino-might", (current, pending) => maybeStartCombatPhase(skipCorrinoMight(current, pending)));
  const chooseDevastatingAssault = () =>
    runPending("devastating-assault", (current, pending) => maybeStartCombatPhase(resolveDevastatingAssaultChoice(current, pending)));
  const skipDevastatingAssaultChoice = () =>
    runPending("devastating-assault", (current, pending) => maybeStartCombatPhase(skipDevastatingAssault(current, pending)));
  const chooseDemandAttention = () =>
    runPending("demand-attention", (current, pending) => maybeStartCombatPhase(resolveDemandAttentionChoice(current, pending)));
  const skipDemandAttentionChoice = () =>
    runPending("demand-attention", (current, pending) => maybeStartCombatPhase(skipDemandAttention(current, pending)));
  const chooseDesertCall = () =>
    runPending("desert-call", (current, pending) => maybeStartCombatPhase(resolveDesertCallChoice(current, pending)));
  const skipDesertCallChoice = () =>
    runPending("desert-call", (current, pending) => maybeStartCombatPhase(skipDesertCall(current, pending)));
  const adjustThreatenSpiceProduction = (contributorId: string, delta: number) =>
    runPending("threaten-spice-production", (current, pending) => adjustThreatenSpiceProductionContribution(current, pending, contributorId, delta));
  const chooseThreatenSpiceProduction = () =>
    runPending("threaten-spice-production", (current, pending) => maybeStartCombatPhase(resolveThreatenSpiceProductionChoice(current, pending)));
  const skipThreatenSpiceProductionChoice = () =>
    runPending("threaten-spice-production", (current, pending) => maybeStartCombatPhase(skipThreatenSpiceProduction(current, pending)));
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

  return {
    acquirePendingCard,
    adjustRevealReward,
    adjustThreatenSpiceProduction,
    chooseCommandRespectTrade,
    chooseCommanderResourceSplit,
    chooseConflictInfluence,
    chooseConflictTieWinner,
    chooseCorrinoMight,
    chooseDevastatingAssault,
    chooseDemandAttention,
    chooseDemandResults,
    chooseDesertCall,
    chooseIrulanSignet,
    chooseJessicaOtherMemories,
    chooseJessicaReverendMother,
    chooseJessicaSpiceAgony,
    chooseJessicaWaterOfLife,
    chooseLadyAmberDesertScouts,
    chooseMakerReward,
    chooseShaddamSignet,
    chooseSietchTabr,
    chooseStabanUnseenNetwork,
    chooseThreatenSpiceProduction,
    chooseThroneRowCard,
    clearPendingAction,
    collectContractFallback,
    deployControlDefense,
    deployOne,
    finishRevealAdjust,
    loseInfluence,
    payConflictVpReward,
    placeSpy,
    recallConflictRewardSpy,
    recallSpy,
    recallSpyForSupply,
    reinforceOne,
    skipCommandRespectChoice,
    skipControlDefense,
    skipConflictVpReward,
    skipCorrinoMightChoice,
    skipDevastatingAssaultChoice,
    skipDemandAttentionChoice,
    skipDemandResultsChoice,
    skipDesertCallChoice,
    skipInfluenceLoss,
    skipRecall,
    skipThreatenSpiceProductionChoice,
    skipTrash,
    takeContract,
    transferTrade,
    trashCard,
    updateTrade,
  };
}
