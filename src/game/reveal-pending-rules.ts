import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
} from "./conflict-rules";
import {
  canPay,
  highCouncilSeatsTaken,
} from "./board-rules";
import {
  pendingActionForRevealPaidRewardChoice,
} from "./card-paid-reward-pending-rules";
import {
  playerTroopSupply,
} from "./deck-utils";
import {
  resolveCardEffects,
  resolveRevealLoseInfluenceForInfluences,
  resolveRevealDeployOrRetreatTroops,
  resolveRevealLoseInfluenceForIntrigues,
  resolveRevealPayResourceForHighCouncilSeats,
  resolveRevealPayResourceForSandworms,
  resolveRevealPayResourceForStrengths,
  resolveRevealPayResourceForTroops,
  resolveRevealPendingActionChoices,
  resolveRevealRetreatTroopsForStrength,
  resolveRevealSpyRecallForIntrigues,
  resolveRevealTrashCardEffects,
} from "./effect-resolver";
import {
  influenceExchangeChoices,
  loseInfluenceForIntriguesChoices,
} from "./influence-intrigue-rules";
import {
  pendingActionsForRevealLeaderAbilities,
} from "./leader-reveal-pending-rules";
import {
  pendingActionChoiceOptionIsResolvable,
} from "./pending-action-choice-rules";
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
  TrashCardZone,
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

function pendingActionsForRevealInfluenceExchange(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealLoseInfluenceForInfluences(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.loseAmount <= 0 || effect.gainAmount <= 0) return [];
    const pending: Extract<PendingAction, { kind: "lose-influence-for-influence" }> = {
      kind: "lose-influence-for-influence",
      ownerId: source.id,
      ...(source.revealActivatedAllyId ? { influenceOwnerId: source.revealActivatedAllyId } : {}),
      source: card.name,
      loseAmount: effect.loseAmount,
      gainAmount: effect.gainAmount,
      optional: effect.optional,
    };
    return influenceExchangeChoices(state, pending).length > 0 ? [pending] : [];
  });
}

function pendingActionsForRevealSpyRecallIntrigues(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  return resolveRevealSpyRecallForIntrigues(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  }).flatMap((effect) => {
    if (
      effect.selector !== "self" ||
      effect.amount <= 0 ||
      (effect.drawIntrigues <= 0 && effect.persuasionReward <= 0)
    ) return [];
    return [{
      kind: "recall-spy",
      ownerId: source.id,
      combatRecipientId: recipient?.id ?? source.id,
      remaining: effect.amount,
      strength: 0,
      ...(effect.persuasionReward > 0 ? { persuasionReward: effect.persuasionReward } : {}),
      source: effect.source ?? card.name,
      optional: effect.optional,
      ...(effect.drawIntrigues > 0 ? { drawIntrigues: effect.drawIntrigues } : {}),
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
      ...(effect.vpReward !== undefined ? { vpReward: effect.vpReward } : {}),
      ...(effect.persuasionCost !== undefined ? { persuasionCost: effect.persuasionCost } : {}),
      ...(effect.resourceCost && Object.keys(effect.resourceCost).length > 0 ? {
        resourceCost: effect.resourceCost,
      } : {}),
      ...(effect.sourceOnly ? { zones: ["playArea"], requiredCardId: card.id } : {}),
    };
    if ((pending.persuasionCost ?? 0) > source.persuasion) return [];
    if (pending.resourceCost && !canPay(source, pending.resourceCost)) return [];
    return trashableCardsForPending(source, pending).length > 0 ? [pending] : [];
  });
}

function pendingActionsForRevealPayResourceForHighCouncilSeat(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction[] {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return [];
  if (source.highCouncilSeat || highCouncilSeatsTaken(state.players) >= 4) return [];

  return resolveRevealPayResourceForHighCouncilSeats(card.effects, {
    trigger: "reveal",
    source,
    state,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.cost <= 0 || effect.persuasionCost < 0 || effect.persuasionReward < 0) {
      return [];
    }
    if (!canPay(source, { [effect.resource]: effect.cost })) return [];
    if (source.persuasion < effect.persuasionCost) return [];
    return [{
      kind: "pay-resource-for-high-council-seat",
      ownerId: source.id,
      resource: effect.resource,
      cost: effect.cost,
      optional: effect.optional,
      persuasionCost: effect.persuasionCost,
      persuasionReward: effect.persuasionReward,
      source: effect.source ?? card.name,
      cardId: card.id,
    }];
  });
}

