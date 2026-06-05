import { CircleDollarSign, Droplets, Eye, Sparkles, type LucideIcon } from "lucide-react";
import { boardSpaces } from "./game/data";
import { resolveCardRevealEffects } from "./game/effect-resolver";
import { boardSpaceRewardApplies } from "./game/state";
import type {
  BoardSpace,
  FactionId,
  GameState,
  PendingAction,
  Player,
  ResourceId,
  Resources,
  TradeGoodId,
} from "./game/types";

export const resources: Array<{ id: ResourceId; label: string; Icon: LucideIcon }> = [
  { id: "solari", label: "Solari", Icon: CircleDollarSign },
  { id: "spice", label: "Spice", Icon: Sparkles },
  { id: "water", label: "Water", Icon: Droplets },
];

export const tradeGoods: Array<{ id: TradeGoodId; label: string; Icon: LucideIcon }> = [
  ...resources,
  { id: "intrigue", label: "Intrigue", Icon: Eye },
];

export const factionShortLabels: Record<FactionId, string> = {
  emperor: "EMP",
  spacing: "SG",
  bene: "BG",
  fremen: "FRE",
  greatHouses: "GH",
  fringeWorlds: "FW",
};

export type ChangeAllegiancesSelection = Partial<{
  loseFaction: FactionId;
  shiftGainFaction: FactionId;
  spiceGainFaction: FactionId;
}>;

export function memoryCountLabel(count: number) {
  return `${count} ${count === 1 ? "memory" : "memories"}`;
}

export function feydTrainingLabel(position: number) {
  return `Training ${Math.min(4, Math.max(0, position))}/4`;
}

export function troopSupplyLabel(count: number) {
  return `${count} supply ${count === 1 ? "troop" : "troops"}`;
}

export function selectedFactionChoice(selected: FactionId | undefined, choices: FactionId[]) {
  return selected && choices.includes(selected) ? selected : choices[0];
}

export function boardSpaceRevealPersuasionFor(player: Player, state?: Pick<GameState, "agentPlacementOwners" | "spaces">) {
  if (!state) return 0;
  return boardSpaces.reduce(
    (total, space) => {
      const revealPersuasion = space.revealPersuasion ?? 0;
      if (revealPersuasion <= 0 || !state.spaces[space.id]) return total;
      return state.agentPlacementOwners?.[space.id] === player.id ? total + revealPersuasion : total;
    },
    0,
  );
}

export function revealPersuasionFor(
  player: Player,
  state?: Pick<GameState, "agentPlacementOwners" | "roundMakerSpaceVisits" | "sharedSpyPosts" | "spaces" | "spyPosts">,
) {
  const highCouncilPersuasion = player.highCouncilSeat ? 2 : 0;
  return resolveCardRevealEffects(player.hand, player, state).persuasion +
    highCouncilPersuasion +
    boardSpaceRevealPersuasionFor(player, state);
}

export function boardSpaceIntrigueGainFor(space: BoardSpace, player: Player) {
  return boardSpaceRewardApplies(space, player) ? space.gain?.intrigue ?? 0 : 0;
}

export function boardSpaceSpiceGainFor(
  space: BoardSpace,
  player: Player,
  bonusSpice: number,
  deferMakerChoice: boolean,
) {
  const printedSpice = boardSpaceRewardApplies(space, player)
    ? deferMakerChoice && space.makerWorms ? 0 : space.gain?.spice ?? 0
    : 0;
  return printedSpice + bonusSpice;
}

export function pendingLocksTableState(action: PendingAction | undefined) {
  return action?.kind === "maker-choice" ||
    action?.kind === "sietch-tabr" ||
    action?.kind === "pay-resource-for-sandworms" ||
    action?.kind === "pay-resource-for-high-council-seat" ||
    action?.kind === "control-defense";
}

export function tableStateLockedByPendingActions(state: Pick<GameState, "pendingAction" | "pendingQueue">) {
  return pendingLocksTableState(state.pendingAction) || state.pendingQueue.some(pendingLocksTableState);
}

export function costLabel(cost?: Partial<Resources>) {
  if (!cost || Object.keys(cost).length === 0) return "Free";
  return Object.entries(cost)
    .map(([key, value]) => `${value} ${key}`)
    .join(", ");
}

export function resourceChoiceLabel(amount: number, resource: ResourceId) {
  const label = resource === "solari" ? "Solari" : resource;
  return amount === 1 ? label : `${amount} ${label}`;
}

export function addResources(resources: Resources, gain: Partial<Resources>) {
  const next = { ...resources };
  Object.entries(gain).forEach(([key, value]) => {
    next[key as ResourceId] += value ?? 0;
  });
  return next;
}

export function revealGainLabel(gain: Partial<Resources>) {
  const entries = Object.entries(gain).filter(([, value]) => (value ?? 0) > 0);
  if (entries.length === 0) return "";
  return ` and gains ${entries.map(([key, value]) => `${value} ${key}`).join(", ")}`;
}
