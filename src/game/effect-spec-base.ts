import type {
  CardEffectSpec,
  GameEffectConditionSpec,
  GameEffectSpec,
} from "./types";

export type CardEffectSpecOptions = {
  choiceId?: string;
};

function effectSpec(
  trigger: CardEffectSpec["trigger"],
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options: CardEffectSpecOptions = {},
): CardEffectSpec {
  return {
    trigger,
    ...(options.choiceId !== undefined ? { choiceId: options.choiceId } : {}),
    ...(conditions && conditions.length > 0 ? { conditions } : {}),
    effects,
  };
}

export function agentPlayEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("agent-play", effects, conditions);
}

export function agentPlacementEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("agent-placement", effects, conditions);
}

export function revealEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("reveal", effects, conditions);
}

export function acquireEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("acquire", effects, conditions);
}

export function discardEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("discard", effects, conditions);
}

export function trashEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return effectSpec("trash", effects, conditions);
}

export function plotIntrigueEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return effectSpec("plot-intrigue", effects, conditions, options);
}

export function combatIntrigueEffects(
  effects: GameEffectSpec[],
  conditions?: GameEffectConditionSpec[],
  options?: CardEffectSpecOptions,
): CardEffectSpec {
  return effectSpec("combat-intrigue", effects, conditions, options);
}
