import {
  factionIds,
  factionLabels,
} from "./data";
import {
  isBuyAccessIntrigue,
  isChangeAllegiancesIntrigue,
  isImperiumPoliticsIntrigue,
  isOpportunismIntrigue,
  isSietchRitualIntrigue,
} from "./card-identifiers";
import { commanderPersonalFaction } from "./commander-rules";
import {
  buyAccessPairChoices,
  changeAllegiancesGainChoices,
  imperiumPoliticsFactionChoices,
  validBuyAccessChoice,
  validSietchRitualChoice,
} from "./influence-choices";
import {
  changeAllegiancesLossChoices,
  influenceEffectOwnerForChoice,
} from "./influence-loss-rules";
import type {
  BuyAccessChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
} from "./influence-choices";
import {
  adjustInfluence,
  adjustInfluenceAndResolveThresholdRewards,
  resolveLeaderInfluenceThresholdRewards,
} from "./leader-rewards";
import { activatedAllyEffectOwner } from "./market-rules";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import type {
  FactionId,
  GameState,
  Player,
} from "./types";

export type ChangeAllegiancesChoice =
  | { kind: "shift"; loseFaction: FactionId; gainFaction: FactionId }
  | { kind: "spend-spice"; gainFaction: FactionId }
  | { kind: "both"; loseFaction: FactionId; shiftGainFaction: FactionId; spiceGainFaction: FactionId };

export function playSietchRitualPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  discardCardId: string,
  faction: SietchRitualChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isSietchRitualIntrigue(intrigue)) return state;
  const discardedCard = player.hand.find((card) => card.id === discardCardId);
  if (!discardedCard || !validSietchRitualChoice(player, faction)) return state;
  const personalFaction = commanderPersonalFaction(player);
  const influenceOwnerResult =
    player.role === "Commander" && faction !== personalFaction
      ? activatedAllyEffectOwner(state, player, influenceOwnerId)
      : { valid: true, owner: player };
  if (!influenceOwnerResult.valid || !influenceOwnerResult.owner) return state;
  const influenceOwner = influenceOwnerResult.owner;

  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        hand: next.hand.filter((card) => card.id !== discardedCard.id),
        discard: [...next.discard, discardedCard],
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    if (candidate.id === influenceOwner.id) {
      next = adjustInfluence(next, faction, 1);
    }
    return next;
  });
  const influenceText = influenceOwner.id === player.id
    ? `gains 1 ${factionLabels[faction]} Influence`
    : `${influenceOwner.leader} gains 1 ${factionLabels[faction]} Influence`;

  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [
      `${player.leader} plays Sietch Ritual, discards ${discardedCard.name}, and ${influenceText}.`,
      ...state.log,
    ],
  };
  return resolveLeaderInfluenceThresholdRewards(nextState, state.players);
}

function changeAllegiancesChoiceValid(
  state: GameState,
  player: Player,
  choice: ChangeAllegiancesChoice,
  influenceOwnerId?: string,
) {
  if (!choice || typeof choice !== "object") return false;
  if (choice.kind === "spend-spice") {
    return changeAllegiancesGainChoices(player).includes(choice.gainFaction);
  }
  if (choice.kind === "shift") {
    return (
      changeAllegiancesLossChoices(state, player, influenceOwnerId).includes(choice.loseFaction) &&
      changeAllegiancesGainChoices(player).includes(choice.gainFaction)
    );
  }
  if (choice.kind === "both") {
    const gainChoices = changeAllegiancesGainChoices(player);
    return (
      changeAllegiancesLossChoices(state, player, influenceOwnerId).includes(choice.loseFaction) &&
      gainChoices.includes(choice.shiftGainFaction) &&
      gainChoices.includes(choice.spiceGainFaction)
    );
  }
  return false;
}

function changeAllegiancesShiftGainFaction(choice: ChangeAllegiancesChoice) {
  if (choice.kind === "shift") return choice.gainFaction;
  if (choice.kind === "both") return choice.shiftGainFaction;
  return undefined;
}

function changeAllegiancesSpiceGainFaction(choice: ChangeAllegiancesChoice) {
  if (choice.kind === "spend-spice") return choice.gainFaction;
  if (choice.kind === "both") return choice.spiceGainFaction;
  return undefined;
}

