import assert from "node:assert/strict";
import { plotSpec } from "./verify-card-effect-spec-helpers.mjs";
import { playerById } from "./verify-starter-decks-fixtures.mjs";

export function verifyCardEffectSpecPlotInfluenceRouting({
  cards,
  effectResolver,
  game,
  players,
  plotIntrigueEffectRules,
  withActivePlayer,
}) {
  const { buyAccess, imperiumPolitics } = cards;
  const { p1, p2, p4, p5, p6 } = players;
  assert.ok(
    buyAccess.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "greatHouses+bene" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ),
    ),
    "Buy Access should carry a typed Ally Great Houses plus Bene Gesserit Plot choice spec",
  );
  assert.ok(
    buyAccess.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "emperor+bene" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "emperor" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "bene" &&
            effect.amount === 1,
        ),
    ),
    "Buy Access should carry a typed Shaddam personal Emperor plus routed Bene Gesserit Plot choice spec",
  );
  assert.ok(
    buyAccess.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "greatHouses+fremen" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "muaddib",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 5,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ),
    ),
    "Buy Access should carry a typed Muad'Dib routed Great Houses plus personal Fremen Plot choice spec",
  );
  assert.equal(
    buyAccess.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "emperor+greatHouses",
    ),
    false,
    "Buy Access typed specs should not allow both mappings of the printed Emperor icon",
  );
  assert.equal(
    buyAccess.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "fremen+fringeWorlds",
    ),
    false,
    "Buy Access typed specs should not allow both mappings of the printed Fremen icon",
  );
  const buyAccessAllyResolved = effectResolver.resolveGameEffects(
    buyAccess.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "greatHouses+bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    buyAccessAllyResolved.spentResources.solari,
    5,
    "Ally Buy Access should spend 5 Solari",
  );
  assert.equal(
    buyAccessAllyResolved.influenceGains.greatHouses,
    1,
    "Ally Buy Access should gain Great Houses Influence",
  );
  assert.equal(
    buyAccessAllyResolved.influenceGains.bene,
    1,
    "Ally Buy Access should gain Bene Gesserit Influence",
  );
  assert.deepEqual(
    buyAccessAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Buy Access should not route Influence to an activated Ally",
  );
  const buyAccessShaddamResolved = effectResolver.resolveGameEffects(
    buyAccess.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "emperor+bene",
      source: p4,
      target: p6,
      state: game,
    },
  );
  assert.equal(
    buyAccessShaddamResolved.spentResources.solari,
    5,
    "Shaddam Buy Access should spend 5 Solari",
  );
  assert.equal(
    buyAccessShaddamResolved.influenceGains.emperor,
    1,
    "Shaddam Buy Access should gain personal Emperor Influence",
  );
  assert.equal(
    buyAccessShaddamResolved.activatedAlly.influenceGains.bene,
    1,
    "Shaddam Buy Access should route game-board Influence to the activated Ally",
  );
  const buyAccessMuadDibResolved = effectResolver.resolveGameEffects(
    buyAccess.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "greatHouses+fremen",
      source: p1,
      target: p5,
      state: game,
    },
  );
  assert.equal(
    buyAccessMuadDibResolved.spentResources.solari,
    5,
    "Muad'Dib Buy Access should spend 5 Solari",
  );
  assert.equal(
    buyAccessMuadDibResolved.influenceGains.fremen,
    1,
    "Muad'Dib Buy Access should gain personal Fremen Influence",
  );
  assert.equal(
    buyAccessMuadDibResolved.activatedAlly.influenceGains.greatHouses,
    1,
    "Muad'Dib Buy Access should route game-board Influence to the activated Ally",
  );
  assert.ok(
    imperiumPolitics.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "greatHouses" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ),
    ),
    "Imperium Politics should carry a typed Ally Great Houses Plot choice spec",
  );
  assert.ok(
    imperiumPolitics.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "greatHouses" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "greatHouses" &&
            effect.amount === 1,
        ),
    ),
    "Imperium Politics should carry a typed Commander routed Great Houses Plot choice spec",
  );
  assert.ok(
    imperiumPolitics.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "emperor" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-team" && condition.team === "shaddam",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "solari" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "emperor" &&
            effect.amount === 1,
        ),
    ),
    "Imperium Politics should carry a typed Shaddam personal Emperor Plot choice spec",
  );
  const imperiumPoliticsAllyResolved = effectResolver.resolveGameEffects(
    imperiumPolitics.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "greatHouses",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    imperiumPoliticsAllyResolved.spentResources.solari,
    1,
    "Ally Imperium Politics should spend 1 Solari",
  );
  assert.equal(
    imperiumPoliticsAllyResolved.influenceGains.greatHouses,
    1,
    "Ally Imperium Politics should gain Great Houses Influence",
  );
  assert.deepEqual(
    imperiumPoliticsAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Imperium Politics should not route Influence to an activated Ally",
  );
  const imperiumPoliticsCommanderResolved = effectResolver.resolveGameEffects(
    imperiumPolitics.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "greatHouses",
      source: p4,
      target: p6,
      state: game,
    },
  );
  assert.equal(
    imperiumPoliticsCommanderResolved.spentResources.solari,
    1,
    "Commander Imperium Politics should spend Commander Solari",
  );
  assert.deepEqual(
    imperiumPoliticsCommanderResolved.influenceGains,
    {},
    "Commander main-board Imperium Politics should not put game-board Influence on the Commander",
  );
  assert.equal(
    imperiumPoliticsCommanderResolved.activatedAlly.influenceGains.greatHouses,
    1,
    "Commander main-board Imperium Politics should route Influence to the activated Ally",
  );
  const imperiumPoliticsShaddamResolved = effectResolver.resolveGameEffects(
    imperiumPolitics.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "emperor",
      source: p4,
      state: game,
    },
  );
  assert.equal(
    imperiumPoliticsShaddamResolved.spentResources.solari,
    1,
    "Shaddam Imperium Politics should spend 1 Solari",
  );
  assert.equal(
    imperiumPoliticsShaddamResolved.influenceGains.emperor,
    1,
    "Shaddam Imperium Politics should gain personal Emperor Influence",
  );
  const imperiumPoliticsMuadDibEmperorResolved =
    effectResolver.resolveGameEffects(imperiumPolitics.effects, {
      trigger: "plot-intrigue",
      choiceId: "emperor",
      source: p1,
      state: game,
    });
  assert.deepEqual(
    imperiumPoliticsMuadDibEmperorResolved.spentResources,
    {},
    "Muad'Dib Imperium Politics should not resolve the Shaddam-only Emperor choice",
  );
  assert.deepEqual(
    imperiumPoliticsMuadDibEmperorResolved.influenceGains,
    {},
    "Muad'Dib Imperium Politics should not gain Emperor Influence",
  );
  const typedSequentialInfluence = {
    ...imperiumPolitics,
    id: "intrigue-typed-sequential-influence",
    name: "Typed Sequential Influence",
    effects: [
      plotSpec([
        {
          kind: "lose-influence",
          selector: "self",
          faction: "bene",
          amount: 1,
        },
        {
          kind: "gain-influence",
          selector: "self",
          faction: "bene",
          amount: 1,
        },
      ]),
    ],
  };
  const typedSequentialInfluenceFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      leader: "Lady Margot Fenring",
      resources: { ...player.resources, spice: 0 },
      influence: { ...player.influence, bene: 2 },
      intrigues: [typedSequentialInfluence],
    })),
    intrigueDiscard: [],
    turnSpiceGains: {},
  };
  const typedSequentialInfluencePlayed =
    plotIntrigueEffectRules.playTypedPlotIntrigue(
      typedSequentialInfluenceFixture,
      "p2",
      typedSequentialInfluence.id,
      (intrigue) => intrigue.id === typedSequentialInfluence.id,
      (player) => `${player.leader} plays Typed Sequential Influence.`,
    );
  assert.equal(
    playerById(typedSequentialInfluencePlayed, "p2").influence.bene,
    2,
    "Typed Plot ordered Influence adjustments should preserve final same-Faction Influence",
  );
  assert.equal(
    playerById(typedSequentialInfluencePlayed, "p2").resources.spice,
    2,
    "Typed Plot ordered Influence adjustments should trigger Margot Loyalty after dropping and regaining Bene Gesserit 2",
  );
  assert.equal(
    typedSequentialInfluencePlayed.turnSpiceGains.p2,
    2,
    "Typed Plot ordered Influence adjustment Loyalty spice should be tracked",
  );
  assert.match(
    typedSequentialInfluencePlayed.log[1],
    /Loyalty/,
    "Typed Plot ordered Influence adjustment rewards should log after the played Intrigue",
  );
  const typedGainThenLoseInfluence = {
    ...imperiumPolitics,
    id: "intrigue-typed-gain-then-lose-influence",
    name: "Typed Gain Then Lose Influence",
    effects: [
      plotSpec([
        {
          kind: "gain-influence",
          selector: "self",
          faction: "bene",
          amount: 1,
        },
        {
          kind: "lose-influence",
          selector: "self",
          faction: "bene",
          amount: 1,
        },
      ]),
    ],
  };
  const typedGainThenLoseFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      influence: { ...player.influence, bene: 0 },
      intrigues: [typedGainThenLoseInfluence],
    })),
    intrigueDiscard: [],
  };
  const typedGainThenLosePlayed = plotIntrigueEffectRules.playTypedPlotIntrigue(
    typedGainThenLoseFixture,
    "p2",
    typedGainThenLoseInfluence.id,
    (intrigue) => intrigue.id === typedGainThenLoseInfluence.id,
    (player) => `${player.leader} plays Typed Gain Then Lose Influence.`,
  );
  assert.equal(
    typedGainThenLosePlayed.intrigueDiscard.at(-1)?.id,
    typedGainThenLoseInfluence.id,
    "Typed Plot Influence affordability should allow spending Influence gained earlier in the same effect list",
  );
  assert.equal(playerById(typedGainThenLosePlayed, "p2").influence.bene, 0);
  const typedLoseThenGainBlockedFixture = {
    ...withActivePlayer(game, "p2", (player) => ({
      influence: { ...player.influence, bene: 0 },
      intrigues: [typedSequentialInfluence],
    })),
    intrigueDiscard: [],
  };
  const typedLoseThenGainBlocked =
    plotIntrigueEffectRules.playTypedPlotIntrigue(
      typedLoseThenGainBlockedFixture,
      "p2",
      typedSequentialInfluence.id,
      (intrigue) => intrigue.id === typedSequentialInfluence.id,
      (player) => `${player.leader} plays Typed Sequential Influence.`,
    );
  assert.equal(
    typedLoseThenGainBlocked,
    typedLoseThenGainBlockedFixture,
    "Typed Plot Influence affordability should reject losing Influence before it is gained",
  );
}
