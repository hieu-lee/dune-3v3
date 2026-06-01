import { resolveInfluence } from "./agent-effects";
import {
  canMoveCardToThroneRow,
  isCommandRespectCommanderCard,
  isCorrinoMightCommanderCard,
  isCriticalShipmentsCommanderCard,
  isDemandAttentionCommanderCard,
  isDemandResultsCommanderCard,
  isDesertCallCommanderCard,
  isDevastatingAssaultCommanderCard,
  isGenericSignetRingCard,
  isShaddamSignetRingCard,
  isThreatenSpiceProductionCommanderCard,
  isUsulCommanderCard,
} from "./card-identifiers";
import {
  canSummonSandworms,
  playerHasConflictUnits,
} from "./conflict-rules";
import { playerTroopSupply } from "./deck-utils";
import {
  resolveAgentDiscardCardForInfluenceAndDraws,
  resolveAgentMoveCardToThroneRows,
  resolveCardEffects,
  resolveRevealLoseInfluenceForIntrigues,
  resolveRevealRetreatTroopsForStrength,
  resolveRevealTrashCardEffects,
  type SpyPlacementEffectResult,
} from "./effect-resolver";
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
import { threatenSpiceProductionCost } from "./threaten-spice-production";
import { trashableCardsForPending } from "./trash-rules";
import { hasUsedReverendMotherJessicaRepeat } from "./turn-trackers";
import type {
  BoardSpace,
  Card,
  CommanderResourceSplitOption,
  FactionId,
  GameState,
  IconId,
  PendingAction,
  Player,
  TeamId,
} from "./types";

export const stabanUnseenNetworkSource = "Unseen Network";
export const stabanUnseenNetworkFactionIcons: IconId[] = ["emperor", "spacing", "bene", "fremen"];
export const corrinoMightCost = 3;
export const devastatingAssaultCost = 3;
export const devastatingAssaultStrength = 5;
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

