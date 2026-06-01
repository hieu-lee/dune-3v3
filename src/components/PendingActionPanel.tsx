import { memoryCountLabel, troopSupplyLabel } from "../app-helpers";
import { criticalLocationNames } from "../game/critical-locations";
import { boardSpaces, factionLabels, iconLabels, teams } from "../game/data";
import {
  acquirableCardsForPending,
  canResolveRetreatTroopsForStrength,
  canMoveCardToThroneRow,
  canPayConflictVpConversion,
  conflictVpConversionSpyChoices,
  discardCardForInfluenceAndDrawChoices,
  discardCardForInfluenceAndDrawDiscardChoices,
  influenceLossOptions,
  irulanSignetAcquireCards,
  irulanSignetTrashableCards,
  loseInfluenceForIntriguesChoices,
  placeableSpySpaces,
  playerTroopSupply,
  recallableSpySpaces,
  recallableSpySupplySpaces,
  threatenSpiceProductionContributionTotal,
  trashableCardsForPending,
} from "../game/state";
import type {
  IrulanSignetRingChoice,
  JessicaOtherMemoriesChoice,
  JessicaReverendMotherChoice,
  JessicaSpiceAgonyChoice,
  JessicaWaterOfLifeChoice,
  LadyAmberDesertScoutsChoice,
  ShaddamSignetRingChoice,
  StabanUnseenNetworkChoice,
} from "../game/state";
import type { FactionId, GameState, PendingAction, Player, TradeGoodId, TrashCardZone } from "../game/types";
import { PendingBoardInfluenceChoicePanel, PendingOptionalSpacePaymentPanel } from "./PendingBoardChoicePanels";
import { PendingAcquireCardPanel, PendingContractPanel } from "./PendingCardChoicePanels";
import { PendingDiscardInfluenceDrawPanel, PendingInfluenceIntriguePanel } from "./PendingCapturedMentatPanel";
import { PendingConflictInfluencePanel } from "./PendingConflictInfluencePanel";
import { PendingConflictVpPanel } from "./PendingConflictVpPanel";
import { PendingInfluenceLossPanel } from "./PendingInfluenceLossPanel";
import { PendingIrulanSignetPanel } from "./PendingIrulanSignetPanel";
import {
  PendingCommandRespectPanel,
  PendingCorrinoMightPanel,
  PendingDemandAttentionPanel,
  PendingDemandResultsPanel,
  PendingDesertCallPanel,
  PendingJessicaOtherMemoriesPanel,
  PendingJessicaReverendMotherPanel,
  PendingJessicaSpiceAgonyPanel,
  PendingJessicaWaterOfLifePanel,
  PendingLadyAmberDesertScoutsPanel,
  PendingPayResourceForStrengthPanel,
  PendingStabanUnseenNetworkPanel,
  PendingThreatenSpiceProductionPanel,
} from "./PendingLeaderChoicePanels";
import { PendingMakerChoicePanel } from "./PendingMakerChoicePanel";
import {
  PendingControlDefensePanel,
  PendingDeployPanel,
  PendingReinforcePanel,
  PendingRetreatTroopsForStrengthPanel,
} from "./PendingMilitaryPanels";
import { PendingRecallSpyPanel } from "./PendingRecallSpyPanel";
import { PendingResourceSplitPanel } from "./PendingResourceSplitPanel";
import { PendingShaddamSignetPanel } from "./PendingShaddamSignetPanel";
import { PendingSietchTabrPanel } from "./PendingSietchTabrPanel";
import { PendingSpyPanel } from "./PendingSpyPanel";
import { PendingConflictTiePanel, PendingRevealAdjustPanel, PendingThroneRowPanel } from "./PendingTableChoicePanels";
import { PendingTradePanel } from "./PendingTradePanel";
import { PendingTrashPanel } from "./PendingTrashPanel";

