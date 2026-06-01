import { resolveInfluence } from "./agent-effects";
import {
  canMoveCardToThroneRow,
  isCommandRespectCommanderCard,
  isCalculusOfPowerCard,
  isCorrinoMightCommanderCard,
  isCriticalShipmentsCommanderCard,
  isDemandAttentionCommanderCard,
  isDemandResultsCommanderCard,
  isDesertCallCommanderCard,
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
  feydRauthaLeaderName,
  ladyAmberMetulliLeaderName,
  ladyJessicaLeaderName,
  ladyMargotFenringLeaderName,
  princessIrulanLeaderName,
  reverendMotherJessicaLeaderName,
} from "./leader-constants";
import {
  irulanSignetAcquireCards,
  irulanSignetTrashableCards,
} from "./market-rules";
import { stabanTuekLeaderName } from "./player-setup";
import {
  placeableSpySpaces,
  recallableSpySpaces,
  recallableSpySupplySpaces,
} from "./spy-choices";
import { threatenSpiceProductionCost } from "./threaten-spice-production";
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
export const emperorCardTrait = "Faction: Emperor";
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

export function pendingActionForCard(
  card: Card,
  source: Player,
  state?: GameState,
  target?: Player,
  space?: BoardSpace,
): PendingAction | undefined {
  if (
    (card.sourceId === 561 || card.name === "Imperial Tent") &&
    source.team === "shaddam" &&
    source.role === "Commander" &&
    state?.imperiumRow.some(canMoveCardToThroneRow)
  ) {
    return { kind: "throne-row", ownerId: source.id, source: card.name };
  }
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
    source.leader === ladyMargotFenringLeaderName &&
    source.role === "Ally" &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    const pending: PendingAction = {
      kind: "spy",
      ownerId: source.id,
      remaining: 1,
      source: "Arrakis Informant",
      placementIcon: "bene",
      recallForSupply: true,
    };
    const canPlace = state
      ? placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0
      : source.spies > 0;
    return canPlace ? pending : undefined;
  }
  if (
    isGenericSignetRingCard(card) &&
    source.leader === stabanTuekLeaderName &&
    source.role === "Ally" &&
    source.playArea.some((candidate) => candidate.id === card.id && isGenericSignetRingCard(candidate))
  ) {
    const pending: PendingAction = {
      kind: "spy",
      ownerId: source.id,
      remaining: 1,
      source: stabanUnseenNetworkSource,
      recallForSupply: true,
      postPlacementAction: "staban-unseen-network",
    };
    const canPlace = state
      ? placeableSpySpaces(state, pending).length > 0 || recallableSpySupplySpaces(state, pending).length > 0
      : source.spies > 0;
    return canPlace ? pending : undefined;
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

export function pendingActionForCalculusOfPowerReveal(
  card: Card,
  source: Player,
  state: GameState,
  combatRecipientId: string,
): PendingAction | undefined {
  const combatRecipient = state.players.find((player) => player.id === combatRecipientId);
  if (
    !isCalculusOfPowerCard(card) ||
    !combatRecipient ||
    !playerHasConflictUnits(combatRecipient) ||
    !source.playArea.some((candidate) =>
      candidate.id !== card.id && candidate.traits?.includes(emperorCardTrait)
    )
  ) {
    return undefined;
  }

  return {
    kind: "trash-card",
    ownerId: source.id,
    source: card.name,
    optional: true,
    zones: ["playArea"],
    excludeCardId: card.id,
    requiredTrait: emperorCardTrait,
    combatRecipientId,
    strengthReward: 3,
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
  const revealAdjustPending: PendingAction | undefined = printedRevealCards.length > 0
    ? {
        kind: "reveal-adjust",
        ownerId: source.id,
        combatRecipientId,
        cards: printedRevealCards,
        persuasionAdjustment: 0,
        strengthAdjustment: 0,
        source: "Printed reveal",
      }
    : undefined;
  const corrinoMightPending = revealedCards
    .map((card) => pendingActionForCorrinoMightReveal(card, source, state))
    .find((pending): pending is PendingAction => Boolean(pending));
  const calculusOfPowerPending = revealedCards
    .map((card) => pendingActionForCalculusOfPowerReveal(card, source, state, combatRecipientId))
    .find((pending): pending is PendingAction => Boolean(pending));
  const feydDeviousStrengthPending = pendingActionForFeydDeviousStrength(source, state, combatRecipientId);
  const amberDesertScoutsPending = pendingActionForLadyAmberDesertScouts(source);

  return [revealAdjustPending, calculusOfPowerPending, corrinoMightPending, feydDeviousStrengthPending, amberDesertScoutsPending].filter((action): action is PendingAction => Boolean(action));
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
