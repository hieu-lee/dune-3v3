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
export type ResourceId = "solari" | "spice" | "water" | "intrigue";

export type Resources = Record<ResourceId, number>;
export type Influence = Record<FactionId, number>;

export type Card = {
  id: string;
  name: string;
  icons: IconId[];
  persuasion: number;
  swords: number;
  acquired?: number;
  conditionalPersuasion?: boolean;
  conditionalSwords?: boolean;
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

export type BoardSpace = {
  id: string;
  name: string;
  zone: "Faction" | "Landsraad" | "City" | "Desert" | "Spice Trade";
  icon: IconId;
  cost?: Partial<Resources>;
  influence?: FactionId;
  gain?: Partial<Resources>;
  troops?: number;
  draw?: number;
  combat?: boolean;
  team?: "trade" | "reinforce" | "commander";
  personal?: TeamId;
  detail: string;
  spy?: number;
};

export type Player = {
  id: string;
  name: string;
  leader: string;
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
  agentsReady: number;
  agentsTotal: number;
  garrison: number;
  conflict: number;
  spies: number;
  revealed: boolean;
  persuasion: number;
  purchaseSequence: number;
  swordmasterBonus: boolean;
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
      resource: ResourceId;
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
  swordmasterClaimed: boolean;
  pendingAction?: PendingAction;
  pendingQueue: PendingAction[];
  conflict: {
    name: string;
    stakes: string;
    shieldWall: boolean;
  };
  log: string[];
};
