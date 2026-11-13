"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardTrends } from "@/hooks/use-dashboard";
import { useManagedOrders, type ManagedOrder } from "@/hooks/use-orders";
import { usePrintOrderUsb } from "@/hooks/use-print";
import { openEntity } from "@/lib/entity-events";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AllOrdersViewProps {
  branchId: string | null;
}

export function AllOrdersView({ branchId }: AllOrdersViewProps) {
  const [orderSubTab, setOrderSubTab] = useState<"order" | "advance">("order");
  const [trendDays, setTrendDays] = useState<number>(15);

  // Filters
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Selected orders for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Data fetching
  const { data: rawOrders = [], isLoading: ordersLoading } = useManagedOrders(
    branchId,
    "history",
  );
  const { data: activeOrders = [] } = useManagedOrders(branchId, "active");
  const { data: trendsData, isLoading: trendsLoading } =
    useDashboardTrends(branchId);
  const printUsb = usePrintOrderUsb(branchId);

  // Combine active + completed orders for comprehensive master log
  const combinedOrders = useMemo(() => {
    const map = new Map<string, ManagedOrder>();
    for (const o of activeOrders) map.set(o.id, o);
    for (const o of rawOrders) map.set(o.id, o);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeOrders, rawOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return combinedOrders.filter((order) => {
      // Order type filter
      if (orderTypeFilter !== "ALL" && order.type !== orderTypeFilter) {
        return false;
      }

      // Search query (order number, customer name, table)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer =
          order.customer?.name?.toLowerCase().includes(q) ||
          order.guestName?.toLowerCase().includes(q);
        const matchesTable =
          order.table?.name?.toLowerCase().includes(q) ||
          String(order.table?.number || "").includes(q);
        const matchesWaiter = order.createdBy?.name?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer && !matchesTable && !matchesWaiter) {
          return false;
        }
      }

      // Date range filter
      if (startDate) {
        const orderDate = new Date(order.createdAt).getTime();
        const start = new Date(startDate).getTime();
        if (orderDate < start) return false;
      }
      if (endDate) {
        const orderDate = new Date(order.createdAt).getTime();
        const end = new Date(endDate).getTime();
        if (orderDate > end) return false;
      }

      return true;
    });
  }, [combinedOrders, orderTypeFilter, searchQuery, startDate, endDate]);

  // Grand total of filtered orders
  const grandTotal = useMemo(() => {
    return filteredOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );
  }, [filteredOrders]);

  // Paginated slice
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!trendsData?.revenue || trendsData.revenue.length === 0) {
      return [];
    }
    return trendsData.revenue.slice(-trendDays).map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      amount: Math.round(Number(d.amount || 0)),
    }));
  }, [trendsData, trendDays]);

  // Export to Excel / CSV
  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order No",
      "Order Type",
      "Table",
      "Customer",
      "Assigned To",
      "Items",
      "Amount",
      "Tax",
      "Discount",
      "Grand Total",
      "Payment Method",
      "Status",
      "Created At",
    ];

    const rows = filteredOrders.map((o) => {
      const itemsList = o.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join("; ");
      const payment = o.payments?.map((p) => p.method).join(", ") || "—";
      const tableName = o.table?.name || (o.table ? `Table ${o.table.number}` : "—");
      return [
        o.orderNumber,
        o.type,
        tableName,
        o.customer?.name || o.guestName || "—",
        o.createdBy?.name || "—",
        `"${itemsList.replace(/"/g, '""')}"`,
        o.subtotal || o.totalAmount,
        o.taxAmount || "0.00",
        o.discountAmount || "0.00",
        o.totalAmount,
        payment,
        o.status,
        new Date(o.createdAt).toLocaleString("en-IN"),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `orders_report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders report downloaded successfully!");
  };

  const handlePrintThermal = (orderId: string, orderNumber: string) => {
    printUsb.mutate(
      { orderId, drawer: false },
      {
        onSuccess: () => toast.success(`Receipt printed for Order #${orderNumber}`),
        onError: (err: any) =>
          toast.error(err?.message || "Could not print receipt"),
      },
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map((o) => o.id)));
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Metrics (Matches Petpooja Image 4) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-3">
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOrderSubTab("order")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              orderSubTab === "order"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border/80 hover:bg-secondary",
            )}
          >
            Order
          </button>
          <button
            type="button"
            onClick={() => setOrderSubTab("advance")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              orderSubTab === "advance"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border/80 hover:bg-secondary",
            )}
          >
            Advance Order
          </button>
        </div>

        {/* Right Metric & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl border border-border bg-secondary/40 flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Grand Total :</span>
            <span className="font-bold text-foreground tabular-nums text-sm">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-border/80"
              onClick={() => setTrendDays((prev) => (prev === 15 ? 30 : 15))}
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Last {trendDays} Days Orders</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
      </div>

      {/* Interactive Sales Trend Spline Area Chart (Matches Petpooja Image 4) */}
      <Card className="p-5 rounded-2xl border border-border shadow-xs bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Sales Revenue Trajectory (Last {trendDays} Days)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Daily billing totals
          </span>
        </div>

        {trendsLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            No sales recorded in the past {trendDays} days.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 15, right: 15, bottom: 0, left: 10 }}
              >
                <defs>
                  <linearGradient id="petpoojaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `₹${value.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#petpoojaGrad)"
                  activeDot={{ r: 5, stroke: "#1d4ed8", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Filter Bar (Matches Petpooja Image 4) */}
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

          {/* Order Type */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              All Order Type
            </label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="w-full h-9 rounded-xl text-xs border border-border bg-background px-3 text-foreground"
            >
              <option value="ALL">All Order Types</option>
              <option value="DINE_IN">Dine In</option>
              <option value="TAKEAWAY">Takeaway / Pick up</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Order ID / Customer / Waiter
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order no, table, waiter or guest..."
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
              setOrderTypeFilter("ALL");
              setSearchQuery("");
            }}
          >
            Show All
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Orders Master Table (Matches Petpooja Image 4) */}
      <Card className="rounded-2xl border border-border overflow-hidden shadow-xs bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border/80">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedOrders.length > 0 &&
                      selectedIds.size === paginatedOrders.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="p-3">Order No.</th>
                <th className="p-3">Order Type</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Assign To</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-right">Tax (₹)</th>
                <th className="p-3 text-right">Discount (₹)</th>
                <th className="p-3 text-right">Grand Total (₹)</th>
                <th className="p-3 text-center">Payment</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Created ↓</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {ordersLoading ? (
                <tr>
                  <td colSpan={14} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading orders…
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-muted-foreground">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedIds.has(order.id);
                  const tableName =
                    order.table?.name ||
                    (order.table ? `Table ${order.table.number}` : null);
                  const itemsSummary = order.items
                    .map((i) => `${i.quantity}x ${i.nameSnapshot}`)
                    .join(", ");
                  const customerDisplay =
                    order.customer?.name || order.guestName || "Walk-in Guest";
                  const assignedTo = order.createdBy?.name || "Staff";
                  const paymentMethod =
                    order.payments?.map((p) => p.method).join(", ") || "—";
                  const subtotal = Number(order.subtotal || order.totalAmount);
                  const tax = Number(order.taxAmount || 0);
                  const discount = Number(order.discountAmount || 0);
                  const total = Number(order.totalAmount);

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        "hover:bg-secondary/20 transition-colors",
                        isSelected && "bg-secondary/40",
                      )}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded border-border"
                        />
                      </td>

                      <td className="p-3 font-bold text-foreground tabular-nums">
                        #{order.orderNumber}
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-foreground block">
                          {order.type === "DINE_IN"
                            ? "Dine In"
                            : order.type === "TAKEAWAY"
                              ? "Pick up"
                              : "Delivery"}
                        </span>
                        {tableName && (
                          <span className="text-[11px] text-muted-foreground block">
                            {tableName}
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-medium text-foreground">
                        {customerDisplay}
                      </td>

                      <td className="p-3 font-semibold text-foreground">
                        {assignedTo}
                      </td>

                      <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={itemsSummary}>
                        {itemsSummary}
                      </td>

                      <td className="p-3 text-right tabular-nums text-foreground">
                        {formatCurrency(subtotal)}
                      </td>

                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(tax)}
                      </td>

                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {discount > 0 ? `-${formatCurrency(discount)}` : "0.00"}
                      </td>

                      <td className="p-3 text-right font-bold tabular-nums text-foreground">
                        {formatCurrency(total)}
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-foreground">
                          {paymentMethod}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold inline-block",
                            order.status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : order.status === "BILLED"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : order.status === "CANCELLED"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {order.status === "PAID"
                            ? "Printed / Paid"
                            : order.status === "BILLED"
                              ? "Billed"
                              : order.status}
                        </span>
                      </td>

                      <td className="p-3 text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEntity("Order", order.id)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="View Order Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handlePrintThermal(order.id, order.orderNumber)
                            }
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Print Thermal Receipt"
                          >
                            <Printer className="h-4 w-4" />
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

        {/* Footer with Pagination & Status Badges (Matches Petpooja Image 4) */}
        <div className="p-3.5 border-t border-border/80 bg-secondary/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredOrders.length)} of{" "}
            {filteredOrders.length} records
          </span>

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
