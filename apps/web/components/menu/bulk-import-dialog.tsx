"use client";

import { Download, FileSpreadsheet, Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkImportMenuItems,
  type BulkMenuItemInput,
} from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { parseMenuCsv, SAMPLE_MENU_CSV } from "@/lib/csv-parser";

export function BulkImportDialog({ branchId }: { branchId: string | null }) {
  const fileInputId = useId();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<BulkMenuItemInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImport = useBulkImportMenuItems(branchId);

  const resetState = () => {
    setFileName(null);
    setParsedItems([]);
    setParseErrors([]);
    setIsReading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_MENU_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "menu_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Sample template downloaded");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv")) {
      toast.error("Please upload a valid .csv file");
      return;
    }

    setFileName(file.name);
    setIsReading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseMenuCsv(text);
        setParsedItems(result.items);
        setParseErrors(result.errors);

        if (result.items.length === 0 && result.errors.length > 0) {
          toast.error(result.errors[0]);
        } else {
          toast.success(`Found ${result.items.length} items ready to import`);
        }
      } catch (err) {
        toast.error("Failed to parse CSV file");
        setParsedItems([]);
      } finally {
        setIsReading(false);
      }
    };

    reader.onerror = () => {
      toast.error("Could not read file");
      setIsReading(false);
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!branchId) {
      toast.error("Please select a branch first");
      return;
    }

    if (parsedItems.length === 0) {
      toast.error("No items found to import");
      return;
    }

    bulkImport.mutate(parsedItems, {
      onSuccess: (data) => {
        toast.success(
          `Imported ${data.count} items! (${data.categoriesCreated} new categories created)`,
        );
        setOpen(false);
        resetState();
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Failed to import menu items",
        );
      },
    });
  };

  // Group stats
  const distinctCategories = Array.from(
    new Set(parsedItems.map((item) => item.category.trim())),
  );
  const vegCount = parsedItems.filter((i) => i.isVeg).length;
  const nonVegCount = parsedItems.length - vegCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            <span>Bulk Import</span>
          </Button>
        }
      />

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Menu Items
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload your menu via CSV. Existing items with the same name in the same category
            will be updated with new prices, and missing categories are created automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto py-2 pr-1">
          {/* Step 1: Template Download & Guidance */}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 p-3.5">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Need the spreadsheet template?</span>
              <span className="text-xs text-muted-foreground">
                Headers: Category, Item Name, Price, Half Price, Food Type, Tax %, Description, SKU, Spicy Level, Image URL
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload Area */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={fileInputId}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-card hover:bg-muted/30 p-6 text-center cursor-pointer transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {fileName ? fileName : "Click to select or drag a .CSV menu file"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Supports comma-separated UTF-8 CSV exports from Excel, Google Sheets, or Petpooja POS
                </span>
              </div>
              <input
                id={fileInputId}
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Step 3: Parse Results & Summary */}
          {isReading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Reading CSV file...
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-foreground">
                    {parsedItems.length} items ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {distinctCategories.length} Categories
                  </Badge>
                  <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
                    {vegCount} Veg
                  </Badge>
                  {nonVegCount > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400">
                      {nonVegCount} Non-Veg
                    </Badge>
                  )}
                </div>
              </div>

              {/* Preview table (up to 6 items) */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead>Category</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Half Price</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.slice(0, 6).map((item, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-mono">₹{item.price}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {item.halfPrice ? `₹${item.halfPrice}` : "—"}
                        </TableCell>
                        <TableCell>
                          {item.isVeg ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Veg</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-medium">Non-Veg</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedItems.length > 6 && (
                  <div className="bg-muted/30 py-1.5 text-center text-xs text-muted-foreground border-t border-border">
                    + {parsedItems.length - 6} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Warnings/Errors */}
          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Notice / Warnings ({parseErrors.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto pl-1">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-border flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={bulkImport.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={parsedItems.length === 0 || bulkImport.isPending}
            className="gap-2"
          >
            {bulkImport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing {parsedItems.length} items...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {parsedItems.length > 0 ? `${parsedItems.length} Items` : "Items"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
