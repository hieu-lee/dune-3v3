import assert from "node:assert/strict";
import {
  agentSpec,
  combatSpec,
  plotSpec,
  revealSpec,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecTrashValidation({
  cards,
  effectResolver,
  game,
  players,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p2 } = players;
  const agentTrashCard = {
    ...convincingArgument,
    id: "effect-spec-agent-trash-card",
    name: "Effect Spec Agent Trash Card",
    effects: [
      agentSpec([{ kind: "trash-card", selector: "self", optional: true }]),
    ],
  };
  assert.equal(
    effectResolver.resolveTrashCardEffects(agentTrashCard.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    })[0]?.sourceOnly,
    false,
    "Agent selected trash-card specs should resolve without sourceOnly",
  );
  const invalidAgentTrashStrengthRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-strength-reward-card",
    name: "Effect Spec Invalid Agent Trash Strength Reward",
    effects: [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          strengthReward: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidAgentTrashStrengthRewardCard.effects,
        {
          trigger: "agent-play",
          source: p2,
          state: game,
        },
      ),
    /Unsupported trash-card strengthReward for agent-play/,
    "Agent selected trash-card specs should reject strength rewards",
  );
  const invalidAgentSelectedTrashExcludeSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-selected-trash-exclude-source-card",
    name: "Effect Spec Invalid Agent Selected Trash Exclude Source",
    effects: [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          excludeSource: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidAgentSelectedTrashExcludeSourceCard.effects,
        {
          trigger: "agent-play",
          source: p2,
          state: game,
        },
      ),
    /Invalid trash-card excludeSource "true"/,
    "Agent selected trash-card specs should reject source exclusion until it can exclude by source instance",
  );
  const invalidAgentTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-draw-reward-card",
    name: "Effect Spec Invalid Agent Trash Draw Reward",
    effects: [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          zones: ["playArea"],
          sourceOnly: true,
          drawCardsReward: -1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidAgentTrashDrawRewardCard.effects,
        {
          trigger: "agent-play",
          source: p2,
          state: game,
        },
      ),
    /Invalid effect amount "-1"/,
    "Agent source trash-card draw rewards should require non-negative integer amounts",
  );
  const invalidAgentSelectedTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-selected-trash-draw-reward-card",
    name: "Effect Spec Invalid Agent Selected Trash Draw Reward",
    effects: [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          drawCardsReward: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidAgentSelectedTrashDrawRewardCard.effects,
        {
          trigger: "agent-play",
          source: p2,
          state: game,
        },
      ),
    /Unsupported trash-card drawCardsReward for agent-play without sourceOnly/,
    "Agent selected trash-card specs should reject draw rewards until reward-bearing selected trash is supported",
  );
  const invalidAgentTrashVpRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-agent-trash-vp-reward-card",
    name: "Effect Spec Invalid Agent Trash VP Reward",
    effects: [
      agentSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          zones: ["playArea"],
          sourceOnly: true,
          vpReward: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidAgentTrashVpRewardCard.effects,
        {
          trigger: "agent-play",
          source: p2,
          state: game,
        },
      ),
    /Unsupported trash-card vpReward for agent-play/,
    "Agent source trash-card specs should reject VP rewards until that pending path carries them explicitly",
  );
  const invalidTrashOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-optional-card",
    name: "Effect Spec Invalid Trash Optional",
    effects: [
      plotSpec([{ kind: "trash-card", selector: "self", optional: "yes" }]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(invalidTrashOptionalCard.effects, {
        trigger: "plot-intrigue",
        source: p2,
        state: game,
      }),
    /Invalid trash-card optional "yes"/,
    "Plot trash-card specs should require optional to be boolean when present",
  );
  const invalidPlotTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-plot-trash-strength-card",
    name: "Effect Spec Invalid Plot Trash Strength",
    effects: [
      plotSpec([
        {
          kind: "trash-card",
          selector: "self",
          strengthReward: 1,
          optional: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidPlotTrashStrengthCard.effects,
        {
          trigger: "plot-intrigue",
          source: p2,
          state: game,
        },
      ),
    /Unsupported trash-card strengthReward for plot-intrigue/,
    "Plot trash-card specs should reject reveal/combat reward metadata until that pending path supports it",
  );
  const invalidCombatTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-strength-card",
    name: "Effect Spec Invalid Combat Trash Strength",
    effects: [
      combatSpec([
        {
          kind: "trash-card",
          selector: "self",
          strengthReward: 1,
          optional: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidCombatTrashStrengthCard.effects,
        {
          trigger: "combat-intrigue",
          source: p2,
          state: game,
        },
      ),
    /Unsupported trash-card strengthReward for combat-intrigue/,
    "Combat trash-card specs should reject reward metadata until that pending path supports it",
  );
  const invalidCombatTrashRequiredCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-required-card",
    name: "Effect Spec Invalid Combat Trash Required",
    effects: [
      combatSpec([{ kind: "trash-card", selector: "self", optional: false }]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidCombatTrashRequiredCard.effects,
        {
          trigger: "combat-intrigue",
          source: p2,
          state: game,
        },
      ),
    /Invalid combat trash-card optional "false"/,
    "Combat trash-card specs should stay optional until mandatory Combat trash behavior is supported",
  );
  const invalidCombatTrashMissingOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-combat-trash-missing-optional-card",
    name: "Effect Spec Invalid Combat Trash Missing Optional",
    effects: [combatSpec([{ kind: "trash-card", selector: "self" }])],
  };
  assert.throws(
    () =>
      effectResolver.resolveTrashCardEffects(
        invalidCombatTrashMissingOptionalCard.effects,
        {
          trigger: "combat-intrigue",
          source: p2,
          state: game,
        },
      ),
    /Invalid combat trash-card optional "undefined"/,
    "Combat trash-card specs should require explicit optional true",
  );
  const invalidTrashZoneCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-zone-card",
    name: "Effect Spec Invalid Trash Zone",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          zones: ["deck"],
          optional: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidTrashZoneCard],
        highCouncilSeat: false,
      }),
    /Unsupported trash-card zone "deck"/,
    "Trash-card specs should reject unsupported zones",
  );
  const invalidTrashTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-trait-card",
    name: "Effect Spec Invalid Trash Trait",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          requiredTrait: "",
          optional: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidTrashTraitCard],
        highCouncilSeat: false,
      }),
    /Invalid trash-card requiredTrait ""/,
    "Trash-card specs should require a non-empty required trait",
  );
  const invalidTrashStrengthCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-trash-strength-card",
    name: "Effect Spec Invalid Trash Strength",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          strengthReward: -1,
          optional: true,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidTrashStrengthCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Trash-card strength rewards should require non-negative integer amounts",
  );
  const invalidRevealTrashDrawRewardCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-trash-draw-reward-card",
    name: "Effect Spec Invalid Reveal Trash Draw Reward",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          drawCardsReward: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealTrashDrawRewardCard],
        highCouncilSeat: false,
      }),
    /Unsupported trash-card drawCardsReward for reveal/,
    "Trash-card draw rewards should stay scoped to Agent source trash until other pending paths support them",
  );
  const invalidRevealSourceTrashMissingVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-source-trash-missing-vp-card",
    name: "Effect Spec Invalid Reveal Source Trash Missing VP",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          sourceOnly: true,
          zones: ["playArea"],
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealSourceTrashMissingVpCard],
        highCouncilSeat: false,
      }),
    /Invalid trash-card vpReward "undefined"/,
    "Reveal source trash-card specs should require an explicit VP reward",
  );
  const invalidRevealSourceTrashZoneCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-source-trash-zone-card",
    name: "Effect Spec Invalid Reveal Source Trash Zone",
    effects: [
      revealSpec([
        {
          kind: "trash-card",
          selector: "self",
          optional: true,
          sourceOnly: true,
          zones: ["hand"],
          vpReward: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealSourceTrashZoneCard],
        highCouncilSeat: false,
      }),
    /Invalid reveal source trash-card zones "hand"/,
    "Reveal source trash-card specs should only target the source card in play",
  );
  const invalidRevealSelectedTrashVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-selected-trash-vp-card",
    name: "Effect Spec Invalid Reveal Selected Trash VP",
    effects: [
      revealSpec([
        { kind: "trash-card", selector: "self", optional: true, vpReward: 1 },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealSelectedTrashVpCard],
        highCouncilSeat: false,
      }),
    /Unsupported trash-card vpReward for reveal/,
    "Reveal selected trash-card specs should reject VP rewards until that path is explicitly modeled",
  );
}
