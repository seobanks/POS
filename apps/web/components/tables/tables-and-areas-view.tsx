"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  FolderPlus,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { AddFloorDialog } from "@/components/tables/add-floor-dialog";
import { TableEditorDialog } from "@/components/tables/table-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateFloor,
  useDeleteFloor,
  useDeleteTable,
  useFloors,
  useUpdateFloor,
  useUpdateTable,
  useUpdateTableStatus,
  type Floor,
  type RestaurantTable,
} from "@/hooks/use-tables";
import { cn } from "@/lib/utils";

interface TablesAndAreasViewProps {
  branchId: string | null;
  canManage: boolean;
  onNavigateToItems?: () => void;
}

export function TablesAndAreasView({
  branchId,
  canManage,
  onNavigateToItems,
}: TablesAndAreasViewProps) {
  const { data: floors, isLoading } = useFloors(branchId);
  const [activeTab, setActiveTab] = useState<"areas" | "tables">("areas");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [addFloorOpen, setAddFloorOpen] = useState(false);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  // Selections
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  // Inline editing
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState<string>("");
  const [editingFloorRank, setEditingFloorRank] = useState<string>("");

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableNumber, setEditingTableNumber] = useState<string>("");

  // Mutations
  const updateFloor = useUpdateFloor(branchId);
  const deleteFloor = useDeleteFloor(branchId);
  const updateTable = useUpdateTable(branchId);
  const deleteTable = useDeleteTable(branchId);
  const updateTableStatus = useUpdateTableStatus(branchId);

  // Derived metrics
  const allFloors = floors ?? [];
  const allTables = allFloors.flatMap((f) =>
    f.tables.map((t) => ({ ...t, floorName: f.name })),
  );
  const totalAreasCount = allFloors.length;
  const totalTablesCount = allTables.length;
  const totalPaxCount = allTables.reduce((acc, t) => acc + (t.capacity || 2), 0);

  // Filtered lists
  const filteredFloors = allFloors.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const filteredTables = allTables.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      t.number.toLowerCase().includes(q) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      t.floorName.toLowerCase().includes(q)
    );
  });

  const handleDeleteFloor = (floor: Floor) => {
    if (floor.tables.length > 0) {
      if (
        !confirm(
          `Area "${floor.name}" has ${floor.tables.length} tables. Deleting it will also remove its tables. Proceed?`,
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Delete area "${floor.name}"?`)) return;
    }

    deleteFloor.mutate(floor.id, {
      onSuccess: () => toast.success(`Area "${floor.name}" deleted`),
    });
  };

  const handleSaveFloorName = (floor: Floor) => {
    if (!editingFloorName.trim()) return;
    updateFloor.mutate(
      { id: floor.id, name: editingFloorName.trim() },
      {
        onSuccess: () => {
          toast.success("Area name updated");
          setEditingFloorId(null);
        },
      },
    );
  };

  const handleSaveFloorRank = (floor: Floor) => {
    const rank = parseInt(editingFloorRank, 10);
    updateFloor.mutate(
      { id: floor.id, name: floor.name, sortOrder: isNaN(rank) ? 1 : rank },
      {
        onSuccess: () => {
          toast.success("Area rank updated");
          setEditingFloorId(null);
        },
      },
    );
  };

  const handleSaveTableNumber = (table: RestaurantTable) => {
    if (!editingTableNumber.trim()) return;
    updateTable.mutate(
      { id: table.id, dto: { number: editingTableNumber.trim() } },
      {
        onSuccess: () => {
          toast.success("Table updated");
          setEditingTableId(null);
        },
      },
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tables & Areas</h1>
          <p className="text-xs text-muted-foreground">
            Manage dine-in areas, tables and integrations.
          </p>
        </div>

        {onNavigateToItems ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToItems}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Items
          </Button>
        ) : (
          <Link href="/menu">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Items
            </Button>
          </Link>
        )}
      </div>

      {/* Top 3 KPI Summary Cards matching Petpooja */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Dine-In Areas */}
        <button
          type="button"
          onClick={() => setActiveTab("areas")}
          className={cn(
            "flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-xs",
            activeTab === "areas"
              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
              : "hover:border-border/80",
          )}
        >
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              activeTab === "areas"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {totalAreasCount}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Total Dine-In Areas
            </div>
          </div>
        </button>

        {/* Card 2: Assigned Tables */}
        <button
          type="button"
          onClick={() => setActiveTab("tables")}
          className={cn(
            "flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-xs",
            activeTab === "tables"
              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
              : "hover:border-border/80",
          )}
        >
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              activeTab === "tables"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Utensils className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalTablesCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {totalPaxCount} Pax
              </span>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Assigned Tables
            </div>
          </div>
        </button>

        {/* Card 3: Other Areas */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left opacity-80">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">0</div>
            <div className="text-xs font-medium text-muted-foreground">
              Other Areas (Integrations)
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 p-3">
        <div className="relative w-64 sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search table or area"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "tables" && selectedTableIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 gap-1.5">
                <span>Actions ({selectedTableIds.length})</span>
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    const count = selectedTableIds.length;
                    try {
                      await Promise.all(
                        selectedTableIds.map((id) =>
                          updateTableStatus.mutateAsync({ id, status: "AVAILABLE" }),
                        ),
                      );
                      toast.success(`Marked ${count} table${count === 1 ? "" : "s"} Available`);
                      setSelectedTableIds([]);
                    } catch (err) {
                      const msg = err instanceof ApiError ? err.message : "Could not mark selected tables Available";
                      toast.error(msg);
                    }
                  }}
                  className="text-xs"
                >
                  Mark Available
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const count = selectedTableIds.length;
                    try {
                      await Promise.all(
                        selectedTableIds.map((id) =>
                          updateTableStatus.mutateAsync({ id, status: "OUT_OF_SERVICE" }),
                        ),
                      );
                      toast.success(`Marked ${count} table${count === 1 ? "" : "s"} Out of Service`);
                      setSelectedTableIds([]);
                    } catch (err) {
                      const msg = err instanceof ApiError ? err.message : "Could not mark selected tables Out of Service";
                      toast.error(msg);
                    }
                  }}
                  className="text-xs text-amber-600"
                >
                  Mark Out of Service
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTable(null);
                  setAddTableOpen(true);
                }}
                className="h-8 gap-1 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Table
              </Button>

              <Button
                size="sm"
                onClick={() => setAddFloorOpen(true)}
                className="h-8 gap-1 bg-primary text-xs font-semibold text-primary-foreground shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Area
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-lg border bg-card">
        {activeTab === "areas" ? (
          /* Area Mode Table (Screenshot 4) */
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[180px]">Area</TableHead>
                <TableHead className="w-24 text-center">Tables</TableHead>
                <TableHead className="w-24 text-center">Pax</TableHead>
                <TableHead className="w-24 text-center">Discount</TableHead>
                <TableHead className="w-24 text-center">Rank</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="min-w-[150px] text-center">Actions</TableHead>
                <TableHead className="w-36 text-right">Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    Loading areas...
                  </TableCell>
                </TableRow>
              ) : filteredFloors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    No areas found. Click "+ Area" to create your first dining section.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFloors.map((floor, idx) => {
                  const isEditing = editingFloorId === floor.id;
                  const totalPax = floor.tables.reduce((acc, t) => acc + (t.capacity || 2), 0);

                  return (
                    <TableRow key={floor.id} className="hover:bg-muted/30">
                      {/* Area Name with inline edit pencil */}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingFloorName}
                              onChange={(e) => setEditingFloorName(e.target.value)}
                              className="h-6 w-36 text-xs font-bold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveFloorName(floor);
                                if (e.key === "Escape") setEditingFloorId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-emerald-600"
                              onClick={() => handleSaveFloorName(floor)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => {
                                if (!canManage) return;
                                setEditingFloorId(floor.id);
                                setEditingFloorName(floor.name);
                              }}
                              className="group flex items-center gap-1.5 text-left text-xs font-bold uppercase text-foreground hover:text-primary"
                            >
                              <span>{floor.name}</span>
                              {canManage && (
                                <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
                              )}
                            </button>
                            <span className="text-[11px] text-muted-foreground">
                              {floor.name.toLowerCase().includes("ac")
                                ? "AC Dining"
                                : "Main Hall / Ground"}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Tables count */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-foreground">
                          🪑 {floor.tables.length}
                        </span>
                      </TableCell>

                      {/* Pax */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          👤 {totalPax}
                        </span>
                      </TableCell>

                      {/* Discount */}
                      <TableCell className="text-center text-xs text-muted-foreground">
                        —
                      </TableCell>

                      {/* Rank */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          {floor.sortOrder || idx + 1}
                        </span>
                      </TableCell>

                      {/* Status toggle */}
                      <TableCell className="text-center">
                        <Switch
                          checked={true}
                          disabled={!canManage}
                          onCheckedChange={() => {
                            toast.info(`Area "${floor.name}" status updated`);
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveTab("tables");
                              setSearchQuery(floor.name);
                            }}
                            className="h-7 gap-1 px-2.5 text-[11px] font-medium"
                          >
                            <Utensils className="h-3 w-3" /> Manage Tables
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFloor(floor)}
                              className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                              title="Delete Area"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Last Update */}
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        about 1 month ago
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : (
          /* Table Mode Table (Screenshot 5) */
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      filteredTables.length > 0 &&
                      filteredTables.every((t) => selectedTableIds.includes(t.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTableIds(filteredTables.map((t) => t.id));
                      } else {
                        setSelectedTableIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="min-w-[140px]">Table Name</TableHead>
                <TableHead className="min-w-[140px]">Area</TableHead>
                <TableHead className="w-20 text-center">Pax</TableHead>
                <TableHead className="w-24 text-center">Discount</TableHead>
                <TableHead className="min-w-[140px] text-center">Reservations</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-36 text-right">Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    Loading tables...
                  </TableCell>
                </TableRow>
              ) : filteredTables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    No tables found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTables.map((t) => {
                  const isChecked = selectedTableIds.includes(t.id);
                  const isEditing = editingTableId === t.id;

                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isChecked && "bg-primary/5",
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => {
                            if (c) setSelectedTableIds((prev) => [...prev, t.id]);
                            else setSelectedTableIds((prev) => prev.filter((id) => id !== t.id));
                          }}
                        />
                      </TableCell>

                      {/* Table Name with edit pencil */}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingTableNumber}
                              onChange={(e) => setEditingTableNumber(e.target.value)}
                              className="h-6 w-24 text-xs font-bold"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTableNumber(t);
                                if (e.key === "Escape") setEditingTableId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-emerald-600"
                              onClick={() => handleSaveTableNumber(t)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!canManage) return;
                              setEditingTableId(t.id);
                              setEditingTableNumber(t.number);
                            }}
                            className="group flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary"
                          >
                            <span>Table {t.number}</span>
                            {canManage && (
                              <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </TableCell>

                      {/* Area */}
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        <Badge variant="outline" className="font-semibold text-[11px]">
                          {t.floorName}
                        </Badge>
                      </TableCell>

                      {/* Pax */}
                      <TableCell className="text-center text-xs font-bold">
                        {t.capacity || 2}
                      </TableCell>

                      {/* Discount */}
                      <TableCell className="text-center text-xs text-muted-foreground">
                        —
                      </TableCell>

                      {/* Reservations Pill */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-medium border",
                            t.status === "AVAILABLE"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : t.status === "OCCUPIED"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                : "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {t.status === "AVAILABLE"
                            ? "Reservable"
                            : t.status === "OCCUPIED"
                              ? "Occupied (Active Bill)"
                              : "Not Reservable"}
                        </Badge>
                      </TableCell>

                      {/* Status toggle */}
                      <TableCell className="text-center">
                        <Switch
                          checked={t.status !== "OUT_OF_SERVICE"}
                          disabled={!canManage || updateTableStatus.isPending}
                          onCheckedChange={(checked) => {
                            const targetStatus = checked ? "AVAILABLE" : "OUT_OF_SERVICE";
                            updateTableStatus.mutate(
                              {
                                id: t.id,
                                status: targetStatus,
                              },
                              {
                                onSuccess: () => {
                                  toast.success(
                                    `Table ${t.number} marked ${targetStatus === "AVAILABLE" ? "Available" : "Out of Service"}`,
                                  );
                                },
                                onError: (err) => {
                                  const msg =
                                    err instanceof ApiError ? err.message : "Could not update table status";
                                  if (msg.includes("open bill")) {
                                    toast.error(msg, {
                                      action: {
                                        label: "Force Release",
                                        onClick: () => {
                                          if (
                                            confirm(
                                              `Table ${t.number} has an open bill. Force cancel the open bill and mark Available?`,
                                            )
                                          ) {
                                            updateTableStatus.mutate(
                                              { id: t.id, status: "AVAILABLE", force: true },
                                              {
                                                onSuccess: () =>
                                                  toast.success(`Table ${t.number} freed successfully`),
                                                onError: (e) =>
                                                  toast.error(
                                                    e instanceof ApiError
                                                      ? e.message
                                                      : "Could not force release table",
                                                  ),
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
                        />
                      </TableCell>

                      {/* Last Update */}
                      <TableCell className="text-right text-[11px] text-muted-foreground">
                        about 1 month ago
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Floor Dialog */}
      <AddFloorDialog
        open={addFloorOpen}
        onOpenChange={setAddFloorOpen}
        branchId={branchId}
      />

      {/* Table Editor Dialog */}
      {addTableOpen && floors && floors.length > 0 && (
        <TableEditorDialog
          open={addTableOpen}
          onOpenChange={setAddTableOpen}
          branchId={branchId}
          table={editingTable}
          floorId={floors[0].id}
        />
      )}
    </div>
  );
}
