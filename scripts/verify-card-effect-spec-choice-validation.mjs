import assert from "node:assert/strict";
import { acquireSpec, agentSpec, revealSpec } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecChoiceValidation({
  cards,
  effectResolver,
  game,
  players,
  state,
  turnActions,
}) {
  const { convincingArgument } = cards;
  const { p2, p4, p6 } = players;
  const revealAcquireCardCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-acquire-card-card",
    name: "Effect Spec Reveal Acquire Card",
    effects: [revealSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealAcquireCardCard], highCouncilSeat: false }),
    /Unsupported effect "acquire-card" for reveal/,
    "Acquire-card specs should stay out of Reveal effects",
  );
  const invalidAcquireCardSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-selector-card",
    name: "Effect Spec Invalid Acquire Card Selector",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "activated-ally",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for acquire-card/,
    "Acquire-card specs should reject activated Ally selectors",
  );
  const invalidAcquireCardDestinationCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-destination-card",
    name: "Effect Spec Invalid Acquire Card Destination",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "deck",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardDestinationCard, p2, p2),
    /Invalid acquire-card destination "deck"/,
    "Acquire-card specs should reject unsupported destinations",
  );
  const invalidAcquireCardUnconstrainedCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-unconstrained-card",
    name: "Effect Spec Invalid Acquire Card Unconstrained",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardUnconstrainedCard, p2, p2),
    /Invalid acquire-card constraint: expected maxCost or paymentResource/,
    "Acquire-card specs should reject unconstrained free acquisitions",
  );
  const invalidAcquireCardResourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-resource-card",
    name: "Effect Spec Invalid Acquire Card Resource",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      paymentResource: "melange",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardResourceCard, p2, p2),
    /Unsupported effect resource "melange"/,
    "Acquire-card specs should reject unsupported payment resources",
  );
  const invalidAcquireCardMaxCostCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-max-cost-card",
    name: "Effect Spec Invalid Acquire Card Max Cost",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardMaxCostCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Acquire-card specs should require non-negative cost bounds",
  );
  const invalidAcquireCardCostBoundsCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-cost-bounds-card",
    name: "Effect Spec Invalid Acquire Card Cost Bounds",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      minCost: 3,
      maxCost: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardCostBoundsCard, p2, p2),
    /Invalid acquire-card cost bounds "3-1"/,
    "Acquire-card specs should reject minCost greater than maxCost",
  );
  const invalidAcquireCardOptionalCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-optional-card",
    name: "Effect Spec Invalid Acquire Card Optional",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: 1,
      optional: "true",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardOptionalCard, p2, p2),
    /Invalid acquire-card optional "true"/,
    "Acquire-card specs should reject non-boolean optional values",
  );
  const invalidAcquireCardSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-card-source-card",
    name: "Effect Spec Invalid Acquire Card Source",
    effects: [agentSpec([{
      kind: "acquire-card",
      selector: "self",
      destination: "hand",
      maxCost: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAcquireCardSourceCard, p2, p2),
    /Invalid acquire-card source ""/,
    "Acquire-card specs should reject empty source labels",
  );
  const revealGainInfluenceChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-gain-influence-choice-card",
    name: "Effect Spec Reveal Gain Influence Choice",
    effects: [revealSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
    }])],
  };
  assert.throws(
    () => turnActions.revealTurnPlan({ ...p2, hand: [revealGainInfluenceChoiceCard], highCouncilSeat: false }),
    /Unsupported effect "gain-influence-choice" for reveal/,
    "Gain-Influence choice specs should stay in Agent play",
  );
  const invalidGainInfluenceChoiceSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-selector-card",
    name: "Effect Spec Invalid Gain Influence Choice Selector",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "activated-ally",
      amount: 1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceSelectorCard, p4, p2),
    /Unsupported effect selector "activated-ally" for gain-influence-choice/,
    "Gain-Influence choice specs should reject activated Ally selectors",
  );
  const invalidGainInfluenceChoiceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-amount-card",
    name: "Effect Spec Invalid Gain Influence Choice Amount",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: -1,
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceAmountCard, p2, p2),
    /Invalid effect amount "-1"/,
    "Gain-Influence choice specs should require non-negative amounts",
  );
  const invalidGainInfluenceChoiceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-source-card",
    name: "Effect Spec Invalid Gain Influence Choice Source",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
      source: "",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceSourceCard, p2, p2),
    /Invalid gain-influence-choice source ""/,
    "Gain-Influence choice specs should reject empty source labels",
  );
  const invalidGainInfluenceChoiceTrashSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-influence-choice-trash-source-card",
    name: "Effect Spec Invalid Gain Influence Choice Trash Source",
    effects: [agentSpec([{
      kind: "gain-influence-choice",
      selector: "self",
      amount: 1,
      trashSource: "true",
    }])],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainInfluenceChoiceTrashSourceCard, p2, p2),
    /Invalid gain-influence-choice trashSource "true"/,
    "Gain-Influence choice specs should reject non-boolean trashSource values",
  );
  assert.throws(
    () => effectResolver.resolveGainInfluenceChoices(
      [acquireSpec([{
        kind: "gain-influence-choice",
        selector: "self",
        amount: 1,
        trashSource: true,
      }])],
      { trigger: "acquire", source: p2, state: game },
    ),
    /Invalid acquire gain-influence-choice trashSource "true"/,
    "Acquire Influence choice specs should not trash the newly acquired source card",
  );
  const paidRewardChoiceBaseOption = {
    id: "troop",
    resource: "solari",
    cost: 1,
    reward: { kind: "recruit-troops", selector: "activated-ally", amount: 1, destination: "garrison" },
  };
  const paidRewardChoiceEffect = (overrides = {}) => ({
    kind: "paid-reward-choice",
    selector: "self",
    source: "Test Paid Reward",
    options: [paidRewardChoiceBaseOption],
    ...overrides,
  });
  const paidRewardChoiceCard = (id, effect) => ({
    ...convincingArgument,
    id,
    name: id,
    effects: [agentSpec([effect])],
  });
  const revealPaidRewardChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-paid-reward-choice-card",
    name: "Effect Spec Reveal Paid Reward Choice",
    effects: [revealSpec([paidRewardChoiceEffect()])],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({ ...p2, hand: [revealPaidRewardChoiceCard], highCouncilSeat: false }),
    {
      influenceGains: {},
      intriguesToDraw: 0,
      persuasion: 0,
      recruitedTroops: 0,
      revealGain: {},
      swords: 0,
    },
    "Reveal paid reward choice specs should not alter fixed reveal totals",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-selector-card",
        paidRewardChoiceEffect({ selector: "activated-ally" }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect selector "activated-ally" for paid-reward-choice/,
    "Paid reward choice specs should reject activated Ally top-level selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-source-card",
        paidRewardChoiceEffect({ source: "" }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice source ""/,
    "Paid reward choice specs should reject empty source labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-required-recipient-card",
        paidRewardChoiceEffect({ requiredRecipient: "self" }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice requiredRecipient "self"/,
    "Paid reward choice specs should reject unsupported required recipient values",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-require-payable-option-card",
        paidRewardChoiceEffect({ requirePayableOption: false }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice requirePayableOption "false"/,
    "Paid reward choice specs should reject non-true requirePayableOption values",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-empty-options-card",
        paidRewardChoiceEffect({ options: [] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice options ""/,
    "Paid reward choice specs should require at least one option",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-option-id-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, id: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice option id ""/,
    "Paid reward choice specs should reject empty option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-duplicate-option-card",
        paidRewardChoiceEffect({
          options: [
            paidRewardChoiceBaseOption,
            { ...paidRewardChoiceBaseOption },
          ],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice duplicate option id "troop"/,
    "Paid reward choice specs should reject duplicate option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, resource: "melange" }] }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Paid reward choice specs should reject unsupported payment resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-cost-card",
        paidRewardChoiceEffect({ options: [{ ...paidRewardChoiceBaseOption, cost: 0 }] }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice cost "0"/,
    "Paid reward choice specs should require positive costs",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-reward-selector-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, selector: "opponent" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported paid-reward-choice selector "opponent"/,
    "Paid reward choice specs should reject unsupported nested reward selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-troop-amount-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice troops "0"/,
    "Paid reward choice troop branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-troop-destination-card",
        paidRewardChoiceEffect({
          options: [{
            ...paidRewardChoiceBaseOption,
            reward: { ...paidRewardChoiceBaseOption.reward, destination: "conflict" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice troop destination "conflict"/,
    "Paid reward choice troop branches should only recruit to garrison",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-influence-faction-card",
        paidRewardChoiceEffect({
          options: [{
            id: "influence",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-influence", selector: "self", faction: "guild", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect faction "guild"/,
    "Paid reward choice Influence branches should reject unsupported faction ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-influence-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "influence",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-influence", selector: "self", faction: "emperor", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice influence "0"/,
    "Paid reward choice Influence branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-reward-card",
        paidRewardChoiceEffect({
          options: [{
            id: "water",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-resource", selector: "self", resource: "melange", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Paid reward choice resource branches should reject unsupported reward resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-resource-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "water",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-resource", selector: "self", resource: "water", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice resource "0"/,
    "Paid reward choice resource branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-empty-bundle-card",
        paidRewardChoiceEffect({
          options: [{
            id: "bundle",
            resource: "spice",
            cost: 1,
            reward: { kind: "bundle", rewards: [] },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice bundle rewards ""/,
    "Paid reward choice bundled branches should require at least one nested reward",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-nested-bundle-card",
        paidRewardChoiceEffect({
          options: [{
            id: "bundle",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "bundle",
              rewards: [{
                kind: "bundle",
                rewards: [{ kind: "draw-intrigues", selector: "self", amount: 1 }],
              }],
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice nested bundle "bundle"/,
    "Paid reward choice bundled branches should reject nested bundles",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-intrigue-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "intrigue",
            resource: "spice",
            cost: 1,
            reward: { kind: "draw-intrigues", selector: "self", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice intrigues "0"/,
    "Paid reward choice Intrigue branches should require positive reward amounts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: { kind: "gain-leader-counter", selector: "self", counter: "otherMemories", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter "otherMemories"/,
    "Paid reward choice leader-counter branches should reject unsupported counters",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-cost-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 1,
              troopSupplyCost: 0,
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter troopSupplyCost "0"/,
    "Paid reward choice leader-counter branches should require positive troop-supply costs",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-leader-counter-cost-mismatch-card",
        paidRewardChoiceEffect({
          options: [{
            id: "memory",
            resource: "spice",
            cost: 1,
            reward: {
              kind: "gain-leader-counter",
              selector: "self",
              counter: "jessicaMemories",
              amount: 2,
              troopSupplyCost: 1,
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice leader counter troopSupplyCost "1"/,
    "Paid reward choice leader-counter branches should require troop costs to match memory counts",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-vp-amount-card",
        paidRewardChoiceEffect({
          options: [{
            id: "vp",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-vp", selector: "self", amount: 0 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid paid-reward-choice VP "0"/,
    "Paid reward choice VP branches should require positive rewards",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      paidRewardChoiceCard(
        "effect-spec-invalid-paid-reward-choice-reward-kind-card",
        paidRewardChoiceEffect({
          options: [{
            id: "persuasion",
            resource: "solari",
            cost: 3,
            reward: { kind: "gain-persuasion", selector: "self", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported paid-reward-choice reward "gain-persuasion"/,
    "Paid reward choice specs should reject unsupported reward kinds",
  );
  const pendingActionChoiceAcquireOption = {
    id: "acquire",
    label: "Acquire cost-1 card to hand",
    effect: {
      kind: "acquire-card",
      selector: "self",
      minCost: 1,
      maxCost: 1,
      destination: "hand",
    },
  };
  const pendingActionChoiceEffect = (overrides = {}) => ({
    kind: "pending-action-choice",
    selector: "self",
    source: "Test Pending Choice",
    options: [pendingActionChoiceAcquireOption],
    ...overrides,
  });
  const pendingActionChoiceCard = (id, effect) => ({
    ...convincingArgument,
    id,
    name: id,
    effects: [agentSpec([effect])],
  });
  const revealPendingActionChoiceCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-pending-action-choice-card",
    name: "Effect Spec Reveal Pending Action Choice",
    effects: [revealSpec([pendingActionChoiceEffect()])],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({ ...p2, hand: [revealPendingActionChoiceCard], highCouncilSeat: false }),
    {
      influenceGains: {},
      intriguesToDraw: 0,
      persuasion: 0,
      recruitedTroops: 0,
      revealGain: {},
      swords: 0,
    },
    "Reveal pending action choice specs should not alter fixed reveal totals",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-selector-card",
        pendingActionChoiceEffect({ selector: "activated-ally" }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect selector "activated-ally" for pending-action-choice/,
    "Pending action choice specs should reject activated Ally top-level selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-source-card",
        pendingActionChoiceEffect({ source: "" }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice source ""/,
    "Pending action choice specs should reject empty source labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-empty-options-card",
        pendingActionChoiceEffect({ options: [] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice options ""/,
    "Pending action choice specs should require at least one option",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-option-id-card",
        pendingActionChoiceEffect({ options: [{ ...pendingActionChoiceAcquireOption, id: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice option id ""/,
    "Pending action choice specs should reject empty option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-duplicate-option-card",
        pendingActionChoiceEffect({
          options: [
            pendingActionChoiceAcquireOption,
            { ...pendingActionChoiceAcquireOption },
          ],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice duplicate option id "acquire"/,
    "Pending action choice specs should reject duplicate option ids",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-option-label-card",
        pendingActionChoiceEffect({ options: [{ ...pendingActionChoiceAcquireOption, label: "" }] }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice option label ""/,
    "Pending action choice specs should reject empty option labels",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-nested-selector-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, selector: "opponent" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice selector "opponent"/,
    "Pending action choice specs should reject unsupported nested selectors",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-destination-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, destination: "trash" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire destination "trash"/,
    "Pending action choice acquire branches should reject unsupported destinations",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-resource-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, paymentResource: "melange" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported effect resource "melange"/,
    "Pending action choice acquire branches should reject unsupported payment resources",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-cost-bounds-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: { ...pendingActionChoiceAcquireOption.effect, minCost: 3, maxCost: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire cost bounds "3-1"/,
    "Pending action choice acquire branches should reject minCost greater than maxCost",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-acquire-unconstrained-card",
        pendingActionChoiceEffect({
          options: [{
            ...pendingActionChoiceAcquireOption,
            effect: {
              kind: "acquire-card",
              selector: "self",
              minCost: 1,
              destination: "hand",
            },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice acquire constraint: expected maxCost or paymentResource/,
    "Pending action choice acquire branches should reject unconstrained acquisitions",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-zone-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash deck card",
            effect: { kind: "trash-card", selector: "self", optional: false, zones: ["deck"] },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported trash-card zone "deck"/,
    "Pending action choice trash branches should reject unsupported zones",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-required-trait-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash trait card",
            effect: { kind: "trash-card", selector: "self", optional: false, requiredTrait: "" },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Invalid pending-action-choice trash requiredTrait ""/,
    "Pending action choice trash branches should reject empty required traits",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-trash-vp-reward-card",
        pendingActionChoiceEffect({
          options: [{
            id: "trash",
            label: "Trash card for VP",
            effect: { kind: "trash-card", selector: "self", optional: false, zones: ["hand"], vpReward: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice trash vpReward/,
    "Pending action choice trash branches should reject VP rewards until that nested pending path carries them explicitly",
  );
  assert.throws(
    () => state.applyCardAgentEffect(
      pendingActionChoiceCard(
        "effect-spec-invalid-pending-action-choice-nested-kind-card",
        pendingActionChoiceEffect({
          options: [{
            id: "vp",
            label: "Gain VP",
            effect: { kind: "gain-vp", selector: "self", amount: 1 },
          }],
        }),
      ),
      p4,
      p6,
    ),
    /Unsupported pending-action-choice effect "gain-vp"/,
    "Pending action choice specs should reject unsupported nested effect kinds",
  );
}
