import assert from "node:assert/strict";
import {
  acquireSpec,
  agentSpec,
  combatSpec,
  plotSpec,
  revealSpec,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecResourceContractValidation({
  cards,
  effectResolver,
  game,
  players,
  state,
}) {
  const { convincingArgument } = cards;
  const { p2 } = players;
  const invalidGainResourceSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-gain-resource-source-card",
    name: "Effect Spec Invalid Gain Resource Source",
    effects: [
      agentSpec([
        {
          kind: "gain-resource",
          selector: "self",
          resource: "spice",
          amount: 1,
          source: "",
        },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidGainResourceSourceCard, p2, p2),
    /Invalid gain-resource source ""/,
    "Resource gain specs should reject empty source labels",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            {
              kind: "spend-resource",
              selector: "self",
              resource: "spice",
              amount: 1,
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "spend-resource" for agent-play/,
    "Spend-resource specs should stay on Plot Intrigue until other trigger resolvers support them",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "spend-resource",
              selector: "self",
              resource: "melange",
              amount: 1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect resource "melange"/,
    "Spend-resource specs should reject unsupported resources",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "spend-resource",
              selector: "self",
              resource: "spice",
              amount: -1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid effect amount "-1"/,
    "Spend-resource specs should validate effect amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "spend-resource",
              selector: "self",
              resource: "spice",
              amount: 1,
              source: "",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid spend-resource source ""/,
    "Spend-resource specs should reject empty source labels",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "lose-influence",
              selector: "self",
              faction: "guild",
              amount: 1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect faction "guild"/,
    "Lose-influence specs should reject unsupported faction ids",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "lose-influence",
              selector: "self",
              faction: "bene",
              amount: -1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid effect amount "-1"/,
    "Lose-influence specs should validate effect amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            {
              kind: "gain-influence",
              selector: "self",
              faction: "bene",
              amount: 1,
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Unsupported effect "gain-influence" for agent-play/,
    "Gain-influence specs should stay on Plot Intrigue until other trigger resolvers support them",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "gain-influence",
              selector: "self",
              faction: "guild",
              amount: 1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect faction "guild"/,
    "Gain-influence specs should reject unsupported faction ids",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          plotSpec([
            {
              kind: "gain-influence",
              selector: "self",
              faction: "bene",
              amount: -1,
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid effect amount "-1"/,
    "Gain-influence specs should validate effect amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          revealSpec([
            { kind: "gain-board-space-influence", selector: "self", amount: 1 },
          ]),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Unsupported effect "gain-board-space-influence" for reveal/,
    "Board-space Influence specs should stay on Agent play",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            { kind: "gain-board-space-influence", selector: "self", amount: 0 },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Invalid gain-board-space-influence amount "0"/,
    "Board-space Influence specs should validate positive effect amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            {
              kind: "gain-board-space-influence",
              selector: "activated-ally",
              amount: 1,
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, target: p2, state: game },
      ),
    /Unsupported effect selector "activated-ally" for gain-board-space-influence/,
    "Board-space Influence specs should stay self-scoped",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          agentSpec([
            {
              kind: "gain-board-space-influence",
              selector: "self",
              amount: 1,
              trashSource: "yes",
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Invalid gain-board-space-influence trashSource "yes"/,
    "Board-space Influence specs should reject malformed trashSource flags",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          {
            trigger: "plot-intrigue",
            choiceId: "",
            effects: [{ kind: "draw-cards", selector: "self", amount: 1 }],
          },
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid choiceId ""/,
    "Choice specs should reject empty choice ids",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(
      [
        agentSpec([
          {
            kind: "take-contracts",
            selector: "self",
            amount: 1,
            sourcePool: "public-offer",
          },
        ]),
      ],
      { trigger: "agent-play", source: p2, state: game },
    ),
    [
      {
        selector: "self",
        amount: 1,
        sourcePool: "public-offer",
        optional: false,
        source: undefined,
      },
    ],
    "Take-contract specs should support Agent public-offer contract pendings",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          plotSpec([
            {
              kind: "take-contracts",
              selector: "activated-ally",
              amount: 1,
              sourcePool: "public-offer",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Unsupported effect selector "activated-ally" for plot-intrigue/,
    "Take-contract specs should reject activated Ally selectors",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          plotSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 1,
              sourcePool: "reserved",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid take-contracts sourcePool "reserved"/,
    "Take-contract specs should reject unsupported contract source pools",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          plotSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 0,
              sourcePool: "public-offer",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid take-contracts amount "0"/,
    "Take-contract specs should reject zero contract amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          plotSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 2,
              sourcePool: "public-offer",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid take-contracts amount "2"/,
    "Take-contract specs should reject unsupported multi-contract amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          plotSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: { kind: "completed-contracts" },
              sourcePool: "public-offer",
            },
          ]),
        ],
        { trigger: "plot-intrigue", source: p2, state: game },
      ),
    /Invalid take-contracts amount "\[object Object\]"/,
    "Take-contract specs should reject dynamic contract amounts",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          combatSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 1,
              sourcePool: "public-offer",
              optional: true,
            },
          ]),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid combat take-contracts optional "true"/,
    "Combat take-contract specs should remain mandatory until an optional Combat contract UI exists",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          agentSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 1,
              sourcePool: "public-offer",
              optional: true,
            },
          ]),
        ],
        { trigger: "agent-play", source: p2, state: game },
      ),
    /Invalid agent take-contracts optional "true"/,
    "Agent take-contract specs should remain mandatory until an optional Agent contract UI exists",
  );
  assert.throws(
    () =>
      effectResolver.resolveTakeContracts(
        [
          acquireSpec([
            {
              kind: "take-contracts",
              selector: "self",
              amount: 1,
              sourcePool: "public-offer",
              optional: true,
            },
          ]),
        ],
        { trigger: "acquire", source: p2, state: game },
      ),
    /Invalid acquire take-contracts optional "true"/,
    "Acquire take-contract specs should remain mandatory",
  );
  const invalidDrawCardsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-draw-cards-source-card",
    name: "Effect Spec Invalid Draw Cards Source",
    effects: [
      agentSpec([
        { kind: "draw-cards", selector: "self", amount: 1, source: "" },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidDrawCardsSourceCard, p2, p2),
    /Invalid draw-cards source ""/,
    "Draw-card specs should reject empty source labels",
  );
  const invalidRecruitTroopsSourceCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-recruit-troops-source-card",
    name: "Effect Spec Invalid Recruit Troops Source",
    effects: [
      agentSpec([
        { kind: "recruit-troops", selector: "self", amount: 1, source: "" },
      ]),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRecruitTroopsSourceCard, p2, p2),
    /Invalid recruit-troops source ""/,
    "Recruit specs should reject empty source labels",
  );
}
