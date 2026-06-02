import { automaticBoardInfluence } from "./board-rules";
import { pendingActionForBoardInfluenceChoice } from "./placement-rules";
import type { BoardSpace, FactionId, Player } from "./types";

export type BoardSpaceInfluenceChoice = {
  ownerId: string;
  faction: FactionId;
};

export function boardSpaceInfluenceChoicesFor(
  space: BoardSpace,
  source: Player,
  target: Player | undefined,
): BoardSpaceInfluenceChoice[] {
  if (space.zone !== "Faction" || !space.influence) return [];

  const mappedChoice = target ? pendingActionForBoardInfluenceChoice(space, source, target) : undefined;
  if (mappedChoice?.kind === "board-influence-choice") return mappedChoice.choices;

  const faction = automaticBoardInfluence(space, source);
  if (!faction) return [];
  if (space.personal || source.role !== "Commander") return [{ ownerId: source.id, faction }];
  if (!target || target.team !== source.team || target.role !== "Ally") return [];
  return [{ ownerId: target.id, faction }];
}
