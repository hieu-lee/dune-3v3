import { resolveAllianceOwnersForInfluenceChanges } from "./alliance-rules";
import { factionLabels } from "./data";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  changeAllegiancesGainChoices,
} from "./influence-choices";
import {
  allowedInfluenceLossChoices,
  changeAllegiancesLossChoices,
  influenceEffectOwnerForChoice,
} from "./influence-loss-rules";
import {
  adjustInfluence,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import { advancePendingAction } from "./pending-actions";
import type { FactionId, GameState, PendingAction, Player } from "./types";

type LoseInfluenceForIntriguesPendingAction = Extract<PendingAction, { kind: "lose-influence-for-intrigues" }>;
type LoseInfluenceForInfluencePendingAction = Extract<PendingAction, { kind: "lose-influence-for-influence" }>;

export type InfluenceExchangeChoice = {
  loseOwnerId: string;
  loseFaction: FactionId;
  gainOwnerId: string;
  gainFaction: FactionId;
};

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

function influenceExchangeOwnerForChoice(
  state: GameState,
  owner: Player,
  faction: FactionId,
  influenceOwnerId?: string,
) {
  return influenceEffectOwnerForChoice(state, owner, faction, influenceOwnerId);
}

export function influenceExchangeChoices(
  state: GameState,
  pending: LoseInfluenceForInfluencePendingAction,
): InfluenceExchangeChoice[] {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return [];

  const lossChoices = changeAllegiancesLossChoices(state, owner, pending.influenceOwnerId)
    .flatMap((faction) => {
      const ownerResult = influenceExchangeOwnerForChoice(state, owner, faction, pending.influenceOwnerId);
      if (!ownerResult.valid || !ownerResult.owner) return [];
      return ownerResult.owner.influence[faction] >= pending.loseAmount
        ? [{ owner: ownerResult.owner, faction }]
        : [];
    });
  const gainChoices = changeAllegiancesGainChoices(owner)
    .flatMap((faction) => {
      const ownerResult = influenceExchangeOwnerForChoice(state, owner, faction, pending.influenceOwnerId);
      return ownerResult.valid && ownerResult.owner ? [{ owner: ownerResult.owner, faction }] : [];
    });

  return lossChoices.flatMap((loss) =>
    gainChoices.flatMap((gain) => {
      if (loss.owner.id === gain.owner.id && loss.faction === gain.faction) return [];
      return [{
        loseOwnerId: loss.owner.id,
        loseFaction: loss.faction,
        gainOwnerId: gain.owner.id,
        gainFaction: gain.faction,
      }];
    })
  );
}

export function resolveLoseInfluenceForInfluence(
  state: GameState,
  pending: LoseInfluenceForInfluencePendingAction,
  choice: InfluenceExchangeChoice,
): GameState {
  if (state.pendingAction !== pending) return state;
  const validChoice = influenceExchangeChoices(state, pending).some((candidate) =>
    candidate.loseOwnerId === choice.loseOwnerId &&
    candidate.loseFaction === choice.loseFaction &&
    candidate.gainOwnerId === choice.gainOwnerId &&
    candidate.gainFaction === choice.gainFaction
  );
  if (!validChoice) return state;

  const lossOwner = state.players.find((player) => player.id === choice.loseOwnerId);
  const gainOwner = state.players.find((player) => player.id === choice.gainOwnerId);
  if (!lossOwner || !gainOwner) return state;

  const previousPlayers = state.players;
  const players = state.players.map((player) => {
    let next = player;
    if (player.id === lossOwner.id) next = adjustInfluence(next, choice.loseFaction, -pending.loseAmount);
    if (player.id === gainOwner.id) next = adjustInfluence(next, choice.gainFaction, pending.gainAmount);
    return next;
  });
  const lossText = `${lossOwner.leader} loses ${pending.loseAmount} ${factionLabels[choice.loseFaction]} Influence`;
  const gainText = `${gainOwner.leader} gains ${pending.gainAmount} ${factionLabels[choice.gainFaction]} Influence`;
  return resolveLeaderInfluenceThresholdRewards({
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${lossText} and ${gainText} for ${pending.source}.`,
      ...state.log,
    ],
  }, previousPlayers);
}

export function skipLoseInfluenceForInfluence(
  state: GameState,
  pending: LoseInfluenceForInfluencePendingAction,
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
