"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to /login
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 p-8 text-center shadow-lg backdrop-blur-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link href="/login">
            <Logo size={48} />
          </Link>
          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Self-Registration Disabled
          </h1>
          <p className="text-sm text-muted-foreground">
            Public restaurant creation is disabled. Restaurant instances and owner accounts can only be provisioned by authorized backend systems.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 text-xs text-muted-foreground text-left space-y-1">
          <p className="font-medium text-foreground">Security Policy</p>
          <p>
            To maintain strict data isolation, new tenant onboarding must be initiated directly by system administrators via the backend management CLI.
          </p>
        </div>

        <div className="mt-6">
          <Button
            onClick={() => router.replace("/login")}
            className="w-full h-11 text-sm font-medium gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Sign In
          </Button>
        </div>
      </div>
    </main>
  );
}
