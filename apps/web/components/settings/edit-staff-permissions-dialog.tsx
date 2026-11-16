"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Save, ShieldCheck, User, X } from "lucide-react";
import { toast } from "sonner";
import {
  PetpoojaPermissionsEditor,
  ALL_SYSTEM_KEYS,
} from "@/components/settings/petpooja-permissions-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden animate-in fade-in-0 duration-150"
    >
      <form onSubmit={onSave} className="flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Back to Staff List"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-foreground tracking-tight">
                  Edit Staff Rights &middot; {staff.name}
                </h2>
                {isCustomized ? (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  >
                    Custom Staff Overrides
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-normal">
                    Inherited from {staff.role.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned Role: <span className="font-semibold text-foreground">{staff.role.label}</span> &middot; {staff.email || staff.phone || "No contact"}
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
                className="h-9 px-3.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to {baseRole.label}
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
              className="h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {updatePermissions.isPending ? "Saving changes…" : "Save Changes"}
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

        {/* Details Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-muted/30 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Account: <span className="font-semibold">{staff.name}</span>
            </span>
            <span>&middot;</span>
            <span>
              Branches:{" "}
              <span className="font-medium text-foreground">
                {staff.branches.map((b) => b.branch.name).join(", ") || "All Branches"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Active Rights: <span className="font-mono font-semibold">{permissionKeys.length}</span> / {ALL_SYSTEM_KEYS.length}
            </span>
          </div>
        </div>

        {/* Petpooja Full Granular Permissions Editor */}
        <div className="flex-1 overflow-hidden">
          <PetpoojaPermissionsEditor
            selected={permissionKeys}
            onToggle={togglePermission}
            onSetAll={setPermissionKeys}
          />
        </div>
      </form>
    </div>
  );
}
