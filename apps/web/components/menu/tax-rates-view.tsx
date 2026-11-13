"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Info,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSettings, useUpdateBranchSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

interface TaxRatesViewProps {
  branchId: string | null;
  canManage: boolean;
  onNavigateToItems?: () => void;
}

interface TaxRateEntry {
  id: string;
  name: string;
  rate: number;
  cgst: number;
  sgst: number;
  isActive: boolean;
  updatedAt: string;
}

const DEFAULT_TAX_RATES: TaxRateEntry[] = [
  {
    id: "tax-gst-5",
    name: "GST 5%",
    rate: 5,
    cgst: 2.5,
    sgst: 2.5,
    isActive: true,
    updatedAt: "about 1 month ago",
  },
  {
    id: "tax-gst-12",
    name: "GST 12%",
    rate: 12,
    cgst: 6.0,
    sgst: 6.0,
    isActive: true,
    updatedAt: "about 1 month ago",
  },
  {
    id: "tax-gst-18",
    name: "GST 18%",
    rate: 18,
    cgst: 9.0,
    sgst: 9.0,
    isActive: true,
    updatedAt: "about 1 month ago",
  },
  {
    id: "tax-exempt",
    name: "Zero / Exempt 0%",
    rate: 0,
    cgst: 0,
    sgst: 0,
    isActive: true,
    updatedAt: "3 months ago",
  },
];

