"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PermissionChecklist } from "@/components/settings/permission-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateRole, type RoleWithPermissions } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";

// Mounted only while a specific role is being edited (see RolesPage), keyed
// by role.id — a fresh mount per role means `label`/`permissionKeys` can be
// lazily initialized straight from `role` with no reset effect needed even
// when the user switches which role they're editing.
export function EditRoleDialog({
  role,
  onClose,
}: {
  role: RoleWithPermissions;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(role.label);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    role.permissions.map((p) => p.permission.key),
  );
  const updateRole = useUpdateRole();

  const togglePermission = (key: string) =>
    setPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRole.mutate(
      { id: role.id, dto: { label: label.trim(), permissionKeys } },
      {
        onSuccess: () => {
          toast.success(`${label.trim()} updated`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not update role"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Edit role</DialogTitle>
              <Badge variant={role.isSystem ? "secondary" : "outline"} className="font-normal text-xs">
                {role.isSystem ? "Seeded" : "Custom"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {role.isSystem
                ? "Configure granted permissions and custom display label for this role."
                : "Configure granted permissions and display label."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="r-edit-name">Name (system key)</Label>
            <Input id="r-edit-name" value={role.name} disabled className="bg-muted text-muted-foreground" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="r-edit-label">Display label</Label>
            <Input
              id="r-edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Permissions</Label>
            <PermissionChecklist
              selected={permissionKeys}
              onToggle={togglePermission}
              onSetAll={setPermissionKeys}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
