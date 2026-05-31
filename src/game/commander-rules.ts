import type { FactionId, Player } from "./types";

export function commanderPersonalFaction(player: Player): FactionId | undefined {
  if (player.role !== "Commander") return undefined;
  return player.team === "muaddib" ? "fremen" : "emperor";
}
