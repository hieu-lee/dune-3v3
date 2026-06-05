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
} from "./influence-loss-rules";
import type {
  BuyAccessChoice,
  ImperiumPoliticsChoice,
  InfluenceLossPair,
  SietchRitualChoice,
} from "./influence-choices";
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
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  if (!validSietchRitualChoice(player, faction)) return state;
  const personalFaction = commanderPersonalFaction(player);
  const requiresActivatedAlly = player.role === "Commander" && faction !== personalFaction;
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isSietchRitualIntrigue,
    (actor, _contractPending, activatedAlly, _resolved, outcome) => {
      const influenceOwner = activatedAlly && activatedAlly.id !== actor.id ? activatedAlly : actor;
      const influenceText = influenceOwner.id === actor.id
        ? `gains 1 ${factionLabels[faction]} Influence`
        : `${influenceOwner.leader} gains 1 ${factionLabels[faction]} Influence`;
      return `${actor.leader} plays Sietch Ritual, discards ${outcome.discardedCard?.name ?? "a card"}, and ${influenceText}.`;
    },
    {
      choiceId: faction,
      discardCardId,
      ...(requiresActivatedAlly ? { activatedAllyOwnerId: influenceOwnerId, requireActivatedAlly: true } : {}),
    },
  );
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

function changeAllegiancesChoiceId(choice: ChangeAllegiancesChoice) {
  if (!choice || typeof choice !== "object") return undefined;
  if (
    choice.kind === "shift" &&
    isInfluenceLossFaction(choice.loseFaction) &&
    isInfluenceLossFaction(choice.gainFaction)
  ) {
    return `shift:${choice.loseFaction}->${choice.gainFaction}`;
  }
  if (choice.kind === "spend-spice" && isInfluenceLossFaction(choice.gainFaction)) {
    return `spend:${choice.gainFaction}`;
  }
  if (
    choice.kind === "both" &&
    isInfluenceLossFaction(choice.loseFaction) &&
    isInfluenceLossFaction(choice.shiftGainFaction) &&
    isInfluenceLossFaction(choice.spiceGainFaction)
  ) {
    return `both:${choice.loseFaction}->${choice.shiftGainFaction}+spend:${choice.spiceGainFaction}`;
  }
  return undefined;
}

function changeAllegiancesSelectedFactions(choice: ChangeAllegiancesChoice) {
  if (choice.kind === "shift") return [choice.loseFaction, choice.gainFaction];
  if (choice.kind === "spend-spice") return [choice.gainFaction];
  return [choice.loseFaction, choice.shiftGainFaction, choice.spiceGainFaction];
}

function changeAllegiancesEffectOwner(
  player: Player,
  faction: FactionId,
  activatedAlly: Player | undefined,
) {
  const personalFaction = commanderPersonalFaction(player);
  return player.role === "Commander" && faction !== personalFaction
    ? activatedAlly
    : player;
}

export function playChangeAllegiancesPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: ChangeAllegiancesChoice,
  influenceOwnerId?: string,
): GameState {
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const choiceId = changeAllegiancesChoiceId(choice);
  if (!choiceId) return state;
  if (!changeAllegiancesChoiceValid(state, player, choice, influenceOwnerId)) return state;
  const spendsSpice = choice.kind === "spend-spice" || choice.kind === "both";
  if (spendsSpice && player.resources.spice < 3) return state;

  const shiftGainFaction = changeAllegiancesShiftGainFaction(choice);
  const spiceGainFaction = changeAllegiancesSpiceGainFaction(choice);
  const personalFaction = commanderPersonalFaction(player);
  const requiresActivatedAlly = player.role === "Commander" &&
    changeAllegiancesSelectedFactions(choice).some((faction) => faction !== personalFaction);

  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isChangeAllegiancesIntrigue,
    (actor, _contractPending, activatedAlly) => {
      const gainEffects = [
        ...(shiftGainFaction
          ? [{ owner: changeAllegiancesEffectOwner(actor, shiftGainFaction, activatedAlly), faction: shiftGainFaction }]
          : []),
        ...(spiceGainFaction
          ? [{ owner: changeAllegiancesEffectOwner(actor, spiceGainFaction, activatedAlly), faction: spiceGainFaction }]
          : []),
      ];
      const gainText = gainEffects
        .map(({ owner, faction }) =>
          owner && owner.id !== actor.id
            ? `${owner.leader} gains 1 ${factionLabels[faction]} Influence`
            : `gains 1 ${factionLabels[faction]} Influence`
        )
        .join(" and ");
      if (choice.kind === "spend-spice") {
        return `${actor.leader} plays Change Allegiances, spends 3 spice, and ${gainText}.`;
      }
      const lossOwner = changeAllegiancesEffectOwner(actor, choice.loseFaction, activatedAlly);
      return choice.kind === "shift"
        ? `${actor.leader} plays Change Allegiances; ${lossOwner?.leader ?? actor.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence and ${gainText}.`
        : `${actor.leader} plays Change Allegiances; ${lossOwner?.leader ?? actor.leader} loses 1 ${factionLabels[choice.loseFaction]} Influence, ${actor.leader} spends 3 spice, and ${gainText}.`;
    },
    {
      choiceId,
      ...(requiresActivatedAlly ? { activatedAllyOwnerId: influenceOwnerId, requireActivatedAlly: true } : {}),
    },
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
  const requiresActivatedAlly = player.role === "Commander" && faction !== commanderPersonalFaction(player);
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
