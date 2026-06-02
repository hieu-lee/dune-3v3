import type {
  EffectAmountSpec,
  FactionId,
  IconId,
  ResourceId,
  Role,
  TeamId,
  TradeGoodId,
  TroopRetreatBoundSpec,
  TrashCardZone,
} from "./types";

export const supportedResources = new Set<ResourceId>(["solari", "spice", "water"]);
export const supportedTradeGoods = new Set<TradeGoodId>(["solari", "spice", "water", "intrigue"]);
export const supportedIcons = new Set<IconId>(["emperor", "spacing", "bene", "fremen", "landsraad", "city", "spice", "spy"]);
export const supportedAcquireDestinations = new Set(["discard", "hand"]);
export const supportedTrashZones = new Set<TrashCardZone>(["hand", "discard", "playArea"]);
export const supportedFactions = new Set<FactionId>([
  "emperor",
  "spacing",
  "bene",
  "fremen",
  "greatHouses",
  "fringeWorlds",
]);
export const supportedTeams = new Set<TeamId>(["muaddib", "shaddam"]);
export const supportedRoles = new Set<Role>(["Commander", "Ally"]);

export function unsupportedKind(label: string, value: unknown): never {
  const kind = typeof value === "object" && value !== null && "kind" in value
    ? String((value as { kind?: unknown }).kind)
    : String(value);
  throw new Error(`Unsupported ${label} "${kind}"`);
}

export function invalidSpecField(label: string, value: unknown): never {
  throw new Error(`Invalid ${label} "${String(value)}"`);
}

export function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

export function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function validateAmount(amount: EffectAmountSpec) {
  if (typeof amount === "number") {
    if (isNonNegativeInteger(amount)) return;
    invalidSpecField("effect amount", amount);
  }
  if (amount.kind === "completed-contracts") {
    if (amount.multiplier === undefined || isNonNegativeInteger(amount.multiplier)) return;
    invalidSpecField("completed-contracts multiplier", amount.multiplier);
  }
  unsupportedKind("effect amount", amount);
}

export function validateFixedAmount(label: string, amount: number) {
  if (isNonNegativeInteger(amount)) return;
  invalidSpecField(label, amount);
}

export function validatePositiveFixedAmount(label: string, amount: unknown): asserts amount is number {
  if (typeof amount === "number" && isPositiveInteger(amount)) return;
  invalidSpecField(label, amount);
}

export function validateRetreatBound(label: string, amount: unknown): asserts amount is TroopRetreatBoundSpec {
  if (typeof amount === "number") {
    if (isPositiveInteger(amount)) return;
    invalidSpecField(label, amount);
  }
  if (typeof amount === "object" && amount !== null && "kind" in amount) {
    if ((amount as { kind?: unknown }).kind === "deployed-troops") return;
    unsupportedKind(label, amount);
  }
  invalidSpecField(label, amount);
}

export function validatePositiveAmount(label: string, amount: EffectAmountSpec) {
  if (typeof amount === "number") {
    if (isPositiveInteger(amount)) return;
    invalidSpecField(label, amount);
  }
  if (amount.kind === "completed-contracts") {
    if (amount.multiplier === undefined || isPositiveInteger(amount.multiplier)) return;
    invalidSpecField(`${label} completed-contracts multiplier`, amount.multiplier);
  }
  unsupportedKind(label, amount);
}

export function validateSourceLabel(label: string, value: unknown) {
  if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
    invalidSpecField(label, value);
  }
}

export function validateOptionalBoolean(label: string, value: unknown) {
  if (value !== undefined && typeof value !== "boolean") {
    invalidSpecField(label, value);
  }
}

export function validateOptionalTrue(label: string, value: unknown) {
  if (value !== undefined && value !== true) {
    invalidSpecField(label, value);
  }
}
