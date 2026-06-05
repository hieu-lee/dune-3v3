import assert from "node:assert/strict";
import { hasAgentEffect } from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecImperiumUtility({ cards }) {
  const {
    guildEnvoy,
    guildSpy,
    northernWatermaster,
    paracompass,
    reliableInformant,
    spaceTimeFolding,
    steersman,
  } = cards;
  assert.ok(steersman, "Imperium deck should include Steersman");
  assert.ok(
    hasAgentEffect(
      steersman,
      (effect) => effect.kind === "draw-cards" && effect.amount === 1,
    ),
    "Steersman should use a typed Agent draw-card effect",
  );
  assert.ok(
    hasAgentEffect(steersman, (effect) => effect.kind === "recall-agent"),
    "Steersman should use a typed Recall Agent effect",
  );
  assert.match(steersman.play, /Draw 1 card.*Recall Agent/i);
  assert.ok(
    northernWatermaster.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "water" &&
            effect.amount === 1,
        ),
    ),
    "Northern Watermaster should carry a water Agent spec",
  );
  assert.equal(
    northernWatermaster.reveal,
    "+1 persuasion. Fremen Bond: gain 2 spice.",
    "Northern Watermaster reveal text should include its Fremen Bond spice reward",
  );
  assert.ok(
    northernWatermaster.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Northern Watermaster should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    northernWatermaster.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-card-trait-in-play" &&
            condition.trait === "Faction: Fremen" &&
            condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ),
    "Northern Watermaster should carry a Fremen Bond Reveal spice spec",
  );
  assert.ok(
    paracompass.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "solari" &&
            effect.amount === 2,
        ),
    ),
    "Paracompass should carry a Solari Agent spec",
  );
  assert.equal(
    paracompass.reveal,
    "If you have a seat on the High Council, +2 persuasion. If you also have a Swordmaster, +1 persuasion.",
    "Paracompass reveal text should preserve its High Council and Swordmaster conditions",
  );
  assert.equal(
    paracompass.persuasion,
    0,
    "Paracompass should not expose its conditional reveal as fixed persuasion",
  );
  assert.ok(
    paracompass.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-high-council-seat",
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Paracompass should carry a High Council-gated Reveal persuasion spec",
  );
  assert.ok(
    paracompass.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-high-council-seat",
        ) &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-swordmaster-bonus",
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Paracompass should carry a High Council plus Swordmaster Reveal persuasion spec",
  );
  assert.equal(
    reliableInformant.play,
    "Place 1 spy on Emperor, Bene Gesserit, or Spacing Guild board spaces.",
    "Reliable Informant play text should name its board-space icon condition",
  );
  for (const icon of ["emperor", "bene", "spacing"]) {
    assert.ok(
      reliableInformant.effects?.some(
        (spec) =>
          spec.trigger === "agent-play" &&
          spec.conditions?.some(
            (condition) =>
              condition.kind === "visited-space-icon" &&
              condition.icon === icon,
          ) &&
          spec.effects.some(
            (effect) =>
              effect.kind === "place-spies" &&
              effect.selector === "self" &&
              effect.amount === 1 &&
              effect.recallForSupply === true &&
              effect.mustPlace === true &&
              effect.placementIcon === icon,
          ),
      ),
      `Reliable Informant should carry a ${icon} board-space gated Agent spy-placement spec`,
    );
  }
  assert.equal(
    reliableInformant.reveal,
    "+1 persuasion. Gain 1 Solari.",
    "Reliable Informant reveal text should preserve its printed reveal Solari",
  );
  assert.ok(
    reliableInformant.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Reliable Informant should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    reliableInformant.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "solari" &&
            effect.amount === 1,
        ),
    ),
    "Reliable Informant should carry a reveal Solari spec",
  );
  assert.equal(
    spaceTimeFolding.play,
    "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 more card.",
    "Space-time Folding play text should preserve its conditional discard-draw effect",
  );
  assert.equal(
    spaceTimeFolding.reveal,
    "+1 persuasion.",
    "Space-time Folding should keep its fixed reveal persuasion",
  );
  assert.ok(
    spaceTimeFolding.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Space-time Folding should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    spaceTimeFolding.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card-for-draw" &&
            effect.selector === "self" &&
            effect.drawCards === 1 &&
            effect.optional === false &&
            effect.bonusDraw?.requiredDiscardTrait ===
              "Faction: Spacing Guild" &&
            effect.bonusDraw?.drawCards === 1,
        ),
    ),
    "Space-time Folding should carry a declarative Agent discard-for-draw spec with a Spacing Guild bonus",
  );
  assert.equal(
    guildEnvoy.play,
    "Discard 1 card. If you discarded a Spacing Guild card, draw 2 cards.",
    "Guild Envoy play text should preserve its conditional discard-draw effect",
  );
  assert.equal(
    guildEnvoy.reveal,
    "+1 persuasion.",
    "Guild Envoy should keep its fixed reveal persuasion",
  );
  assert.ok(
    guildEnvoy.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
        ),
    ),
    "Guild Envoy should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    guildEnvoy.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card-for-draw" &&
            effect.selector === "self" &&
            effect.drawCards === 0 &&
            effect.optional === false &&
            effect.bonusDraw?.requiredDiscardTrait ===
              "Faction: Spacing Guild" &&
            effect.bonusDraw?.drawCards === 2,
        ),
    ),
    "Guild Envoy should carry a declarative Agent discard-for-draw spec with only a Spacing Guild bonus",
  );
  assert.equal(
    guildSpy.play,
    "Discard 1 card to draw 1 card. If you discarded a Spacing Guild card, draw 1 Intrigue card.",
    "Guild Spy play text should preserve its conditional discard-draw Intrigue effect",
  );
  assert.equal(
    guildSpy.reveal,
    "+2 persuasion. If you acquired The Spice Must Flow this turn, gain 1 Influence with each faction you're spying on.",
    "Guild Spy should keep its fixed reveal persuasion and expose its Spice Must Flow reveal clause",
  );
  assert.ok(
    guildSpy.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) => effect.kind === "gain-persuasion" && effect.amount === 2,
        ),
    ),
    "Guild Spy should carry its printed persuasion in Reveal specs",
  );
  assert.ok(
    guildSpy.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "acquired-card-this-turn" &&
            condition.cardId === "538",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence-for-spied-factions" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Guild Spy should carry its Spice Must Flow gated spied-faction Influence reveal spec",
  );
  assert.ok(
    guildSpy.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card-for-draw" &&
            effect.selector === "self" &&
            effect.drawCards === 1 &&
            effect.optional === false &&
            effect.bonusIntrigues?.requiredDiscardTrait ===
              "Faction: Spacing Guild" &&
            effect.bonusIntrigues?.amount === 1,
        ),
    ),
    "Guild Spy should carry a declarative Agent discard-for-draw spec with a Spacing Guild Intrigue bonus",
  );
}
