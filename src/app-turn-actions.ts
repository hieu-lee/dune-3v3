import {
  addResources,
  boardSpaceIntrigueGainFor,
  boardSpaceRevealPersuasionFor,
  boardSpaceSpiceGainFor,
  revealGainLabel,
} from "./app-helpers";
import { factionLabels } from "./game/data";
import {
  adjustInfluence,
  applyBoardEffect,
  applyCardAgentEffect,
  canEnterOccupiedSpaceWithSpy,
  collectMakerSpice,
  completeChoamContractsForCurrentTurnHarvests,
  completeChoamContractsForBoardSpace,
  defaultActivatedAllyId,
  drawIntrigueCards,
  effectiveCost,
  pendingActionForBoardInfluenceChoice,
  pendingActionForBoardAgentRecall,
  pendingActionForBoardCardDraw,
  pendingActionForBoardIntrigueSwap,
  pendingActionForBoardTrash,
  pendingActionsForLeaderPlacementEffects,
  pendingActionForMakerChoice,
  pendingActionForOptionalSpacePayment,
  pendingActionForReverendMotherJessicaRepeat,
  pendingActionForSietchTabr,
  pendingActionForSpace,
  pendingActionsFor,
  pendingActionsForCard,
  pendingActionsForReveal,
  playerHasConflictUnits,
  playerTroopSupply,
  queuePendingActions,
  recordTurnSpyRecall,
  recordRoundMakerSpaceVisit,
  recordTurnMakerSpaceVisit,
  recordTurnSpiceGainAndCompleteHarvestContracts,
  recordTurnSpiceGain,
  resolveSecretsIntriguePressure,
  resolveLeaderInfluenceThresholdRewards,
  resolveLocationControlIncome,
  resolveStabanSmuggleSpice,
  removeSpyPostOwnerFromObservedSpace,
  spyEntrySpaceIdsForOccupiedSpace,
  spyObservationPostChoiceSpaceIdsForObservedSpace,
  spyObservationPostLabelForSpace,
  spyObservationPostOwnerIds,
  markMuadDibUnpredictableFoeResolved,
  scoreGurneyAlwaysSmiling,
} from "./game/state";
import {
  resolveCardRevealEffects,
  resolveDeferredAgentConflictUnitIntrigueDraws,
  resolveGameEffects,
} from "./game/effect-resolver";
import { leaderRevealEffectSpecs } from "./game/leader-effect-data";
import type {
  BoardSpace,
  Card,
  FactionId,
  GameState,
  PendingAction,
  Player,
  PostDeployIntrigueDraw,
  ResourceId,
  Resources,
} from "./game/types";

type CommanderTargets = Record<string, string>;
type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;

function reserveTopDeckSelectionCards(
  players: Player[],
  pendingActions: PendingAction[],
): { players: Player[]; pendingActions: PendingAction[] } {
  let nextPlayers = players;
  const nextPendingActions = pendingActions.map((action) => {
    if (action.kind !== "top-deck-selection" || action.inspectedCards) return action;
    const owner = nextPlayers.find((player) => player.id === action.ownerId);
    if (!owner || owner.deck.length < action.lookCards) return action;
    const inspectedCards = owner.deck.slice(0, action.lookCards);
    nextPlayers = nextPlayers.map((player) =>
      player.id === owner.id ? { ...player, deck: player.deck.slice(action.lookCards) } : player
    );
    return { ...action, inspectedCards };
  });
  return { players: nextPlayers, pendingActions: nextPendingActions };
}

export function activatedAllyIdFor(player: Player, players: Player[], commanderTargets: CommanderTargets) {
  if (player.role !== "Commander") return player.id;
  if (player.revealed && player.revealActivatedAllyId) return player.revealActivatedAllyId;
  return commanderTargets[player.id] ?? defaultActivatedAllyId(player, players);
}

type PlaceAgentInput = {
  commanderTargets: CommanderTargets;
  selectedCard: Card;
  selectedSpace: BoardSpace;
  spyEntrySpaceId?: string;
};