function pendingActionsForRevealPendingActionChoice(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return [];
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  const effects = resolveRevealPendingActionChoices(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state,
  });
  return effects.flatMap((effect) => {
    if (effect.selector !== "self") return [];
    const defaultSource = effect.source ?? card.name;
    const options = effect.options.flatMap((option) => {
      const sourceLabel = option.effect.source ?? defaultSource;
      const pending = (() => {
        if (option.effect.kind === "gain-persuasion") {
          return {
            kind: "gain-persuasion" as const,
            ownerId: source.id,
            source: sourceLabel,
            amount: option.effect.amount,
          };
        }
        if (option.effect.kind === "gain-resource") {
          return {
            kind: "gain-resource" as const,
            ownerId: source.id,
            source: sourceLabel,
            resource: option.effect.resource,
            amount: option.effect.amount,
          };
        }
        if (option.effect.kind === "gain-strength") {
          return recipient
            ? {
                kind: "gain-strength" as const,
                ownerId: source.id,
                combatRecipientId: recipient.id,
                source: sourceLabel,
                amount: option.effect.amount,
              }
            : undefined;
        }
        if (option.effect.kind === "pay-resource-for-high-council-seat") {
          return {
            kind: "pay-resource-for-high-council-seat" as const,
            ownerId: source.id,
            resource: option.effect.resource,
            cost: option.effect.cost,
            optional: true as const,
            persuasionCost: option.effect.persuasionCost,
            persuasionReward: option.effect.persuasionReward,
            source: sourceLabel,
            cardId: card.id,
          };
        }
        if (option.effect.kind === "trash-card") {
          return {
            kind: "trash-card" as const,
            ownerId: source.id,
            source: sourceLabel,
            optional: option.effect.optional,
            ...(option.effect.zones ? { zones: option.effect.zones } : {}),
            ...(option.effect.excludeSource ? { excludeCardId: card.id } : {}),
            ...(option.effect.sourceOnly ? { zones: ["playArea"] as TrashCardZone[], requiredCardId: card.id } : {}),
            ...(option.effect.requiredTrait ? { requiredTrait: option.effect.requiredTrait } : {}),
            ...(option.effect.spiceRewardCostThreshold !== undefined
              ? { spiceRewardCostThreshold: option.effect.spiceRewardCostThreshold }
              : {}),
            ...(option.effect.spiceReward !== undefined ? { spiceReward: option.effect.spiceReward } : {}),
            ...(option.effect.vpReward !== undefined ? { vpReward: option.effect.vpReward } : {}),
            ...(option.effect.persuasionCost !== undefined ? { persuasionCost: option.effect.persuasionCost } : {}),
            ...(option.effect.resourceCost ? { resourceCost: option.effect.resourceCost } : {}),
          };
        }
        if (option.effect.kind === "place-spies") {
          const pending = spyPendingForPlacement(
            sourceLabel,
            source,
            {
              count: option.effect.amount,
              recallForSupply: option.effect.recallForSupply,
              mustPlace: option.effect.mustPlace,
              placementIcon: option.effect.placementIcon,
              placementIcons: option.effect.placementIcons,
              allowSharedPost: option.effect.allowSharedPost,
              source: option.effect.source,
              postPlacementAction: option.effect.postPlacementAction,
            },
            state,
          );
          return pending?.kind === "spy" ? pending : undefined;
        }
        if (option.effect.kind === "acquire-card") {
          const pendingBase = {
            kind: "acquire-card" as const,
            ownerId: source.id,
            source: sourceLabel,
            ...(option.effect.minCost !== undefined ? { minCost: option.effect.minCost } : {}),
            destination: option.effect.destination,
            optional: option.effect.optional,
          };
          return option.effect.paymentResource !== undefined
            ? {
                ...pendingBase,
                ...(option.effect.maxCost !== undefined ? { maxCost: option.effect.maxCost } : {}),
                paymentResource: option.effect.paymentResource,
              }
            : option.effect.maxCost !== undefined
              ? { ...pendingBase, maxCost: option.effect.maxCost }
              : undefined;
        }
        return undefined;
      })();
      if (!pending) return [];
      const pendingOption = {
        id: option.id,
        label: option.label,
        pending,
      };
      return pendingActionChoiceOptionIsResolvable(state, pendingOption) ? [pendingOption] : [];
    });
    return options.length > 0
      ? [{
          kind: "pending-action-choice" as const,
          ownerId: source.id,
          cardId: card.id,
          source: defaultSource,
          ...(effect.optional ? { optional: true as const } : {}),
          options,
        }]
      : [];
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

function pendingActionsForRevealDeployOrRetreatTroops(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction[] {
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id) || !state.conflict || !recipient) {
    return [];
  }
  if (source.role === "Commander" && (recipient.team !== source.team || recipient.role !== "Ally")) return [];
  if (source.role !== "Commander" && recipient.id !== source.id) return [];

  const players = playersWithPendingCardEffect(state, source, recipient);
  const effectState = { ...state, players };
  return resolveRevealDeployOrRetreatTroops(card.effects, {
    trigger: "reveal",
    source,
    target: recipient,
    state: effectState,
  }).flatMap((effect) => {
    if (effect.selector !== "self" || effect.troopCount <= 0) return [];
    const canDeploy =
      recipient.garrison >= effect.troopCount && !conflictDeploymentBlockedFor(state, source.id, recipient.id);
    const canRetreat = recipient.deployedTroops >= effect.troopCount;
    if (!canDeploy && !canRetreat) return [];
    return [{
      kind: "deploy-or-retreat-troops",
      ownerId: source.id,
      recipientId: recipient.id,
      troopCount: effect.troopCount,
      optional: effect.optional,
      source: effect.source ?? card.name,
    }];
  });
}

export function pendingActionsForReveal(
  source: Player,
  state: GameState,
  revealedCards: Card[],
  combatRecipientId: string,
): PendingAction[] {
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
  const payResourceHighCouncilSeatPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPayResourceForHighCouncilSeat(card, source, state)
  );
  const paidRewardChoicePendings = revealedCards
    .map((card) => pendingActionForRevealPaidRewardChoice(
      card,
      source,
      state,
      state.players.find((player) => player.id === combatRecipientId),
    ))
    .filter((pending): pending is PendingAction => Boolean(pending));
  const pendingActionChoicePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealPendingActionChoice(card, source, state, combatRecipientId)
  );
  const influenceIntriguePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealInfluenceIntrigues(card, source, state, combatRecipientId)
  );
  const influenceExchangePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealInfluenceExchange(card, source, state, combatRecipientId)
  );
  const spyRecallIntriguePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealSpyRecallIntrigues(card, source, state, combatRecipientId)
  );
  const retreatTroopStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealRetreatTroopsForStrength(card, source, state, combatRecipientId)
  );
  const deployOrRetreatTroopPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealDeployOrRetreatTroops(card, source, state, combatRecipientId)
  );
  const leaderAbilityPendings = pendingActionsForRevealLeaderAbilities(source, state, combatRecipientId);

  return [
    ...revealSpyPlacementPendings,
    ...revealTrashCardPendings,
    ...payResourceStrengthPendings,
    ...payResourceTroopPendings,
    ...payResourceSandwormPendings,
    ...payResourceHighCouncilSeatPendings,
    ...paidRewardChoicePendings,
    ...pendingActionChoicePendings,
    ...influenceIntriguePendings,
    ...influenceExchangePendings,
    ...spyRecallIntriguePendings,
    ...retreatTroopStrengthPendings,
    ...deployOrRetreatTroopPendings,
    ...leaderAbilityPendings,
  ].filter((action): action is PendingAction => Boolean(action));
}
