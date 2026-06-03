import assert from "node:assert/strict";
import {
  agentSpec,
  plotSpec,
  revealSpec,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecCoreValidation({
  cards,
  effectResolver,
  fremenSupportCard,
  game,
  players,
  turnActions,
}) {
  const { chani, convincingArgument } = cards;
  const { p2, p4 } = players;
  const chaniSoloReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(
    chaniSoloReveal.persuasion,
    0,
    "Fremen Bond should not trigger from Chani alone",
  );
  assert.deepEqual(
    chaniSoloReveal.printedRevealCards,
    [],
    "Chani Fremen Bond should not need manual reveal fallback",
  );
  const chaniHandBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani, fremenSupportCard],
    playArea: [],
    highCouncilSeat: false,
  });
  assert.equal(
    chaniHandBondReveal.persuasion,
    2,
    "Fremen Bond should count another Fremen card revealed from hand",
  );
  const chaniPlayAreaBondReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [chani],
    playArea: [fremenSupportCard],
    highCouncilSeat: false,
  });
  assert.equal(
    chaniPlayAreaBondReveal.persuasion,
    2,
    "Fremen Bond should count another Fremen card already in play",
  );

  const overrideCard = {
    ...convincingArgument,
    id: "effect-spec-override-card",
    name: "Effect Spec Override",
    persuasion: 99,
    swords: 99,
    revealGain: { spice: 99 },
    effects: [
      revealSpec([
        { kind: "gain-persuasion", selector: "self", amount: 2 },
        { kind: "gain-strength", selector: "self", amount: 1 },
        {
          kind: "gain-resource",
          selector: "self",
          resource: "water",
          amount: 1,
        },
      ]),
    ],
  };
  const overrideReveal = turnActions.revealTurnPlan({
    ...p2,
    hand: [overrideCard],
    highCouncilSeat: false,
  });
  assert.equal(
    overrideReveal.persuasion,
    2,
    "Reveal specs should override legacy card persuasion",
  );
  assert.equal(
    overrideReveal.swords,
    1,
    "Reveal specs should override legacy card strength",
  );
  assert.deepEqual(
    overrideReveal.revealGain,
    { water: 1 },
    "Reveal specs should override legacy revealGain",
  );
  const unsupportedSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-selector-card",
    name: "Effect Spec Unsupported Selector",
    effects: [
      revealSpec([
        { kind: "gain-persuasion", selector: "teammate", amount: 1 },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [unsupportedSelectorCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect selector "teammate"/,
    "Unsupported effect selectors should fail loudly instead of silently becoming no-ops",
  );
  const unsupportedAmountCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-amount-card",
    name: "Effect Spec Unsupported Amount",
    effects: [
      revealSpec([
        {
          kind: "gain-persuasion",
          selector: "self",
          amount: { kind: "renown" },
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [unsupportedAmountCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect amount "renown"/,
    "Unsupported effect amounts should fail loudly instead of silently becoming zero",
  );
  const negativeAmountCard = {
    ...convincingArgument,
    id: "effect-spec-negative-amount-card",
    name: "Effect Spec Negative Amount",
    effects: [
      revealSpec([{ kind: "gain-persuasion", selector: "self", amount: -1 }]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [negativeAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Gain effect amounts should be non-negative integers",
  );
  const invalidRevealVpCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-vp-card",
    name: "Effect Spec Invalid Reveal VP",
    effects: [revealSpec([{ kind: "gain-vp", selector: "self", amount: 1 }])],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealVpCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect "gain-vp" for reveal/,
    "Acquire VP effects should not silently run during Reveal",
  );
  const invalidRevealLoseInfluenceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-lose-influence-card",
    name: "Effect Spec Invalid Reveal Lose Influence",
    effects: [
      revealSpec([
        {
          kind: "lose-influence",
          selector: "self",
          faction: "bene",
          amount: 1,
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealLoseInfluenceCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect "lose-influence" for reveal/,
    "Influence-loss effects should stay on Plot specs until other triggers can apply them",
  );
  const invalidRevealAcquireRecruitBonusCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-reveal-acquire-recruit-bonus-card",
    name: "Effect Spec Invalid Reveal Acquire Recruit Bonus",
    effects: [
      revealSpec([
        { kind: "activate-acquire-recruit-bonus", selector: "self", amount: 1 },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidRevealAcquireRecruitBonusCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect "activate-acquire-recruit-bonus" for reveal/,
    "Acquire-recruit bonus activation should stay on Plot specs",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          {
            trigger: "plot-intrigue",
            effects: [
              {
                kind: "activate-acquire-recruit-bonus",
                selector: "self",
                amount: 2,
              },
            ],
          },
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid activate-acquire-recruit-bonus amount "2"/,
    "Acquire-recruit bonus activation currently supports exactly one troop per acquisition",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            { kind: "remove-shield-wall", selector: "self", source: "Test" },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "remove-shield-wall" for agent-play/,
    "Shield Wall removal specs should stay on Plot Intrigues",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "remove-shield-wall",
              selector: "activated-ally",
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Shield Wall removal specs should target only the source player",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            { kind: "remove-shield-wall", selector: "self", source: "" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid remove-shield-wall source ""/,
    "Shield Wall removal specs should reject empty source labels",
  );
  const deployRecruitedTroopsResult = effectResolver.resolveGameEffects(
    [
      agentSpec([
        {
          kind: "deploy-recruited-troops",
          selector: "self",
          source: "Deploy Recruits Test",
        },
      ]),
    ],
    { trigger: "agent-play", source: p2, state: game },
  );
  assert.equal(
    deployRecruitedTroopsResult.deployRecruitedTroops,
    true,
    "Deploy-recruited-troops specs should resolve their Agent modifier",
  );
  assert.equal(
    deployRecruitedTroopsResult.deployRecruitedTroopsSource,
    "Deploy Recruits Test",
    "Deploy-recruited-troops specs should preserve source labels",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          revealSpec([
            {
              kind: "deploy-recruited-troops",
              selector: "self",
              source: "Test",
            },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Unsupported effect "deploy-recruited-troops" for reveal/,
    "Deploy-recruited-troops specs should stay on Agent play",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            {
              kind: "deploy-recruited-troops",
              selector: "activated-ally",
              source: "Test",
            },
          ]),
        ],
        { trigger: "agent-play", source: p4, target: p2, state: game },
      ),
    /Unsupported effect selector "activated-ally" for deploy-recruited-troops/,
    "Deploy-recruited-troops specs should reject activated Ally selectors",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            { kind: "deploy-recruited-troops", selector: "self", source: "" },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Invalid deploy-recruited-troops source ""/,
    "Deploy-recruited-troops specs should reject empty source labels",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotDeployTroops(
        [
          agentSpec([
            { kind: "deploy-troops", selector: "self", max: 1, source: "Test" },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "deploy-troops" for agent-play/,
    "Deploy-troops specs should stay on Plot Intrigues",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotDeployTroops(
        [
          plotSpec([
            {
              kind: "deploy-troops",
              selector: "opponent",
              max: 1,
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect selector "opponent" for deploy-troops/,
    "Deploy-troops specs should reject unsupported selectors",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotDeployTroops(
        [
          plotSpec([
            { kind: "deploy-troops", selector: "self", max: 0, source: "Test" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid deploy-troops max "0"/,
    "Deploy-troops specs should require a positive max",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotDeployTroops(
        [
          plotSpec([
            {
              kind: "deploy-troops",
              selector: "self",
              max: { kind: "completed-contracts" },
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid deploy-troops max "\[object Object\]"/,
    "Deploy-troops specs should reject dynamic max amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotDeployTroops(
        [
          plotSpec([
            { kind: "deploy-troops", selector: "self", max: 1, source: "" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid deploy-troops source ""/,
    "Deploy-troops specs should reject empty source labels",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotSummonSandworms(
        [
          agentSpec([
            {
              kind: "summon-sandworms",
              selector: "self",
              amount: 1,
              source: "Test",
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "summon-sandworms" for agent-play/,
    "Summon-sandworms specs should stay on Plot Intrigues",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotSummonSandworms(
        [
          plotSpec([
            {
              kind: "summon-sandworms",
              selector: "opponent",
              amount: 1,
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect selector "opponent" for summon-sandworms/,
    "Summon-sandworms specs should reject unsupported selectors",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotSummonSandworms(
        [
          plotSpec([
            {
              kind: "summon-sandworms",
              selector: "self",
              amount: 0,
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid summon-sandworms amount "0"/,
    "Summon-sandworms specs should require a positive amount",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotSummonSandworms(
        [
          plotSpec([
            {
              kind: "summon-sandworms",
              selector: "self",
              amount: { kind: "completed-contracts" },
              source: "Test",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid summon-sandworms amount "\[object Object\]"/,
    "Summon-sandworms specs should reject dynamic amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolvePlotSummonSandworms(
        [
          plotSpec([
            {
              kind: "summon-sandworms",
              selector: "self",
              amount: 1,
              source: "",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid summon-sandworms source ""/,
    "Summon-sandworms specs should reject empty source labels",
  );
}
