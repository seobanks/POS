import { io, Socket } from "socket.io-client";
import { resolveWsUrl } from "./ws-url";

let sharedSocket: Socket | null = null;
let currentBranchId: string | null = null;
let refCount = 0;
let hasWarnedOffline = false;

/**
 * Returns a shared Socket.IO client instance for the active branch, or null
 * if realtime is disabled or unavailable on the current hosting environment (e.g. Vercel).
 *
 * Reuses a single connection across all subscribed hooks (useRealtime, NotificationBell,
 * useKdsSound) instead of opening multiple duplicate connections.
 */
export function getSharedSocket(branchId: string): Socket | null {
  const wsUrl = resolveWsUrl();
  if (!wsUrl) return null;

  if (sharedSocket && currentBranchId === branchId) {
    refCount++;
    return sharedSocket;
  }

  // Branch switched or new connection needed: tear down existing socket
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    currentBranchId = null;
    refCount = 0;
  }

  currentBranchId = branchId;
  refCount = 1;

  sharedSocket = io(wsUrl, {
    query: { branchId },
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 5000,
  });

  sharedSocket.on("connect_error", () => {
    if (!hasWarnedOffline) {
      hasWarnedOffline = true;
      if (typeof console !== "undefined") {
        console.warn(
          "[Realtime] WebSocket connection unavailable. Operating in automatic periodic polling fallback mode.",
        );
      }
    }
  });

  sharedSocket.on("connect", () => {
    hasWarnedOffline = false;
  });

  return sharedSocket;
}

/**
 * Decrements the subscriber count. When all consumers unmount, cleanly closes the socket.
 */
export function releaseSharedSocket(socket: Socket | null): void {
  if (!socket || sharedSocket !== socket) return;

  refCount--;
  if (refCount <= 0) {
    sharedSocket.disconnect();
    sharedSocket = null;
    currentBranchId = null;
    refCount = 0;
  }
}
