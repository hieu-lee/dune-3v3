import assert from "node:assert/strict";
import {
  agentSpec,
  combatSpec,
  revealSpec,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecAcquireConditionValidation({
  cards,
  effectResolver,
  game,
  players,
  state,
  turnActions,
  withActivePlayer,
}) {
  const { convincingArgument } = cards;
  const { p2 } = players;
  const invalidAcquirePersuasionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-persuasion-card",
    name: "Effect Spec Invalid Acquire Persuasion",
    cost: 0,
    effects: [
      {
        trigger: "acquire",
        effects: [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
      },
    ],
  };
  const invalidAcquireFixtureBase = withActivePlayer(game, p2.id, () => ({
    revealed: true,
  }));
  const invalidAcquireFixture = {
    ...invalidAcquireFixtureBase,
    imperiumRow: [invalidAcquirePersuasionCard],
    marketDeck: [],
  };
  assert.throws(
    () =>
      state.acquireMarketCard(
        invalidAcquireFixture,
        p2.id,
        invalidAcquirePersuasionCard.id,
      ),
    /Unsupported effect "gain-persuasion" for acquire/,
    "Acquire specs should reject non-acquire reward effect kinds",
  );
  const invalidAcquireSpyPlacementCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-card",
    name: "Effect Spec Invalid Acquire Spy Placement",
    cost: 0,
    effects: [
      {
        trigger: "acquire",
        effects: [{ kind: "place-spies", selector: "self", amount: -1 }],
      },
    ],
  };
  const invalidAcquireSpyPlacementFixture = {
    ...invalidAcquireFixtureBase,
    imperiumRow: [invalidAcquireSpyPlacementCard],
    marketDeck: [],
  };
  assert.throws(
    () =>
      state.acquireMarketCard(
        invalidAcquireSpyPlacementFixture,
        p2.id,
        invalidAcquireSpyPlacementCard.id,
      ),
    /Invalid effect amount "-1"/,
    "Acquire spy-placement specs should validate effect amounts",
  );
  const invalidAcquireSpyPlacementIconCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-icon-card",
    name: "Effect Spec Invalid Acquire Spy Placement Icon",
    cost: 0,
    effects: [
      {
        trigger: "acquire",
        effects: [
          {
            kind: "place-spies",
            selector: "self",
            amount: 1,
            placementIcon: "worm",
          },
        ],
      },
    ],
  };
  assert.throws(
    () =>
      state.acquireMarketCard(
        {
          ...invalidAcquireFixtureBase,
          imperiumRow: [invalidAcquireSpyPlacementIconCard],
          marketDeck: [],
        },
        p2.id,
        invalidAcquireSpyPlacementIconCard.id,
      ),
    /Unsupported effect icon "worm"/,
    "Acquire spy-placement specs should reject unsupported placement icons",
  );
  const invalidAcquireSpyPlacementFlagCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-spy-placement-flag-card",
    name: "Effect Spec Invalid Acquire Spy Placement Flag",
    cost: 0,
    effects: [
      {
        trigger: "acquire",
        effects: [
          {
            kind: "place-spies",
            selector: "self",
            amount: 1,
            recallForSupply: "yes",
          },
        ],
      },
    ],
  };
  assert.throws(
    () =>
      state.acquireMarketCard(
        {
          ...invalidAcquireFixtureBase,
          imperiumRow: [invalidAcquireSpyPlacementFlagCard],
          marketDeck: [],
        },
        p2.id,
        invalidAcquireSpyPlacementFlagCard.id,
      ),
    /Invalid place-spies recallForSupply "yes"/,
    "Acquire spy-placement specs should reject non-boolean recallForSupply flags",
  );
  const invalidAcquireDrawIntriguesCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-acquire-draw-intrigues-card",
    name: "Effect Spec Invalid Acquire Draw Intrigues",
    cost: 0,
    effects: [
      {
        trigger: "acquire",
        effects: [{ kind: "draw-intrigues", selector: "self", amount: -1 }],
      },
    ],
  };
  assert.throws(
    () =>
      state.acquireMarketCard(
        {
          ...invalidAcquireFixtureBase,
          imperiumRow: [invalidAcquireDrawIntriguesCard],
          marketDeck: [],
        },
        p2.id,
        invalidAcquireDrawIntriguesCard.id,
      ),
    /Invalid effect amount "-1"/,
    "Acquire draw-Intrigue specs should validate effect amounts",
  );
  const fractionalAmountCard = {
    ...convincingArgument,
    id: "effect-spec-fractional-amount-card",
    name: "Effect Spec Fractional Amount",
    effects: [
      revealSpec([{ kind: "gain-persuasion", selector: "self", amount: 1.5 }]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [fractionalAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid effect amount "1.5"/,
    "Gain effect amounts should not accept fractional values",
  );
  const invalidMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-multiplier-card",
    name: "Effect Spec Invalid Multiplier",
    effects: [
      revealSpec([
        {
          kind: "gain-persuasion",
          selector: "self",
          amount: {
            kind: "completed-contracts",
            multiplier: Number.NaN,
          },
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidMultiplierCard],
        highCouncilSeat: false,
      }),
    /Invalid completed-contracts multiplier "NaN"/,
    "Completed-contract multipliers should be finite when present",
  );
  const negativeMultiplierCard = {
    ...convincingArgument,
    id: "effect-spec-negative-multiplier-card",
    name: "Effect Spec Negative Multiplier",
    effects: [
      revealSpec([
        {
          kind: "gain-persuasion",
          selector: "self",
          amount: {
            kind: "completed-contracts",
            multiplier: -1,
          },
        },
      ]),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [negativeMultiplierCard],
        highCouncilSeat: false,
      }),
    /Invalid completed-contracts multiplier "-1"/,
    "Completed-contract multipliers should be non-negative integers when present",
  );
  const unsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-unsupported-condition-card",
    name: "Effect Spec Unsupported Condition",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-troops" }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [unsupportedConditionCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect condition "has-troops"/,
    "Unsupported effect conditions should fail loudly instead of silently becoming false",
  );
  const skippedUnsupportedConditionCard = {
    ...convincingArgument,
    id: "effect-spec-skipped-unsupported-condition-card",
    name: "Effect Spec Skipped Unsupported Condition",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "visited-maker-space" }, { kind: "has-troops" }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [skippedUnsupportedConditionCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect condition "has-troops"/,
    "Unsupported effect conditions should fail before applicability short-circuiting can hide them",
  );
  const invalidSpyCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-spy-count-card",
    name: "Effect Spec Invalid Spy Count",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-spy-posts" }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidSpyCountCard],
        highCouncilSeat: false,
      }),
    /Invalid has-spy-posts count "undefined"/,
    "Spy-count conditions should fail loudly when count is missing",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          combatSpec(
            [{ kind: "gain-strength", selector: "self", amount: 1 }],
            [{ kind: "has-combat-recipient-sandworms" }],
          ),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid has-combat-recipient-sandworms count "undefined"/,
    "Combat recipient sandworm conditions should fail loudly when count is missing",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          revealSpec(
            [{ kind: "gain-strength", selector: "self", amount: 1 }],
            [{ kind: "has-combat-recipient" }],
          ),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Unsupported effect condition "has-combat-recipient" for reveal/,
    "Combat recipient conditions should be rejected outside Combat Intrigue specs",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          revealSpec(
            [{ kind: "gain-strength", selector: "self", amount: 1 }],
            [{ kind: "has-combat-recipient-sandworms", count: 1 }],
          ),
        ],
        { trigger: "reveal", source: p2, state: game },
      ),
    /Unsupported effect condition "has-combat-recipient-sandworms" for reveal/,
    "Combat recipient sandworm conditions should be rejected outside Combat Intrigue specs",
  );
  assert.throws(
    () =>
      effectResolver.resolveGameEffects(
        [
          combatSpec(
            [{ kind: "gain-strength", selector: "self", amount: 1 }],
            [{ kind: "has-combat-recipient-sandworms", count: 0 }],
          ),
        ],
        { trigger: "combat-intrigue", source: p2, state: game },
      ),
    /Invalid has-combat-recipient-sandworms count "0"/,
    "Combat recipient sandworm conditions should require a positive threshold",
  );
  const invalidDeployedUnitsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-deployed-units-count-card",
    name: "Effect Spec Invalid Deployed Units Count",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "deployed-units-this-turn", count: -1 }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidDeployedUnitsCountCard],
        highCouncilSeat: false,
      }),
    /Invalid deployed-units-this-turn count "-1"/,
    "Deployed-unit conditions should require a non-negative integer threshold",
  );
  const invalidInfluenceFactionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-faction-card",
    name: "Effect Spec Invalid Influence Faction",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-influence", faction: "guild", amount: 1 }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidInfluenceFactionCard],
        highCouncilSeat: false,
      }),
    /Unsupported effect faction "guild"/,
    "Influence conditions should reject unsupported faction ids",
  );
  const invalidInfluenceAmountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-influence-amount-card",
    name: "Effect Spec Invalid Influence Amount",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-influence", faction: "bene", amount: -1 }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidInfluenceAmountCard],
        highCouncilSeat: false,
      }),
    /Invalid has-influence amount "-1"/,
    "Influence conditions should require a non-negative integer threshold",
  );
  const invalidCompletedContractsCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-completed-contracts-count-card",
    name: "Effect Spec Invalid Completed Contracts Count",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-completed-contracts", count: -1 }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidCompletedContractsCountCard],
        highCouncilSeat: false,
      }),
    /Invalid has-completed-contracts count "-1"/,
    "Completed-contract conditions should require a non-negative integer threshold",
  );
  const invalidCardTraitCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-card",
    name: "Effect Spec Invalid Card Trait",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [{ kind: "has-card-trait-in-play", trait: "" }],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidCardTraitCard],
        highCouncilSeat: false,
      }),
    /Invalid has-card-trait-in-play trait ""/,
    "Card-trait conditions should require a non-empty trait",
  );
  const invalidCardTraitCountCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-card-trait-count-card",
    name: "Effect Spec Invalid Card Trait Count",
    effects: [
      revealSpec(
        [{ kind: "gain-persuasion", selector: "self", amount: 1 }],
        [
          {
            kind: "has-card-trait-in-play",
            trait: "Faction: Fremen",
            count: -1,
          },
        ],
      ),
    ],
  };
  assert.throws(
    () =>
      turnActions.revealTurnPlan({
        ...p2,
        hand: [invalidCardTraitCountCard],
        highCouncilSeat: false,
      }),
    /Invalid has-card-trait-in-play count "-1"/,
    "Card-trait conditions should require a non-negative integer threshold",
  );
  const invalidTeamConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-team-condition-card",
    name: "Effect Spec Invalid Team Condition",
    effects: [
      agentSpec(
        [{ kind: "draw-cards", selector: "self", amount: 1 }],
        [{ kind: "has-team", team: "atreides" }],
      ),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidTeamConditionCard, p2, p2),
    /Unsupported effect team "atreides"/,
    "Team conditions should reject unsupported team ids",
  );
  const invalidRoleConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-role-condition-card",
    name: "Effect Spec Invalid Role Condition",
    effects: [
      agentSpec(
        [{ kind: "draw-cards", selector: "self", amount: 1 }],
        [{ kind: "has-role", role: "Captain" }],
      ),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidRoleConditionCard, p2, p2),
    /Unsupported effect role "Captain"/,
    "Role conditions should reject unsupported role ids",
  );
  const invalidLeaderConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-leader-condition-card",
    name: "Effect Spec Invalid Leader Condition",
    effects: [
      agentSpec(
        [{ kind: "draw-cards", selector: "self", amount: 1 }],
        [{ kind: "has-leader", leader: "" }],
      ),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidLeaderConditionCard, p2, p2),
    /Invalid has-leader leader ""/,
    "Leader conditions should require a non-empty leader name",
  );
  const invalidAllianceConditionCard = {
    ...convincingArgument,
    id: "effect-spec-invalid-alliance-condition-card",
    name: "Effect Spec Invalid Alliance Condition",
    effects: [
      agentSpec(
        [{ kind: "draw-cards", selector: "self", amount: 1 }],
        [{ kind: "has-alliance", faction: "sardaukar" }],
      ),
    ],
  };
  assert.throws(
    () => state.applyCardAgentEffect(invalidAllianceConditionCard, p2, p2),
    /Unsupported effect faction "sardaukar"/,
    "Alliance conditions should reject unsupported factions",
  );
}
