"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/use-branch";
import { useCreateStaff, useStaffRoles } from "@/hooks/use-staff";
import { ApiError } from "@/lib/api";

export function AddStaffDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const { branches, branchId } = useBranch();
  const [branchIds, setBranchIds] = useState<string[]>([]);

  const { data: roles } = useStaffRoles();
  const createStaff = useCreateStaff();

  // Auto-select active branch when opening
  useEffect(() => {
    if (open && branchIds.length === 0) {
      if (branchId) {
        setBranchIds([branchId]);
      } else if (branches.length === 1) {
        setBranchIds([branches[0].id]);
      }
    }
  }, [open, branchId, branches, branchIds.length]);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoleId("");
    setBranchIds([]);
  };

  const toggleBranch = (id: string) => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (!roleId) {
      toast.error("Choose a role");
      return;
    }
    if (branchIds.length === 0) {
      toast.error("Select at least one branch");
      return;
    }

    const finalLoginId = email.trim() || name.trim().toLowerCase().replace(/\s+/g, "");

    createStaff.mutate(
      {
        name: name.trim(),
        email: finalLoginId,
        phone: phone.trim() || undefined,
        password,
        roleId,
        branchIds,
      },
      {
        onSuccess: () => {
          toast.success(`${name} added! Login username: ${finalLoginId}`);
          setOpen(false);
          reset();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not add staff account"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Add staff</Button>} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New staff account</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a staff member with a simple name, username, and password. Staff can sign in using their username or name.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="s-name">Staff Name</Label>
            <Input
              id="s-name"
              placeholder="e.g. Rahul or Venky"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                // Auto-sync username if not explicitly typed
                if (!email || email === name.toLowerCase().replace(/\s+/g, "")) {
                  setEmail(val.toLowerCase().replace(/\s+/g, ""));
                }
              }}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-email">Username / Login ID</Label>
              <Input
                id="s-email"
                type="text"
                placeholder="e.g. rahul or cashier1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-phone">Phone (optional)</Label>
              <Input
                id="s-phone"
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="s-password">Password</Label>
              {name.trim() && (
                <button
                  type="button"
                  onClick={() => setPassword(name.trim().toLowerCase())}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Use same as name ({name.trim().toLowerCase()})
                </button>
              )}
            </div>
            <PasswordInput
              id="s-password"
              placeholder="Simple password (e.g. 1234 or name)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={1}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={roleId} onValueChange={(v) => setRoleId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Branches</Label>
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={branchIds.includes(b.id)}
                    onCheckedChange={() => toggleBranch(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createStaff.isPending}>
              {createStaff.isPending ? "Adding…" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
