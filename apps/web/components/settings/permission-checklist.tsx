"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PERMISSIONS } from "@nodedr-restaurant/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Shared by create/edit role dialogs — grouped by category with live search & filtering
export function PermissionChecklist({
  selected,
  onToggle,
  onSetAll,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onSetAll?: (keys: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const map = new Map<string, (typeof PERMISSIONS)[number][]>();
      for (const permission of PERMISSIONS) {
        const list = map.get(permission.category) ?? [];
        list.push(permission);
        map.set(permission.category, list);
      }
      return {
        groups: [...map.entries()],
        keys: ALL_PERMISSION_KEYS,
        totalMatches: PERMISSIONS.length,
      };
    }

    const matches = PERMISSIONS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );

    const map = new Map<string, (typeof PERMISSIONS)[number][]>();
    for (const permission of matches) {
      const list = map.get(permission.category) ?? [];
      list.push(permission);
      map.set(permission.category, list);
    }

    return {
      groups: [...map.entries()],
      keys: matches.map((p) => p.key),
      totalMatches: matches.length,
    };
  }, [query]);

  const isFiltered = query.trim().length > 0;
  const filteredKeySet = useMemo(() => new Set<string>(filtered.keys), [filtered.keys]);

  const handleSelectMatching = () => {
    if (!onSetAll) return;
    if (isFiltered) {
      onSetAll(Array.from(new Set([...selected, ...filtered.keys])));
    } else {
      onSetAll(ALL_PERMISSION_KEYS);
    }
  };

  const handleClearMatching = () => {
    if (!onSetAll) return;
    if (isFiltered) {
      onSetAll(selected.filter((k) => !filteredKeySet.has(k)));
    } else {
      onSetAll([]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search permissions (e.g. order, discount, sales)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              setQuery("");
              e.preventDefault();
            }
          }}
          className="pl-8 pr-8 h-9 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Grant count and Select / Clear actions */}
      {onSetAll ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {isFiltered ? (
              <>
                <span className="font-semibold text-foreground">{filtered.totalMatches}</span>{" "}
                matching &middot; {selected.length} of {ALL_PERMISSION_KEYS.length} granted
              </>
            ) : (
              <>{selected.length} of {ALL_PERMISSION_KEYS.length} granted</>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectMatching}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              {isFiltered ? `Select matching (${filtered.totalMatches})` : "Select all"}
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleClearMatching}
              className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            >
              {isFiltered ? "Clear matching" : "Clear all"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Permission groups */}
      <div className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-lg border border-border p-3">
        {filtered.groups.length > 0 ? (
          filtered.groups.map(([category, permissions]) => (
            <div key={category} className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase flex items-center justify-between">
                <span>{category}</span>
                {isFiltered && (
                  <span className="text-[10px] font-normal lowercase tracking-normal">
                    {permissions.length} match{permissions.length === 1 ? "" : "es"}
                  </span>
                )}
              </p>
              {permissions.map((permission) => (
                <label
                  key={permission.key}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none rounded p-1 -m-1 hover:bg-secondary/50 transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(permission.key)}
                    onCheckedChange={() => onToggle(permission.key)}
                  />
                  <div className="flex flex-col">
                    <span>{permission.label}</span>
                    {isFiltered && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {permission.key}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>No permissions matching &ldquo;{query}&rdquo;</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
