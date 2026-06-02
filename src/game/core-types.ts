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
  | "agent-placement"
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
export type PaidRewardChoiceSelector = "self" | "activated-ally";
export type LeaderCounterId = "jessicaMemories";
export type TradeEffectPartner = "same-team-allies";
export type ContractEffectRecipient = "same-team-allies";
export type ContractEffectSourcePool = "public-offer";
export type TeamResourcePaymentContributor = "self-and-same-team-allies";
export type TeamResourcePaymentRecipient = "self";
export type InfluenceLossForStrengthOwner = "combat-recipient";
export type InfluenceLossForStrengthAlternateOwner = "source-commander-personal";
export type EffectAmountSpec =
  | number
  | { kind: "completed-contracts"; multiplier?: number };
export type TroopRetreatBoundSpec =
  | number
  | { kind: "deployed-troops" };
export type TrashCardZone = "hand" | "discard" | "playArea";

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
