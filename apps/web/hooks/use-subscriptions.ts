"use client";

import type {
  ActivateLicenseDto,
  LicenseStatusResponse,
  SubscriptionPlan,
  SubscriptionPlanType,
} from "@nodedr-restaurant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CreateOrderParams {
  plan: SubscriptionPlanType;
  restaurantId?: string;
  restaurantName?: string;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: SubscriptionPlanType;
  restaurantId: string;
  isDemo?: boolean;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => api.get<SubscriptionPlan[]>("/subscriptions/plans"),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useLicenseStatus() {
  return useQuery({
    queryKey: ["license-status"],
    queryFn: () => api.get<LicenseStatusResponse>("/subscriptions/license/status"),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useActivateLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ActivateLicenseDto) =>
      api.post<LicenseStatusResponse>("/subscriptions/license/activate", dto),
    onSuccess: (data) => {
      queryClient.setQueryData(["license-status"], data);
      queryClient.invalidateQueries({ queryKey: ["license-status"] });
    },
  });
}

export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: (params: CreateOrderParams) =>
      api.post<RazorpayOrderResponse>("/subscriptions/razorpay/create-order", params),
  });
}
