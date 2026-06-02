import { resolveInfluence } from "./agent-effects";
import {
  canMoveCardToThroneRow,
  isGenericSignetRingCard,
  isShaddamSignetRingCard,
} from "./card-identifiers";
import {
  canSummonSandworms,
  conflictDeploymentBlockedFor,
  playerHasConflictUnits,
} from "./conflict-rules";
import { playerTroopSupply } from "./deck-utils";
import {
  resolveAgentCommanderResourceSplits,
  resolveAgentDiscardCardForDraws,
  resolveAgentDiscardCardForInfluenceAndDraws,
  resolveAgentMoveCardToThroneRows,
  resolveAgentPayResourceForContracts,
  resolveAgentPayResourceForInfluences,
  resolveAgentPayResourceForSandworms,
  resolveAgentPayTeamResourceForVps,
  resolveAgentTrashSourceForTrades,
  resolveCardEffects,
  resolveRevealLoseInfluenceForIntrigues,
  resolveRevealPayResourceForStrengths,
  resolveRevealPayResourceForTroops,
  resolveRevealRetreatTroopsForStrength,
  resolveRevealTrashCardEffects,
  type SpyPlacementEffectResult,
} from "./effect-resolver";
import { discardCardForDrawChoices } from "./discard-draw-rules";
import { discardCardForInfluenceAndDrawChoices } from "./discard-influence-draw-rules";
import { loseInfluenceForIntriguesChoices } from "./influence-intrigue-rules";
import {
  feydRauthaLeaderName,
  ladyAmberMetulliLeaderName,
  ladyJessicaLeaderName,
  princessIrulanLeaderName,
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import {
  irulanSignetAcquireCards,
  irulanSignetTrashableCards,
} from "./market-rules";
import {
  placeableSpySpaces,
  recallableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { trashableCardsForPending } from "./trash-rules";
import { hasUsedReverendMotherJessicaRepeat } from "./turn-trackers";
import type {
  BoardSpace,
  Card,
  FactionId,
  GameState,
  IconId,
  PendingAction,
  Player,
} from "./types";

export const stabanUnseenNetworkSource = "Unseen Network";
export const stabanUnseenNetworkFactionIcons: IconId[] = ["emperor", "spacing", "bene", "fremen"];
export const shaddamSignetRingTroopCost = 1;
export const shaddamSignetRingInfluenceCost = 3;
export const shaddamSignetRingInfluenceChoices: FactionId[] = [
  "emperor",
  "greatHouses",
  "spacing",
  "bene",
  "fringeWorlds",
];

type IrulanSignetRingPendingAction = Extract<PendingAction, { kind: "irulan-signet-ring" }>;

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

function potentialDeferredMakerChoiceSpice(state: GameState, source: Player, target: Player | undefined, space: BoardSpace) {
  const spice = space.gain?.spice ?? 0;
  const owner = source.role === "Commander" ? target : source;
  if (!space.makerWorms || spice <= 0 || !owner || !canSummonSandworms(state, owner, space.makerWorms)) {
    return 0;
  }
  return spice;
}

function sameSpyPlacementDetails(first: SpyPlacementEffectResult, second: SpyPlacementEffectResult) {
  return first.recallForSupply === second.recallForSupply &&
    first.mustPlace === second.mustPlace &&
    first.placementIcon === second.placementIcon &&
    first.allowSharedPost === second.allowSharedPost &&
    first.source === second.source &&
    first.postPlacementAction === second.postPlacementAction;
}

function mergedSpyPlacement(card: Card, placements: SpyPlacementEffectResult[]) {
  if (placements.length === 0) return undefined;
  const [first, ...rest] = placements;
  if (rest.some((placement) => !sameSpyPlacementDetails(first, placement))) {
    throw new Error(`Unsupported mixed spy placement specs for ${card.name}`);
  }
  return {
    ...first,
    count: placements.reduce((sum, placement) => sum + placement.count, 0),
  };
}

function spyPendingForPlacement(
  card: Card,
  owner: Player,
  placement: SpyPlacementEffectResult,
  state?: GameState,
): PendingAction | undefined {
  if (placement.count <= 0) return undefined;
  const pending: Extract<PendingAction, { kind: "spy" }> = {
    kind: "spy",
    ownerId: owner.id,
    remaining: placement.count,
    ...(placement.recallForSupply ? { recallForSupply: true } : {}),
    ...(placement.mustPlace ? { mustPlaceSpy: true } : {}),
    ...(placement.placementIcon ? { placementIcon: placement.placementIcon } : {}),
    ...(placement.allowSharedPost ? { allowSharedPost: true } : {}),
    ...(placement.postPlacementAction ? { postPlacementAction: placement.postPlacementAction } : {}),
    source: placement.source ?? card.name,
  };
  const canPlace = state
    ? placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0
    : owner.spies > 0;
  return canPlace ? pending : undefined;
}

function pendingActionForAgentSpyPlacement(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const result = resolveCardEffects([card], {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  const sourcePlacement = mergedSpyPlacement(card, result.spyPlacements);
  const allyPlacement = mergedSpyPlacement(card, result.activatedAlly.spyPlacements);
  if (sourcePlacement && allyPlacement) {
    throw new Error(`Unsupported mixed spy placement owners for ${card.name}`);
  }
  if (sourcePlacement) {
    return spyPendingForPlacement(card, source, sourcePlacement, effectState);
  }
  if (allyPlacement && target) {
    return spyPendingForPlacement(card, target, allyPlacement, effectState);
  }
  return undefined;
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
  const sourcePlacement = mergedSpyPlacement(card, result.spyPlacements);
  const allyPlacement = mergedSpyPlacement(card, result.activatedAlly.spyPlacements);
  if (allyPlacement) {
    throw new Error(`Unsupported activated Ally reveal spy placement for ${card.name}`);
  }
  return sourcePlacement ? spyPendingForPlacement(card, source, sourcePlacement, state) : undefined;
}

function pendingActionForAgentDiscardCardForInfluenceAndDraw(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentDiscardCardForInfluenceAndDraws(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.drawCards <= 0 || effect.influenceAmount <= 0) return undefined;
      if (source.hand.length === 0 || discardCardForInfluenceAndDrawChoices(source).length === 0) return undefined;
      return {
        kind: "discard-card-for-influence-and-draw",
        ownerId: source.id,
        ...(source.role === "Commander" && target ? { influenceOwnerId: target.id } : {}),
        source: card.name,
        drawCards: effect.drawCards,
        influenceAmount: effect.influenceAmount,
        optional: effect.optional,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentDiscardCardForDraw(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentDiscardCardForDraws(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      const maxDrawCards = effect.drawCards + (effect.bonusDraw?.drawCards ?? 0);
      if (effect.selector !== "self" || maxDrawCards <= 0) return undefined;
      const pending: Extract<PendingAction, { kind: "discard-card-for-draw" }> = {
        kind: "discard-card-for-draw",
        ownerId: source.id,
        source: card.name,
        drawCards: effect.drawCards,
        optional: effect.optional,
        ...(effect.bonusDraw ? { bonusDraw: { ...effect.bonusDraw } } : {}),
      };
      if (discardCardForDrawChoices(source, pending).length === 0) return undefined;
      return pending;
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayResourceForInfluence(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayResourceForInfluences(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.cost <= 0 || effect.amount <= 0) return undefined;
      if (source.resources[effect.resource] < effect.cost) return undefined;
      if (effect.recipient !== "board-effect-recipient") return undefined;
      const recipient = space?.personal ? source : target;
      if (!recipient) return undefined;
      if (
        recipient.team !== source.team ||
        (recipient.id !== source.id && recipient.role !== "Ally")
      ) {
        return undefined;
      }
      const faction = effect.faction === "board-space"
        ? space ? resolveInfluence(space, source) : null
        : effect.faction;
      if (!faction) return undefined;
      return {
        kind: "pay-resource-for-influence",
        ownerId: source.id,
        influenceOwnerId: recipient.id,
        resource: effect.resource,
        cost: effect.cost,
        faction,
        amount: effect.amount,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true, cardId: card.id } : {}),
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayResourceForSandworms(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || !target || !space) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayResourceForSandworms(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
    space,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.cost <= 0 || effect.sandworms <= 0) return undefined;
      if (source.resources[effect.resource] < effect.cost) return undefined;
      if (effect.recipient !== "activated-ally" || effect.destination !== "conflict") return undefined;
      if (source.role !== "Commander" || target.team !== source.team || target.role !== "Ally") return undefined;
      if (conflictDeploymentBlockedFor(state, source.id, target.id) || !canSummonSandworms(state, target, effect.sandworms)) {
        return undefined;
      }
      return {
        kind: "pay-resource-for-sandworms",
        ownerId: source.id,
        recipientId: target.id,
        resource: effect.resource,
        cost: effect.cost,
        sandworms: effect.sandworms,
        strength: effect.sandworms * 3,
        destination: effect.destination,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        source: effect.source ?? card.name,
        cardId: card.id,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayResourceForContracts(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayResourceForContracts(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.recipient !== "same-team-allies" || effect.sourcePool !== "public-offer") {
        return undefined;
      }
      if (effect.cost <= 0 || effect.contractCount !== 2 || source.resources[effect.resource] < effect.cost) return undefined;
      if (state.contractOffer.length < effect.contractCount) return undefined;
      const allies = sameTeamAllies(effectState.players, source);
      if (!allies) return undefined;
      return {
        kind: "pay-resource-for-contracts",
        ownerId: source.id,
        recipientIds: [allies[0].id, allies[1].id],
        contractIds: [state.contractOffer[0].id, state.contractOffer[1].id],
        resource: effect.resource,
        cost: effect.cost,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        cardId: card.id,
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentPayTeamResourceForVp(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentPayTeamResourceForVps(card.effects, {
    trigger: "agent-play",
    source,
    target,
    space,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.contributors !== "self-and-same-team-allies" || effect.recipient !== "self") {
        return undefined;
      }
      if (effect.cost <= 0 || effect.vp <= 0) return undefined;
      const allies = sameTeamAllies(effectState.players, source);
      if (!allies) return undefined;
      const contributors = [
        effectState.players.find((player) => player.id === source.id) ?? source,
        ...allies,
      ];
      const deferredResource = effect.resource === "spice" && space
        ? potentialDeferredMakerChoiceSpice(state, source, target, space)
        : 0;
      const totalResource =
        contributors.reduce((sum, contributor) => sum + contributor.resources[effect.resource], 0) + deferredResource;
      if (totalResource < effect.cost) return undefined;
      return {
        kind: "team-resource-payment",
        ownerId: source.id,
        contributorIds: contributors.map((contributor) => contributor.id),
        contributions: Object.fromEntries(contributors.map((contributor) => [contributor.id, 0])),
        resource: effect.resource,
        cost: effect.cost,
        vp: effect.vp,
        optional: effect.optional,
        ...(effect.trashSource ? { trashSource: true } : {}),
        cardId: card.id,
        ...(space ? { spaceId: space.id } : {}),
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentThroneRowMove(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (source.team !== "shaddam" || source.role !== "Commander") return undefined;
  if (!state?.imperiumRow.some(canMoveCardToThroneRow)) return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentMoveCardToThroneRows(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self") return undefined;
      return {
        kind: "throne-row",
        ownerId: source.id,
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentCommanderResourceSplit(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (source.role !== "Commander" || target?.team !== source.team || target.role !== "Ally") return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const effects = resolveAgentCommanderResourceSplits(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.options.length === 0) return undefined;
      return {
        kind: "commander-resource-split",
        commanderId: source.id,
        allyId: target.id,
        team: source.team,
        source: effect.source ?? card.name,
        options: effect.options.map((option) => ({ ...option })),
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

function pendingActionForAgentTrashSourceForTrade(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  if (!state || source.role !== "Commander") return undefined;
  const players = playersWithPendingCardEffect(state, source, target);
  const effectState = { ...state, players };
  const effects = resolveAgentTrashSourceForTrades(card.effects, {
    trigger: "agent-play",
    source,
    target,
    state: effectState,
  });
  return effects
    .map((effect): PendingAction | undefined => {
      if (effect.selector !== "self" || effect.partner !== "same-team-allies") return undefined;
      const partners = sameTeamAllies(effectState.players, source);
      if (!partners) return undefined;
      return {
        kind: "trash-source-for-trade",
        ownerId: source.id,
        partnerIds: [partners[0].id, partners[1].id],
        cardId: card.id,
        resource: effect.resource,
        optional: effect.optional,
        ...(effect.partnerLocked ? { partnerLocked: true } : {}),
        source: effect.source ?? card.name,
      };
    })
    .find((pending): pending is PendingAction => Boolean(pending));
}

export function pendingActionForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  const agentSpyPlacementPending = pendingActionForAgentSpyPlacement(card, source, state, target, space);
  if (agentSpyPlacementPending) return agentSpyPlacementPending;
  const agentDiscardInfluenceDrawPending = pendingActionForAgentDiscardCardForInfluenceAndDraw(card, source, state, target);
  if (agentDiscardInfluenceDrawPending) return agentDiscardInfluenceDrawPending;
  const agentDiscardDrawPending = pendingActionForAgentDiscardCardForDraw(card, source, state, target);
  if (agentDiscardDrawPending) return agentDiscardDrawPending;
  const agentPayResourceInfluencePending = pendingActionForAgentPayResourceForInfluence(card, source, state, target, space);
  if (agentPayResourceInfluencePending) return agentPayResourceInfluencePending;
  const agentPayResourceSandwormsPending = pendingActionForAgentPayResourceForSandworms(card, source, state, target, space);
  if (agentPayResourceSandwormsPending) return agentPayResourceSandwormsPending;
  const agentPayResourceContractsPending = pendingActionForAgentPayResourceForContracts(card, source, state, target);
  if (agentPayResourceContractsPending) return agentPayResourceContractsPending;
  const agentPayTeamResourceVpPending = pendingActionForAgentPayTeamResourceForVp(card, source, state, target, space);
  if (agentPayTeamResourceVpPending) return agentPayTeamResourceVpPending;
  const agentThroneRowPending = pendingActionForAgentThroneRowMove(card, source, state, target);
  if (agentThroneRowPending) return agentThroneRowPending;
  const agentCommanderResourceSplitPending = pendingActionForAgentCommanderResourceSplit(card, source, state, target);
  if (agentCommanderResourceSplitPending) return agentCommanderResourceSplitPending;
  const agentTrashSourceForTradePending = pendingActionForAgentTrashSourceForTrade(card, source, state, target);
  if (agentTrashSourceForTradePending) return agentTrashSourceForTradePending;
  if (
    isShaddamSignetRingCard(card) &&
    source.team === "shaddam" &&
    source.role === "Commander" &&
    target?.team === source.team &&
    target.role === "Ally" &&
    source.playArea.some((candidate) => candidate.id === card.id && isShaddamSignetRingCard(candidate))
  ) {
    return {
      kind: "shaddam-signet-ring",
      commanderId: source.id,
      allyId: target.id,
      cardId: card.id,
      source: "Emperor of the Known Universe",
    };
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === princessIrulanLeaderName &&
    source.role === "Ally" &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    const pending: IrulanSignetRingPendingAction = {
      kind: "irulan-signet-ring",
      ownerId: source.id,
      cardId: card.id,
      source: "Chronicler's Insight",
    };
    const canAcquire = state ? irulanSignetAcquireCards(state, pending).length > 0 : false;
    const canTrash = state ? irulanSignetTrashableCards(state, pending).length > 0 : source.hand.length > 0;
    return canAcquire || canTrash ? pending : undefined;
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === ladyJessicaLeaderName &&
    source.role === "Ally" &&
    source.resources.spice + (state && space ? potentialDeferredMakerChoiceSpice(state, source, target, space) : 0) >= 1 &&
    playerTroopSupply(source) > 0 &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    return {
      kind: "jessica-spice-agony",
      ownerId: source.id,
      cardId: card.id,
      source: "Spice Agony",
    };
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === reverendMotherJessicaLeaderName &&
    source.role === "Ally" &&
    source.resources.spice + (state && space ? potentialDeferredMakerChoiceSpice(state, source, target, space) : 0) >= 1 &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    return {
      kind: "jessica-water-of-life",
      ownerId: source.id,
      cardId: card.id,
      source: "Water of Life",
    };
  }
  return undefined;
}

export function pendingActionForJessicaOtherMemories(
  source: Player,
  space: BoardSpace,
): PendingAction | undefined {
  if (source.leader !== ladyJessicaLeaderName || source.role !== "Ally" || source.jessicaMemories <= 0 || space.icon !== "bene") return undefined;
  return {
    kind: "jessica-other-memories",
    ownerId: source.id,
    source: "Other Memories",
    spaceId: space.id,
  };
}

export function pendingActionForReverendMotherJessicaRepeat(
  state: Pick<GameState, "turnReverendMotherJessicaRepeats">,
  owner: Player,
  space: BoardSpace,
  deferredWater = 0,
): PendingAction | undefined {
  if (
    owner.leader !== reverendMotherJessicaLeaderName ||
    owner.role !== "Ally" ||
    (space.icon !== "bene" && space.icon !== "fremen") ||
    Boolean(space.personal) ||
    owner.resources.water + deferredWater < 1 ||
    hasUsedReverendMotherJessicaRepeat(state, owner.id)
  ) {
    return undefined;
  }
  return {
    kind: "jessica-reverend-mother",
    ownerId: owner.id,
    source: "Reverend Mother",
    spaceId: space.id,
  };
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
  const influenceIntriguePendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealInfluenceIntrigues(card, source, state, combatRecipientId)
  );
  const retreatTroopStrengthPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealRetreatTroopsForStrength(card, source, state, combatRecipientId)
  );
  const feydDeviousStrengthPending = pendingActionForFeydDeviousStrength(source, state, combatRecipientId);
  const amberDesertScoutsPending = pendingActionForLadyAmberDesertScouts(source);

  return [
    revealAdjustPending,
    ...revealSpyPlacementPendings,
    ...revealTrashCardPendings,
    ...payResourceStrengthPendings,
    ...payResourceTroopPendings,
    ...influenceIntriguePendings,
    ...retreatTroopStrengthPendings,
    feydDeviousStrengthPending,
    amberDesertScoutsPending,
  ].filter((action): action is PendingAction => Boolean(action));
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

function pendingActionForFeydDeviousStrength(
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction | undefined {
  if (source.leader !== feydRauthaLeaderName || source.role !== "Ally") return undefined;
  const recipient = state.players.find((player) => player.id === combatRecipientId);
  if (!recipient || !playerHasConflictUnits(recipient)) return undefined;
  const pending: Extract<PendingAction, { kind: "recall-spy" }> = {
    kind: "recall-spy",
    ownerId: source.id,
    combatRecipientId,
    remaining: 1,
    strength: 2,
    source: "Devious Strength",
    optional: true,
  };
  return recallableSpySpaces(state, pending).length > 0 ? pending : undefined;
}

function pendingActionForLadyAmberDesertScouts(source: Player): PendingAction | undefined {
  if (
    source.leader !== ladyAmberMetulliLeaderName ||
    source.role !== "Ally" ||
    source.deployedTroops <= 0
  ) {
    return undefined;
  }
  return {
    kind: "amber-desert-scouts",
    ownerId: source.id,
    source: "Desert Scouts",
  };
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
