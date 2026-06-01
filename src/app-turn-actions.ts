import {
  addResources,
  boardSpaceIntrigueGainFor,
  boardSpaceSpiceGainFor,
  revealGainLabel,
  revealPersuasionFor,
} from "./app-helpers";
import {
  applyBoardEffect,
  applyCardAgentEffect,
  collectMakerSpice,
  defaultActivatedAllyId,
  drawIntrigueCards,
  effectiveCost,
  pendingActionForCard,
  pendingActionForJessicaOtherMemories,
  pendingActionForMakerChoice,
  pendingActionForReverendMotherJessicaRepeat,
  pendingActionForSietchTabr,
  pendingActionForSpace,
  pendingActionsFor,
  pendingActionsForReveal,
  playerHasConflictUnits,
  queuePendingActions,
  hasVisitedMakerSpaceThisRound,
  recordRoundMakerSpaceVisit,
  recordTurnSpiceGain,
  resolveLeaderInfluenceThresholdRewards,
  resolveLocationControlIncome,
  resolveStabanSmuggleSpice,
  scoreGurneyAlwaysSmiling,
} from "./game/state";
import {
  isInterstellarTradeCard,
  isSmugglersHarvesterCard,
} from "./game/card-identifiers";
import type {
  BoardSpace,
  Card,
  GameState,
  PendingAction,
  Player,
  ResourceId,
  Resources,
} from "./game/types";

type CommanderTargets = Record<string, string>;

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
  const playArea = selectedCard.trashOnPlay ? player.playArea : [...player.playArea, selectedCard];
  const cost = effectiveCost(selectedSpace, current.players);
  const makerBonus = selectedSpace.maker ? current.makerSpice[selectedSpace.id] ?? 0 : 0;
  const makerChoiceOwner = player.role === "Commander" ? target : player;
  const makerChoicePending = pendingActionForMakerChoice(current, selectedSpace, makerChoiceOwner, player);
  const spiceGain = boardSpaceSpiceGainFor(selectedSpace, player, makerBonus, Boolean(makerChoicePending));
  const sietchTabrPending = pendingActionForSietchTabr(current, selectedSpace, makerChoiceOwner, player);
  let { source, target: effectedTarget } = applyBoardEffect(
    {
      ...player,
      hand,
      playArea,
      agentsReady: player.agentsReady - 1,
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
  const spacePending = sietchTabrPending
    ? undefined
    : pendingActionForSpace(
      selectedSpace,
      source,
      deploymentOwner,
      players,
      cardAgentEffect.recruitedTroops,
      Boolean(cardAgentEffect.blocksDeploymentsThisTurn),
    );
  const cardPending = pendingActionForCard(
    selectedCard,
    source,
    postEffectState,
    deploymentOwner,
    selectedSpace,
  );
  const jessicaOtherMemoriesPending = pendingActionForJessicaOtherMemories(source, selectedSpace);
  const jessicaRepeatDeferredWater = cardPending?.kind === "jessica-water-of-life" ? 1 : 0;
  const jessicaReverendMotherPending = pendingActionForReverendMotherJessicaRepeat(
    current,
    source,
    selectedSpace,
    jessicaRepeatDeferredWater,
  );
  const prioritizedCardPending =
    cardPending?.kind === "jessica-spice-agony" || cardPending?.kind === "jessica-water-of-life"
      ? cardPending
      : undefined;
  const pendingActions = prioritizedCardPending || jessicaOtherMemoriesPending || jessicaReverendMotherPending
    ? [
        ...[prioritizedCardPending, jessicaOtherMemoriesPending, jessicaReverendMotherPending].filter((action): action is PendingAction => Boolean(action)),
        ...pendingActionsFor(spacePending, prioritizedCardPending ? undefined : cardPending, source.spies),
      ]
    : pendingActionsFor(spacePending, cardPending, source.spies);
  if (sietchTabrPending) {
    const sietchAction = {
      ...sietchTabrPending,
      ...(cardAgentEffect.recruitedTroops ? { extraRecruitedTroops: cardAgentEffect.recruitedTroops } : {}),
      ...(cardAgentEffect.blocksDeploymentsThisTurn ? { conflictBlocked: true } : {}),
    };
    pendingActions.unshift(
      sietchAction,
    );
  }
  if (makerChoicePending) pendingActions.unshift(makerChoicePending);
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
  const intrigueState = intrigueGain > 0
    ? drawIntrigueCards(influenceThresholdState, source.id, intrigueGain, selectedSpace.name)
    : influenceThresholdState;
  // Commanders send the Agent; activated Allies only receive routed board effects.
  const resolvedState = resolveStabanSmuggleSpice(intrigueState, player.id, selectedSpace.id);
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

export function revealTurnPlan(activePlayer: Player, state?: Pick<GameState, "roundMakerSpaceVisits">): RevealTurnPlan {
  const interstellarTradePersuasion = activePlayer.hand
    .filter(isInterstellarTradeCard)
    .reduce((sum) => sum + activePlayer.contracts.filter((contract) => contract.completed).length, 0);
  const persuasion = revealPersuasionFor(activePlayer) + interstellarTradePersuasion;
  const swords = activePlayer.hand.reduce((sum, card) => sum + card.swords, 0) + (activePlayer.swordmasterBonus ? 2 : 0);
  const revealGain = activePlayer.hand.reduce<Partial<Resources>>((gain, card) => {
    Object.entries(card.revealGain ?? {}).forEach(([resource, amount]) => {
      gain[resource as ResourceId] = (gain[resource as ResourceId] ?? 0) + (amount ?? 0);
    });
    return gain;
  }, {});
  const smugglersHarvesterCount = state && hasVisitedMakerSpaceThisRound(state, activePlayer.id)
    ? activePlayer.hand.filter(isSmugglersHarvesterCard).length
    : 0;
  if (smugglersHarvesterCount > 0) {
    revealGain.spice = (revealGain.spice ?? 0) + smugglersHarvesterCount;
  }
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
