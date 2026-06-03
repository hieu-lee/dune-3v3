import type {
  GameEffectConditionSpec,
  GameEffectTrigger,
} from "./types";
import {
  invalidSpecField,
  isNonNegativeInteger,
  isPositiveInteger,
  supportedFactions,
  supportedIcons,
  supportedRoles,
  supportedTeams,
  unsupportedKind,
} from "./effect-spec-validation-utils";

const supportedTriggers = new Set<GameEffectTrigger>([
  "agent-play",
  "agent-placement",
  "reveal",
  "acquire",
  "discard",
  "plot-intrigue",
  "combat-intrigue",
  "conflict-reward",
  "endgame",
  "round-start",
  "round-end",
]);

export function validateTrigger(trigger: GameEffectTrigger): asserts trigger is GameEffectTrigger {
  if (!supportedTriggers.has(trigger)) {
    throw new Error(`Unsupported effect trigger "${trigger}"`);
  }
}

export function validateCondition(condition: GameEffectConditionSpec, trigger: GameEffectTrigger) {
  if (condition.kind === "visited-maker-space") return;
  if (condition.kind === "visited-space-has-spy-post") return;
  if (condition.kind === "has-spy-post-on-maker-space") return;
  if (condition.kind === "has-combat-recipient") {
    if (trigger === "combat-intrigue") return;
    throw new Error(`Unsupported effect condition "${condition.kind}" for ${trigger}`);
  }
  if (condition.kind === "has-combat-recipient-sandworms") {
    if (trigger !== "combat-intrigue") {
      throw new Error(`Unsupported effect condition "${condition.kind}" for ${trigger}`);
    }
    if (isPositiveInteger(condition.count)) return;
    invalidSpecField("has-combat-recipient-sandworms count", condition.count);
  }
  if (condition.kind === "visited-space-icon") {
    if (supportedIcons.has(condition.icon)) return;
    throw new Error(`Unsupported effect icon "${condition.icon}"`);
  }
  if (condition.kind === "has-spy-posts") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-spy-posts count", condition.count);
  }
  if (condition.kind === "has-conflict-units") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-conflict-units count", condition.count);
  }
  if (condition.kind === "has-influence") {
    if (!supportedFactions.has(condition.faction)) {
      throw new Error(`Unsupported effect faction "${condition.faction}"`);
    }
    if (isNonNegativeInteger(condition.amount)) return;
    invalidSpecField("has-influence amount", condition.amount);
  }
  if (condition.kind === "has-completed-contracts") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-completed-contracts count", condition.count);
  }
  if (condition.kind === "has-card-trait-in-play") {
    if (typeof condition.trait !== "string" || condition.trait.trim().length === 0) {
      invalidSpecField("has-card-trait-in-play trait", condition.trait);
    }
    if (condition.count === undefined || isNonNegativeInteger(condition.count)) return;
    invalidSpecField("has-card-trait-in-play count", condition.count);
  }
  if (condition.kind === "has-team") {
    if (supportedTeams.has(condition.team)) return;
    throw new Error(`Unsupported effect team "${condition.team}"`);
  }
  if (condition.kind === "has-role") {
    if (supportedRoles.has(condition.role)) return;
    throw new Error(`Unsupported effect role "${condition.role}"`);
  }
  if (condition.kind === "has-high-council-seat") return;
  if (condition.kind === "has-swordmaster-bonus") return;
  if (condition.kind === "has-leader") {
    if (typeof condition.leader === "string" && condition.leader.trim().length > 0) return;
    invalidSpecField("has-leader leader", condition.leader);
  }
  if (condition.kind === "has-leader-counter") {
    if (condition.counter !== "jessicaMemories") {
      invalidSpecField("has-leader-counter counter", condition.counter);
    }
    if (isPositiveInteger(condition.amount)) return;
    invalidSpecField("has-leader-counter amount", condition.amount);
  }
  if (condition.kind === "has-alliance") {
    if (condition.faction === undefined || supportedFactions.has(condition.faction)) return;
    throw new Error(`Unsupported effect faction "${condition.faction}"`);
  }
  if (condition.kind === "deployed-units-this-turn") {
    if (isNonNegativeInteger(condition.count)) return;
    invalidSpecField("deployed-units-this-turn count", condition.count);
  }
  if (condition.kind === "recalled-spy-this-turn") return;
  if (condition.kind === "gained-spice-this-turn") return;
  unsupportedKind("effect condition", condition);
}
