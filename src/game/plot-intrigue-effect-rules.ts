import { drawCards } from "./deck-utils";
import {
  type InfluenceAdjustmentEffect,
  resolveAcquireCards,
  resolveDiscardCardEffects,
  resolveGameEffects,
  resolveManipulateRowCards,
  resolvePlotDeployTroops,
  resolveTakeContracts,
  resolveTrashCardEffects,
} from "./effect-resolver";
import { conflictDeploymentBlockedFor } from "./conflict-rules";
import { drawIntrigueCards } from "./intrigue-deck";
import {
  adjustInfluenceAndResolveThresholdRewards,
} from "./leader-rewards";
import { acquirableCardsForPending, activatedAllyEffectOwner } from "./market-rules";
import { pendingActionForSpyPlacements } from "./spy-effect-pending-rules";
import { playerHasSpyPost, removeSpyPostOwner } from "./spy-posts";
import { trashableCardsForPending } from "./trash-rules";
import { boardSpaces } from "./data";
import type {
  AcquireCardDestination,
  BoardSpace,
  Card,
  FactionId,
  GameState,
  IntrigueCard,
  PendingAction,
  Player,
  Resources,
} from "./types";

const resourceIds = ["solari", "spice", "water"] as const;

type PlayTypedPlotIntrigueOptions = {
  activatedAllyOwnerId?: string;
  choiceId?: string;
  discardCardId?: string;
  requireActivatedAlly?: boolean;
  targetCardId?: string;
  targetSpaceId?: string;
};

type TypedPlotIntrigueOutcome = {
  acquireDestination?: AcquireCardDestination;
  acquirePending?: AcquireCardPendingAction;
  cardsDrawn: number;
  deployableTroops?: number;
  deployOwner?: Player;
  deployPending?: DeployPendingAction;
  discardedCard?: Card;
  manipulatedCard?: Card;
  recalledSpySpace?: BoardSpace;
};

type AcquireCardPendingAction = Extract<PendingAction, { kind: "acquire-card" }>;
type DeployPendingAction = Extract<PendingAction, { kind: "deploy" }>;
type TrashCardPendingAction = Extract<PendingAction, { kind: "trash-card" }>;

function hasResourceGains(gain: Partial<Resources>) {
  return resourceIds.some((resource) => (gain[resource] ?? 0) > 0);
}

function hasResourceSpends(spent: Partial<Resources>) {
  return resourceIds.some((resource) => (spent[resource] ?? 0) > 0);
}

function hasInfluenceAdjustments(adjustments: InfluenceAdjustmentEffect[]) {
  return adjustments.some((adjustment) => adjustment.amount !== 0);
}

function canSpendResources(resources: Resources, spent: Partial<Resources>) {
  return resourceIds.every((resource) => resources[resource] >= (spent[resource] ?? 0));
}

function applyResourceChanges(resources: Resources, gain: Partial<Resources>, spent: Partial<Resources>): Resources {
  return resourceIds.reduce(
    (next, resource) => ({
      ...next,
      [resource]: next[resource] + (gain[resource] ?? 0) - (spent[resource] ?? 0),
    }),
    { ...resources },
  );
}

function publicContractPendingFor(
  state: GameState,
  player: Player,
  intrigue: IntrigueCard,
  effect: ReturnType<typeof resolveTakeContracts>[number] | undefined,
): PendingAction | undefined {
  if (!effect || effect.selector !== "self" || effect.amount <= 0 || effect.sourcePool !== "public-offer") return undefined;
  if (effect.amount !== 1) throw new Error(`Unsupported Plot Intrigue contract amount ${effect.amount}`);
  if (state.contractOffer.length === 0) return undefined;
  return {
    kind: "contract",
    ownerId: player.id,
    source: effect.source ?? intrigue.name,
    publicOnly: true,
    ...(effect.optional ? { optional: true } : {}),
  };
}

function acquireCardPendingFor(
  state: GameState,
  player: Player,
  intrigue: IntrigueCard,
  effect: ReturnType<typeof resolveAcquireCards>[number] | undefined,
): AcquireCardPendingAction | undefined {
  if (!effect || effect.selector !== "self") return undefined;
  const base = {
    kind: "acquire-card" as const,
    ownerId: player.id,
    source: effect.source ?? intrigue.name,
    ...(effect.minCost !== undefined ? { minCost: effect.minCost } : {}),
    destination: effect.destination,
    ...(effect.optional ? { optional: true as const } : {}),
  };
  let pending: AcquireCardPendingAction;
  if (effect.maxCost !== undefined) {
    pending = {
      ...base,
      maxCost: effect.maxCost,
      ...(effect.paymentResource ? { paymentResource: effect.paymentResource } : {}),
    };
  } else {
    const paymentResource = effect.paymentResource;
    if (!paymentResource) {
      throw new Error("Invalid Plot Intrigue acquire-card effect without maxCost or paymentResource");
    }
    pending = {
      ...base,
      paymentResource,
    };
  }
  return acquirableCardsForPending(state, pending).length > 0 ? pending : undefined;
}

