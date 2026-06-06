import { leadershipSourceId } from "./card-identifiers";
import { scoreActiveGurneyAlwaysSmilingForRecipient } from "./leader-rewards";
import type { GameState, Player } from "./types";

function revealedCardBySource(owner: Player, source: string, sourceCardId?: string) {
  if (sourceCardId) {
    return owner.playArea.find((card) => card.id === sourceCardId);
  }
  return owner.playArea.find((card) => card.name === source);
}

export function addLeadershipBonusForResolvedRevealStrength(
  state: GameState,
  ownerId: string,
  combatRecipientId: string,
  source: string,
  sourceCardId?: string,
  leadershipBonus?: boolean,
): GameState {
  if (!leadershipBonus) return state;
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner || !owner.revealed) return state;
  const sourceCard = revealedCardBySource(owner, source, sourceCardId);
  if (!sourceCard || sourceCard.sourceId === leadershipSourceId) return state;

  const strengthenedState = {
    ...state,
    players: state.players.map((player) =>
      player.id === combatRecipientId
        ? { ...player, conflict: player.conflict + 1 }
        : player
    ),
    log: [
      `${owner.leader} adds 1 strength from Leadership because ${sourceCard.name} provided strength this turn.`,
      ...state.log,
    ],
  };
  return scoreActiveGurneyAlwaysSmilingForRecipient(strengthenedState, combatRecipientId);
}
