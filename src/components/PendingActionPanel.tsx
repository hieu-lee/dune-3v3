import { memoryCountLabel } from "../app-helpers";
import { criticalLocationNames } from "../game/critical-locations";
import { boardSpaces } from "../game/data";
import {
  acquirableCardsForPending,
  canPayTrashIntrigueForReward,
  canDeployForDeployOrRetreatTroops,
  canResolveRetreatTroopsForStrength,
  canRetreatForDeployOrRetreatTroops,
  canMoveCardToThroneRow,
  canPayConflictVpConversion,
  conflictVpConversionSpyChoices,
  discardCardsForRewardChoices,
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
  topDeckSelectionCards,
  trashIntrigueForRewardChoices,
  trashableCardsForPending,
} from "../game/state";
import type { Player } from "../game/types";
import { PendingActionPanelHeader } from "./PendingActionPanelHeader";
import type { PendingActionPanelProps } from "./PendingActionPanel.types";
import { PendingBoardInfluenceChoicePanel, PendingOptionalSpacePaymentPanel } from "./PendingBoardChoicePanels";
import { PendingAcquireCardPanel, PendingContractPanel } from "./PendingCardChoicePanels";
import {
  PendingDiscardDrawPanel,
  PendingDiscardHandCardPanel,
  PendingDiscardInfluenceDrawPanel,
  PendingDiscardRewardPanel,
  PendingInfluenceIntriguePanel,
} from "./PendingCapturedMentatPanel";
import { PendingConflictInfluencePanel } from "./PendingConflictInfluencePanel";
import { PendingConflictVpPanel } from "./PendingConflictVpPanel";
import { PendingInfluenceLossPanel } from "./PendingInfluenceLossPanel";
import { PendingActionChoicePanel } from "./PendingActionChoicePanel";
import {
  PendingLadyAmberDesertScoutsPanel,
  PendingLeaderTransitionPanel,
  PendingRepeatBoardSpacePanel,
  PendingStabanUnseenNetworkPanel,
  PendingTrashSourceForTradePanel,
} from "./PendingLeaderChoicePanels";
import { PendingMakerChoicePanel } from "./PendingMakerChoicePanel";
import { PendingPaidRewardChoicePanel } from "./PendingPaidRewardChoicePanel";
import {
  PendingControlDefensePanel,
  PendingDeployPanel,
  PendingDeployOrRetreatTroopsPanel,
  PendingReinforcePanel,
  PendingRetreatTroopsForStrengthPanel,
} from "./PendingMilitaryPanels";
import { PendingRecallSpyPanel } from "./PendingRecallSpyPanel";
import { PendingResourceSplitPanel } from "./PendingResourceSplitPanel";
import { PendingResourcePaymentPanels } from "./PendingResourcePaymentPanels";
import { PendingSietchTabrPanel } from "./PendingSietchTabrPanel";
import { PendingSpyPanel } from "./PendingSpyPanel";
import { PendingConflictTiePanel, PendingThroneRowPanel } from "./PendingTableChoicePanels";
import { PendingTeamResourcePaymentSection } from "./PendingTeamResourcePaymentSection";
import { PendingTradePanel } from "./PendingTradePanel";
import { PendingTrashIntriguePanel } from "./PendingTrashIntriguePanel";
import { PendingTrashPanel } from "./PendingTrashPanel";
import { PendingTopDeckSelectionPanel } from "./PendingTopDeckSelectionPanel";

