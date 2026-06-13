import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoomActionCommand } from "./room-actions";
import type { RoomSnapshot } from "./room-state";

type StoredRoomIdentity = {
  playerId: string;
  token: string;
};

type RoomStatus = "idle" | "loading" | "ready" | "error";
export type RoomSyncMode = "events" | "poll";

const roomPollIntervalMs = 1500;

function roomIdFromLocation() {
  return new URL(window.location.href).searchParams.get("room")?.trim().toUpperCase() || "";
}

function roomSyncModeFromLocation(): RoomSyncMode {
  const url = new URL(window.location.href);
  const requestedSync = url.searchParams.get("sync")?.trim().toLowerCase();
  if (requestedSync === "events") return "events";
  if (requestedSync === "poll") return "poll";
  const hostname = url.hostname.toLowerCase();
  return hostname === "trycloudflare.com" || hostname.endsWith(".trycloudflare.com") ? "poll" : "events";
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

function roomHeaders(token: string | undefined, syncMode?: RoomSyncMode, roomVersion?: number) {
  const headers: Record<string, string> = {};
  if (token) headers["x-room-token"] = token;
  if (syncMode === "poll") headers["x-room-sync"] = "poll";
  if (syncMode === "poll" && roomVersion !== undefined) headers["x-room-version"] = String(roomVersion);
  return Object.keys(headers).length ? headers : undefined;
}

async function fetchRoom(roomId: string, token?: string, syncMode?: RoomSyncMode, roomVersion?: number) {
  const response = await fetch(`/api/rooms/${roomId}`, {
    headers: roomHeaders(token, syncMode, roomVersion),
  });
  if (response.status === 204) return undefined;
  if (!response.ok) throw new Error((await response.json().catch(() => undefined))?.error ?? "Room not found");
  return await response.json() as RoomSnapshot;
}

export function useRoomSession() {
  const [roomId, setRoomId] = useState(() => roomIdFromLocation());
  const [status, setStatus] = useState<RoomStatus>(() => roomIdFromLocation() ? "loading" : "idle");
  const [syncMode, setSyncMode] = useState<RoomSyncMode>(() => roomSyncModeFromLocation());
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const roomIdRef = useRef(roomId);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const syncGenerationRef = useRef(0);
  const loadGenerationRef = useRef(0);
  const mutationGenerationRef = useRef(0);
  const [identity, setIdentity] = useState<StoredRoomIdentity | undefined>(() => {
    const initialRoomId = roomIdFromLocation();
    return initialRoomId ? readStoredIdentity(initialRoomId) : undefined;
  });
  const identityRef = useRef<StoredRoomIdentity | undefined>(identity);

  function storeSnapshot(nextSnapshot: RoomSnapshot | null) {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  }

  function storeRoomId(nextRoomId: string) {
    roomIdRef.current = nextRoomId;
    setRoomId(nextRoomId);
  }

  function storeIdentity(nextIdentity: StoredRoomIdentity | undefined) {
    identityRef.current = nextIdentity;
    setIdentity(nextIdentity);
  }

  function startRoomMutation() {
    const generation = mutationGenerationRef.current + 1;
    mutationGenerationRef.current = generation;
    return generation;
  }

  function mutationIsCurrent(generation: number, mutationRoomId: string) {
    return mutationGenerationRef.current === generation && roomIdRef.current === mutationRoomId;
  }

  const acceptSnapshot = useCallback((snapshotRoomId: string, token: string | undefined, nextSnapshot: RoomSnapshot) => {
    setSnapshot((currentSnapshot) => {
      const currentIdentity = identityRef.current;
      const tokenClearsCurrentIdentity = Boolean(token && token === currentIdentity?.token && !nextSnapshot.viewerPlayerId);
      const tokenRepairsCurrentIdentity = Boolean(
        token &&
          token === currentIdentity?.token &&
          nextSnapshot.viewerPlayerId &&
          nextSnapshot.viewerPlayerId !== currentIdentity.playerId
      );
      if (
        currentSnapshot &&
        currentSnapshot.roomId === nextSnapshot.roomId &&
        nextSnapshot.version < currentSnapshot.version
      ) {
        snapshotRef.current = currentSnapshot;
        return currentSnapshot;
      }
      if (tokenClearsCurrentIdentity) {
        removeStoredIdentity(snapshotRoomId);
        storeIdentity(undefined);
      } else if (tokenRepairsCurrentIdentity && token && nextSnapshot.viewerPlayerId) {
        const repairedIdentity = { playerId: nextSnapshot.viewerPlayerId, token };
        writeStoredIdentity(snapshotRoomId, repairedIdentity);
        storeIdentity(repairedIdentity);
      }
      if (
        currentSnapshot &&
        currentSnapshot.roomId === nextSnapshot.roomId &&
        currentSnapshot.viewerPlayerId !== nextSnapshot.viewerPlayerId &&
        !tokenClearsCurrentIdentity &&
        !tokenRepairsCurrentIdentity &&
        (
          currentSnapshot.version >= nextSnapshot.version ||
          currentSnapshot.viewerPlayerId === currentIdentity?.playerId ||
          nextSnapshot.viewerPlayerId !== currentIdentity?.playerId
        )
      ) {
        snapshotRef.current = currentSnapshot;
        return currentSnapshot;
      }
      if (
        currentSnapshot &&
        currentSnapshot.roomId === nextSnapshot.roomId &&
        currentSnapshot.version === nextSnapshot.version &&
        currentSnapshot.viewerPlayerId === nextSnapshot.viewerPlayerId
      ) {
        snapshotRef.current = currentSnapshot;
        return currentSnapshot;
      }
      snapshotRef.current = nextSnapshot;
      return nextSnapshot;
    });
    setStatus("ready");
    setError(null);
  }, []);

  const loadRoom = useCallback(async (nextRoomId: string, nextIdentity = readStoredIdentity(nextRoomId)) => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    syncGenerationRef.current += 1;
    mutationGenerationRef.current += 1;
    setStatus("loading");
    setError(null);
    const nextSyncMode = roomSyncModeFromLocation();
    setSyncMode(nextSyncMode);
    storeRoomId(nextRoomId);
    storeIdentity(nextIdentity);
    storeSnapshot(null);
    try {
      const nextSnapshot = await fetchRoom(nextRoomId, nextIdentity?.token, nextSyncMode);
      if (loadGenerationRef.current !== generation) return;
      if (!nextSnapshot) return;
      acceptSnapshot(nextRoomId, nextIdentity?.token, nextSnapshot);
    } catch (loadError) {
      if (loadGenerationRef.current !== generation) return;
      storeSnapshot(null);
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Unable to load room");
    }
  }, [acceptSnapshot]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoomId = roomIdFromLocation();
      setSyncMode(roomSyncModeFromLocation());
      if (!nextRoomId) {
        loadGenerationRef.current += 1;
        syncGenerationRef.current += 1;
        mutationGenerationRef.current += 1;
        storeRoomId("");
        storeSnapshot(null);
        storeIdentity(undefined);
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
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!roomId || syncMode !== "events") return undefined;
    const token = identity?.token;
    const eventsUrl = `/api/rooms/${roomId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    let active = true;
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    const events = new EventSource(eventsUrl);
    eventSourceRef.current = events;
    events.addEventListener("room", (event) => {
      if (!active || syncGenerationRef.current !== generation) return;
      const nextSnapshot = JSON.parse((event as MessageEvent).data) as RoomSnapshot;
      acceptSnapshot(roomId, token, nextSnapshot);
    });
    events.onerror = () => {
      if (!active || syncGenerationRef.current !== generation) return;
      setSyncMode("poll");
      setError(null);
      events.close();
    };
    return () => {
      active = false;
      events.close();
      if (eventSourceRef.current === events) eventSourceRef.current = null;
    };
  }, [acceptSnapshot, identity?.token, roomId, syncMode]);

  useEffect(() => {
    if (!roomId || syncMode !== "poll") return undefined;
    const token = identity?.token;
    let active = true;
    let pollTimeoutId: number | undefined;
    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    const pollRoom = async () => {
      try {
        const currentSnapshot = snapshotRef.current;
        const knownVersion =
          currentSnapshot?.roomId === roomId &&
          currentSnapshot.viewerPlayerId === identity?.playerId
            ? currentSnapshot.version
            : undefined;
        const nextSnapshot = await fetchRoom(roomId, token, "poll", knownVersion);
        if (!active || syncGenerationRef.current !== generation) return;
        if (!nextSnapshot) {
          setStatus("ready");
          setError(null);
          return;
        }
        acceptSnapshot(roomId, token, nextSnapshot);
      } catch (pollError) {
        if (!active || syncGenerationRef.current !== generation) return;
        setStatus("error");
        setError(pollError instanceof Error ? pollError.message : "Unable to refresh room");
      } finally {
        if (active && syncGenerationRef.current === generation) {
          pollTimeoutId = window.setTimeout(() => {
            void pollRoom();
          }, roomPollIntervalMs);
        }
      }
    };
    void pollRoom();
    return () => {
      active = false;
      if (pollTimeoutId !== undefined) window.clearTimeout(pollTimeoutId);
    };
  }, [acceptSnapshot, identity?.playerId, identity?.token, roomId, syncMode]);

  const createRoom = useCallback(async () => {
    loadGenerationRef.current += 1;
    syncGenerationRef.current += 1;
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomIdRef.current;
    setStatus("loading");
    setError(null);
    setSyncMode(roomSyncModeFromLocation());
    storeSnapshot(null);
    const response = await fetch("/api/rooms", { method: "POST" });
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return;
    if (!response.ok) {
      setStatus("error");
      setError("Room server is not available");
      return;
    }
    const nextSnapshot = await response.json() as RoomSnapshot;
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return;
    setRoomUrl(nextSnapshot.roomId);
    storeRoomId(nextSnapshot.roomId);
    storeSnapshot(nextSnapshot);
    storeIdentity(undefined);
    setStatus("ready");
    setError(null);
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
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomId;
    const response = await fetch(`/api/rooms/${roomId}/seats/${encodeURIComponent(playerId)}/claim`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(syncMode === "poll" ? { "x-room-sync": "poll" } : {}) },
      body: JSON.stringify({ name, token: identity?.token }),
    });
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return;
    if (!response.ok) {
      const body = await response.json().catch(() => undefined) as { error?: string } | undefined;
      if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return;
      setStatus("error");
      setError(body?.error ?? "Unable to claim seat");
      return;
    }
    const body = await response.json() as { token: string; snapshot: RoomSnapshot };
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return;
    const nextIdentity = { playerId, token: body.token };
    writeStoredIdentity(roomId, nextIdentity);
    storeIdentity(nextIdentity);
    storeSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
  }, [identity?.token, roomId, syncMode]);

  const releaseSeat = useCallback(async (playerId: string) => {
    if (!roomId || !identity?.token) return false;
    loadGenerationRef.current += 1;
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomId;
    const response = await fetch(`/api/rooms/${roomId}/seats/${encodeURIComponent(playerId)}/release`, {
      method: "POST",
      headers: { "x-room-token": identity.token },
    });
    const body = await response.json().catch(() => undefined) as { error?: string; snapshot?: RoomSnapshot } | undefined;
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return false;
    if (!response.ok) {
      setStatus("error");
      setError(body?.error ?? "Unable to release seat");
      return false;
    }
    removeStoredIdentity(roomId);
    storeIdentity(undefined);
    if (body?.snapshot) storeSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
    return true;
  }, [identity?.token, roomId]);

  const fillAiOpponents = useCallback(async () => {
    if (!roomId || !identity?.token) return false;
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomId;
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/ai/fill`, {
      method: "POST",
      headers: { "x-room-token": identity.token },
    });
    const body = await response.json().catch(() => undefined) as { error?: string; snapshot?: RoomSnapshot } | undefined;
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return false;
    if (!response.ok) {
      if (body?.snapshot) storeSnapshot(body.snapshot);
      setStatus("error");
      setError(body?.error ?? "Unable to fill AI opponents");
      return false;
    }
    if (body?.snapshot) storeSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
    return true;
  }, [identity?.token, roomId]);

  const startRoom = useCallback(async () => {
    if (!roomId || !identity?.token) return false;
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomId;
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/start`, {
      method: "POST",
      headers: { "x-room-token": identity.token },
    });
    const body = await response.json().catch(() => undefined) as { error?: string; snapshot?: RoomSnapshot } | undefined;
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return false;
    if (!response.ok) {
      if (body?.snapshot) storeSnapshot(body.snapshot);
      setStatus("error");
      setError(body?.error ?? "Unable to start room");
      return false;
    }
    if (body?.snapshot) storeSnapshot(body.snapshot);
    setStatus("ready");
    setError(null);
    return true;
  }, [identity?.token, roomId]);

  const sendAction = useCallback(async (action: RoomActionCommand) => {
    if (
      !roomId ||
      !identity?.token ||
      !identity.playerId ||
      !snapshot ||
      snapshot.roomId !== roomId ||
      snapshot.viewerPlayerId !== identity.playerId
    ) {
      return false;
    }
    const mutationGeneration = startRoomMutation();
    const mutationRoomId = roomId;
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
    if (!mutationIsCurrent(mutationGeneration, mutationRoomId)) return false;
    if (!response.ok) {
      if (body?.snapshot) storeSnapshot(body.snapshot);
      setStatus("error");
      setError(body?.error ?? "Unable to apply room action");
      return false;
    }
    if (body?.snapshot) {
      storeSnapshot(body.snapshot);
      setStatus("ready");
      setError(null);
    }
    return true;
  }, [identity?.playerId, identity?.token, roomId, snapshot]);

  const leaveRoom = useCallback(() => {
    loadGenerationRef.current += 1;
    syncGenerationRef.current += 1;
    mutationGenerationRef.current += 1;
    setRoomUrl();
    storeRoomId("");
    storeSnapshot(null);
    storeIdentity(undefined);
    setStatus("idle");
    setError(null);
  }, []);

  return useMemo(() => ({
    claimSeat,
    claimedPlayerId: snapshot?.viewerPlayerId,
    createRoom,
    error,
    fillAiOpponents,
    inRoom: Boolean(roomId),
    joinRoom,
    leaveRoom,
    releaseSeat,
    roomId,
    sendAction,
    snapshot,
    startRoom,
    status,
    syncMode,
  }), [claimSeat, createRoom, error, fillAiOpponents, joinRoom, leaveRoom, releaseSeat, roomId, sendAction, snapshot, startRoom, status, syncMode]);
}