export function TaxRatesView({
  branchId,
  canManage,
  onNavigateToItems,
}: TaxRatesViewProps) {
  const { data: settingsData } = useSettings(branchId);
  const updateBranch = useUpdateBranchSettings(branchId);

  const [taxRates, setTaxRates] = useState<TaxRateEntry[]>(DEFAULT_TAX_RATES);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taxMode, setTaxMode] = useState<"item" | "menu">("item");

  // Add / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRateEntry | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [rateInput, setRateInput] = useState("5");
  const [isSplitGst, setIsSplitGst] = useState(true);

  // Inclusive Settings Dialog
  const [inclusiveDialogOpen, setInclusiveDialogOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingTax(null);
    setNameInput("GST 5%");
    setRateInput("5");
    setIsSplitGst(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (tax: TaxRateEntry) => {
    setEditingTax(tax);
    setNameInput(tax.name);
    setRateInput(tax.rate.toString());
    setIsSplitGst(tax.cgst > 0 && tax.sgst > 0);
    setDialogOpen(true);
  };

  const handleSaveTax = () => {
    const rate = parseFloat(rateInput);
    if (!nameInput.trim() || isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid tax name and percentage");
      return;
    }

    const half = isSplitGst ? Math.round((rate / 2) * 100) / 100 : 0;

    if (editingTax) {
      setTaxRates((prev) =>
        prev.map((t) =>
          t.id === editingTax.id
            ? {
                ...t,
                name: nameInput.trim(),
                rate,
                cgst: half,
                sgst: half,
                updatedAt: "just now",
              }
            : t,
        ),
      );
      toast.success(`Updated tax rate "${nameInput.trim()}"`);
    } else {
      const newEntry: TaxRateEntry = {
        id: `tax-custom-${Date.now()}`,
        name: nameInput.trim(),
        rate,
        cgst: half,
        sgst: half,
        isActive: true,
        updatedAt: "just now",
      };
      setTaxRates((prev) => [...prev, newEntry]);
      toast.success(`Created tax rate "${nameInput.trim()}"`);
    }

    setDialogOpen(false);
  };

  const handleToggleTaxMode = () => {
    const nextMode = taxMode === "item" ? "menu" : "item";
    setTaxMode(nextMode);
    toast.success(
      nextMode === "item"
        ? "Switched to Item-Level Tax: items can attract specific tax rates"
        : "Switched to Menu-Level Tax: uniform tax applied to all dishes",
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto p-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tax Rates</h1>
          <p className="text-xs text-muted-foreground">
            Configure GST / VAT slabs, split tax breakdowns and inclusive pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 gap-1.5">
              <span>Actions</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleTaxMode} className="text-xs">
                Toggle {taxMode === "item" ? "Menu-Level" : "Item-Level"} Tax
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setInclusiveDialogOpen(true)}
                className="text-xs"
              >
                Inclusive Tax Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canManage && (
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-8 gap-1 bg-primary text-xs font-semibold text-primary-foreground shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Tax
            </Button>
          )}

          {onNavigateToItems ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToItems}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Items
            </Button>
          ) : (
            <Link href="/menu">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Items
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Banner matching Petpooja Image 6 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-blue-900 dark:text-blue-200">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-xs">
            <span className="font-semibold">
              Mode: {taxMode === "item" ? "Item-Level Tax" : "Menu-Level Tax"}
            </span>{" "}
            —{" "}
            {taxMode === "item"
              ? "Different menu items can attract different tax rates (e.g. 5% food vs 18% beverages)."
              : "All menu items attract the standard restaurant tax rate."}
          </div>
          <button
            type="button"
            onClick={handleToggleTaxMode}
            className="ml-2 text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
          >
            Switch to {taxMode === "item" ? "Menu-Level Tax" : "Item-Level Tax"} →
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setInclusiveDialogOpen(true)}
          className="h-7 gap-1.5 border-blue-500/40 bg-background text-xs font-medium text-foreground hover:bg-muted"
        >
          <Settings className="h-3 w-3 text-muted-foreground" /> Inclusive Tax Settings
        </Button>
      </div>

      {/* Tax Rates Table matching Petpooja */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    taxRates.length > 0 && selectedIds.length === taxRates.length
                  }
                  onCheckedChange={(c) => {
                    if (c) setSelectedIds(taxRates.map((t) => t.id));
                    else setSelectedIds([]);
                  }}
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Tax Details</TableHead>
              <TableHead className="min-w-[200px]">Tax Value</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-36 text-right">Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxRates.map((tax) => {
              const isChecked = selectedIds.includes(tax.id);

              return (
                <TableRow
                  key={tax.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    isChecked && "bg-primary/5",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(c) => {
                        if (c) setSelectedIds((prev) => [...prev, tax.id]);
                        else setSelectedIds((prev) => prev.filter((id) => id !== tax.id));
                      }}
                    />
                  </TableCell>

                  {/* Tax Name with edit pencil */}
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tax)}
                      className="group flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary"
                    >
                      <span>{tax.name}</span>
                      {canManage && (
                        <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>

                  {/* Tax Value Split (CGST + SGST) */}
                  <TableCell>
                    {tax.rate === 0 ? (
                      <span className="text-xs text-muted-foreground">Exempt (0%)</span>
                    ) : (
                      <div className="flex flex-col text-xs font-semibold">
                        <span className="text-foreground">
                          CGST {tax.cgst.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground">
                          SGST {tax.sgst.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Status Toggle */}
                  <TableCell className="text-center">
                    <Switch
                      checked={tax.isActive}
                      disabled={!canManage}
                      onCheckedChange={(c) => {
                        setTaxRates((prev) =>
                          prev.map((t) => (t.id === tax.id ? { ...t, isActive: c } : t)),
                        );
                        toast.success(`Tax rate ${tax.name} ${c ? "enabled" : "disabled"}`);
                      }}
                    />
                  </TableCell>

                  {/* Last Update */}
                  <TableCell className="text-right text-[11px] text-muted-foreground">
                    {tax.updatedAt}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Tax Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingTax ? "Edit Tax Rate" : "Add Tax Rate"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure slab name, total tax percentage, and Central/State GST split.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tax Slab Label</Label>
              <Input
                placeholder="e.g. GST 5% or Beverage Tax"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Total Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="5"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="h-8 text-xs font-bold"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">India GST Split (CGST + SGST)</span>
                <span className="text-[11px] text-muted-foreground">
                  Automatically splits {rateInput || 0}% into 50% CGST and 50% SGST on receipts.
                </span>
              </div>
              <Switch checked={isSplitGst} onCheckedChange={setIsSplitGst} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTax}>
              {editingTax ? "Save Changes" : "Create Tax Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inclusive Tax Settings Dialog */}
      <Dialog open={inclusiveDialogOpen} onOpenChange={setInclusiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Inclusive Tax Settings</DialogTitle>
            <DialogDescription className="text-xs">
              Choose whether menu item prices include tax or have tax added at checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs font-semibold text-foreground">Tax Inclusive (Default)</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                All listed menu prices already have tax included (Indian GST standard). The bill splits CGST & SGST out of the total.
              </p>
            </div>

            <div className="rounded-lg border p-3 opacity-75">
              <p className="text-xs font-semibold text-foreground">Tax Exclusive</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Prices shown are pre-tax; tax is calculated and added on top of the bill total at final checkout.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setInclusiveDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