function postDeployIntrigueDrawFor(
  selectedCard: Card,
  source: Player,
  target: Player,
): PostDeployIntrigueDraw | undefined {
  const deferredDraws = resolveDeferredAgentConflictUnitIntrigueDraws(selectedCard.effects, {
    trigger: "agent-play",
    source,
    target,
  });
  if (deferredDraws.length === 0) return undefined;
  const first = deferredDraws[0];
  if (deferredDraws.some((draw) =>
    draw.selector !== first.selector ||
    draw.minConflictUnits !== first.minConflictUnits
  )) {
    throw new Error(`Unsupported mixed deferred Agent Intrigue draws for ${selectedCard.name}`);
  }
  const recipient = first.selector === "activated-ally" ? target : source;
  return {
    recipientId: recipient.id,
    conditionOwnerId: target.id,
    amount: deferredDraws.reduce((sum, draw) => sum + draw.amount, 0),
    minConflictUnits: first.minConflictUnits,
    source: selectedCard.name,
  };
}

function withPostDeployIntrigueDraw(
  pending: PendingAction | undefined,
  draw: PostDeployIntrigueDraw | undefined,
) {
  if (!pending || pending.kind !== "deploy" || !draw || draw.amount <= 0) return pending;
  return { ...pending, postDeployIntrigueDraw: draw };
}

function pendingActionForRecruitedTroopDeployment(
  owner: Player,
  recruitedTroops: number,
  source: string,
): PendingAction | undefined {
  const deployable = Math.min(owner.garrison, Math.max(0, recruitedTroops));
  return deployable > 0
    ? { kind: "deploy", ownerId: owner.id, remaining: deployable, source }
    : undefined;
}

function paidRewardResourceGain(pending: PendingAction | undefined, ownerId: string, resource: ResourceId) {
  if (pending?.kind !== "paid-reward-choice") return 0;
  return pending.options.reduce((total, option) => {
    if (
      option.reward.kind === "gain-resource" &&
      option.reward.recipientId === ownerId &&
      option.reward.resource === resource
    ) {
      return total + option.reward.amount;
    }
    return total;
  }, 0);
}

function boardInfluenceChoicesMatch(
  first: BoardInfluenceChoicePendingAction,
  second: BoardInfluenceChoicePendingAction,
) {
  return (
    first.choices.length === second.choices.length &&
    first.choices.every((choice, index) =>
      choice.ownerId === second.choices[index]?.ownerId &&
      choice.faction === second.choices[index]?.faction
    )
  );
}

function combinedBoardInfluenceChoicePending(
  boardPending: PendingAction | undefined,
  cardPending: PendingAction | undefined,
): { boardPending: PendingAction | undefined; cardPending: PendingAction | undefined } {
  if (
    boardPending?.kind !== "board-influence-choice" ||
    cardPending?.kind !== "board-influence-choice" ||
    cardPending.sourceEffect !== "gain-board-space-influence" ||
    !cardPending.cardId ||
    !cardPending.cardOwnerId ||
    cardPending.spaceId !== boardPending.spaceId ||
    cardPending.sourceTrigger !== undefined ||
    !boardInfluenceChoicesMatch(boardPending, cardPending)
  ) {
    return { boardPending, cardPending };
  }
  return {
    boardPending: {
      ...cardPending,
      amount: (boardPending.amount ?? 1) + (cardPending.amount ?? 1),
    },
    cardPending: undefined,
  };
}

function agentPlacementSpaces(
  currentSpaces: GameState["spaces"],
  selectedSpace: BoardSpace,
  target: Player,
  recalledAgents: number | undefined,
  spyEntry: boolean,
) {
  if (spyEntry) return currentSpaces;
  if (!recalledAgents) return { ...currentSpaces, [selectedSpace.id]: target.id };
  const { [selectedSpace.id]: _recalledSpace, ...spaces } = currentSpaces;
  return spaces;
}

function agentPlacementOwners(
  currentOwners: NonNullable<GameState["agentPlacementOwners"]>,
  selectedSpace: BoardSpace,
  source: Player,
  recalledAgents: number | undefined,
  spyEntry: boolean,
) {
  if (spyEntry) return currentOwners;
  if (!recalledAgents) return { ...currentOwners, [selectedSpace.id]: source.id };
  const { [selectedSpace.id]: _recalledSpace, ...owners } = currentOwners;
  return owners;
}

function setCoLocatedOwners(
  currentOwners: NonNullable<GameState["agentPlacementCoOwners"]>,
  selectedSpace: BoardSpace,
  owners: string[],
) {
  if (owners.length === 0) {
    const { [selectedSpace.id]: _removed, ...remainingOwners } = currentOwners;
    return remainingOwners;
  }
  return { ...currentOwners, [selectedSpace.id]: owners };
}

