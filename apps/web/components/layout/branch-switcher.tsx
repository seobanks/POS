"use client";

import { Check, ChevronsUpDown, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranch } from "@/hooks/use-branch";
import { cn } from "@/lib/utils";

export function BranchSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { branchId, branches, setBranchId } = useBranch();
  const current = branches.find((b) => b.id === branchId);

  if (branches.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-xl border border-sidebar-border bg-sidebar hover:bg-sidebar-accent/50 transition-colors cursor-pointer",
          collapsed
            ? "h-10 w-full justify-center px-0"
            : "w-full gap-2 px-3 py-2 text-left text-sm",
        )}
        title={collapsed ? `Active Branch: ${current?.name ?? "Select branch"}` : undefined}
      >
        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate font-medium text-sidebar-foreground">
              {current?.name ?? "Select branch"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} className="w-56">
        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onClick={() => setBranchId(branch.id)}>
            <span className="flex-1">{branch.name}</span>
            {branch.id === branchId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
