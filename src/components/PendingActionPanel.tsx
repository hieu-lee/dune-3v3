import { memoryCountLabel } from "../app-helpers";
import { criticalLocationNames } from "../game/critical-locations";
import { boardSpaces, factionLabels, iconLabels, teams } from "../game/data";
import {
  acquirableCardsForPending,
  canResolveRetreatTroopsForStrength,
  canMoveCardToThroneRow,
  canPayConflictVpConversion,
  conflictVpConversionSpyChoices,
  discardHandCardChoices,
  discardCardForDrawChoices,
  discardCardForInfluenceAndDrawChoices,
  discardCardForInfluenceAndDrawDiscardChoices,
  influenceLossOptions,
  loseInfluenceForIntriguesChoices,
  placeableSpySpaces,
  playerTroopSupply,
  recallableSpySpaces,
  recallableSpySupplySpaces,
  trashIntrigueForRewardChoices,
  trashableCardsForPending,
} from "../game/state";
import type {
  LadyAmberDesertScoutsChoice,
  LeaderTransitionChoice,
  RepeatBoardSpaceChoice,
  StabanUnseenNetworkChoice,
} from "../game/state";
import type { FactionId, GameState, PendingAction, Player, TradeGoodId, TrashCardZone } from "../game/types";
import { PendingBoardInfluenceChoicePanel, PendingOptionalSpacePaymentPanel } from "./PendingBoardChoicePanels";
import { PendingAcquireCardPanel, PendingContractPanel } from "./PendingCardChoicePanels";
import {
  PendingDiscardDrawPanel,
  PendingDiscardHandCardPanel,
  PendingDiscardInfluenceDrawPanel,
  PendingInfluenceIntriguePanel,
} from "./PendingCapturedMentatPanel";
import { PendingConflictInfluencePanel } from "./PendingConflictInfluencePanel";
import { PendingConflictVpPanel } from "./PendingConflictVpPanel";
import { PendingInfluenceLossPanel } from "./PendingInfluenceLossPanel";
import { PendingActionChoicePanel } from "./PendingActionChoicePanel";
import {
  PendingLadyAmberDesertScoutsPanel,
  PendingLeaderTransitionPanel,
  PendingPayResourceForContractsPanel,
  PendingPayResourceForDrawCardsPanel,
  PendingPayResourceForInfluencePanel,
  PendingPayResourceForSandwormsPanel,
  PendingPayResourceForStrengthPanel,
  PendingPayResourceForTroopsPanel,
  PendingRepeatBoardSpacePanel,
  PendingStabanUnseenNetworkPanel,
  PendingTrashSourceForTradePanel,
} from "./PendingLeaderChoicePanels";
import { PendingMakerChoicePanel } from "./PendingMakerChoicePanel";
import { PendingPaidRewardChoicePanel } from "./PendingPaidRewardChoicePanel";
import {
  PendingControlDefensePanel,
  PendingDeployPanel,
  PendingReinforcePanel,
  PendingRetreatTroopsForStrengthPanel,
} from "./PendingMilitaryPanels";
import { PendingRecallSpyPanel } from "./PendingRecallSpyPanel";
import { PendingResourceSplitPanel } from "./PendingResourceSplitPanel";
import { PendingSietchTabrPanel } from "./PendingSietchTabrPanel";
import { PendingSpyPanel } from "./PendingSpyPanel";
import { PendingConflictTiePanel, PendingRevealAdjustPanel, PendingThroneRowPanel } from "./PendingTableChoicePanels";
import { PendingTeamResourcePaymentSection } from "./PendingTeamResourcePaymentSection";
import { PendingTradePanel } from "./PendingTradePanel";
import { PendingTrashIntriguePanel } from "./PendingTrashIntriguePanel";
import { PendingTrashPanel } from "./PendingTrashPanel";

