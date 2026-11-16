"use client";

import type { SessionUser } from "@nodedr-restaurant/types";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EntityDialogHost } from "@/components/layout/entity-dialog-host";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { BrandFooter } from "./brand-footer";
import { BranchSwitcher } from "./branch-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { LicensePill } from "./license-pill";
import { Logo } from "./logo";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

function RestaurantBrand({ collapsed = false }: { collapsed?: boolean }) {
  const { branchId } = useBranch();
  const { data } = useSettings(branchId);
  const restaurant = data?.restaurant;
  const [imgFailed, setImgFailed] = useState(false);
  const restaurantName = restaurant?.name ?? "Hanva Fine Dine";

  if (collapsed) {
    if (restaurant?.logoUrl && !imgFailed) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={restaurant.logoUrl}
          alt={restaurantName}
          title={restaurantName}
          className="h-8 w-8 shrink-0 rounded-lg object-contain"
          onError={() => setImgFailed(true)}
        />
      );
    }
    return (
      <div title={restaurantName}>
        <Logo />
      </div>
    );
  }

  if (restaurant?.logoUrl && !imgFailed) {
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={restaurant.logoUrl}
          alt={restaurantName}
          className="h-8 w-8 shrink-0 rounded-lg object-contain"
          onError={() => setImgFailed(true)}
        />
        <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
          {restaurantName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo />
      <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
        {restaurantName}
      </span>
    </div>
  );
}

function AppShellContent({
  user,
  children,
}: {
  user?: SessionUser;
  children: React.ReactNode;
}) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden h-screen sticky top-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out lg:flex overflow-hidden",
          isCollapsed ? "w-[68px]" : "w-64",
        )}
      >
        {/* Brand Header with Collapse Toggle */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border/30 transition-all",
            isCollapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <RestaurantBrand collapsed={isCollapsed} />
          </div>
          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Branch Switcher */}
        <div className={cn("shrink-0 pt-3 pb-1 transition-all", isCollapsed ? "px-2" : "px-3")}>
          <BranchSwitcher collapsed={isCollapsed} />
        </div>

        {/* Navigation links - Scrollable within viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/15 hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/25">
          <SidebarNav user={user} collapsed={isCollapsed} />
        </div>

        {/* Bottom Expand Toggle in Collapsed Mode / Full Footer in Expanded Mode */}
        {isCollapsed ? (
          <div className="flex shrink-0 items-center justify-center border-t border-sidebar-border/40 p-2.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="shrink-0 mt-auto">
            <BrandFooter />
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground p-0 flex flex-col h-full border-r border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 shrink-0 items-center px-5 border-b border-sidebar-border/30">
            <RestaurantBrand />
          </div>
          <div className="shrink-0 px-3 pt-3 pb-1">
            <BranchSwitcher />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/15">
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="shrink-0 mt-auto">
            <BrandFooter />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile drawer button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Sidebar Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LicensePill />
            <LanguageSwitcher compact />
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
        <EntityDialogHost />
      </div>

      <MobileBottomNav user={user} onMore={() => setMobileOpen(true)} />
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user?: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppShellContent user={user}>{children}</AppShellContent>
    </SidebarProvider>
  );
}
