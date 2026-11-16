"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  PetpoojaPermissionsEditor,
  ALL_SYSTEM_KEYS,
} from "@/components/settings/petpooja-permissions-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Escape key handler to close full-screen workbench
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden animate-in fade-in-0 duration-150"
    >
      <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
        {/* Petpooja Top Navigation Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Back to Roles"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-foreground tracking-tight">
                  Edit Billing User &middot; {role.label}
                </h2>
                <Badge
                  variant={role.isSystem ? "secondary" : "outline"}
                  className="font-normal text-xs"
                >
                  {role.isSystem ? "Seeded System Role" : "Custom Role"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                System Role Key: <span className="font-mono font-medium">{role.name}</span>
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
              className="h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {updateRole.isPending ? "Saving changes…" : "Save Changes"}
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

        {/* Quick Details Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-muted/30 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-3">
            <Label htmlFor="role-label" className="text-xs font-medium text-muted-foreground shrink-0">
              Display Label:
            </Label>
            <Input
              id="role-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 w-56 text-xs bg-background"
              placeholder="e.g. Senior Cashier"
              required
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Granted Permissions: <span className="font-mono font-semibold">{permissionKeys.length}</span> / {ALL_SYSTEM_KEYS.length}
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
