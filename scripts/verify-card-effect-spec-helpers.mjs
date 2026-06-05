export function revealSpec(effects, conditions) {
  return {
    trigger: "reveal",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function agentSpec(effects, conditions) {
  return {
    trigger: "agent-play",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function plotSpec(effects, conditions) {
  return {
    trigger: "plot-intrigue",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function combatSpec(effects, conditions) {
  return {
    trigger: "combat-intrigue",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function acquireSpec(effects, conditions) {
  return {
    trigger: "acquire",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function discardSpec(effects, conditions) {
  return {
    trigger: "discard",
    ...(conditions ? { conditions } : {}),
    effects,
  };
}

export function hasRevealSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "reveal") ?? false;
}

export function hasAcquireSpec(card) {
  return card.effects?.some((spec) => spec.trigger === "acquire") ?? false;
}

export function hasAgentPlaySpec(card) {
  return card.effects?.some((spec) => spec.trigger === "agent-play") ?? false;
}

export function hasAgentEffect(card, predicate) {
  return (
    card.effects?.some(
      (spec) => spec.trigger === "agent-play" && spec.effects.some(predicate),
    ) ?? false
  );
}

export function hasAcquireEffect(card, predicate) {
  return (
    card.effects?.some(
      (spec) => spec.trigger === "acquire" && spec.effects.some(predicate),
    ) ?? false
  );
}

export function hasPlotEffect(card, predicate) {
  return (
    card.effects?.some(
      (spec) =>
        spec.trigger === "plot-intrigue" && spec.effects.some(predicate),
    ) ?? false
  );
}

export function hasCombatEffect(card, predicate) {
  return (
    card.effects?.some(
      (spec) =>
        spec.trigger === "combat-intrigue" && spec.effects.some(predicate),
    ) ?? false
  );
}

export function hasRevealEffect(card, predicate) {
  return (
    card.effects?.some(
      (spec) => spec.trigger === "reveal" && spec.effects.some(predicate),
    ) ?? false
  );
}

export function expectedFixedReveal(card) {
  return {
    persuasion: card.name === "Corrinth City" ? 5 : card.persuasion,
    revealGain:
      card.name === "Junction Headquarters"
        ? { water: 1 }
        : card.revealGain
            ? { ...card.revealGain }
            : {},
    swords: card.swords,
  };
}

export function hasFixedRevealReward(card) {
  return (
    card.persuasion > 0 ||
    card.swords > 0 ||
    Object.values(card.revealGain ?? {}).some((amount) => (amount ?? 0) > 0)
  );
}

export function actualFixedReveal(turnActions, player, card) {
  const plan = turnActions.revealTurnPlan({
    ...player,
    hand: [card],
    highCouncilSeat: false,
  });
  return {
    persuasion: plan.persuasion,
    revealGain: plan.revealGain,
    swords: plan.swords,
  };
}
