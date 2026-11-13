"use client";

import type { TableStatusDto } from "@nodedr-restaurant/types";
import { ClipboardList, Merge, Plus, QrCode, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateTableStatus, type RestaurantTable } from "@/hooks/use-tables";
import { cn } from "@/lib/utils";
import { BillTableDialog } from "./bill-table-dialog";
import { ElapsedTimer } from "./elapsed-timer";
import { MergeTableDialog } from "./merge-table-dialog";
import { TableQrDialog } from "./table-qr-dialog";
import { TableShapeIcon } from "./table-shape-icon";

const STATUS_STYLES: Record<TableStatusDto, string> = {
  AVAILABLE: "bg-success/10 border-success/30 text-success",
  OCCUPIED: "bg-primary/10 border-primary/30 text-primary",
  RESERVED: "bg-warning/10 border-warning/30 text-warning",
  CLEANING: "bg-muted border-border text-muted-foreground",
  OUT_OF_SERVICE: "bg-muted border-border text-muted-foreground opacity-60",
};

const STATUS_LABEL: Record<TableStatusDto, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
  OUT_OF_SERVICE: "Out of service",
};

export function TableTile({
  table,
  allTables,
  branchId,
  style,
}: {
  table: RestaurantTable;
  allTables: RestaurantTable[];
  branchId: string | null;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const updateStatus = useUpdateTableStatus(branchId);
  const [qrOpen, setQrOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          style={style}
          className={cn(
            "absolute flex flex-col items-center justify-center gap-1 rounded-2xl border-2 text-xs font-medium shadow-sm transition-transform hover:scale-[1.03]",
            STATUS_STYLES[table.status],
          )}
        >
          <TableShapeIcon shape={table.shape} capacity={table.capacity} className="h-6 w-6" />
          <span className="text-sm font-semibold">{table.name ?? `T${table.number}`}</span>
          <span className="flex items-center gap-1 text-[11px] opacity-80">
            <Users className="h-3 w-3" />
            {table.capacity}
          </span>
          {(table.status === "OCCUPIED" || table.status === "RESERVED") && (
            <ElapsedTimer since={table.statusSince} className="flex items-center gap-1 text-[10px] opacity-70" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {STATUS_LABEL[table.status]} · {table.capacity} guests
          </div>
          {(Object.keys(STATUS_LABEL) as TableStatusDto[]).map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={status === table.status}
              onClick={() => {
                updateStatus.mutate(
                  { id: table.id, status },
                  {
                    onSuccess: () => {
                      toast.success(`Table ${table.name ?? `T${table.number}`} marked ${STATUS_LABEL[status]}`);
                    },
                    onError: (err) => {
                      const msg = err instanceof ApiError ? err.message : "Could not update table status";
                      if (msg.includes("open bill")) {
                        toast.error(msg, {
                          action: {
                            label: "Force Release",
                            onClick: () => {
                              if (
                                confirm(
                                  `Table ${table.name ?? `T${table.number}`} has an open bill. Force cancel the open order and mark table ${STATUS_LABEL[status]}?`,
                                )
                              ) {
                                updateStatus.mutate(
                                  { id: table.id, status, force: true },
                                  {
                                    onSuccess: () =>
                                      toast.success(`Table ${table.name ?? `T${table.number}`} freed successfully`),
                                    onError: (e) =>
                                      toast.error(e instanceof ApiError ? e.message : "Could not force release table"),
                                  },
                                );
                              }
                            },
                          },
                          duration: 8000,
                        });
                      } else {
                        toast.error(msg);
                      }
                    },
                  },
                );
              }}
            >
              {STATUS_LABEL[status]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            View QR code
          </DropdownMenuItem>
          {(table.status === "AVAILABLE" || table.status === "RESERVED") && (
            <DropdownMenuItem onClick={() => router.push(`/pos?tableId=${table.id}`)}>
              <Plus className="h-4 w-4" />
              New order
            </DropdownMenuItem>
          )}
          {table.status === "OCCUPIED" && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/pos?tableId=${table.id}`)}>
                <Plus className="h-4 w-4" />
                Add another round
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBillOpen(true)}>
                <ClipboardList className="h-4 w-4" />
                Bill this table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMergeOpen(true)}>
                <Merge className="h-4 w-4" />
                Merge another table&apos;s bill here
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TableQrDialog table={table} branchId={branchId} open={qrOpen} onOpenChange={setQrOpen} />
      <MergeTableDialog
        branchId={branchId}
        table={table}
        allTables={allTables}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
      />
      <BillTableDialog branchId={branchId} table={table} open={billOpen} onOpenChange={setBillOpen} />
    </>
  );
}
