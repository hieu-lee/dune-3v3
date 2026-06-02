export type TeamId = "muaddib" | "shaddam";
export type Role = "Commander" | "Ally";
export type GamePhase = "playing" | "combat" | "endgame" | "finished";
export type IconId =
  | "emperor"
  | "spacing"
  | "bene"
  | "fremen"
  | "landsraad"
  | "city"
  | "spice"
  | "spy";
export type FactionId =
  | "emperor"
  | "spacing"
  | "bene"
  | "fremen"
  | "greatHouses"
  | "fringeWorlds";
export type ResourceId = "solari" | "spice" | "water";
export type AcquireCardDestination = "discard" | "hand";
export type AcquireCardPendingConstraint =
  | { maxCost: number; paymentResource?: ResourceId }
  | { maxCost?: number; paymentResource: ResourceId };
export type CriticalLocationId = "arrakeen" | "spice-refinery" | "imperial-basin";
export type BattleIconId = "crysknife" | "desertMouse" | "ornithopter";
export type ConflictBattleIconId = BattleIconId | "wild";
export type GameEffectTrigger =
  | "agent-play"
  | "reveal"
  | "acquire"
  | "plot-intrigue"
  | "combat-intrigue"
  | "conflict-reward"
  | "endgame"
  | "round-start"
  | "round-end";
export type PlayerSelector =
  | "self"
  | "activated-ally"
  | "teammate"
  | "opponent"
  | "combat-participant";
export type InfluenceEffectFaction = FactionId | "board-space";
export type InfluenceEffectRecipient = "board-effect-recipient";
export type TroopEffectRecipient = "same-team-allies";
export type TroopEffectDestination = "garrison";
export type SandwormEffectRecipient = "activated-ally" | "combat-recipient";
export type SandwormEffectDestination = "conflict";
export type TradeEffectPartner = "same-team-allies";
export type ContractEffectRecipient = "same-team-allies";
export type ContractEffectSourcePool = "public-offer";
export type TeamResourcePaymentContributor = "self-and-same-team-allies";
export type TeamResourcePaymentRecipient = "self";
export type EffectAmountSpec =
  | number
  | { kind: "completed-contracts"; multiplier?: number };
