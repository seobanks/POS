"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  generateOfflineId,
  generateOfflineOrderNumber,
  getOfflineOrdersCount,
  getPendingOfflineOrders,
  markOfflineOrderFailed,
  markOfflineOrderSynced,
  saveOfflineOrder as dbSaveOfflineOrder,
  type QueuedOfflineOrder,
} from "@/lib/offline-db";

export interface SaveOfflineOrderInput {
  branchId: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  guestCount?: number;
  notes?: string | null;
  items: {
    menuItemId: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    kitchenNote?: string;
    modifiers?: { modifierId?: string; nameSnapshot: string; price: number }[];
  }[];
  payments?: {
    method: string;
    amount: number;
  }[];
  id?: string;
  offlineOrderNumber?: string;
  createdAt?: string;
}

export interface UseOfflinePosOptions {
  branchId?: string | null;
  onSyncSuccess?: (syncedOrders: { offlineId: string; serverId: string; orderNumber: string }[]) => void;
}

export function useOfflinePos(options: UseOfflinePosOptions = {}) {
  const { branchId, onSyncSuccess } = options;
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const counts = await getOfflineOrdersCount(branchId || undefined);
      setPendingCount(counts.pending);
    } catch {
      // IndexedDB may not be ready or available
    }
  }, [branchId]);

  // Sync pending orders with the backend
  const syncPendingOrders = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    try {
      setIsSyncing(true);
      const pendingOrders = await getPendingOfflineOrders(branchId || undefined);
      if (pendingOrders.length === 0) {
        await refreshPendingCount();
        return;
      }

      const response = await api.post<{
        synced: { offlineId: string; serverId: string; orderNumber: string }[];
        failed: { offlineId: string; error: string }[];
      }>(`/orders/offline-sync${branchId ? `?branchId=${branchId}` : ""}`, {
        branchId: branchId || undefined,
        orders: pendingOrders,
      });

      if (response?.synced && response.synced.length > 0) {
        for (const item of response.synced) {
          await markOfflineOrderSynced(item.offlineId, item.serverId, item.orderNumber);
        }
        toast.success(
          `Synced ${response.synced.length} offline order${
            response.synced.length > 1 ? "s" : ""
          } with server!`,
        );
        onSyncSuccess?.(response.synced);
      }

      if (response?.failed && response.failed.length > 0) {
        for (const item of response.failed) {
          await markOfflineOrderFailed(item.offlineId, item.error);
        }
        toast.error(
          `Failed to sync ${response.failed.length} offline order(s). Please review in terminal.`,
        );
      }

      await refreshPendingCount();
    } catch (err: any) {
      console.error("[useOfflinePos] sync error:", err);
      toast.error(err?.message || "Sync failed. Will retry automatically.");
    } finally {
      setIsSyncing(false);
    }
  }, [branchId, refreshPendingCount, onSyncSuccess]);

  // Save an order locally
  const saveOfflineOrder = useCallback(
    async (orderData: SaveOfflineOrderInput): Promise<QueuedOfflineOrder> => {
      const id = orderData.id || generateOfflineId();
      const offlineOrderNumber =
        orderData.offlineOrderNumber ||
        (await generateOfflineOrderNumber(orderData.branchId));

      const queuedOrder: QueuedOfflineOrder = {
        ...orderData,
        id,
        offlineOrderNumber,
        createdAt: orderData.createdAt || new Date().toISOString(),
        status: "PENDING_SYNC",
      };

      await dbSaveOfflineOrder(queuedOrder);
      await refreshPendingCount();

      toast.success(
        `Order saved locally as #${queuedOrder.offlineOrderNumber} (Offline)`,
        {
          description: "Will automatically sync as soon as network is restored.",
        },
      );

      return queuedOrder;
    },
    [refreshPendingCount],
  );

  // Monitor network online/offline transitions & auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Online connection restored. Syncing offline orders...");
      void syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Connection lost. Working in offline mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check and auto-sync on mount if online
    void refreshPendingCount().then(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void syncPendingOrders();
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount, syncPendingOrders]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveOfflineOrder,
    syncPendingOrders,
    refreshPendingCount,
  };
}
