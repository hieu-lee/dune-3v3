import type {
  FactionId,
  IconId,
  Role,
  TeamId,
} from "./types";

export function visitedMakerSpace() {
  return { kind: "visited-maker-space" } as const;
}

export function visitedSpaceIcon(icon: IconId) {
  return { kind: "visited-space-icon", icon } as const;
}

export function visitedSpaceWithSpyPost() {
  return { kind: "visited-space-has-spy-post" } as const;
}

export function hasSpyPostOnMakerSpace() {
  return { kind: "has-spy-post-on-maker-space" } as const;
}

export function hasSpyPosts(count: number) {
  return { kind: "has-spy-posts", count } as const;
}

export function hasCombatRecipient() {
  return { kind: "has-combat-recipient" } as const;
}

export function hasCombatRecipientSandworms(count: number) {
  return { kind: "has-combat-recipient-sandworms", count } as const;
}

export function hasConflictUnits(count: number) {
  return { kind: "has-conflict-units", count } as const;
}

export function hasInfluence(faction: FactionId, amount: number) {
  return { kind: "has-influence", faction, amount } as const;
}

export function hasCompletedContracts(count: number) {
  return { kind: "has-completed-contracts", count } as const;
}

export function hasCardTraitInPlay(trait: string, count = 1) {
  return { kind: "has-card-trait-in-play", trait, count } as const;
}

export function hasTeam(team: TeamId) {
  return { kind: "has-team", team } as const;
}

export function hasRole(role: Role) {
  return { kind: "has-role", role } as const;
}

export function hasHighCouncilSeat() {
  return { kind: "has-high-council-seat" } as const;
}

export function hasSwordmasterBonus() {
  return { kind: "has-swordmaster-bonus" } as const;
}

export function hasLeader(leader: string) {
  return { kind: "has-leader", leader } as const;
}

export function hasLeaderCounter(counter: "jessicaMemories", amount: number) {
  return { kind: "has-leader-counter", counter, amount } as const;
}

export function hasAlliance(faction?: FactionId) {
  return faction ? ({ kind: "has-alliance", faction } as const) : ({ kind: "has-alliance" } as const);
}

export function deployedUnitsThisTurn(count: number) {
  return { kind: "deployed-units-this-turn", count } as const;
}

export function gainedSpiceThisTurn() {
  return { kind: "gained-spice-this-turn" } as const;
}