export function playChangeAllegiancesPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: ChangeAllegiancesChoice,
  influenceOwnerId?: string,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isChangeAllegiancesIntrigue(intrigue)) return state;
  if (!changeAllegiancesChoiceValid(state, player, choice, influenceOwnerId)) return state;
  const spendsSpice = choice.kind === "spend-spice" || choice.kind === "both";
  if (spendsSpice && player.resources.spice < 3) return state;

  const shiftGainFaction = changeAllegiancesShiftGainFaction(choice);
  const spiceGainFaction = changeAllegiancesSpiceGainFaction(choice);
  const shiftGainOwnerResult = shiftGainFaction
    ? influenceEffectOwnerForChoice(state, player, shiftGainFaction, influenceOwnerId)
    : undefined;
  if (shiftGainOwnerResult && (!shiftGainOwnerResult.valid || !shiftGainOwnerResult.owner)) return state;
  const spiceGainOwnerResult = spiceGainFaction
    ? influenceEffectOwnerForChoice(state, player, spiceGainFaction, influenceOwnerId)
    : undefined;
  if (spiceGainOwnerResult && (!spiceGainOwnerResult.valid || !spiceGainOwnerResult.owner)) return state;
  const lossFaction = choice.kind === "shift" || choice.kind === "both" ? choice.loseFaction : undefined;
  const lossOwnerResult = lossFaction
    ? influenceEffectOwnerForChoice(state, player, lossFaction, influenceOwnerId)
    : undefined;
  if (lossOwnerResult && (!lossOwnerResult.valid || !lossOwnerResult.owner)) return state;
  if (lossOwnerResult?.owner && lossFaction && lossOwnerResult.owner.influence[lossFaction] <= 0) return state;

  const lossOwner = lossOwnerResult?.owner;
  const players = state.players.map((candidate) => {
    let next = candidate;
    if (candidate.id === player.id) {
      next = {
        ...next,
        resources: spendsSpice
          ? { ...next.resources, spice: next.resources.spice - 3 }
          : next.resources,
        intrigues: next.intrigues.filter((card) => card.id !== intrigue.id),
      };
    }
    return next;
  });
  const gainEffects = [
    ...(shiftGainFaction && shiftGainOwnerResult?.owner
      ? [{ owner: shiftGainOwnerResult.owner, faction: shiftGainFaction }]
      : []),
    ...(spiceGainFaction && spiceGainOwnerResult?.owner
      ? [{ owner: spiceGainOwnerResult.owner, faction: spiceGainFaction }]
      : []),
  ];
  const gainText = gainEffects
    .map(({ owner, faction }) =>
      owner.id === player.id
        ? `gains 1 ${factionLabels[faction]} Influence`
        : `${owner.leader} gains 1 ${factionLabels[faction]} Influence`
    )
    .join(" and ");
  const logEntry = choice.kind === "spend-spice"
    ? `${player.leader} plays Change Allegiances, spends 3 spice, and ${gainText}.`
    : choice.kind === "shift"
      ? `${player.leader} plays Change Allegiances; ${lossOwner?.leader ?? player.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence and ${gainText}.`
      : `${player.leader} plays Change Allegiances; ${lossOwner?.leader ?? player.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence, ${player.leader} spends 3 spice, and ${gainText}.`;

  const nextState = {
    ...state,
    players,
    intrigueDiscard: [...state.intrigueDiscard, intrigue],
    log: [logEntry, ...state.log],
  };
  const influenceSteps = [
    ...(lossOwner && lossFaction
      ? [{ ownerId: lossOwner.id, faction: lossFaction, amount: -1 }]
      : []),
    ...(shiftGainFaction && shiftGainOwnerResult?.owner
      ? [{ ownerId: shiftGainOwnerResult.owner.id, faction: shiftGainFaction, amount: 1 }]
      : []),
    ...(spiceGainFaction && spiceGainOwnerResult?.owner
      ? [{ ownerId: spiceGainOwnerResult.owner.id, faction: spiceGainFaction, amount: 1 }]
      : []),
  ];
  return influenceSteps.reduce(
    (next, { ownerId, faction, amount }) =>
      adjustInfluenceAndResolveThresholdRewards(next, ownerId, faction, amount),
    nextState,
  );
}

