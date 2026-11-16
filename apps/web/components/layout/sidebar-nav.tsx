"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ShoppingCart } from "lucide-react";
import type { SessionUser } from "@nodedr-restaurant/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS, type NavItem, type NavSection } from "./nav-items";

const SECTIONS_ORDER: NavSection[] = [
  "OPERATIONS",
  "CATALOG & INVENTORY",
  "GROWTH & CRM",
  "FINANCE & REPORTS",
  "ADMINISTRATION",
];

export function SidebarNav({
  user,
  onNavigate,
}: {
  user?: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();

  const roleUpper = user?.roleName?.trim().toUpperCase() ?? "";
  const isCashier = roleUpper === "CASHIER" || roleUpper.includes("CASHIER");
  const isPosActive = pathname === "/pos" || pathname?.startsWith("/pos");

  const handleNewSaleClick = () => {
    onNavigate?.();
    if (isPosActive && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pos:new-sale"));
    }
  };

  // Filter allowed items
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/captain") return false;
    if (isCashier && item.href === "/pos") return false;
    return !item.permission || hasPermission(user, item.permission);
  });

  // Group by section
  const groupedItems = SECTIONS_ORDER.map((section) => ({
    section,
    items: visibleNavItems.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-4 px-3">
      {/* High-priority New Sale POS action button for quick touch entry */}
      <div className="pb-1 border-b border-sidebar-border/60">
        <Link
          href="/pos"
          onClick={handleNewSaleClick}
          aria-current={isPosActive ? "page" : undefined}
          className={cn(
            "group relative flex items-center justify-between gap-2.5 overflow-hidden rounded-xl bg-primary px-3.5 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]",
            isPosActive && "ring-2 ring-primary ring-offset-2 ring-offset-sidebar",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground transition-transform group-hover:scale-110">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-extrabold tracking-tight text-primary-foreground">
              {t("nav.newSale")}
            </span>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground">
            <ShoppingCart className="h-3 w-3" />
            POS
          </span>
        </Link>
      </div>

      {/* Grouped Navigation Sections */}
      {groupedItems.map((group, groupIdx) => (
        <div key={group.section} className="flex flex-col gap-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50 select-none">
            {group.section}
          </div>
          {group.items.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-2xs"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
                  )}
                  strokeWidth={2}
                />
                <span className="truncate">{t(item.labelKey)}</span>
                {badges.nav[item.href] && !isActive ? <NavDot /> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
