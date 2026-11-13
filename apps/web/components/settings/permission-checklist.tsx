"use client";

import { PetpoojaPermissionsEditor } from "@/components/settings/petpooja-permissions-editor";

// Shared by create/edit role dialogs — Petpooja 8-category workbench
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
    <div className="h-[480px] rounded-lg border border-border overflow-hidden">
      <PetpoojaPermissionsEditor
        selected={selected}
        onToggle={onToggle}
        onSetAll={onSetAll}
      />
    </div>
  );
}
