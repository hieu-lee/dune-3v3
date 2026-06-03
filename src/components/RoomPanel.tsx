import { Link, LogOut, PlugZap, UserCheck } from "lucide-react";
import { useState } from "react";
import { teams } from "../game/data";
import type { RoomSnapshot } from "../multiplayer/room-state";

type RoomPanelProps = {
  claimedPlayerId?: string;
  error: string | null;
  inRoom: boolean;
  roomId: string;
  snapshot: RoomSnapshot | null;
  status: "idle" | "loading" | "ready" | "error";
  onClaimSeat: (playerId: string, name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
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
  onJoinRoom,
  onLeaveRoom,
}: RoomPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const claimedSeat = snapshot?.seats.find((seat) => seat.playerId === claimedPlayerId);
  return (
    <section className="room-panel" aria-label="Private room">
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
              Create
            </button>
            <input
              aria-label="Room code"
              placeholder="Room code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.currentTarget.value.toUpperCase())}
            />
            <button type="button" onClick={() => onJoinRoom(joinCode)}>
              <Link size={16} />
              Join
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
            <button type="button" onClick={onLeaveRoom}>
              <LogOut size={16} />
              Local
            </button>
          </div>
        )}
      </div>

      {error && <p className="room-error">{error}</p>}

      {snapshot && (
        <div className="room-seat-grid">
          {snapshot.seats.map((seat) => {
            const claimed = Boolean(seat.claimedBy);
            const mine = seat.playerId === claimedPlayerId;
            const unavailable = (claimed && !mine) || Boolean(claimedPlayerId && !mine);
            return (
              <button
                type="button"
                className={["room-seat", mine ? "selected" : "", unavailable ? "claimed" : ""]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`room-seat-${seat.playerId}`}
                key={seat.playerId}
                disabled={unavailable}
                onClick={() => onClaimSeat(seat.playerId, playerName)}
              >
                <span>{seat.role} - {teams[seat.team].name}</span>
                <strong>{seat.leader}</strong>
                <small>
                  {mine
                    ? "Your seat"
                    : seat.claimedBy
                      ? `${seat.claimedBy}${seat.connected ? "" : " offline"}`
                      : "Claim"}
                </small>
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
