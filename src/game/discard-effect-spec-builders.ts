import { discardEffects, trashEffects } from "./effect-spec-base";
import type {
  CardEffectSpec,
  EffectAmountSpec,
  GameEffectConditionSpec,
  ResourceId,
} from "./types";

export function discardGainResource(
  resource: ResourceId,
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return discardEffects([{ kind: "gain-resource", selector: "self", resource, amount }], conditions);
}

export function trashDrawIntrigues(
  amount: EffectAmountSpec,
  conditions?: GameEffectConditionSpec[],
): CardEffectSpec {
  return trashEffects([{ kind: "draw-intrigues", selector: "self", amount }], conditions);
}
