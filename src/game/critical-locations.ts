import type { ConflictCard, CriticalLocationId, GameState, ResourceId } from "./types";

export const criticalLocationNames: Record<CriticalLocationId, string> = {
  arrakeen: "Arrakeen",
  "spice-refinery": "Spice Refinery",
  "imperial-basin": "Imperial Basin",
};

export const criticalLocationIncome: Record<CriticalLocationId, { resource: ResourceId; amount: number }> = {
  arrakeen: { resource: "solari", amount: 1 },
  "spice-refinery": { resource: "solari", amount: 1 },
  "imperial-basin": { resource: "spice", amount: 1 },
};

export function criticalLocationForConflict(conflict: ConflictCard | null | undefined): CriticalLocationId | undefined {
  if (!conflict) return undefined;
  if (conflict.name.includes("Arrakeen")) return "arrakeen";
  if (conflict.name.includes("Spice Refinery")) return "spice-refinery";
  if (conflict.name.includes("Imperial Basin")) return "imperial-basin";
  return undefined;
}

export function conflictProtectedByShieldWall(conflict: ConflictCard | null | undefined) {
  return Boolean(criticalLocationForConflict(conflict));
}

export function criticalLocationForSpace(spaceId: string): CriticalLocationId | undefined {
  if (spaceId === "arrakeen") return "arrakeen";
  if (spaceId === "spice-refinery") return "spice-refinery";
  if (spaceId === "imperial-basin") return "imperial-basin";
  return undefined;
}

export function locationControlOwnerId(state: Pick<GameState, "locationControl">, spaceId: string) {
  const location = criticalLocationForSpace(spaceId);
  return location ? state.locationControl[location] : undefined;
}
