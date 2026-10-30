import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LicenseService } from './license.service';
import { RazorpayService } from './razorpay.service';
import { SubscriptionsService } from './subscriptions.service';

describe('RazorpayService', () => {
  let service: RazorpayService;
  let licenseService: LicenseService;
  let subscriptionsService: SubscriptionsService;
  let configService: ConfigService;

  const mockWebhookSecret = 'whsec_test_secret_123456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue = '') => {
              if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key123';
              if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret456';
              if (key === 'RAZORPAY_WEBHOOK_SECRET') return mockWebhookSecret;
              return defaultValue;
            }),
          },
        },
        {
          provide: LicenseService,
          useValue: {
            generateLicense: jest.fn().mockReturnValue('REST-TEST-LIC1-KEY2'),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            activateLicense: jest.fn().mockResolvedValue({
              activated: true,
              status: 'ACTIVE',
              plan: 'PRO',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
    licenseService = module.get<LicenseService>(LicenseService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.isConfigured()).toBe(true);
  });

  describe('createSubscriptionOrder', () => {
    it('creates order details for Starter plan', async () => {
      // Mock global fetch for Razorpay API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'order_test_123',
          amount: 79900,
          currency: 'INR',
        }),
      } as any);

      const result = await service.createSubscriptionOrder(
        'STARTER',
        'rest_demo',
        'Demo Bistro',
      );

      expect(result.orderId).toBe('order_test_123');
      expect(result.amount).toBe(79900);
      expect(result.currency).toBe('INR');
      expect(result.plan).toBe('STARTER');
    });

    it('rejects invalid plan type', async () => {
      await expect(
        service.createSubscriptionOrder(
          'INVALID_PLAN' as any,
          'rest_demo',
          'Demo Bistro',
        ),
      ).rejects.toThrow('Invalid subscription plan');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('validates authentic webhook signature', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = service.verifyWebhookSignature(payload, validSignature);
      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook signature', () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      const invalidSignature = 'tampered_signature_hex';

      const isValid = service.verifyWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('processWebhookEvent', () => {
    it('auto-issues and activates license on payment.captured', async () => {
      const event = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_999',
              amount: 149900,
              notes: {
                restaurantId: 'rest_test',
                restaurantName: 'Test Diner',
                plan: 'PRO',
              },
            },
          },
        },
      };

      const result = await service.processWebhookEvent(event);

      expect(result.status).toBe('ACTIVATED');
      expect(result.plan).toBe('PRO');
      expect(licenseService.generateLicense).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantId: 'rest_test',
          restaurantName: 'Test Diner',
          plan: 'PRO',
          maxTills: 3,
        }),
      );
      expect(subscriptionsService.activateLicense).toHaveBeenCalledWith({
        licenseKey: 'REST-TEST-LIC1-KEY2',
      });
    });

    it('ignores non-payment webhook events', async () => {
      const event = { event: 'refund.processed' };
      const result = await service.processWebhookEvent(event);
      expect(result.status).toBe('IGNORED_EVENT_TYPE');
      expect(licenseService.generateLicense).not.toHaveBeenCalled();
    });
  });
});
