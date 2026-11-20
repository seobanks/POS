"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ShiftBusinessSummary {
  id: string;
  name: string;
  userId: string;
  userName: string;
  userRole?: string | null;
  startsAt: string;
  endsAt: string;
  formattedTime: string;
  status: "ACTIVE" | "COMPLETED" | "UPCOMING";
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  percentageOfTotal: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    upi: number;
    other: number;
  };
}

export interface ShiftsOverview {
  totalShiftRevenue: number;
  totalShiftOrders: number;
  shiftsCount: number;
  shifts: ShiftBusinessSummary[];
  unassignedRevenue: number;
  unassignedOrders: number;
}

export interface DashboardSummary {
  todayRevenue: number;
  todayOrders: number;
  channels: { online: number; offline: number };
  tables: {
    available: number;
    occupied: number;
    reserved: number;
    cleaning: number;
    outOfService: number;
  };
  kitchenQueue: { new: number; accepted: number; preparing: number; ready: number };
  covers?: {
    todayCovers: number;
    dineInRevenue: number;
    revenuePerCover: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    type: string;
    totalAmount: string;
    billedAt: string;
  }[];
  shiftSales: ShiftsOverview;
}

export function useDashboardSummary(branchId: string | null) {
  return useQuery({
    queryKey: ["dashboard", "summary", branchId],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?branchId=${branchId}`),
    enabled: !!branchId,
    refetchInterval: 45_000,
  });
}

export interface DashboardTrends {
  revenue: { date: string; amount: number }[];
  waste: { date: string; cost: number }[];
}

export function useDashboardTrends(branchId: string | null) {
  return useQuery({
    queryKey: ["dashboard", "trends", branchId],
    queryFn: () => api.get<DashboardTrends>(`/dashboard/trends?branchId=${branchId}`),
    enabled: !!branchId,
    refetchInterval: 60_000,
  });
}

export interface ForecastDay {
  date: string;
  dayName: string;
  event: string;
  isWeekend: boolean;
  weather: {
    condition: string;
    tempHigh: number;
    tempLow: number;
    rainProb: number;
    icon: string;
    impact: string;
  };
  predictedRevenue: {
    expected: number;
    low: number;
    high: number;
  };
  predictedCovers: number;
  predictedOrders: number;
  channelSplit: {
    dineInPct: number;
    deliveryPct: number;
    takeawayPct: number;
  };
  kitchenPrepAdvice: string;
  recommendedStaffing: {
    serviceStaff: number;
    kitchenStaff: number;
    deliveryDrivers: number;
  };
}

export interface DemandForecastData {
  branchName: string;
  currency: string;
  baselineDailyRevenue: number;
  baselineDailyCovers: number;
  historicalDaysAnalyzed: number;
  forecastDays: ForecastDay[];
}

export function useDemandForecast(branchId: string | null) {
  return useQuery({
    queryKey: ["dashboard", "demand-forecast", branchId],
    queryFn: () => api.get<DemandForecastData>(`/dashboard/demand-forecast?branchId=${branchId}`),
    enabled: !!branchId,
    refetchInterval: 120_000,
  });
}
