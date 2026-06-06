import { advancePendingAction } from "./pending-actions";
import { canPay } from "./board-rules";
import { boardSpaceInfluenceChoicesFor } from "./board-influence-effect-rules";
import { boardSpaces, factionIds, factionLabels } from "./data";
import { resolveAgentBoardSpaceInfluences, resolveGainInfluenceChoices } from "./effect-resolver";
import { adjustInfluenceAndResolveThresholdRewards } from "./leader-rewards";
import { pendingActionForBoardInfluenceChoice } from "./placement-rules";
import { cardHasTrait } from "./card-traits";
import {
  completeChoamContractsForCurrentTurnHarvests,
  recordTurnSpiceGainAndCompleteHarvestContracts,
} from "./contract-rules";
import {
  applyTrashedCardTriggers,
} from "./discard-trigger-rules";
import { changeAllegiancesGainChoices } from "./influence-choices";
import { influenceEffectOwnerForChoice } from "./influence-loss-rules";
import type { GameEffectTrigger } from "./types";
import type { Card, FactionId, GameState, PendingAction, Player, ResourceId } from "./types";

type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;
type OptionalSpacePaymentPendingAction = Extract<PendingAction, { kind: "optional-space-payment" }>;

function boardInfluenceChoiceIsValid(choice: unknown): choice is { ownerId: string; faction: FactionId } {
  if (typeof choice !== "object" || choice === null) return false;
  const candidate = choice as { ownerId?: unknown; faction?: unknown };
  return typeof candidate.ownerId === "string" &&
    typeof candidate.faction === "string" &&
    (factionIds as readonly string[]).includes(candidate.faction);
}

function boardInfluenceChoicePendingIsValid(pending: BoardInfluenceChoicePendingAction) {
  const hasSourceCard = pending.cardId !== undefined || pending.cardOwnerId !== undefined;
  const isAcquireSource = pending.sourceTrigger === "acquire";
  return typeof pending.source === "string" &&
    pending.source.trim().length > 0 &&
    (pending.sourceTrigger === undefined || pending.sourceTrigger === "acquire") &&
    (
      pending.sourceEffect === undefined ||
      pending.sourceEffect === "gain-influence-choice" ||
      pending.sourceEffect === "gain-board-space-influence"
    ) &&
    (pending.amount === undefined || (Number.isInteger(pending.amount) && pending.amount > 0)) &&
    (pending.trashSource === undefined || typeof pending.trashSource === "boolean") &&
    (pending.trashSource !== true || (hasSourceCard && !isAcquireSource)) &&
    (
      pending.requiredHandTrashTrait === undefined ||
      (
        typeof pending.requiredHandTrashTrait === "string" &&
        pending.requiredHandTrashTrait.trim().length > 0 &&
        hasSourceCard &&
        !isAcquireSource &&
        pending.trashSource === true
      )
    ) &&
    (!hasSourceCard || (typeof pending.cardId === "string" && typeof pending.cardOwnerId === "string")) &&
    (pending.targetOwnerId === undefined || typeof pending.targetOwnerId === "string") &&
    (isAcquireSource || hasSourceCard || (
      pending.amount === undefined &&
      pending.trashSource === undefined &&
      typeof pending.spaceId === "string"
    )) &&
    (!isAcquireSource || (hasSourceCard && pending.spaceId === undefined && pending.targetOwnerId === undefined)) &&
    Array.isArray(pending.choices) &&
    pending.choices.every(boardInfluenceChoiceIsValid);
}

function boardInfluenceChoiceArraysMatch(
  first: BoardInfluenceChoicePendingAction["choices"],
  second: BoardInfluenceChoicePendingAction["choices"],
) {
  return first.length === second.length &&
    first.every((choice, index) =>
      choice.ownerId === second[index]?.ownerId &&
      choice.faction === second[index]?.faction
    );
}

