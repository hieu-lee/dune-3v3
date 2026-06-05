import { resolveCardEffects, type GameEffectResult } from "./effect-resolver";
import { recordTurnSpiceGainAndCompleteHarvestContracts } from "./contract-rules";
import { drawIntrigueCards } from "./intrigue-deck";
import type { Card, GameEffectTrigger, GameState, Player, Resources } from "./types";

type DiscardedFromHandTriggerOptions = {
  logAfterCurrentAction?: boolean;
};

function hasResourceGain(gain: Partial<Resources>) {
  return Object.values(gain).some((amount) => (amount ?? 0) > 0);
}

function addResources(resources: Resources, gain: Partial<Resources>): Resources {
  return {
    ...resources,
    solari: resources.solari + (gain.solari ?? 0),
    spice: resources.spice + (gain.spice ?? 0),
    water: resources.water + (gain.water ?? 0),
  };
}

function resourceAmountText(label: string, amount: number | undefined) {
  if (!amount) return undefined;
  return `${amount} ${label}`;
}

function resourceGainText(gain: Partial<Resources>) {
  const parts = [
    resourceAmountText("Solari", gain.solari),
    resourceAmountText("spice", gain.spice),
    resourceAmountText("water", gain.water),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? `gains ${parts.join(" and ")}` : undefined;
}

function appendTriggerLog(log: string[], entry: string, options: DiscardedFromHandTriggerOptions) {
  if (options.logAfterCurrentAction && log.length > 0) {
    return [log[0], entry, ...log.slice(1)];
  }
  return [entry, ...log];
}

function assertSupportedCardTriggerResult(card: Card, trigger: GameEffectTrigger, result: GameEffectResult) {
  const allowIntrigueDraw = trigger === "trash";
  if (
    result.acquireRecruitBonus > 0 ||
    result.blocksDeploymentsThisTurn ||
    result.cardsToDraw > 0 ||
    (!allowIntrigueDraw && result.intriguesToDraw > 0) ||
    Object.values(result.influenceGains).some((amount) => amount > 0) ||
    result.influenceAdjustments.length > 0 ||
    Object.values(result.influenceLosses).some((amount) => amount > 0) ||
    result.persuasion > 0 ||
    result.recruitedTroops > 0 ||
    result.removeShieldWall ||
    hasResourceGain(result.spentResources) ||
    result.spyPlacements.length > 0 ||
    result.spyRecalls.length > 0 ||
    result.swords > 0 ||
    result.vp > 0 ||
    result.activatedAlly.cardsToDraw > 0 ||
    result.activatedAlly.intriguesToDraw > 0 ||
    result.activatedAlly.recruitedTroops > 0 ||
    hasResourceGain(result.activatedAlly.revealGain) ||
    result.activatedAlly.spyPlacements.length > 0
  ) {
    throw new Error(`Unsupported ${trigger} trigger result for ${card.name}`);
  }
}

function applyCardTriggers(
  state: GameState,
  ownerId: string,
  triggeredCard: Card,
  trigger: GameEffectTrigger,
  options: DiscardedFromHandTriggerOptions = {},
): GameState {
  if (!triggeredCard.effects) return state;
  const owner = state.players.find((player) => player.id === ownerId);
  if (!owner) return state;
  const result = resolveCardEffects([triggeredCard], {
    trigger,
    source: owner,
    state,
  });
  assertSupportedCardTriggerResult(triggeredCard, trigger, result);
  let nextState = state;
  if (hasResourceGain(result.revealGain)) {
    const ownerAfterTrigger: Player = {
      ...owner,
      resources: addResources(owner.resources, result.revealGain),
    };
    const source = result.revealGainSource ?? triggeredCard.name;
    const triggerLog = `${owner.leader} resolves ${source}: ${resourceGainText(result.revealGain)}.`;
    nextState = {
      ...nextState,
      players: nextState.players.map((player) => player.id === owner.id ? ownerAfterTrigger : player),
      log: appendTriggerLog(nextState.log, triggerLog, options),
    };
    if (result.revealGain.spice) {
      nextState = recordTurnSpiceGainAndCompleteHarvestContracts(nextState, owner.id, result.revealGain.spice).state;
    }
  }
  return result.intriguesToDraw > 0
    ? drawIntrigueCards(nextState, owner.id, result.intriguesToDraw, triggeredCard.name)
    : nextState;
}

export function applyDiscardedFromHandTriggers(
  state: GameState,
  ownerId: string,
  discardedCard: Card,
  options: DiscardedFromHandTriggerOptions = {},
): GameState {
  return applyCardTriggers(state, ownerId, discardedCard, "discard", options);
}

export function applyTrashedCardTriggers(
  state: GameState,
  ownerId: string,
  trashedCard: Card,
  options: DiscardedFromHandTriggerOptions = {},
): GameState {
  return applyCardTriggers(state, ownerId, trashedCard, "trash", options);
}
