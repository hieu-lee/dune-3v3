import { Bot, Link, LogOut, Play, PlugZap, UserCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { teams } from "../game/data";
import type { PublicRoomAiState, RoomSnapshot } from "../multiplayer/room-state";

type RoomPanelProps = {
  claimedPlayerId?: string;
  error: string | null;
  inRoom: boolean;
  roomId: string;
  snapshot: RoomSnapshot | null;
  status: "idle" | "loading" | "ready" | "error";
  onClaimSeat: (playerId: string, name: string) => void;
  onCreateRoom: () => void;
  onFillAiOpponents: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onReleaseSeat: (playerId: string) => void;
  onStartRoom: () => void;
};

export function RoomPanel({
  claimedPlayerId,
  error,
  inRoom,
  roomId,
  snapshot,
  status,
  onClaimSeat,
  onCreateRoom,
  onFillAiOpponents,
  onJoinRoom,
  onLeaveRoom,
  onReleaseSeat,
  onStartRoom,
}: RoomPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const claimedSeat = snapshot?.seats.find((seat) => seat.playerId === claimedPlayerId);
  const teammateSeats = claimedSeat ? snapshot?.seats.filter((seat) => seat.team === claimedSeat.team) ?? [] : [];
  const opponentSeats = claimedSeat ? snapshot?.seats.filter((seat) => seat.team !== claimedSeat.team) ?? [] : [];
  const allSeatsClaimed = Boolean(snapshot?.seats.every((seat) => seat.claimedBy));
  const canStartRoom = Boolean(inRoom && snapshot && !snapshot.started && claimedSeat && allSeatsClaimed);
  const canFillAiOpponents = Boolean(
    inRoom &&
    snapshot &&
    claimedSeat &&
    !snapshot.ai?.enabled &&
    teammateSeats.length > 0 &&
    teammateSeats.every((seat) => seat.claimedBy && !seat.ai) &&
    opponentSeats.length > 0 &&
    opponentSeats.every((seat) => !seat.claimedBy || seat.ai),
  );
  return (
    <section
      className={[
        "room-panel",
        inRoom ? "room-panel-online" : "room-panel-local",
        snapshot ? "room-panel-with-seats" : "",
      ].filter(Boolean).join(" ")}
      aria-label="Private room"
    >
      <div className="room-panel-main">
        <div>
          <p className="eyebrow">Private room</p>
          <strong>{inRoom ? roomId : "Local hotseat"}</strong>
          <small>{inRoom ? statusLabel(status, claimedSeat?.leader) : "Create or join a shared table"}</small>
        </div>
        {!inRoom && (
          <div className="room-inline-form">
            <button type="button" className="primary-action" onClick={onCreateRoom}>
              <PlugZap size={16} />
              Create room
            </button>
            <input
              aria-label="Room code"
              placeholder="Room code or link"
              value={joinCode}
              onChange={(event) => setJoinCode(event.currentTarget.value)}
            />
            <button type="button" onClick={() => onJoinRoom(joinCode)}>
              <Link size={16} />
              Join room
            </button>
          </div>
        )}
        {inRoom && (
          <div className="room-inline-form">
            <input
              aria-label="Player name"
              placeholder="Your name"
              value={playerName}
              onChange={(event) => setPlayerName(event.currentTarget.value)}
            />
            {claimedPlayerId && (
              <button type="button" onClick={() => onReleaseSeat(claimedPlayerId)}>
                <UserMinus size={16} />
                Release
              </button>
            )}
            {snapshot && (
              <button
                type="button"
                className="ai-action"
                disabled={!canFillAiOpponents}
                title={canFillAiOpponents ? "Fill the opposing team with AI" : "Claim all three seats on one team first"}
                onClick={onFillAiOpponents}
              >
                <Bot size={16} />
                AI opponents
              </button>
            )}
            {snapshot && !snapshot.started && (
              <button
                type="button"
                className="primary-action"
                disabled={!canStartRoom}
                title={canStartRoom ? "Start the game" : "Claim all six seats before starting"}
                onClick={onStartRoom}
              >
                <Play size={16} />
                Start game
              </button>
            )}
            <button type="button" onClick={onLeaveRoom}>
              <LogOut size={16} />
              Local
            </button>
          </div>
        )}
      </div>

      {error && <p className="room-error">{error}</p>}

      {snapshot?.ai?.enabled && (
        <div className="room-ai-status">
          <Bot size={16} />
          <span>AI controls {teams[snapshot.ai.team].name}</span>
          <small>{aiStatusLabel(snapshot.ai)}</small>
        </div>
      )}

      {snapshot && (
        <div className="room-seat-grid">
          {snapshot.seats.map((seat) => {
            const claimed = Boolean(seat.claimedBy);
            const mine = seat.playerId === claimedPlayerId;
            const canRecoverOffline = claimed && !seat.ai && !seat.connected && !claimedPlayerId;
            const canSwitch = !claimed && Boolean(claimedPlayerId);
            const unavailable = !mine && !canRecoverOffline && !canSwitch && claimed;
            const pendingName = playerName.trim();
            const canUpdateName = mine && pendingName && pendingName !== seat.claimedBy;
            const seatAction = mine
              ? canUpdateName ? "Update name" : "Your seat"
              : seat.ai
                ? "AI"
              : seat.claimedBy
                ? seat.connected
                  ? seat.claimedBy
                  : `${seat.claimedBy} offline - reclaim`
                : canSwitch
                  ? "Switch"
                  : "Claim";
            return (
              <button
                type="button"
                className={[
                  "room-seat",
                  `team-${seat.team}`,
                  mine ? "selected" : "",
                  unavailable ? "claimed" : "",
                  canSwitch ? "switchable" : "",
                  canRecoverOffline ? "recoverable" : "",
                  seat.ai ? "ai" : "",
                  !claimed ? "open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`room-seat-${seat.playerId}`}
                key={seat.playerId}
                disabled={unavailable}
                onClick={() => {
                  if (mine && !canUpdateName) return;
                  onClaimSeat(seat.playerId, playerName);
                }}
              >
                <span>{seat.role} - {teams[seat.team].name}</span>
                <strong>{seat.leader}</strong>
                <small>{seatAction}</small>
                {mine && <UserCheck size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function statusLabel(status: RoomPanelProps["status"], leader?: string) {
  if (leader) return `Seat restored: ${leader}`;
  if (status === "loading") return "Connecting";
  if (status === "error") return "Room unavailable";
  return "Claim a seat to store a reconnect token";
}

function aiStatusLabel(ai: PublicRoomAiState) {
  if (ai.status === "error") return ai.error ?? "AI stopped";
  if (ai.status === "running") return ai.actionCount ? `Thinking (${ai.actionCount} actions played)` : "Thinking";
  return ai.actionCount ? `${ai.actionCount} actions played` : "Waiting for turn";
}
