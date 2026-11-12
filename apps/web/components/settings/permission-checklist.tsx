"use client";

import { PERMISSIONS } from "@nodedr-restaurant/types";
import { Checkbox } from "@/components/ui/checkbox";

// Computed once at module load — PERMISSIONS is a static const, no need to
// re-group on every render.
const GROUPED_PERMISSIONS = (() => {
  const map = new Map<string, (typeof PERMISSIONS)[number][]>();
  for (const permission of PERMISSIONS) {
    const list = map.get(permission.category) ?? [];
    list.push(permission);
    map.set(permission.category, list);
  }
  return [...map.entries()];
})();

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Shared by the create/edit role dialogs — grouped by the PERMISSIONS
// catalog's `category` field so the checkbox list reads as sections
// ("Orders", "Inventory", "Admin", ...) instead of one flat 19-item list.
export function PermissionChecklist({
  selected,
  onToggle,
  onSetAll,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onSetAll?: (keys: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {onSetAll ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {selected.length} of {ALL_PERMISSION_KEYS.length} granted
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSetAll(ALL_PERMISSION_KEYS)}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Select all
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onSetAll([])}
              className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-lg border border-border p-3">
        {GROUPED_PERMISSIONS.map(([category, permissions]) => (
          <div key={category} className="flex flex-col gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {category}
            </p>
            {permissions.map((permission) => (
              <label
                key={permission.key}
                className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none"
              >
                <Checkbox
                  checked={selected.includes(permission.key)}
                  onCheckedChange={() => onToggle(permission.key)}
                />
                {permission.label}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
