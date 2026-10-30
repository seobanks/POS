import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type {
  ActivateLicenseDto,
  LicensePayload,
  LicenseStatusResponse,
  StoredLicenseData,
  SubscriptionPlan,
} from '@nodedr-restaurant/types';
import { LicenseService } from './license.service';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    plan: 'STARTER',
    price: 799,
    currency: 'INR',
    billingInterval: 'month',
    priceDisplay: '₹799/mo',
    description:
      'Ideal for small cafes, quick-service food stalls, and single-till food trucks.',
    maxTills: 1,
    maxBranches: 1,
    features: [
      'pos_billing',
      'digital_receipts',
      'table_management',
      'basic_inventory',
      'daily_reports',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    plan: 'PRO',
    price: 1499,
    currency: 'INR',
    billingInterval: 'month',
    priceDisplay: '₹1499/mo',
    description:
      'Perfect for busy dine-in restaurants, multi-station kitchens, and bars.',
    maxTills: 3,
    maxBranches: 1,
    features: [
      'pos_billing',
      'digital_receipts',
      'table_management',
      'advanced_inventory',
      'kds',
      'multi_till',
      'aggregators',
      'loyalty',
      'staff_management',
      'analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    plan: 'ENTERPRISE',
    price: 2499,
    currency: 'INR',
    billingInterval: 'month',
    priceDisplay: '₹2499/mo',
    description:
      'Built for multi-location restaurant chains, franchises, and large food courts.',
    maxTills: 10,
    maxBranches: 5,
    features: [
      'pos_billing',
      'digital_receipts',
      'table_management',
      'enterprise_inventory',
      'kds',
      'multi_till',
      'aggregators',
      'loyalty',
      'staff_management',
      'advanced_analytics',
      'multi_branch',
      'api_access',
      'custom_roles',
      'priority_support',
    ],
  },
];

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);
  private cachedLicense: StoredLicenseData | null = null;

  constructor(private readonly licenseService: LicenseService) {}

  onModuleInit() {
    this.loadStoredLicense();
  }

  /**
   * Returns public subscription plan offerings.
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Generates a signed license key for a restaurant.
   */
  generateLicense(payload: LicensePayload): string {
    return this.licenseService.generateLicense(payload);
  }

  /**
   * Activates a license key on this POS instance.
   * Validates the cryptographic signature, binds optional hardwareId,
   * and saves the configuration to persistent storage.
   */
  async activateLicense(
    dto: ActivateLicenseDto,
  ): Promise<LicenseStatusResponse> {
    if (!dto.licenseKey || typeof dto.licenseKey !== 'string') {
      throw new BadRequestException('licenseKey is required');
    }

    const validation = this.licenseService.verifyLicense(dto.licenseKey);
    if (!validation.isValid || !validation.payload) {
      throw new BadRequestException(
        validation.error || 'License key validation failed',
      );
    }

    const now = new Date();
    const storedData: StoredLicenseData = {
      licenseKey: dto.licenseKey.trim(),
      hardwareId: dto.hardwareId?.trim() || undefined,
      restaurantId: validation.payload.restaurantId,
      restaurantName: validation.payload.restaurantName,
      plan: validation.payload.plan,
      expiresAt: validation.payload.expiresAt,
      maxTills: validation.payload.maxTills,
      features: validation.payload.features,
      issuedAt: validation.payload.issuedAt,
      activatedAt: now.toISOString(),
      lastSyncAt: now.toISOString(),
    };

    this.saveStoredLicense(storedData);
    this.logger.log(
      `License successfully activated for restaurant "${storedData.restaurantName}" (${storedData.restaurantId}) on plan ${storedData.plan}`,
    );

    return this.getLicenseStatus();
  }

  /**
   * Retrieves the current license activation status, plan details,
   * remaining days, enabled features, and offline grace status.
   */
  async getLicenseStatus(): Promise<LicenseStatusResponse> {
    const stored = this.cachedLicense || this.loadStoredLicense();

    if (!stored) {
      return {
        activated: false,
        status: 'UNLICENSED',
        restaurantId: null,
        restaurantName: null,
        plan: null,
        daysRemaining: 0,
        features: [],
        maxTills: 1,
        expiresAt: null,
        issuedAt: null,
        lastSyncAt: null,
        offlineGrace: {
          isValid: false,
          inGracePeriod: false,
          daysRemaining: 0,
        },
        hardwareId: null,
      };
    }

    const lastSyncDate = new Date(stored.lastSyncAt);
    const expiresDate = new Date(stored.expiresAt);
    const graceStatus = this.licenseService.getOfflineGraceStatus(
      lastSyncDate,
      expiresDate,
    );

    let status: 'ACTIVE' | 'EXPIRED' | 'GRACE_PERIOD' | 'UNLICENSED' = 'ACTIVE';
    if (!graceStatus.isValid) {
      status = 'EXPIRED';
    } else if (graceStatus.inGracePeriod) {
      status = 'GRACE_PERIOD';
    }

    return {
      activated: true,
      status,
      licenseKey: this.maskLicenseKey(stored.licenseKey),
      restaurantId: stored.restaurantId,
      restaurantName: stored.restaurantName,
      plan: stored.plan,
      daysRemaining: graceStatus.daysRemaining,
      features: stored.features,
      maxTills: stored.maxTills,
      expiresAt: stored.expiresAt,
      issuedAt: stored.issuedAt,
      lastSyncAt: stored.lastSyncAt,
      offlineGrace: graceStatus,
      hardwareId: stored.hardwareId || null,
    };
  }

  /**
   * Masks a license key for safe display in UI/API responses.
   * e.g. "REST-eyJ...39fa" -> "REST-eyJh...39fa"
   */
  private maskLicenseKey(key: string): string {
    if (!key || key.length < 16) return 'REST-****';
    const prefix = key.substring(0, 9);
    const suffix = key.substring(key.length - 6);
    return `${prefix}....${suffix}`;
  }

  /**
   * Resolves the storage file path for persistent license configuration.
   */
  private getStorageFilePath(): string {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    return path.join(dataDir, 'license.json');
  }

  /**
   * Persists license configuration to disk and updates in-memory cache.
   */
  private saveStoredLicense(data: StoredLicenseData): void {
    this.cachedLicense = data;
    try {
      const filePath = this.getStorageFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      this.logger.warn(
        `Failed to persist license to disk: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Loads stored license from disk if present.
   */
  private loadStoredLicense(): StoredLicenseData | null {
    try {
      const filePath = this.getStorageFilePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw) as StoredLicenseData;
        this.cachedLicense = parsed;
        return parsed;
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read license file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return null;
  }
}
