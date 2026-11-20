"use client";

import { loginSchema, type LoginDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  User,
  WifiOff,
} from "lucide-react";
import {
  BlueSwooshUnderline,
  ChefHatOutline,
  DeliveryScooterIcon,
  DineInClocheIcon,
  LoginCardFooterWaves,
  PosBillingIcon,
  ReportsAnalyticsIcon,
  SettingsControlIcon,
} from "@/components/login/login-artwork";
import { useLoginTransition } from "@/components/providers/login-transition";
import { isWaiterUser, useCurrentUser, useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { safeZodResolver } from "@/lib/safe-zod-resolver";
import { cn } from "@/lib/utils";

const REMEMBERED_USER_KEY = "hanva_remembered_user";

const FEATURES = [
  {
    id: "pos",
    line1: "POS",
    line2: "Billing",
    icon: PosBillingIcon,
  },
  {
    id: "dine-in",
    line1: "Dine-In",
    line2: "Management",
    icon: DineInClocheIcon,
  },
  {
    id: "delivery",
    line1: "Delivery",
    line2: "& Takeaway",
    icon: DeliveryScooterIcon,
  },
  {
    id: "reports",
    line1: "Reports",
    line2: "& Analytics",
    icon: ReportsAnalyticsIcon,
  },
  {
    id: "settings",
    line1: "Settings",
    line2: "& Control",
    icon: SettingsControlIcon,
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { data: auth, isSuccess: isAuthenticated } = useCurrentUser();
  const { isTransitioning, startLoginTransition } = useLoginTransition();
  const prefersReducedMotion = useReducedMotion();

  const submittingRef = useRef(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  // Warm the destination route bundles so the transition curtain lifts instantaneously
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/captain");
  }, [router]);

  useEffect(() => {
    if (isTransitioning || submittingRef.current || loginSucceeded) return;
    if (isAuthenticated && auth?.user) {
      if (isWaiterUser(auth.user)) {
        router.replace("/captain");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, auth, router, isTransitioning, loginSucceeded]);

  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: safeZodResolver(loginSchema) });

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_USER_KEY);
      if (saved) {
        setValue("email", saved);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage access errors in restricted browsers
    }
  }, [setValue]);

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    submittingRef.current = true;
    try {
      if (rememberMe && dto.email.trim()) {
        localStorage.setItem(REMEMBERED_USER_KEY, dto.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USER_KEY);
      }
    } catch {
      // Ignore storage errors
    }

    login.mutate(dto, {
      onSuccess: (data) => {
        const isWaiter = isWaiterUser(data?.user);
        const destination = isWaiter ? "/captain" : "/dashboard";
        setLoginSucceeded(true);

        // Brief beat so the user sees the crisp green checkmark confirmation
        // before the Hanva portal curtain sweeps smoothly into the dashboard.
        const curtainDelay = prefersReducedMotion ? 40 : 180;
        setTimeout(() => {
          startLoginTransition({
            userName: data?.user?.name,
            destination,
          });
        }, curtainDelay);
      },
      onError: (err) => {
        submittingRef.current = false;
        setLoginSucceeded(false);
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

  const isLeaving = loginSucceeded || isTransitioning;

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#1a120c] flex items-center justify-center">
      {/* Full-bleed Photorealistic Restaurant & POS Counter Background */}
      <motion.div
        animate={
          isLeaving && !prefersReducedMotion
            ? { scale: 1.07, filter: "blur(2px)" }
            : { scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-0 z-0 select-none"
      >
        <Image
          src="/login-bg.jpg"
          alt="Modern restaurant service counter with touchscreen POS terminal and receipt printer"
          fill
          priority
          sizes="100vw"
          className="object-cover object-left-bottom lg:object-center scale-[1.01]"
        />
        {/* Sculpted readability gradient: warm dark-wood tint top-left for crisp white text while keeping pendant lights & POS vivid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(125deg, rgba(18, 11, 6, 0.56) 0%, rgba(22, 14, 9, 0.34) 38%, rgba(18, 12, 8, 0.10) 68%, rgba(12, 10, 10, 0.22) 100%)",
          }}
        />
        {/* Subtle top lift so the white logo & headline pop cleanly */}
        <div
          className="absolute inset-x-0 top-0 h-[46%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(15, 9, 5, 0.44) 0%, rgba(15, 9, 5, 0.12) 65%, rgba(15, 9, 5, 0) 100%)",
          }}
        />
      </motion.div>

      {/* Main Two-Column Content Grid */}
      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 py-5 lg:py-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-10 items-center min-h-[min(100vh,860px)]">
        {/* LEFT SHOWCASE PANEL (Desktop & Large Tablets) */}
        <motion.section
          aria-label="Hanva Restaurant Billing Software Overview"
          animate={
            isLeaving && !prefersReducedMotion
              ? { opacity: 0, x: -36 }
              : { opacity: 1, x: 0 }
          }
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-start self-stretch pt-0 pb-[38vh] xl:pb-[40vh]"
        >
          {/* Top Brand Lockup */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative h-14 w-14 xl:h-[66px] xl:w-[66px] drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
              <Image
                src="/hanva-logo-white.png"
                alt="Hanva Technologies Logo"
                fill
                priority
                unoptimized
                className="object-contain"
              />
            </div>
            <p className="mt-1.5 text-[15px] xl:text-[16.5px] font-bold tracking-[0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
              HANVA TECHNOLOGIES Pvt Ltd.
            </p>
            <p className="text-xs xl:text-[13px] font-medium text-white/90 tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
              www.hanva.in
            </p>
          </motion.div>

          {/* Hero Title: Restaurant [Chef Hat] / Billing Software */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3.5 xl:mt-4 flex flex-col items-center text-center select-none"
          >
            <div className="inline-flex items-center justify-center gap-3">
              <h2 className="text-[38px] xl:text-[46px] font-extrabold italic tracking-tight text-white leading-[1.04] drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
                Restaurant
              </h2>
              <ChefHatOutline className="h-10 w-10 xl:h-[50px] xl:w-[50px] text-white -mt-2 rotate-[12deg] drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]" />
            </div>
            <div className="relative inline-flex flex-col items-center -mt-0.5">
              <span className="text-[38px] xl:text-[46px] font-extrabold italic tracking-tight text-[#4FA6FF] leading-[1.06] drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]">
                Billing Software
              </span>
              <BlueSwooshUnderline className="w-44 xl:w-52 self-end -mr-2 -mt-0.5 drop-shadow-[0_2px_10px_rgba(59,130,246,0.55)]" />
            </div>
          </motion.div>

          {/* 5 Frosted Glass Feature Tiles */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 xl:mt-5 grid grid-cols-5 gap-3 xl:gap-4 max-w-[560px] mx-auto w-full"
          >
            {FEATURES.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="group flex flex-col items-center text-center"
                >
                  <div className="flex h-[62px] w-[62px] xl:h-[68px] xl:w-[68px] items-center justify-center rounded-2xl bg-black/40 backdrop-blur-md border border-white/25 text-white shadow-[0_10px_28px_rgba(0,0,0,0.34)] transition-all duration-200 group-hover:-translate-y-1 group-hover:bg-white/20 group-hover:border-white/50 group-hover:shadow-[0_14px_30px_rgba(0,0,0,0.42)]">
                    <IconComponent className="h-8 w-8 xl:h-9 xl:w-9 transition-transform duration-200 group-hover:scale-105" />
                  </div>
                  <p className="mt-1.5 text-[11px] xl:text-[12px] font-medium text-white/95 leading-[1.2] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    <span className="block">{feature.line1}</span>
                    <span className="block">{feature.line2}</span>
                  </p>
                </div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* RIGHT FLOATING WHITE LOGIN CARD */}
        <section className="w-full flex items-center justify-center lg:justify-end">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
            animate={
              isLeaving && !prefersReducedMotion
                ? { opacity: 1, y: -4, scale: 1.025 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{ duration: isLeaving ? 0.32 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[450px] xl:max-w-[480px] rounded-[28px] bg-gradient-to-b from-white via-[#F9FCFF] to-[#ECF4FF] text-slate-900 shadow-[0_28px_80px_-14px_rgba(0,0,0,0.62)] border border-white/90 overflow-hidden"
          >
            {/* Subtle top-right ambient blue radial sheen inside card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#3B82F6]/[0.08] blur-3xl"
            />

            {/* Card Body */}
            <div className="relative z-10 px-6 sm:px-9 pt-7 sm:pt-9 pb-28 sm:pb-32">
              {/* Centered Brand Lockup */}
              <div className="flex flex-col items-center text-center">
                <Link
                  href="/"
                  className="transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565C0] rounded-full"
                >
                  <Image
                    src="/hanva-logo.png"
                    alt="Hanva Technologies Logo"
                    width={70}
                    height={70}
                    priority
                    unoptimized
                    className="h-16 w-16 sm:h-[70px] sm:w-[70px] object-contain"
                  />
                </Link>
                <p className="mt-2.5 text-[15px] sm:text-[16.5px] font-bold tracking-tight text-[#0A2240]">
                  HANVA TECHNOLOGIES Pvt Ltd.
                </p>
                <p className="text-xs sm:text-[13px] font-medium text-[#1E3A5F]">
                  www.hanva.in
                </p>
                <p className="mt-3.5 text-sm sm:text-[15px] font-medium text-[#1E293B]">
                  Restaurant Billing System
                </p>
              </div>

              {/* Welcome Heading */}
              <div className="mt-6">
                <h1 className="text-[25px] sm:text-[28px] font-bold tracking-tight text-[#0F172A] leading-tight">
                  Welcome Back
                </h1>
                <div className="mt-2 h-[3.5px] w-14 rounded-full bg-[#1565C0]" />
                <p className="mt-3 text-sm text-[#475569]">
                  Sign in to manage your restaurant
                </p>
              </div>

              {/* Offline Mode Banner (Only when network is disconnected) */}
              {!isOnline && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-semibold text-amber-800">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span>Offline Mode Active &middot; Cloud unreachable</span>
                  </div>
                  <p className="text-[11.5px] text-amber-800/90 leading-relaxed">
                    Your device is currently disconnected. If already signed in, jump directly into offline apps:
                  </p>
                  <div className="flex items-center gap-2 pt-0.5 font-semibold">
                    <Link
                      href="/pos"
                      className="rounded-lg bg-amber-600/15 px-2.5 py-1 text-amber-900 hover:bg-amber-600/25 transition-colors"
                    >
                      POS (Biller) &rarr;
                    </Link>
                    <Link
                      href="/captain"
                      className="rounded-lg bg-blue-600/15 px-2.5 py-1 text-blue-900 hover:bg-blue-600/25 transition-colors"
                    >
                      Captain App &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* Credentials Form */}
              <form
                onSubmit={handleSubmit(onSubmit, onInvalid)}
                className="mt-5 flex flex-col gap-3.5"
                noValidate
              >
                {/* Username / Email Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="sr-only">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      autoFocus
                      placeholder="Username"
                      aria-invalid={Boolean(errors.email)}
                      className={cn(
                        "h-12 w-full rounded-xl border bg-white/95 pl-11 pr-4 text-[14.5px] text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all focus:outline-none focus:ring-4",
                        errors.email
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                          : "border-slate-300/90 hover:border-slate-400/90 focus:border-[#1565C0] focus:ring-[#1565C0]/15",
                      )}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="pl-1 text-xs font-medium text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      placeholder="Password"
                      aria-invalid={Boolean(errors.password)}
                      className={cn(
                        "h-12 w-full rounded-xl border bg-white/95 pl-11 pr-11 text-[14.5px] text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all focus:outline-none focus:ring-4",
                        errors.password
                          ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                          : "border-slate-300/90 hover:border-slate-400/90 focus:border-[#1565C0] focus:ring-[#1565C0]/15",
                      )}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-800 focus-visible:text-[#1565C0] focus-visible:outline-none cursor-pointer"
                    >
                      {showPassword ? (
                        <Eye className="h-[18px] w-[18px]" />
                      ) : (
                        <EyeOff className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="pl-1 text-xs font-medium text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* TOTP 2FA Verification Code (Only displayed if required by account) */}
                {needsCode && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="totp" className="text-xs font-medium text-slate-700 pl-0.5">
                      Verification code
                    </label>
                    <div className="relative">
                      <KeyRound
                        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <input
                        id="totp"
                        inputMode="text"
                        autoComplete="one-time-code"
                        autoFocus
                        placeholder="6-digit code or recovery code"
                        className="h-12 w-full rounded-xl border border-slate-300/90 bg-white/95 pl-11 pr-4 text-[14.5px] text-slate-900 placeholder:text-slate-400 transition-all focus:border-[#1565C0] focus:outline-none focus:ring-4 focus:ring-[#1565C0]/15"
                        {...register("totp")}
                      />
                    </div>
                    <p className="pl-0.5 text-[11.5px] text-slate-500">
                      Open your authenticator app, or enter one of your recovery codes.
                    </p>
                    {errors.totp && (
                      <p className="pl-1 text-xs font-medium text-red-600">
                        {errors.totp.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Remember Me + Forgot Password */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                    <span className="relative flex h-[18px] w-[18px] items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#1565C0] peer-focus-visible:ring-offset-1",
                          rememberMe
                            ? "border-[#1565C0] bg-[#1565C0] text-white"
                            : "border-[#3B76B8]/70 bg-white group-hover:border-[#1565C0]",
                        )}
                      >
                        {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                    </span>
                    <span className="text-[13.5px] font-medium text-slate-800">
                      Remember me
                    </span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[13.5px] font-medium text-[#1565C0] transition-colors hover:text-[#0D47A1] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Inline Server Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Login Button */}
                <button
                  type="submit"
                  disabled={login.isPending || isLeaving}
                  className={cn(
                    "mt-1.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none cursor-pointer",
                    loginSucceeded
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-[0_10px_24px_-6px_rgba(16,185,129,0.6)] focus-visible:ring-emerald-500/30"
                      : "bg-gradient-to-r from-[#1976D2] via-[#1565C0] to-[#0E4DA4] shadow-[0_10px_24px_-6px_rgba(21,101,192,0.58)] hover:brightness-105 hover:shadow-[0_14px_28px_-6px_rgba(21,101,192,0.65)] focus-visible:ring-[#1565C0]/30 disabled:opacity-75",
                  )}
                >
                  {loginSucceeded ? (
                    <>
                      <Check className="h-[19px] w-[19px] stroke-[2.8]" />
                      <span>Welcome! Entering…</span>
                    </>
                  ) : login.isPending ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-[18px] w-[18px]" />
                      <span>Login</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Decorative Line-Art Dining Illustration & Sweeping Blue Waves */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[104px] sm:h-[112px] z-0 select-none">
              <LoginCardFooterWaves className="h-full w-full" />
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
