import type {
  AcquireCardDestination,
  BoardSpace,
  CommanderResourceSplitOption,
  ContractEffectRecipient,
  ContractEffectSourcePool,
  FactionId,
  GameEffectTrigger,
  GameState,
  IconId,
  InfluenceEffectFaction,
  InfluenceEffectRecipient,
  InfluenceLossForStrengthAlternateOwner,
  InfluenceLossForStrengthOwner,
  LeaderCounterId,
  Player,
  PlayerSelector,
  ResourceId,
  Resources,
  SandwormEffectDestination,
  SandwormEffectRecipient,
  TeamResourcePaymentContributor,
  TeamResourcePaymentRecipient,
  TradeEffectPartner,
  TradeGoodId,
  TrashCardZone,
  TroopEffectDestination,
  TroopEffectRecipient,
} from "./types";

export type SpyPlacementEffectResult = {
  count: number;
  recallForSupply?: boolean;
  mustPlace?: boolean;
  placementIcon?: IconId;
  allowSharedPost?: boolean;
  source?: string;
  postPlacementAction?: "staban-unseen-network";
};

export type SpyRecallEffectResult = {
  spaceId: string;
  source?: string;
};

export type CombatSpyRecallForStrength = {
  selector: PlayerSelector;
  amount: number;
  strength: number;
  optional: boolean;
  source?: string;
};

export type CombatInfluenceLossForStrength = {
  selector: PlayerSelector;
  amount: number;
  strength: number;
  owner: InfluenceLossForStrengthOwner;
  alternateOwner?: InfluenceLossForStrengthAlternateOwner;
  optional: true;
  source?: string;
};

export type CombatRetreatTroops = {
  selector: PlayerSelector;
  count: number;
  min: number;
  max: number;
  source?: string;
};

export type EffectResolverState = Partial<
  Pick<GameState, "alliances" | "players" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spyPosts" | "turnSpiceGains" | "turnUnitDeployments">
>;

export type GameEffectContext = {
  trigger: GameEffectTrigger;
  choiceId?: string;
  selectedTroopCount?: number;
  source: Player;
  target?: Player;
  space?: Pick<BoardSpace, "id" | "icon" | "maker">;
  state?: EffectResolverState;
};

export type DeferredAgentIntrigueDraw = {
  selector: PlayerSelector;
  amount: number;
  minConflictUnits: number;
};

export type RevealRetreatTroopsForStrength = {
  selector: PlayerSelector;
  troopCount: number;
  strength: number;
  optional: boolean;
};

export type TrashCardEffect = {
  selector: PlayerSelector;
  optional: boolean;
  zones?: TrashCardZone[];
  excludeSource: boolean;
  sourceOnly: boolean;
  requiredTrait?: string;
  strengthReward?: number;
  spiceRewardCostThreshold?: number;
  spiceReward?: number;
  drawCardsReward?: number;
};

export type RevealTrashCardEffect = TrashCardEffect;

export type RevealLoseInfluenceForIntrigues = {
  selector: PlayerSelector;
  amount: number;
  optional: boolean;
};

export type RevealPayResourceForStrength = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  strength: number;
  optional: true;
  source?: string;
};

export type RevealPayResourceForTroops = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  troops: number;
  recipient: TroopEffectRecipient;
  destination: TroopEffectDestination;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type RevealPayResourceForSandworms = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  sandworms: number;
  recipient: SandwormEffectRecipient;
  destination: SandwormEffectDestination;
  optional: true;
  trashSource: boolean;
  persuasionCost: number;
  source?: string;
};

export type AgentDiscardCardForInfluenceAndDraw = {
  selector: PlayerSelector;
  drawCards: number;
  influenceAmount: number;
  optional: boolean;
};

