import * as crypto from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LicensePayload,
  LicenseValidationResult,
  OfflineGraceStatus,
} from '@nodedr-restaurant/types';

export const OFFLINE_GRACE_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Resolves the HMAC secret key used for license signing and verification.
   * Uses JWT_SECRET configured in the environment or ConfigService.
   */
  private getSecret(): string {
    const secret =
      this.config.get<string>('JWT_SECRET') ||
      process.env.JWT_SECRET ||
      'nodedr-default-dev-secret-change-in-production';
    return secret;
  }

  /**
   * Generates an offline-resilient, cryptographically verified License Key.
   * Format: REST-<base64urlPayload>.<signatureHex>
   *
   * @param payload The license payload containing restaurant and plan details.
   * @returns Formatted signed license key string.
   */
  generateLicense(payload: LicensePayload): string {
    if (
      !payload ||
      !payload.restaurantId ||
      !payload.restaurantName ||
      !payload.plan ||
      !payload.expiresAt ||
      payload.maxTills === undefined ||
      !Array.isArray(payload.features) ||
      !payload.issuedAt
    ) {
      throw new BadRequestException('Incomplete license payload for generation');
    }

    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const secret = this.getSecret();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('hex');

    return `REST-${payloadB64}.${signature}`;
  }

  /**
   * Verifies an offline-resilient cryptographically signed license key.
   * Validates format, HMAC SHA-256 signature, payload structure, and expiration.
   *
   * @param licenseKey The license key to verify.
   * @param now Optional reference date (defaults to current system time).
   * @returns LicenseValidationResult with validation state and decoded payload.
   */
  verifyLicense(
    licenseKey: string,
    now: Date = new Date(),
  ): LicenseValidationResult {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return {
        isValid: false,
        error: 'License key is required and must be a string',
      };
    }

    const cleanKey = licenseKey.trim();
    if (!cleanKey) {
      return {
        isValid: false,
        error: 'License key cannot be empty',
      };
    }

    // Strip optional prefix REST- or REST.
    let token = cleanKey;
    if (/^REST[-_.]/i.test(token)) {
      token = token.slice(5);
    }

    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) {
      return {
        isValid: false,
        error: 'Invalid license key format: missing signature delimiter',
      };
    }

    const payloadB64 = token.substring(0, dotIndex);
    const signature = token.substring(dotIndex + 1);

    if (!payloadB64 || !signature) {
      return {
        isValid: false,
        error: 'Invalid license key format: empty payload or signature',
      };
    }

    const secret = this.getSecret();
    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('hex');
    const expectedB64 = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const hexBuf = Buffer.from(expectedHex, 'utf8');
    const b64Buf = Buffer.from(expectedB64, 'utf8');

    const matchesHex =
      sigBuf.length === hexBuf.length &&
      crypto.timingSafeEqual(sigBuf, hexBuf);
    const matchesB64 =
      sigBuf.length === b64Buf.length &&
      crypto.timingSafeEqual(sigBuf, b64Buf);

    if (!matchesHex && !matchesB64) {
      return {
        isValid: false,
        error: 'Invalid license signature or tampered key',
      };
    }

    // Decode JSON payload
    let payload: LicensePayload;
    try {
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      payload = JSON.parse(jsonStr);
    } catch {
      return {
        isValid: false,
        error: 'Invalid license key: malformed payload encoding',
      };
    }

    // Validate payload fields
    if (
      !payload ||
      typeof payload.restaurantId !== 'string' ||
      typeof payload.restaurantName !== 'string' ||
      !['STARTER', 'PRO', 'ENTERPRISE'].includes(payload.plan) ||
      typeof payload.expiresAt !== 'string' ||
      typeof payload.maxTills !== 'number' ||
      !Array.isArray(payload.features) ||
      typeof payload.issuedAt !== 'string'
    ) {
      return {
        isValid: false,
        error: 'Invalid license key: payload schema validation failed',
      };
    }

    const expiresDate = new Date(payload.expiresAt);
    if (isNaN(expiresDate.getTime())) {
      return {
        isValid: false,
        error: 'Invalid license key: invalid expiration date',
      };
    }

    const isExpired = expiresDate.getTime() <= now.getTime();
    const msRemaining = expiresDate.getTime() - now.getTime();
    const daysRemaining = isExpired
      ? 0
      : Math.max(1, Math.ceil(msRemaining / MS_DAY));

    if (isExpired) {
      return {
        isValid: false,
        isExpired: true,
        error: 'License key has expired',
        payload,
        daysRemaining: 0,
      };
    }

    return {
      isValid: true,
      isExpired: false,
      payload,
      daysRemaining,
    };
  }

  /**
   * Calculates offline grace period status.
   * Allows up to 14 days of offline grace since last sync with Cloud SaaS,
   * as well as up to 14 days of grace post-subscription expiry.
   *
   * @param lastSyncAt Last timestamp the POS synced with cloud SaaS.
   * @param expiresAt License expiration date.
   * @param now Optional reference date (defaults to current system time).
   * @returns OfflineGraceStatus with validity, grace state, and days remaining.
   */
  getOfflineGraceStatus(
    lastSyncAt: Date,
    expiresAt: Date,
    now: Date = new Date(),
  ): OfflineGraceStatus {
    if (
      !lastSyncAt ||
      !expiresAt ||
      isNaN(lastSyncAt.getTime()) ||
      isNaN(expiresAt.getTime())
    ) {
      return {
        isValid: false,
        inGracePeriod: false,
        daysRemaining: 0,
      };
    }

    const nowMs = now.getTime();
    const lastSyncMs = lastSyncAt.getTime();
    const expiresMs = expiresAt.getTime();

    // 1. Check offline sync window (up to 14 days without syncing)
    const msSinceLastSync = Math.max(0, nowMs - lastSyncMs);
    const daysSinceLastSync = msSinceLastSync / MS_PER_DAY;
    if (daysSinceLastSync > OFFLINE_GRACE_DAYS) {
      return {
        isValid: false,
        inGracePeriod: false,
        daysRemaining: 0,
      };
    }

    // 2. Check subscription expiration and post-expiry grace period
    const msUntilExpiry = expiresMs - nowMs;
    const daysUntilExpiry = msUntilExpiry / MS_PER_DAY;

    if (daysUntilExpiry >= 0) {
      // Normal active subscription
      const daysRemaining = Math.max(1, Math.ceil(daysUntilExpiry));
      return {
        isValid: true,
        inGracePeriod: false,
        daysRemaining,
      };
    }

    // Subscription is past expiresAt - check if within 14 days post-expiry grace
    const msPastExpiry = Math.abs(msUntilExpiry);
    const daysPastExpiry = msPastExpiry / MS_PER_DAY;

    if (daysPastExpiry <= OFFLINE_GRACE_DAYS) {
      const graceDaysRemaining = Math.max(
        0,
        Math.ceil(OFFLINE_GRACE_DAYS - daysPastExpiry),
      );
      return {
        isValid: true,
        inGracePeriod: true,
        daysRemaining: graceDaysRemaining,
      };
    }

    // Hard expired: past expiresAt + 14 days grace
    return {
      isValid: false,
      inGracePeriod: false,
      daysRemaining: 0,
    };
  }
}

const MS_DAY = 24 * 60 * 60 * 1000;
