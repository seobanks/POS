"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { CaptainHeader } from "@/components/captain/captain-header";
import { CaptainTableGrid } from "@/components/captain/captain-table-grid";
import { CaptainOrderSheet } from "@/components/captain/captain-order-sheet";
import type { RestaurantTable } from "@/hooks/use-tables";

export default function CaptainPage() {
  return (
    <Suspense fallback={<CaptainPageFallback />}>
      <CaptainPageContent />
    </Suspense>
  );
}

function CaptainPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTableId = searchParams.get("tableId");

  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    urlTableId || null,
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  // Sync state if URL search param changes (e.g. browser back/forward button)
  useEffect(() => {
    setSelectedTableId(urlTableId || null);
  }, [urlTableId]);

  const handleSelectTable = useCallback(
    (table: RestaurantTable) => {
      setSelectedTableId(table.id);
      router.push(`/captain?tableId=${encodeURIComponent(table.id)}`, {
        scroll: false,
      });
    },
    [router],
  );

  const handleBackToGrid = useCallback(() => {
    setSelectedTableId(null);
    router.push("/captain", { scroll: false });
  }, [router]);

  // If a table is active, show the full-screen touch order sheet
  if (selectedTableId) {
    return (
      <CaptainOrderSheet
        tableId={selectedTableId}
        onBack={handleBackToGrid}
      />
    );
  }

  // Otherwise show the floor/table overview grid with header
  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <CaptainHeader
        selectedFloorId={selectedFloorId}
        onSelectFloor={setSelectedFloorId}
      />
      <main className="flex-1 min-h-0 overflow-hidden">
        <CaptainTableGrid
          selectedFloorId={selectedFloorId}
          onSelectTable={handleSelectTable}
        />
      </main>
    </div>
  );
}

function CaptainPageFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <Skeleton className="h-9 w-32 rounded-xl bg-muted" />
        <Skeleton className="h-9 w-24 rounded-xl bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