export type AgentDiscardCardForDraw = {
  selector: PlayerSelector;
  drawCards: number;
  optional: boolean;
  bonusDraw?: {
    requiredDiscardTrait: string;
    drawCards: number;
  };
  bonusIntrigues?: {
    requiredDiscardTrait: string;
    amount: number;
  };
};

export type AgentTopDeckSelection = {
  selector: PlayerSelector;
  lookCards: number;
  drawCards: number;
  discardCards: number;
  trashCards: number;
  minimumDeckCards: number;
  source?: string;
};

export type AgentTrashIntrigueForReward = {
  selector: PlayerSelector;
  cost: Partial<Resources>;
  drawIntrigues: number;
  gain: Partial<Resources>;
  gainVp: number;
  optional: boolean;
  source?: string;
};

export type AgentOpponentsDiscardCards = {
  selector: PlayerSelector;
  amount: number;
  source?: string;
};

export type AgentPaidRewardChoiceAtomicReward =
  | {
      kind: "recruit-troops";
      selector: "self" | "activated-ally";
      amount: number;
      destination: "garrison";
    }
  | {
      kind: "gain-influence";
      selector: "self" | "activated-ally";
      faction: FactionId;
      amount: number;
    }
  | {
      kind: "gain-resource";
      selector: "self" | "activated-ally";
      resource: ResourceId;
      amount: number;
    }
  | {
      kind: "draw-intrigues";
      selector: "self" | "activated-ally";
      amount: number;
    }
  | {
      kind: "gain-leader-counter";
      selector: "self" | "activated-ally";
      counter: "jessicaMemories";
      amount: number;
      troopSupplyCost: number;
    };

type AgentPaidRewardChoiceReward =
  | AgentPaidRewardChoiceAtomicReward
  | { kind: "bundle"; rewards: AgentPaidRewardChoiceAtomicReward[] };

type AgentPaidRewardChoiceOption = {
  id: string;
  resource: ResourceId;
  cost: number;
  reward: AgentPaidRewardChoiceReward;
};

export type AgentPaidRewardChoice = {
  selector: "self";
  options: AgentPaidRewardChoiceOption[];
  requiredRecipient?: "activated-ally";
  requirePayableOption?: true;
  source?: string;
};

export type AgentPendingActionChoice = {
  selector: "self";
  options: Array<
    | {
        id: string;
        label: string;
        effect: {
          kind: "acquire-card";
          selector: "self";
          minCost?: number;
          maxCost?: number;
          destination: AcquireCardDestination;
          paymentResource?: ResourceId;
          optional: boolean;
          source?: string;
        };
      }
    | {
        id: string;
        label: string;
        effect: {
          kind: "trash-card";
          selector: "self";
          optional: boolean;
          zones?: TrashCardZone[];
          excludeSource: boolean;
          requiredTrait?: string;
          spiceRewardCostThreshold?: number;
          spiceReward?: number;
          source?: string;
        };
      }
  >;
  source?: string;
};

export type LeaderTransitionChoice = {
  selector: "self";
  source?: string;
  fromLeader: string;
  toLeader: string;
  counter: LeaderCounterId;
  counterAmount: "all";
  drawCardsPerCounter: number;
  followUp?: {
    kind: "repeat-board-space";
    sameSpace: true;
    ability: "reverend-mother-jessica";
    source: string;
    resource: ResourceId;
    cost: number;
  };
};

export type AgentAcquireCard = {
  selector: PlayerSelector;
  minCost?: number;
  maxCost?: number;
  destination: AcquireCardDestination;
  paymentResource?: ResourceId;
  optional: boolean;
  source?: string;
};

export type DiscardCardEffect = {
  selector: PlayerSelector;
  amount: number;
  optional: boolean;
  source?: string;
};

export type PlotDeployTroops = {
  selector: "self" | "activated-ally";
  max: number;
  source?: string;
};

export type PlotSummonSandworms = {
  selector: "self" | "activated-ally";
  amount: number;
  source?: string;
};

