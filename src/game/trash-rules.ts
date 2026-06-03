import { advancePendingAction } from "./pending-actions";
import { playerHasConflictUnits } from "./conflict-rules";
import { drawCards } from "./deck-utils";
import { recordTurnSpiceGainAndCompleteHarvestContracts } from "./contract-rules";
import type { Card, GameState, PendingAction, Player, TrashCardZone } from "./types";

type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

function cardsForTrashZone(player: Player, zone: TrashCardZone) {
  if (zone === "hand") return player.hand;
  if (zone === "discard") return player.discard;
  return player.playArea;
}

function updateTrashZone(player: Player, zone: TrashCardZone, cards: Card[]) {
  if (zone === "hand") return { ...player, hand: cards };
  if (zone === "discard") return { ...player, discard: cards };
  return { ...player, playArea: cards };
}

export function trashableCards(player: Player) {
  return (["hand", "discard", "playArea"] as TrashCardZone[]).flatMap((zone) =>
    cardsForTrashZone(player, zone).map((card) => ({ zone, card })),
  );
}

export function trashableCardsForPending(player: Player, pending: TrashCardPendingAction) {
  const zones = pending.zones ?? (["hand", "discard", "playArea"] as TrashCardZone[]);
  return trashableCards(player).filter(({ card, zone }) =>
    zones.includes(zone) &&
    card.id !== pending.excludeCardId &&
    (!pending.requiredCardId || card.id === pending.requiredCardId) &&
    (!pending.requiredAgentPlacementSpaceId || card.agentPlacementSpaceId === pending.requiredAgentPlacementSpaceId) &&
    (
      !pending.requiredAgentPlacementTargetOwnerId ||
      card.agentPlacementTargetOwnerId === pending.requiredAgentPlacementTargetOwnerId
    ) &&
    (!pending.requiredTrait || card.traits?.includes(pending.requiredTrait))
  );
}

function removeCardInstance(cards: Card[], card: Card) {
  let removed = false;
  return cards.filter((candidate) => {
    if (!removed && candidate === card) {
      removed = true;
      return false;
    }
    return true;
  });
}

function drawnCardsText(requested: number, actual: number) {
  if (requested === 0) return "";
  if (actual === 0) return requested === 1 ? "has no card to draw" : "has no cards to draw";
  if (actual === requested) return `draws ${actual} card${actual === 1 ? "" : "s"}`;
  return `draws ${actual} of ${requested} cards`;
}

function sourcePlayAreaVpReward(pending: TrashCardPendingAction, zone: TrashCardZone, cardId: string) {
  const vpReward = pending.vpReward ?? 0;
  if (vpReward <= 0) return 0;
  return zone === "playArea" &&
    pending.requiredCardId === cardId &&
    pending.zones?.length === 1 &&
    pending.zones[0] === "playArea"
    ? vpReward
    : 0;
}

export function advancePastUnresolvableMandatoryTrash(state: GameState): GameState {
  let nextState = state;
  while (nextState.pendingAction?.kind === "trash-card" && !nextState.pendingAction.optional) {
    const pending = nextState.pendingAction;
    const owner = nextState.players.find((player) => player.id === pending.ownerId);
    if (owner && trashableCardsForPending(owner, pending).length > 0) break;
    nextState = {
      ...nextState,
      ...advancePendingAction(nextState),
      log: [`${owner?.leader ?? "Player"} has no trashable cards for ${pending.source}.`, ...nextState.log],
    };
  }
  return nextState;
}

export function trashPlayerCard(
  state: GameState,
  pending: TrashCardPendingAction,
  zone: TrashCardZone,
  cardId: string,
  choiceIndex?: number,
): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return advancePastUnresolvableMandatoryTrash({ ...state, ...advancePendingAction(state) });
  const choices = trashableCardsForPending(owner, pending);
  const indexedChoice = choiceIndex === undefined ? undefined : choices[choiceIndex];
  const choice =
    indexedChoice?.zone === zone && indexedChoice.card.id === cardId
      ? indexedChoice
      : choiceIndex === undefined
        ? choices.find((candidate) => candidate.zone === zone && candidate.card.id === cardId)
        : undefined;
  if (!choice) {
    if (!pending.optional && choices.length === 0) {
      return advancePastUnresolvableMandatoryTrash(state);
    }
    return state;
  }
  const cards = cardsForTrashZone(owner, zone);
  const card = choice.card;
  const combatRecipient = pending.combatRecipientId
    ? state.players.find((player) => player.id === pending.combatRecipientId)
    : undefined;
  const strengthReward = pending.strengthReward && combatRecipient && playerHasConflictUnits(combatRecipient)
    ? pending.strengthReward
    : 0;
  const spiceReward =
    pending.spiceReward &&
    (card.cost ?? 0) >= (pending.spiceRewardCostThreshold ?? 0)
      ? pending.spiceReward
      : 0;
  const drawCardsReward = pending.drawCardsReward ?? 0;
  const vpReward = sourcePlayAreaVpReward(pending, zone, card.id);
  let cardsDrawn = 0;
  const players = state.players.map((player) => {
    let nextPlayer = player;
    if (player.id === owner.id) {
      const ownerAfterTrash = {
        ...updateTrashZone(player, zone, removeCardInstance(cards, card)),
        resources: {
          ...player.resources,
          spice: player.resources.spice + spiceReward,
        },
        vp: player.vp + vpReward,
      };
      if (drawCardsReward > 0) {
        const handBeforeDraw = ownerAfterTrash.hand.length;
        nextPlayer = drawCards(ownerAfterTrash, ownerAfterTrash.hand.length + drawCardsReward);
        cardsDrawn = nextPlayer.hand.length - handBeforeDraw;
      } else {
        nextPlayer = ownerAfterTrash;
      }
    }
    if (player.id === combatRecipient?.id && strengthReward > 0) {
      nextPlayer = { ...nextPlayer, conflict: nextPlayer.conflict + strengthReward };
    }
    return nextPlayer;
  });
  const nextState = {
    ...state,
    players,
    ...advancePendingAction(state),
    log: [
      `${owner.leader} trashes ${card.name} from ${pending.source}${spiceReward > 0 ? ` and gains ${spiceReward} spice` : ""}${vpReward > 0 ? ` and gains ${vpReward} VP` : ""}${strengthReward > 0 ? ` and adds ${strengthReward} strength` : ""}${drawCardsReward > 0 ? ` and ${drawnCardsText(drawCardsReward, cardsDrawn)}` : ""}.`,
      ...state.log,
    ],
  };
  return advancePastUnresolvableMandatoryTrash(
    recordTurnSpiceGainAndCompleteHarvestContracts(nextState, owner.id, spiceReward).state,
  );
}

export function skipTrashCard(state: GameState, pending: TrashCardPendingAction): GameState {
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!pending.optional && owner && trashableCardsForPending(owner, pending).length > 0) return state;
  return advancePastUnresolvableMandatoryTrash({
    ...state,
    ...advancePendingAction(state),
    log: [
      pending.optional
        ? `${owner?.leader ?? "Player"} declines to trash a card from ${pending.source}.`
        : `${owner?.leader ?? "Player"} has no trashable cards for ${pending.source}.`,
      ...state.log,
    ],
  });
}
