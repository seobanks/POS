import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { LicensePayload } from '@nodedr-restaurant/types';
import { LicenseService, OFFLINE_GRACE_DAYS } from './license.service';

describe('LicenseService', () => {
  let service: LicenseService;
  const TEST_JWT_SECRET = 'super-secret-jwt-token-for-test-32-chars-long';

  const validPayload: LicensePayload = {
    restaurantId: 'rest_delhi_spice_001',
    restaurantName: 'Delhi Spice Bistro',
    plan: 'PRO',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxTills: 3,
    features: ['kds', 'inventory', 'multi_till', 'aggregators'],
    issuedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LicenseService>(LicenseService);
  });

  describe('generateLicense', () => {
    it('should generate a valid license key with REST- prefix', () => {
      const key = service.generateLicense(validPayload);
      expect(key).toBeDefined();
      expect(key.startsWith('REST-')).toBe(true);
      expect(key.includes('.')).toBe(true);
    });

    it('should throw BadRequestException if payload is missing mandatory fields', () => {
      const invalid = { ...validPayload, restaurantId: '' };
      expect(() => service.generateLicense(invalid)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyLicense', () => {
    it('should successfully verify a valid generated license key', () => {
      const key = service.generateLicense(validPayload);
      const result = service.verifyLicense(key);

      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.payload).toBeDefined();
      expect(result.payload?.restaurantId).toBe(validPayload.restaurantId);
      expect(result.payload?.restaurantName).toBe(validPayload.restaurantName);
      expect(result.payload?.plan).toBe('PRO');
      expect(result.payload?.maxTills).toBe(3);
      expect(result.payload?.features).toEqual([
        'kds',
        'inventory',
        'multi_till',
        'aggregators',
      ]);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(29);
    });

    it('should verify license key whether REST- prefix is present or not', () => {
      const keyWithPrefix = service.generateLicense(validPayload);
      const rawKey = keyWithPrefix.replace('REST-', '');

      const resWithPrefix = service.verifyLicense(keyWithPrefix);
      const resWithoutPrefix = service.verifyLicense(rawKey);

      expect(resWithPrefix.isValid).toBe(true);
      expect(resWithoutPrefix.isValid).toBe(true);
      expect(resWithoutPrefix.payload?.restaurantId).toBe(
        validPayload.restaurantId,
      );
    });

    it('should reject empty or non-string license keys', () => {
      expect(service.verifyLicense('').isValid).toBe(false);
      expect(service.verifyLicense('   ').isValid).toBe(false);
      expect(service.verifyLicense(null as unknown as string).isValid).toBe(
        false,
      );
    });

    it('should reject malformed license key lacking delimiter', () => {
      const result = service.verifyLicense('REST-INVALIDKEYWITHOUTDOT');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('missing signature delimiter');
    });
  });

  describe('tampering detection', () => {
    it('should detect and reject tampered payload data', () => {
      const validKey = service.generateLicense(validPayload);
      const [prefixAndPayload, signature] = validKey.split('.');

      // Tamper with payload by mutating a character
      const tamperedPayload =
        prefixAndPayload.slice(0, -2) +
        (prefixAndPayload.endsWith('A') ? 'B' : 'A') +
        prefixAndPayload.slice(-1);
      const tamperedKey = `${tamperedPayload}.${signature}`;

      const result = service.verifyLicense(tamperedKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license signature or tampered key');
    });

    it('should detect and reject tampered signature', () => {
      const validKey = service.generateLicense(validPayload);
      const [payloadPart, sig] = validKey.split('.');

      // Alter the signature
      const tamperedSig =
        sig.slice(0, -2) + (sig.endsWith('0') ? '1' : '0') + sig.slice(-1);
      const tamperedKey = `${payloadPart}.${tamperedSig}`;

      const result = service.verifyLicense(tamperedKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license signature or tampered key');
    });

    it('should reject key signed with a different secret', async () => {
      const moduleWithDiffSecret = await Test.createTestingModule({
        providers: [
          LicenseService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => 'completely-different-signing-key-secret'),
            },
          },
        ],
      }).compile();

      const attackerService =
        moduleWithDiffSecret.get<LicenseService>(LicenseService);
      const forgedKey = attackerService.generateLicense(validPayload);

      // Verifying forged key with our official service must fail
      const result = service.verifyLicense(forgedKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid license signature or tampered key');
    });

    it('should reject corrupted non-JSON payload', () => {
      const secret = TEST_JWT_SECRET;
      const invalidB64 = Buffer.from('NOT_A_JSON_STRING').toString('base64url');
      const crypto = require('node:crypto');
      const sig = crypto
        .createHmac('sha256', secret)
        .update(invalidB64)
        .digest('hex');
      const key = `REST-${invalidB64}.${sig}`;

      const result = service.verifyLicense(key);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('malformed payload encoding');
    });

    it('should reject payload with invalid schema values', () => {
      const secret = TEST_JWT_SECRET;
      const invalidPayload = { ...validPayload, plan: 'INVALID_PLAN' };
      const invalidB64 = Buffer.from(JSON.stringify(invalidPayload)).toString(
        'base64url',
      );
      const crypto = require('node:crypto');
      const sig = crypto
        .createHmac('sha256', secret)
        .update(invalidB64)
        .digest('hex');
      const key = `REST-${invalidB64}.${sig}`;

      const result = service.verifyLicense(key);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('payload schema validation failed');
    });
  });

  describe('expiration handling', () => {
    it('should detect expired license and return isExpired: true', () => {
      const expiredPayload: LicensePayload = {
        ...validPayload,
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const key = service.generateLicense(expiredPayload);
      const result = service.verifyLicense(key);

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
      expect(result.daysRemaining).toBe(0);
      expect(result.error).toContain('License key has expired');
      expect(result.payload?.restaurantId).toBe(validPayload.restaurantId);
    });
  });

  describe('getOfflineGraceStatus', () => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    it('should return valid and not in grace period for active license synced today', () => {
      const now = new Date();
      const lastSync = new Date(now.getTime() - 1 * MS_PER_DAY);
      const expires = new Date(now.getTime() + 25 * MS_PER_DAY);

      const status = service.getOfflineGraceStatus(lastSync, expires, now);
      expect(status.isValid).toBe(true);
      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(25);
    });

    it('should enter grace period when subscription expired within 14 days', () => {
      const now = new Date();
      const lastSync = new Date(now.getTime() - 2 * MS_PER_DAY);
      const expires = new Date(now.getTime() - 4 * MS_PER_DAY); // expired 4 days ago

      const status = service.getOfflineGraceStatus(lastSync, expires, now);
      expect(status.isValid).toBe(true);
      expect(status.inGracePeriod).toBe(true);
      // 14 days grace - 4 days expired = 10 days remaining
      expect(status.daysRemaining).toBe(10);
    });

    it('should invalidate when subscription is expired past the 14-day grace period', () => {
      const now = new Date();
      const lastSync = new Date(now.getTime() - 1 * MS_PER_DAY);
      const expires = new Date(now.getTime() - 15 * MS_PER_DAY); // expired 15 days ago

      const status = service.getOfflineGraceStatus(lastSync, expires, now);
      expect(status.isValid).toBe(false);
      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });

    it('should invalidate when offline for more than 14 days without cloud sync', () => {
      const now = new Date();
      const lastSync = new Date(now.getTime() - 16 * MS_PER_DAY); // 16 days offline
      const expires = new Date(now.getTime() + 60 * MS_PER_DAY); // active subscription

      const status = service.getOfflineGraceStatus(lastSync, expires, now);
      expect(status.isValid).toBe(false);
      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });

    it('should remain valid if offline for less than 14 days with active subscription', () => {
      const now = new Date();
      const lastSync = new Date(now.getTime() - 10 * MS_PER_DAY); // 10 days offline
      const expires = new Date(now.getTime() + 20 * MS_PER_DAY); // active subscription

      const status = service.getOfflineGraceStatus(lastSync, expires, now);
      expect(status.isValid).toBe(true);
      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(20);
    });

    it('should handle invalid dates safely', () => {
      const status = service.getOfflineGraceStatus(
        new Date('invalid'),
        new Date('invalid'),
      );
      expect(status.isValid).toBe(false);
      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });
  });
});