export type AgentGainInfluenceChoice = {
  selector: PlayerSelector;
  amount: number;
  trashSource: boolean;
  source?: string;
};

export type AgentBoardSpaceInfluence = {
  selector: "self";
  amount: number;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForInfluence = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  faction: InfluenceEffectFaction;
  amount: number;
  recipient: InfluenceEffectRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentPayResourceForSandworms = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  sandworms: number;
  recipient: SandwormEffectRecipient;
  destination: SandwormEffectDestination;
  optional: true;
  trashSource: boolean;
  persuasionCost: number;
  source?: string;
};

export type AgentPayResourceForContracts = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  contractCount: number;
  recipient: ContractEffectRecipient;
  sourcePool: ContractEffectSourcePool;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type TakeContractsEffect = {
  selector: PlayerSelector;
  amount: number;
  sourcePool: ContractEffectSourcePool;
  optional: boolean;
  source?: string;
};

export type InfluenceAdjustmentEffect = {
  selector: PlayerSelector;
  faction: FactionId;
  amount: number;
};

export type ManipulateRowCardEffect = {
  selector: PlayerSelector;
  source?: string;
};

export type AgentPayResourceForDrawCards = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  drawCards: number;
  optional: true;
  source?: string;
};

export type AgentPayTeamResourceForVp = {
  selector: PlayerSelector;
  resource: ResourceId;
  cost: number;
  vp: number;
  contributors: TeamResourcePaymentContributor;
  recipient: TeamResourcePaymentRecipient;
  optional: true;
  trashSource: boolean;
  source?: string;
};

export type AgentMoveCardToThroneRow = {
  selector: PlayerSelector;
  source?: string;
};

export type AgentCommanderResourceSplit = {
  selector: PlayerSelector;
  options: CommanderResourceSplitOption[];
  source?: string;
};

export type AgentTrashSourceForTrade = {
  selector: PlayerSelector;
  partner: TradeEffectPartner;
  resource: TradeGoodId;
  optional: true;
  partnerLocked: boolean;
  source?: string;
};

export type PlayerEffectResult = {
  cardsToDraw: number;
  drawCardsSource?: string;
  blocksDeploymentsThisTurn: boolean;
  deploymentBlockSource?: string;
  influenceGains: Partial<Record<FactionId, number>>;
  intriguesToDraw: number;
  recruitedTroops: number;
  recruitedTroopsSource?: string;
  revealGain: Partial<Resources>;
  revealGainSource?: string;
  spentResources: Partial<Resources>;
  spyPlacements: SpyPlacementEffectResult[];
};

export type GameEffectResult = PlayerEffectResult & {
  acquireRecruitBonus: number;
  activatedAlly: PlayerEffectResult;
  influenceAdjustments: InfluenceAdjustmentEffect[];
  influenceLosses: Partial<Record<FactionId, number>>;
  persuasion: number;
  recalledAgents: number;
  recalledAgentSource?: string;
  removeShieldWall: boolean;
  spyRecalls: SpyRecallEffectResult[];
  swords: number;
  vp: number;
};

export const emptyPlayerEffectResult: PlayerEffectResult = {
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  influenceGains: {},
  intriguesToDraw: 0,
  recruitedTroops: 0,
  revealGain: {},
  spentResources: {},
  spyPlacements: [],
};

export const emptyEffectResult: GameEffectResult = {
  acquireRecruitBonus: 0,
  cardsToDraw: 0,
  blocksDeploymentsThisTurn: false,
  influenceGains: {},
  influenceAdjustments: [],
  influenceLosses: {},
  intriguesToDraw: 0,
  recruitedTroops: 0,
  persuasion: 0,
  recalledAgents: 0,
  removeShieldWall: false,
  revealGain: {},
  spentResources: {},
  spyPlacements: [],
  spyRecalls: [],
  swords: 0,
  vp: 0,
  activatedAlly: emptyPlayerEffectResult,
};
