/**
 * Offline POS IndexedDB Layer
 * Database: hanva_pos_offline (version 1)
 *
 * Stores:
 * - menu_cache: cached menu categories and items per branch
 * - tables_cache: cached floor and table layout per branch
 * - offline_orders: queue of orders created while offline
 */

export interface QueuedOfflineOrderItem {
  menuItemId: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  kitchenNote?: string;
  modifiers?: { modifierId?: string; nameSnapshot: string; price: number }[];
}

export interface QueuedOfflineOrderPayment {
  method: string;
  amount: number;
}

export interface QueuedOfflineOrder {
  id: string; // e.g. "offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}"
  offlineOrderNumber: string; // e.g. "OFF-101"
  branchId: string;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId?: string | null;
  guestCount?: number;
  notes?: string | null;
  items: QueuedOfflineOrderItem[];
  payments?: QueuedOfflineOrderPayment[];
  createdAt: string;
  status: "PENDING_SYNC" | "SYNCED" | "FAILED";
  syncError?: string;
  serverOrderId?: string;
  serverOrderNumber?: string;
}

export interface CachedMenu {
  branchId: string;
  categories: any[];
  items: any[];
  cachedAt: number;
  [key: string]: any;
}

export interface CachedTables {
  branchId: string;
  floors: any[];
  tables: any[];
  cachedAt: number;
  [key: string]: any;
}

const DB_NAME = "hanva_pos_offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // 1. menu_cache store: keyed by branchId
      if (!db.objectStoreNames.contains("menu_cache")) {
        db.createObjectStore("menu_cache", { keyPath: "branchId" });
      }

      // 2. tables_cache store: keyed by branchId
      if (!db.objectStoreNames.contains("tables_cache")) {
        db.createObjectStore("tables_cache", { keyPath: "branchId" });
      }

      // 3. offline_orders store: keyed by id, with indices on status and branchId
      if (!db.objectStoreNames.contains("offline_orders")) {
        const orderStore = db.createObjectStore("offline_orders", { keyPath: "id" });
        orderStore.createIndex("status", "status", { unique: false });
        orderStore.createIndex("branchId", "branchId", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Cache menu data (categories, items) for a branch in IndexedDB.
 */
export async function cacheMenu(branchId: string, data: any): Promise<void> {
  if (!branchId) return;
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("menu_cache", "readwrite");
      const store = tx.objectStore("menu_cache");
      const record: CachedMenu = {
        branchId,
        categories: data?.categories ?? [],
        items: data?.items ?? [],
        ...data,
        cachedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[offline-db] Failed to cache menu:", err);
  }
}

/**
 * Get cached menu data for a branch.
 */
export async function getCachedMenu(branchId: string): Promise<CachedMenu | null> {
  if (!branchId) return null;
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("menu_cache", "readonly");
      const store = tx.objectStore("menu_cache");
      const req = store.get(branchId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Cache table/floor layout data for a branch in IndexedDB.
 */
export async function cacheTables(branchId: string, data: any): Promise<void> {
  if (!branchId) return;
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tables_cache", "readwrite");
      const store = tx.objectStore("tables_cache");
      const record: CachedTables = {
        branchId,
        floors: data?.floors ?? [],
        tables: data?.tables ?? [],
        ...data,
        cachedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[offline-db] Failed to cache tables:", err);
  }
}

/**
 * Get cached tables/floors data for a branch.
 */
export async function getCachedTables(branchId: string): Promise<CachedTables | null> {
  if (!branchId) return null;
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tables_cache", "readonly");
      const store = tx.objectStore("tables_cache");
      const req = store.get(branchId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Save an offline order into IndexedDB.
 */
export async function saveOfflineOrder(order: QueuedOfflineOrder): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_orders", "readwrite");
    const store = tx.objectStore("offline_orders");
    const req = store.put(order);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all pending offline orders, optionally filtered by branchId.
 */
export async function getPendingOfflineOrders(branchId?: string): Promise<QueuedOfflineOrder[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_orders", "readonly");
      const store = tx.objectStore("offline_orders");
      const index = store.index("status");
      const req = index.getAll("PENDING_SYNC");

      req.onsuccess = () => {
        let orders: QueuedOfflineOrder[] = req.result || [];
        if (branchId) {
          orders = orders.filter((o) => o.branchId === branchId);
        }
        // Oldest first (FIFO order)
        orders.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        resolve(orders);
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Mark an offline order as SYNCED with server order ID and order number.
 */
export async function markOfflineOrderSynced(
  id: string,
  serverOrderId: string,
  serverOrderNumber: string,
): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_orders", "readwrite");
      const store = tx.objectStore("offline_orders");
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const order = getReq.result as QueuedOfflineOrder | undefined;
        if (!order) return resolve();
        order.status = "SYNCED";
        order.serverOrderId = serverOrderId;
        order.serverOrderNumber = serverOrderNumber;
        order.syncError = undefined;
        const putReq = store.put(order);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn(`[offline-db] Failed to mark order ${id} as synced:`, err);
  }
}

/**
 * Mark an offline order as FAILED with error message.
 */
export async function markOfflineOrderFailed(id: string, error: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_orders", "readwrite");
      const store = tx.objectStore("offline_orders");
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const order = getReq.result as QueuedOfflineOrder | undefined;
        if (!order) return resolve();
        order.status = "FAILED";
        order.syncError = error;
        const putReq = store.put(order);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn(`[offline-db] Failed to mark order ${id} as failed:`, err);
  }
}

/**
 * Get count of offline orders (pending and total).
 */
export async function getOfflineOrdersCount(
  branchId?: string,
): Promise<{ pending: number; total: number }> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_orders", "readonly");
      const store = tx.objectStore("offline_orders");
      const req = store.getAll();

      req.onsuccess = () => {
        let orders: QueuedOfflineOrder[] = req.result || [];
        if (branchId) {
          orders = orders.filter((o) => o.branchId === branchId);
        }
        const pending = orders.filter((o) => o.status === "PENDING_SYNC").length;
        resolve({ pending, total: orders.length });
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return { pending: 0, total: 0 };
  }
}

/**
 * Generate a unique client-side offline order ID.
 */
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a readable sequential offline order number (e.g. OFF-101, OFF-102).
 */
export async function generateOfflineOrderNumber(branchId?: string): Promise<string> {
  const counts = await getOfflineOrdersCount(branchId);
  return `OFF-${100 + counts.total + 1}`;
}
