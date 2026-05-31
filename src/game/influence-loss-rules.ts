import { factionLabels } from "./data";
import { commanderPersonalFaction } from "./commander-rules";
import {
  influenceLossChoices,
  mainBoardInfluenceChoices,
} from "./influence-choices";
import { adjustInfluence } from "./leader-rewards";
import { activatedAllyEffectOwner } from "./market-rules";
import { advancePendingAction } from "./pending-actions";
import type { FactionId, GameState, PendingAction, Player } from "./types";

type LoseInfluencePendingAction = Extract<PendingAction, { kind: "lose-influence" }>;

export function influenceEffectOwnerForChoice(
  state: GameState,
  player: Player,
  faction: FactionId,
  influenceOwnerId?: string,
) {
  const personalFaction = commanderPersonalFaction(player);
  return player.role === "Commander" && faction !== personalFaction
    ? activatedAllyEffectOwner(state, player, influenceOwnerId)
    : { valid: true, owner: player };
}

export function changeAllegiancesLossChoices(
  state: GameState,
  player: Player,
  influenceOwnerId?: string,
): FactionId[] {
  if (player.role !== "Commander") {
    return mainBoardInfluenceChoices.filter((faction) => player.influence[faction] > 0);
  }
  const personalFaction = commanderPersonalFaction(player);
  const ownerResult = activatedAllyEffectOwner(state, player, influenceOwnerId);
  const activatedAlly = ownerResult.owner;
  return [
    ...(personalFaction && player.influence[personalFaction] > 0 ? [personalFaction] : []),
    ...(activatedAlly
      ? mainBoardInfluenceChoices.filter((faction) => activatedAlly.influence[faction] > 0)
      : []),
  ];
}

export function allowedInfluenceLossChoices(player: Player) {
  const personalFaction = commanderPersonalFaction(player);
  if (personalFaction) {
    return player.influence[personalFaction] > 0 ? [personalFaction] : [];
  }
  return influenceLossChoices(player);
}

export function influenceLossOptions(state: GameState, pending: LoseInfluencePendingAction) {
  const ownerIds = [pending.ownerId, ...(pending.alternateOwnerIds ?? [])].filter(
    (ownerId, index, allOwnerIds) => allOwnerIds.indexOf(ownerId) === index,
  );
  return ownerIds.flatMap((ownerId) => {
    const owner = state.players.find((player) => player.id === ownerId);
    if (!owner) return [];
    return allowedInfluenceLossChoices(owner).map((faction) => ({ ownerId: owner.id, faction }));
  });
}

export function loseInfluenceForPending(
  state: GameState,
  pending: LoseInfluencePendingAction,
  ownerId: string,
  faction: FactionId,
): GameState {
  if (state.pendingAction !== pending) return state;
  const recipient = state.players.find((player) => player.id === pending.combatRecipientId);
  if (!recipient) return state;
  const validOption = influenceLossOptions(state, pending).some(
    (option) => option.ownerId === ownerId && option.faction === faction,
  );
  if (!validOption) return state;
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner) return state;

  const players = state.players.map((player) => {
    let next = player;
    if (player.id === owner.id) next = adjustInfluence(next, faction, -1);
    if (player.id === recipient.id) next = { ...next, conflict: next.conflict + pending.strength };
    return next;
  });

  return {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} loses 1 ${factionLabels[faction]} Influence for ${pending.source}, adding ${pending.strength} strength to ${recipient.leader}.`,
      ...state.log,
    ],
  };
}

export function skipLoseInfluence(state: GameState, pending: LoseInfluencePendingAction): GameState {
  if (state.pendingAction !== pending) return state;
  if (!pending.optional) return state;
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`No Influence is lost for ${pending.source}.`, ...state.log],
  };
}
