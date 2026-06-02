import {
  addResources,
  boardSpaceIntrigueGainFor,
  boardSpaceSpiceGainFor,
  revealGainLabel,
} from "./app-helpers";
import {
  applyBoardEffect,
  applyCardAgentEffect,
  collectMakerSpice,
  defaultActivatedAllyId,
  drawIntrigueCards,
  effectiveCost,
  pendingActionForBoardInfluenceChoice,
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
  queuePendingActions,
  recordRoundMakerSpaceVisit,
  recordTurnSpiceGain,
  resolveSecretsIntriguePressure,
  resolveLeaderInfluenceThresholdRewards,
  resolveLocationControlIncome,
  resolveStabanSmuggleSpice,
  scoreGurneyAlwaysSmiling,
} from "./game/state";
import {
  resolveCardRevealEffects,
  resolveDeferredAgentConflictUnitIntrigueDraws,
} from "./game/effect-resolver";
import type {
  BoardSpace,
  Card,
  GameState,
  PendingAction,
  Player,
  PostDeployIntrigueDraw,
  ResourceId,
  Resources,
} from "./game/types";

type CommanderTargets = Record<string, string>;
type BoardInfluenceChoicePendingAction = Extract<PendingAction, { kind: "board-influence-choice" }>;

export function activatedAllyIdFor(player: Player, players: Player[], commanderTargets: CommanderTargets) {
  if (player.role !== "Commander") return player.id;
  if (player.revealed && player.revealActivatedAllyId) return player.revealActivatedAllyId;
  return commanderTargets[player.id] ?? defaultActivatedAllyId(player, players);
}

type PlaceAgentInput = {
  commanderTargets: CommanderTargets;
  selectedCard: Card;
  selectedSpace: BoardSpace;
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
  { commanderTargets, selectedCard, selectedSpace }: PlaceAgentInput,
): GameState {
  const player = current.players[current.activeSeat];
  const targetId =
    player.role === "Commander"
      ? activatedAllyIdFor(player, current.players, commanderTargets)
      : player.id;
  const target = current.players.find((candidate) => candidate.id === targetId) ?? player;
  const hand = player.hand.filter((card) => card.id !== selectedCard.id);
  const playedCard = {
    ...selectedCard,
    agentPlacementSpaceId: selectedSpace.id,
    agentPlacementTargetOwnerId: target.id,
  };
  const playArea = selectedCard.trashOnPlay ? player.playArea : [...player.playArea, playedCard];
  const cost = effectiveCost(selectedSpace, current.players);
  const makerBonus = selectedSpace.maker ? current.makerSpice[selectedSpace.id] ?? 0 : 0;
  const makerChoiceOwner = player.role === "Commander" ? target : player;
  const makerChoicePending = pendingActionForMakerChoice(current, selectedSpace, makerChoiceOwner, player);
  const spiceGain = boardSpaceSpiceGainFor(selectedSpace, player, makerBonus, Boolean(makerChoicePending));
  const sietchTabrPending = pendingActionForSietchTabr(current, selectedSpace, makerChoiceOwner, player);
  const spendsSwordmasterAgent = player.swordmasterBonus &&
    !player.swordmasterAgentSpent &&
    player.agentsTotal > 2 &&
    player.agentsReady === 1;
  let { source, target: effectedTarget } = applyBoardEffect(
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
    current,
    selectedSpace,
  );
  source = cardAgentEffect.source;
  effectedTarget = cardAgentEffect.target;
  let players = current.players.map((candidate, index) => {
    if (index === current.activeSeat) return source;
    if (candidate.id === effectedTarget.id) return effectedTarget;
    return candidate;
  });
  let deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  const conflictDeploymentBlock = cardAgentEffect.blocksDeploymentsThisTurn
    ? { actorId: source.id, ownerId: deploymentOwner.id, source: selectedCard.name }
    : undefined;
  const controlledPostEffectState = resolveLocationControlIncome(
    { ...current, players, conflictDeploymentBlock },
    selectedSpace,
  );
  players = controlledPostEffectState.players;
  source = players.find((candidate) => candidate.id === source.id) ?? source;
  effectedTarget = players.find((candidate) => candidate.id === effectedTarget.id) ?? effectedTarget;
  deploymentOwner = player.role === "Commander" ? effectedTarget : source;
  const postEffectState = { ...controlledPostEffectState, players, conflictDeploymentBlock };
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
      cardAgentEffect.recruitedTroops,
      Boolean(cardAgentEffect.blocksDeploymentsThisTurn),
    );
  const spacePending = withPostDeployIntrigueDraw(
    baseSpacePending,
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
  const boardTrashPending = pendingActionForBoardTrash(selectedSpace, source);
  const boardChoicePendings = [
    optionalSpacePaymentPending,
    combinedBoardInfluence.boardPending,
  ].filter((action): action is PendingAction => Boolean(action));
  const [leaderPlacementPending, ...remainingLeaderPlacementPendings] = pendingActionsForLeaderPlacementEffects(postEffectState, source, selectedSpace);
  const paidRewardWater = paidRewardResourceGain(combinedBoardInfluence.cardPending, source.id, "water");
  const jessicaRepeatDeferredWater = paidRewardWater;
  const jessicaReverendMotherPending = pendingActionForReverendMotherJessicaRepeat(
    current,
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
      ]
    : [
        ...boardChoicePendings,
        ...pendingActionsFor(spacePending, combinedBoardInfluence.cardPending, source.spies),
        ...remainingCardPendings,
        ...remainingLeaderPlacementPendings,
        ...[boardTrashPending].filter((action): action is PendingAction => Boolean(action)),
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
  const pending = queuePendingActions(
    controlledPostEffectState,
    pendingActions,
  );
  const nextState: GameState = {
    ...controlledPostEffectState,
    agentTurnComplete: true,
    players,
    spaces: { ...current.spaces, [selectedSpace.id]: target.id },
    makerSpice: collectMakerSpice(current, selectedSpace),
    swordmasterClaimed: current.swordmasterClaimed || selectedSpace.id === "swordmaster",
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
      player.role === "Commander"
        ? `${player.leader} activates ${target.leader} at ${selectedSpace.name} with ${selectedCard.name}.`
        : `${player.leader} sends an Agent to ${selectedSpace.name} with ${selectedCard.name}.`,
      ...controlledPostEffectState.log,
    ].filter((entry): entry is string => Boolean(entry)),
  };
  const intrigueGain = boardSpaceIntrigueGainFor(selectedSpace, player);
  const influenceThresholdState = resolveLeaderInfluenceThresholdRewards(nextState, current.players);
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
  const totalSpiceGain = spiceGain + (cardAgentEffect.sourceSpiceGained ?? 0);
  return totalSpiceGain > 0 ? recordTurnSpiceGain(makerTrackedState, source.id, totalSpiceGain) : makerTrackedState;
}

