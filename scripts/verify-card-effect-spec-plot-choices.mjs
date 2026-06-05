import assert from "node:assert/strict";
import {
  agentSpec,
  hasPlotEffect,
} from "./verify-card-effect-spec-helpers.mjs";

export function verifyCardEffectSpecPlotChoices({
  cards,
  data,
  effectResolver,
  game,
  players,
}) {
  const {
    cunning,
    distraction,
    intelligenceReport,
    leverage,
    manipulate,
    sietchRitual,
    specialMission,
  } = cards;
  const { p1, p2, p4, p6 } = players;
  assert.ok(
    sietchRitual.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "bene" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Ally",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card" &&
            effect.selector === "self" &&
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
    "Sietch Ritual should carry a typed Ally discard-for-Bene Influence spec",
  );
  assert.ok(
    sietchRitual.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "fringeWorlds" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-role" && condition.role === "Commander",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "discard-card" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "gain-influence" &&
            effect.selector === "activated-ally" &&
            effect.faction === "fringeWorlds" &&
            effect.amount === 1,
        ),
    ),
    "Sietch Ritual should carry a typed Commander routed discard-for-Fringe Worlds Influence spec",
  );
  assert.ok(
    sietchRitual.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "fremen" &&
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
            effect.kind === "gain-influence" &&
            effect.selector === "self" &&
            effect.faction === "fremen" &&
            effect.amount === 1,
        ),
    ),
    "Sietch Ritual should carry a typed Muad'Dib personal Fremen Influence spec",
  );
  assert.deepEqual(
    effectResolver.resolveDiscardCardEffects(sietchRitual.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Sietch Ritual should not resolve a discard-card effect without a selected choice",
  );
  const sietchDiscardEffects = effectResolver.resolveDiscardCardEffects(
    sietchRitual.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    sietchDiscardEffects.length,
    1,
    "Sietch Ritual should resolve one selected discard effect",
  );
  assert.equal(
    sietchDiscardEffects[0]?.selector,
    "self",
    "Sietch Ritual selected discard should target self",
  );
  assert.equal(
    sietchDiscardEffects[0]?.amount,
    1,
    "Sietch Ritual selected discard should discard one card",
  );
  assert.equal(
    sietchDiscardEffects[0]?.optional,
    false,
    "Sietch Ritual selected discard should be mandatory",
  );
  const sietchAllyResolved = effectResolver.resolveGameEffects(
    sietchRitual.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "bene",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    sietchAllyResolved.influenceGains.bene,
    1,
    "Ally Sietch Ritual should gain Bene Influence",
  );
  assert.deepEqual(
    sietchAllyResolved.activatedAlly.influenceGains,
    {},
    "Ally Sietch Ritual should not route Influence to an activated Ally",
  );
  const sietchCommanderResolved = effectResolver.resolveGameEffects(
    sietchRitual.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "bene",
      source: p4,
      target: p6,
      state: game,
    },
  );
  assert.deepEqual(
    sietchCommanderResolved.influenceGains,
    {},
    "Commander Sietch Ritual should not gain main-board Bene Influence personally",
  );
  assert.equal(
    sietchCommanderResolved.activatedAlly.influenceGains.bene,
    1,
    "Commander Sietch Ritual should route main-board Bene Influence to the activated Ally",
  );
  const sietchMuadDibResolved = effectResolver.resolveGameEffects(
    sietchRitual.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "fremen",
      source: p1,
      state: game,
    },
  );
  assert.equal(
    sietchMuadDibResolved.influenceGains.fremen,
    1,
    "Muad'Dib Sietch Ritual should gain personal Fremen Influence",
  );
  assert.deepEqual(
    sietchMuadDibResolved.activatedAlly.influenceGains,
    {},
    "Muad'Dib personal Fremen Sietch Ritual should not route to an activated Ally",
  );
  assert.ok(
    cunning.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "draw" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Cunning should carry a typed free Plot draw choice spec",
  );
  assert.ok(
    cunning.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "paid-trash" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "spend-resource" &&
            effect.selector === "self" &&
            effect.resource === "spice" &&
            effect.amount === 1,
        ),
    ),
    "Cunning should carry a typed paid Plot spice spend choice spec",
  );
  assert.ok(
    cunning.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "paid-trash" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Cunning should carry a typed paid Plot draw choice spec",
  );
  assert.ok(
    cunning.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "paid-trash" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "trash-card" &&
            effect.selector === "self" &&
            effect.optional === false,
        ),
    ),
    "Cunning should carry a typed mandatory Plot trash-card choice spec",
  );
  const cunningNoChoiceResolved = effectResolver.resolveGameEffects(
    cunning.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    cunningNoChoiceResolved.cardsToDraw,
    0,
    "Cunning Plot specs should not draw without a selected choice",
  );
  assert.deepEqual(
    cunningNoChoiceResolved.spentResources,
    {},
    "Cunning Plot specs should not spend spice without a selected choice",
  );
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(cunning.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [],
    "Cunning Plot specs should not create a trash effect without a selected choice",
  );
  const cunningDrawResolved = effectResolver.resolveGameEffects(
    cunning.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    cunningDrawResolved.cardsToDraw,
    1,
    "Cunning free Plot choice should draw 1 card",
  );
  assert.deepEqual(
    cunningDrawResolved.spentResources,
    {},
    "Cunning free Plot choice should not spend spice",
  );
  assert.deepEqual(
    effectResolver.resolveTrashCardEffects(cunning.effects, {
      trigger: "plot-intrigue",
      choiceId: "draw",
      source: p2,
      state: game,
    }),
    [],
    "Cunning free Plot choice should not create a trash effect",
  );
  const cunningPaidResolved = effectResolver.resolveGameEffects(
    cunning.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "paid-trash",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    cunningPaidResolved.spentResources.spice,
    1,
    "Cunning paid Plot choice should spend 1 spice",
  );
  assert.equal(
    cunningPaidResolved.cardsToDraw,
    1,
    "Cunning paid Plot choice should draw 1 card",
  );
  const cunningTrashEffects = effectResolver.resolveTrashCardEffects(
    cunning.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "paid-trash",
      source: p2,
      state: game,
    },
  );
  assert.equal(
    cunningTrashEffects.length,
    1,
    "Cunning paid Plot choice should resolve one trash effect",
  );
  assert.equal(
    cunningTrashEffects[0]?.selector,
    "self",
    "Cunning trash effect should target the source player",
  );
  assert.equal(
    cunningTrashEffects[0]?.optional,
    false,
    "Cunning trash effect should be mandatory",
  );
  assert.equal(
    cunningTrashEffects[0]?.excludeSource,
    false,
    "Cunning trash effect should not exclude a source card",
  );
  assert.ok(
    distraction.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "deployed-units-this-turn" &&
            condition.count === 3,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.allowSharedPost === true &&
            effect.source === "Distraction",
        ),
    ),
    "Distraction should carry a typed Plot shared spy placement spec gated by turn deployments",
  );
  const distractionPlotResolved = effectResolver.resolveGameEffects(
    distraction.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnUnitDeployments: { [p2.id]: 3 } },
    },
  );
  assert.equal(
    distractionPlotResolved.spyPlacements.length,
    1,
    "Distraction Plot spec should resolve a spy placement after three deployed units this turn",
  );
  assert.deepEqual(
    distractionPlotResolved.spyPlacements[0],
    {
      count: 1,
    recallForSupply: true,
    mustPlace: undefined,
    placementIcon: undefined,
    placementIcons: undefined,
    allowSharedPost: true,
      source: "Distraction",
      postPlacementAction: undefined,
    },
    "Distraction Plot spec should resolve the shared spy placement details",
  );
  const distractionBeforeDeployResolved = effectResolver.resolveGameEffects(
    distraction.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnUnitDeployments: { [p2.id]: 2 } },
    },
  );
  assert.deepEqual(
    distractionBeforeDeployResolved.spyPlacements,
    [],
    "Distraction Plot spec should not resolve before three deployed units this turn",
  );
  assert.ok(
    specialMission.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "place-spy" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "place-spies" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.recallForSupply === true &&
            effect.mustPlace === true &&
            effect.placementIcon === "city" &&
            effect.source === "Special Mission",
        ),
    ),
    "Special Mission should carry a typed Plot City spy placement choice spec",
  );
  const specialMissionNoChoiceResolved = effectResolver.resolveGameEffects(
    specialMission.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    specialMissionNoChoiceResolved.spyPlacements,
    [],
    "Special Mission Plot choice spec should not place spies without a selected choice",
  );
  const specialMissionPlaceSpyResolved = effectResolver.resolveGameEffects(
    specialMission.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "place-spy",
      source: p2,
      state: game,
    },
  );
  assert.deepEqual(
    specialMissionPlaceSpyResolved.spyPlacements,
    [
      {
        count: 1,
      recallForSupply: true,
      mustPlace: true,
      placementIcon: "city",
      placementIcons: undefined,
      allowSharedPost: undefined,
        source: "Special Mission",
        postPlacementAction: undefined,
      },
    ],
    "Special Mission Plot place-spy choice should resolve a mandatory City spy placement",
  );
  assert.ok(
    specialMission.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.choiceId === "recall-spy" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "recall-spy" &&
            effect.selector === "self" &&
            effect.source === "Special Mission" &&
            effect.reward?.resource === "spice" &&
            effect.reward?.amount === 2 &&
            effect.removeShieldWall === true,
        ),
    ),
    "Special Mission should carry a typed Plot spy recall reward spec",
  );
  const specialMissionRecallWithoutSpaceResolved =
    effectResolver.resolveGameEffects(specialMission.effects, {
      trigger: "plot-intrigue",
      choiceId: "recall-spy",
      source: p2,
      state: game,
    });
  assert.deepEqual(
    specialMissionRecallWithoutSpaceResolved.spyRecalls,
    [],
    "Special Mission Plot recall choice should not recall a spy without a selected space",
  );
  assert.deepEqual(
    specialMissionRecallWithoutSpaceResolved.revealGain,
    {},
    "Special Mission Plot recall choice should not gain spice without a selected space",
  );
  assert.equal(
    specialMissionRecallWithoutSpaceResolved.removeShieldWall,
    false,
    "Special Mission Plot recall choice should not remove the Shield Wall without a selected space",
  );
  const specialMissionRecallSpace = data.boardSpaces.find(
    (space) => space.icon !== "city",
  );
  assert.ok(
    specialMissionRecallSpace,
    "Expected a non-City space for Special Mission recall spec verification",
  );
  const specialMissionRecallResolved = effectResolver.resolveGameEffects(
    specialMission.effects,
    {
      trigger: "plot-intrigue",
      choiceId: "recall-spy",
      source: p2,
      space: specialMissionRecallSpace,
      state: game,
    },
  );
  assert.deepEqual(
    specialMissionRecallResolved.spyRecalls,
    [{ spaceId: specialMissionRecallSpace.id, source: "Special Mission" }],
    "Special Mission Plot recall choice should resolve the selected spy recall",
  );
  assert.deepEqual(
    specialMissionRecallResolved.revealGain,
    { spice: 2 },
    "Special Mission Plot recall choice should resolve its spice reward",
  );
  assert.equal(
    specialMissionRecallResolved.removeShieldWall,
    true,
    "Special Mission Plot recall choice should resolve Shield Wall removal",
  );
  const recalledSpyConditionResolved = effectResolver.resolveGameEffects(
    [
      agentSpec(
        [{ kind: "recruit-troops", selector: "self", amount: 2 }],
        [{ kind: "recalled-spy-this-turn" }],
      ),
    ],
    {
      trigger: "agent-play",
      source: p2,
      state: { turnSpyRecalls: { [p2.id]: 1 } },
    },
  );
  assert.equal(
    recalledSpyConditionResolved.recruitedTroops,
    2,
    "Recalled-spy turn conditions should resolve after the source recalled a spy this turn",
  );
  const recalledSpyConditionWithoutRecall = effectResolver.resolveGameEffects(
    [
      agentSpec(
        [{ kind: "recruit-troops", selector: "self", amount: 2 }],
        [{ kind: "recalled-spy-this-turn" }],
      ),
    ],
    { trigger: "agent-play", source: p2, state: { turnSpyRecalls: {} } },
  );
  assert.equal(
    recalledSpyConditionWithoutRecall.recruitedTroops,
    0,
    "Recalled-spy turn conditions should not resolve before the source recalls a spy",
  );
  assert.ok(
    hasPlotEffect(
      leverage,
      (effect) =>
        effect.kind === "gain-resource" &&
        effect.selector === "self" &&
        effect.resource === "solari" &&
        effect.amount === 1,
    ),
    "Leverage should carry a typed Plot Intrigue Solari gain spec",
  );
  assert.ok(
    leverage.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) => condition.kind === "gained-spice-this-turn",
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "take-contracts" &&
            effect.selector === "self" &&
            effect.amount === 1 &&
            effect.sourcePool === "public-offer" &&
            effect.optional === true &&
            effect.source === "Leverage",
        ),
    ),
    "Leverage should carry a typed Plot Intrigue public-contract pending spec gated by turn spice gain",
  );
  const leveragePlotResolved = effectResolver.resolveGameEffects(
    leverage.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnSpiceGains: { [p2.id]: 1 } },
    },
  );
  assert.equal(
    leveragePlotResolved.revealGain.solari,
    1,
    "Leverage Plot spec should resolve its Solari gain after a spice gain",
  );
  const leverageContractEffects = effectResolver.resolveTakeContracts(
    leverage.effects,
    {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnSpiceGains: { [p2.id]: 1 } },
    },
  );
  assert.deepEqual(
    leverageContractEffects,
    [
      {
        selector: "self",
        amount: 1,
        sourcePool: "public-offer",
        optional: true,
        source: "Leverage",
      },
    ],
    "Leverage Plot spec should resolve a reusable optional public-contract effect",
  );
  assert.deepEqual(
    effectResolver.resolveTakeContracts(leverage.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: { turnSpiceGains: {} },
    }),
    [],
    "Leverage Plot contract spec should not resolve without a turn spice gain",
  );
  assert.ok(
    manipulate.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.effects.some(
          (effect) =>
            effect.kind === "manipulate-row-card" &&
            effect.selector === "self" &&
            effect.source === "Manipulate",
        ),
    ),
    "Manipulate should carry a typed Plot row-manipulation spec",
  );
  assert.deepEqual(
    effectResolver.resolveManipulateRowCards(manipulate.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: game,
    }),
    [{ selector: "self", source: "Manipulate" }],
    "Manipulate Plot spec should resolve a reusable row-manipulation effect",
  );
  assert.deepEqual(
    effectResolver.resolveManipulateRowCards(manipulate.effects, {
      trigger: "agent-play",
      source: p2,
      state: game,
    }),
    [],
    "Manipulate row-manipulation specs should not resolve for other triggers",
  );
  assert.ok(
    intelligenceReport.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        !spec.conditions &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Intelligence Report should carry a typed Plot card draw spec",
  );
  assert.ok(
    intelligenceReport.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" &&
        spec.conditions?.some(
          (condition) =>
            condition.kind === "has-spy-posts" && condition.count === 2,
        ) &&
        spec.effects.some(
          (effect) =>
            effect.kind === "draw-cards" &&
            effect.selector === "self" &&
            effect.amount === 1,
        ),
    ),
    "Intelligence Report should carry a typed spy-count-gated Plot card draw spec",
  );
  assert.equal(
    effectResolver.resolveGameEffects(intelligenceReport.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: {
        spyPosts: { arrakeen: "p2", "hagga-basin": "p3" },
        sharedSpyPosts: {},
      },
    }).cardsToDraw,
    1,
    "Intelligence Report Plot spec should draw only 1 card below two own spy posts",
  );
  assert.equal(
    effectResolver.resolveGameEffects(intelligenceReport.effects, {
      trigger: "plot-intrigue",
      source: p2,
      state: {
        spyPosts: { arrakeen: "p2", "hagga-basin": "p2" },
        sharedSpyPosts: {},
      },
    }).cardsToDraw,
    2,
    "Intelligence Report Plot spec should draw 2 cards with two own spy posts",
  );
}
