export type TeamId = "muaddib" | "shaddam";
export type Role = "Commander" | "Ally";
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

export type Resources = Record<ResourceId, number>;
export type Influence = Record<FactionId, number>;
export type BoardGain = Partial<Resources> & { intrigue?: number };
export type TradeGoodId = ResourceId | "intrigue";

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
  rewards: string[];
  stakes: string;
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

export type BoardSpace = {
  id: string;
  name: string;
  zone: "Faction" | "Landsraad" | "City" | "Desert" | "Spice Trade";
  icon: IconId;
  cost?: Partial<Resources>;
  influence?: FactionId;
  gain?: BoardGain;
  troops?: number;
  draw?: number;
  combat?: boolean;
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
  spies: number;
  revealed: boolean;
  persuasion: number;
  purchaseSequence: number;
  swordmasterBonus: boolean;
  contracts: PlayerContract[];
  reservedContracts: ContractCard[];
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
    };

export type GameState = {
  round: number;
  activeSeat: number;
  firstSeat: number;
  players: Player[];
  spaces: Record<string, string>;
  spyPosts: Record<string, string>;
  imperiumRow: Card[];
  marketDeck: Card[];
  reserveMarket: Card[];
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
  log: string[];
};
