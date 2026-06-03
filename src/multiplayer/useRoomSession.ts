import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoomActionCommand } from "./room-actions";
import type { RoomSnapshot } from "./room-state";

type StoredRoomIdentity = {
  playerId: string;
  token: string;
};

type RoomStatus = "idle" | "loading" | "ready" | "error";

function roomIdFromLocation() {
  return new URL(window.location.href).searchParams.get("room")?.trim().toUpperCase() || "";
}

function identityKey(roomId: string) {
  return `dune-3v3-room-${roomId}`;
}

function readStoredIdentity(roomId: string): StoredRoomIdentity | undefined {
  try {
    const stored = window.localStorage.getItem(identityKey(roomId));
    return stored ? JSON.parse(stored) as StoredRoomIdentity : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredIdentity(roomId: string, identity: StoredRoomIdentity) {
  window.localStorage.setItem(identityKey(roomId), JSON.stringify(identity));
}

function removeStoredIdentity(roomId: string) {
  window.localStorage.removeItem(identityKey(roomId));
}

function setRoomUrl(roomId?: string) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.pushState({}, "", url);
}

function roomIdFromJoinInput(input: string) {
  const trimmedInput = input.trim();
  try {
    const url = new URL(trimmedInput);
    const roomEntry = [...url.searchParams.entries()].find(([key]) => key.toLowerCase() === "room");
    return (roomEntry?.[1] ?? trimmedInput).trim().toUpperCase();
  } catch {
    return trimmedInput.toUpperCase();
  }
}

async function fetchRoom(roomId: string, token?: string) {
  const response = await fetch(`/api/rooms/${roomId}`, {
    headers: token ? { "x-room-token": token } : undefined,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error ?? "Room not found");
  return await response.json() as RoomSnapshot;
}

export function useRoomSession() {
  const [roomId, setRoomId] = useState(() => roomIdFromLocation());
  const [status, setStatus] = useState<RoomStatus>(() => roomIdFromLocation() ? "loading" : "idle");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventSourceGenerationRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const [identity, setIdentity] = useState<StoredRoomIdentity | undefined>(() => {
    const initialRoomId = roomIdFromLocation();
    return initialRoomId ? readStoredIdentity(initialRoomId) : undefined;
  });

  const loadRoom = useCallback(async (nextRoomId: string, nextIdentity = readStoredIdentity(nextRoomId)) => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setStatus("loading");
    setError(null);
    setRoomId(nextRoomId);
    setIdentity(nextIdentity);
    try {
      const nextSnapshot = await fetchRoom(nextRoomId, nextIdentity?.token);
      if (loadGenerationRef.current !== generation) return;
      if (nextIdentity?.token && !nextSnapshot.viewerPlayerId) {
        removeStoredIdentity(nextRoomId);
        setIdentity(undefined);
      }
      setSnapshot(nextSnapshot);
      setStatus("ready");
    } catch (loadError) {
      if (loadGenerationRef.current !== generation) return;
      setSnapshot(null);
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Unable to load room");
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoomId = roomIdFromLocation();
      if (!nextRoomId) {
        loadGenerationRef.current += 1;
        setRoomId("");
        setSnapshot(null);
        setIdentity(undefined);
        setStatus("idle");
        setError(null);
        return;
      }
      void loadRoom(nextRoomId);
    };
    window.addEventListener("popstate", handlePopState);
    if (roomId) void loadRoom(roomId, identity);
    return () => window.removeEventListener("popstate", handlePopState);
    // loadRoom intentionally owns the async refresh behavior for the initial URL room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;
    const token = identity?.token;
    const eventsUrl = `/api/rooms/${roomId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    let active = true;
    const generation = eventSourceGenerationRef.current + 1;
    eventSourceGenerationRef.current = generation;
    const events = new EventSource(eventsUrl);
    eventSourceRef.current = events;
    events.addEventListener("room", (event) => {
      if (!active || eventSourceGenerationRef.current !== generation) return;
      const nextSnapshot = JSON.parse((event as MessageEvent).data) as RoomSnapshot;
      if (token && !nextSnapshot.viewerPlayerId) {
        removeStoredIdentity(roomId);
        setIdentity(undefined);
      }
      setSnapshot(nextSnapshot);
      setStatus("ready");
      setError(null);
    });
    events.onerror = () => {
      if (!active || eventSourceGenerationRef.current !== generation) return;
      setError("Room event stream disconnected");
    };
    return () => {
      active = false;
      events.close();
      if (eventSourceRef.current === events) eventSourceRef.current = null;
    };
  }, [identity?.token, roomId]);

  const createRoom = useCallback(async () => {
    loadGenerationRef.current += 1;
    setStatus("loading");
    setError(null);
    const response = await fetch("/api/rooms", { method: "POST" });
    if (!response.ok) {
      setStatus("error");
      setError("Room server is not available");
      return;
    }
    const nextSnapshot = await response.json() as RoomSnapshot;
    setRoomUrl(nextSnapshot.roomId);
    setRoomId(nextSnapshot.roomId);
    setSnapshot(nextSnapshot);
    setIdentity(undefined);
    setStatus("ready");
  }, []);

  const joinRoom = useCallback(async (code: string) => {
    const nextRoomId = roomIdFromJoinInput(code);
    if (!nextRoomId) return;
    setRoomUrl(nextRoomId);
    await loadRoom(nextRoomId);
  }, [loadRoom]);

  const claimSeat = useCallback(async (playerId: string, name: string) => {
    if (!roomId) return;
    loadGenerationRef.current += 1;
    const response = await fetch(`/api/rooms/${roomId}/seats/${encodeURIComponent(playerId)}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, token: identity?.token }),
    });
    if (!response.ok) {
      setStatus("error");
      setError((await response.json().catch(() => undefined))?.error ?? "Unable to claim seat");
      return;
    }
    const body = await response.json() as { token: string; snapshot: RoomSnapshot };
    const nextIdentity = { playerId, token: body.token };
    writeStoredIdentity(roomId, nextIdentity);
    setIdentity(nextIdentity);
    setSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
  }, [identity?.token, roomId]);

  const releaseSeat = useCallback(async (playerId: string) => {
    if (!roomId || !identity?.token) return false;
    loadGenerationRef.current += 1;
    const response = await fetch(`/api/rooms/${roomId}/seats/${encodeURIComponent(playerId)}/release`, {
      method: "POST",
      headers: { "x-room-token": identity.token },
    });
    const body = await response.json().catch(() => undefined) as { error?: string; snapshot?: RoomSnapshot } | undefined;
    if (!response.ok) {
      setStatus("error");
      setError(body?.error ?? "Unable to release seat");
      return false;
    }
    removeStoredIdentity(roomId);
    setIdentity(undefined);
    if (body?.snapshot) setSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
    return true;
  }, [identity?.token, roomId]);

  const sendAction = useCallback(async (action: RoomActionCommand) => {
    if (!roomId || !identity?.token || !snapshot) return false;
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-room-token": identity.token,
      },
      body: JSON.stringify({ baseVersion: snapshot.version, action }),
    });
    const body = await response.json().catch(() => undefined) as { error?: string; snapshot?: RoomSnapshot } | undefined;
    if (!response.ok) {
      if (body?.snapshot) setSnapshot(body.snapshot);
      setStatus("error");
      setError(body?.error ?? "Unable to apply room action");
      return false;
    }
    if (body?.snapshot) {
      setSnapshot(body.snapshot);
      setStatus("ready");
      setError(null);
    }
    return true;
  }, [identity?.token, roomId, snapshot]);

  const leaveRoom = useCallback(() => {
    loadGenerationRef.current += 1;
    setRoomUrl();
    setRoomId("");
    setSnapshot(null);
    setIdentity(undefined);
    setStatus("idle");
    setError(null);
  }, []);

  return useMemo(() => ({
    claimSeat,
    claimedPlayerId: snapshot?.viewerPlayerId,
    createRoom,
    error,
    inRoom: Boolean(roomId),
    joinRoom,
    leaveRoom,
    releaseSeat,
    roomId,
    sendAction,
    snapshot,
    status,
  }), [claimSeat, createRoom, error, joinRoom, leaveRoom, releaseSeat, roomId, sendAction, snapshot, status]);
}