type RevealTurnPlan = {
  persuasion: number;
  printedRevealCards: string[];
  revealGain: Partial<Resources>;
  swords: number;
};

export function revealTurnPlan(
  activePlayer: Player,
  state?: Pick<GameState, "roundMakerSpaceVisits" | "spyPosts" | "sharedSpyPosts">,
): RevealTurnPlan {
  const effectResult = resolveCardRevealEffects(activePlayer.hand, activePlayer, state);
  const highCouncilPersuasion = activePlayer.highCouncilSeat ? 2 : 0;
  const persuasion = effectResult.persuasion + highCouncilPersuasion;
  const swords = effectResult.swords + (activePlayer.swordmasterBonus ? 2 : 0);
  const revealGain = effectResult.revealGain;
  const printedRevealCards = activePlayer.hand
    .filter((card) => card.conditionalPersuasion || card.conditionalSwords)
    .map((card) => card.name);
  return { persuasion, printedRevealCards, revealGain, swords };
}

type RevealTurnInput = {
  commanderTargets: CommanderTargets;
  revealPlan: RevealTurnPlan;
};

export function revealTurnAction(
  current: GameState,
  { commanderTargets, revealPlan }: RevealTurnInput,
): GameState {
  const { persuasion, printedRevealCards, revealGain, swords } = revealPlan;
  const player = current.players[current.activeSeat];
  const targetId =
    player.role === "Commander"
      ? activatedAllyIdFor(player, current.players, commanderTargets)
      : player.id;
  const target = current.players.find((candidate) => candidate.id === targetId);
  const combatRecipient = player.role === "Commander" ? target : player;
  const combatSwords = combatRecipient && playerHasConflictUnits(combatRecipient) ? swords : 0;
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
        playArea: [...candidate.playArea, ...candidate.hand],
        hand: [],
      };
    }
    if (candidate.id === targetId && player.role === "Commander") {
      return { ...candidate, conflict: candidate.conflict + combatSwords };
    }
    return candidate;
  });
  const postRevealState = { ...current, players };
  const revealedPlayer = players[current.activeSeat];
  const pending = queuePendingActions(
    current,
    pendingActionsForReveal(
      revealedPlayer,
      postRevealState,
      player.hand,
      player.role === "Commander" ? targetId : player.id,
    ),
  );
  const revealedState: GameState = {
    ...current,
    conflictDeploymentBlock: undefined,
    players,
    ...pending,
    log: [
      ...(
        printedRevealCards.length > 0
          ? [`Resolve printed reveal text for ${printedRevealCards.join(", ")} before finalizing rewards.`]
          : []
      ),
      player.role === "Commander"
        ? `${player.leader} reveals for ${persuasion} persuasion${revealGainLabel(revealGain)} and gives ${combatSwords} strength to ${target?.leader ?? "an Ally"}.`
        : `${player.leader} reveals for ${persuasion} persuasion, ${combatSwords} strength${revealGainLabel(revealGain)}.`,
      ...current.log,
    ],
  };
  const spiceTrackedState = (revealGain.spice ?? 0) > 0
    ? recordTurnSpiceGain(revealedState, player.id, revealGain.spice ?? 0)
    : revealedState;
  return scoreGurneyAlwaysSmiling(spiceTrackedState, player.id);
}
