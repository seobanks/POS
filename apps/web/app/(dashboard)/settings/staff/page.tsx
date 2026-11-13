"use client";

import { useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PERMISSIONS } from "@nodedr-restaurant/types";
import { AddStaffDialog } from "@/components/settings/add-staff-dialog";
import { EditStaffPermissionsDialog } from "@/components/settings/edit-staff-permissions-dialog";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDeleteStaff, useStaff, useUpdateStaff, type StaffMember } from "@/hooks/use-staff";
import { api, ApiError } from "@/lib/api";

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const { data: currentUser } = useCurrentUser();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const [editingPermissionsStaff, setEditingPermissionsStaff] = useState<StaffMember | null>(null);

  const onResetTwoFactor = (member: StaffMember) => {
    if (
      !confirm(
        `Turn off two-factor authentication for ${member.name}? They will sign in with just their password until they set it up again.`,
      )
    )
      return;
    api.post(`/auth/2fa/reset/${member.id}`).then(
      () => toast.success(`Two-factor authentication reset for ${member.name}`),
      (err) => toast.error(err instanceof ApiError ? err.message : "Could not reset"),
    );
  };

  const onDelete = (member: StaffMember) => {
    if (!confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    deleteStaff.mutate(member.id, {
      onSuccess: () => toast.success(`${member.name} deleted`),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not delete staff account"),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Restaurant, branch, and staff configuration</p>
      </div>

      <SettingsTabs />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-medium text-foreground">Staff accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage team members, roles, branches, and custom granular Petpooja permissions per staff account.
            </p>
          </div>
          <AddStaffDialog />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : staff && staff.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username / Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => {
                const isCustom =
                  member.role.isSystem === false || member.role.name.startsWith("STAFF_");
                const grantedCount = member.role.permissions?.length ?? 0;

                return (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setEditingPermissionsStaff(member)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {member.name}
                      {member.id === currentUser?.user.id && (
                        <span className="ml-2 text-[11px] text-muted-foreground font-normal">(You)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email || member.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal text-xs">
                        {member.role.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditingPermissionsStaff(member)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted transition-colors text-xs font-medium text-foreground cursor-pointer shadow-2xs"
                        title={`Edit granular permissions for ${member.name}`}
                      >
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {grantedCount} / {PERMISSIONS.length}
                        </span>
                        {isCustom && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-1 py-0 ml-0.5"
                          >
                            Custom
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.branches.map((b) => b.branch.name).join(", ") || "All Branches"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={member.isActive}
                        onCheckedChange={(checked) =>
                          updateStaff.mutate(
                            { id: member.id, dto: { isActive: checked } },
                            {
                              onSuccess: () =>
                                toast.success(`${member.name} ${checked ? "enabled" : "disabled"}`),
                              onError: (err) =>
                                toast.error(err instanceof ApiError ? err.message : "Could not update"),
                            },
                          )
                        }
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-primary hover:text-primary font-medium"
                          title={`Edit ${member.name}'s permissions`}
                          onClick={() => setEditingPermissionsStaff(member)}
                        >
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          Permissions
                        </Button>
                        {member.id !== currentUser?.user.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-muted-foreground"
                              title="Reset two-factor authentication (lost device)"
                              onClick={() => onResetTwoFactor(member)}
                            >
                              Reset 2FA
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete staff account"
                              onClick={() => onDelete(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No staff accounts yet</p>
            <p className="text-sm text-muted-foreground">Add your first staff account above.</p>
          </div>
        )}
      </Card>

      {editingPermissionsStaff && (
        <EditStaffPermissionsDialog
          key={editingPermissionsStaff.id}
          staff={editingPermissionsStaff}
          onClose={() => setEditingPermissionsStaff(null)}
        />
      )}
    </div>
  );
}
