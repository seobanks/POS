"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PetpoojaPermissionsEditor } from "@/components/settings/petpooja-permissions-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRole } from "@/hooks/use-roles";
import { ApiError } from "@/lib/api";

export function CreateRoleDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const createRole = useCreateRole();

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
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-6xl lg:max-w-7xl h-[92vh] max-h-[92vh] sm:max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border shadow-2xl rounded-xl"
      >
        <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
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
                <h2 className="text-base font-semibold text-foreground">
                  Create Custom Role
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
                className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
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

          {/* Role Identifiers Bar */}
          <div className="flex items-center gap-6 px-6 py-2.5 bg-muted/30 border-b border-border/80 shrink-0">
            <div className="flex items-center gap-2">
              <Label htmlFor="r-name" className="text-xs font-medium text-muted-foreground shrink-0">
                System Key:
              </Label>
              <Input
                id="r-name"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_]/g, "_"))}
                placeholder="VALET_SUPERVISOR"
                required
                autoFocus
                className="h-7 w-48 text-xs font-mono uppercase bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="r-label" className="text-xs font-medium text-muted-foreground shrink-0">
                Display Label:
              </Label>
              <Input
                id="r-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Valet Supervisor"
                required
                className="h-7 w-56 text-xs bg-background"
              />
            </div>

            <div className="text-xs text-muted-foreground ml-auto">
              Selected Permissions: <span className="font-semibold text-foreground">{permissionKeys.length}</span>
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
