import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DashboardService - Shift-wise Business', () => {
  let service: DashboardService;
  let prisma: {
    branch: { findUnique: jest.Mock };
    order: { aggregate: jest.Mock; count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    table: { groupBy: jest.Mock };
    kot: { groupBy: jest.Mock };
    shift: { findMany: jest.Mock };
    wasteLog: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Central Cafe',
          restaurant: { currency: 'INR' },
        }),
      },
      order: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 1000 } }),
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn(),
      },
      table: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      kot: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      shift: {
        findMany: jest.fn(),
      },
      wasteLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('handles 0 shifts gracefully', async () => {
    prisma.shift.findMany.mockResolvedValue([]);
    prisma.order.findMany.mockImplementation(({ where }) => {
      if (where.status === 'PAID' && where.billedAt?.gte) {
        return Promise.resolve([
          {
            id: 'ord-1',
            orderNumber: '101',
            totalAmount: 500,
            billedAt: new Date(),
            createdAt: new Date(),
            createdById: 'user-1',
            payments: [{ method: 'CASH', amount: 500 }],
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await service.getSummary('branch-1');
    expect(res.shiftSales).toBeDefined();
    expect(res.shiftSales.shiftsCount).toBe(0);
    expect(res.shiftSales.shifts).toHaveLength(0);
    expect(res.shiftSales.totalShiftRevenue).toBe(0);
    expect(res.shiftSales.unassignedOrders).toBe(1);
    expect(res.shiftSales.unassignedRevenue).toBe(500);
  });

  it('calculates 2 shifts business accurately', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const shift1Start = new Date(`${todayStr}T09:00:00.000Z`);
    const shift1End = new Date(`${todayStr}T15:00:00.000Z`);
    const shift2Start = new Date(`${todayStr}T15:00:00.000Z`);
    const shift2End = new Date(`${todayStr}T23:00:00.000Z`);

    prisma.shift.findMany.mockResolvedValue([
      {
        id: 'shift-1',
        branchId: 'branch-1',
        userId: 'user-1',
        startsAt: shift1Start,
        endsAt: shift1End,
        note: 'Morning Shift',
        user: { id: 'user-1', name: 'John Cashier', role: { name: 'CASHIER', label: 'Cashier' } },
      },
      {
        id: 'shift-2',
        branchId: 'branch-1',
        userId: 'user-2',
        startsAt: shift2Start,
        endsAt: shift2End,
        note: 'Evening Shift',
        user: { id: 'user-2', name: 'Alice Manager', role: { name: 'MANAGER', label: 'Manager' } },
      },
    ]);

    prisma.order.findMany.mockImplementation(({ where }) => {
      if (where.status === 'PAID' && where.billedAt?.gte) {
        return Promise.resolve([
          {
            id: 'ord-1',
            orderNumber: '101',
            totalAmount: 400,
            billedAt: new Date(`${todayStr}T11:00:00.000Z`),
            createdAt: new Date(`${todayStr}T11:00:00.000Z`),
            createdById: 'user-1',
            payments: [{ method: 'CASH', amount: 400 }],
          },
          {
            id: 'ord-2',
            orderNumber: '102',
            totalAmount: 600,
            billedAt: new Date(`${todayStr}T18:00:00.000Z`),
            createdAt: new Date(`${todayStr}T18:00:00.000Z`),
            createdById: 'user-2',
            payments: [{ method: 'UPI', amount: 600 }],
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await service.getSummary('branch-1');
    expect(res.shiftSales.shiftsCount).toBe(2);
    expect(res.shiftSales.shifts).toHaveLength(2);

    const s1 = res.shiftSales.shifts[0];
    expect(s1.name).toBe('Morning Shift');
    expect(s1.totalRevenue).toBe(400);
    expect(s1.orderCount).toBe(1);
    expect(s1.paymentBreakdown.cash).toBe(400);
    expect(s1.percentageOfTotal).toBe(40); // 400 / 1000 = 40%

    const s2 = res.shiftSales.shifts[1];
    expect(s2.name).toBe('Evening Shift');
    expect(s2.totalRevenue).toBe(600);
    expect(s2.orderCount).toBe(1);
    expect(s2.paymentBreakdown.upi).toBe(600);
    expect(s2.percentageOfTotal).toBe(60); // 600 / 1000 = 60%

    expect(res.shiftSales.totalShiftRevenue).toBe(1000);
    expect(res.shiftSales.totalShiftOrders).toBe(2);
  });

  it('calculates 5 shifts sales accurately', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const mockShifts = [
      { id: 's-1', note: 'Breakfast', start: '06:00', end: '10:00', amt: 100 },
      { id: 's-2', note: 'Lunch', start: '10:00', end: '14:00', amt: 250 },
      { id: 's-3', note: 'Snacks', start: '14:00', end: '18:00', amt: 150 },
      { id: 's-4', note: 'Dinner', start: '18:00', end: '22:00', amt: 400 },
      { id: 's-5', note: 'Late Night', start: '22:00', end: '23:59', amt: 100 },
    ];

    prisma.shift.findMany.mockResolvedValue(
      mockShifts.map((s, idx) => ({
        id: s.id,
        branchId: 'branch-1',
        userId: `user-${idx + 1}`,
        startsAt: new Date(`${todayStr}T${s.start}:00.000Z`),
        endsAt: new Date(`${todayStr}T${s.end}:00.000Z`),
        note: s.note,
        user: { id: `user-${idx + 1}`, name: `Staff ${idx + 1}`, role: null },
      })),
    );

    prisma.order.findMany.mockImplementation(({ where }) => {
      if (where.status === 'PAID' && where.billedAt?.gte) {
        return Promise.resolve(
          mockShifts.map((s, idx) => ({
            id: `ord-${idx + 1}`,
            orderNumber: `ORD-${idx + 1}`,
            totalAmount: s.amt,
            billedAt: new Date(`${todayStr}T${s.start}:30.000Z`),
            createdAt: new Date(`${todayStr}T${s.start}:30.000Z`),
            createdById: `user-${idx + 1}`,
            payments: [{ method: 'CARD', amount: s.amt }],
          })),
        );
      }
      return Promise.resolve([]);
    });

    const res = await service.getSummary('branch-1');
    expect(res.shiftSales.shiftsCount).toBe(5);
    expect(res.shiftSales.shifts).toHaveLength(5);
    expect(res.shiftSales.shifts[0].name).toBe('Breakfast');
    expect(res.shiftSales.shifts[0].totalRevenue).toBe(100);
    expect(res.shiftSales.shifts[3].name).toBe('Dinner');
    expect(res.shiftSales.shifts[3].totalRevenue).toBe(400);
    expect(res.shiftSales.totalShiftRevenue).toBe(1000);
  });

  it('generates 7-day weather & demand forecast with actionable advice', async () => {
    prisma.branch.findUnique.mockResolvedValue({
      name: 'Central Cafe',
      restaurant: { currency: 'INR' },
    });
    prisma.order.findMany.mockResolvedValue([
      { totalAmount: 1500, billedAt: new Date(), type: 'DINE_IN', guestCount: 4 },
      { totalAmount: 800, billedAt: new Date(), type: 'DELIVERY', guestCount: 1 },
    ]);

    const forecast = await service.getDemandForecast('branch-1');
    expect(forecast.forecastDays).toHaveLength(7);
    expect(forecast.currency).toBe('INR');
    expect(forecast.forecastDays[0]).toHaveProperty('weather');
    expect(forecast.forecastDays[0]).toHaveProperty('predictedRevenue');
    expect(forecast.forecastDays[0]).toHaveProperty('kitchenPrepAdvice');
    expect(forecast.forecastDays[0].predictedRevenue.expected).toBeGreaterThan(0);
  });
});
