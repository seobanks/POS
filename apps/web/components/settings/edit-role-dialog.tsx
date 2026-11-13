"use client";

import { useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PetpoojaPermissionsEditor } from "@/components/settings/petpooja-permissions-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateRole, type RoleWithPermissions } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";

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
    if (!label.trim()) {
      toast.error("Role display label cannot be empty");
      return;
    }
    updateRole.mutate(
      { id: role.id, dto: { label: label.trim(), permissionKeys } },
      {
        onSuccess: () => {
          toast.success(`${label.trim()} role permissions saved successfully`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not update role"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border shadow-2xl rounded-xl">
        <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Petpooja Top Navigation Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-foreground">
                    Edit Billing User &middot; {role.label}
                  </h2>
                  <Badge variant={role.isSystem ? "secondary" : "outline"} className="font-normal text-xs">
                    {role.isSystem ? "Seeded System Role" : "Custom Role"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  System Key: <span className="font-mono">{role.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 text-xs font-medium cursor-pointer"
              >
                Discard
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateRole.isPending}
                className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {updateRole.isPending ? "Saving changes…" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Quick Details Bar */}
          <div className="flex items-center gap-4 px-6 py-2.5 bg-muted/30 border-b border-border/80 shrink-0">
            <div className="flex items-center gap-2">
              <Label htmlFor="r-edit-label" className="text-xs font-medium text-muted-foreground shrink-0">
                Display Label:
              </Label>
              <Input
                id="r-edit-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="h-7 w-64 text-xs bg-background"
                placeholder="e.g. Head Cashier"
              />
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              Total Permissions Granted: <span className="font-semibold text-foreground">{permissionKeys.length}</span>
            </div>
          </div>

          {/* Workspace Body: Petpooja Split Layout */}
          <div className="flex-1 overflow-hidden">
            <PetpoojaPermissionsEditor
              selected={permissionKeys}
              onToggle={togglePermission}
              onSetAll={setPermissionKeys}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