export type GameEffectConditionSpec =
  | { kind: "visited-maker-space" }
  | { kind: "visited-space-icon"; icon: IconId }
  | { kind: "visited-space-has-spy-post" }
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
  | { kind: "has-alliance"; faction?: FactionId }
  | { kind: "deployed-units-this-turn"; count: number }
  | { kind: "gained-spice-this-turn" };
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
  | {
      kind: "retreat-troops-for-strength";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      strength: EffectAmountSpec;
      optional?: boolean;
    }
  | {
      kind: "trash-card";
      selector: PlayerSelector;
      optional?: boolean;
      zones?: TrashCardZone[];
      excludeSource?: boolean;
      requiredTrait?: string;
      strengthReward?: EffectAmountSpec;
      spiceRewardCostThreshold?: EffectAmountSpec;
      spiceReward?: EffectAmountSpec;
    }
  | {
      kind: "lose-influence-for-intrigues";
      selector: PlayerSelector;
      amount: EffectAmountSpec;
      optional?: boolean;
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
      source?: string;
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

export type Resources = Record<ResourceId, number>;
export type Influence = Record<FactionId, number>;
export type AllianceOwners = Partial<Record<FactionId, string>>;
export type BoardGain = Partial<Resources> & { intrigue?: number };
export type TradeGoodId = ResourceId | "intrigue";
export type CommanderResourceSplitOption = {
  commanderResource: ResourceId;
  commanderAmount: number;
  allyResource: ResourceId;
  allyAmount: number;
};
export type InfluenceRequirement = {
  faction: FactionId;
  amount: number;
};

export type Card = {
  id: string;
  name: string;
  icons: IconId[];
  persuasion: number;
  swords: number;
  acquired?: number;
  conditionalPersuasion?: boolean;
  conditionalSwords?: boolean;
  revealGain?: Partial<Resources>;
  effects?: CardEffectSpec[];
  trashOnPlay?: boolean;
  play: string;
  reveal: string;
  cost?: number;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
  sourceType?: string;
  traits?: string[];
  agentPlacementSpaceId?: string;
  agentPlacementTargetOwnerId?: string;
};

export type ConflictCard = {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  battleIcon: ConflictBattleIconId;
  rewards: string[];
  stakes: string;
  scored?: boolean;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
};

export type ContractCard = {
  id: string;
  name: string;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
};

export type IntrigueCard = {
  id: string;
  name: string;
  summary: string;
  effects?: CardEffectSpec[];
  battleIcon?: BattleIconId;
  combatSwords?: number;
  automatedCombatSwords?: number;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
  traits?: string[];
};

export type LeaderCard = {
  id: string;
  name: string;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
};

export type ObjectiveCard = {
  id: string;
  name: string;
  battleIcon: BattleIconId;
  playerCount: "All" | "4/6P";
  firstPlayer?: boolean;
  scored?: boolean;
};

export type BoardSpace = {
  id: string;
  name: string;
  zone: "Faction" | "Landsraad" | "City" | "Desert" | "Spice Trade";
  icon: IconId;
  cost?: Partial<Resources>;
  requirement?: InfluenceRequirement;
  influence?: FactionId;
  gain?: BoardGain;
  troops?: number;
  draw?: number;
  combat?: boolean;
  maker?: boolean;
  makerWorms?: number;
  sietchTabr?: boolean;
  team?: "trade" | "reinforce" | "commander";
  personal?: TeamId;
  detail: string;
  spy?: number;
  contract?: boolean;
  imagePath?: string;
  thumbnailPath?: string;
  sourceId?: number;
  sourceSlug?: string;
};

export type PlayerContract = {
  card: ContractCard;
  completed: boolean;
  takenRound: number;
  takenAtSpaceId?: string;
};

export type Player = {
  id: string;
  name: string;
  leader: string;
  leaderCard: LeaderCard;
  team: TeamId;
  role: Role;
  color: string;
  vp: number;
  resources: Resources;
  influence: Influence;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  playArea: Card[];
  manipulatedCards: Card[];
  intrigues: IntrigueCard[];
  agentsReady: number;
  agentsTotal: number;
  garrison: number;
  conflict: number;
  deployedTroops: number;
  deployedSandworms: number;
  makerHooks: boolean;
  spies: number;
  revealed: boolean;
  persuasion: number;
  highCouncilSeat: boolean;
  revealActivatedAllyId?: string;
  callToArmsActive: boolean;
  gurneyAlwaysSmilingScored?: boolean;
  jessicaMemories: number;
  purchaseSequence: number;
  swordmasterBonus: boolean;
  swordmasterAgentSpent: boolean;
  contracts: PlayerContract[];
  reservedContracts: ContractCard[];
  objectives: ObjectiveCard[];
  wonConflicts: ConflictCard[];
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
      source: string;
      optional: boolean;
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
      amount?: number;
      trashSource?: boolean;
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
      requiredTrait?: string;
      spiceRewardCostThreshold?: number;
      spiceReward?: number;
      combatRecipientId?: string;
      strengthReward?: number;
    }
  | {
      kind: "reveal-adjust";
      ownerId: string;
      combatRecipientId: string;
      cards: string[];
      persuasionAdjustment: number;
      strengthAdjustment: number;
      allowPersuasionAdjustment?: boolean;
      allowStrengthAdjustment?: boolean;
      source: string;
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
      optional: boolean;
      bonusDraw?: {
        requiredDiscardTrait: string;
        drawCards: number;
      };
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
      kind: "shaddam-signet-ring";
      commanderId: string;
      allyId: string;
      cardId: string;
      source: string;
    }
  | {
      kind: "irulan-signet-ring";
      ownerId: string;
      cardId: string;
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
      kind: "jessica-spice-agony";
      ownerId: string;
      cardId: string;
      source: string;
    }
  | {
      kind: "jessica-water-of-life";
      ownerId: string;
      cardId: string;
      source: string;
    }
  | {
      kind: "jessica-reverend-mother";
      ownerId: string;
      spaceId: string;
      source: string;
    }
  | {
      kind: "jessica-other-memories";
      ownerId: string;
      source: string;
      spaceId: string;
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

export type TrashCardZone = "hand" | "discard" | "playArea";

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
  turnSpiceGains: Record<string, number>;
  turnReverendMotherJessicaRepeats: Record<string, boolean>;
  players: Player[];
  spaces: Record<string, string>;
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