function shaddamAllyIds(state: GameState, source: Player): [string, string] | undefined {
  const allies = sameTeamAllies(state.players, source);
  if (!allies) return undefined;
  return [allies[0].id, allies[1].id];
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

function demandAttentionRecipient(source: Player, target: Player | undefined, space: BoardSpace) {
  if (space.personal) return source;
  return target;
}

function commanderResourceSplitPendingAction(
  card: Card,
  source: Player,
  target: Player | undefined,
  team: TeamId,
  options: CommanderResourceSplitOption[],
): PendingAction | undefined {
  if (
    source.team !== team ||
    source.role !== "Commander" ||
    target?.team !== source.team ||
    target.role !== "Ally"
  ) {
    return undefined;
  }
  return {
    kind: "commander-resource-split",
    commanderId: source.id,
    allyId: target.id,
    team,
    source: card.name,
    options,
  };
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
): PendingAction | undefined {
  if (!card.effects || !source.playArea.some((candidate) => candidate.id === card.id)) return undefined;
  const players = state ? playersWithPendingCardEffect(state, source, target) : undefined;
  const effectState = state && players ? { ...state, players } : undefined;
  const result = resolveCardEffects([card], {
    trigger: "agent-play",
    source,
    target,
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

export function pendingActionForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  const agentSpyPlacementPending = pendingActionForAgentSpyPlacement(card, source, state, target);
  if (agentSpyPlacementPending) return agentSpyPlacementPending;
  const agentDiscardInfluenceDrawPending = pendingActionForAgentDiscardCardForInfluenceAndDraw(card, source, state, target);
  if (agentDiscardInfluenceDrawPending) return agentDiscardInfluenceDrawPending;
  const agentThroneRowPending = pendingActionForAgentThroneRowMove(card, source, state, target);
  if (agentThroneRowPending) return agentThroneRowPending;
  if (isUsulCommanderCard(card)) {
    return commanderResourceSplitPendingAction(card, source, target, "muaddib", [
      { commanderResource: "water", commanderAmount: 1, allyResource: "spice", allyAmount: 1 },
      { commanderResource: "spice", commanderAmount: 1, allyResource: "water", allyAmount: 1 },
    ]);
  }
  if (isCriticalShipmentsCommanderCard(card)) {
    return commanderResourceSplitPendingAction(card, source, target, "shaddam", [
      { commanderResource: "water", commanderAmount: 1, allyResource: "solari", allyAmount: 2 },
      { commanderResource: "solari", commanderAmount: 2, allyResource: "water", allyAmount: 1 },
    ]);
  }
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
  if (
    isDesertCallCommanderCard(card) &&
    source.team === "muaddib" &&
    source.role === "Commander" &&
    source.resources.water >= 1 &&
    state &&
    space?.icon === "spice" &&
    target?.team === source.team &&
    target.role === "Ally" &&
    canSummonSandworms(state, target, 1)
  ) {
    return {
      kind: "desert-call",
      commanderId: source.id,
      allyId: target.id,
      cardId: card.id,
      source: card.name,
    };
  }
  if (
    isThreatenSpiceProductionCommanderCard(card) &&
    source.team === "muaddib" &&
    source.role === "Commander" &&
    state &&
    space?.icon === "spice"
  ) {
    const players = playersWithPendingCardEffect(state, source, target);
    const allies = sameTeamAllies(players, source);
    if (!allies) return undefined;
    const contributors = [
      players.find((player) => player.id === source.id) ?? source,
      ...allies,
    ];
    const totalSpice =
      contributors.reduce((sum, contributor) => sum + contributor.resources.spice, 0) +
      potentialDeferredMakerChoiceSpice(state, source, target, space);
    if (totalSpice < threatenSpiceProductionCost) return undefined;
    return {
      kind: "threaten-spice-production",
      commanderId: source.id,
      contributorIds: contributors.map((contributor) => contributor.id),
      contributions: Object.fromEntries(contributors.map((contributor) => [contributor.id, 0])),
      cost: threatenSpiceProductionCost,
      cardId: card.id,
      source: card.name,
    };
  }
  if (
    isCommandRespectCommanderCard(card) &&
    source.team === "muaddib" &&
    source.role === "Commander" &&
    source.swordmasterBonus &&
    state &&
    source.playArea.some((candidate) => candidate.id === card.id && isCommandRespectCommanderCard(candidate))
  ) {
    const partners = sameTeamAllies(state.players, source);
    if (!partners) return undefined;
    return {
      kind: "command-respect",
      commanderId: source.id,
      partnerIds: [partners[0].id, partners[1].id],
      cardId: card.id,
      source: card.name,
    };
  }
  if (
    isDemandResultsCommanderCard(card) &&
    source.team === "shaddam" &&
    source.role === "Commander" &&
    source.resources.solari >= 2 &&
    state &&
    state.contractOffer.length >= 2
  ) {
    const allyIds = shaddamAllyIds(state, source);
    if (!allyIds) return undefined;
    return {
      kind: "demand-results",
      commanderId: source.id,
      allyIds,
      contractIds: [state.contractOffer[0].id, state.contractOffer[1].id],
      cardId: card.id,
      source: card.name,
    };
  }
  const demandAttentionFaction = space ? resolveInfluence(space, source) : null;
  if (
    space &&
    demandAttentionFaction &&
    isDemandAttentionCommanderCard(card) &&
    source.team === "muaddib" &&
    source.role === "Commander" &&
    source.resources.solari >= 4
  ) {
    const recipient = demandAttentionRecipient(source, target, space);
    if (
      !recipient ||
      recipient.team !== source.team ||
      (recipient.id !== source.id && recipient.role !== "Ally")
    ) {
      return undefined;
    }
    return {
      kind: "demand-attention",
      commanderId: source.id,
      recipientId: recipient.id,
      faction: demandAttentionFaction,
      cardId: card.id,
      source: card.name,
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

export function pendingActionForCorrinoMightReveal(
  card: Card,
  source: Player,
  state: GameState,
): PendingAction | undefined {
  if (
    !isCorrinoMightCommanderCard(card) ||
    source.team !== "shaddam" ||
    source.role !== "Commander" ||
    source.resources.spice < corrinoMightCost ||
    !source.playArea.some((candidate) => candidate.id === card.id && isCorrinoMightCommanderCard(candidate))
  ) {
    return undefined;
  }

  const allies = sameTeamAllies(state.players, source);
  if (!allies) return undefined;
  return {
    kind: "corrino-might",
    commanderId: source.id,
    allyIds: [allies[0].id, allies[1].id],
    cost: corrinoMightCost,
    cardId: card.id,
    source: card.name,
  };
}

export function pendingActionForDevastatingAssaultReveal(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction | undefined {
  const combatRecipient = state.players.find((player) => player.id === combatRecipientId);
  if (
    !isDevastatingAssaultCommanderCard(card) ||
    source.team !== "shaddam" ||
    source.role !== "Commander" ||
    !source.swordmasterBonus ||
    source.resources.solari < devastatingAssaultCost ||
    !source.playArea.some((candidate) => candidate.id === card.id && isDevastatingAssaultCommanderCard(candidate)) ||
    !combatRecipient ||
    combatRecipient.team !== source.team ||
    combatRecipient.role !== "Ally" ||
    !playerHasConflictUnits(combatRecipient)
  ) {
    return undefined;
  }

  return {
    kind: "devastating-assault",
    commanderId: source.id,
    combatRecipientId,
    cost: devastatingAssaultCost,
    strength: devastatingAssaultStrength,
    cardId: card.id,
    source: card.name,
  };
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
  const corrinoMightPending = revealedCards
    .map((card) => pendingActionForCorrinoMightReveal(card, source, state))
    .find((pending): pending is PendingAction => Boolean(pending));
  const revealTrashCardPendings = revealedCards.flatMap((card) =>
    pendingActionsForRevealTrashCards(card, source, state, combatRecipientId)
  );
  const devastatingAssaultPending = revealedCards
    .map((card) => pendingActionForDevastatingAssaultReveal(card, source, state, combatRecipientId))
    .find((pending): pending is PendingAction => Boolean(pending));
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
    ...revealTrashCardPendings,
    devastatingAssaultPending,
    corrinoMightPending,
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
