"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, User as UserIcon } from "lucide-react";
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
import { useHrActions } from "@/hooks/use-hr";
import { useStaff } from "@/hooks/use-staff";
import { ApiError } from "@/lib/api";

const PRESETS = [
  { label: "Morning Shift", start: "09:00", end: "15:00" },
  { label: "Lunch Shift", start: "11:00", end: "16:00" },
  { label: "Evening Shift", start: "15:00", end: "23:00" },
  { label: "Dinner Shift", start: "18:00", end: "23:59" },
  { label: "Night Shift", start: "22:00", end: "04:00" },
  { label: "Full Day", start: "09:00", end: "22:00" },
] as const;

export function CreateShiftDialog({
  branchId,
  open,
  onOpenChange,
  existingShiftCount = 0,
}: {
  branchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingShiftCount?: number;
}) {
  const { data: staffList, isLoading: staffLoading } = useStaff();
  const { addShift } = useHrActions(branchId);

  const today = () => new Date().toISOString().slice(0, 10);

  const [shiftName, setShiftName] = useState(
    () => `Shift #${existingShiftCount + 1}`,
  );
  const [userId, setUserId] = useState<string>("");
  const [date, setDate] = useState<string>(today());
  const [start, setStart] = useState<string>("09:00");
  const [end, setEnd] = useState<string>("17:00");

  const branchStaff = (staffList ?? []).filter((s) => {
    if (!branchId) return true;
    return s.branches.some((b) => b.branch.id === branchId);
  });

  const handleApplyPreset = (preset: (typeof PRESETS)[number]) => {
    setShiftName(preset.label);
    setStart(preset.start);
    setEnd(preset.end);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error("Please select a branch first");
      return;
    }

    const selectedUserId = userId || (branchStaff[0]?.id ?? "");
    if (!selectedUserId) {
      toast.error("Please pick a staff member to assign to this shift");
      return;
    }

    // Handle overnight shift if end < start
    const startIso = new Date(`${date}T${start}:00`).toISOString();
    let endDateObj = new Date(`${date}T${end}:00`);
    if (end <= start) {
      // Next day
      endDateObj = new Date(endDateObj.getTime() + 86_400_000);
    }
    const endIso = endDateObj.toISOString();

    addShift.mutate(
      {
        userId: selectedUserId,
        startsAt: startIso,
        endsAt: endIso,
        note: shiftName.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${shiftName || "Shift"} created successfully!`);
          onOpenChange(false);
          setShiftName(`Shift #${existingShiftCount + 2}`);
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "Failed to create shift";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Create Service Shift
          </DialogTitle>
          <DialogDescription>
            Configure an operational shift to track real-time sales, order volume, and
            cash collections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Quick Presets */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Quick Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-secondary hover:border-primary/50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shift Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-name">Shift Title / Name</Label>
            <Input
              id="shift-name"
              placeholder="e.g. Shift 1 - Lunch, Dinner Rush, Morning"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              required
            />
          </div>

          {/* Staff Member */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-staff">Assigned Staff / Biller</Label>
            <select
              id="shift-staff"
              value={userId || (branchStaff[0]?.id ?? "")}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {staffLoading ? (
                <option value="">Loading staff…</option>
              ) : branchStaff.length === 0 ? (
                <option value="">No staff found in this branch</option>
              ) : (
                branchStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role?.label || s.role?.name || "Staff"})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift-date">Shift Date</Label>
            <Input
              id="shift-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-start">Start Time</Label>
              <Input
                id="shift-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-end">End Time</Label>
              <Input
                id="shift-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addShift.isPending}>
              {addShift.isPending ? "Creating..." : "Save Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