function agentPlacementCoOwners(
  currentOwners: NonNullable<GameState["agentPlacementCoOwners"]>,
  selectedSpace: BoardSpace,
  source: Player,
  recalledAgents: number | undefined,
  spyEntry: boolean,
) {
  const existingOwners = currentOwners[selectedSpace.id] ?? [];
  const ownersWithoutSource = existingOwners.filter((ownerId) => ownerId !== source.id);
  if (recalledAgents) return setCoLocatedOwners(currentOwners, selectedSpace, ownersWithoutSource);
  if (!spyEntry) return currentOwners;
  return setCoLocatedOwners(currentOwners, selectedSpace, [...ownersWithoutSource, source.id]);
}

function setCoLocatedOwnerTargets(
  currentTargets: NonNullable<GameState["agentPlacementCoOwnerTargets"]>,
  selectedSpace: BoardSpace,
  targets: Record<string, string>,
) {
  if (Object.keys(targets).length === 0) {
    const { [selectedSpace.id]: _removed, ...remainingTargets } = currentTargets;
    return remainingTargets;
  }
  return { ...currentTargets, [selectedSpace.id]: targets };
}

function agentPlacementCoOwnerTargets(
  currentTargets: NonNullable<GameState["agentPlacementCoOwnerTargets"]>,
  selectedSpace: BoardSpace,
  source: Player,
  target: Player,
  recalledAgents: number | undefined,
  spyEntry: boolean,
) {
  const existingTargets = currentTargets[selectedSpace.id] ?? {};
  const { [source.id]: _sourceTarget, ...targetsWithoutSource } = existingTargets;
  if (recalledAgents) return setCoLocatedOwnerTargets(currentTargets, selectedSpace, targetsWithoutSource);
  if (!spyEntry) return currentTargets;
  return setCoLocatedOwnerTargets(currentTargets, selectedSpace, {
    ...targetsWithoutSource,
    [source.id]: target.id,
  });
}

function spyEntryStateFor(current: GameState, selectedSpace: BoardSpace, player: Player, spyEntrySpaceId?: string) {
  if (!current.spaces[selectedSpace.id]) {
    return { state: current, usedSpyEntry: false, blocked: false, log: undefined };
  }
  if (!canEnterOccupiedSpaceWithSpy(current, selectedSpace, player)) {
    return { state: current, usedSpyEntry: false, blocked: true, log: undefined };
  }

  const choices = spyEntrySpaceIdsForOccupiedSpace(current, selectedSpace.id, player.id);
  const selectedSpyEntrySpaceId = spyEntrySpaceId ?? (choices.length === 1 ? choices[0] : undefined);
  if (!selectedSpyEntrySpaceId || !choices.includes(selectedSpyEntrySpaceId)) {
    return { state: current, usedSpyEntry: false, blocked: true, log: undefined };
  }

  const { spyPosts, sharedSpyPosts, removedSpyCount, recalledSpaceId } = removeSpyPostOwnerFromObservedSpace(current, selectedSpace.id, player.id, selectedSpyEntrySpaceId);
  if (removedSpyCount <= 0) return { state: current, usedSpyEntry: false, blocked: true, log: undefined };

  const stateWithRecalledSpy: GameState = {
    ...current,
    spyPosts,
    sharedSpyPosts,
    players: current.players.map((candidate) =>
      candidate.id === player.id ? { ...candidate, spies: candidate.spies + removedSpyCount } : candidate
    ),
  };
  return {
    state: recordTurnSpyRecall(stateWithRecalledSpy, player.id, removedSpyCount),
    usedSpyEntry: true,
    blocked: false,
    log: `${player.leader} recalls a spy from ${spyObservationPostLabelForSpace(recalledSpaceId ?? selectedSpace.id)} to enter occupied ${selectedSpace.name}.`,
  };
}

function pendingActionForSpyVisitCardDraw(
  state: GameState,
  selectedSpace: BoardSpace,
  source: Player,
): PendingAction | undefined {
  const spaceIds = spyObservationPostChoiceSpaceIdsForObservedSpace(selectedSpace.id)
    .filter((spaceId) => spyObservationPostOwnerIds(state, spaceId).includes(source.id));
  if (spaceIds.length === 0) return undefined;
  return {
    kind: "recall-spy",
    ownerId: source.id,
    combatRecipientId: source.id,
    remaining: 1,
    strength: 0,
    source: `${selectedSpace.name} visit`,
    optional: true,
    drawCards: 1,
    spaceIds,
  };
}

