import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  ActivateLicenseDto,
  LicensePayload,
  LicenseStatusResponse,
  SubscriptionPlan,
  SubscriptionPlanType,
} from '@nodedr-restaurant/types';
import { RazorpayService } from './razorpay.service';
import { SubscriptionsService } from './subscriptions.service';

export interface CreateOrderDto {
  plan: SubscriptionPlanType;
  restaurantId?: string;
  restaurantName?: string;
}

@ApiTags('subscriptions')
@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly razorpayService: RazorpayService,
  ) {}

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

  /**
   * Creates a Razorpay checkout order for a subscription plan.
   */
  @Post('razorpay/create-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Razorpay checkout order for SaaS subscription',
    description:
      'Prepares a payment order in paise (INR) for Starter, Pro, or Enterprise tiers.',
  })
  async createRazorpayOrder(@Body() body: CreateOrderDto) {
    if (!body?.plan) {
      throw new BadRequestException('plan is required (STARTER, PRO, or ENTERPRISE)');
    }
    const restaurantId = body.restaurantId || 'demo-restaurant';
    const restaurantName = body.restaurantName || 'Hanva Fine Dine';
    return this.razorpayService.createSubscriptionOrder(
      body.plan,
      restaurantId,
      restaurantName,
    );
  }

  /**
   * Razorpay Webhook receiver for payment.captured or order.paid events.
   * Validates HMAC-SHA256 webhook signature and auto-renews/activates license.
   */
  @Post('razorpay/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Razorpay subscription and payment webhooks',
    description:
      'Auto-generates signed license and activates subscription upon verified payment.',
  })
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
  ) {
    if (this.razorpayService.isConfigured()) {
      const rawString = JSON.stringify(payload);
      const isValid = this.razorpayService.verifyWebhookSignature(rawString, signature);
      if (!isValid) {
        throw new UnauthorizedException('Invalid Razorpay webhook signature');
      }
    }
    return this.razorpayService.processWebhookEvent(payload);
  }
}