type PendingActionPanelProps = {
  game: GameState;
  pendingAction: PendingAction;
  acquirePendingCard: (cardId: string) => void;
  adjustRevealReward: (persuasionDelta: number, strengthDelta: number) => void;
  adjustThreatenSpiceProduction: (contributorId: string, delta: number) => void;
  chooseCommandRespectTrade: (partnerId: string) => void;
  chooseCommanderResourceSplit: (optionIndex: number) => void;
  chooseConflictInfluence: (faction: FactionId) => void;
  chooseBoardInfluence: (ownerId: string, faction: FactionId) => void;
  chooseConflictTieWinner: (winnerId?: string) => void;
  chooseDiscardCardForInfluenceAndDraw: (discardCardId: string, faction: FactionId) => void;
  chooseLoseInfluenceForIntrigues: (faction: FactionId) => void;
  chooseCorrinoMight: () => void;
  chooseDemandAttention: () => void;
  chooseDemandResults: (optionIndex: number) => void;
  chooseDesertCall: () => void;
  chooseIrulanSignet: (choice: IrulanSignetRingChoice) => void;
  chooseJessicaOtherMemories: (choice: JessicaOtherMemoriesChoice) => void;
  chooseJessicaReverendMother: (choice: JessicaReverendMotherChoice) => void;
  chooseJessicaSpiceAgony: (choice: JessicaSpiceAgonyChoice) => void;
  chooseJessicaWaterOfLife: (choice: JessicaWaterOfLifeChoice) => void;
  chooseLadyAmberDesertScouts: (choice: LadyAmberDesertScoutsChoice) => void;
  chooseMakerReward: (choice: "spice" | "sandworms") => void;
  choosePayResourceForStrength: () => void;
  chooseRetreatTroopsForStrength: () => void;
  chooseShaddamSignet: (choice: ShaddamSignetRingChoice) => void;
  chooseSietchTabr: (choice: "hooks" | "shield-wall") => void;
  chooseStabanUnseenNetwork: (choice: StabanUnseenNetworkChoice) => void;
  chooseThreatenSpiceProduction: () => void;
  chooseThroneRowCard: (cardId: string) => void;
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
  skipCommandRespectChoice: () => void;
  skipDiscardCardForInfluenceAndDrawChoice: () => void;
  skipLoseInfluenceForIntriguesChoice: () => void;
  skipControlDefense: () => void;
  skipConflictVpReward: () => void;
  skipCorrinoMightChoice: () => void;
  skipDemandAttentionChoice: () => void;
  skipDemandResultsChoice: () => void;
  skipDesertCallChoice: () => void;
  skipInfluenceLoss: () => void;
  skipOptionalSpacePaymentChoice: () => void;
  skipPayResourceForStrengthChoice: () => void;
  skipRecall: () => void;
  skipRetreatTroopsForStrengthChoice: () => void;
  skipThreatenSpiceProductionChoice: () => void;
  skipTrash: () => void;
  takeContract: (contractId: string) => void;
  transferTrade: (fromId: string, toId: string, intrigueId?: string) => void;
  trashCard: (zone: TrashCardZone, cardId: string) => void;
  updateTrade: (resource: TradeGoodId, partnerId?: string) => void;
};

