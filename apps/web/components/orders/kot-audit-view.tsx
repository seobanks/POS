"use client";

import { useMemo, useState } from "react";
import {
  ChefHat,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useKots, type KotAuditItem } from "@/hooks/use-orders";
import { usePrintKot } from "@/hooks/use-print";
import { openEntity } from "@/lib/entity-events";
import { cn } from "@/lib/utils";

export interface KotAuditViewProps {
  branchId: string | null;
}

export function KotAuditView({ branchId }: KotAuditViewProps) {
  // Filters
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const {
    data: kots = [],
    isLoading,
    refetch,
    isRefetching,
  } = useKots(branchId, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    orderType: orderTypeFilter || undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const printKot = usePrintKot(branchId);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  // Paginated slice
  const paginatedKots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return kots.slice(start, start + pageSize);
  }, [kots, currentPage]);

  const totalPages = Math.max(1, Math.ceil(kots.length / pageSize));

  // Export to Excel / CSV
  const handleExportCsv = () => {
    if (kots.length === 0) {
      toast.error("No KOT records to export");
      return;
    }

    const headers = [
      "KOT ID",
      "Order Number",
      "Order Type",
      "Table",
      "Customer Name",
      "Customer Phone",
      "No. Of Items",
      "Items",
      "Status",
      "Modified",
      "Bill Print Date",
      "Complete Duration (Mins)",
      "Created At",
      "Created By",
    ];

    const rows = kots.map((k) => [
      k.ticketNumber,
      k.orderNumber,
      k.orderType,
      k.tableName || "—",
      k.customerName || "—",
      k.customerPhone || "—",
      k.itemCount,
      `"${k.itemsSummary.replace(/"/g, '""')}"`,
      k.status,
      k.isModified ? "YES" : "NO",
      k.billPrintDate
        ? new Date(k.billPrintDate).toLocaleString("en-IN")
        : "—",
      k.completeDuration,
      new Date(k.createdAt).toLocaleString("en-IN"),
      k.createdBy || "—",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `kot_audit_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("KOT audit log exported successfully!");
  };

  const handleReprintKot = (kot: KotAuditItem) => {
    setReprintingId(kot.id);
    printKot.mutate(
      { orderId: kot.orderId, reprint: true },
      {
        onSuccess: () => {
          setReprintingId(null);
          toast.success(
            `KOT #${kot.ticketNumber} re-sent to kitchen station thermal printer!`,
          );
        },
        onError: (err: any) => {
          setReprintingId(null);
          toast.error(err?.message || "Could not reprint KOT");
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Export (Matches Petpooja Image 5) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Kitchen Order Tickets (KOT)
            </h2>
            <p className="text-xs text-muted-foreground">
              Master audit trail, preparation tracking and thermal reprint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:bg-secondary"
            onClick={handleExportCsv}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar (Matches Petpooja Image 5) */}
      <Card className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Start Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-xl text-xs border-border"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-xl text-xs border-border"
            />
          </div>

          {/* All Order Type */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              All Order Type
            </label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="w-full h-9 rounded-xl text-xs border border-border bg-background px-3 text-foreground"
            >
              <option value="">All Order Types</option>
              <option value="DINE_IN">Dine In</option>
              <option value="TAKEAWAY">Pick up / Takeaway</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              KOT Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 rounded-xl text-xs border border-border bg-background px-3 text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="NEW">Not Prepared</option>
              <option value="IN_PROGRESS">Preparing</option>
              <option value="READY">Ready</option>
              <option value="SERVED">Served</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Search KOT / Table / Order
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-xl text-xs border-border"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl text-xs font-semibold border-border hover:bg-secondary"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setOrderTypeFilter("");
              setStatusFilter("");
              setSearchQuery("");
            }}
          >
            Show All
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => void refetch()}
          >
            Search
          </Button>
        </div>
      </Card>

      {/* KOT Master Audit Table (Matches Petpooja Image 5) */}
      <Card className="rounded-2xl border border-border overflow-hidden shadow-xs bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border/80">
              <tr>
                <th className="p-3">KOT ID</th>
                <th className="p-3">Order Type</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Customer Phone</th>
                <th className="p-3 text-center">No. Of Items</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Bill Print Date</th>
                <th className="p-3 text-center">Complete Duration</th>
                <th className="p-3">Created ↓</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading KOT audit tickets…
                  </td>
                </tr>
              ) : paginatedKots.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-muted-foreground">
                    No KOT records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedKots.map((kot) => {
                  const statusLabel =
                    kot.status === "NEW"
                      ? "Not Prepared"
                      : kot.status === "IN_PROGRESS"
                        ? "Preparing"
                        : kot.status === "READY"
                          ? "Ready"
                          : kot.status === "SERVED"
                            ? "Served"
                            : "Cancelled";

                  return (
                    <tr
                      key={kot.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      {/* KOT ID */}
                      <td className="p-3 font-bold text-foreground tabular-nums">
                        #{kot.ticketNumber}
                      </td>

                      {/* Order Type & Table */}
                      <td className="p-3">
                        <span className="font-semibold text-foreground block">
                          {kot.orderType === "DINE_IN"
                            ? `Dine In${kot.tableName ? ` (${kot.tableName})` : ""}`
                            : kot.orderType === "TAKEAWAY"
                              ? "Pick up"
                              : "Delivery"}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="p-3 font-medium text-foreground">
                        {kot.customerName || "—"}
                      </td>

                      {/* Customer Phone */}
                      <td className="p-3 text-muted-foreground tabular-nums">
                        {kot.customerPhone || "—"}
                      </td>

                      {/* No. Of Items */}
                      <td className="p-3 text-center font-bold tabular-nums text-foreground">
                        {kot.itemCount}
                      </td>

                      {/* Items Summary */}
                      <td
                        className="p-3 max-w-[240px] truncate text-foreground font-medium"
                        title={kot.itemsSummary}
                      >
                        {kot.itemsSummary}
                      </td>

                      {/* Status + Modified badge */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold inline-block",
                              kot.status === "READY" || kot.status === "SERVED"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : kot.status === "IN_PROGRESS"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : kot.status === "CANCELLED"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {statusLabel}
                          </span>

                          {kot.isModified && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              Modified KOT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bill Print Date */}
                      <td className="p-3 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                        {kot.billPrintDate
                          ? new Date(kot.billPrintDate).toLocaleTimeString(
                              "en-IN",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "—"}
                      </td>

                      {/* Complete Duration */}
                      <td className="p-3 text-center tabular-nums text-foreground font-medium">
                        {kot.completeDuration > 0
                          ? `${kot.completeDuration} min`
                          : "—"}
                      </td>

                      {/* Created Time */}
                      <td className="p-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(kot.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        {new Date(kot.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEntity("Order", kot.orderId)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="View Full Order"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReprintKot(kot)}
                            disabled={reprintingId === kot.id}
                            className="p-1.5 rounded-lg hover:bg-secondary text-orange-600 dark:text-orange-400 transition-colors"
                            title="Reprint KOT to Thermal Printer"
                          >
                            {reprintingId === kot.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination & Status Legend (Matches Petpooja Image 5) */}
        <div className="p-3.5 border-t border-border/80 bg-secondary/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, kots.length)} of {kots.length}{" "}
              records
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Modified KOT
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs rounded-lg border-border"
            >
              Prev
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-bold transition-all",
                    currentPage === pageNum
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs rounded-lg border-border"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
