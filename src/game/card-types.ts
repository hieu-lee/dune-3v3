import type {
  BattleIconId,
  BoardGain,
  ConflictBattleIconId,
  FactionId,
  IconId,
  Influence,
  InfluenceRequirement,
  ResourceId,
  Resources,
  Role,
  TeamId,
} from "./core-types";
import type { CardEffectSpec } from "./effect-types";

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
