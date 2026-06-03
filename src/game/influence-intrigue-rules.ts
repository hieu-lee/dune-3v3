import { resolveAllianceOwnersForInfluenceChanges } from "./alliance-rules";
import { factionLabels } from "./data";
import { drawIntrigueCards } from "./intrigue-deck";
import { allowedInfluenceLossChoices } from "./influence-loss-rules";
import { adjustInfluence } from "./leader-rewards";
import { advancePendingAction } from "./pending-actions";
import type { FactionId, GameState, PendingAction, Player } from "./types";

type LoseInfluenceForIntriguesPendingAction = Extract<PendingAction, { kind: "lose-influence-for-intrigues" }>;

export function loseInfluenceForIntriguesChoices(player: Player): FactionId[] {
  return allowedInfluenceLossChoices(player);
}

export function resolveLoseInfluenceForIntrigues(
  state: GameState,
  pending: LoseInfluenceForIntriguesPendingAction,
  faction: FactionId,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !loseInfluenceForIntriguesChoices(owner).includes(faction)) return state;

  const previousPlayers = state.players;
  const influenceState = {
    ...state,
    players: state.players.map((player) =>
      player.id === owner.id ? adjustInfluence(player, faction, -1) : player,
    ),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} loses 1 ${factionLabels[faction]} Influence for ${pending.source}.`,
      ...state.log,
    ],
  };
  return drawIntrigueCards(
    resolveAllianceOwnersForInfluenceChanges(influenceState, previousPlayers),
    owner.id,
    pending.amount,
    pending.source,
  );
}

export function skipLoseInfluenceForIntrigues(
  state: GameState,
  pending: LoseInfluenceForIntriguesPendingAction,
): GameState {
  if (state.pendingAction !== pending) return state;
  if (!pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} keeps their Influence for ${pending.source}.`, ...state.log],
  };
}