function trashCardPendingFor(
  player: Player,
  intrigue: IntrigueCard,
  effect: ReturnType<typeof resolveTrashCardEffects>[number] | undefined,
): TrashCardPendingAction | undefined {
  if (!effect || effect.selector !== "self") return undefined;
  return {
    kind: "trash-card",
    ownerId: player.id,
    source: intrigue.name,
    optional: effect.optional,
    ...(effect.zones ? { zones: effect.zones } : {}),
    ...(effect.excludeSource ? { excludeCardId: intrigue.id } : {}),
    ...(effect.requiredTrait ? { requiredTrait: effect.requiredTrait } : {}),
  };
}

function deployTroopsOwnerFor(
  player: Player,
  activatedAlly: Player | undefined,
  effect: ReturnType<typeof resolvePlotDeployTroops>[number] | undefined,
): Player | undefined {
  if (!effect) return undefined;
  if (effect.selector === "self") return player;
  if (effect.selector === "activated-ally") return activatedAlly;
  throw new Error(`Unsupported Plot Intrigue deploy-troops selector "${effect.selector}"`);
}

function selectedDiscardCardFor(
  player: Player,
  effect: ReturnType<typeof resolveDiscardCardEffects>[number] | undefined,
  cardId: string | undefined,
): Card | undefined {
  if (!effect || effect.selector !== "self") return undefined;
  if (effect.amount !== 1) throw new Error(`Unsupported Plot Intrigue discard-card amount ${effect.amount}`);
  if (!cardId) return undefined;
  return player.hand.find((card) => card.id === cardId);
}

function rowManipulationFor(
  state: GameState,
  targetCardId: string | undefined,
  effect: ReturnType<typeof resolveManipulateRowCards>[number] | undefined,
): { card: Card; imperiumRow: Card[]; marketDeck: Card[] } | undefined {
  if (!effect || effect.selector !== "self" || !targetCardId) return undefined;
  const rowIndex = state.imperiumRow.findIndex((card) => card.id === targetCardId);
  const manipulatedCard = state.imperiumRow[rowIndex];
  if (!manipulatedCard) return undefined;
  const [replacement, ...marketDeck] = state.marketDeck;
  const imperiumRow = state.imperiumRow.flatMap((card, index) => {
    if (index !== rowIndex) return [card];
    return replacement ? [replacement] : [];
  });
  return { card: manipulatedCard, imperiumRow, marketDeck };
}

function selectedSpyRecallFor(
  state: GameState,
  player: Player,
  recalls: ReturnType<typeof resolveGameEffects>["spyRecalls"],
): { space: BoardSpace; spyPosts: GameState["spyPosts"]; sharedSpyPosts: GameState["sharedSpyPosts"] } | undefined {
  if (recalls.length === 0) return undefined;
  if (recalls.length > 1) throw new Error("Unsupported multiple Plot Intrigue spy recall effects");
  const [recall] = recalls;
  const space = boardSpaces.find((candidate) => candidate.id === recall.spaceId);
  if (!space || !playerHasSpyPost(state, space.id, player.id)) return undefined;
  return {
    space,
    ...removeSpyPostOwner(state, space.id, player.id),
  };
}

function canApplyInfluenceAdjustments(
  source: Player,
  activatedAlly: Player | undefined,
  adjustments: InfluenceAdjustmentEffect[],
) {
  const influenceByOwner = new Map<string, Partial<Record<FactionId, number>>>();
  const influenceFor = (owner: Player) => {
    const existing = influenceByOwner.get(owner.id);
    if (existing) return existing;
    const influence = { ...owner.influence };
    influenceByOwner.set(owner.id, influence);
    return influence;
  };

  return adjustments.every((adjustment) => {
    if (adjustment.amount === 0) return true;
    const owner = adjustment.selector === "activated-ally" ? activatedAlly : source;
    if (!owner) return false;
    const influence = influenceFor(owner);
    const nextAmount = (influence[adjustment.faction] ?? 0) + adjustment.amount;
    if (nextAmount < 0) return false;
    influence[adjustment.faction] = nextAmount;
    return true;
  });
}

function applyInfluenceAdjustments(
  state: GameState,
  sourceId: string,
  activatedAllyId: string | undefined,
  adjustments: InfluenceAdjustmentEffect[],
) {
  return adjustments.reduce((next, adjustment) => {
    const ownerId = adjustment.selector === "activated-ally" ? activatedAllyId : sourceId;
    return ownerId
      ? adjustInfluenceAndResolveThresholdRewards(next, ownerId, adjustment.faction, adjustment.amount)
      : next;
  }, state);
}

