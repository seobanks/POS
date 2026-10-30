import * as crypto from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LicensePayload,
  SubscriptionPlanType,
} from '@nodedr-restaurant/types';
import { LicenseService } from './license.service';
import { SubscriptionsService, SUBSCRIPTION_PLANS } from './subscriptions.service';

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: SubscriptionPlanType;
  restaurantId: string;
  isDemo?: boolean;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly licenseService: LicenseService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID', '').trim();
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '').trim();
    this.webhookSecret = this.configService
      .get<string>('RAZORPAY_WEBHOOK_SECRET', '')
      .trim();
  }

  /**
   * Indicates whether live Razorpay API keys are configured.
   */
  isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  /**
   * Creates a Razorpay checkout order for a restaurant subscription tier.
   */
  async createSubscriptionOrder(
    planType: SubscriptionPlanType,
    restaurantId: string,
    restaurantName: string,
  ): Promise<CreateOrderResult> {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.plan === planType);
    if (!plan) {
      throw new BadRequestException(`Invalid subscription plan: ${planType}`);
    }

    const amountInPaise = plan.price * 100;

    // Fallback if Razorpay API keys are not yet configured in environment
    if (!this.isConfigured()) {
      const mockOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.logger.warn(
        `Razorpay keys not configured. Emitting demo order ${mockOrderId} for plan ${planType}. Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env for live processing.`,
      );
      return {
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: this.keyId || 'rzp_test_placeholder',
        plan: planType,
        restaurantId,
        isDemo: true,
      };
    }

    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: {
            restaurantId,
            restaurantName,
            plan: planType,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Razorpay order creation failed: ${errorBody}`);
        throw new BadRequestException('Failed to create Razorpay payment order');
      }

      const orderData = (await response.json()) as any;
      return {
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: this.keyId,
        plan: planType,
        restaurantId,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Razorpay connection error: ${err.message}`);
      throw new BadRequestException(`Razorpay gateway error: ${err.message}`);
    }
  }

  /**
   * Cryptographically verifies incoming Razorpay webhook signature using HMAC-SHA256.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Handles payment captured or subscription renewed webhooks from Razorpay,
   * automatically generating an HMAC SHA-256 license key and activating the node.
   */
  async processWebhookEvent(
    event: any,
  ): Promise<{ status: string; licenseKey?: string; plan?: string }> {
    const eventType = event?.event;
    this.logger.log(`Received Razorpay webhook event: ${eventType}`);

    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      return { status: 'IGNORED_EVENT_TYPE' };
    }

    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    const restaurantId = notes.restaurantId || 'demo-restaurant';
    const restaurantName = notes.restaurantName || 'Hanva Fine Dine';
    const planType: SubscriptionPlanType = (notes.plan as SubscriptionPlanType) || 'PRO';

    const planConfig = SUBSCRIPTION_PLANS.find((p) => p.plan === planType);
    const maxTills = planConfig?.maxTills || 3;
    const features = planConfig?.features || [];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const payload: LicensePayload = {
      restaurantId,
      restaurantName,
      plan: planType,
      expiresAt: expiresAt.toISOString(),
      maxTills,
      features,
      issuedAt: now.toISOString(),
    };

    const licenseKey = this.licenseService.generateLicense(payload);
    await this.subscriptionsService.activateLicense({ licenseKey });

    this.logger.log(
      `Successfully auto-renewed license for "${restaurantName}" on plan ${planType} via Razorpay payment ${paymentEntity?.id || orderEntity?.id}`,
    );

    return {
      status: 'ACTIVATED',
      licenseKey,
      plan: planType,
    };
  }
}
