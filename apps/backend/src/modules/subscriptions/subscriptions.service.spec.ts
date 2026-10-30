import * as fs from 'node:fs';
import * as path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { LicensePayload } from '@nodedr-restaurant/types';
import { LicenseService } from './license.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let licenseService: LicenseService;
  const testStorageDir = path.join(process.cwd(), 'tmp_test_data');

  beforeAll(() => {
    process.env.DATA_DIR = testStorageDir;
  });

  afterAll(() => {
    delete process.env.DATA_DIR;
    try {
      if (fs.existsSync(testStorageDir)) {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  beforeEach(async () => {
    // Clear storage file between tests
    const filePath = path.join(testStorageDir, 'license.json');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        LicenseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-subscription-service-secret-key-1234';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    licenseService = module.get<LicenseService>(LicenseService);
  });

  describe('getPlans', () => {
    it('should return Starter, Pro, and Enterprise subscription plans', () => {
      const plans = service.getPlans();
      expect(plans).toHaveLength(3);

      const starter = plans.find((p) => p.plan === 'STARTER');
      const pro = plans.find((p) => p.plan === 'PRO');
      const enterprise = plans.find((p) => p.plan === 'ENTERPRISE');

      expect(starter).toBeDefined();
      expect(starter?.price).toBe(799);
      expect(starter?.priceDisplay).toBe('₹799/mo');

      expect(pro).toBeDefined();
      expect(pro?.price).toBe(1499);
      expect(pro?.priceDisplay).toBe('₹1499/mo');

      expect(enterprise).toBeDefined();
      expect(enterprise?.price).toBe(2499);
      expect(enterprise?.priceDisplay).toBe('₹2499/mo');
    });
  });

  describe('license activation and status lifecycle', () => {
    it('should return unlicensed status when no license is configured', async () => {
      const status = await service.getLicenseStatus();
      expect(status.activated).toBe(false);
      expect(status.status).toBe('UNLICENSED');
      expect(status.restaurantId).toBeNull();
      expect(status.plan).toBeNull();
      expect(status.daysRemaining).toBe(0);
    });

    it('should activate a valid license and persist it', async () => {
      const payload: LicensePayload = {
        restaurantId: 'rest_punjab_grill_42',
        restaurantName: 'Punjab Grill House',
        plan: 'ENTERPRISE',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        maxTills: 10,
        features: ['kds', 'inventory', 'multi_till', 'aggregators', 'multi_branch'],
        issuedAt: new Date().toISOString(),
      };

      const licenseKey = licenseService.generateLicense(payload);
      const result = await service.activateLicense({
        licenseKey,
        hardwareId: 'POS-TERMINAL-01-HWID-XYZ',
      });

      expect(result.activated).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.restaurantId).toBe(payload.restaurantId);
      expect(result.restaurantName).toBe(payload.restaurantName);
      expect(result.plan).toBe('ENTERPRISE');
      expect(result.maxTills).toBe(10);
      expect(result.features).toEqual(payload.features);
      expect(result.hardwareId).toBe('POS-TERMINAL-01-HWID-XYZ');
      expect(result.offlineGrace.isValid).toBe(true);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(59);

      // Verify idempotency and persistent reload
      const retrieved = await service.getLicenseStatus();
      expect(retrieved.activated).toBe(true);
      expect(retrieved.restaurantId).toBe(payload.restaurantId);
    });

    it('should throw BadRequestException when activating an invalid key', async () => {
      await expect(
        service.activateLicense({ licenseKey: 'REST-INVALID.SIGNATURE' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
