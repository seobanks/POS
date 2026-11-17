"use client";

import { loginSchema, type LoginDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2, WifiOff, Coffee, Sparkles, Citrus } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { isWaiterUser, useCurrentUser, useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { RestaurantBackdrop } from "@/components/login/restaurant-backdrop";
import { WaiterConcierge, type WaiterMood } from "@/components/login/waiter-concierge";
import { BeverageGauge } from "@/components/login/beverage-gauge";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { data: auth, isSuccess: isAuthenticated } = useCurrentUser();

  useEffect(() => {
    if (isAuthenticated && auth?.user) {
      if (isWaiterUser(auth.user)) {
        router.replace("/captain");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, auth, router]);

  // Set once the server says this account uses two-factor authentication.
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [focusedField, setFocusedField] = useState<"username" | "password" | "totp" | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [flavor, setFlavor] = useState<"mango" | "coffee" | "berry">("mango");

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const prefersReducedMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: safeZodResolver(loginSchema) });

  const emailValue = watch("email") || "";
  const passwordValue = watch("password") || "";

  // Dynamic Liquid progress: username gives up to 50%, password gives up to 50%
  const fillProgress = useMemo(() => {
    const userScore = Math.min((emailValue.trim().length / 6) * 50, 50);
    const passScore = Math.min((passwordValue.length / 8) * 50, 50);
    return Math.min(Math.round(userScore + passScore), 100);
  }, [emailValue, passwordValue]);

  // Determine Waiter Mascot Mood
  const waiterMood = useMemo<WaiterMood>(() => {
    if (login.isPending) return "submitting";
    if (error || Object.keys(errors).length > 0) return "error";
    if (focusedField === "password") return "password";
    if (focusedField === "username") return "username";
    if (emailValue.length > 0 || passwordValue.length > 0) return "username";
    return "idle";
  }, [login.isPending, error, errors, focusedField, emailValue, passwordValue]);

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    login.mutate(dto, {
      onSuccess: (data) => {
        const isWaiter = isWaiterUser(data?.user);
        window.location.href = isWaiter ? "/captain" : "/dashboard";
      },
      onError: (err) => {
        if (err instanceof ApiError && err.message === "TWO_FACTOR_REQUIRED") {
          setNeedsCode(true);
          return;
        }
        if (err instanceof ApiError && err.status >= 500) {
          setError("The server is having a problem right now. Please try again in a minute.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Can't reach the server. Check your internet connection and try again.");
        }
      },
    });
  };

  const onInvalid = (fieldErrors: typeof errors) => {
    const firstKey = Object.keys(fieldErrors)[0] as keyof typeof fieldErrors;
    if (firstKey && fieldErrors[firstKey]?.message) {
      setError(fieldErrors[firstKey]!.message!);
    } else {
      setError("Please check your username or email and password.");
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-12">
      {/* Interactive Restaurant Living Backdrop */}
      <RestaurantBackdrop />

      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Top Waiter Concierge Character */}
        <div className="mb-4">
          <WaiterConcierge
            mood={waiterMood}
            isPasswordVisible={isPasswordVisible}
            charCount={emailValue.length}
          />
        </div>

        {/* Main Station Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-border/50"
        >
          {/* Header */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
              <Logo size={44} />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>Hanva Fine Dine</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Grand Concierge &middot; Staff Billing & Management Terminal
            </p>
          </div>

          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="mb-6 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-medium text-amber-300">
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>Offline Mode Active &middot; Cloud unreachable</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Your device is currently disconnected. If already signed in, jump directly into offline apps:
              </p>
              <div className="flex items-center gap-2 pt-1 font-medium">
                <Link
                  href="/pos"
                  className="rounded-md bg-amber-500/20 px-2 py-1 text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  POS (Biller) &rarr;
                </Link>
                <Link
                  href="/captain"
                  className="rounded-md bg-blue-500/20 px-2 py-1 text-blue-300 hover:bg-blue-500/30 transition-colors"
                >
                  Captain App &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Integrated 2-Column Experience on MD+ */}
          <div className="grid md:grid-cols-[160px_1fr] gap-6 items-center">
            {/* Left: Interactive Beverage Gauge & Recipe Flavor Picker */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/30 border border-border/50">
              <BeverageGauge progress={fillProgress} flavor={flavor} />

              {/* Flavor Selector Buttons */}
              <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setFlavor("mango")}
                  title="Golden Mango Mocktail"
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    flavor === "mango"
                      ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Citrus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFlavor("coffee")}
                  title="Cold Brew Coffee"
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    flavor === "coffee"
                      ? "bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-800/40"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Coffee className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFlavor("berry")}
                  title="Wild Berry Sundae"
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-all",
                    flavor === "berry"
                      ? "bg-rose-500/20 text-rose-500 border border-rose-500/40"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Login Form */}
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
              {/* Username Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Username or Email
                </Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  autoFocus
                  className="h-11 bg-background/60 transition-all focus-visible:ring-primary/40"
                  placeholder="Username or email address"
                  {...register("email")}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="h-11 bg-background/60 transition-all focus-visible:ring-primary/40"
                  placeholder="Your password"
                  onVisibilityChange={(visible) => setIsPasswordVisible(visible)}
                  {...register("password")}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* TOTP 2FA Input (if prompted) */}
              {needsCode && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="totp" className="text-xs font-medium">
                    Verification code
                  </Label>
                  <Input
                    id="totp"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="6-digit code or recovery code"
                    className="h-11 bg-background/60"
                    {...register("totp")}
                    onFocus={() => setFocusedField("totp")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Open your authenticator app, or use one of your recovery codes.
                  </p>
                  {errors.totp && <p className="text-xs text-destructive">{errors.totp.message}</p>}
                </div>
              )}

              {/* Inline Error Banner */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="mt-1 h-12 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.99] shadow-md shadow-primary/20"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enter Dining Room
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Secure Footer Notice */}
          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-[11px] text-muted-foreground/70 font-medium">
              Hanva POS Enterprise &middot; Authorized Personnel Only
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