function influenceLossPairLog(choice: InfluenceLossPair) {
  const [first, second] = choice;
  if (first === second) return `2 ${factionLabels[first]} Influence`;
  return `1 ${factionLabels[first]} Influence and 1 ${factionLabels[second]} Influence`;
}

function isInfluenceLossFaction(faction: unknown): faction is FactionId {
  return typeof faction === "string" && factionIds.includes(faction as FactionId);
}

function opportunismChoiceId(choice: InfluenceLossPair) {
  if (!Array.isArray(choice) || choice.length !== 2) return undefined;
  const [first, second] = choice;
  if (!isInfluenceLossFaction(first) || !isInfluenceLossFaction(second)) return undefined;
  return factionIds.indexOf(first) <= factionIds.indexOf(second)
    ? `${first}+${second}`
    : `${second}+${first}`;
}

export function playOpportunismPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: InfluenceLossPair,
): GameState {
  const choiceId = opportunismChoiceId(choice);
  if (!choiceId) return state;
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isOpportunismIntrigue,
    (player) =>
      `${player.leader} plays Opportunism, spends 2 Solari, loses ${influenceLossPairLog(choice)}, and gains 1 VP.`,
    { choiceId },
  );
}

export function playImperiumPoliticsPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  faction: ImperiumPoliticsChoice,
  influenceOwnerId?: string,
): GameState {
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  if (!imperiumPoliticsFactionChoices(player).includes(faction)) return state;
  const requiresActivatedAlly = player.role === "Commander" && faction !== "emperor";
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isImperiumPoliticsIntrigue,
    (actor, _contractPending, activatedAlly) => {
      const influenceText = activatedAlly && activatedAlly.id !== actor.id
        ? `${activatedAlly.leader} gains`
        : "gains";
      return `${actor.leader} plays Imperium Politics, spends 1 Solari, and ${influenceText} 1 ${factionLabels[faction]} Influence.`;
    },
    {
      choiceId: faction,
      ...(requiresActivatedAlly ? { activatedAllyOwnerId: influenceOwnerId, requireActivatedAlly: true } : {}),
    },
  );
}

function buyAccessChoiceId(player: Player, choice: BuyAccessChoice) {
  if (!validBuyAccessChoice(player, choice)) return undefined;
  const [selectedFirst, selectedSecond] = choice;
  const canonicalChoice = buyAccessPairChoices(player).find(([first, second]) =>
    (first === selectedFirst && second === selectedSecond) ||
    (first === selectedSecond && second === selectedFirst)
  );
  return canonicalChoice ? `${canonicalChoice[0]}+${canonicalChoice[1]}` : undefined;
}

function buyAccessGainText(player: Player, activatedAlly: Player | undefined, choice: BuyAccessChoice) {
  const personalFaction = commanderPersonalFaction(player);
  const effects = choice.map((faction) => {
    const owner = player.role === "Commander" && faction !== personalFaction ? activatedAlly : player;
    return { faction, owner };
  });
  const selfOnly = effects.every((effect) => effect.owner?.id === player.id);
  if (selfOnly) {
    return `gains ${effects
      .map((effect) => `1 ${factionLabels[effect.faction]} Influence`)
      .join(" and ")}`;
  }
  return effects
    .map((effect) =>
      effect.owner?.id === player.id
        ? `gains 1 ${factionLabels[effect.faction]} Influence`
        : `${effect.owner?.leader ?? "the activated Ally"} gains 1 ${factionLabels[effect.faction]} Influence`
    )
    .join(" and ");
}

export function playBuyAccessPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: BuyAccessChoice,
  influenceOwnerId?: string,
): GameState {
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const choiceId = buyAccessChoiceId(player, choice);
  if (!choiceId) return state;
  const personalFaction = commanderPersonalFaction(player);
  const requiresActivatedAlly = player.role === "Commander" && choice.some((faction) => faction !== personalFaction);
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isBuyAccessIntrigue,
    (actor, _contractPending, activatedAlly) =>
      `${actor.leader} plays Buy Access, spends 5 Solari, and ${buyAccessGainText(actor, activatedAlly, choice)}.`,
    {
      choiceId,
      ...(requiresActivatedAlly ? { activatedAllyOwnerId: influenceOwnerId, requireActivatedAlly: true } : {}),
    },
  );
}
