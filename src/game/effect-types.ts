import type {
  AcquireCardDestination,
  AcquireCardPendingConstraint,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  EffectAmountSpec,
  FactionId,
  GameEffectTrigger,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  InfluenceLossForStrengthAlternateOwner,
  InfluenceLossForStrengthOwner,
  LeaderCounterId,
  PaidRewardChoiceSelector,
  PlayerSelector,
  ResourceId,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamId,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
  TrashCardZone,
  TroopEffectDestination,
  TroopEffectRecipient,
  TroopRetreatBoundSpec,
  Role,
} from "./core-types";

export type PaidRewardChoiceEffectAtomicReward =
  | {
      kind: "recruit-troops";
      selector: PaidRewardChoiceSelector;
      amount: EffectAmountSpec;
      destination: TroopEffectDestination;
    }
  | {
      kind: "gain-influence";
      selector: PaidRewardChoiceSelector;
      faction: FactionId;
      amount: EffectAmountSpec;
    }
  | {
      kind: "gain-resource";
      selector: PaidRewardChoiceSelector;
      resource: ResourceId;
      amount: EffectAmountSpec;
    }
  | {
      kind: "draw-intrigues";
      selector: PaidRewardChoiceSelector;
      amount: EffectAmountSpec;
    }
  | {
      kind: "gain-leader-counter";
      selector: PaidRewardChoiceSelector;
      counter: LeaderCounterId;
      amount: EffectAmountSpec;
      troopSupplyCost: EffectAmountSpec;
    };
export type PaidRewardChoiceEffectReward =
  | PaidRewardChoiceEffectAtomicReward
  | { kind: "bundle"; rewards: PaidRewardChoiceEffectAtomicReward[] };
export type PaidRewardChoiceEffectOption = {
  id: string;
  resource: ResourceId;
  cost: EffectAmountSpec;
  reward: PaidRewardChoiceEffectReward;
};
export type PaidRewardChoicePendingAtomicReward =
  | {
      kind: "recruit-troops";
      recipientId: string;
      amount: number;
      destination: TroopEffectDestination;
    }
  | {
      kind: "gain-influence";
      recipientId: string;
      faction: FactionId;
      amount: number;
    }
  | {
      kind: "gain-resource";
      recipientId: string;
      resource: ResourceId;
      amount: number;
    }
  | {
      kind: "draw-intrigues";
      recipientId: string;
      amount: number;
    }
  | {
      kind: "gain-leader-counter";
      recipientId: string;
      counter: LeaderCounterId;
      amount: number;
      troopSupplyCost: number;
    };
export type PaidRewardChoicePendingReward =
  | PaidRewardChoicePendingAtomicReward
  | { kind: "bundle"; rewards: PaidRewardChoicePendingAtomicReward[] };
export type PaidRewardChoicePendingOption = {
  id: string;
  resource: ResourceId;
  cost: number;
  reward: PaidRewardChoicePendingReward;
};
export type PendingActionChoiceEffect =
  | {
      kind: "acquire-card";
      selector: "self";
      minCost?: EffectAmountSpec;
      maxCost?: EffectAmountSpec;
      destination: AcquireCardDestination;
      paymentResource?: ResourceId;
      optional?: boolean;
      source?: string;
    }
  | {
      kind: "trash-card";
      selector: "self";
      optional?: boolean;
      zones?: TrashCardZone[];
      excludeSource?: boolean;
      requiredTrait?: string;
      spiceRewardCostThreshold?: EffectAmountSpec;
      spiceReward?: EffectAmountSpec;
      source?: string;
    };
export type PendingActionChoiceEffectOption = {
  id: string;
  label: string;
  effect: PendingActionChoiceEffect;
};
export type PendingActionChoiceNestedPending =
  | ({
      kind: "acquire-card";
      ownerId: string;
      source: string;
      minCost?: number;
      destination: AcquireCardDestination;
      optional?: boolean;
    } & AcquireCardPendingConstraint)
  | {
      kind: "trash-card";
      ownerId: string;
      source: string;
      optional: boolean;
      zones?: TrashCardZone[];
      excludeCardId?: string;
      requiredTrait?: string;
      spiceRewardCostThreshold?: number;
      spiceReward?: number;
    };
