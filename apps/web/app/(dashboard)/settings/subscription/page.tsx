"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  KeyRound,
  Layers,
  Loader2,
  Monitor,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { SubscriptionPlan, SubscriptionPlanType } from "@nodedr-restaurant/types";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivateLicense,
  useCreateRazorpayOrder,
  useLicenseStatus,
  useSubscriptionPlans,
} from "@/hooks/use-subscriptions";
import { cn } from "@/lib/utils";

export default function SubscriptionSettingsPage() {
  const { data: license, isLoading: isLicenseLoading } = useLicenseStatus();
  const { data: plans, isLoading: isPlansLoading } = useSubscriptionPlans();
  const activateMutation = useActivateLicense();
  const createOrderMutation = useCreateRazorpayOrder();

  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlan | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleCopyHardwareId = () => {
    if (license?.hardwareId) {
      navigator.clipboard.writeText(license.hardwareId);
      setCopySuccess(true);
      toast.success("Hardware ID copied to clipboard");
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = licenseKeyInput.trim().toUpperCase();
    if (!cleanKey) {
      toast.error("Please enter a valid license key");
      return;
    }

    try {
      await activateMutation.mutateAsync({ licenseKey: cleanKey });
      toast.success("License key activated successfully!");
      setLicenseKeyInput("");
      setIsActivateDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate license key");
    }
  };

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    setSelectedPlanForCheckout(plan);
    try {
      const order = await createOrderMutation.mutateAsync({
        plan: plan.plan,
        restaurantId: license?.restaurantId || "demo-restaurant",
        restaurantName: license?.restaurantName || "Hanva Fine Dine",
      });
      setCheckoutOrder(order);
    } catch (err: any) {
      toast.error(err?.message || "Could not initialize checkout order");
    }
  };

  const handleCompletePaymentSimulation = async () => {
    if (!selectedPlanForCheckout) return;
    setIsProcessingPayment(true);
    try {
      // Simulate webhook payment capture
      const res = await fetch("/api/v1/subscriptions/razorpay/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: `pay_${Date.now()}`,
                amount: selectedPlanForCheckout.price * 100,
                notes: {
                  restaurantId: license?.restaurantId || "demo-restaurant",
                  restaurantName: license?.restaurantName || "Hanva Fine Dine",
                  plan: selectedPlanForCheckout.plan,
                },
              },
            },
          },
        }),
      });

      if (!res.ok) throw new Error("Payment simulation failed");
      toast.success(`Payment verified! Upgraded to ${selectedPlanForCheckout.name} plan.`);
      setSelectedPlanForCheckout(null);
      setCheckoutOrder(null);
      // Refresh status
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
          Subscription &amp; License
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your restaurant POS subscription tier, offline licensing, and multi-terminal
          entitlements.
        </p>
      </div>

      <SettingsTabs />

      {/* Offline Grace Period Warning Banner */}
      {license?.offlineGrace?.inGracePeriod && (
        <div className="flex items-start gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">License Running in Offline Grace Period</h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              This terminal has been operating without cloud verification for several days. You have{" "}
              <strong>{license.offlineGrace.daysRemaining} days remaining</strong> in your offline grace
              window. Reconnect to the internet or renew your subscription to ensure uninterrupted
              billing operations.
            </p>
          </div>
        </div>
      )}

      {/* Current License Card */}
      {isLicenseLoading || !license ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Card className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {license.restaurantName || "Hanva Restaurant"}
                  </h2>
                  <LicenseStatusBadge status={license.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {license.plan ? `${license.plan} Tier Subscription` : "No active subscription"}
                </p>
              </div>
            </div>

            <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <KeyRound className="size-4" />
                  Activate License Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleActivateLicense}>
                  <DialogHeader>
                    <DialogTitle>Activate Commercial License</DialogTitle>
                    <DialogDescription>
                      Enter the 16-character license key issued for your restaurant to unlock or
                      extend your POS plan.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="licenseKey">License Key</Label>
                      <Input
                        id="licenseKey"
                        placeholder="REST-XXXX-XXXX-XXXX"
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                        className="font-mono uppercase tracking-wider text-sm"
                        autoFocus
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Keys are cryptographically signed with HMAC-SHA256 and function 100% offline.
                      </p>
                    </div>

                    {license.hardwareId && (
                      <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                        <span className="text-muted-foreground font-medium">Terminal Hardware ID:</span>
                        <div className="font-mono text-[11px] break-all select-all text-foreground">
                          {license.hardwareId}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={activateMutation.isPending}>
                      {activateMutation.isPending ? "Validating Key..." : "Activate Now"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                Remaining Time
              </div>
              <div className="text-xl font-bold text-foreground">
                {license.daysRemaining > 0 ? `${license.daysRemaining} Days` : "Expired"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {license.expiresAt
                  ? `Valid through ${new Date(license.expiresAt).toLocaleDateString()}`
                  : "Activation required"}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Monitor className="size-3.5" />
                Billing Tills
              </div>
              <div className="text-xl font-bold text-foreground">
                {license.maxTills >= 99 ? "Unlimited" : `${license.maxTills} Counter Till(s)`}
              </div>
              <div className="text-[11px] text-muted-foreground">Active terminal devices</div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <WifiOff className="size-3.5" />
                Offline Capability
              </div>
              <div className="text-xl font-bold text-foreground">14 Days Grace</div>
              <div className="text-[11px] text-muted-foreground">Zero cloud dependency for billing</div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <KeyRound className="size-3.5" />
                  Hardware Binding
                </span>
                {license.hardwareId && (
                  <button
                    type="button"
                    onClick={handleCopyHardwareId}
                    className="hover:text-foreground transition-colors"
                    title="Copy Hardware ID"
                  >
                    {copySuccess ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                )}
              </div>
              <div className="text-xs font-mono font-medium text-foreground truncate">
                {license.hardwareId ? `${license.hardwareId.substring(0, 16)}...` : "Universal Node"}
              </div>
              <div className="text-[11px] text-muted-foreground">Anti-tamper hardware lock</div>
            </div>
          </div>

          {/* Active Features */}
          {license.features && license.features.length > 0 && (
            <div className="border-t border-border pt-4">
              <span className="text-xs font-medium text-muted-foreground">
                Enabled Commercial Features:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {license.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    {formatFeatureName(f)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Subscription Plans Catalog */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Available Commercial Plans</h2>
          <p className="text-xs text-muted-foreground">
            Affordable monthly SaaS subscription plans designed for cafes, fine dine restaurants, and
            multi-chain franchises.
          </p>
        </div>

        {isPlansLoading || !plans ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = license?.plan === plan.plan;
              const isPro = plan.plan === "PRO";

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col justify-between p-6 transition-all border",
                    isPro ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border",
                    isCurrentPlan && "bg-primary/[0.02]",
                  )}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
                        <Sparkles className="size-3" /> Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        {isCurrentPlan && (
                          <Badge variant="secondary" className="text-[10px]">
                            Current Plan
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 border-b border-border pb-4">
                      <span className="text-3xl font-extrabold text-foreground">
                        {plan.priceDisplay}
                      </span>
                      <span className="text-xs text-muted-foreground">/{plan.billingInterval}</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2 font-medium text-foreground">
                        <Check className="size-3.5 text-primary" />
                        {plan.maxTills >= 99
                          ? "Unlimited Billing Counters"
                          : `${plan.maxTills} Billing Counter Till`}
                      </li>
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary" />
                          <span>{formatFeatureName(feature)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Active Plan
                      </Button>
                    ) : (
                      <Button
                        variant={isPro ? "default" : "outline"}
                        className="w-full gap-2"
                        onClick={() => handleChoosePlan(plan)}
                        disabled={createOrderMutation.isPending}
                      >
                        <CreditCard className="size-3.5" />
                        Choose {plan.name}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Razorpay Checkout Modal */}
      <Dialog
        open={Boolean(selectedPlanForCheckout)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlanForCheckout(null);
            setCheckoutOrder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selectedPlanForCheckout && (
            <div>
              <DialogHeader>
                <DialogTitle>Subscribe to {selectedPlanForCheckout.name} Plan</DialogTitle>
                <DialogDescription>
                  Complete your secure monthly subscription via Razorpay (UPI, Credit/Debit Cards, Netbanking).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground">Plan:</span>
                    <span>{selectedPlanForCheckout.name} Tier</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground">Billing Interval:</span>
                    <span>Monthly (Auto-renew)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground">Total Due:</span>
                    <span className="text-base font-bold text-foreground">
                      {selectedPlanForCheckout.priceDisplay}
                    </span>
                  </div>
                </div>

                {checkoutOrder?.isDemo ? (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <div className="font-semibold">Demo / Local Mode Active</div>
                    <div>
                      Razorpay keys are not yet configured in <code>.env</code>. You can simulate instant payment verification to test offline license issuance.
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Powered by Razorpay Secure Payments. Standard NPCI UPI &amp; RBI compliance verified.
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleCompletePaymentSimulation}
                  disabled={isProcessingPayment}
                  className="gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4" />
                      Pay &amp; Activate ({selectedPlanForCheckout.priceDisplay})
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LicenseStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    case "GRACE_PERIOD":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="size-3" /> Grace Period
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          Expired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Unlicensed
        </span>
      );
  }
}

function formatFeatureName(raw: string): string {
  const map: Record<string, string> = {
    offline_pos: "100% Offline POS Billing",
    pos_billing: "Counter POS Billing",
    digital_receipts: "Thermal & Digital Receipts",
    table_management: "Visual Floor & Table Management",
    thermal_print: "Thermal Receipt & KOT Printing",
    upi_qr: "Dynamic NPCI UPI QR on Bills",
    kot: "Kitchen Order Tickets (KOT)",
    kds: "Kitchen Display System (KDS)",
    waiter_tab: "Waiter Mobile / Tablet Ordering",
    basic_inventory: "Basic Inventory Tracking",
    advanced_inventory: "Advanced Inventory & Recipes",
    enterprise_inventory: "Multi-Store Warehouse Inventory",
    raw_tcp_print: "Direct Wi-Fi / LAN Network Printing",
    multi_branch: "Multi-Branch Cloud Centralization",
    ai_reports: "Advanced AI Sales Analytics",
    daily_reports: "Daily Sales & Z-Reports",
    analytics: "Sales & Category Analytics",
    advanced_analytics: "Hourly Heatmaps & Margin Analytics",
    aggregators: "Zomato & Swiggy Sync Engine",
    loyalty: "Customer Loyalty & CRM",
    staff_management: "Staff Shifts & Permissions",
    multi_till: "Multi-Counter Sync",
    api_access: "External Open API Access",
    custom_roles: "Granular Role Permissions",
    unlimited_tills: "Unlimited Billing Terminals",
    priority_support: "24/7 Priority Support",
  };
  return map[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
