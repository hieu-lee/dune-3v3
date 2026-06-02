import {
  canSummonSandworms,
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  playerTroopSupply,
} from "./deck-utils";
import {
  resolveCardEffects,
  resolveRevealLoseInfluenceForIntrigues,
  resolveRevealPayResourceForSandworms,
  resolveRevealPayResourceForStrengths,
  resolveRevealPayResourceForTroops,
  resolveRevealRetreatTroopsForStrength,
  resolveRevealTrashCardEffects,
} from "./effect-resolver";
import {
  loseInfluenceForIntriguesChoices,
} from "./influence-intrigue-rules";
import {
  pendingActionsForRevealLeaderAbilities,
} from "./leader-reveal-pending-rules";
import {
  mergedSpyPlacement,
  spyPendingForPlacement,
} from "./spy-effect-pending-rules";
import {
  trashableCardsForPending,
} from "./trash-rules";
import type {
  Card,
  GameState,
  PendingAction,
  Player,
} from "./types";

function sameTeamAllies(players: Player[], source: Player): [Player, Player] | undefined {
  const allies = players.filter((player) => player.team === source.team && player.role === "Ally");
  if (allies.length < 2) return undefined;
  return [allies[0], allies[1]];
}

function playersWithPendingCardEffect(state: GameState, source: Player, target?: Player) {
  return state.players.map((player) => {
    if (player.id === source.id) return source;
    if (target && player.id === target.id) return target;
    return player;
  });
}