type PendingActionPanelProps = {
  game: GameState;
  pendingAction: PendingAction;
  acquirePendingCard: (cardId: string) => void;
  adjustRevealReward: (persuasionDelta: number, strengthDelta: number) => void;
  adjustTeamResourcePayment: (contributorId: string, delta: number) => void;
  chooseCommanderResourceSplit: (optionIndex: number) => void;
  chooseConflictInfluence: (faction: FactionId) => void;
  chooseBoardInfluence: (ownerId: string, faction: FactionId) => void;
  chooseConflictTieWinner: (winnerId?: string) => void;
  chooseDiscardCardForDraw: (discardCardId: string) => void;
  chooseDiscardHandCard: (discardCardId: string) => void;
  chooseDiscardCardForInfluenceAndDraw: (discardCardId: string, faction: FactionId) => void;
  chooseLoseInfluenceForIntrigues: (faction: FactionId) => void;
  choosePendingActionChoice: (optionId: string) => void;
  chooseLeaderTransition: (choice: LeaderTransitionChoice) => void;
  chooseLadyAmberDesertScouts: (choice: LadyAmberDesertScoutsChoice) => void;
  chooseMakerReward: (choice: "spice" | "sandworms") => void;
  choosePayResourceForContracts: (optionIndex: number) => void;
  choosePayResourceForDrawCards: () => void;
  choosePayResourceForInfluence: () => void;
  choosePayResourceForSandworms: () => void;
  choosePayResourceForStrength: () => void;
  choosePayResourceForTroops: () => void;
  choosePaidReward: (optionId: string) => void;
  chooseRetreatTroopsForStrength: () => void;
  chooseRepeatBoardSpace: (choice: RepeatBoardSpaceChoice) => void;
  chooseSietchTabr: (choice: "hooks" | "shield-wall") => void;
  chooseStabanUnseenNetwork: (choice: StabanUnseenNetworkChoice) => void;
  chooseTeamResourcePayment: () => void;
  chooseThroneRowCard: (cardId: string) => void;
  chooseTrashIntrigueForReward: (intrigueId: string) => void;
  chooseTrashSourceForTrade: (partnerId: string) => void;
  clearPendingAction: () => void;
  collectContractFallback: () => void;
  deployControlDefense: () => void;
  deployOne: () => void;
  finishRevealAdjust: () => void;
  loseInfluence: (ownerId: string, faction: FactionId) => void;
  payConflictVpReward: () => void;
  payOptionalSpacePayment: () => void;
  placeSpy: (spaceId: string) => void;
  recallConflictRewardSpy: (spaceId: string) => void;
  recallSpy: (spaceId: string) => void;
  recallSpyForSupply: (spaceId: string) => void;
  reinforceOne: (playerId: string, destination: "garrison" | "conflict") => void;
  skipDiscardCardForDrawChoice: () => void;
  skipDiscardCardForInfluenceAndDrawChoice: () => void;
  skipLoseInfluenceForIntriguesChoice: () => void;
  skipControlDefense: () => void;
  skipConflictVpReward: () => void;
  skipInfluenceLoss: () => void;
  skipOptionalSpacePaymentChoice: () => void;
  skipPaidReward: () => void;
  skipPendingActionChoiceHandler: () => void;
  skipPayResourceForContractsChoice: () => void;
  skipPayResourceForDrawCardsChoice: () => void;
  skipPayResourceForInfluenceChoice: () => void;
  skipPayResourceForSandwormsChoice: () => void;
  skipPayResourceForStrengthChoice: () => void;
  skipPayResourceForTroopsChoice: () => void;
  skipRecall: () => void;
  skipRetreatTroopsForStrengthChoice: () => void;
  skipTeamResourcePaymentChoice: () => void;
  skipTrash: () => void;
  skipTrashIntrigueForRewardChoice: () => void;
  skipTrashSourceForTradeChoice: () => void;
  takeContract: (contractId: string) => void;
  transferTrade: (fromId: string, toId: string, intrigueId?: string) => void;
  trashCard: (zone: TrashCardZone, cardId: string, choiceIndex?: number) => void;
  updateTrade: (resource: TradeGoodId, partnerId?: string) => void;
};

