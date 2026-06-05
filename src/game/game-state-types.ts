import type {
  AcquireCardDestination,
  AcquireCardPendingConstraint,
  AllianceOwners,
  CommanderResourceSplitOption,
  CriticalLocationId,
  FactionId,
  GamePhase,
  IconId,
  LeaderCounterId,
  ResourceId,
  Resources,
  SandwormEffectDestination,
  TeamId,
  TradeGoodId,
  TrashCardZone,
  TroopEffectDestination,
} from "./core-types";
import type {
  BoardSpace,
  Card,
  ConflictCard,
  ContractCard,
  IntrigueCard,
  Player,
} from "./card-types";
import type {
  PaidRewardChoicePendingOption,
  PendingActionChoicePendingOption,
} from "./effect-types";

export type FeydTrainingReward =
  | "pay-solari-trash"
  | "trash"
  | "spy"
  | "spy-spice"
  | "troop-spy";

export type FeydTrainingPendingOption = {
  id: string;
  label: string;
  reward: FeydTrainingReward;
};

export type PostDeployIntrigueDraw = {
  recipientId: string;
  conditionOwnerId: string;
  amount: number;
  minConflictUnits: number;
  source: string;
};

export type PendingAction =
  | {
      kind: "deploy";
      ownerId: string;
      remaining: number;
      source: string;
      conflictBlocked?: boolean;
      postDeployIntrigueDraw?: PostDeployIntrigueDraw;
    }
  | {
      kind: "control-defense";
      ownerId: string;
      location: CriticalLocationId;
      source: string;
    }
  | {
      kind: "reinforce";
      team: TeamId;
      remaining: number;
      source: string;
      conflictBlocked?: boolean;
    }
  | {
      kind: "trade";
      actorId: string;
      partnerId: string;
      resource: TradeGoodId;
      actorGiven: number;
      partnerGiven: number;
      partnerLocked?: boolean;
      source: string;
    }
  | {
      kind: "spy";
      ownerId: string;
      remaining: number;
      source: string;
      placementIcon?: IconId;
      placementIcons?: IconId[];
      recallForSupply?: boolean;
      mustPlaceSpy?: boolean;
      allowSharedPost?: boolean;
      postPlacementAction?: "staban-unseen-network";
    }
  | {
      kind: "recall-spy";
      ownerId: string;
      combatRecipientId: string;
      remaining: number;
      strength: number;
      persuasionReward?: number;
      source: string;
      optional: boolean;
      drawIntrigues?: number;
    }
  | {
      kind: "lose-influence";
      ownerId: string;
      alternateOwnerIds?: string[];
      combatRecipientId: string;
      strength: number;
      source: string;
      optional: boolean;
    }
  | {
      kind: "conflict-influence";
      ownerId: string;
      remaining: number;
      source: string;
      choices?: FactionId[];
    }
  | {
      kind: "board-influence-choice";
      source: string;
      sourceTrigger?: "acquire";
      sourceEffect?: "gain-influence-choice" | "gain-board-space-influence";
      amount?: number;
      trashSource?: boolean;
      requiredHandTrashTrait?: string;
      cardId?: string;
      cardOwnerId?: string;
      targetOwnerId?: string;
      spaceId?: string;
      choices: Array<{
        ownerId: string;
        faction: FactionId;
      }>;
    }
  | {
      kind: "optional-space-payment";
      ownerId: string;
      source: string;
      cost: Partial<Resources>;
      gain: Partial<Resources>;
    }
  | {
      kind: "trash-card";
      ownerId: string;
      source: string;
      optional: boolean;
      zones?: TrashCardZone[];
      excludeCardId?: string;
      requiredCardId?: string;
      requiredAgentPlacementSpaceId?: string;
      requiredAgentPlacementTargetOwnerId?: string;
      requiredTrait?: string;
      spiceRewardCostThreshold?: number;
      spiceReward?: number;
      persuasionCost?: number;
      resourceCost?: Partial<Resources>;
      combatRecipientId?: string;
      strengthReward?: number;
      drawCardsReward?: number;
      vpReward?: number;
    }
  | {
      kind: "recall-agent-from-board";
      ownerId: string;
      source: string;
      spaceIds: string[];
    }
  | {
      kind: "draw-cards";
      ownerId: string;
      source: string;
      amount: number;
    }
  | {
      kind: "retreat-troops-for-strength";
      ownerId: string;
      combatRecipientId: string;
      troopCount: number;
      strength: number;
      source: string;
      optional: boolean;
    }
  | {
      kind: "lose-influence-for-influence";
      ownerId: string;
      influenceOwnerId?: string;
      source: string;
      loseAmount: number;
      gainAmount: number;
      optional: boolean;
    }
  | {
      kind: "deploy-or-retreat-troops";
      ownerId: string;
      recipientId: string;
      troopCount: number;
      source: string;
      optional: boolean;
    }
  | {
      kind: "pay-resource-for-strength";
      ownerId: string;
      combatRecipientId: string;
      resource: ResourceId;
      cost: number;
      strength: number;
      source: string;
      optional: true;
      cardId?: string;
    }
  | {
      kind: "pay-resource-for-high-council-seat";
      ownerId: string;
      resource: ResourceId;
      cost: number;
      optional: true;
      persuasionCost: number;
      persuasionReward: number;
      source: string;
      cardId: string;
    }
  | {
      kind: "pay-resource-for-troops";
      ownerId: string;
      recipientIds: string[];
      resource: ResourceId;
      cost: number;
      troops: number;
      destination: TroopEffectDestination;
      optional: true;
      trashSource?: boolean;
      cardId?: string;
      source: string;
    }
  | {
      kind: "pay-resource-for-draw-cards";
      ownerId: string;
      resource: ResourceId;
      cost: number;
      drawCards: number;
      optional: true;
      source: string;
      cardId?: string;
    }
  | {
      kind: "contract";
      ownerId: string;
      source: string;
      spaceId?: string;
      publicOnly?: boolean;
      allowFallback?: boolean;
      optional?: true;
    }
  | ({
      kind: "acquire-card";
      ownerId: string;
      source: string;
      minCost?: number;
      destination: AcquireCardDestination;
      optional?: boolean;
    } & AcquireCardPendingConstraint)
  | {
      kind: "discard-card-for-influence-and-draw";
      ownerId: string;
      influenceOwnerId?: string;
      source: string;
      drawCards: number;
      influenceAmount: number;
      optional: boolean;
    }
  | {
      kind: "discard-card-for-draw";
      ownerId: string;
      source: string;
      drawCards: number;
      drawIntrigues?: number;
      optional: boolean;
      bonusDraw?: {
        requiredDiscardTrait: string;
        drawCards: number;
      };
      bonusIntrigues?: {
        requiredDiscardTrait: string;
        amount: number;
      };
    }
  | {
      kind: "discard-cards-for-reward";
      ownerId: string;
      source: string;
      remaining: number;
      total: number;
      discardedCardNames?: string[];
      cost: Partial<Resources>;
      gain: Partial<Resources>;
      gainVp: number;
      takeContracts?: {
        amount: number;
        sourcePool: "public-offer";
      };
      optional: boolean;
    }
  | {
      kind: "top-deck-selection";
      ownerId: string;
      source: string;
      lookCards: number;
      drawCards: number;
      discardCards: number;
      trashCards: number;
      inspectedCards?: Card[];
    }
  | {
      kind: "trash-intrigue-for-reward";
      ownerId: string;
      source: string;
      cost: Partial<Resources>;
      drawIntrigues: number;
      gain: Partial<Resources>;
      gainVp: number;
      optional: boolean;
      discard?: boolean;
    }
  | {
      kind: "lose-influence-for-intrigues";
      ownerId: string;
      source: string;
      amount: number;
      optional: boolean;
    }
  | {
      kind: "discard-hand-card";
      ownerId: string;
      source: string;
      remaining: number;
    }
  | {
      kind: "pay-resource-for-influence";
      ownerId: string;
      influenceOwnerId: string;
      resource: ResourceId;
      cost: number;
      faction: FactionId;
      amount: number;
      optional: true;
      trashSource?: boolean;
      cardId?: string;
      source: string;
    }
  | {
      kind: "pay-resource-for-sandworms";
      ownerId: string;
      recipientId: string;
      resource: ResourceId;
      cost: number;
      sandworms: number;
      strength: number;
      destination: SandwormEffectDestination;
      optional: true;
      trashSource?: boolean;
      persuasionCost?: number;
      cardId?: string;
      source: string;
    }
  | {
      kind: "maker-choice";
      ownerId: string;
      spiceOwnerId: string;
      spice: number;
      sandworms: number;
      canSummonSandworms: boolean;
      source: string;
      spaceId: string;
      postDeployIntrigueDraw?: PostDeployIntrigueDraw;
    }
  | {
      kind: "sietch-tabr";
      ownerId: string;
      waterOwnerId: string;
      canTakeMakerHooks: boolean;
      canRemoveShieldWall: boolean;
      source: string;
      spaceId: string;
      extraRecruitedTroops?: number;
      conflictBlocked?: boolean;
      postDeployIntrigueDraw?: PostDeployIntrigueDraw;
    }
  | {
      kind: "throne-row";
      ownerId: string;
      source: string;
    }
  | {
      kind: "commander-resource-split";
      commanderId: string;
      allyId: string;
      team: TeamId;
      source: string;
      options: CommanderResourceSplitOption[];
    }
  | {
      kind: "trash-source-for-trade";
      ownerId: string;
      partnerIds: [string, string];
      cardId: string;
      resource: TradeGoodId;
      optional: true;
      partnerLocked?: boolean;
      source: string;
    }
  | {
      kind: "pay-resource-for-contracts";
      ownerId: string;
      recipientIds: [string, string];
      contractIds: [string, string];
      resource: ResourceId;
      cost: number;
      optional: true;
      trashSource?: boolean;
      cardId: string;
      source: string;
    }
  | {
      kind: "paid-reward-choice";
      ownerId: string;
      cardId?: string;
      source: string;
      requirePayableOption?: true;
      options: PaidRewardChoicePendingOption[];
    }
  | {
      kind: "pending-action-choice";
      ownerId: string;
      cardId?: string;
      source: string;
      optional?: boolean;
      options: PendingActionChoicePendingOption[];
    }
  | {
      kind: "feyd-training";
      ownerId: string;
      cardId: string;
      source: string;
      nextPosition: number;
      canDeployTroop?: boolean;
      options: FeydTrainingPendingOption[];
    }
  | {
      kind: "team-resource-payment";
      ownerId: string;
      contributorIds: string[];
      contributions: Record<string, number>;
      resource: ResourceId;
      cost: number;
      vp: number;
      optional: true;
      trashSource?: boolean;
      cardId: string;
      spaceId?: string;
      source: string;
    }
  | {
      kind: "staban-unseen-network";
      ownerId: string;
      spaceId: string;
      reward: "landsraad" | "faction";
      source: string;
    }
  | {
      kind: "amber-desert-scouts";
      ownerId: string;
      source: string;
    }
  | {
      kind: "repeat-board-space";
      ownerId: string;
      spaceId: string;
      resource: ResourceId;
      cost: number;
      optional: true;
      ability: "reverend-mother-jessica";
      source: string;
    }
  | {
      kind: "leader-transition";
      ownerId: string;
      source: string;
      fromLeader: string;
      toLeader: string;
      counter: LeaderCounterId;
      counterAmount: "all";
      drawCardsPerCounter: number;
      followUp?: {
        kind: "repeat-board-space";
        spaceId: string;
        ability: "reverend-mother-jessica";
        source: string;
        resource: ResourceId;
        cost: number;
      };
    }
  | {
      kind: "conflict-vp-conversion";
      ownerId: string;
      source: string;
      remaining: number;
      vp: number;
      cost:
        | { kind: "resource"; resource: ResourceId; amount: number }
        | { kind: "recall-spies"; count: number; recalled: number };
    }
  | {
      kind: "conflict-tie";
      team: TeamId;
      tiedPlayerIds: string[];
      strength: number;
      rank: 1 | 2 | 3;
      conflictWinnerId?: string | null;
      resolvedRankRewards?: { playerId: string; rank: 2 | 3 }[];
      source: string;
    };
