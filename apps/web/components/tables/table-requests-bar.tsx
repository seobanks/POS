"use client";

import { BellRing, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResolveTableRequest, useTableRequests } from "@/hooks/use-tables";

/** Guest "call waiter" / "request bill" taps from the table QR page. */
export function TableRequestsBar({ branchId }: { branchId: string | null }) {
  const { data } = useTableRequests(branchId);
  const resolve = useResolveTableRequest(branchId);

  if (!data || data.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      {data.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-foreground">
            {r.type === "BILL" ? <Receipt className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
            {r.table.name ?? `Table ${r.table.number}`} —{" "}
            {r.type === "BILL" ? "wants the bill" : "needs a waiter"}
          </span>
          <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate(r.id)}>
            Done
          </Button>
        </div>
      ))}
    </div>
  );
}
