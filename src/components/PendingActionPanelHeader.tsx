import { iconLabels, teams } from "../game/data";
import { influenceLossOptions } from "../game/state";
import type { GameState, PendingAction, Player } from "../game/types";

type PendingActionPanelHeaderProps = {
  game: GameState;
  pendingAction: PendingAction;
};

function playerById(game: GameState, playerId: string | undefined) {
  return game.players.find((player) => player.id === playerId);
}

function playerLeader(player: Player | undefined, fallback = "Player") {
  return player?.leader ?? fallback;
}

function makerChoiceLabel(game: GameState, pendingAction: Extract<PendingAction, { kind: "maker-choice" }>) {
  const owner = playerById(game, pendingAction.ownerId);
  const spiceOwner = playerById(game, pendingAction.spiceOwnerId);
  if (owner && spiceOwner && owner.id !== spiceOwner.id) return `${spiceOwner.leader} spice / ${owner.leader} worms`;
  return owner?.leader ?? "Player";
}

function sietchTabrLabel(game: GameState, pendingAction: Extract<PendingAction, { kind: "sietch-tabr" }>) {
  const owner = playerById(game, pendingAction.ownerId);
  const waterOwner = playerById(game, pendingAction.waterOwnerId);
  if (owner && waterOwner && owner.id !== waterOwner.id) return `${waterOwner.leader} water / ${owner.leader} units`;
  return owner?.leader ?? "Player";
}

function influencePayerLabel(game: GameState, pendingAction: Extract<PendingAction, { kind: "lose-influence" }>) {
  const influenceChoices = influenceLossOptions(game, pendingAction);
  const choiceOwnerIds = [...new Set(influenceChoices.map((choice) => choice.ownerId))];
  const choiceOwners = choiceOwnerIds
    .map((ownerId) => playerById(game, ownerId))
    .filter((player): player is Player => Boolean(player));
  if (choiceOwners.length > 0) return choiceOwners.map((owner) => owner.leader).join(" or ");
  return playerLeader(playerById(game, pendingAction.ownerId));
}

function pendingActionTitle(game: GameState, pendingAction: PendingAction) {
  switch (pendingAction.kind) {
    case "deploy":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} deployment`;
    case "control-defense":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} control deployment`;
    case "reinforce":
      return `Military Support - ${pendingAction.remaining} troops`;
    case "trade":
      return `Trade from ${pendingAction.source}`;
    case "spy":
      return `${pendingAction.source}${pendingAction.placementIcon ? ` ${iconLabels[pendingAction.placementIcon]}` : ""} spy placement - ${pendingAction.remaining}`;
    case "retreat-troops-for-strength":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "deploy-or-retreat-troops":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "contract":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} CHOAM contract`;
    case "acquire-card":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} acquisition from ${pendingAction.source}`;
    case "discard-card-for-influence-and-draw":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "discard-card-for-draw":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "discard-cards-for-reward":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "top-deck-selection":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "trash-intrigue-for-reward":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "discard-hand-card":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "lose-influence-for-intrigues":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source} reveal`;
    case "lose-influence-for-influence":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source} reveal`;
    case "maker-choice":
      return `${makerChoiceLabel(game, pendingAction)} Maker space`;
    case "sietch-tabr":
      return `${sietchTabrLabel(game, pendingAction)} Sietch Tabr`;
    case "commander-resource-split":
      return `${playerLeader(playerById(game, pendingAction.commanderId), "Commander")} ${pendingAction.source}`;
    case "paid-reward-choice":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pending-action-choice":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "feyd-training":
      return `${playerLeader(playerById(game, pendingAction.ownerId), "Feyd-Rautha")} ${pendingAction.source}`;
    case "staban-unseen-network":
      return `${playerLeader(playerById(game, pendingAction.ownerId), "Staban Tuek")} Unseen Network`;
    case "amber-desert-scouts":
      return `${playerLeader(playerById(game, pendingAction.ownerId), "Lady Amber")} Desert Scouts`;
    case "repeat-board-space":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "leader-transition":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "conflict-influence":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} Conflict Influence`;
    case "board-influence-choice":
      return `${pendingAction.source} Influence`;
    case "optional-space-payment":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "conflict-vp-conversion":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} Conflict reward`;
    case "trash-source-for-trade":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-contracts":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-strength":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-influence":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-troops":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-draw-cards":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-high-council-seat":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "pay-resource-for-sandworms":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "team-resource-payment":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source}`;
    case "throne-row":
      return `${playerLeader(playerById(game, pendingAction.ownerId), "Shaddam")} Throne Row`;
    case "trash-card":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.optional ? "optional " : ""}trash from ${pendingAction.source}`;
    case "recall-agent-from-board":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source} Agent recall`;
    case "draw-cards":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} ${pendingAction.source} draw`;
    case "recall-spy":
      return `${playerLeader(playerById(game, pendingAction.ownerId))} recall spy`;
    case "lose-influence":
      return `${influencePayerLabel(game, pendingAction)} influence choice`;
    case "conflict-tie":
      return `${teams[pendingAction.team].name} conflict tie`;
  }
}

export function PendingActionPanelHeader({ game, pendingAction }: PendingActionPanelHeaderProps) {
  return (
    <div className="pending-panel-header">
      <p className="eyebrow">Pending table choice</p>
      <h2>{pendingActionTitle(game, pendingAction)}</h2>
    </div>
  );
}