export type PendingActionChoicePendingOption = {
  id: string;
  label: string;
  pending: PendingActionChoiceNestedPending;
};
export type GameEffectConditionSpec =
  | { kind: "visited-maker-space" }
  | { kind: "visited-space-icon"; icon: IconId }
  | { kind: "visited-space-has-spy-post" }
  | { kind: "has-spy-post-on-maker-space" }
  | { kind: "has-combat-recipient" }
  | { kind: "has-combat-recipient-sandworms"; count: number }
  | { kind: "has-spy-posts"; count: number }
  | { kind: "has-conflict-units"; count: number }
  | { kind: "has-influence"; faction: FactionId; amount: number }
  | { kind: "has-completed-contracts"; count: number }
  | { kind: "has-card-trait-in-play"; trait: string; count?: number }
  | { kind: "has-team"; team: TeamId }
  | { kind: "has-role"; role: Role }
  | { kind: "has-high-council-seat" }
  | { kind: "has-swordmaster-bonus" }
  | { kind: "has-leader"; leader: string }
  | { kind: "has-leader-counter"; counter: LeaderCounterId; amount: number }
  | { kind: "has-alliance"; faction?: FactionId }
  | { kind: "deployed-units-this-turn"; count: number }
  | { kind: "gained-spice-this-turn" };
export type LeaderTransitionFollowUpEffect =
  | {
      kind: "repeat-board-space";
      sameSpace: true;
      ability: "reverend-mother-jessica";
      source: string;
      resource: ResourceId;
      cost: EffectAmountSpec;
    };
