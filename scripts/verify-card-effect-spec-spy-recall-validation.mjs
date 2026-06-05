import assert from "node:assert/strict";
import {
  agentSpec,
  combatSpec,
  plotSpec,
  revealSpec,
} from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecSpyRecallValidation({
  boardSpaces,
  cards,
  effectResolver,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { highCouncil, secrets } = boardSpaces;
  const { backedByChoam, convincingArgument } = cards;
  const { p2, p4, p6 } = players;
  const beneSpySpace = state.spyObservationPostChoiceSpaces().find((space) => space.id === "espionage");
  assert.ok(beneSpySpace, "Espionage should be the Bene spy-post representative");
  const highCouncilPostId = state.spyObservationPostIdForSpace(highCouncil.id);
  const benePostId = state.spyObservationPostIdForSpace(secrets.id);
  const invalidSpyPlacementAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-amount-card",
    name: "Effect Spec Invalid Spy Placement Amount",
    effects: [
      {
        trigger: "agent-play",
        effects: [{ kind: "place-spies", selector: "self", amount: -1 }],
      },
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidSpyPlacementAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "-1"/,
    "Spy placement effect amounts should require a non-negative integer amount",
  );
  const agentManipulateRowCard = {
    ...convincingArgument,
    id: "effect-spec-agent-manipulate-row-card",
    name: "Effect Spec Agent Manipulate Row",
    effects: [
      agentSpec([
        { kind: "manipulate-row-card", selector: "self", source: "Test" },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveManipulateRowCards(agentManipulateRowCard.effects, {
        trigger: "agent-play",
        source: p2,
        state: game,
      }),
    /Unsupported effect "manipulate-row-card" for agent-play/,
    "Manipulate-row-card specs should fail outside Plot Intrigues",
  );
  const invalidManipulateRowSelectorCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-manipulate-row-selector-card",
    name: "Effect Spec Invalid Manipulate Row Selector",
    effects: [
      plotSpec([
        {
          kind: "manipulate-row-card",
          selector: "activated-ally",
          source: "Test",
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      effectResolver.resolveManipulateRowCards(
        invalidManipulateRowSelectorCard.effects,
        {
          trigger: "plot-intrigue",
          source: p2,
          target: p4,
          state: game,
        },
      ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Manipulate-row-card specs should currently target only the source player",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [agentSpec([{ kind: "recall-spy", selector: "self", source: "Test" }])],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "recall-spy" for agent-play/,
    "Recall-spy specs should stay on supported Plot, Combat, or Reveal triggers",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            { kind: "recall-spy", selector: "activated-ally", source: "Test" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, target: p4, state: game },
      ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Recall-spy specs should currently target only the source player",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "recall-spy",
              selector: "self",
              reward: { resource: "intrigue", amount: 1 },
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect resource "intrigue"/,
    "Recall-spy specs should reject unsupported reward resources",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            { kind: "recall-spy", selector: "self", removeShieldWall: "yes" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid recall-spy removeShieldWall "yes"/,
    "Recall-spy specs should reject non-boolean Shield Wall flags",
  );
  assert.deepEqual(
    effectResolver.resolveRevealSpyRecallForIntrigues(
      [
        revealSpec(
          [
            {
              kind: "recall-spy",
              selector: "self",
              amount: 1,
              drawIntrigues: 1,
              optional: true,
              source: "Test",
            },
          ],
          [{ kind: "has-spy-posts", count: 2 }],
        ),
      ],
      {
        trigger: "reveal",
        source: p2,
        state: {
          ...game,
          spyPosts: { [benePostId]: p2.id, [highCouncilPostId]: p2.id },
          sharedSpyPosts: {},
        },
      },
    ),
    [
      {
        selector: "self",
        amount: 1,
        drawIntrigues: 1,
        persuasionReward: 0,
        optional: true,
        source: "Test",
      },
    ],
    "Reveal recall-spy specs should resolve Intrigue rewards with enough owned spy posts",
  );
  assert.throws(
    () =>
      effectResolver.resolveRevealSpyRecallForIntrigues(
        [
          revealSpec([
            {
              kind: "recall-spy",
              selector: "self",
              drawIntrigues: 1,
              source: "Test",
            },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Invalid recall-spy amount "undefined"/,
    "Reveal recall-spy specs should require a spy count",
  );
  assert.throws(
    () =>
      effectResolver.resolveRevealSpyRecallForIntrigues(
        [
          revealSpec([
            { kind: "recall-spy", selector: "self", amount: 1, source: "Test" },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Invalid recall-spy reveal reward/,
    "Reveal recall-spy specs should require exactly one reveal reward",
  );
  assert.deepEqual(
    effectResolver.resolveRevealSpyRecallForStrengths(
      [
        revealSpec(
          [
            {
              kind: "recall-spy",
              selector: "self",
              amount: 1,
              strengthReward: 2,
              optional: true,
              source: "Test",
            },
          ],
          [{ kind: "has-spy-posts", count: 1 }],
        ),
      ],
      {
        trigger: "reveal",
        source: p2,
        state: {
          ...game,
          spyPosts: { [benePostId]: p2.id },
          sharedSpyPosts: {},
        },
      },
    ),
    [
      {
        selector: "self",
        amount: 1,
        strength: 2,
        optional: true,
        source: "Test",
      },
    ],
    "Reveal recall-spy specs should resolve strength rewards with enough owned spy posts",
  );
  assert.deepEqual(
    effectResolver.resolveRevealSpyRecallForIntrigues(
      [
        revealSpec([
          {
            kind: "recall-spy",
            selector: "self",
            amount: 1,
            strengthReward: 2,
            source: "Test",
          },
        ]),
      ],
      { trigger: "reveal", source: p2, state: game },
    ),
    [],
    "Reveal Intrigue spy-recall resolver should ignore strength-reward recall specs",
  );
  assert.throws(
    () =>
      effectResolver.resolveRevealSpyRecallForIntrigues(
        [
          revealSpec([
            {
              kind: "recall-spy",
              selector: "self",
              amount: 1,
              drawIntrigues: 0,
              source: "Test",
            },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Invalid recall-spy drawIntrigues "0"/,
    "Reveal recall-spy specs should reject zero Intrigue rewards",
  );
  assert.throws(
    () =>
      effectResolver.resolveRevealSpyRecallForIntrigues(
        [
          revealSpec([
            {
              kind: "recall-spy",
              selector: "self",
              amount: 1,
              drawIntrigues: 1,
              strengthReward: 1,
              source: "Test",
            },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Invalid recall-spy reveal reward/,
    "Reveal recall-spy specs should reject multiple simultaneous reveal rewards",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatSpyRecallForStrengths(
        [
          {
            trigger: "combat-intrigue",
            effects: [
              {
                kind: "recall-spy",
                selector: "self",
                strengthReward: 3,
                source: "Test",
              },
            ],
          },
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid recall-spy amount "undefined"/,
    "Combat recall-spy specs should require a spy count",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatSpyRecallForStrengths(
        [
          {
            trigger: "combat-intrigue",
            effects: [
              {
                kind: "recall-spy",
                selector: "self",
                amount: 1,
                source: "Test",
              },
            ],
          },
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid recall-spy strengthReward "undefined"/,
    "Combat recall-spy specs should require a strength reward",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatSpyRecallForStrengths(
        [
          {
            trigger: "combat-intrigue",
            effects: [
              {
                kind: "recall-spy",
                selector: "self",
                amount: 0,
                strengthReward: 3,
                source: "Test",
              },
            ],
          },
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid recall-spy amount "0"/,
    "Combat recall-spy specs should reject zero spy counts",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatSpyRecallForStrengths(
        [
          {
            trigger: "combat-intrigue",
            effects: [
              {
                kind: "recall-spy",
                selector: "self",
                amount: 1,
                strengthReward: 0,
                source: "Test",
              },
            ],
          },
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid recall-spy strengthReward "0"/,
    "Combat recall-spy specs should reject zero strength rewards",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatSpyRecallForStrengths(
        [
          {
            trigger: "combat-intrigue",
            effects: [
              {
                kind: "recall-spy",
                selector: "self",
                amount: 1,
                strengthReward: 3,
                reward: { resource: "spice", amount: 1 },
                source: "Test",
              },
            ],
          },
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Unsupported recall-spy reward for combat-intrigue/,
    "Combat recall-spy specs should reject Plot-style resource rewards",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            { kind: "recall-spy", selector: "self", amount: 1, source: "Test" },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported recall-spy amount for plot-intrigue/,
    "Plot recall-spy specs should reject Combat-style spy counts",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          plotSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 4,
              owner: "combat-recipient",
              optional: true,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect "lose-influence-for-strength" for plot-intrigue/,
    "Influence-loss-for-strength specs should stay on Combat Intrigue triggers",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "activated-ally",
              amount: 1,
              strengthReward: 4,
              owner: "combat-recipient",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p4, target: p6, state: game },
      ),
    /Unsupported effect selector "activated-ally" for combat-intrigue/,
    "Combat Influence-loss strength specs should target the selected recipient through self routing",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 2,
              strengthReward: 4,
              owner: "combat-recipient",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid lose-influence-for-strength amount "2"/,
    "Combat Influence-loss strength specs should reject unsupported Influence-loss amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 0,
              owner: "combat-recipient",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid lose-influence-for-strength strengthReward "0"/,
    "Combat Influence-loss strength specs should reject zero strength rewards",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 4,
              owner: "self",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid lose-influence-for-strength owner "self"/,
    "Combat Influence-loss strength specs should reject unsupported owner routing",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 4,
              owner: "combat-recipient",
              alternateOwner: "activated-ally",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p4, target: p6, state: game },
      ),
    /Invalid lose-influence-for-strength alternateOwner "activated-ally"/,
    "Combat Influence-loss strength specs should reject unsupported alternate owner routing",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 4,
              owner: "combat-recipient",
              optional: false,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid lose-influence-for-strength optional "false"/,
    "Combat Influence-loss strength specs should stay optional so players can decline the branch",
  );
  assert.throws(
    () =>
      effectResolver.resolveCombatInfluenceLossForStrengths(
        [
          combatSpec([
            {
              kind: "lose-influence-for-strength",
              selector: "self",
              amount: 1,
              strengthReward: 4,
              owner: "combat-recipient",
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid lose-influence-for-strength optional "undefined"/,
    "Combat Influence-loss strength specs should require explicit optional true",
  );
  const invalidSpyPlacementSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-source-card",
    name: "Effect Spec Invalid Spy Placement Source",
    effects: [
      agentSpec([
        { kind: "place-spies", selector: "self", amount: 1, source: "" },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidSpyPlacementSourceCard, p2, p2),
    /Invalid place-spies source ""/,
    "Spy placement specs should reject empty source labels",
  );
  const invalidSpyPlacementPostActionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-placement-post-action-card",
    name: "Effect Spec Invalid Spy Placement Post Action",
    effects: [
      agentSpec([
        {
          kind: "place-spies",
          selector: "self",
          amount: 1,
          postPlacementAction: "draw-card",
        },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidSpyPlacementPostActionCard, p2, p2),
    /Invalid place-spies postPlacementAction "draw-card"/,
    "Spy placement specs should reject unsupported post-placement actions",
  );
  const revealSpyPlacementCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-spy-placement-card",
    name: "Effect Spec Reveal Spy Placement",
    effects: [
      revealSpec([{ kind: "place-spies", selector: "self", amount: 1 }]),
    ],
  };
  assert.deepEqual(
    turnActions.revealTurnPlan({
      ...p2,
      hand: [revealSpyPlacementCard],
      highCouncilSeat: false,
    }),
    {
      influenceGains: {},
      intriguesToDraw: 0,
      persuasion: 0,
      recruitedTroops: 0,
      revealGain: {},
      swords: 0,
    },
    "Reveal spy placement specs should not alter fixed reveal totals",
  );
  const revealSpyRecallCard = {
    ...convincingArgument,
    id: "effect-spec-reveal-spy-recall-card",
    name: "Effect Spec Reveal Spy Recall",
    effects: [
      revealSpec(
        [
          {
            kind: "recall-spy",
            selector: "self",
            amount: 1,
            drawIntrigues: 1,
            source: "Reveal Spy Recall",
          },
        ],
        [{ kind: "has-spy-posts", count: 2 }],
      ),
    ],
  };
  const revealSpyRecallFixture = {
    ...withActivePlayer(game, p2.id, () => ({
      agentsReady: 0,
      hand: [revealSpyRecallCard],
      highCouncilSeat: false,
      intrigues: [],
      playArea: [],
      persuasion: 0,
      spies: 0,
    })),
    intrigueDeck: [backedByChoam],
    intrigueDiscard: [],
    sharedSpyPosts: {},
    spyPosts: { [benePostId]: p2.id, [highCouncilPostId]: p2.id },
  };
  const revealSpyRecallPlan = turnActions.revealTurnPlan(
    playerById(revealSpyRecallFixture, p2.id),
    revealSpyRecallFixture,
  );
  assert.deepEqual(
    revealSpyRecallPlan,
    {
      influenceGains: {},
      intriguesToDraw: 0,
      persuasion: 0,
      recruitedTroops: 0,
      revealGain: {},
      swords: 0,
    },
    "Reveal spy-recall specs should not alter fixed reveal totals",
  );
  const revealSpyRecallPending = turnActions.revealTurnAction(
    revealSpyRecallFixture,
    {
      commanderTargets: {},
      revealPlan: revealSpyRecallPlan,
    },
  );
  assert.equal(
    revealSpyRecallPending.pendingAction?.kind,
    "recall-spy",
    "Reveal spy-recall specs should queue a recall pending action",
  );
  assert.equal(revealSpyRecallPending.pendingAction.drawIntrigues, 1);
  assert.equal(
    revealSpyRecallPending.pendingAction.source,
    "Reveal Spy Recall",
  );
  const revealSpyRecallResolved = state.recallSpyForPending(
    revealSpyRecallPending,
    revealSpyRecallPending.pendingAction,
    beneSpySpace.id,
  );
  assert.equal(
    revealSpyRecallResolved.pendingAction,
    undefined,
    "Reveal spy-recall resolution should clear pending",
  );
  assert.equal(playerById(revealSpyRecallResolved, p2.id).spies, 1);
  assert.equal(
    playerById(revealSpyRecallResolved, p2.id).intrigues.at(-1)?.name,
    backedByChoam.name,
  );
  assert.equal(revealSpyRecallResolved.turnSpyRecalls[p2.id], 1);
}
