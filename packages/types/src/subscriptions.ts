import { z } from 'zod';

export type SubscriptionPlanType = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface LicensePayload {
  restaurantId: string;
  restaurantName: string;
  plan: SubscriptionPlanType;
  expiresAt: string; // ISO string
  maxTills: number;
  features: string[]; // e.g. ['kds', 'inventory', 'multi_till', 'aggregators']
  issuedAt: string; // ISO string
}

export interface LicenseValidationResult {
  isValid: boolean;
  error?: string;
  payload?: LicensePayload;
  isExpired?: boolean;
  daysRemaining?: number;
}

export interface OfflineGraceStatus {
  isValid: boolean;
  inGracePeriod: boolean;
  daysRemaining: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan: SubscriptionPlanType;
  price: number;
  currency: string;
  billingInterval: 'month' | 'year';
  priceDisplay: string;
  description: string;
  maxTills: number;
  maxBranches: number;
  features: string[];
}

export interface ActivateLicenseDto {
  licenseKey: string;
  hardwareId?: string;
}

export interface StoredLicenseData {
  licenseKey: string;
  hardwareId?: string;
  restaurantId: string;
  restaurantName: string;
  plan: SubscriptionPlanType;
  expiresAt: string;
  maxTills: number;
  features: string[];
  issuedAt: string;
  activatedAt: string;
  lastSyncAt: string;
}

export interface LicenseStatusResponse {
  activated: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'GRACE_PERIOD' | 'UNLICENSED';
  licenseKey?: string;
  restaurantId: string | null;
  restaurantName: string | null;
  plan: SubscriptionPlanType | null;
  daysRemaining: number;
  features: string[];
  maxTills: number;
  expiresAt: string | null;
  issuedAt: string | null;
  lastSyncAt: string | null;
  offlineGrace: OfflineGraceStatus;
  hardwareId: string | null;
}

export const activateLicenseSchema = z.object({
  licenseKey: z.string().min(10, 'License key must be at least 10 characters'),
  hardwareId: z.string().optional(),
});