export function playTypedPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  isExpectedIntrigue: (intrigue: IntrigueCard) => boolean,
  logFor: (
    player: Player,
    contractPending: PendingAction | undefined,
    activatedAlly: Player | undefined,
    resolved: ReturnType<typeof resolveGameEffects>,
    outcome: TypedPlotIntrigueOutcome,
  ) => string,
  options: PlayTypedPlotIntrigueOptions = {},
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isExpectedIntrigue(intrigue)) return state;
  const targetSpace = options.targetSpaceId
    ? boardSpaces.find((space) => space.id === options.targetSpaceId)
    : undefined;
  if (options.targetSpaceId && !targetSpace) return state;

  const activatedAllyResult = options.requireActivatedAlly || options.activatedAllyOwnerId
    ? activatedAllyEffectOwner(state, player, options.activatedAllyOwnerId)
    : { valid: true, owner: undefined };
  if (!activatedAllyResult.valid) return state;
  const activatedAlly = activatedAllyResult.owner;
  const context = {
    trigger: "plot-intrigue" as const,
    choiceId: options.choiceId,
    source: player,
    target: activatedAlly,
    ...(targetSpace ? { space: targetSpace } : {}),
    state,
  };
  const resolved = resolveGameEffects(intrigue.effects, context);
  const acquireEffects = resolveAcquireCards(intrigue.effects, context);
  const contractEffects = resolveTakeContracts(intrigue.effects, context);
  const discardEffects = resolveDiscardCardEffects(intrigue.effects, context);
  const trashEffects = resolveTrashCardEffects(intrigue.effects, context);
  const rowManipulationEffects = resolveManipulateRowCards(intrigue.effects, context);
  const deployEffects = resolvePlotDeployTroops(intrigue.effects, context);
  if (acquireEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue acquire-card effects");
  if (contractEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue take-contracts effects");
  if (discardEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue discard-card effects");
  if (trashEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue trash-card effects");
  if (rowManipulationEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue row manipulation effects");
  if (deployEffects.length > 1) throw new Error("Unsupported multiple Plot Intrigue deploy-troops effects");
  const [acquireEffect] = acquireEffects;
  const [contractEffect] = contractEffects;
  const [discardEffect] = discardEffects;
  const [trashEffect] = trashEffects;
  const [rowManipulationEffect] = rowManipulationEffects;
  const [deployEffect] = deployEffects;
  const discardedCard = selectedDiscardCardFor(player, discardEffect, options.discardCardId);
  if (discardEffect && !discardedCard) return state;
  const spyRecall = selectedSpyRecallFor(state, player, resolved.spyRecalls);
  if (resolved.spyRecalls.length > 0 && !spyRecall) return state;
  const deployOwner = deployTroopsOwnerFor(player, activatedAlly, deployEffect);
  if (deployEffect && (!state.conflict || !deployOwner || conflictDeploymentBlockedFor(state, player.id, deployOwner.id))) {
    return state;
  }
  const acquirePending = acquireCardPendingFor(state, player, intrigue, acquireEffect);
  const contractPending = publicContractPendingFor(state, player, intrigue, contractEffect);
  const spyPending = pendingActionForSpyPlacements(intrigue.name, player, resolved.spyPlacements, state);
  const rowManipulation = rowManipulationFor(state, options.targetCardId, rowManipulationEffect);
  if (rowManipulationEffect && !rowManipulation) return state;
  if (resolved.activatedAlly.spyPlacements.length > 0) {
    throw new Error(`Unsupported activated Ally Plot Intrigue spy placement for ${intrigue.name}`);
  }
  const hasTroopRecruits = resolved.recruitedTroops > 0 || resolved.activatedAlly.recruitedTroops > 0;
  const hasCardDraw = resolved.cardsToDraw > 0;
  const hasIntrigueDraw = resolved.intriguesToDraw > 0;
  const hasResourceSpend = hasResourceSpends(resolved.spentResources);
  const hasInfluenceAdjustment = hasInfluenceAdjustments(resolved.influenceAdjustments);
  const hasSpyRecall = Boolean(spyRecall);
  const hasVpGain = resolved.vp > 0;
  const hasAcquireRecruitBonus = resolved.acquireRecruitBonus > 0;
  if (resolved.acquireRecruitBonus > 1) {
    throw new Error(`Unsupported Plot Intrigue acquire-recruit bonus amount ${resolved.acquireRecruitBonus}`);
  }
  if (!canSpendResources(player.resources, resolved.spentResources)) return state;
  if (!canApplyInfluenceAdjustments(player, activatedAlly, resolved.influenceAdjustments)) return state;
  if (
    !hasResourceGains(resolved.revealGain) &&
    !hasResourceSpend &&
    !hasInfluenceAdjustment &&
    !hasVpGain &&
    !hasTroopRecruits &&
    !hasSpyRecall &&
    !resolved.removeShieldWall &&
    !hasCardDraw &&
    !hasIntrigueDraw &&
    !hasAcquireRecruitBonus &&
    !acquireEffect &&
    !contractPending &&
    !discardEffect &&
    !spyPending &&
    !trashEffect &&
    !deployEffect &&
    !rowManipulation
  ) {
    return state;
  }

  const outcome: TypedPlotIntrigueOutcome = {
    acquireDestination: acquireEffect?.destination,
    acquirePending,
    cardsDrawn: 0,
    discardedCard,
    manipulatedCard: rowManipulation?.card,
    recalledSpySpace: spyRecall?.space,
  };
  let sourceAfterEffects: Player | undefined;
  const players = state.players.map((candidate) => {
    if (candidate.id === player.id) {
      let next = {
        ...candidate,
        resources: applyResourceChanges(candidate.resources, resolved.revealGain, resolved.spentResources),
        callToArmsActive: hasAcquireRecruitBonus ? true : candidate.callToArmsActive,
        discard: discardedCard ? [...candidate.discard, discardedCard] : candidate.discard,
        garrison: candidate.garrison + resolved.recruitedTroops,
        hand: discardedCard ? candidate.hand.filter((card) => card.id !== discardedCard.id) : candidate.hand,
        manipulatedCards: rowManipulation
          ? [...candidate.manipulatedCards, rowManipulation.card]
          : candidate.manipulatedCards,
        spies: candidate.spies + (hasSpyRecall ? 1 : 0),
        intrigues: candidate.intrigues.filter((card) => card.id !== intrigue.id),
      };
      if (resolved.vp > 0) {
        next = { ...next, vp: next.vp + resolved.vp };
      }
      if (hasCardDraw) {
        const handSize = next.hand.length;
        next = drawCards(next, handSize + resolved.cardsToDraw);
        outcome.cardsDrawn = next.hand.length - handSize;
      }
      sourceAfterEffects = next;
      return next;
    }
    if (!activatedAlly || candidate.id !== activatedAlly.id) return candidate;
    return {
      ...candidate,
      garrison: candidate.garrison + resolved.activatedAlly.recruitedTroops,
    };
  });
  const deployOwnerAfterEffects = deployOwner
    ? players.find((candidate) => candidate.id === deployOwner.id) ?? deployOwner
    : undefined;
  const deployableTroops = deployEffect && deployOwnerAfterEffects
    ? Math.min(deployOwnerAfterEffects.garrison, deployEffect.max)
    : undefined;
  const deployPending = deployEffect && deployOwnerAfterEffects && deployableTroops && deployableTroops > 0
    ? {
        kind: "deploy" as const,
        ownerId: deployOwnerAfterEffects.id,
        remaining: deployableTroops,
        source: deployEffect.source ?? intrigue.name,
      }
    : undefined;
  outcome.deployOwner = deployOwnerAfterEffects;
  outcome.deployableTroops = deployableTroops;
  outcome.deployPending = deployPending;
  const trashPending = trashCardPendingFor(sourceAfterEffects ?? player, intrigue, trashEffect);
  const canResolveTrash = trashPending && trashableCardsForPending(sourceAfterEffects ?? player, trashPending).length > 0;
  if (trashPending && !canResolveTrash && !trashPending.optional) return state;
  const pendingActions = [
    contractPending,
    acquirePending,
    spyPending,
    deployPending,
    canResolveTrash ? trashPending : undefined,
  ].filter((action): action is PendingAction => Boolean(action));
  const immediateState = {
    ...state,
    players,
    imperiumRow: rowManipulation?.imperiumRow ?? state.imperiumRow,
    marketDeck: rowManipulation?.marketDeck ?? state.marketDeck,
    shieldWall: resolved.removeShieldWall ? false : state.shieldWall,
    spyPosts: spyRecall?.spyPosts ?? state.spyPosts,
    sharedSpyPosts: spyRecall?.sharedSpyPosts ?? state.sharedSpyPosts,
    pendingAction: pendingActions[0],
    pendingQueue: pendingActions.slice(1),
  };
  const drawnState = hasIntrigueDraw
    ? drawIntrigueCards(immediateState, player.id, resolved.intriguesToDraw, intrigue.name)
    : immediateState;
  const playedState = {
    ...drawnState,
    intrigueDiscard: [...drawnState.intrigueDiscard, intrigue],
    log: [logFor(player, contractPending, activatedAlly, resolved, outcome), ...drawnState.log],
  };
  return hasInfluenceAdjustment
    ? applyInfluenceAdjustments(playedState, player.id, activatedAlly?.id, resolved.influenceAdjustments)
    : playedState;
}