function pendingActionForRevealSpyPlacement(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction | undefined {
  if (!card.effects) return undefined;
  const result = resolveCardEffects([card], {
    trigger: "reveal",
    source,
    state,
  });
  const sourcePlacement = mergedSpyPlacement(card.name, result.spyPlacements);
  const allyPlacement = mergedSpyPlacement(card.name, result.activatedAlly.spyPlacements);
  if (allyPlacement) {
    throw new Error(`Unsupported activated Ally reveal spy placement for ${card.name}`);
  }
  return sourcePlacement ? spyPendingForPlacement(card.name, source, sourcePlacement, state) : undefined;
}

export function pendingActionsForRevealPayResourceForTroops(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction[] {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return [];

  const effectState = { ...state, players: playersWithPendingCardEffect(state, source) };
  return resolveRevealPayResourceForTroops(card.effects, {
    trigger: "reveal",
    source,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.troops <= 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    if (effect.recipient !== "same-team-allies" || effect.destination !== "garrison") return [];
    const allies = sameTeamAllies(effectState.players, source);
    if (!allies) return [];
    if (allies.some((ally) => playerTroopSupply(ally) < effect.troops)) return [];
    return [{
      kind: "pay-resource-for-troops",
      ownerId: source.id,
      recipientIds: [allies[0].id, allies[1].id],
      resource: effect.resource,
      cost: effect.cost,
      troops: effect.troops,
      destination: effect.destination,
      optional: effect.optional,
      ...(effect.trashSource ? { trashSource: true } : {}),
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

export function pendingActionsForRevealPayResourceForSandworms(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id) || !recipient) return [];
  if (source.role === "Commander" && (recipient.team !== source.team || recipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && recipient.id !== source.id) return [];

  const players = playersWithPendingCardEffect(state, source, recipient);
  const effectState = { ...state, players };
  return resolveRevealPayResourceForSandworms(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.sandworms <= 0 || effect.persuasionCost < 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    if (source.persuasion < effect.persuasionCost) return [];
    if (effect.recipient !== "combat-recipient" || effect.destination !== "conflict") return [];
    if (!canSummonSandworms(state, recipient, effect.sandworms)) return [];
    return [{
      kind: "pay-resource-for-sandworms",
      ownerId: source.id,
      recipientId: recipient.id,
      resource: effect.resource,
      cost: effect.cost,
      sandworms: effect.sandworms,
      strength: effect.sandworms * 3,
      destination: effect.destination,
      optional: effect.optional,
      ...(effect.trashSource ? { trashSource: true } : {}),
      ...(effect.persuasionCost > 0 ? { persuasionCost: effect.persuasionCost } : {}),
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

export function pendingActionsForRevealPayResourceForStrength(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const combatRecipient = state.players.find((player) => player.id === combatRecipientId);
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id) || !combatRecipient) return [];
  if (source.role === "Commander" && (combatRecipient.team !== source.team || combatRecipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && combatRecipient.id !== source.id) return [];
  if (!playerHasConflictUnits(combatRecipient)) return [];

  const players = playersWithPendingCardEffect(state, source, combatRecipient);
  const effectState = { ...state, players };
  return resolveRevealPayResourceForStrengths(card.effects, {
    trigger: "reveal",
    source,
    target: combatRecipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.strength <= 0) return [];
    if (source.resources[effect.resource] < effect.cost) return [];
    return [{
      kind: "pay-resource-for-strength",
      ownerId: source.id,
      combatRecipientId,
      resource: effect.resource,
      cost: effect.cost,
      strength: effect.strength,
      optional: effect.optional,
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

function pendingActionsForRevealInfluenceIntrigues(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealLoseInfluenceForIntrigues(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.amount <= 0) return [];
    if (loseInfluenceForIntriguesChoices(source).length === 0) return [];
    return [{
      kind: "lose-influence-for-intrigues",
      ownerId: source.id,
      source: card.name,
      amount: effect.amount,
      optional: effect.optional,
    }];
  });
}

function pendingActionsForRevealTrashCards(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealTrashCardEffects(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self") return [];
    if (effect.strengthReward !== undefined && (!recipient || !playerHasConflictUnits(recipient))) return [];
    const pending: Extract<PendingAction, { kind: "trash-card" }> = {
      kind: "trash-card",
      ownerId: source.id,
      source: card.name,
      optional: effect.optional,
      ...(effect.zones ? { zones: effect.zones } : {}),
      ...(effect.excludeSource ? { excludeCardId: card.id } : {}),
      ...(effect.requiredTrait ? { requiredTrait: effect.requiredTrait } : {}),
      ...(effect.strengthReward !== undefined && recipient ? {
        combatRecipientId: recipient.id,
        strengthReward: effect.strengthReward,
      } : {}),
      ...(effect.spiceRewardCostThreshold !== undefined ? {
        spiceRewardCostThreshold: effect.spiceRewardCostThreshold,
      } : {}),
      ...(effect.spiceReward !== undefined ? { spiceReward: effect.spiceReward } : {}),
    };
    return trashableCardsForPending(source, pending).length > 0 ? [pending] : [];
  });
}

function pendingActionsForRevealRetreatTroopsForStrength(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient || !playerHasConflictUnits(recipient)) return [];

  return resolveRevealRetreatTroopsForStrength(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.troopCount <= 0 || effect.strength <= 0) return [];
    if (recipient.deployedTroops < effect.troopCount) return [];
    return [{
      kind: "retreat-troops-for-strength",
      ownerId: source.id,
      combatRecipientId,
      troopCount: effect.troopCount,
      strength: effect.strength,
      optional: effect.optional,
      source: card.name,
    }];
  });
}

export function pendingActionsForReveal(
  source: Player,
  state: GameState,
  revealedCards: Card[],
  combatRecipientId: string,
): PendingAction[] {
  const printedRevealCards = revealedCards
    .filter((card) => card.conditionalPersuasion || card.conditionalSwords)
    .map((card) => card.name);
  const allowPersuasionAdjustment = revealedCards.some((card) => card.conditionalPersuasion);
  const allowStrengthAdjustment = revealedCards.some((card) => card.conditionalSwords);
  const revealAdjustPending: PendingAction | undefined = printedRevealCards.length > 0
    ? {
        kind: "reveal-adjust",
        ownerId: source.id,
        combatRecipientId,
        cards: printedRevealCards,
        persuasionAdjustment: 0,
        strengthAdjustment: 0,
        allowPersuasionAdjustment,
        allowStrengthAdjustment,
        source: "Printed reveal",
      }
    : undefined;
  const revealTrashCardPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealTrashCards(card, source, state, combatRecipientId)
  );
  const revealSpyPlacementPendings = revealedCards
    .map((card) => pendingActionForRevealSpyPlacement(card, source, state))
    .filter((pending): pending is PendingAction => Boolean(pending));
  const payResourceStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForStrength(card, source, state, combatRecipientId)
  );
  const payResourceTroopPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForTroops(card, source, state)
  );
  const payResourceSandwormPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForSandworms(card, source, state, combatRecipientId)
  );
  const influenceIntriguePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealInfluenceIntrigues(card, source, state, combatRecipientId)
  );
  const retreatTroopStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealRetreatTroopsForStrength(card, source, state, combatRecipientId)
  );
  const leaderAbilityPendings = pendingActionsForRevealLeaderAbilities(source, state, combatRecipientId);

  return [
    revealAdjustPending,
    ...revealSpyPlacementPendings,
    ...revealTrashCardPendings,
    ...payResourceStrengthPendings,
    ...payResourceTroopPendings,
    ...payResourceSandwormPendings,
    ...influenceIntriguePendings,
    ...retreatTroopStrengthPendings,
    ...leaderAbilityPendings,
  ].filter((action): action is PendingAction => Boolean(action));
}
