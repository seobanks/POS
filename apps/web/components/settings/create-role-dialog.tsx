"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  PetpoojaPermissionsEditor,
  ALL_SYSTEM_KEYS,
} from "@/components/settings/petpooja-permissions-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRole } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";

export function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const createRole = useCreateRole();

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
    if (!name.trim() || !label.trim()) {
      toast.error("Role name and display label are required");
      return;
    }
    createRole.mutate(
      { name: name.trim().toUpperCase(), label: label.trim(), permissionKeys },
      {
        onSuccess: () => {
          toast.success(`${label.trim()} custom role created successfully`);
          onClose();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not create role"),
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
        {/* Header */}
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
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Create Billing Role
              </h2>
              <p className="text-xs text-muted-foreground">
                Define a tailored role with dedicated rights for specialized staff members.
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
              disabled={createRole.isPending}
              className="h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {createRole.isPending ? "Creating role…" : "Create Role"}
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
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="create-label" className="text-xs font-medium text-muted-foreground shrink-0">
                Display Label:
              </Label>
              <Input
                id="create-label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (!name || name === label.toUpperCase().replace(/\s+/g, "_")) {
                    setName(e.target.value.toUpperCase().replace(/\s+/g, "_"));
                  }
                }}
                className="h-8 w-48 text-xs bg-background"
                placeholder="e.g. Floor Captain"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="create-name" className="text-xs font-medium text-muted-foreground shrink-0">
                System Key:
              </Label>
              <Input
                id="create-name"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                className="h-8 w-44 font-mono text-xs uppercase bg-background"
                placeholder="FLOOR_CAPTAIN"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Selected Permissions: <span className="font-mono font-semibold">{permissionKeys.length}</span> / {ALL_SYSTEM_KEYS.length}
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
