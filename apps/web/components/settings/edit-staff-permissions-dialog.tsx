"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Save, Shield, User, X } from "lucide-react";
import { toast } from "sonner";
import { PetpoojaPermissionsEditor, ALL_SYSTEM_KEYS } from "@/components/settings/petpooja-permissions-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStaffRoles, useUpdateStaffPermissions, type StaffMember } from "@/hooks/use-staff";
import { ApiError } from "@/lib/api";

export function EditStaffPermissionsDialog({
  staff,
  onClose,
}: {
  staff: StaffMember;
  onClose: () => void;
}) {
  const initialKeys = useMemo(
    () => staff.role.permissions?.map((p) => p.permission.key) ?? [],
    [staff],
  );

  const [permissionKeys, setPermissionKeys] = useState<string[]>(initialKeys);
  const updatePermissions = useUpdateStaffPermissions();
  const { data: roles } = useStaffRoles();

  const isCustomized =
    staff.role.isSystem === false || staff.role.name.startsWith("STAFF_");

  // Determine base role to reset to if needed
  const baseRole = useMemo(() => {
    if (!roles) return null;
    if (staff.role.isSystem) return staff.role;
    // For custom staff roles like "STAFF_...", try matching original role name
    return roles.find((r) => r.id === staff.roleId) || roles.find((r) => r.name === "WAITER") || roles[0];
  }, [roles, staff]);

  const togglePermission = (key: string) => {
    setPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePermissions.mutate(
      { id: staff.id, permissionKeys },
      {
        onSuccess: () => {
          toast.success(`Custom permissions for ${staff.name} saved successfully`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not update staff permissions"),
      },
    );
  };

  const onResetToDefault = () => {
    if (!baseRole) return;
    if (
      !confirm(
        `Reset ${staff.name}'s permissions back to the standard "${baseRole.label}" default role? This removes all custom overrides.`,
      )
    ) {
      return;
    }

    updatePermissions.mutate(
      { id: staff.id, resetToRoleId: baseRole.id },
      {
        onSuccess: () => {
          toast.success(`${staff.name}'s permissions reset to ${baseRole.label} defaults`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not reset permissions"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-6xl lg:max-w-7xl h-[92vh] max-h-[92vh] sm:max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border shadow-2xl rounded-xl"
      >
        <form onSubmit={onSave} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
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
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Edit Staff Permissions &middot; {staff.name}</span>
                  </h2>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {staff.role.label}
                  </Badge>
                  {isCustomized && (
                    <Badge
                      variant="outline"
                      className="font-semibold text-xs border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                      Staff Custom Overrides Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact: <span className="font-mono">{staff.email || staff.phone || "No contact info"}</span> &middot;{" "}
                  Assigned Branches: {staff.branches.map((b) => b.branch.name).join(", ") || "All Branches"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {isCustomized && baseRole && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetToDefault}
                  disabled={updatePermissions.isPending}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Remove staff overrides and restore default role permissions"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset to Role Defaults
                </Button>
              )}
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
                disabled={updatePermissions.isPending}
                className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {updatePermissions.isPending ? "Saving changes…" : "Save Staff Permissions"}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Info Strip */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-muted/30 border-b border-border/80 shrink-0 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">
                Configuring permissions specifically for <strong>{staff.name}</strong>. Overrides apply immediately to all active sessions.
              </span>
            </div>
            <div className="text-muted-foreground">
              Total Permissions Granted:{" "}
              <span className="font-semibold text-foreground">
                {permissionKeys.length} / {ALL_SYSTEM_KEYS.length}
              </span>
            </div>
          </div>

          {/* Petpooja Permissions Workspace */}
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
