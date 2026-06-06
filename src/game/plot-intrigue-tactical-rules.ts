import {
  isCallToArmsIntrigue,
  isDetonationIntrigue,
  isSpecialMissionIntrigue,
  isUnexpectedAlliesIntrigue,
} from "./card-identifiers";
import { playTypedPlotIntrigue } from "./plot-intrigue-effect-rules";
import {
  canPlaySpecialMissionPlaceSpy,
  specialMissionRecallSpySpaces,
} from "./spy-pending-rules";
import {
  spyObservationPostLabelForSpace,
} from "./spy-posts";
import type {
  GameState,
} from "./types";

export type SpecialMissionChoice =
  | { kind: "place-spy" }
  | { kind: "recall-spy"; spaceId: string };

export function playSpecialMissionPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: SpecialMissionChoice,
): GameState {
  if (state.phase !== "playing" || state.pendingAction || state.pendingQueue.length > 0) return state;
  const player = state.players[state.activeSeat];
  if (!player || player.id !== playerId) return state;
  const intrigue = player.intrigues.find((card) => card.id === intrigueId);
  if (!intrigue || !isSpecialMissionIntrigue(intrigue) || !choice || typeof choice !== "object") return state;

  if (choice.kind === "place-spy") {
    if (!canPlaySpecialMissionPlaceSpy(state, player)) return state;
    return playTypedPlotIntrigue(
      state,
      playerId,
      intrigueId,
      isSpecialMissionIntrigue,
      (actor) => `${actor.leader} plays Special Mission and must place a spy on a City observation post.`,
      { choiceId: "place-spy" },
    );
  }

  if (choice.kind === "recall-spy") {
    const space = specialMissionRecallSpySpaces(state, player).find((candidate) => candidate.id === choice.spaceId);
    if (!space) return state;
    return playTypedPlotIntrigue(
      state,
      playerId,
      intrigueId,
      isSpecialMissionIntrigue,
      (actor, _contractPending, _activatedAlly, resolved, outcome) => {
        const shieldWallText = state.shieldWall && resolved.removeShieldWall ? ", removes the Shield Wall," : "";
        return `${actor.leader} plays Special Mission, recalls a spy from ${spyObservationPostLabelForSpace((outcome.recalledSpySpace ?? space).id)}${shieldWallText} and gains 2 spice.`;
      },
      { choiceId: "recall-spy", targetSpaceId: space.id },
    );
  }

  return state;
}

export function playDetonationIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  choice: "shield-wall" | "deploy",
  deployOwnerId?: string,
): GameState {
  if (choice === "shield-wall") {
    if (!state.shieldWall) return state;
    return playTypedPlotIntrigue(
      state,
      playerId,
      intrigueId,
      isDetonationIntrigue,
      (actor) => `${actor.leader} plays Detonation and removes the Shield Wall.`,
      { choiceId: "shield-wall" },
    );
  }

  if (choice === "deploy") {
    const actor = state.players[state.activeSeat];
    return playTypedPlotIntrigue(
      state,
      playerId,
      intrigueId,
      isDetonationIntrigue,
      (player, _contractPending, _activatedAlly, _resolved, outcome) => {
        const deployOwner = outcome.deployOwner;
        const deployLabel = deployOwner && deployOwner.id !== player.id ? ` for ${deployOwner.leader}` : "";
        const deployable = outcome.deployableTroops ?? 0;
        return deployable > 0
          ? `${player.leader} plays Detonation${deployLabel} and may deploy up to ${deployable} troops.`
          : `${player.leader} plays Detonation${deployLabel} and deploys no troops.`;
      },
      {
        choiceId: "deploy",
        ...(actor?.role === "Commander"
          ? { requireActivatedAlly: true, activatedAllyOwnerId: deployOwnerId }
          : {}),
      },
    );
  }

  return state;
}

export function playUnexpectedAlliesIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
  removeShieldWall: boolean,
  sandwormOwnerId?: string,
): GameState {
  if (!removeShieldWall) return state;
  const choiceId = removeShieldWall ? "remove-shield-wall" : "summon";
  const actor = state.players[state.activeSeat];
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isUnexpectedAlliesIntrigue,
    (player, _contractPending, _activatedAlly, resolved, outcome) => {
      const summonOwner = outcome.summonOwner;
      const ownerLabel = summonOwner && summonOwner.id !== player.id ? ` for ${summonOwner.leader}` : "";
      const shieldLabel = state.shieldWall && resolved.removeShieldWall ? " removes the Shield Wall," : "";
      const summoned = outcome.summonedSandworms ?? 1;
      return `${player.leader} plays Unexpected Allies${ownerLabel}, spends 2 water,${shieldLabel} and summons ${summoned} sandworm${summoned === 1 ? "" : "s"}.`;
    },
    {
      choiceId,
      ...(actor?.role === "Commander"
        ? { requireActivatedAlly: true, activatedAllyOwnerId: sandwormOwnerId }
        : {}),
    },
  );
}

export function playCallToArmsPlotIntrigue(
  state: GameState,
  playerId: string,
  intrigueId: string,
): GameState {
  return playTypedPlotIntrigue(
    state,
    playerId,
    intrigueId,
    isCallToArmsIntrigue,
    (player) =>
      `${player.leader} plays Call to Arms; acquisitions during this Reveal turn will recruit 1 troop.`,
  );
}