export type ConflictDeploymentBlock = {
  actorId: string;
  ownerId: string;
  source: string;
};

export type GameState = {
  phase: GamePhase;
  round: number;
  activeSeat: number;
  firstSeat: number;
  agentTurnComplete: boolean;
  roundMakerSpaceVisits?: Record<string, boolean>;
  turnHarvestContractIds?: Record<string, string[]>;
  turnMakerSpaceVisits?: Record<string, boolean>;
  turnAcquiredCardIds?: Record<string, string[]>;
  turnSpiceGains: Record<string, number>;
  turnReverendMotherJessicaRepeats: Record<string, boolean>;
  turnSpyRecalls: Record<string, number>;
  players: Player[];
  spaces: Record<string, string>;
  agentPlacementOwners?: Record<string, string>;
  spyPosts: Record<string, string>;
  sharedSpyPosts: Record<string, string[]>;
  alliances: AllianceOwners;
  locationControl: Partial<Record<CriticalLocationId, string>>;
  combatPasses: string[];
  turnUnitDeployments: Record<string, number>;
  makerSpice: Record<string, number>;
  imperiumRow: Card[];
  marketDeck: Card[];
  reserveMarket: Card[];
  throneRow: Card[];
  contractOffer: ContractCard[];
  contractDeck: ContractCard[];
  intrigueDeck: IntrigueCard[];
  intrigueDiscard: IntrigueCard[];
  conflict: ConflictCard | null;
  conflictDeck: ConflictCard[];
  conflictDiscard: ConflictCard[];
  shieldWall: boolean;
  swordmasterClaimed: boolean;
  pendingAction?: PendingAction;
  pendingQueue: PendingAction[];
  conflictDeploymentBlock?: ConflictDeploymentBlock;
  winningTeam?: TeamId;
  endgameReason?: string;
  log: string[];
};
