"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing. Please click the link from your email or request a new one.");
      return;
    }

    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    resetPassword.mutate(
      { token, password },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status >= 500) {
            setError("Server error encountered. Please try again shortly.");
          } else if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Network connection issue. Please check your internet connection.");
          }
        },
      },
    );
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Link href="/">
          <Logo size={44} />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hanva Fine Dine
        </h1>
        <p className="text-sm text-muted-foreground">Set your new password</p>
      </div>

      {!token ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <h2 className="text-sm font-semibold">Missing Reset Token</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            This password reset link is invalid or incomplete. Please request a fresh link.
          </p>
          <Button asChild className="h-11 w-full">
            <Link href="/forgot-password">Request New Reset Link</Link>
          </Button>
        </div>
      ) : isSuccess ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <h2 className="text-base font-semibold">Password Reset Complete</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your password has been securely updated. You can now sign in with your new password.
          </p>
          <Button asChild className="mt-2 h-11 w-full">
            <Link href="/login">Sign in Now</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              autoFocus
              className="h-11"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              className="h-11"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 h-12 text-base gap-2"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating password…</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                <span>Update Password</span>
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Remember your credentials?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Back to Sign in
            </Link>
          </p>
        </form>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
