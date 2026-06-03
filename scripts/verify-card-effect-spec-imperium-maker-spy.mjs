import assert from "node:assert/strict";
import {
  hasAgentEffect,
  hasRevealEffect,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecImperiumMakerSpy({ cards }) {
  const {
    doubleAgent,
    ecologicalTestingStation,
    fedaykinStilltent,
    hiddenMissive,
    smuggler,
    smugglersHaven,
    wheelsWithinWheels,
  } = cards;
  assert.ok(
    fedaykinStilltent.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "water" &&
            effect.amount === 1,
        ),
    ),
    "Fedaykin Stilltent should carry a reveal water spec",
  );
  assert.equal(
    fedaykinStilltent.reveal,
    "Gain 1 water.",
    "Fedaykin Stilltent reveal text should preserve its water reveal",
  );
  assert.equal(
    fedaykinStilltent.play,
    "If you sent an Agent to a Maker board space this turn, recruit 1 troop.",
    "Fedaykin Stilltent play text should include its Maker-space condition",
  );
  assert.ok(
    fedaykinStilltent.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "visited-maker-space",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Fedaykin Stilltent should carry an Ally routed Maker-space troop spec",
  );
  assert.ok(
    fedaykinStilltent.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "visited-maker-space",
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 1,
        ),
    ),
    "Fedaykin Stilltent should carry a Commander-to-activated-Ally Maker-space troop spec",
  );
  assert.equal(
    doubleAgent.play,
    "If you have a spy on the board space you sent an Agent to this turn, you may place a spy on the same observation post as another player's spy.",
    "Double Agent play text should include its current-space spy condition",
  );
  assert.equal(
    doubleAgent.reveal,
    "+1 persuasion and +1 strength.",
    "Double Agent reveal text should preserve its printed reveal",
  );
  assert.ok(
    doubleAgent.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "visited-space-has-spy-post",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.allowSharedPost === true,
        ),
    ),
    "Double Agent should carry a current-space spy-post gated shared spy placement spec",
  );
  assert.ok(
    hasRevealEffect(
      doubleAgent,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ) &&
      hasRevealEffect(
        doubleAgent,
        (effect) => effect.kind === "gain-strength" && effect.amount === 1,
      ),
    "Double Agent should carry fixed Reveal persuasion and strength specs",
  );
  assert.equal(
    smuggler.play,
    "If you sent an Agent to a Maker board space this turn, gain 1 spice.",
    "Smuggler's Harvester play text should expose its Maker-space Agent reward",
  );
  assert.equal(
    smuggler.reveal,
    "+1 persuasion.",
    "Smuggler's Harvester reveal text should be fixed persuasion only",
  );
  assert.ok(
    smuggler.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) => condition.kind === "visited-maker-space",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "Smuggler's Harvester should carry a current-Agent Maker-space gated Agent spice spec",
  );
  assert.ok(
    hasRevealEffect(
      smuggler,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ),
    "Smuggler's Harvester should carry its fixed Reveal persuasion spec",
  );
  assert.equal(
    smugglersHaven.play,
    "Gain 1 VP. Pay 4 spice to summon 1 sandworm.",
    "Smuggler's Haven play text should expose its Agent VP and sandworm payment",
  );
  assert.ok(
    hasAgentEffect(
      smugglersHaven,
      (effect) =>
        effect.kind === "gain-vp" &&
        effect.selector === "self" &&
        effect.amount === 1,
    ),
    "Smuggler's Haven should carry a typed Agent VP effect",
  );
  assert.ok(
    smugglersHaven.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "pay-resource-for-sandworms" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.cost === 4 &&
            effect.sandworms === 1 &&
            effect.recipient === "self-or-activated-ally" &&
            effect.destination === "conflict" &&
            effect.optional === true,
        ),
    ),
    "Smuggler's Haven should carry a typed Agent self-or-activated-Ally sandworm payment spec",
  );
  assert.equal(
    smugglersHaven.reveal,
    "+1 persuasion. If you are spying on a Maker board space, gain 2 spice.",
    "Smuggler's Haven reveal text should include its Maker-space spy condition",
  );
  assert.ok(
    smugglersHaven.effects?.some(
      (spec) =>
        spec.trigger === "reveal" &&
        spec.conditions?.some(
          (condition) => condition.kind === "has-spy-post-on-maker-space",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 2,
        ),
    ),
    "Smuggler's Haven should carry an owned Maker-space spy-post gated Reveal spice spec",
  );
  assert.ok(
    hasRevealEffect(
      smugglersHaven,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ),
    "Smuggler's Haven should carry its fixed Reveal persuasion spec",
  );
  assert.ok(
    hiddenMissive.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "bene" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) => effect.kind === "draw-cards" && effect.amount === 1,
        ),
    ),
    "Hidden Missive should carry a Bene Influence-gated card-draw spec",
  );
  assert.equal(
    hiddenMissive.play,
    "If you have 2 or more Bene Gesserit Influence, recruit 1 troop and draw 1 card.",
    "Hidden Missive play text should include its Influence condition",
  );
  assert.ok(
    hiddenMissive.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "bene" &&
            condition.amount === 2,
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Hidden Missive should carry a Bene Influence-gated Ally troop spec",
  );
  assert.ok(
    hiddenMissive.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "bene" &&
            condition.amount === 2,
        ) &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recruit-troops" &&
            effect.selector === "activated-ally" &&
            effect.amount === 1,
        ),
    ),
    "Hidden Missive should carry a Bene Influence-gated Commander-to-activated-Ally troop spec",
  );
  assert.ok(
    hasRevealEffect(
      hiddenMissive,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ) &&
      hasRevealEffect(
        hiddenMissive,
        (effect) => effect.kind === "gain-strength" && effect.amount === 1,
      ),
    "Hidden Missive should carry fixed Reveal persuasion and strength specs",
  );
  assert.ok(
    hasAgentEffect(
      ecologicalTestingStation,
      (effect) =>
        effect.kind === "pay-resource-for-draw-cards" &&
        effect.selector === "self" &&
        effect.resource === "water" &&
        effect.cost === 2 &&
        effect.drawCards === 2 &&
        effect.optional === true,
    ),
    "Ecological Testing Station should carry its Agent water-payment draw spec",
  );
  assert.ok(
    hasRevealEffect(
      ecologicalTestingStation,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ),
    "Ecological Testing Station should carry its fixed +1 persuasion reveal spec",
  );
  assert.ok(
    ecologicalTestingStation.effects?.some(
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
            effect.selector === "self" &&
            effect.resource === "water" &&
            effect.amount === 1,
        ),
    ),
    "Ecological Testing Station should carry its Fremen Bond reveal water spec",
  );
  assert.equal(
    ecologicalTestingStation.play,
    "Pay 2 water to draw 2 cards.",
    "Ecological Testing Station play text should describe its payment choice",
  );
  assert.equal(
    ecologicalTestingStation.reveal,
    "+1 persuasion. Fremen Bond: gain 1 water.",
    "Ecological Testing Station reveal text should describe its Fremen Bond reward",
  );
  assert.ok(
    wheelsWithinWheels.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "emperor" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "solari" &&
            effect.amount === 2,
        ),
    ),
    "Wheels Within Wheels should carry an Emperor Influence-gated Solari spec",
  );
  assert.equal(
    wheelsWithinWheels.play,
    "If you have 2 or more Emperor/Great Houses Influence, gain 2 Solari. If you have 2 or more Spacing Guild Influence, gain 1 spice.",
    "Wheels Within Wheels play text should include its Influence conditions",
  );
  assert.equal(
    wheelsWithinWheels.reveal,
    "+1 persuasion. Place 1 spy.",
    "Wheels Within Wheels reveal text should preserve its printed spy icon",
  );
  assert.ok(
    hasRevealEffect(
      wheelsWithinWheels,
      (effect) => effect.kind === "gain-persuasion" && effect.amount === 1,
    ),
    "Wheels Within Wheels should carry a fixed Reveal persuasion spec",
  );
  assert.ok(
    hasRevealEffect(
      wheelsWithinWheels,
      (effect) =>
        effect.kind === "place-spies" &&
        effect.selector === "self" &&
        effect.amount === 1 &&
        effect.mustPlace === true,
    ),
    "Wheels Within Wheels should carry a Reveal spy placement spec",
  );
  assert.ok(
    wheelsWithinWheels.effects?.some(
      (spec) =>
        spec.trigger === "agent-play" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-influence" &&
            condition.faction === "spacing" &&
            condition.amount === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-resource" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "Wheels Within Wheels should carry a Spacing Guild Influence-gated spice spec",
  );
}