function futureSourceIntriguesBeforePendingChoice(
  state: Pick<GameState, "intrigueDeck" | "intrigueDiscard" | "players">,
  space: BoardSpace,
  boardActor: Player,
  source: Player,
  sourceIntriguesToDraw = 0,
) {
  const availableDeckIntrigues = state.intrigueDeck.length + state.intrigueDiscard.length;
  const boardIntrigues = Math.min(boardSpaceIntrigueGainFor(space, boardActor), availableDeckIntrigues);
  const sourceIntrigues = Math.min(sourceIntriguesToDraw, availableDeckIntrigues - boardIntrigues);
  const secretsTransfers = space.id === "secrets"
    ? state.players.filter((player) => player.team !== source.team && player.intrigues.length >= 4).length
    : 0;
  return boardIntrigues + sourceIntrigues + secretsTransfers;
}

export function placeAgentAction(
  current: GameState,
  { commanderTargets, selectedCard, selectedSpace, spyEntrySpaceId }: PlaceAgentInput,
): GameState {
  const initialPlayer = current.players[current.activeSeat];
  const spyEntry = spyEntryStateFor(current, selectedSpace, initialPlayer, spyEntrySpaceId);
  if (spyEntry.blocked) return current;
  const placementState = spyEntry.state;
  const player = placementState.players[placementState.activeSeat];
  const targetId =
    player.role === "Commander"
      ? activatedAllyIdFor(player, placementState.players, commanderTargets)
      : player.id;
  const target = placementState.players.find((candidate) => candidate.id === targetId) ?? player;
  const selectedCardIndexByReference = player.hand.findIndex((card) => card === selectedCard);
  const selectedCardIndex = selectedCardIndexByReference >= 0
    ? selectedCardIndexByReference
    : player.hand.findIndex((card) => card.id === selectedCard.id);
  const hand = selectedCardIndex >= 0
    ? player.hand.filter((_, index) => index !== selectedCardIndex)
    : player.hand;
  const playedCard = {
    ...selectedCard,
    agentPlacementSpaceId: selectedSpace.id,
    agentPlacementTargetOwnerId: target.id,
  };
  const playArea = selectedCard.trashOnPlay ? player.playArea : [...player.playArea, playedCard];
  const cost = effectiveCost(selectedSpace, placementState.players);
  const makerBonus = selectedSpace.maker ? placementState.makerSpice[selectedSpace.id] ?? 0 : 0;
  const makerChoiceOwner = player.role === "Commander" ? target : player;
  const makerChoicePending = pendingActionForMakerChoice(placementState, selectedSpace, makerChoiceOwner, player);
  const spiceGain = boardSpaceSpiceGainFor(selectedSpace, player, makerBonus, Boolean(makerChoicePending));
  const sietchTabrPending = pendingActionForSietchTabr(placementState, selectedSpace, makerChoiceOwner, player);
  const spendsSwordmasterAgent = player.swordmasterBonus &&
    !player.swordmasterAgentSpent &&
    player.agentsTotal > 2 &&
    player.agentsReady === 1;
  let { recruitedTroops: boardRecruitedTroops, source, target: effectedTarget } = applyBoardEffect(
    {
      ...player,
      hand,
      playArea,
      agentsReady: player.agentsReady - 1,
      swordmasterAgentSpent: spendsSwordmasterAgent ? true : player.swordmasterAgentSpent,
    },
    target,
    selectedSpace,
    cost,
    makerBonus,
    Boolean(makerChoicePending),
  );
  const cardAgentEffect = applyCardAgentEffect(
    selectedCard,
    source,
    player.role === "Commander" ? effectedTarget : source,
    placementState,
    selectedSpace,
  );
  source = cardAgentEffect.source;
  effectedTarget = cardAgentEffect.target;
  let players = placementState.players.map((candidate, index) => {
    if (index === placementState.activeSeat) return source;
    if (candidate.id === effectedTarget.id) return effectedTarget;
    return candidate;
  });
  let deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  const conflictDeploymentBlock = cardAgentEffect.blocksDeploymentsThisTurn
    ? { actorId: source.id, ownerId: deploymentOwner.id, source: selectedCard.name }
    : undefined;
  const controlledPostEffectState = resolveLocationControlIncome(
    { ...placementState, players, conflictDeploymentBlock },
    selectedSpace,
  );
  players = controlledPostEffectState.players;
  source = players.find((candidate) => candidate.id === source.id) ?? source;
  effectedTarget = players.find((candidate) => candidate.id === effectedTarget.id) ?? effectedTarget;
  deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  let postEffectState: GameState = { ...controlledPostEffectState, players, conflictDeploymentBlock };
  const contractCompletion = completeChoamContractsForBoardSpace(postEffectState, source.id, selectedSpace.id);
  postEffectState = contractCompletion.state;
  players = postEffectState.players;
  source = players.find((candidate) => candidate.id === source.id) ?? source;
  effectedTarget = players.find((candidate) => candidate.id === effectedTarget.id) ?? effectedTarget;
  deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  if (selectedSpace.maker) {
    postEffectState = recordTurnMakerSpaceVisit(postEffectState, source.id);
  }
  const totalSpiceGain = spiceGain + (cardAgentEffect.sourceSpiceGained ?? 0);
  const harvestCompletion = totalSpiceGain > 0
    ? recordTurnSpiceGainAndCompleteHarvestContracts(postEffectState, source.id, totalSpiceGain)
    : completeChoamContractsForCurrentTurnHarvests(postEffectState);
  postEffectState = harvestCompletion.state;
  players = postEffectState.players;
  source = players.find((candidate) => candidate.id === source.id) ?? source;
  effectedTarget = players.find((candidate) => candidate.id === effectedTarget.id) ?? effectedTarget;
  deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  const totalRecalledAgents =
    (cardAgentEffect.recalledAgents ?? 0) + contractCompletion.recalledAgents + harvestCompletion.recalledAgents;
  const extraRecruitedTroops =
    (cardAgentEffect.recruitedTroops ?? 0) + contractCompletion.recruitedTroops + harvestCompletion.recruitedTroops;
  const futureSourceIntrigues = futureSourceIntriguesBeforePendingChoice(
    postEffectState,
    selectedSpace,
    player,
    source,
    cardAgentEffect.sourceIntriguesToDraw,
  );
  const postDeployIntrigueDraw = postDeployIntrigueDrawFor(selectedCard, source, deploymentOwner);
  const baseSpacePending = sietchTabrPending
    ? undefined
    : pendingActionForSpace(
      selectedSpace,
      source,
      deploymentOwner,
      players,
      extraRecruitedTroops,
      Boolean(cardAgentEffect.blocksDeploymentsThisTurn),
      boardRecruitedTroops,
    );
  const recruitedTroopDeploymentPending =
    !baseSpacePending && cardAgentEffect.deployRecruitedTroops && !cardAgentEffect.blocksDeploymentsThisTurn
      ? pendingActionForRecruitedTroopDeployment(
        deploymentOwner,
        boardRecruitedTroops + extraRecruitedTroops,
        cardAgentEffect.deployRecruitedTroopsSource ?? selectedCard.name,
      )
      : undefined;
  const spacePending = withPostDeployIntrigueDraw(
    baseSpacePending ?? recruitedTroopDeploymentPending,
    postDeployIntrigueDraw,
  );
  const cardPendings = pendingActionsForCard(
    selectedCard,
    source,
    postEffectState,
    deploymentOwner,
    selectedSpace,
    futureSourceIntrigues,
  );
  const [firstCardPending, ...remainingCardPendings] = cardPendings;
  const optionalSpacePaymentPending = pendingActionForOptionalSpacePayment(selectedSpace, source);
  const boardInfluencePending = pendingActionForBoardInfluenceChoice(selectedSpace, source, effectedTarget);
  const combinedBoardInfluence = combinedBoardInfluenceChoicePending(boardInfluencePending, firstCardPending);
  const boardIntrigueSwapPending = pendingActionForBoardIntrigueSwap(selectedSpace, source, futureSourceIntrigues);
  const boardAgentRecallPending = pendingActionForBoardAgentRecall(placementState, selectedSpace, source);
  const boardCardDrawPending = pendingActionForBoardCardDraw(selectedSpace, source);
  const spyVisitCardDrawPending = pendingActionForSpyVisitCardDraw(postEffectState, selectedSpace, source);
  const boardTrashPending = pendingActionForBoardTrash(selectedSpace, source);
  const boardChoicePendings = [
    optionalSpacePaymentPending,
    combinedBoardInfluence.boardPending,
    boardIntrigueSwapPending,
    boardAgentRecallPending,
    boardCardDrawPending,
  ].filter((action): action is PendingAction => Boolean(action));
  const [leaderPlacementPending, ...remainingLeaderPlacementPendings] = pendingActionsForLeaderPlacementEffects(postEffectState, source, selectedSpace);
  const paidRewardWater = paidRewardResourceGain(combinedBoardInfluence.cardPending, source.id, "water");
  const jessicaRepeatDeferredWater = paidRewardWater;
  const jessicaReverendMotherPending = pendingActionForReverendMotherJessicaRepeat(
    placementState,
    source,
    selectedSpace,
    jessicaRepeatDeferredWater,
  );
  const cardPendingIsSpiceAgonyReward =
    combinedBoardInfluence.cardPending?.kind === "paid-reward-choice" &&
    combinedBoardInfluence.cardPending.source === "Spice Agony";
  const prioritizedCardPending =
    cardPendingIsSpiceAgonyReward || paidRewardWater > 0
      ? combinedBoardInfluence.cardPending
      : undefined;
  const pendingActions = prioritizedCardPending || leaderPlacementPending || jessicaReverendMotherPending
    ? [
        ...[prioritizedCardPending, leaderPlacementPending, jessicaReverendMotherPending].filter((action): action is PendingAction => Boolean(action)),
        ...boardChoicePendings,
        ...pendingActionsFor(spacePending, prioritizedCardPending ? undefined : combinedBoardInfluence.cardPending, source.spies),
        ...remainingCardPendings,
        ...remainingLeaderPlacementPendings,
        ...[boardTrashPending].filter((action): action is PendingAction => Boolean(action)),
        ...[spyVisitCardDrawPending].filter((action): action is PendingAction => Boolean(action)),
      ]
    : [
        ...boardChoicePendings,
        ...pendingActionsFor(spacePending, combinedBoardInfluence.cardPending, source.spies),
        ...remainingCardPendings,
        ...remainingLeaderPlacementPendings,
        ...[boardTrashPending].filter((action): action is PendingAction => Boolean(action)),
        ...[spyVisitCardDrawPending].filter((action): action is PendingAction => Boolean(action)),
      ];
  if (sietchTabrPending) {
    const sietchAction = {
      ...sietchTabrPending,
      ...(cardAgentEffect.recruitedTroops ? { extraRecruitedTroops: cardAgentEffect.recruitedTroops } : {}),
      ...(cardAgentEffect.blocksDeploymentsThisTurn ? { conflictBlocked: true } : {}),
      ...(postDeployIntrigueDraw ? { postDeployIntrigueDraw } : {}),
    };
    pendingActions.unshift(
      sietchAction,
    );
  }
  if (makerChoicePending) {
    pendingActions.unshift(
      postDeployIntrigueDraw && makerChoicePending.kind === "maker-choice"
        ? { ...makerChoicePending, postDeployIntrigueDraw }
        : makerChoicePending,
    );
  }
  const topDeckReservations = reserveTopDeckSelectionCards(players, pendingActions);
  players = topDeckReservations.players;
  const stateAfterTopDeckReservations = { ...postEffectState, players, conflictDeploymentBlock };
  const pending = queuePendingActions(
    stateAfterTopDeckReservations,
    topDeckReservations.pendingActions,
  );
  const agentPlacementLog = player.role === "Commander"
    ? `${player.leader} activates ${target.leader} at ${selectedSpace.name} with ${selectedCard.name}.`
    : `${player.leader} sends an Agent to ${selectedSpace.name} with ${selectedCard.name}.`;
  const nextState: GameState = {
    ...stateAfterTopDeckReservations,
    agentTurnComplete: true,
    players,
    spaces: agentPlacementSpaces(placementState.spaces, selectedSpace, target, totalRecalledAgents, spyEntry.usedSpyEntry),
    agentPlacementOwners: agentPlacementOwners(
      placementState.agentPlacementOwners ?? {},
      selectedSpace,
      player,
      totalRecalledAgents,
      spyEntry.usedSpyEntry,
    ),
    agentPlacementCoOwners: agentPlacementCoOwners(
      placementState.agentPlacementCoOwners ?? {},
      selectedSpace,
      player,
      totalRecalledAgents,
      spyEntry.usedSpyEntry,
    ),
    agentPlacementCoOwnerTargets: agentPlacementCoOwnerTargets(
      placementState.agentPlacementCoOwnerTargets ?? {},
      selectedSpace,
      player,
      target,
      totalRecalledAgents,
      spyEntry.usedSpyEntry,
    ),
    makerSpice: collectMakerSpice(placementState, selectedSpace),
    swordmasterClaimed: placementState.swordmasterClaimed || selectedSpace.id === "swordmaster",
    conflictDeploymentBlock,
    ...pending,
    log: [
      selectedCard.trashOnPlay
        ? `${player.leader} trashes ${selectedCard.name}.`
        : undefined,
      makerBonus > 0
        ? `${player.leader} collects ${makerBonus} bonus spice from ${selectedSpace.name}.`
        : undefined,
      cardAgentEffect.log,
      spyEntry.log,
      agentPlacementLog,
      ...postEffectState.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
  const intrigueGain = boardSpaceIntrigueGainFor(selectedSpace, player);
  const influenceThresholdState = resolveLeaderInfluenceThresholdRewards(nextState, placementState.players);
  const boardIntrigueState = intrigueGain > 0
    ? drawIntrigueCards(influenceThresholdState, source.id, intrigueGain, selectedSpace.name)
    : influenceThresholdState;
  const cardSourceIntrigueState = cardAgentEffect.sourceIntriguesToDraw
    ? drawIntrigueCards(boardIntrigueState, source.id, cardAgentEffect.sourceIntriguesToDraw, selectedCard.name)
    : boardIntrigueState;
  const cardTargetIntrigueState = cardAgentEffect.targetIntriguesToDraw
    ? drawIntrigueCards(cardSourceIntrigueState, effectedTarget.id, cardAgentEffect.targetIntriguesToDraw, selectedCard.name)
    : cardSourceIntrigueState;
  const secretsState = selectedSpace.id === "secrets"
    ? resolveSecretsIntriguePressure(cardTargetIntrigueState, source.id)
    : cardTargetIntrigueState;
  // Commanders send the Agent; activated Allies only receive routed board effects.
  const resolvedState = resolveStabanSmuggleSpice(secretsState, player.id, selectedSpace.id);
  const makerTrackedState = selectedSpace.maker
    ? recordRoundMakerSpaceVisit(resolvedState, player.id)
    : resolvedState;
  return completeChoamContractsForCurrentTurnHarvests(makerTrackedState, agentPlacementLog).state;
}

type RevealTurnPlan = {
  influenceGains: Partial<Record<FactionId, number>>;
  intriguesToDraw: number;
  muadDibUnpredictableFoeIntriguesToDraw?: number;
  persuasion: number;
  recruitedTroops: number;
  revealGain: Partial<Resources>;
  swords: number;
};

export function revealTurnPlan(
  activePlayer: Player,
  state?: Pick<GameState, "agentPlacementCoOwners" | "agentPlacementOwners" | "roundMakerSpaceVisits" | "spaces" | "spyPosts" | "sharedSpyPosts"> &
    Partial<Pick<GameState, "players" | "turnAcquiredCardIds">>,
  combatRecipient?: Player,
): RevealTurnPlan {
  const statePlayers = state?.players;
  const revealCombatRecipient = combatRecipient ??
    (activePlayer.role === "Commander" && statePlayers
      ? statePlayers.find((player) => player.id === activatedAllyIdFor(activePlayer, statePlayers, {}))
      : undefined);
  const effectResult = resolveCardRevealEffects(activePlayer.hand, activePlayer, state, revealCombatRecipient);
  const leaderEffectResult = resolveGameEffects(leaderRevealEffectSpecs, {
    trigger: "reveal",
    source: activePlayer,
    state,
    target: revealCombatRecipient,
  });
  const highCouncilPersuasion = activePlayer.highCouncilSeat ? 2 : 0;
  const persuasion = effectResult.persuasion + highCouncilPersuasion + boardSpaceRevealPersuasionFor(activePlayer, state);
  const swords = effectResult.swords + (activePlayer.swordmasterBonus ? 2 : 0);
  const revealGain = effectResult.revealGain;
  const influenceGains = effectResult.influenceGains;
  const muadDibUnpredictableFoeIntriguesToDraw = leaderEffectResult.intriguesToDraw;
  const intriguesToDraw = effectResult.intriguesToDraw + muadDibUnpredictableFoeIntriguesToDraw;
  const recruitedTroops = effectResult.recruitedTroops;
  return {
    influenceGains,
    intriguesToDraw,
    ...(muadDibUnpredictableFoeIntriguesToDraw > 0 ? { muadDibUnpredictableFoeIntriguesToDraw } : {}),
    persuasion,
    recruitedTroops,
    revealGain,
    swords,
  };
}

type RevealTurnInput = {
  commanderTargets: CommanderTargets;
  revealPlan: RevealTurnPlan;
};

function revealRecruitLabel(troops: number, owner?: Player) {
  if (troops <= 0) return "";
  const ownerLabel = owner ? `${owner.leader} ` : "";
  return ` and ${ownerLabel}recruits ${troops} troop${troops === 1 ? "" : "s"}`;
}

function revealInfluenceLabel(gains: Partial<Record<FactionId, number>>) {
  const entries = Object.entries(gains).filter((entry): entry is [FactionId, number] => (entry[1] ?? 0) > 0);
  if (entries.length === 0) return "";
  const text = entries
    .map(([faction, amount]) => `${amount} ${factionLabels[faction]} Influence`)
    .join(", ");
  return ` and gains ${text}`;
}

function applyRevealInfluenceGains(
  state: GameState,
  playerId: string,
  gains: Partial<Record<FactionId, number>>,
) {
  const entries = Object.entries(gains).filter((entry): entry is [FactionId, number] => (entry[1] ?? 0) > 0);
  if (entries.length === 0) return state;
  const previousPlayers = state.players;
  const influencedState = {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? entries.reduce((next, [faction, amount]) => adjustInfluence(next, faction, amount), player)
        : player
    ),
  };
  return resolveLeaderInfluenceThresholdRewards(influencedState, previousPlayers);
}

export function revealTurnAction(
  current: GameState,
  { commanderTargets, revealPlan }: RevealTurnInput,
): GameState {
  const {
    influenceGains = {},
    intriguesToDraw = 0,
    muadDibUnpredictableFoeIntriguesToDraw = 0,
    persuasion,
    recruitedTroops,
    revealGain,
    swords,
  } = revealPlan;
  const player = current.players[current.activeSeat];
  const targetId =
    player.role === "Commander"
      ? activatedAllyIdFor(player, current.players, commanderTargets)
      : player.id;
  const target = current.players.find((candidate) => candidate.id === targetId);
  const combatRecipient = player.role === "Commander" ? target : player;
  const combatSwords = combatRecipient && playerHasConflictUnits(combatRecipient) ? swords : 0;
  const recruitRecipient = player.role === "Commander" ? target : player;
  const actualRecruitedTroops = recruitRecipient ? Math.min(playerTroopSupply(recruitRecipient), recruitedTroops) : 0;
  const players = current.players.map((candidate, index) => {
    if (index === current.activeSeat) {
      return {
        ...candidate,
        revealed: true,
        agentsReady: 0,
        resources: addResources(candidate.resources, revealGain),
        persuasion,
        revealActivatedAllyId: candidate.role === "Commander" ? target?.id : undefined,
        conflict: candidate.role === "Commander" ? candidate.conflict : candidate.conflict + combatSwords,
        garrison: candidate.role === "Commander" ? candidate.garrison : candidate.garrison + actualRecruitedTroops,
        playArea: [...candidate.playArea, ...candidate.hand],
        hand: [],
      };
    }
    if (candidate.id === targetId && player.role === "Commander") {
      return {
        ...candidate,
        conflict: candidate.conflict + combatSwords,
        garrison: candidate.garrison + actualRecruitedTroops,
      };
    }
    return candidate;
  });
  const revealedState: GameState = {
    ...current,
    conflictDeploymentBlock: undefined,
    players,
    log: [
      player.role === "Commander"
        ? `${player.leader} reveals for ${persuasion} persuasion${revealGainLabel(revealGain)}${revealInfluenceLabel(influenceGains)}${revealRecruitLabel(actualRecruitedTroops, target)} and gives ${combatSwords} strength to ${target?.leader ?? "an Ally"}.`
        : `${player.leader} reveals for ${persuasion} persuasion, ${combatSwords} strength${revealGainLabel(revealGain)}${revealInfluenceLabel(influenceGains)}${revealRecruitLabel(actualRecruitedTroops)}.`,
      ...current.log,
    ],
  };
  const influenceState = applyRevealInfluenceGains(revealedState, player.id, influenceGains);
  const revealedPlayer = influenceState.players[current.activeSeat];
  const pending = queuePendingActions(
    influenceState,
    pendingActionsForReveal(
      revealedPlayer,
      influenceState,
      player.hand,
      player.role === "Commander" ? targetId : player.id,
    ),
  );
  const pendingRevealState: GameState = { ...influenceState, ...pending };
  const spiceTrackedState = (revealGain.spice ?? 0) > 0
    ? recordTurnSpiceGain(pendingRevealState, player.id, revealGain.spice ?? 0)
    : pendingRevealState;
  const leaderTrackedState = muadDibUnpredictableFoeIntriguesToDraw > 0
    ? markMuadDibUnpredictableFoeResolved(spiceTrackedState, player.id)
    : spiceTrackedState;
  const intrigueState = intriguesToDraw > 0
    ? drawIntrigueCards(leaderTrackedState, player.id, intriguesToDraw, "Reveal")
    : leaderTrackedState;
  return scoreGurneyAlwaysSmiling(intrigueState, player.id);
}
