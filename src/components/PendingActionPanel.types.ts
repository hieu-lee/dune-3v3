import type {
  LadyAmberDesertScoutsChoice,
  LeaderTransitionChoice,
  RepeatBoardSpaceChoice,
  StabanUnseenNetworkChoice,
  TopDeckSelectionChoice,
} from "../game/state";
import type { FactionId, GameState, PendingAction, TradeGoodId, TrashCardZone } from "../game/types";

export type PendingActionPanelProps = {
  game: GameState;
  pendingAction: PendingAction;
  viewerPlayerId?: string;
  acquirePendingCard: (cardId: string) => void;
  adjustTeamResourcePayment: (contributorId: string, delta: number) => void;
  chooseCommanderResourceSplit: (optionIndex: number) => void;
  chooseConflictInfluence: (faction: FactionId) => void;
  chooseBoardInfluence: (ownerId: string, faction: FactionId) => void;
  chooseConflictTieWinner: (winnerId?: string) => void;
  chooseDiscardCardsForReward: (discardCardId: string) => void;
  chooseDiscardCardForDraw: (discardCardId: string) => void;
  chooseDiscardHandCard: (discardCardId: string) => void;
  chooseDiscardCardForInfluenceAndDraw: (discardCardId: string, faction: FactionId) => void;
  chooseDeployOrRetreatTroops: (choice: "deploy" | "retreat") => void;
  chooseLoseInfluenceForIntrigues: (faction: FactionId) => void;
  choosePendingActionChoice: (optionId: string) => void;
  chooseLeaderTransition: (choice: LeaderTransitionChoice) => void;
  chooseLadyAmberDesertScouts: (choice: LadyAmberDesertScoutsChoice) => void;
  chooseMakerReward: (choice: "spice" | "sandworms") => void;
  choosePayResourceForContracts: (optionIndex: number) => void;
  choosePayResourceForDrawCards: () => void;
  choosePayResourceForHighCouncilSeat: () => void;
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
  chooseTopDeckSelection: (choice: TopDeckSelectionChoice) => void;
  chooseTrashIntrigueForReward: (intrigueId: string) => void;
  chooseTrashSourceForTrade: (partnerId: string) => void;
  clearPendingAction: () => void;
  collectContractFallback: () => void;
  deployControlDefense: () => void;
  deployOne: () => void;
  loseInfluence: (ownerId: string, faction: FactionId) => void;
  payConflictVpReward: () => void;
  payOptionalSpacePayment: () => void;
  placeSpy: (spaceId: string) => void;
  recallConflictRewardSpy: (spaceId: string) => void;
  recallSpy: (spaceId: string) => void;
  recallSpyForSupply: (spaceId: string) => void;
  reinforceOne: (playerId: string, destination: "garrison" | "conflict") => void;
  skipDiscardCardsForRewardChoice: () => void;
  skipDiscardCardForDrawChoice: () => void;
  skipDiscardCardForInfluenceAndDrawChoice: () => void;
  skipDeployOrRetreatTroops: () => void;
  skipLoseInfluenceForIntriguesChoice: () => void;
  skipControlDefense: () => void;
  skipConflictVpReward: () => void;
  skipInfluenceLoss: () => void;
  skipOptionalSpacePaymentChoice: () => void;
  skipPaidReward: () => void;
  skipPendingActionChoiceHandler: () => void;
  skipPayResourceForContractsChoice: () => void;
  skipPayResourceForDrawCardsChoice: () => void;
  skipPayResourceForHighCouncilSeatChoice: () => void;
  skipPayResourceForInfluenceChoice: () => void;
  skipPayResourceForSandwormsChoice: () => void;
  skipPayResourceForStrengthChoice: () => void;
  skipPayResourceForTroopsChoice: () => void;
  skipRecall: () => void;
  skipRetreatTroopsForStrengthChoice: () => void;
  skipTeamResourcePaymentChoice: () => void;
  skipTopDeckSelection: () => void;
  skipTrash: () => void;
  skipTrashIntrigueForRewardChoice: () => void;
  skipTrashSourceForTradeChoice: () => void;
  takeContract: (contractId: string) => void;
  transferTrade: (fromId: string, toId: string, intrigueId?: string) => void;
  trashCard: (zone: TrashCardZone, cardId: string, choiceIndex?: number) => void;
  updateTrade: (resource: TradeGoodId, partnerId?: string) => void;
};