export function PendingActionPanel({
  game,
  pendingAction,
  acquirePendingCard,
  adjustRevealReward,
  adjustThreatenSpiceProduction,
  chooseCommandRespectTrade,
  chooseCommanderResourceSplit,
  chooseConflictInfluence,
  chooseBoardInfluence,
  chooseConflictTieWinner,
  chooseDiscardCardForInfluenceAndDraw,
  chooseLoseInfluenceForIntrigues,
  chooseCorrinoMight,
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
  choosePayResourceForStrength,
  chooseRetreatTroopsForStrength,
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
  payOptionalSpacePayment,
  placeSpy,
  recallConflictRewardSpy,
  recallSpy,
  recallSpyForSupply,
  reinforceOne,
  skipCommandRespectChoice,
  skipDiscardCardForInfluenceAndDrawChoice,
  skipLoseInfluenceForIntriguesChoice,
  skipControlDefense,
  skipConflictVpReward,
  skipCorrinoMightChoice,
  skipDemandAttentionChoice,
  skipDemandResultsChoice,
  skipDesertCallChoice,
  skipInfluenceLoss,
  skipOptionalSpacePaymentChoice,
  skipPayResourceForStrengthChoice,
  skipRecall,
  skipRetreatTroopsForStrengthChoice,
  skipThreatenSpiceProductionChoice,
  skipTrash,
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
  const pendingShaddamSignetCommander =
    pendingAction.kind === "shaddam-signet-ring"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingShaddamSignetAlly =
    pendingAction.kind === "shaddam-signet-ring"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingCommandRespectCommander =
    pendingAction.kind === "command-respect"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingCommandRespectPartners =
    pendingAction.kind === "command-respect"
      ? pendingAction.partnerIds
          .map((partnerId) => game.players.find((player) => player.id === partnerId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const pendingDemandResultsCommander =
    pendingAction.kind === "demand-results"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDemandResultsAllies =
    pendingAction.kind === "demand-results"
      ? pendingAction.allyIds.map((allyId) => game.players.find((player) => player.id === allyId))
      : [];
  const pendingDemandResultsContracts =
    pendingAction.kind === "demand-results"
      ? pendingAction.contractIds.map((contractId) => game.contractOffer.find((contract) => contract.id === contractId))
      : [];
  const pendingCorrinoMightCommander =
    pendingAction.kind === "corrino-might"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingCorrinoMightAllies =
    pendingAction.kind === "corrino-might"
      ? pendingAction.allyIds.map((allyId) => game.players.find((player) => player.id === allyId))
      : [];
  const pendingPayResourceStrengthOwner =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.ownerId)
      : undefined;
  const pendingPayResourceStrengthRecipient =
    pendingAction.kind === "pay-resource-for-strength"
      ? game.players.find((player) => player.id === pendingAction.combatRecipientId)
      : undefined;
  const pendingDemandAttentionCommander =
    pendingAction.kind === "demand-attention"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDemandAttentionRecipient =
    pendingAction.kind === "demand-attention"
      ? game.players.find((player) => player.id === pendingAction.recipientId)
      : undefined;
  const pendingDesertCallCommander =
    pendingAction.kind === "desert-call"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingDesertCallAlly =
    pendingAction.kind === "desert-call"
      ? game.players.find((player) => player.id === pendingAction.allyId)
      : undefined;
  const pendingThreatenSpiceCommander =
    pendingAction.kind === "threaten-spice-production"
      ? game.players.find((player) => player.id === pendingAction.commanderId)
      : undefined;
  const pendingThreatenSpiceContributors =
    pendingAction.kind === "threaten-spice-production"
      ? pendingAction.contributorIds
          .map((contributorId) => game.players.find((player) => player.id === contributorId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const pendingThreatenSpiceTotal =
    pendingAction.kind === "threaten-spice-production"
      ? threatenSpiceProductionContributionTotal(pendingAction)
      : 0;
  const pendingThreatenSpiceCanPay =
    pendingAction.kind === "threaten-spice-production" &&
    pendingThreatenSpiceContributors.length === pendingAction.contributorIds.length &&
    pendingThreatenSpiceTotal === pendingAction.cost &&
    pendingThreatenSpiceContributors.every(
      (contributor) => (pendingAction.contributions[contributor.id] ?? 0) <= contributor.resources.spice,
    );
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
  const pendingIrulanSignetOwner =
    pendingAction.kind === "irulan-signet-ring" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingIrulanSignetAcquireCards =
    pendingAction.kind === "irulan-signet-ring" ? irulanSignetAcquireCards(game, pendingAction) : [];
  const pendingIrulanSignetTrashChoices =
    pendingAction.kind === "irulan-signet-ring" ? irulanSignetTrashableCards(game, pendingAction) : [];
  const pendingStabanUnseenNetworkOwner =
    pendingAction.kind === "staban-unseen-network" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingStabanUnseenNetworkSpace =
    pendingAction.kind === "staban-unseen-network" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingLadyAmberDesertScoutsOwner =
    pendingAction.kind === "amber-desert-scouts" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaSpiceAgonyOwner =
    pendingAction.kind === "jessica-spice-agony" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaSpiceAgonyTroopSupply = pendingJessicaSpiceAgonyOwner
    ? playerTroopSupply(pendingJessicaSpiceAgonyOwner)
    : 0;
  const pendingJessicaSpiceAgonyCanPay = Boolean(
    pendingJessicaSpiceAgonyOwner &&
      pendingJessicaSpiceAgonyOwner.resources.spice >= 1 &&
      pendingJessicaSpiceAgonyTroopSupply > 0,
  );
  const pendingJessicaWaterOfLifeOwner =
    pendingAction.kind === "jessica-water-of-life" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaReverendMotherOwner =
    pendingAction.kind === "jessica-reverend-mother" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
  const pendingJessicaReverendMotherSpace =
    pendingAction.kind === "jessica-reverend-mother" ? boardSpaces.find((space) => space.id === pendingAction.spaceId) : undefined;
  const pendingJessicaOtherMemoriesOwner =
    pendingAction.kind === "jessica-other-memories" ? game.players.find((player) => player.id === pendingAction.ownerId) : undefined;
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
          {pendingAction.kind === "acquire-card" && `${pendingAcquireOwner?.leader ?? "Player"} acquisition`}
          {pendingAction.kind === "discard-card-for-influence-and-draw" && `${pendingDiscardInfluenceDrawOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "lose-influence-for-intrigues" && `${pendingInfluenceIntrigueOwner?.leader ?? "Player"} ${pendingAction.source} reveal`}
          {pendingAction.kind === "maker-choice" && `${pendingMakerLabel ?? "Player"} Maker space`}
          {pendingAction.kind === "sietch-tabr" && `${pendingSietchLabel ?? "Player"} Sietch Tabr`}
          {pendingAction.kind === "commander-resource-split" && `${pendingResourceSplitCommander?.leader ?? "Commander"} ${pendingAction.source}`}
          {pendingAction.kind === "shaddam-signet-ring" && `${pendingShaddamSignetCommander?.leader ?? "Shaddam"} Emperor of the Known Universe`}
          {pendingAction.kind === "irulan-signet-ring" && `${pendingIrulanSignetOwner?.leader ?? "Princess Irulan"} Chronicler's Insight`}
          {pendingAction.kind === "staban-unseen-network" && `${pendingStabanUnseenNetworkOwner?.leader ?? "Staban Tuek"} Unseen Network`}
          {pendingAction.kind === "amber-desert-scouts" && `${pendingLadyAmberDesertScoutsOwner?.leader ?? "Lady Amber"} Desert Scouts`}
          {pendingAction.kind === "jessica-spice-agony" && `${pendingJessicaSpiceAgonyOwner?.leader ?? "Lady Jessica"} Spice Agony`}
          {pendingAction.kind === "jessica-water-of-life" && `${pendingJessicaWaterOfLifeOwner?.leader ?? "Reverend Mother Jessica"} Water of Life`}
          {pendingAction.kind === "jessica-reverend-mother" && `${pendingJessicaReverendMotherOwner?.leader ?? "Reverend Mother Jessica"} Reverend Mother`}
          {pendingAction.kind === "jessica-other-memories" && `${pendingJessicaOtherMemoriesOwner?.leader ?? "Lady Jessica"} Other Memories`}
          {pendingAction.kind === "conflict-influence" && `${pendingConflictInfluenceOwner?.leader ?? "Player"} Conflict Influence`}
          {pendingAction.kind === "board-influence-choice" && `${pendingAction.source} Influence`}
          {pendingAction.kind === "optional-space-payment" && `${pendingOptionalSpacePaymentOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "conflict-vp-conversion" && `${pendingConflictVpOwner?.leader ?? "Player"} Conflict reward`}
          {pendingAction.kind === "command-respect" && `${pendingCommandRespectCommander?.leader ?? "Muad'Dib"} Command Respect`}
          {pendingAction.kind === "demand-results" && `${pendingDemandResultsCommander?.leader ?? "Shaddam"} Demand Results`}
          {pendingAction.kind === "corrino-might" && `${pendingCorrinoMightCommander?.leader ?? "Shaddam"} Corrino Might`}
          {pendingAction.kind === "pay-resource-for-strength" && `${pendingPayResourceStrengthOwner?.leader ?? "Player"} ${pendingAction.source}`}
          {pendingAction.kind === "demand-attention" && `${pendingDemandAttentionCommander?.leader ?? "Muad'Dib"} Demand Attention`}
          {pendingAction.kind === "desert-call" && `${pendingDesertCallCommander?.leader ?? "Muad'Dib"} Desert Call`}
          {pendingAction.kind === "threaten-spice-production" && `${pendingThreatenSpiceCommander?.leader ?? "Muad'Dib"} Threaten Spice Production`}
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

      {pendingAction.kind === "shaddam-signet-ring" && (
        <PendingShaddamSignetPanel
          ally={pendingShaddamSignetAlly}
          commander={pendingShaddamSignetCommander}
          onChoose={chooseShaddamSignet}
        />
      )}

      {pendingAction.kind === "irulan-signet-ring" && (
        <PendingIrulanSignetPanel
          acquireCount={pendingIrulanSignetAcquireCards.length}
          owner={pendingIrulanSignetOwner}
          trashCount={pendingIrulanSignetTrashChoices.length}
          onChoose={chooseIrulanSignet}
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

      {pendingAction.kind === "jessica-spice-agony" && (
        <PendingJessicaSpiceAgonyPanel
          canPay={pendingJessicaSpiceAgonyCanPay}
          memoryLabel={memoryCountLabel(pendingJessicaSpiceAgonyOwner?.jessicaMemories ?? 0)}
          owner={pendingJessicaSpiceAgonyOwner}
          troopSupplyLabel={troopSupplyLabel(pendingJessicaSpiceAgonyTroopSupply)}
          onChoose={chooseJessicaSpiceAgony}
        />
      )}

      {pendingAction.kind === "jessica-water-of-life" && (
        <PendingJessicaWaterOfLifePanel
          owner={pendingJessicaWaterOfLifeOwner}
          onChoose={chooseJessicaWaterOfLife}
        />
      )}

      {pendingAction.kind === "jessica-reverend-mother" && (
        <PendingJessicaReverendMotherPanel
          owner={pendingJessicaReverendMotherOwner}
          space={pendingJessicaReverendMotherSpace}
          onChoose={chooseJessicaReverendMother}
        />
      )}

      {pendingAction.kind === "jessica-other-memories" && (
        <PendingJessicaOtherMemoriesPanel
          memoryLabel={memoryCountLabel(pendingJessicaOtherMemoriesOwner?.jessicaMemories ?? 0)}
          owner={pendingJessicaOtherMemoriesOwner}
          onChoose={chooseJessicaOtherMemories}
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

      {pendingAction.kind === "command-respect" && (
        <PendingCommandRespectPanel
          commander={pendingCommandRespectCommander}
          partners={pendingCommandRespectPartners}
          onSkip={skipCommandRespectChoice}
          onTrade={chooseCommandRespectTrade}
        />
      )}

      {pendingAction.kind === "demand-results" && (
        <PendingDemandResultsPanel
          allies={pendingDemandResultsAllies}
          contracts={pendingDemandResultsContracts}
          onChoose={chooseDemandResults}
          onSkip={skipDemandResultsChoice}
        />
      )}

      {pendingAction.kind === "corrino-might" && (
        <PendingCorrinoMightPanel
          allies={pendingCorrinoMightAllies}
          commander={pendingCorrinoMightCommander}
          cost={pendingAction.cost}
          onChoose={chooseCorrinoMight}
          onSkip={skipCorrinoMightChoice}
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

      {pendingAction.kind === "demand-attention" && (
        <PendingDemandAttentionPanel
          factionLabel={factionLabels[pendingAction.faction]}
          recipient={pendingDemandAttentionRecipient}
          onChoose={chooseDemandAttention}
          onSkip={skipDemandAttentionChoice}
        />
      )}

      {pendingAction.kind === "desert-call" && (
        <PendingDesertCallPanel
          ally={pendingDesertCallAlly}
          onChoose={chooseDesertCall}
          onSkip={skipDesertCallChoice}
        />
      )}

      {pendingAction.kind === "threaten-spice-production" && (
        <PendingThreatenSpiceProductionPanel
          canPay={pendingThreatenSpiceCanPay}
          commander={pendingThreatenSpiceCommander}
          contributorIds={pendingAction.contributorIds}
          contributions={pendingAction.contributions}
          contributors={pendingThreatenSpiceContributors}
          cost={pendingAction.cost}
          total={pendingThreatenSpiceTotal}
          onAdjust={adjustThreatenSpiceProduction}
          onPay={chooseThreatenSpiceProduction}
          onSkip={skipThreatenSpiceProductionChoice}
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
          publicOnly={pendingAction.publicOnly}
          reservedContracts={reservedContractChoices}
          onCollectFallback={collectContractFallback}
          onTakeContract={takeContract}
        />
      )}

      {pendingAction.kind === "acquire-card" && pendingAcquireOwner && (
        <PendingAcquireCardPanel
          cards={pendingAcquireCards}
          maxCost={pendingAction.maxCost}
          owner={pendingAcquireOwner}
          onAcquireCard={acquirePendingCard}
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
