import { applyDiscardedFromHandTriggers } from "./discard-trigger-rules";
import { advancePendingAction, prependPendingAction } from "./pending-actions";
import { recordTurnSpiceGain } from "./turn-trackers";
import type { Card, GameState, PendingAction, Player, ResourceId, Resources } from "./types";

type DiscardCardsForRewardPendingAction = Extract<PendingAction, { kind: "discard-cards-for-reward" }>;

const resourceLabels: Record<ResourceId, string> = {
  solari: "Solari",
  spice: "spice",
  water: "water",
};

export function discardCardsForRewardChoices(
  player: Player,
  pending: DiscardCardsForRewardPendingAction,
): Card[] {
  if (player.id !== pending.ownerId) return [];
  return player.hand;
}

function canPayCost(player: Player, cost: Partial<Resources>) {
  return Object.entries(cost).every(([resource, amount]) =>
    player.resources[resource as ResourceId] >= (amount ?? 0)
  );
}

function spendCost(resources: Resources, cost: Partial<Resources>): Resources {
  return {
    solari: resources.solari - (cost.solari ?? 0),
    spice: resources.spice - (cost.spice ?? 0),
    water: resources.water - (cost.water ?? 0),
  };
}

function addGain(resources: Resources, gain: Partial<Resources>): Resources {
  return {
    solari: resources.solari + (gain.solari ?? 0),
    spice: resources.spice + (gain.spice ?? 0),
    water: resources.water + (gain.water ?? 0),
  };
}

function amountText(amount: number, singular: string, plural = `${singular}s`) {
  return `${amount} ${amount === 1 ? singular : plural}`;
}

function resourceParts(resources: Partial<Resources>, verb: "spends" | "gains") {
  return (["solari", "spice", "water"] as const)
    .map((resource) => {
      const amount = resources[resource] ?? 0;
      return amount > 0 ? `${verb} ${amount} ${resourceLabels[resource]}` : undefined;
    })
    .filter((part): part is string => Boolean(part));
}

function discardedCardsText(names: string[]) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function rewardText(pending: DiscardCardsForRewardPendingAction) {
  return [
    ...resourceParts(pending.cost, "spends"),
    ...resourceParts(pending.gain, "gains"),
    pending.gainVp > 0 ? `gains ${amountText(pending.gainVp, "VP", "VP")}` : undefined,
    pending.takeContracts ? "takes a face-up CHOAM contract" : undefined,
  ].filter((part): part is string => Boolean(part));
}

function finalContractPending(pending: DiscardCardsForRewardPendingAction): PendingAction | undefined {
  if (!pending.takeContracts || pending.takeContracts.amount !== 1 || pending.takeContracts.sourcePool !== "public-offer") {
    return undefined;
  }
  return {
    kind: "contract",
    ownerId: pending.ownerId,
    source: pending.source,
    publicOnly: true,
  };
}

export function resolveDiscardCardsForReward(
  state: GameState,
  pending: DiscardCardsForRewardPendingAction,
  discardCardId: string,
): GameState {
  if (state.pendingAction !== pending) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner) return state;
  const discardedCard = discardCardsForRewardChoices(owner, pending).find((card) => card.id === discardCardId);
  if (!discardedCard) return state;
  if (pending.remaining <= 1 && !canPayCost(owner, pending.cost)) return state;

  const ownerAfterDiscard = {
    ...owner,
    hand: owner.hand.filter((card) => card.id !== discardedCard.id),
    discard: [...owner.discard, discardedCard],
  };
  const discardedCardNames = [...(pending.discardedCardNames ?? []), discardedCard.name];
  const remaining = pending.remaining - 1;

  if (remaining > 0) {
    const nextState = {
      ...state,
      players: state.players.map((player) => player.id === owner.id ? ownerAfterDiscard : player),
      pendingAction: { ...pending, remaining, discardedCardNames },
      log: [
        `${owner.leader} discards ${discardedCard.name} for ${pending.source}; ${amountText(remaining, "discard")} remaining.`,
        ...state.log,
      ],
    };
    return applyDiscardedFromHandTriggers(nextState, owner.id, discardedCard, { logAfterCurrentAction: true });
  }

  const ownerAfterReward = {
    ...ownerAfterDiscard,
    resources: addGain(spendCost(ownerAfterDiscard.resources, pending.cost), pending.gain),
    vp: ownerAfterDiscard.vp + pending.gainVp,
  };
  const rewardParts = rewardText(pending);
  const resolvedState = recordTurnSpiceGain({
    ...state,
    players: state.players.map((player) => player.id === owner.id ? ownerAfterReward : player),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} resolves ${pending.source}: discards ${discardedCardsText(discardedCardNames)}${rewardParts.length > 0 ? ` and ${rewardParts.join("; ")}` : ""}.`,
      ...state.log,
    ],
  }, owner.id, pending.gain.spice ?? 0);
  const triggeredState = applyDiscardedFromHandTriggers(
    resolvedState,
    owner.id,
    discardedCard,
    { logAfterCurrentAction: true },
  );
  return prependPendingAction(triggeredState, finalContractPending(pending));
}

export function skipDiscardCardsForReward(
  state: GameState,
  pending: DiscardCardsForRewardPendingAction,
): GameState {
  if (state.pendingAction !== pending || !pending.optional) return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} declines to discard cards for ${pending.source}.`, ...state.log],
  };
}