function boardInfluenceChoiceMatchesCurrentBoardSpace(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
) {
  const source = state.players[state.activeSeat];
  const space = boardSpaces.find((candidate) => candidate.id === pending.spaceId);
  const placedTargetOwnerId = space ? state.spaces[space.id] : undefined;
  const targetOwnerId = placedTargetOwnerId ?? pending.targetOwnerId;
  const target = targetOwnerId ? state.players.find((player) => player.id === targetOwnerId) : undefined;
  if (!source || !space || !target) return false;
  if (pending.targetOwnerId !== undefined && pending.targetOwnerId !== target.id) return false;
  const expected = pendingActionForBoardInfluenceChoice(space, source, target);
  return expected?.kind === "board-influence-choice" &&
    expected.source === pending.source &&
    expected.spaceId === pending.spaceId &&
    expected.targetOwnerId === target.id &&
    boardInfluenceChoiceArraysMatch(expected.choices, pending.choices);
}

function boardInfluenceChoiceMatchesCurrentRouting(
  state: GameState,
  sourceOwner: Player,
  targetOwnerId: string | undefined,
  choice: { ownerId: string; faction: FactionId },
) {
  if (!changeAllegiancesGainChoices(sourceOwner).includes(choice.faction)) return false;
  const ownerResult = influenceEffectOwnerForChoice(state, sourceOwner, choice.faction, targetOwnerId);
  return ownerResult.valid && ownerResult.owner?.id === choice.ownerId;
}

function sourceCardInfluenceChoicesMatchCurrentRouting(
  state: GameState,
  sourceOwner: Player,
  pending: BoardInfluenceChoicePendingAction,
) {
  const expectedChoices = changeAllegiancesGainChoices(sourceOwner).flatMap((faction) => {
    const ownerResult = influenceEffectOwnerForChoice(state, sourceOwner, faction, pending.targetOwnerId);
    return ownerResult.valid && ownerResult.owner ? [{ ownerId: ownerResult.owner.id, faction }] : [];
  });
  return boardInfluenceChoiceArraysMatch(expectedChoices, pending.choices);
}

function sourceCardPlacementMetadataMatches(
  sourceOwner: Player,
  sourceCard: Card,
  pending: BoardInfluenceChoicePendingAction,
) {
  if (pending.sourceTrigger === "acquire") {
    return pending.spaceId === undefined &&
      pending.targetOwnerId === undefined &&
      pending.trashSource !== true &&
      (sourceOwner.hand.some((card) => card.id === sourceCard.id) ||
        sourceOwner.discard.some((card) => card.id === sourceCard.id));
  }
  if (!sourceCard.agentPlacementSpaceId || pending.spaceId !== sourceCard.agentPlacementSpaceId) return false;
  if (sourceOwner.role === "Commander") {
    return typeof pending.targetOwnerId === "string" &&
      pending.targetOwnerId === sourceCard.agentPlacementTargetOwnerId;
  }
  return pending.targetOwnerId === undefined &&
    (sourceCard.agentPlacementTargetOwnerId === undefined || sourceCard.agentPlacementTargetOwnerId === sourceOwner.id);
}

function sourceCardSupportsInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  sourceOwner: Player,
  sourceCard: Card,
  amount: number,
) {
  if (pending.sourceEffect === "gain-board-space-influence") return false;
  const trigger: GameEffectTrigger = pending.sourceTrigger ?? "agent-play";
  const effects = resolveGainInfluenceChoices(sourceCard.effects, {
    trigger,
    source: sourceOwner,
    state,
  });
  return effects.some((effect) =>
    effect.selector === "self" &&
    effect.trashSource === (pending.trashSource === true) &&
    effect.amount === amount &&
    (effect.source ?? sourceCard.name) === pending.source
  );
}

function sourceCardSupportsBoardSpaceInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  sourceOwner: Player,
  sourceCard: Card,
  amount: number,
) {
  if (pending.sourceEffect === "gain-influence-choice") return false;
  const trigger: GameEffectTrigger = pending.sourceTrigger ?? "agent-play";
  if (trigger !== "agent-play") return false;
  const space = boardSpaces.find((candidate) => candidate.id === sourceCard.agentPlacementSpaceId);
  const target = pending.targetOwnerId
    ? state.players.find((player) => player.id === pending.targetOwnerId)
    : sourceOwner;
  const effects = resolveAgentBoardSpaceInfluences(sourceCard.effects, {
    trigger,
    source: sourceOwner,
    target,
    space,
    state,
  });
  const expectedChoices = space ? boardSpaceInfluenceChoicesFor(space, sourceOwner, target) : [];
  const baseBoardChoice = space && target ? pendingActionForBoardInfluenceChoice(space, sourceOwner, target) : undefined;
  const includesBaseBoardChoice =
    baseBoardChoice?.kind === "board-influence-choice" &&
    boardInfluenceChoiceArraysMatch(baseBoardChoice.choices, pending.choices);
  if (!effects.some((effect) =>
    effect.selector === "self" &&
    effect.trashSource === (pending.trashSource === true) &&
    effect.requiredHandTrashTrait === pending.requiredHandTrashTrait &&
    (
      effect.amount === amount ||
      (includesBaseBoardChoice && effect.amount + (baseBoardChoice.amount ?? 1) === amount)
    ) &&
    (effect.source ?? sourceCard.name) === pending.source
  )) {
    return false;
  }
  return boardInfluenceChoiceArraysMatch(expectedChoices, pending.choices);
}

function sourceCardSupportsSourceInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  sourceOwner: Player,
  sourceCard: Card,
  amount: number,
) {
  const supportsOpenInfluenceChoice =
    sourceCardSupportsInfluenceChoice(state, pending, sourceOwner, sourceCard, amount) &&
    sourceCardInfluenceChoicesMatchCurrentRouting(state, sourceOwner, pending) &&
    pending.choices.every((choice) =>
      boardInfluenceChoiceMatchesCurrentRouting(state, sourceOwner, pending.targetOwnerId, choice)
    );
  return supportsOpenInfluenceChoice ||
    sourceCardSupportsBoardSpaceInfluenceChoice(state, pending, sourceOwner, sourceCard, amount);
}

function resourceLabel(resource: ResourceId) {
  return resource === "solari" ? "Solari" : resource;
}

function formatResourceEntries(resources: Partial<Record<ResourceId, number>>) {
  return Object.entries(resources)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => `${amount} ${resourceLabel(resource as ResourceId)}`)
    .join(", ");
}

function firstHandTrashCardForPending(
  sourceOwner: Player,
  pending: BoardInfluenceChoicePendingAction,
  trashCardId: string | undefined,
) {
  if (!pending.requiredHandTrashTrait || !trashCardId) return undefined;
  return sourceOwner.hand.find((card) =>
    card.id === trashCardId &&
    cardHasTrait(card, pending.requiredHandTrashTrait ?? "")
  );
}

function removeOneCardById(cards: Card[], cardId: string) {
  let removed = false;
  return cards.filter((card) => {
    if (!removed && card.id === cardId) {
      removed = true;
      return false;
    }
    return true;
  });
}

export function resolveBoardInfluenceChoice(
  state: GameState,
  pending: BoardInfluenceChoicePendingAction,
  ownerId: string,
  faction: BoardInfluenceChoicePendingAction["choices"][number]["faction"],
  trashCardId?: string,
): GameState {
  if (state.pendingAction !== pending || !boardInfluenceChoicePendingIsValid(pending)) return state;
  const amount = pending.amount ?? 1;
  const sourceOwner = pending.cardOwnerId
    ? state.players.find((player) => player.id === pending.cardOwnerId)
    : undefined;
  const sourceCard = sourceOwner && pending.cardId
    ? pending.sourceTrigger === "acquire"
      ? [...sourceOwner.hand, ...sourceOwner.discard].find((card) => card.id === pending.cardId)
      : sourceOwner.playArea.find((card) => card.id === pending.cardId)
    : undefined;
  const hasSourceCard = pending.cardId !== undefined || pending.cardOwnerId !== undefined;
  if (hasSourceCard && (
    !sourceOwner ||
    !sourceCard ||
    !sourceCardPlacementMetadataMatches(sourceOwner, sourceCard, pending) ||
    !sourceCardSupportsSourceInfluenceChoice(state, pending, sourceOwner, sourceCard, amount)
  )) {
    return state;
  }
  if (!hasSourceCard && !boardInfluenceChoiceMatchesCurrentBoardSpace(state, pending)) return state;
  const requiredHandTrashCard = sourceOwner
    ? firstHandTrashCardForPending(sourceOwner, pending, trashCardId)
    : undefined;
  if (pending.requiredHandTrashTrait && !requiredHandTrashCard) return state;
  const choice = pending.choices.find((candidate) => candidate.ownerId === ownerId && candidate.faction === faction);
  if (!choice) return state;
  const owner = state.players.find((player) => player.id === choice.ownerId);
  if (!owner) return state;

  const trashText = pending.trashSource && sourceCard
    ? `, trashing ${sourceCard.name}${requiredHandTrashCard ? ` and ${requiredHandTrashCard.name}` : ""}`
    : "";
  const actionLog = `${owner.leader} gains ${amount} ${factionLabels[choice.faction]} Influence from ${pending.source}${trashText}.`;
  const advancedState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== pending.cardOwnerId) return player;
      return {
        ...player,
        ...(pending.trashSource && pending.cardId
          ? { playArea: removeOneCardById(player.playArea, pending.cardId) }
          : {}),
        ...(requiredHandTrashCard
          ? { hand: removeOneCardById(player.hand, requiredHandTrashCard.id) }
          : {}),
      };
    }),
    ...advancePendingAction(state),
    log: [
      actionLog,
      ...state.log,
    ],
  };
  const influenceState = completeChoamContractsForCurrentTurnHarvests(
    adjustInfluenceAndResolveThresholdRewards(advancedState, owner.id, choice.faction, amount),
    actionLog,
  ).state;
  return requiredHandTrashCard && sourceOwner
    ? applyTrashedCardTriggers(influenceState, sourceOwner.id, requiredHandTrashCard, { logAfterCurrentAction: true })
    : influenceState;
}