export function PendingActionPanel({
  game,
  pendingAction,
  viewerPlayerId,
  acquirePendingCard,
  adjustTeamResourcePayment,
  chooseCommanderResourceSplit,
  chooseConflictInfluence,
  chooseBoardInfluence,
  chooseConflictTieWinner,
  chooseDiscardCardsForReward,
  chooseDiscardCardForDraw,
  chooseDiscardHandCard,
  chooseDiscardCardForInfluenceAndDraw,
  chooseDeployOrRetreatTroops,
  chooseLoseInfluenceForIntrigues,
  choosePendingActionChoice,
  chooseLeaderTransition,
  chooseLadyAmberDesertScouts,
  chooseMakerReward,
  choosePayResourceForContracts,
  choosePayResourceForDrawCards,
  choosePayResourceForHighCouncilSeat,
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
  chooseTopDeckSelection,
  chooseTrashIntrigueForReward,
  chooseTrashSourceForTrade,
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
  skipDiscardCardsForRewardChoice,
  skipDiscardCardForDrawChoice,
  skipDiscardCardForInfluenceAndDrawChoice,
  skipDeployOrRetreatTroops,
  skipLoseInfluenceForIntriguesChoice,
  skipControlDefense,
  skipConflictVpReward,
  skipInfluenceLoss,
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
  const pendingDiscardRewardOwner =
    pendingAction.kind === "discard-cards-for-reward" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingDiscardRewardChoices =
    pendingAction.kind === "discard-cards-for-reward" && pendingDiscardRewardOwner
      ? discardCardsForRewardChoices(pendingDiscardRewardOwner, pendingAction)
      : [];
  const pendingTrashIntrigueOwner =
    pendingAction.kind === "trash-intrigue-for-reward" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTrashIntrigueChoices =
    pendingAction.kind === "trash-intrigue-for-reward" && pendingTrashIntrigueOwner
      ? trashIntrigueForRewardChoices(pendingTrashIntrigueOwner, pendingAction)
      : [];
  const pendingTrashIntrigueCanPay =
    pendingAction.kind === "trash-intrigue-for-reward"
      ? canPayTrashIntrigueForReward(pendingTrashIntrigueOwner, pendingAction)
      : true;
  const pendingTopDeckSelectionOwner =
    pendingAction.kind === "top-deck-selection" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingTopDeckSelectionCards =
    pendingAction.kind === "top-deck-selection" && pendingTopDeckSelectionOwner
      ? topDeckSelectionCards(pendingTopDeckSelectionOwner, pendingAction)
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
  const pendingSietchCanRecruitTroop = pendingSietchOwner ? playerTroopSupply(pendingSietchOwner) > 0 : false;
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
  const pendingDeployOrRetreatOwner =
    pendingAction.kind === "deploy-or-retreat-troops"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingDeployOrRetreatRecipient =
    pendingAction.kind === "deploy-or-retreat-troops"
      ? game.players.find((player) => player.id === pendingAction.recipientId)
      : undefined;
  const pendingDeployOrRetreatCanDeploy =
    pendingAction.kind === "deploy-or-retreat-troops"
      ? canDeployForDeployOrRetreatTroops(game, pendingAction)
      : false;
  const pendingDeployOrRetreatCanRetreat =
    pendingAction.kind === "deploy-or-retreat-troops"
      ? canRetreatForDeployOrRetreatTroops(game, pendingAction)
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
      ? game.players.filter(
          (player) => player.team === pendingAction.team && player.role === "Ally" && playerTroopSupply(player) > 0,
        )
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
      <PendingActionPanelHeader game={game} pendingAction={pendingAction} />

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
          viewerPlayerId={viewerPlayerId}
          onLoseInfluence={loseInfluence}
          onSkip={skipInfluenceLoss}
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

      {pendingAction.kind === "deploy-or-retreat-troops" && (
        <PendingDeployOrRetreatTroopsPanel
          canDeploy={pendingDeployOrRetreatCanDeploy}
          canRetreat={pendingDeployOrRetreatCanRetreat}
          owner={pendingDeployOrRetreatOwner}
          pending={pendingAction}
          recipient={pendingDeployOrRetreatRecipient}
          onChoose={chooseDeployOrRetreatTroops}
          onSkip={skipDeployOrRetreatTroops}
        />
      )}

      {pendingAction.kind === "maker-choice" && pendingMakerOwner && (
        <PendingMakerChoicePanel
          label={pendingMakerLabel}
          owner={pendingMakerOwner}
          pending={pendingAction}
          spiceOwner={pendingMakerSpiceOwner}
          viewerPlayerId={viewerPlayerId}
          onChoose={chooseMakerReward}
        />
      )}

      {pendingAction.kind === "sietch-tabr" && pendingSietchOwner && pendingSietchWaterOwner && (
        <PendingSietchTabrPanel
          label={pendingSietchLabel}
          pending={pendingAction}
          canRecruitTroop={pendingSietchCanRecruitTroop}
          viewerPlayerId={viewerPlayerId}
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
          viewerPlayerId={viewerPlayerId}
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

      <PendingResourcePaymentPanels
        game={game}
        pendingAction={pendingAction}
        choosePayResourceForContracts={choosePayResourceForContracts}
        choosePayResourceForDrawCards={choosePayResourceForDrawCards}
        choosePayResourceForHighCouncilSeat={choosePayResourceForHighCouncilSeat}
        choosePayResourceForInfluence={choosePayResourceForInfluence}
        choosePayResourceForSandworms={choosePayResourceForSandworms}
        choosePayResourceForStrength={choosePayResourceForStrength}
        choosePayResourceForTroops={choosePayResourceForTroops}
        skipPayResourceForContractsChoice={skipPayResourceForContractsChoice}
        skipPayResourceForDrawCardsChoice={skipPayResourceForDrawCardsChoice}
        skipPayResourceForHighCouncilSeatChoice={skipPayResourceForHighCouncilSeatChoice}
        skipPayResourceForInfluenceChoice={skipPayResourceForInfluenceChoice}
        skipPayResourceForSandwormsChoice={skipPayResourceForSandwormsChoice}
        skipPayResourceForStrengthChoice={skipPayResourceForStrengthChoice}
        skipPayResourceForTroopsChoice={skipPayResourceForTroopsChoice}
      />

      {pendingAction.kind === "team-resource-payment" && (
        <PendingTeamResourcePaymentSection
          game={game}
          pendingAction={pendingAction}
          viewerPlayerId={viewerPlayerId}
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
          viewerPlayerId={viewerPlayerId}
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

      {pendingAction.kind === "discard-cards-for-reward" && (
        <PendingDiscardRewardPanel
          discardChoices={pendingDiscardRewardChoices}
          owner={pendingDiscardRewardOwner}
          pending={pendingAction}
          onResolve={chooseDiscardCardsForReward}
          onSkip={skipDiscardCardsForRewardChoice}
        />
      )}

      {pendingAction.kind === "top-deck-selection" && (
        <PendingTopDeckSelectionPanel
          cards={pendingTopDeckSelectionCards}
          owner={pendingTopDeckSelectionOwner}
          pending={pendingAction}
          onResolve={chooseTopDeckSelection}
          onSkip={skipTopDeckSelection}
        />
      )}

      {pendingAction.kind === "trash-intrigue-for-reward" && (
        <PendingTrashIntriguePanel
          canPay={pendingTrashIntrigueCanPay}
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
