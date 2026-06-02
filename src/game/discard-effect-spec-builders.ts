import { discardEffects } from "./effect-spec-base";
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
