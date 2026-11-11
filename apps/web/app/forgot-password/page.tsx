"use client";

import { forgotPasswordSchema, type ForgotPasswordDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { safeZodResolver } from "@/lib/safe-zod-resolver";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; resetUrl?: string } | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: safeZodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (dto: ForgotPasswordDto) => {
    setError(null);
    forgotPassword.mutate(dto, {
      onSuccess: (data) => {
        setSuccessInfo(data);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status >= 500) {
          setError("The server encountered an issue right now. Please try again shortly.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Could not reach the server. Please check your internet connection.");
        }
      },
    });
  };

  const onInvalid = (fieldErrors: typeof errors) => {
    if (fieldErrors.email?.message) {
      setError(fieldErrors.email.message);
    } else {
      setError("Please enter a valid email address.");
    }
  };

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
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
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </div>

        {successInfo ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <h2 className="text-base font-semibold">Check your email</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {successInfo.message}
            </p>

            {successInfo.resetUrl && (
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <span className="font-semibold text-primary">Direct Reset Link:</span>
                <p className="text-muted-foreground">
                  (SMTP is not yet configured on this instance, so you can reset immediately below)
                </p>
                <Button
                  asChild
                  variant="default"
                  className="mt-1 h-10 gap-1.5"
                >
                  <Link href={successInfo.resetUrl}>
                    <span>Set New Password</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}

            <Button asChild variant="outline" className="mt-2 h-11 w-full gap-2">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Sign in</span>
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Account email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  className="h-11 pl-10"
                  placeholder="you@restaurant.com"
                  {...register("email")}
                />
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
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
              className="mt-2 h-12 text-base"
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>

            <Button asChild variant="ghost" className="h-10 text-xs text-muted-foreground hover:text-foreground">
              <Link href="/login" className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign in</span>
              </Link>
            </Button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
