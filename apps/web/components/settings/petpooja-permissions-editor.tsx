"use client";

import { useMemo, useState } from "react";
import {
  Search,
  X,
  Check,
  ShieldCheck,
  FileText,
  Layers,
  CreditCard,
  Package,
  Settings,
  Table as TableIcon,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from "lucide-react";
import { PERMISSIONS } from "@nodedr-restaurant/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBranch } from "@/hooks/use-branch";
import { useFloors } from "@/hooks/use-tables";

export interface PetpoojaActionItem {
  key: string;
  label: string;
  description?: string;
}

export interface PetpoojaRowDefinition {
  label: string;
  description?: string;
  actions: PetpoojaActionItem[];
}

// 8 Functional Categories exactly matching Petpooja POS
export const PETPOOJA_CATEGORIES = [
  "All Permissions",
  "POS & Billing Operations",
  "Order & KOT Management",
  "Bill Modifications, Discounts & Security",
  "Inventory & Stock Management",
  "Settlement",
  "Configuration, Reports & System",
  "Reports",
  "Tables *",
] as const;

export type PetpoojaCategory = (typeof PETPOOJA_CATEGORIES)[number];

// Definition of compound rows per category
export const CATEGORY_ROW_DEFINITIONS: Record<
  Exclude<PetpoojaCategory, "All Permissions" | "Reports" | "Tables *">,
  PetpoojaRowDefinition[]
> = {
  "POS & Billing Operations": [
    { label: "Allow Billing Rights", actions: [{ key: "pos.billing_rights", label: "Yes" }] },
    { label: "Settle & Save", actions: [{ key: "pos.settle_save", label: "Yes" }] },
    { label: "Print bill on Settle & Save", actions: [{ key: "pos.print_on_settle_save", label: "Yes" }] },
    { label: "Show Button : Save", actions: [{ key: "pos.button_save", label: "Yes" }] },
    { label: "Show Button : Save & Print", actions: [{ key: "pos.button_save_print", label: "Yes" }] },
    { label: "Show Button : Print & eBill", actions: [{ key: "pos.button_print_ebill", label: "Yes" }] },
    { label: "Show Button : Save & eBill", actions: [{ key: "pos.button_save_ebill", label: "Yes" }] },
    { label: "Show Button : Split", actions: [{ key: "pos.button_split", label: "Yes" }] },
    { label: "Show Button : Hold", actions: [{ key: "pos.button_hold", label: "Yes" }] },
    { label: "Show Button : KOT", actions: [{ key: "pos.button_kot", label: "Yes" }] },
    { label: "Show Button : KOT & Print", actions: [{ key: "pos.button_kot_print", label: "Yes" }] },
    { label: "Show Button : Save & KOT Print", actions: [{ key: "pos.button_save_kot_print", label: "Yes" }] },
    { label: "Show Due payment box", actions: [{ key: "pos.show_due_box", label: "Yes" }] },
    { label: "Special Note", actions: [{ key: "pos.special_note", label: "Yes" }] },
    { label: "Show Sap Box", actions: [{ key: "pos.show_sap_box", label: "Yes" }] },
    { label: "Language Profile", actions: [{ key: "pos.language_profile", label: "Yes" }] },
    { label: "Table Size", actions: [{ key: "pos.table_size_toggle", label: "Large" }] },
    { label: "Cash Drawer", actions: [{ key: "pos.cash_drawer", label: "Yes" }] },
    { label: "Manual Open Cash Drawer", actions: [{ key: "pos.cash_drawer_open", label: "Yes" }] },
    { label: "Day End", actions: [{ key: "pos.day_end", label: "Yes" }] },
    { label: "Blind Day End", actions: [{ key: "pos.blind_day_end", label: "Yes" }] },
    {
      label: "Allow payment type",
      actions: [
        { key: "pos.payment.cash", label: "Cash" },
        { key: "pos.payment.card", label: "Card" },
        { key: "pos.payment.due", label: "Due" },
        { key: "pos.payment.other", label: "Other" },
        { key: "pos.payment.part", label: "Part" },
        { key: "pos.payment.not_paid", label: "Not Paid" },
        { key: "pos.payment.upi", label: "UPI" },
      ],
    },
    {
      label: "Update Payment Type",
      actions: [
        { key: "pos.payment_update.after_save", label: "After Save" },
        { key: "pos.payment_update.after_print", label: "After Print" },
        { key: "pos.payment_update.after_settle", label: "After Settle & Save" },
      ],
    },
    { label: "Show Current Order Details", actions: [{ key: "pos.show_current_order_details", label: "Yes" }] },
    { label: "Order Live View", actions: [{ key: "pos.order_live_view", label: "Yes" }] },
    { label: "KOT Live View", actions: [{ key: "pos.kot_live_view", label: "Yes" }] },
    { label: "Show Close button on live view card", actions: [{ key: "pos.live_view_close_button", label: "Yes" }] },
    {
      label: "Item Master",
      actions: [
        { key: "pos.item_master.read", label: "Read" },
        { key: "pos.item_master.write", label: "Write" },
      ],
    },
    {
      label: "Item Variation Management",
      actions: [
        { key: "pos.item_variation.read", label: "Read" },
        { key: "pos.item_variation.write", label: "Write" },
      ],
    },
    { label: "Store On Off", actions: [{ key: "pos.store_toggle", label: "Yes" }] },
    { label: "Item On Off", actions: [{ key: "pos.item_toggle", label: "Yes" }] },
    {
      label: "Expense & Withdrawal Management",
      actions: [
        { key: "pos.expenses.read", label: "Read" },
        { key: "pos.expenses.write", label: "Write" },
      ],
    },
    { label: "Manual Sync", actions: [{ key: "pos.manual_sync", label: "Yes" }] },
    {
      label: "Show multiple billing screen configuration settings (Only for multiple screens)",
      actions: [{ key: "pos.multi_screen_config", label: "Yes" }],
    },
    {
      label: "Do not consider advance/due payment in order/executive sales summary",
      actions: [{ key: "pos.ignore_advance_in_summary", label: "Yes" }],
    },
    { label: "Hide Due Payment Full Settlement", actions: [{ key: "pos.hide_due_full_settlement", label: "Yes" }] },
  ],

  "Order & KOT Management": [
    {
      label: "KOT Management",
      actions: [
        { key: "kot.manage.read", label: "Read" },
        { key: "kot.manage.write", label: "Write" },
      ],
    },
    { label: "Move KOT/Items", actions: [{ key: "kot.move_items", label: "Yes" }] },
    {
      label: "Cancel KOT",
      actions: [
        { key: "kot.cancel.reason", label: "Reason" },
        { key: "kot.cancel.password", label: "Reason With Password" },
      ],
    },
    {
      label: "Reprint KOT",
      actions: [
        { key: "kot.reprint", label: "Without Password" },
        { key: "kot.reprint.password", label: "With Password" },
      ],
    },
    { label: "Logout after KOT print", actions: [{ key: "kot.logout_after_print", label: "Yes" }] },
    {
      label: "Allow after bill print order modification",
      actions: [
        { key: "kot.after_print.add_item", label: "Add item" },
        { key: "kot.after_print.modify_delete", label: "Modify & Delete item" },
      ],
    },
    {
      label: "Allow after bill save order modification",
      actions: [
        { key: "kot.after_save.add_item", label: "Add item" },
        { key: "kot.after_save.modify_delete", label: "Modify & Delete item" },
      ],
    },
    {
      label: "Check Items",
      actions: [
        { key: "kot.check_items.view", label: "View" },
        { key: "kot.check_items.modify", label: "Modify" },
        { key: "kot.check_items.print", label: "Print" },
      ],
    },
    { label: "Allow delete first time added item in order", actions: [{ key: "order.item_delete_first_time", label: "Yes" }] },
    { label: "Advanced Order", actions: [{ key: "order.advanced_management", label: "Yes" }] },
    { label: "Pending Order", actions: [{ key: "order.pending_management", label: "Yes" }] },
    { label: "Edit Advanced Order", actions: [{ key: "order.edit_advanced", label: "Yes" }] },
    { label: "Allow edit fully settled advance order", actions: [{ key: "order.edit_settled_advance", label: "Yes" }] },
    { label: "Allow Auto acceptance configuration change", actions: [{ key: "order.auto_accept_config", label: "Yes" }] },
    { label: "Do not show autoaccept order", actions: [{ key: "order.hide_autoaccept", label: "Yes" }] },
    { label: "Show Custom Order Status Configuration", actions: [{ key: "order.custom_status_config", label: "Yes" }] },
    { label: "Show Virtual Wallet Configuration", actions: [{ key: "order.virtual_wallet_config", label: "Yes" }] },
    { label: "Table Reservation", actions: [{ key: "order.table_reservation", label: "Yes" }] },
    { label: "Add Table", actions: [{ key: "order.add_table", label: "Yes" }] },
    { label: "Allow Pending Order Edit Rights", actions: [{ key: "order.pending_order_edit", label: "Yes" }] },
    { label: "Hide print button on live view card", actions: [{ key: "order.hide_print_live_view", label: "Yes" }] },
  ],

  "Bill Modifications, Discounts & Security": [
    {
      label: "Cancel Bill",
      actions: [
        { key: "bill.cancel.reason", label: "Reason" },
        { key: "bill.cancel.password", label: "Reason With Password" },
      ],
    },
    {
      label: "Reprint Bill",
      actions: [
        { key: "bill.reprint", label: "Without Password" },
        { key: "bill.reprint.password", label: "With Password" },
      ],
    },
    {
      label: "Allow after bill save bill modification",
      actions: [
        { key: "bill.after_save.add_item", label: "Add item" },
        { key: "bill.after_save.modify_delete", label: "Modify & Delete item" },
      ],
    },
    {
      label: "Allow after bill settle & save bill modification",
      actions: [
        { key: "bill.after_settle.add_item", label: "Add item" },
        { key: "bill.after_settle.modify_delete", label: "Modify & Delete item" },
      ],
    },
    { label: "Require Reason for Bill Modification", actions: [{ key: "bill.require_reason", label: "Yes" }] },
    {
      label: "Ask reason on edit/delete bill and kot",
      actions: [
        { key: "bill.edit_ask_reason", label: "Reason" },
        { key: "bill.edit_ask_reason_password", label: "Reason With Password" },
      ],
    },
    { label: "Logout after Bill print", actions: [{ key: "bill.logout_after_print", label: "Yes" }] },
    { label: "Allow editing of automatic charges on biller", actions: [{ key: "bill.edit_auto_charges", label: "Yes" }] },
    {
      label: "Discount Configuration",
      actions: [
        { key: "discounts.config.read", label: "Read" },
        { key: "discounts.config.write", label: "Write" },
      ],
    },
    { label: "Allow Special Discount", actions: [{ key: "discounts.special", label: "Yes" }] },
    {
      label: "Allow Normal Discount",
      actions: [
        { key: "discounts.after_print", label: "After Bill Print" },
        { key: "discounts.after_settle", label: "After Bill Settle & Save" },
      ],
    },
    {
      label: "Complimentary Bill",
      actions: [
        { key: "bill.complimentary", label: "Reason" },
        { key: "bill.complimentary.password", label: "Reason With Password" },
      ],
    },
    {
      label: "NC Items (Non-Chargeable)",
      actions: [
        { key: "bill.nc_items", label: "Reason" },
        { key: "bill.nc_items.password", label: "Reason With Password" },
      ],
    },
    {
      label: "Sales Return Bill",
      actions: [
        { key: "bill.sales_return", label: "Reason" },
        { key: "bill.sales_return.password", label: "Reason With Password" },
      ],
    },
    { label: "Show only my created Bill/KOT", actions: [{ key: "bill.show_only_own", label: "Yes" }] },
    { label: "Restrict changes to orders with due payment", actions: [{ key: "bill.restrict_due_modifications", label: "Yes" }] },
    { label: "Allow return cash option in advance orders", actions: [{ key: "bill.allow_return_cash_advance", label: "Yes" }] },
  ],

  "Inventory & Stock Management": [
    {
      label: "Menu Item Stock",
      actions: [
        { key: "inventory.menu_stock.read", label: "Read" },
        { key: "inventory.menu_stock.write", label: "Write" },
      ],
    },
    {
      label: "Purchase",
      actions: [
        { key: "inventory.purchase.read", label: "Read" },
        { key: "inventory.purchase.write", label: "Write" },
      ],
    },
    { label: "Indent", actions: [{ key: "inventory.indent", label: "Yes" }] },
    {
      label: "Stock Management",
      actions: [
        { key: "inventory.stock.read", label: "Read" },
        { key: "inventory.stock.write", label: "Write" },
      ],
    },
    {
      label: "Internal Transfers",
      actions: [
        { key: "inventory.transfers.read", label: "Read" },
        { key: "inventory.transfers.write", label: "Write" },
      ],
    },
    {
      label: "Request For Purchase (RFP)",
      actions: [
        { key: "inventory.rfp.read", label: "Read" },
        { key: "inventory.rfp.write", label: "Write" },
      ],
    },
    {
      label: "Real Time Stock",
      actions: [
        { key: "inventory.realtime.read", label: "Read" },
        { key: "inventory.realtime.write", label: "Write" },
      ],
    },
    {
      label: "Raw Materials",
      actions: [
        { key: "inventory.raw_materials.read", label: "Read" },
        { key: "inventory.raw_materials.write", label: "Write" },
      ],
    },
    {
      label: "Wastage",
      actions: [
        { key: "inventory.wastage.read", label: "Read" },
        { key: "inventory.wastage.write", label: "Write" },
      ],
    },
    {
      label: "Rate Card",
      actions: [
        { key: "inventory.rate_card.read", label: "Read" },
        { key: "inventory.rate_card.write", label: "Write" },
      ],
    },
    {
      label: "Manual Stock (available stock)",
      actions: [
        { key: "inventory.manual_stock.read", label: "Read" },
        { key: "inventory.manual_stock.write", label: "Write" },
      ],
    },
    { label: "Allow paid/unpaid functionality in inventory", actions: [{ key: "inventory.paid_unpaid_rights", label: "Yes" }] },
    { label: "Inventory Report", actions: [{ key: "inventory.reports", label: "Yes" }] },
    {
      label: "Supplier",
      actions: [
        { key: "inventory.supplier.read", label: "Read" },
        { key: "inventory.supplier.write", label: "Write" },
      ],
    },
    {
      label: "Production Master Module",
      actions: [
        { key: "inventory.production.read", label: "Read" },
        { key: "inventory.production.write", label: "Write" },
      ],
    },
  ],

  "Settlement": [
    { label: "Settle & Save", actions: [{ key: "settlement.save", label: "Yes" }] },
    {
      label: "Update Payment Type",
      actions: [
        { key: "pos.payment_update.after_save", label: "After Save" },
        { key: "pos.payment_update.after_print", label: "After Print" },
        { key: "pos.payment_update.after_settle", label: "After Settle & Save" },
      ],
    },
    { label: "Allow after bill settle & save bill modification", actions: [{ key: "settlement.modify", label: "Yes" }] },
    { label: "Print bill on Settle & Save", actions: [{ key: "settlement.print", label: "Yes" }] },
    {
      label: "Allow Normal Discount",
      actions: [
        { key: "discounts.after_print", label: "After Bill Print" },
        { key: "settlement.discount", label: "After Bill Settle & Save" },
      ],
    },
  ],

  "Configuration, Reports & System": [
    {
      label: "Reports",
      actions: [
        { key: "system.reports", label: "Read" },
        { key: "reports.access", label: "Write" },
      ],
    },
    { label: "Allow Graphical Analytics in Reports", actions: [{ key: "system.graphical_analytics", label: "Yes" }] },
    { label: "Finance Dashboard", actions: [{ key: "system.finance_dashboard", label: "Yes" }] },
    { label: "Configure profit and loss (P&L)", actions: [{ key: "system.configure_pnl", label: "Yes" }] },
    {
      label: "Tax Configuration",
      actions: [
        { key: "system.tax_config.read", label: "Read" },
        { key: "system.tax_config.write", label: "Write" },
      ],
    },
    {
      label: "Category wise taxes",
      actions: [
        { key: "system.category_taxes.read", label: "Read" },
        { key: "system.category_taxes.write", label: "Write" },
      ],
    },
    {
      label: "Point of Sale Configuration Details",
      actions: [
        { key: "system.pos_config.read", label: "Read" },
        { key: "system.pos_config.write", label: "Write" },
      ],
    },
    {
      label: "Area & Table Management",
      actions: [
        { key: "system.area_table.read", label: "Read" },
        { key: "system.area_table.write", label: "Write" },
      ],
    },
    {
      label: "Customer Management",
      actions: [
        { key: "system.customer_manage.read", label: "Read" },
        { key: "system.customer_manage.write", label: "Write" },
      ],
    },
    {
      label: "Delivery Boy Management",
      actions: [
        { key: "system.delivery_boys.read", label: "Read" },
        { key: "system.delivery_boys.write", label: "Write" },
      ],
    },
    { label: "Show customer complaint(s) POS", actions: [{ key: "system.show_complaints", label: "Yes" }] },
    {
      label: "Allow Complaint Actions",
      actions: [
        { key: "system.complaint_actions.read", label: "Read" },
        { key: "system.complaint_actions.write", label: "Write" },
      ],
    },
    {
      label: "Available Channel In Order",
      actions: [
        { key: "system.order_channel.delivery", label: "Delivery" },
        { key: "system.order_channel.pickup", label: "Pick Up" },
        { key: "system.order_channel.dinein", label: "Dine In" },
      ],
    },
    { label: "Enable Multiple Shortcodes in item level", actions: [{ key: "system.multiple_shortcodes", label: "Yes" }] },
  ],
};

// Report Summary Rights (Desktop Report Rights)
export const PETPOOJA_REPORTS = [
  { key: "reports.category_summary", label: "Category Summary" },
  { key: "reports.item_summary", label: "Item Summary" },
  { key: "reports.sales_summary", label: "Sales Summary" },
  { key: "reports.order_summary", label: "Order Summary" },
  { key: "reports.executive_sales", label: "Executive Sales Summary" },
  { key: "reports.employee_summary", label: "Employee Summary" },
  { key: "reports.group_summary", label: "Group Summary" },
  { key: "reports.variation_summary", label: "Variation Summary" },
  { key: "reports.coversize_summary", label: "Coversize Summary" },
  { key: "reports.tip_summary", label: "Tip Summary" },
  { key: "reports.counter_summary", label: "Counter Summary" },
  { key: "reports.locality_summary", label: "Locality Wise Summary" },
  { key: "reports.captain_summary", label: "Captain Wise Summary" },
  { key: "reports.settlement_summary", label: "Settlement Summary" },
  { key: "reports.nc_summary", label: "NC Item Summary" },
  { key: "reports.assignee_summary", label: "Assignee Wise Summary" },
];

export const ALL_SYSTEM_KEYS = PERMISSIONS.map((p) => p.key);

const CATEGORY_ICONS: Record<PetpoojaCategory, typeof ShieldCheck> = {
  "All Permissions": SlidersHorizontal,
  "POS & Billing Operations": CreditCard,
  "Order & KOT Management": FileText,
  "Bill Modifications, Discounts & Security": ShieldCheck,
  "Inventory & Stock Management": Package,
  "Settlement": Layers,
  "Configuration, Reports & System": Settings,
  "Reports": FileText,
  "Tables *": TableIcon,
};

export function PetpoojaPermissionsEditor({
  selected,
  onToggle,
  onSetAll,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onSetAll?: (keys: string[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<PetpoojaCategory>("POS & Billing Operations");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportDays, setReportDays] = useState<Record<string, string>>({});
  const { branchId } = useBranch();
  const { data: floors } = useFloors(branchId);

  // Compute keys per category for counters and bulk selection
  const categoryKeyMap = useMemo(() => {
    const map = new Map<PetpoojaCategory, string[]>();

    // 1. Defined standard rows
    for (const [cat, rows] of Object.entries(CATEGORY_ROW_DEFINITIONS)) {
      const keys = rows.flatMap((r) => r.actions.map((a) => a.key));
      map.set(cat as PetpoojaCategory, keys);
    }

    // 2. Reports
    map.set("Reports", PETPOOJA_REPORTS.map((r) => r.key));

    // 3. Tables
    map.set("Tables *", ["tables.assigned.all"]);

    // 4. All
    map.set("All Permissions", ALL_SYSTEM_KEYS);

    return map;
  }, []);

  // Compute count of granted permissions per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { granted: number; total: number }> = {};
    for (const cat of PETPOOJA_CATEGORIES) {
      const keys = categoryKeyMap.get(cat) ?? [];
      const granted = keys.filter((k) => selected.includes(k)).length;
      counts[cat] = { granted, total: keys.length };
    }
    return counts;
  }, [categoryKeyMap, selected]);

  // Search filter
  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.trim().toLowerCase();

  const handleSelectCurrentCategory = () => {
    if (!onSetAll) return;
    const catKeys = categoryKeyMap.get(activeCategory) ?? [];
    const next = Array.from(new Set([...selected, ...catKeys]));
    onSetAll(next);
  };

  const handleClearCurrentCategory = () => {
    if (!onSetAll) return;
    const catKeys = new Set(categoryKeyMap.get(activeCategory) ?? []);
    onSetAll(selected.filter((k) => !catKeys.has(k)));
  };

  const handleSelectAll = () => {
    if (onSetAll) onSetAll(ALL_SYSTEM_KEYS);
  };

  const handleClearAll = () => {
    if (onSetAll) onSetAll([]);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Search & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-5 py-3">
        <div className="relative min-w-[280px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search rights (e.g. billing, discount, kot, print)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Badge variant="secondary" className="font-medium text-xs px-2.5 py-1">
            Permissions ({selected.length} / {ALL_SYSTEM_KEYS.length} granted)
          </Badge>

          {onSetAll && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectCurrentCategory}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Select category ({categoryCounts[activeCategory]?.total ?? 0})
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={handleClearCurrentCategory}
                className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                Clear category
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Select all
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-destructive hover:underline font-medium cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Sidebar + Right Permissions Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Category Sidebar */}
        <div className="w-72 shrink-0 border-r border-border bg-muted/20 flex flex-col overflow-y-auto">
          <div className="p-2 space-y-1">
            {PETPOOJA_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category] || ShieldCheck;
              const isActive = activeCategory === category && !isSearching;
              const count = categoryCounts[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    if (isSearching) setSearchQuery("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-md transition-colors text-left ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-2 shadow-xs"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate">{category}</span>
                  </div>
                  {count && (
                    <span
                      className={`ml-2 text-[11px] shrink-0 px-1.5 py-0.5 rounded font-mono ${
                        count.granted > 0
                          ? isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {count.granted}/{count.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-4 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Petpooja POS Security Engine v2.0</span>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-card/30">
          {isSearching ? (
            // Search Results Mode
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </h3>
                <span className="text-xs text-muted-foreground">
                  Matching permissions across all categories
                </span>
              </div>

              <div className="divide-y divide-border/40 rounded-lg border border-border bg-card overflow-hidden">
                {PERMISSIONS.filter(
                  (p) =>
                    p.label.toLowerCase().includes(q) ||
                    p.key.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q),
                ).map((p) => {
                  const isChecked = selected.includes(p.key);
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">{p.label}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono text-[11px]">{p.key}</span>
                          <span>•</span>
                          <span className="text-primary">{p.category}</span>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox checked={isChecked} onCheckedChange={() => onToggle(p.key)} />
                        <span className="text-xs font-medium text-foreground">Granted</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeCategory === "Reports" ? (
            // Reports Table Mode
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Desktop Report Rights</h3>
                  <p className="text-xs text-muted-foreground">
                    Control visibility of operational report summaries and date range access.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Report Name</th>
                      <th className="py-3 px-4 w-36">Display Value</th>
                      <th className="py-3 px-4 w-48 text-right">Day Restrictions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {PETPOOJA_REPORTS.map((report) => {
                      const isChecked = selected.includes(report.key);
                      return (
                        <tr
                          key={report.key}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-foreground">
                            {report.label}
                            <div className="text-[11px] font-mono text-muted-foreground">{report.key}</div>
                          </td>
                          <td className="py-3 px-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <Checkbox checked={isChecked} onCheckedChange={() => onToggle(report.key)} />
                              <span className="text-xs font-medium text-foreground">Show</span>
                            </label>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={reportDays[report.key] || "no_restriction"}
                              onChange={(e) =>
                                setReportDays((prev) => ({ ...prev, [report.key]: e.target.value }))
                              }
                              disabled={!isChecked}
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                            >
                              <option value="no_restriction">No Restriction</option>
                              <option value="today">Today</option>
                              <option value="last_7_days">Last 7 Days</option>
                              <option value="last_30_days">Last 30 Days</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeCategory === "Tables *" ? (
            // Tables Assignment Mode
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Assigned Table Rights</h3>
                  <p className="text-xs text-muted-foreground">
                    Assign dining floors and tables accessible by this billing user.
                  </p>
                </div>
              </div>

              {/* Master All Tables Banner */}
              <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="all-tables-toggle"
                    checked={selected.includes("tables.assigned.all")}
                    onCheckedChange={() => onToggle("tables.assigned.all")}
                  />
                  <div>
                    <label htmlFor="all-tables-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                      All Tables &amp; Dining Areas
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Enable full operational access to every current and future table in the restaurant.
                    </p>
                  </div>
                </div>
                {selected.includes("tables.assigned.all") && (
                  <Badge variant="default" className="text-xs">
                    Full Access Active
                  </Badge>
                )}
              </div>

              {/* Floor & Table Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Restaurant Floors &amp; Tables
                </h4>

                {floors && floors.length > 0 ? (
                  floors.map((floor) => (
                    <div key={floor.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                          Floor / Area: {floor.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {floor.tables.length} tables
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {floor.tables.map((table) => {
                          const isAssigned = selected.includes("tables.assigned.all");
                          return (
                            <div
                              key={table.id}
                              className={`p-2.5 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                isAssigned
                                  ? "border-primary/40 bg-primary/10 text-primary font-medium shadow-xs"
                                  : "border-border bg-muted/20 text-muted-foreground"
                              }`}
                            >
                              <TableIcon className="h-4 w-4" />
                              <span className="text-xs font-semibold">Table {table.number}</span>
                              <span className="text-[10px] opacity-80">{table.capacity} Seats</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    <TableIcon className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p>No active floor tables found for current branch.</p>
                    <p className="text-[11px] mt-1">
                      Check &ldquo;All Tables &amp; Dining Areas&rdquo; above to automatically grant full access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : activeCategory === "All Permissions" ? (
            // All Permissions Comprehensive View
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">All Permissions Catalog</h3>
                  <p className="text-xs text-muted-foreground">
                    Complete listing of all operational, billing, and system rights.
                  </p>
                </div>
              </div>

              {(
                Object.keys(CATEGORY_ROW_DEFINITIONS) as Array<
                  keyof typeof CATEGORY_ROW_DEFINITIONS
                >
              ).map((catName) => {
                const rows = CATEGORY_ROW_DEFINITIONS[catName] || [];
                return (
                  <div key={catName} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                      {catName}
                    </h4>

                    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-muted/30 transition-colors gap-2"
                        >
                          <span className="text-sm font-medium text-foreground">{row.label}</span>
                          <div className="flex flex-wrap items-center gap-5">
                            {row.actions.map((action) => {
                              const checked = selected.includes(action.key);
                              return (
                                <label
                                  key={action.key}
                                  className="flex items-center gap-1.5 cursor-pointer select-none"
                                >
                                  <Checkbox checked={checked} onCheckedChange={() => onToggle(action.key)} />
                                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Standard Category View (POS & Billing, Order & KOT, Bill Mod, Inventory, Settlement, Config)
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{activeCategory}</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure granular operational and security rights for this role.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
                {/* Table Header */}
                <div className="flex items-center justify-between bg-muted/50 px-4 py-2.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{activeCategory}</span>
                  <span className="text-right">Action</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/40">
                  {(
                    CATEGORY_ROW_DEFINITIONS[
                      activeCategory as keyof typeof CATEGORY_ROW_DEFINITIONS
                    ] || []
                  ).map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                        {row.description && (
                          <span className="text-xs text-muted-foreground">{row.description}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        {row.actions.map((action) => {
                          const checked = selected.includes(action.key);
                          return (
                            <label
                              key={action.key}
                              className="flex items-center gap-2 cursor-pointer select-none"
                            >
                              <Checkbox checked={checked} onCheckedChange={() => onToggle(action.key)} />
                              <span className="text-xs font-medium text-foreground">{action.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
