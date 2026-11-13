"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { BranchProvider, useBranch } from "@/hooks/use-branch";
import { useRealtime } from "@/hooks/use-realtime";
import { CaptainInstallPrompt } from "@/components/captain/captain-install-prompt";

// RealtimeBridge subscribes this Captain layout to push updates
// for orders, KOTs, tables, and table requests.
function RealtimeBridge() {
  const { branchId } = useBranch();
  useRealtime(branchId);
  return null;
}

export function CaptainClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && (isError || !data?.user)) {
      const returnUrl = encodeURIComponent(pathname || "/captain");
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isError, data, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border shadow-md bg-white">
            <img
              src="/icons/captain-192.png"
              alt="SERVIO Captain"
              className="h-full w-full object-cover animate-pulse"
            />
          </div>
          <p className="text-xs font-semibold tracking-wide text-foreground">
            Connecting to SERVIO Captain…
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data?.user) {
    return null;
  }

  return (
    <BranchProvider>
      <RealtimeBridge />
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-background text-foreground antialiased select-none pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {children}
        <CaptainInstallPrompt />
      </div>
    </BranchProvider>
  );
}
