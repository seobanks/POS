"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { REALTIME_EVENTS, realtimeInvalidations } from "@/lib/realtime-keys";
import { setRealtimeState } from "@/lib/realtime-status";
import { getSharedSocket, releaseSharedSocket } from "@/lib/realtime-socket";

// Shared socket connection per active branch, joined to the branch's room
// server-side (see backend RealtimeGateway). Invalidates the relevant
// TanStack Query caches on push events instead of polling — this is what
// lets KDS/table screens update instantly across terminals.
//
// Pushes are not queued for a client that is away, so whenever the socket
// (re)connects after having been down, every cached query is refetched once:
// that is what makes a screen catch up after Wi-Fi drops, a sleeping tablet or
// a server restart instead of showing the state from before the gap.
//
// When running in an environment without persistent WebSockets (such as Vercel
// serverless without NEXT_PUBLIC_WS_URL), this safely stays offline and relies
// on TanStack Query's automatic periodic refetches.
export function useRealtime(branchId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!branchId) return;

    const socket = getSharedSocket(branchId);
    if (!socket) {
      setRealtimeState("offline");
      return;
    }

    let wasDown = false;

    const onConnect = () => {
      setRealtimeState("live");
      if (wasDown) {
        wasDown = false;
        void queryClient.invalidateQueries();
      }
    };
    const onDown = () => {
      wasDown = true;
      setRealtimeState("offline");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDown);
    socket.on("connect_error", onDown);

    if (socket.connected) {
      setRealtimeState("live");
    }

    const unbindList: Array<() => void> = [];

    for (const event of REALTIME_EVENTS) {
      const handler = () => {
        realtimeInvalidations(event, branchId).forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
      };
      socket.on(event, handler);
      unbindList.push(() => socket.off(event, handler));
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDown);
      socket.off("connect_error", onDown);
      unbindList.forEach((unbind) => unbind());
      releaseSharedSocket(socket);
      setRealtimeState("connecting");
    };
  }, [branchId, queryClient]);
}