export function resolveOptionalSpacePayment(
  state: GameState,
  pending: OptionalSpacePaymentPendingAction,
): GameState {
  if (state.pendingAction?.kind !== "optional-space-payment") return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  if (!owner || !canPay(owner, pending.cost)) return state;
  let nextState: GameState = {
    ...state,
    players: state.players.map((player) => {
      if (player.id !== owner.id) return player;
      const resources = { ...player.resources };
      Object.entries(pending.cost).forEach(([resource, amount]) => {
        resources[resource as ResourceId] -= amount ?? 0;
      });
      Object.entries(pending.gain).forEach(([resource, amount]) => {
        resources[resource as ResourceId] += amount ?? 0;
      });
      return { ...player, resources };
    }),
    ...advancePendingAction(state),
    log: [
      `${owner.leader} pays ${formatResourceEntries(pending.cost)} for ${formatResourceEntries(pending.gain)} at ${pending.source}.`,
      ...state.log,
    ],
  };
  const spiceGain = pending.gain.spice ?? 0;
  if (spiceGain > 0) nextState = recordTurnSpiceGainAndCompleteHarvestContracts(nextState, owner.id, spiceGain).state;
  return nextState;
}

export function skipOptionalSpacePayment(
  state: GameState,
  pending: OptionalSpacePaymentPendingAction,
): GameState {
  if (state.pendingAction?.kind !== "optional-space-payment") return state;
  const owner = state.players.find((player) => player.id === pending.ownerId);
  return {
    ...state,
    ...advancePendingAction(state),
    log: [`${owner?.leader ?? "Player"} skips the optional payment at ${pending.source}.`, ...state.log],
  };
}

export function resolveSecretsIntriguePressure(state: GameState, actorId: string): GameState {
  const actor = state.players.find((player) => player.id === actorId);
  if (!actor) return state;
  const opponentsWithIntrigues = state.players.filter(
    (player) => player.team !== actor.team && player.intrigues.length >= 4,
  );
  if (opponentsWithIntrigues.length === 0) return state;

  const transfers = opponentsWithIntrigues.flatMap((opponent) => {
    const intrigueIndex = Math.floor(Math.random() * opponent.intrigues.length);
    const intrigue = opponent.intrigues[intrigueIndex];
    return intrigue ? [{ opponentId: opponent.id, opponentLeader: opponent.leader, intrigue, intrigueIndex }] : [];
  });
  if (transfers.length === 0) return state;

  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === actor.id) {
        return { ...player, intrigues: [...player.intrigues, ...transfers.map(({ intrigue }) => intrigue)] };
      }
      const transfer = transfers.find(({ opponentId }) => opponentId === player.id);
      if (!transfer) return player;
      return { ...player, intrigues: player.intrigues.filter((_, index) => index !== transfer.intrigueIndex) };
    }),
    log: [
      ...transfers.map(({ opponentLeader }) =>
        `${opponentLeader} gives an Intrigue card to ${actor.leader} from Secrets.`,
      ),
      ...state.log,
    ],
  };
}
