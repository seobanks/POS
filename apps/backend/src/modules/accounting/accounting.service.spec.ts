/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { AccountingService } from './accounting.service';

// Guards the bug where report windows were cut at UTC midnight instead of
// the restaurant's local midnight.
describe('AccountingService day windows', () => {
  function setup() {
    const prisma = {
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      refund: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };
    const time = { tzForBranch: jest.fn().mockResolvedValue('Asia/Kolkata') };
    return {
      svc: new AccountingService(prisma as never, time as never),
      prisma,
    };
  }

  it('cuts the cash-close window at local (IST) midnight', async () => {
    const { svc, prisma } = setup();
    await svc.closingPreview('b1', '2026-10-04');
    const range = prisma.payment.aggregate.mock.calls[0][0].where.createdAt;
    expect(range.gte.toISOString()).toBe('2026-10-03T18:30:00.000Z');
    expect(range.lt.toISOString()).toBe('2026-10-04T18:30:00.000Z');
    expect(prisma.refund.aggregate.mock.calls[0][0].where.createdAt).toEqual(
      range,
    );
  });

  it('generates X-Report with tender breakdown and drawer calculation', async () => {
    const prisma = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Downtown Bistro',
          phone: '+919876543210',
          restaurant: { currency: 'INR' },
        }),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ord-1',
            status: 'PAID',
            type: 'DINE_IN',
            totalAmount: 1200,
            taxAmount: 60,
            discountAmount: 100,
            tipAmount: 50,
            guestCount: 3,
            items: [
              { quantity: 2, unitPriceSnapshot: 500, menuItem: { category: { name: 'Mains' } } },
            ],
          },
        ]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([
          { method: 'CASH', amount: 500 },
          { method: 'UPI', amount: 700 },
        ]),
      },
      refund: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          { category: 'Supplies', amount: 150, paidFromCash: true },
        ]),
      },
    };
    const time = { tzForBranch: jest.fn().mockResolvedValue('Asia/Kolkata') };
    const svc = new AccountingService(prisma as never, time as never);

    const report = await svc.getXReport('b1', '2026-10-04', 1000);
    expect(report.sales.totalRevenue).toBe(1200);
    expect(report.payments.CASH.amount).toBe(500);
    expect(report.payments.UPI.amount).toBe(700);
    expect(report.covers.totalCovers).toBe(3);
    expect(report.covers.revenuePerCover).toBe(400); // 1200 / 3
    expect(report.cashDrawer.expectedCash).toBe(1350); // 1000 + 500 - 150
    expect(report.printableSlip).toContain('REGISTER X-REPORT');
  });

  it('generates Z-Report with variance and denomination counting', async () => {
    const prisma = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Downtown Bistro',
          restaurant: { currency: 'INR' },
        }),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      refund: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Rahul Manager' }),
      },
      cashClosing: {
        upsert: jest.fn().mockResolvedValue({ id: 'cc-1', variance: 50 }),
      },
    };
    const time = { tzForBranch: jest.fn().mockResolvedValue('Asia/Kolkata') };
    const svc = new AccountingService(prisma as never, time as never);

    const res = await svc.generateZReport('b1', 'user-1', {
      businessDate: '2026-10-04',
      openingFloat: 500,
      countedCash: 0,
      denominations: {
        '500': 1,
        '50': 1,
      }, // 550 total
      isBlindCount: true,
      note: 'Shift closed',
    });

    expect(res.countedCash).toBe(550);
    expect(res.variance).toBe(50); // 550 - 500 expected
    expect(res.isBlindCount).toBe(true);
    expect(res.cashierName).toBe('Rahul Manager');
    expect(res.printableSlip).toContain('OFFICIAL Z-REPORT');
    expect(res.printableSlip).toContain('OVER (+Rs. 50.00)');
  });
});