export function PendingActionPanel({
  game,
  pendingAction,
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
  chooseLoseInfluenceForIntrigues,
  choosePendingActionChoice,
  chooseLeaderTransition,
  chooseLadyAmberDesertScouts,
  chooseMakerReward,
  choosePayResourceForContracts,
  choosePayResourceForDrawCards,
  choosePayResourceForInfluence,
  choosePayResourceForSandworms,
  choosePayResourceForStrength,
  choosePayResourceForTroops,
  choosePaidReward,
  chooseRetreatTroopsForStrength,
  chooseRepeatBoardSpace,
  chooseSietchTabr,
  chooseStabanUnseenNetwork,
  chooseTeamResourcePayment,
  chooseThroneRowCard,
  chooseTrashIntrigueForReward,
  chooseTrashSourceForTrade,
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
  skipDiscardCardForDrawChoice,
  skipDiscardCardForInfluenceAndDrawChoice,
  skipLoseInfluenceForIntriguesChoice,
  skipControlDefense,
  skipConflictVpReward,
  skipInfluenceLoss,
  skipOptionalSpacePaymentChoice,
  skipPaidReward,
  skipPendingActionChoiceHandler,
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
  skipTrashIntrigueForRewardChoice,
  skipTrashSourceForTradeChoice,
  takeContract,
  transferTrade,
  trashCard,
  updateTrade,
}: PendingActionPanelProps) {
  const pendingOwner = pendingAction.kind === "deploy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingControlDefenseOwner =
    pendingAction.kind === "control-defense" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingControlDefenseSupply = pendingControlDefenseOwner ? playerTroopSupply(pendingControlDefenseOwner) : 0;
  const pendingActor = pendingAction.kind === "trade" ? game.players.find((player) => player.id === pendingAction.actorId) : undefined;
  const pendingPartner = pendingAction.kind === "trade" ? game.players.find((player) => player.id === pendingAction.partnerId) : undefined;
  const pendingSpyOwner = pendingAction.kind === "spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingContractOwner =
    pendingAction.kind === "contract" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingAcquireOwner =
    pendingAction.kind === "acquire-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingAcquireCards = pendingAction.kind === "acquire-card" ? acquirableCardsForPending(game, pendingAction) : [];
  const pendingDiscardInfluenceDrawOwner =
    pendingAction.kind === "discard-card-for-influence-and-draw" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingDiscardInfluenceDrawDiscardChoices =
    pendingAction.kind === "discard-card-for-influence-and-draw" && pendingDiscardInfluenceDrawOwner
      ? discardCardForInfluenceAndDrawDiscardChoices(pendingDiscardInfluenceDrawOwner, pendingAction)
      : [];
  const pendingDiscardInfluenceDrawInfluenceChoices =
    pendingAction.kind === "discard-card-for-influence-and-draw" && pendingDiscardInfluenceDrawOwner
      ? discardCardForInfluenceAndDrawChoices(pendingDiscardInfluenceDrawOwner)
      : [];
  const pendingDiscardDrawOwner =
    pendingAction.kind === "discard-card-for-draw" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingDiscardDrawChoices =
    pendingAction.kind === "discard-card-for-draw" && pendingDiscardDrawOwner
      ? discardCardForDrawChoices(pendingDiscardDrawOwner, pendingAction)
      : [];
  const pendingTrashIntrigueOwner =
    pendingAction.kind === "trash-intrigue-for-reward" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashIntrigueChoices =
    pendingAction.kind === "trash-intrigue-for-reward" && pendingTrashIntrigueOwner
      ? trashIntrigueForRewardChoices(pendingTrashIntrigueOwner, pendingAction)
      : [];
  const pendingDiscardHandCardOwner =
    pendingAction.kind === "discard-hand-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingDiscardHandCardChoices =
    pendingAction.kind === "discard-hand-card" && pendingDiscardHandCardOwner
      ? discardHandCardChoices(pendingDiscardHandCardOwner, pendingAction)
      : [];
  const pendingInfluenceIntrigueOwner =
    pendingAction.kind === "lose-influence-for-intrigues" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingInfluenceIntrigueChoices =
    pendingAction.kind === "lose-influence-for-intrigues" && pendingInfluenceIntrigueOwner
      ? loseInfluenceForIntriguesChoices(pendingInfluenceIntrigueOwner)
      : [];
  const pendingMakerOwner =
    pendingAction.kind === "maker-choice" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingMakerSpiceOwner =
    pendingAction.kind === "maker-choice" ? game.players.find((player) => player.id === pendingAction.spiceOwnerId) : undefined;
  const pendingMakerSplit =
    pendingAction.kind === "maker-choice" &&
    pendingMakerOwner &&
    pendingMakerSpiceOwner &&
    pendingMakerOwner.id !== pendingMakerSpiceOwner.id;
  const pendingMakerLabel = pendingMakerSplit
    ? `${pendingMakerSpiceOwner.leader} spice / ${pendingMakerOwner.leader} worms`
    : pendingMakerOwner?.leader;
  const pendingSietchOwner =
    pendingAction.kind === "sietch-tabr" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingSietchWaterOwner =
    pendingAction.kind === "sietch-tabr" ? game.players.find((player) => player.id === pendingAction.waterOwnerId) : undefined;
  const pendingSietchSplit =
    pendingAction.kind === "sietch-tabr" &&
    pendingSietchOwner &&
    pendingSietchWaterOwner &&
    pendingSietchOwner.id !== pendingSietchWaterOwner.id;
  const pendingSietchLabel = pendingSietchSplit
    ? `${pendingSietchWaterOwner.leader} water / ${pendingSietchOwner.leader} units`
    : pendingSietchOwner?.leader;
  const pendingResourceSplitCommander =
    pendingAction.kind === "commander-resource-split"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingResourceSplitAlly =
    pendingAction.kind === "commander-resource-split"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingPaidRewardOwner =
    pendingAction.kind === "paid-reward-choice"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingTrashSourceTradeOwner =
    pendingAction.kind === "trash-source-for-trade"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingTrashSourceTradePartners =
    pendingAction.kind === "trash-source-for-trade"
      ? pendingAction.partnerIds
          .map((partnerId) => game.players.find((player) => player.id === partnerId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const pendingPayResourceContractsOwner =
    pendingAction.kind === "pay-resource-for-contracts"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceContractsRecipients =
    pendingAction.kind === "pay-resource-for-contracts"
      ? pendingAction.recipientIds.map((recipientId) => game.players.find((player) => player.id === recipientId))
      : [];
  const pendingPayResourceContractsContracts =
    pendingAction.kind === "pay-resource-for-contracts"
      ? pendingAction.contractIds.map((contractId) => game.contractOffer.find((contract) => contract.id === contractId))
      : [];
  const pendingPayResourceStrengthOwner =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceStrengthRecipient =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingPayResourceInfluenceOwner =
    pendingAction.kind === "pay-resource-for-influence"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceInfluenceRecipient =
    pendingAction.kind === "pay-resource-for-influence"
      ? game.players.find((player) => player.id === pendingAction.influenceOwnerId)
      : undefined;
  const pendingPayResourceTroopsOwner =
    pendingAction.kind === "pay-resource-for-troops"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceTroopsRecipients =
    pendingAction.kind === "pay-resource-for-troops"
      ? (Array.isArray(pendingAction.recipientIds) ? pendingAction.recipientIds : [])
          .map((recipientId) => game.players.find((player) => player.id === recipientId))
      : [];
  const pendingPayResourceDrawCardsOwner =
    pendingAction.kind === "pay-resource-for-draw-cards"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceSandwormsOwner =
    pendingAction.kind === "pay-resource-for-sandworms"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceSandwormsRecipient =
    pendingAction.kind === "pay-resource-for-sandworms"
      ? game.players.find((player) => player.id === pendingAction.recipientId)
      : undefined;
  const pendingTeamResourcePaymentOwner =
    pendingAction.kind === "team-resource-payment"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingThroneOwner =
    pendingAction.kind === "throne-row" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const eligibleThroneRowCards = pendingAction.kind === "throne-row"
    ? game.imperiumRow.filter(canMoveCardToThroneRow)
    : [];
  const noEligibleThroneRowCard = pendingAction.kind === "throne-row" && eligibleThroneRowCards.length === 0;
  const pendingTrashOwner =
    pendingAction.kind === "trash-card" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashChoices =
    pendingAction.kind === "trash-card" && pendingTrashOwner
      ? trashableCardsForPending(pendingTrashOwner, pendingAction)
      : [];
  const pendingActionChoiceOwner =
    pendingAction.kind === "pending-action-choice" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingStabanUnseenNetworkOwner =
    pendingAction.kind === "staban-unseen-network" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingStabanUnseenNetworkSpace =
    pendingAction.kind === "staban-unseen-network" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingLadyAmberDesertScoutsOwner =
    pendingAction.kind === "amber-desert-scouts" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingRepeatBoardSpaceOwner =
    pendingAction.kind === "repeat-board-space" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingRepeatBoardSpaceSpace =
    pendingAction.kind === "repeat-board-space" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingLeaderTransitionOwner =
    pendingAction.kind === "leader-transition" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingConflictVpOwner =
    pendingAction.kind === "conflict-vp-conversion" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingConflictInfluenceOwner =
    pendingAction.kind === "conflict-influence" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingOptionalSpacePaymentOwner =
    pendingAction.kind === "optional-space-payment" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingConflictVpCanPay =
    pendingAction.kind === "conflict-vp-conversion" ? canPayConflictVpConversion(game, pendingAction) : false;
  const pendingConflictVpSpyChoices =
    pendingAction.kind === "conflict-vp-conversion" ? conflictVpConversionSpyChoices(game, pendingAction) : [];
  const pendingRecallSpyOwner =
    pendingAction.kind === "recall-spy" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingRecallSpyRecipient =
    pendingAction.kind === "recall-spy"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingRecallSpyChoices = pendingAction.kind === "recall-spy" ? recallableSpySpaces(game, pendingAction) : [];
  const pendingInfluenceOwner =
    pendingAction.kind === "lose-influence" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingInfluenceRecipient =
    pendingAction.kind === "lose-influence"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingInfluenceChoices = pendingAction.kind === "lose-influence" ? influenceLossOptions(game, pendingAction) : [];
  const pendingInfluenceChoiceOwnerIds = [...new Set(pendingInfluenceChoices.map((choice) => choice.ownerId))];
  const pendingInfluenceChoiceOwners = pendingInfluenceChoiceOwnerIds
    .map((ownerId) => game.players.find((player) => player.id === ownerId))
    .filter((player): player is Player => Boolean(player));
  const pendingInfluencePayerLabel =
    pendingInfluenceChoiceOwners.length > 0
      ? pendingInfluenceChoiceOwners.map((owner) => owner.leader).join(" or ")
      : pendingInfluenceOwner?.leader;
  const reservedContractChoices =
    pendingContractOwner && pendingAction.kind === "contract" && !pendingAction.publicOnly
      ? pendingContractOwner.reservedContracts
      : [];
  const revealAdjustOwner =
    pendingAction.kind === "reveal-adjust" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const revealAdjustRecipient =
    pendingAction.kind === "reveal-adjust"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingRetreatStrengthOwner =
    pendingAction.kind === "retreat-troops-for-strength"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingRetreatStrengthRecipient =
    pendingAction.kind === "retreat-troops-for-strength"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingRetreatStrengthCanResolve =
    pendingAction.kind === "retreat-troops-for-strength"
      ? canResolveRetreatTroopsForStrength(game, pendingAction)
      : false;
  const tradePartners =
    pendingActor && pendingAction.kind === "trade"
      ? game.players.filter((player) =>
          player.team === pendingActor.team &&
          player.id !== pendingActor.id &&
          (!pendingAction.partnerLocked || player.id === pendingAction.partnerId)
        )
      : [];
  const tradeLocked = pendingAction.kind === "trade" && pendingAction.actorGiven + pendingAction.partnerGiven > 0;
  const reinforceAllies =
    pendingAction.kind === "reinforce"
      ? game.players.filter((player) => player.team === pendingAction.team && player.role === "Ally")
      : [];
  const conflictTieAllies =
    pendingAction.kind === "conflict-tie"
      ? game.players.filter((player) => pendingAction.tiedPlayerIds.includes(player.id))
      : [];
  const spyPlacementSpaces = pendingAction.kind === "spy" ? placeableSpySpaces(game, pendingAction) : [];
  const pendingSpySupplyRecallSpaces = pendingAction.kind === "spy"
    ? recallableSpySupplySpaces(game, pendingAction)
    : [];

  return (
    <div className="pending-panel">
      <div>
        <p className="eyebrow">Pending table choice</p>
        <h2>
          {pendingAction.kind === "deploy" && `${pendingOwner?.leader ?? "Player"} deployment`}
          {pendingAction.kind === "control-defense" && `${pendingControlDefenseOwner?.leader ?? "Player"} control deployment`}
          {pendingAction.kind === "reinforce" && `Military Support - ${pendingAction.remaining} troops`}
          {pendingAction.kind === "trade" && `Trade from ${pendingAction.source}`}
          {pendingAction.kind === "spy" && `${pendingAction.source}${pendingAction.placementIcon ? ` ${iconLabels[pendingAction.placementIcon]}` : ""} spy placement - ${pendingAction.remaining}`}
          {pendingAction.kind === "reveal-adjust" && "Printed reveal adjustment"}
          {pendingAction.kind === "retreat-troops-for-strength" && `${pendingRetreatStrengthOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "contract" && `${pendingContractOwner?.leader ?? "Player"} CHOAM contract`}
          {pendingAction.kind === "acquire-card" && `${pendingAcquireOwner?.leader ?? "Player"} acquisition from ${pendingAction.source}`}
          {pendingAction.kind === "discard-card-for-influence-and-draw" && `${pendingDiscardInfluenceDrawOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "discard-card-for-draw" && `${pendingDiscardDrawOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "trash-intrigue-for-reward" && `${pendingTrashIntrigueOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "discard-hand-card" && `${pendingDiscardHandCardOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "lose-influence-for-intrigues" && `${pendingInfluenceIntrigueOwner?.leader ?? "Player"} ${pendingAction.source} reveal`}
          {pendingAction.kind === "maker-choice" && `${pendingMakerLabel ?? "Player"} Maker space`}
          {pendingAction.kind === "sietch-tabr" && `${pendingSietchLabel ?? "Player"} Sietch Tabr`}
          {pendingAction.kind === "commander-resource-split" && `${pendingResourceSplitCommander?.leader ?? "Commander"} ${pendingAction.source}`}
          {pendingAction.kind === "paid-reward-choice" && `${pendingPaidRewardOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pending-action-choice" && `${pendingActionChoiceOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "staban-unseen-network" && `${pendingStabanUnseenNetworkOwner?.leader ?? "Staban Tuek"} Unseen Network`}
          {pendingAction.kind === "amber-desert-scouts" && `${pendingLadyAmberDesertScoutsOwner?.leader ?? "Lady Amber"} Desert Scouts`}
          {pendingAction.kind === "repeat-board-space" && `${pendingRepeatBoardSpaceOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "leader-transition" && `${pendingLeaderTransitionOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "conflict-influence" && `${pendingConflictInfluenceOwner?.leader ?? "Player"} Conflict Influence`}
          {pendingAction.kind === "board-influence-choice" && `${pendingAction.source} Influence`}
          {pendingAction.kind === "optional-space-payment" && `${pendingOptionalSpacePaymentOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "conflict-vp-conversion" && `${pendingConflictVpOwner?.leader ?? "Player"} Conflict reward`}
          {pendingAction.kind === "trash-source-for-trade" && `${pendingTrashSourceTradeOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-contracts" && `${pendingPayResourceContractsOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-strength" && `${pendingPayResourceStrengthOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-influence" && `${pendingPayResourceInfluenceOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-troops" && `${pendingPayResourceTroopsOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-draw-cards" && `${pendingPayResourceDrawCardsOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "pay-resource-for-sandworms" && `${pendingPayResourceSandwormsOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "team-resource-payment" && `${pendingTeamResourcePaymentOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "throne-row" && `${pendingThroneOwner?.leader ?? "Shaddam"} Throne Row`}
          {pendingAction.kind === "trash-card" && `${pendingTrashOwner?.leader ?? "Player"} ${pendingAction.optional ? "optional " : ""}trash from ${pendingAction.source}`}
          {pendingAction.kind === "recall-spy" && `${pendingRecallSpyOwner?.leader ?? "Player"} recall spy`}
          {pendingAction.kind === "lose-influence" && `${pendingInfluencePayerLabel ?? "Player"} influence choice`}
          {pendingAction.kind === "conflict-tie" && `${teams[pendingAction.team].name} conflict tie`}
        </h2>
      </div>

      {pendingAction.kind === "deploy" && (
        <PendingDeployPanel
          owner={pendingOwner}
          pending={pendingAction}
          onDeploy={deployOne}
          onDone={clearPendingAction}
        />
      )}

      {pendingAction.kind === "control-defense" && (
        <PendingControlDefensePanel
          locationName={criticalLocationNames[pendingAction.location]}
          owner={pendingControlDefenseOwner}
          supply={pendingControlDefenseSupply}
          onDeploy={deployControlDefense}
          onSkip={skipControlDefense}
        />
      )}

      {pendingAction.kind === "spy" && pendingSpyOwner && (
        <PendingSpyPanel
          owner={pendingSpyOwner}
          pending={pendingAction}
          placementSpaces={spyPlacementSpaces}
          supplyRecallSpaces={pendingSpySupplyRecallSpaces}
          onDone={clearPendingAction}
          onPlaceSpy={placeSpy}
          onRecallSupplySpy={recallSpyForSupply}
        />
      )}

      {pendingAction.kind === "trash-card" && pendingTrashOwner && (
        <PendingTrashPanel
          choices={pendingTrashChoices}
          owner={pendingTrashOwner}
          pending={pendingAction}
          onSkip={skipTrash}
          onTrash={trashCard}
        />
      )}

      {pendingAction.kind === "recall-spy" && pendingRecallSpyOwner && (
        <PendingRecallSpyPanel
          choices={pendingRecallSpyChoices}
          owner={pendingRecallSpyOwner}
          pending={pendingAction}
          recipient={pendingRecallSpyRecipient}
          onRecall={recallSpy}
          onSkip={skipRecall}
        />
      )}

      {pendingAction.kind === "lose-influence" && pendingInfluencePayerLabel && (
        <PendingInfluenceLossPanel
          choices={pendingInfluenceChoices}
          payerLabel={pendingInfluencePayerLabel}
          pending={pendingAction}
          players={game.players}
          recipient={pendingInfluenceRecipient}
          onLoseInfluence={loseInfluence}
          onSkip={skipInfluenceLoss}
        />
      )}

      {pendingAction.kind === "reveal-adjust" && revealAdjustOwner && revealAdjustRecipient && (
        <PendingRevealAdjustPanel
          owner={revealAdjustOwner}
          pending={pendingAction}
          recipient={revealAdjustRecipient}
          onAdjust={adjustRevealReward}
          onDone={finishRevealAdjust}
        />
      )}

      {pendingAction.kind === "retreat-troops-for-strength" && (
        <PendingRetreatTroopsForStrengthPanel
          canResolve={pendingRetreatStrengthCanResolve}
          owner={pendingRetreatStrengthOwner}
          pending={pendingAction}
          recipient={pendingRetreatStrengthRecipient}
          onRetreat={chooseRetreatTroopsForStrength}
          onSkip={skipRetreatTroopsForStrengthChoice}
        />
      )}

      {pendingAction.kind === "maker-choice" && pendingMakerOwner && (
        <PendingMakerChoicePanel
          label={pendingMakerLabel}
          owner={pendingMakerOwner}
          pending={pendingAction}
          spiceOwner={pendingMakerSpiceOwner}
          onChoose={chooseMakerReward}
        />
      )}

      {pendingAction.kind === "sietch-tabr" && pendingSietchOwner && pendingSietchWaterOwner && (
        <PendingSietchTabrPanel
          label={pendingSietchLabel}
          pending={pendingAction}
          onChoose={chooseSietchTabr}
        />
      )}

      {pendingAction.kind === "commander-resource-split" && pendingResourceSplitCommander && pendingResourceSplitAlly && (
        <PendingResourceSplitPanel
          ally={pendingResourceSplitAlly}
          commander={pendingResourceSplitCommander}
          pending={pendingAction}
          onChoose={chooseCommanderResourceSplit}
        />
      )}

      {pendingAction.kind === "paid-reward-choice" && (
        <PendingPaidRewardChoicePanel
          owner={pendingPaidRewardOwner}
          pending={pendingAction}
          players={game.players}
          onChoose={choosePaidReward}
          onSkip={skipPaidReward}
        />
      )}

      {pendingAction.kind === "pending-action-choice" && (
        <PendingActionChoicePanel
          game={game}
          owner={pendingActionChoiceOwner}
          pending={pendingAction}
          onChoose={choosePendingActionChoice}
          onSkip={skipPendingActionChoiceHandler}
        />
      )}

      {pendingAction.kind === "staban-unseen-network" && (
        <PendingStabanUnseenNetworkPanel
          owner={pendingStabanUnseenNetworkOwner}
          pending={pendingAction}
          space={pendingStabanUnseenNetworkSpace}
          onChoose={chooseStabanUnseenNetwork}
        />
      )}

      {pendingAction.kind === "amber-desert-scouts" && (
        <PendingLadyAmberDesertScoutsPanel
          owner={pendingLadyAmberDesertScoutsOwner}
          onChoose={chooseLadyAmberDesertScouts}
        />
      )}

      {pendingAction.kind === "repeat-board-space" && (
        <PendingRepeatBoardSpacePanel
          owner={pendingRepeatBoardSpaceOwner}
          pending={pendingAction}
          space={pendingRepeatBoardSpaceSpace}
          onChoose={chooseRepeatBoardSpace}
        />
      )}

      {pendingAction.kind === "leader-transition" && (
        <PendingLeaderTransitionPanel
          counterLabel={memoryCountLabel(pendingLeaderTransitionOwner?.jessicaMemories ?? 0)}
          owner={pendingLeaderTransitionOwner}
          pending={pendingAction}
          onChoose={chooseLeaderTransition}
        />
      )}

      {pendingAction.kind === "conflict-vp-conversion" && (
        <PendingConflictVpPanel
          canPay={pendingConflictVpCanPay}
          owner={pendingConflictVpOwner}
          pending={pendingAction}
          spyChoices={pendingConflictVpSpyChoices}
          onPay={payConflictVpReward}
          onRecallSpy={recallConflictRewardSpy}
          onSkip={skipConflictVpReward}
        />
      )}

      {pendingAction.kind === "conflict-influence" && (
        <PendingConflictInfluencePanel
          owner={pendingConflictInfluenceOwner}
          pending={pendingAction}
          onChoose={chooseConflictInfluence}
        />
      )}
      {pendingAction.kind === "board-influence-choice" && (
        <PendingBoardInfluenceChoicePanel
          game={game}
          pending={pendingAction}
          onChoose={chooseBoardInfluence}
        />
      )}
      {pendingAction.kind === "optional-space-payment" && pendingOptionalSpacePaymentOwner && (
        <PendingOptionalSpacePaymentPanel
          ownerName={pendingOptionalSpacePaymentOwner.leader}
          pending={pendingAction}
          onPay={payOptionalSpacePayment}
          onSkip={skipOptionalSpacePaymentChoice}
        />
      )}

      {pendingAction.kind === "trash-source-for-trade" && (
        <PendingTrashSourceForTradePanel
          owner={pendingTrashSourceTradeOwner}
          partners={pendingTrashSourceTradePartners}
          source={pendingAction.source}
          onSkip={skipTrashSourceForTradeChoice}
          onTrade={chooseTrashSourceForTrade}
        />
      )}

      {pendingAction.kind === "pay-resource-for-contracts" && (
        <PendingPayResourceForContractsPanel
          contracts={pendingPayResourceContractsContracts}
          cost={pendingAction.cost}
          owner={pendingPayResourceContractsOwner}
          recipients={pendingPayResourceContractsRecipients}
          resource={pendingAction.resource}
          source={pendingAction.source}
          trashSource={pendingAction.trashSource}
          onChoose={choosePayResourceForContracts}
          onSkip={skipPayResourceForContractsChoice}
        />
      )}

      {pendingAction.kind === "pay-resource-for-strength" && (
        <PendingPayResourceForStrengthPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForStrength}
          onSkip={skipPayResourceForStrengthChoice}
          optional={pendingAction.optional}
          owner={pendingPayResourceStrengthOwner}
          recipient={pendingPayResourceStrengthRecipient}
          resource={pendingAction.resource}
          strength={pendingAction.strength}
        />
      )}

      {pendingAction.kind === "pay-resource-for-troops" && (
        <PendingPayResourceForTroopsPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForTroops}
          onSkip={skipPayResourceForTroopsChoice}
          owner={pendingPayResourceTroopsOwner}
          recipients={pendingPayResourceTroopsRecipients}
          resource={pendingAction.resource}
          source={pendingAction.source}
          troops={pendingAction.troops}
          trashSource={pendingAction.trashSource}
        />
      )}

      {pendingAction.kind === "pay-resource-for-draw-cards" && (
        <PendingPayResourceForDrawCardsPanel
          cost={pendingAction.cost}
          drawCards={pendingAction.drawCards}
          onChoose={choosePayResourceForDrawCards}
          onSkip={skipPayResourceForDrawCardsChoice}
          owner={pendingPayResourceDrawCardsOwner}
          resource={pendingAction.resource}
          source={pendingAction.source}
        />
      )}

      {pendingAction.kind === "pay-resource-for-influence" && (
        <PendingPayResourceForInfluencePanel
          amount={pendingAction.amount}
          cost={pendingAction.cost}
          factionLabel={factionLabels[pendingAction.faction]}
          onChoose={choosePayResourceForInfluence}
          onSkip={skipPayResourceForInfluenceChoice}
          owner={pendingPayResourceInfluenceOwner}
          recipient={pendingPayResourceInfluenceRecipient}
          resource={pendingAction.resource}
        />
      )}

      {pendingAction.kind === "pay-resource-for-sandworms" && (
        <PendingPayResourceForSandwormsPanel
          cost={pendingAction.cost}
          onChoose={choosePayResourceForSandworms}
          onSkip={skipPayResourceForSandwormsChoice}
          owner={pendingPayResourceSandwormsOwner}
          persuasionCost={pendingAction.persuasionCost}
          recipient={pendingPayResourceSandwormsRecipient}
          resource={pendingAction.resource}
          sandworms={pendingAction.sandworms}
          source={pendingAction.source}
          strength={pendingAction.strength}
          trashSource={pendingAction.trashSource}
        />
      )}

      {pendingAction.kind === "team-resource-payment" && (
        <PendingTeamResourcePaymentSection
          game={game}
          pendingAction={pendingAction}
          onAdjust={adjustTeamResourcePayment}
          onPay={chooseTeamResourcePayment}
          onSkip={skipTeamResourcePaymentChoice}
        />
      )}

      {pendingAction.kind === "reinforce" && (
        <PendingReinforcePanel
          allies={reinforceAllies}
          pending={pendingAction}
          onReinforce={reinforceOne}
        />
      )}

      {pendingAction.kind === "trade" && pendingActor && pendingPartner && (
        <PendingTradePanel
          actor={pendingActor}
          partner={pendingPartner}
          partners={tradePartners}
          pending={pendingAction}
          tradeLocked={tradeLocked}
          onDone={clearPendingAction}
          onTransfer={transferTrade}
          onUpdateTrade={updateTrade}
        />
      )}

      {pendingAction.kind === "contract" && pendingContractOwner && (
        <PendingContractPanel
          contractOffer={game.contractOffer}
          allowFallback={pendingAction.allowFallback}
          optional={pendingAction.optional}
          publicOnly={pendingAction.publicOnly}
          reservedContracts={reservedContractChoices}
          onCollectFallback={collectContractFallback}
          onSkip={clearPendingAction}
          onTakeContract={takeContract}
        />
      )}

      {pendingAction.kind === "acquire-card" && pendingAcquireOwner && (
        <PendingAcquireCardPanel
          cards={pendingAcquireCards}
          owner={pendingAcquireOwner}
          pending={pendingAction}
          onAcquireCard={acquirePendingCard}
          onSkip={clearPendingAction}
        />
      )}

      {pendingAction.kind === "discard-card-for-influence-and-draw" && (
        <PendingDiscardInfluenceDrawPanel
          discardChoices={pendingDiscardInfluenceDrawDiscardChoices}
          drawCards={pendingAction.drawCards}
          influenceAmount={pendingAction.influenceAmount}
          influenceChoices={pendingDiscardInfluenceDrawInfluenceChoices}
          optional={pendingAction.optional}
          owner={pendingDiscardInfluenceDrawOwner}
          source={pendingAction.source}
          onResolve={chooseDiscardCardForInfluenceAndDraw}
          onSkip={skipDiscardCardForInfluenceAndDrawChoice}
        />
      )}

      {pendingAction.kind === "discard-card-for-draw" && (
        <PendingDiscardDrawPanel
          bonusDraw={pendingAction.bonusDraw}
          bonusIntrigues={pendingAction.bonusIntrigues}
          discardChoices={pendingDiscardDrawChoices}
          drawCards={pendingAction.drawCards}
          optional={pendingAction.optional}
          owner={pendingDiscardDrawOwner}
          source={pendingAction.source}
          onResolve={chooseDiscardCardForDraw}
          onSkip={skipDiscardCardForDrawChoice}
        />
      )}

      {pendingAction.kind === "trash-intrigue-for-reward" && (
        <PendingTrashIntriguePanel
          choices={pendingTrashIntrigueChoices}
          owner={pendingTrashIntrigueOwner}
          pending={pendingAction}
          onResolve={chooseTrashIntrigueForReward}
          onSkip={skipTrashIntrigueForRewardChoice}
        />
      )}

      {pendingAction.kind === "discard-hand-card" && (
        <PendingDiscardHandCardPanel
          discardChoices={pendingDiscardHandCardChoices}
          owner={pendingDiscardHandCardOwner}
          remaining={pendingAction.remaining}
          source={pendingAction.source}
          onResolve={chooseDiscardHandCard}
        />
      )}

      {pendingAction.kind === "lose-influence-for-intrigues" && (
        <PendingInfluenceIntriguePanel
          amount={pendingAction.amount}
          influenceChoices={pendingInfluenceIntrigueChoices}
          optional={pendingAction.optional}
          owner={pendingInfluenceIntrigueOwner}
          source={pendingAction.source}
          onChoose={chooseLoseInfluenceForIntrigues}
          onSkip={skipLoseInfluenceForIntriguesChoice}
        />
      )}

      {pendingAction.kind === "throne-row" && pendingThroneOwner && (
        <PendingThroneRowPanel
          eligibleCards={eligibleThroneRowCards}
          noEligible={noEligibleThroneRowCard}
          onChoose={chooseThroneRowCard}
          onNoEligible={clearPendingAction}
        />
      )}

      {pendingAction.kind === "conflict-tie" && (
        <PendingConflictTiePanel
          allies={conflictTieAllies}
          rank={pendingAction.rank}
          onChooseWinner={chooseConflictTieWinner}
        />
      )}
    </div>
  );
}
