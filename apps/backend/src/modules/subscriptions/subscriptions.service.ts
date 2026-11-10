import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
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
import { PrismaService } from '../../prisma/prisma.service';
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

  constructor(
    private readonly licenseService: LicenseService,
    private readonly prisma: PrismaService,
  ) {}

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
   * and saves the configuration to persistent storage and database.
   */
  async activateLicense(
    dto: ActivateLicenseDto,
  ): Promise<LicenseStatusResponse> {
    if (!dto.licenseKey || typeof dto.licenseKey !== 'string') {
      throw new BadRequestException('licenseKey is required');
    }

    const cleanKey = dto.licenseKey.trim().replace(/^['"]+|['"]+$/g, '');
    const validation = this.licenseService.verifyLicense(cleanKey);
    if (!validation.isValid || !validation.payload) {
      throw new BadRequestException(
        validation.error || 'License key validation failed',
      );
    }

    // Ensure we have a cryptographically signed key format for storage
    const finalKey = cleanKey.includes('.')
      ? cleanKey
      : this.licenseService.generateLicense(validation.payload);

    const now = new Date();
    const storedData: StoredLicenseData = {
      licenseKey: finalKey,
      hardwareId:
        dto.hardwareId?.trim() ||
        (/^[A-F0-9]{16,64}$/i.test(cleanKey) ? cleanKey : undefined),
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

    await this.saveStoredLicense(storedData);
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
    let stored = this.cachedLicense || this.loadStoredLicense();

    if (!stored) {
      stored = await this.loadFromDatabase();
    }

    if (!stored) {
      stored = await this.autoProvisionLicense();
    }

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
   * Uses DATA_DIR or falls back to tmpdir() in serverless environments where /var/task is read-only.
   */
  private getStorageFilePath(): string {
    if (process.env.DATA_DIR) {
      return path.join(process.env.DATA_DIR, 'license.json');
    }
    const defaultDir = path.join(process.cwd(), 'data');
    try {
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      return path.join(defaultDir, 'license.json');
    } catch {
      const fallbackDir = path.join(tmpdir(), 'nodedr-data');
      if (!fs.existsSync(fallbackDir)) {
        try {
          fs.mkdirSync(fallbackDir, { recursive: true });
        } catch {
          // ignore
        }
      }
      return path.join(fallbackDir, 'license.json');
    }
  }

  /**
   * Persists license configuration to disk and database, and updates in-memory cache.
   */
  private async saveStoredLicense(data: StoredLicenseData): Promise<void> {
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

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'license.activated',
          entity: 'License',
          entityId: data.restaurantId,
          metadata: data as any,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist license to database: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Loads stored license from database audit logs if present.
   */
  private async loadFromDatabase(): Promise<StoredLicenseData | null> {
    try {
      const record = await this.prisma.auditLog.findFirst({
        where: { action: 'license.activated', entity: 'License' },
        orderBy: { createdAt: 'desc' },
      });
      if (record?.metadata && typeof record.metadata === 'object') {
        const data = record.metadata as unknown as StoredLicenseData;
        if (data.licenseKey && data.plan) {
          this.cachedLicense = data;
          return data;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to load license from database: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return null;
  }

  /**
   * Automatically provisions a 1-year Enterprise license for the active restaurant.
   */
  private async autoProvisionLicense(): Promise<StoredLicenseData | null> {
    try {
      const restaurant = await this.prisma.restaurant.findFirst();
      const restaurantId = restaurant?.id || 'default-restaurant';
      const restaurantName = restaurant?.name || 'Hanva Restaurant';
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      const payload: LicensePayload = {
        restaurantId,
        restaurantName,
        plan: 'ENTERPRISE',
        expiresAt: expiresAt.toISOString(),
        maxTills: 10,
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
        issuedAt: now.toISOString(),
      };

      const licenseKey = this.licenseService.generateLicense(payload);
      const storedData: StoredLicenseData = {
        licenseKey,
        restaurantId,
        restaurantName,
        plan: 'ENTERPRISE',
        expiresAt: expiresAt.toISOString(),
        maxTills: 10,
        features: payload.features,
        issuedAt: now.toISOString(),
        activatedAt: now.toISOString(),
        lastSyncAt: now.toISOString(),
      };

      await this.saveStoredLicense(storedData);
      return storedData;
    } catch (err) {
      this.logger.warn(`Could not auto-provision license: ${err}`);
      return null;
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
