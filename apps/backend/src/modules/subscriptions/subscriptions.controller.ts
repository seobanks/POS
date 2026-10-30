import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  ActivateLicenseDto,
  LicensePayload,
  LicenseStatusResponse,
  SubscriptionPlan,
} from '@nodedr-restaurant/types';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Returns public subscription plan options for restaurant owners.
   * Starter: ₹799/mo, Pro: ₹1499/mo, Enterprise: ₹2499/mo.
   */
  @Get('plans')
  @ApiOperation({
    summary: 'List available SaaS subscription plans',
    description:
      'Returns public pricing and feature comparison for Starter, Pro, and Enterprise tiers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of subscription plans',
  })
  getPlans(): SubscriptionPlan[] {
    return this.subscriptionsService.getPlans();
  }

  /**
   * Retrieves the current license activation status, plan tier,
   * feature entitlements, remaining days, and offline grace status.
   */
  @Get('license/status')
  @ApiOperation({
    summary: 'Get active license and offline grace status',
    description:
      'Returns current POS license status, feature flags, expiration, and offline resilience grace.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current license status',
  })
  async getLicenseStatus(): Promise<LicenseStatusResponse> {
    return this.subscriptionsService.getLicenseStatus();
  }

  /**
   * Activates a license key on this POS installation.
   * Cryptographically validates the HMAC-SHA256 signature, binds optional hardware ID,
   * and saves the configuration to persistent storage.
   */
  @Post('license/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate a license key for this restaurant POS',
    description:
      'Validates offline-resilient license key and activates subscription tier on this node.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'License activated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired license key',
  })
  async activateLicense(
    @Body() body: ActivateLicenseDto,
  ): Promise<LicenseStatusResponse> {
    return this.subscriptionsService.activateLicense(body);
  }

  /**
   * Cloud SaaS / Admin helper endpoint to issue signed license keys.
   */
  @Post('license/generate')
  @ApiOperation({
    summary: 'Issue a signed license key (Cloud SaaS / Admin)',
    description:
      'Signs a license payload with HMAC SHA-256 for distribution to restaurant subscribers.',
  })
  generateLicense(@Body() payload: LicensePayload): { licenseKey: string } {
    const licenseKey = this.subscriptionsService.generateLicense(payload);
    return { licenseKey };
  }
}