export type GameEffectSpec =
  | { kind: "gain-resource"; selector: PlayerSelector; resource: ResourceId; amount: EffectAmountSpec; source?: string }
  | { kind: "spend-resource"; selector: PlayerSelector; resource: ResourceId; amount: EffectAmountSpec; source?: string }
  | { kind: "lose-influence"; selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec }
  | { kind: "gain-influence"; selector: PlayerSelector; faction: FactionId; amount: EffectAmountSpec }
  | { kind: "gain-persuasion"; selector: PlayerSelector; amount: EffectAmountSpec }
  | { kind: "gain-strength"; selector: PlayerSelector; amount: EffectAmountSpec }
  | { kind: "gain-vp"; selector: PlayerSelector; amount: EffectAmountSpec }
  | { kind: "draw-cards"; selector: PlayerSelector; amount: EffectAmountSpec; source?: string }
  | { kind: "draw-intrigues"; selector: PlayerSelector; amount: EffectAmountSpec }
  | { kind: "activate-acquire-recruit-bonus"; selector: PlayerSelector; amount: EffectAmountSpec }
  | { kind: "remove-shield-wall"; selector: "self"; source?: string }
  | {
      kind: "discard-card";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      optional?: boolean;
      source?: string;
    }
  | {
      kind: "gain-influence-choice";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "gain-board-space-influence";
      selector: "self";
      amount: EffectAmountSpec;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "paid-reward-choice";
      selector: "self";
      options: PaidRewardChoiceEffectOption[];
      requiredRecipient?: "activated-ally";
      requirePayableOption?: true;
      source?: string;
    }
  | {
      kind: "pending-action-choice";
      selector: "self";
      options: PendingActionChoiceEffectOption[];
      source?: string;
    }
  | {
      kind: "leader-transition-choice";
      selector: "self";
      fromLeader: string;
      toLeader: string;
      counter: LeaderCounterId;
      counterAmount: "all";
      drawCardsPerCounter: EffectAmountSpec;
      followUp?: LeaderTransitionFollowUpEffect;
      source?: string;
    }
  | {
      kind: "acquire-card";
      selector: PlayerSelector;
      minCost?: EffectAmountSpec;
      maxCost?: EffectAmountSpec;
      destination: AcquireCardDestination;
      paymentResource?: ResourceId;
      optional?: boolean;
      source?: string;
    }
  | { kind: "recruit-troops"; selector: PlayerSelector; amount: EffectAmountSpec; source?: string }
  | { kind: "deploy-troops"; selector: "self" | "activated-ally"; max: number; source?: string }
  | { kind: "summon-sandworms"; selector: "self" | "activated-ally"; amount: number; source?: string }
  | {
      kind: "retreat-troops-for-strength";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      strength: EffectAmountSpec;
      optional?: boolean;
    }
  | {
      kind: "retreat-troops";
      selector: PlayerSelector;
      min: number;
      max: TroopRetreatBoundSpec;
      source?: string;
    }
  | {
      kind: "trash-card";
      selector: PlayerSelector;
      optional?: boolean;
      zones?: TrashCardZone[];
      excludeSource?: boolean;
      sourceOnly?: boolean;
      requiredTrait?: string;
      strengthReward?: EffectAmountSpec;
      spiceRewardCostThreshold?: EffectAmountSpec;
      spiceReward?: EffectAmountSpec;
      drawCardsReward?: EffectAmountSpec;
    }
  | {
      kind: "lose-influence-for-intrigues";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      optional?: boolean;
    }
  | {
      kind: "lose-influence-for-strength";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      strengthReward: EffectAmountSpec;
      owner: InfluenceLossForStrengthOwner;
      alternateOwner?: InfluenceLossForStrengthAlternateOwner;
      optional: true;
      source?: string;
    }
  | {
      kind: "pay-resource-for-strength";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      strength: EffectAmountSpec;
      optional?: true;
      source?: string;
    }
  | {
      kind: "pay-resource-for-troops";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      troops: EffectAmountSpec;
      recipient: TroopEffectRecipient;
      destination: TroopEffectDestination;
      optional?: true;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "pay-resource-for-draw-cards";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      drawCards: EffectAmountSpec;
      optional?: true;
      source?: string;
    }
  | {
      kind: "pay-resource-for-sandworms";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      sandworms: EffectAmountSpec;
      recipient: SandwormEffectRecipient;
      destination: SandwormEffectDestination;
      optional?: true;
      trashSource?: boolean;
      persuasionCost?: EffectAmountSpec;
      source?: string;
    }
  | {
      kind: "discard-card-for-influence-and-draw";
      selector: PlayerSelector;
      drawCards: EffectAmountSpec;
      influenceAmount: EffectAmountSpec;
      optional?: boolean;
    }
  | {
      kind: "discard-card-for-draw";
      selector: PlayerSelector;
      drawCards: EffectAmountSpec;
      optional?: boolean;
      bonusDraw?: {
        requiredDiscardTrait: string;
        drawCards: EffectAmountSpec;
      };
    }
  | {
      kind: "opponents-discard-cards";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      source?: string;
    }
  | {
      kind: "pay-resource-for-influence";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      faction: InfluenceEffectFaction;
      amount: EffectAmountSpec;
      recipient: InfluenceEffectRecipient;
      optional?: true;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "pay-resource-for-contracts";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      contractCount: EffectAmountSpec;
      recipient: ContractEffectRecipient;
      sourcePool: ContractEffectSourcePool;
      optional?: true;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "take-contracts";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      sourcePool: ContractEffectSourcePool;
      optional?: true;
      source?: string;
    }
  | {
      kind: "pay-team-resource-for-vp";
      selector: PlayerSelector;
      resource: ResourceId;
      cost: EffectAmountSpec;
      vp: EffectAmountSpec;
      contributors: TeamResourcePaymentContributor;
      recipient: TeamResourcePaymentRecipient;
      optional?: true;
      trashSource?: boolean;
      source?: string;
    }
  | {
      kind: "commander-resource-split";
      selector: PlayerSelector;
      options: CommanderResourceSplitOption[];
      source?: string;
    }
  | {
      kind: "trash-source-for-trade";
      selector: PlayerSelector;
      partner: TradeEffectPartner;
      resource: TradeGoodId;
      optional?: true;
      partnerLocked?: boolean;
      source?: string;
    }
  | { kind: "block-conflict-deployment"; selector: PlayerSelector; source?: string }
  | { kind: "move-card-to-throne-row"; selector: PlayerSelector; source?: string }
  | { kind: "manipulate-row-card"; selector: PlayerSelector; source?: string }
  | {
      kind: "recall-spy";
      selector: PlayerSelector;
      amount?: EffectAmountSpec;
      source?: string;
      strengthReward?: EffectAmountSpec;
      optional?: boolean;
      reward?: {
        resource: ResourceId;
        amount: EffectAmountSpec;
      };
      removeShieldWall?: boolean;
    }
  | {
      kind: "place-spies";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      recallForSupply?: boolean;
      mustPlace?: boolean;
      placementIcon?: IconId;
      allowSharedPost?: boolean;
      source?: string;
      postPlacementAction?: "staban-unseen-network";
    };
export type CardEffectSpec = {
  trigger: GameEffectTrigger;
  choiceId?: string;
  conditions?: GameEffectConditionSpec[];
  effects: GameEffectSpec[];
};
