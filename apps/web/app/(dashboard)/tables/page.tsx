"use client";

import { LayoutGrid, Map, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddFloorDialog } from "@/components/tables/add-floor-dialog";
import { EditableTableTile } from "@/components/tables/editable-table-tile";
import { RenameFloorDialog } from "@/components/tables/rename-floor-dialog";
import { TableEditorDialog } from "@/components/tables/table-editor-dialog";
import { TableTile } from "@/components/tables/table-tile";
import { WaitlistPanel } from "@/components/tables/waitlist-panel";
import { TablesAndAreasView } from "@/components/tables/tables-and-areas-view";
import { FloatingAiAgent } from "@/components/ai/floating-ai-agent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BranchNotice } from "@/components/layout/branch-notice";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableRequestsBar } from "@/components/tables/table-requests-bar";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useFloors, type RestaurantTable } from "@/hooks/use-tables";

export default function TablesPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canManage = hasPermission(me?.user, "tables.manage");
  const [viewMode, setViewMode] = useState<"management" | "designer">("management");
  const floorsQuery = useFloors(branchId);
  const { data: floors } = floorsQuery;
  const { isLoading: branchLoading } = useBranch();
  const isLoading = floorsQuery.isLoading || branchLoading;
  const [activeFloorId, setActiveFloorId] = useState<string | undefined>(undefined);
  const [editModeRequested, setEditMode] = useState(false);
  const editMode = canManage && editModeRequested;
  const [editorTable, setEditorTable] = useState<RestaurantTable | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setAvailableWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading, floors?.length]);

  const activeFloor = floors?.find((f) => f.id === (activeFloorId ?? floors[0]?.id));
  const allTables = floors?.flatMap((f) => f.tables) ?? [];
  const availableTables = allTables.filter((t) => t.status === "AVAILABLE");

  const canvasWidth = activeFloor
    ? Math.max(600, ...activeFloor.tables.map((t) => t.posX + t.width + 40))
    : 600;
  const canvasHeight = activeFloor
    ? Math.max(320, ...activeFloor.tables.map((t) => t.posY + t.height + 40))
    : 320;

  const contentWidth = activeFloor
    ? Math.max(1, ...activeFloor.tables.map((t) => t.posX + t.width + 16))
    : canvasWidth;
  const fitScale =
    !editMode && availableWidth > 0 && availableWidth < contentWidth ? availableWidth / contentWidth : 1;

  const openAddTable = () => {
    setEditorTable(null);
    setEditorOpen(true);
    setEditorKey((k) => k + 1);
  };
  const openEditTable = (table: RestaurantTable) => {
    setEditorTable(table);
    setEditorOpen(true);
    setEditorKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "management" | "designer")}
          className="w-auto"
        >
          <TabsList className="h-8 bg-muted/60 p-0.5">
            <TabsTrigger value="management" className="h-7 gap-1.5 px-3 text-xs font-semibold">
              <LayoutGrid className="h-3.5 w-3.5" /> Tables & Areas
            </TabsTrigger>
            <TabsTrigger value="designer" className="h-7 gap-1.5 px-3 text-xs font-semibold">
              <Map className="h-3.5 w-3.5" /> Visual Floor Plan
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "management" ? (
        <TablesAndAreasView branchId={branchId} canManage={canManage} />
      ) : (
        <div className="flex flex-col gap-6">
          <TableRequestsBar branchId={branchId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Floor Plan</h1>
              <p className="text-sm text-muted-foreground">
                {editMode
                  ? "Drag tables to match your floor — changes save automatically"
                  : "Live floor status — tap a table to update it"}
              </p>
            </div>
            {canManage && floors && floors.length > 0 && (
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                className="h-11 w-full sm:h-8 sm:w-auto"
                onClick={() => setEditMode((v) => !v)}
              >
                <LayoutGrid className="h-4 w-4" />
                {editMode ? "Done editing" : "Edit floor plan"}
              </Button>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : floorsQuery.isError && !floors ? (
            <QueryError
              error={floorsQuery.error}
              what="the tables"
              onRetry={() => void floorsQuery.refetch()}
              retrying={floorsQuery.isFetching}
            />
          ) : !branchId ? (
            <BranchNotice />
          ) : floors && floors.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2 [&_button]:max-sm:min-h-10">
                  {(floors.length > 1 || editMode) && (
                    <ResponsiveTabs
                      className="max-lg:w-full"
                      label="Floor"
                      value={activeFloorId ?? floors[0].id}
                      onChange={setActiveFloorId}
                      items={floors.map((f) => ({ id: f.id, label: f.name }))}
                    />
                  )}
                  {editMode && (
                    <div className="flex items-center gap-2">
                      <AddFloorDialog branchId={branchId} />
                      {activeFloor && (
                        <RenameFloorDialog
                          branchId={branchId}
                          floorId={activeFloor.id}
                          currentName={activeFloor.name}
                        />
                      )}
                    </div>
                  )}
                </div>

                <Card className="relative overflow-hidden p-4 sm:p-6" ref={cardRef}>
                  <div
                    className="relative overflow-auto"
                    style={{
                      minHeight: 380,
                      width: editMode ? canvasWidth : "100%",
                      height: canvasHeight * fitScale,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: canvasWidth,
                        height: canvasHeight,
                        transform: !editMode && fitScale !== 1 ? `scale(${fitScale})` : undefined,
                        transformOrigin: "top left",
                      }}
                    >
                      {activeFloor?.tables.map((table) =>
                        editMode ? (
                          <EditableTableTile
                            key={table.id}
                            table={table}
                            branchId={branchId}
                            onEdit={() => openEditTable(table)}
                          />
                        ) : (
                          <TableTile
                            key={table.id}
                            table={table}
                            allTables={allTables}
                            branchId={branchId}
                          />
                        ),
                      )}
                    </div>
                  </div>

                  {editMode && (
                    <Button
                      onClick={openAddTable}
                      className="absolute bottom-4 right-4 h-11 shadow-lg sm:h-9"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add table
                    </Button>
                  )}
                </Card>

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <Legend color="bg-emerald-500" label="Available" />
                  <Legend color="bg-primary" label="Occupied" />
                  <Legend color="bg-amber-500" label="Reserved" />
                  <Legend color="bg-muted-foreground" label="Cleaning / out of service" />
                </div>
              </div>

              <WaitlistPanel
                branchId={branchId}
                availableTables={availableTables}
              />
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <p className="text-muted-foreground">No tables or floors created yet.</p>
              {canManage && <AddFloorDialog branchId={branchId} />}
            </Card>
          )}

          {canManage && activeFloor && (
            <TableEditorDialog
              key={editorKey}
              branchId={branchId}
              floorId={activeFloor.id}
              table={editorTable}
              open={editorOpen}
              onOpenChange={setEditorOpen}
            />
          )}
        </div>
      )}

      {/* Floating AI Agent Assistant */}
      <FloatingAiAgent />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
