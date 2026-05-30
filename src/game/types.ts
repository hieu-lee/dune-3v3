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
export type BattleIconId = "crysknife" | "desertMouse" | "ornithopter";
export type ConflictBattleIconId = BattleIconId | "wild";

export type Resources = Record<ResourceId, number>;
export type Influence = Record<FactionId, number>;
export type AllianceOwners = Partial<Record<FactionId, string>>;
export type BoardGain = Partial<Resources> & { intrigue?: number };
export type TradeGoodId = ResourceId | "intrigue";
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
  purchaseSequence: number;
  swordmasterBonus: boolean;
  contracts: PlayerContract[];
  reservedContracts: ContractCard[];
  objectives: ObjectiveCard[];
  wonConflicts: ConflictCard[];
};

export type PendingAction =
  | {
      kind: "deploy";
      ownerId: string;
      remaining: number;
      source: string;
    }
  | {
      kind: "reinforce";
      team: TeamId;
      remaining: number;
      source: string;
    }
  | {
      kind: "trade";
      actorId: string;
      partnerId: string;
      resource: TradeGoodId;
      actorGiven: number;
      partnerGiven: number;
      source: string;
    }
  | {
      kind: "spy";
      ownerId: string;
      remaining: number;
      source: string;
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
      kind: "trash-card";
      ownerId: string;
      source: string;
      optional: boolean;
    }
  | {
      kind: "reveal-adjust";
      ownerId: string;
      combatRecipientId: string;
      cards: string[];
      persuasionAdjustment: number;
      strengthAdjustment: number;
      source: string;
    }
  | {
      kind: "contract";
      ownerId: string;
      source: string;
      spaceId?: string;
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
    }
  | {
      kind: "sietch-tabr";
      ownerId: string;
      waterOwnerId: string;
      canTakeMakerHooks: boolean;
      canRemoveShieldWall: boolean;
      source: string;
      spaceId: string;
    }
  | {
      kind: "throne-row";
      ownerId: string;
      source: string;
    }
  | {
      kind: "usul-resource";
      commanderId: string;
      allyId: string;
      source: string;
    }
  | {
      kind: "conflict-tie";
      team: TeamId;
      tiedPlayerIds: string[];
      strength: number;
      source: string;
    };

export type TrashCardZone = "hand" | "discard" | "playArea";

export type GameState = {
  phase: GamePhase;
  round: number;
  activeSeat: number;
  firstSeat: number;
  players: Player[];
  spaces: Record<string, string>;
  spyPosts: Record<string, string>;
  alliances: AllianceOwners;
  combatPasses: string[];
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
  winningTeam?: TeamId;
  endgameReason?: string;
  log: string[];
};
