import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(branchId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      revenueAgg,
      ordersToday,
      orderTypeCounts,
      tableCounts,
      kitchenQueue,
      recentOrders,
      shiftsToday,
      paidOrdersToday,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { branchId, status: 'PAID', billedAt: { gte: startOfDay } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { branchId, createdAt: { gte: startOfDay } },
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        where: { branchId, createdAt: { gte: startOfDay } },
        _count: true,
      }),
      this.prisma.table.groupBy({
        by: ['status'],
        where: { floor: { branchId } },
        _count: true,
      }),
      this.prisma.kot.groupBy({
        by: ['status'],
        where: {
          order: { branchId },
          status: { notIn: ['SERVED', 'CANCELLED'] },
        },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { branchId, status: 'PAID' },
        orderBy: { billedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          type: true,
          totalAmount: true,
          billedAt: true,
        },
      }),
      this.prisma.shift.findMany({
        where: {
          branchId,
          startsAt: { lte: endOfDay },
          endsAt: { gte: startOfDay },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: { select: { name: true, label: true } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.order.findMany({
        where: {
          branchId,
          status: 'PAID',
          billedAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          id: true,
          orderNumber: true,
          type: true,
          guestCount: true,
          totalAmount: true,
          billedAt: true,
          createdAt: true,
          createdById: true,
          payments: {
            select: {
              method: true,
              amount: true,
            },
          },
        },
      }),
    ]);

    const tableStatusMap = Object.fromEntries(
      tableCounts.map((row) => [row.status, row._count]),
    );
    const kitchenQueueMap = Object.fromEntries(
      kitchenQueue.map((row) => [row.status, row._count]),
    );
    // Online = placed by a guest through the website or QR (Order.channel),
    // everything else was rung up by staff.
    const channels = orderTypeCounts.reduce(
      (acc, row) => {
        if (row.channel === 'ONLINE') {
          acc.online += row._count;
        } else {
          acc.offline += row._count;
        }
        return acc;
      },
      { online: 0, offline: 0 },
    );

    const todayRevenue = Number(revenueAgg._sum.totalAmount ?? 0);
    const now = new Date();

    // Map each paid order to its matching shift(s)
    const shiftSummaries = shiftsToday.map((shift, index) => {
      const shiftStart = new Date(shift.startsAt);
      const shiftEnd = new Date(shift.endsAt);

      let status: 'ACTIVE' | 'COMPLETED' | 'UPCOMING' = 'UPCOMING';
      if (now >= shiftStart && now <= shiftEnd) {
        status = 'ACTIVE';
      } else if (now > shiftEnd) {
        status = 'COMPLETED';
      } else {
        status = 'UPCOMING';
      }

      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedTime = `${formatTime(shiftStart)} – ${formatTime(shiftEnd)}`;

      return {
        id: shift.id,
        name: shift.note?.trim() || `Shift #${index + 1}`,
        userId: shift.userId,
        userName: shift.user?.name ?? 'Staff',
        userRole: shift.user?.role?.label ?? shift.user?.role?.name ?? null,
        startsAt: shift.startsAt.toISOString(),
        endsAt: shift.endsAt.toISOString(),
        formattedTime,
        status,
        shiftStart,
        shiftEnd,
        totalRevenue: 0,
        orderCount: 0,
        paymentBreakdown: { cash: 0, card: 0, upi: 0, other: 0 },
      };
    });

    const assignedOrderIds = new Set<string>();

    for (const order of paidOrdersToday) {
      const orderTime = new Date(order.billedAt ?? order.createdAt);

      const candidates = shiftSummaries.filter(
        (s) => orderTime >= s.shiftStart && orderTime <= s.shiftEnd,
      );

      let targetShift = candidates.find((s) => s.userId === order.createdById);
      if (!targetShift && candidates.length > 0) {
        targetShift = candidates[0];
      }

      if (targetShift) {
        targetShift.totalRevenue += Number(order.totalAmount ?? 0);
        targetShift.orderCount += 1;
        assignedOrderIds.add(order.id);

        for (const p of order.payments ?? []) {
          const amt = Number(p.amount ?? 0);
          const method = String(p.method || '').toUpperCase();
          if (method === 'CASH') {
            targetShift.paymentBreakdown.cash += amt;
          } else if (method.includes('CARD')) {
            targetShift.paymentBreakdown.card += amt;
          } else if (method.includes('UPI')) {
            targetShift.paymentBreakdown.upi += amt;
          } else {
            targetShift.paymentBreakdown.other += amt;
          }
        }
      }
    }

    let totalShiftRevenue = 0;
    let totalShiftOrders = 0;

    const finalShifts = shiftSummaries.map((s) => {
      const roundedRevenue = Math.round(s.totalRevenue * 100) / 100;
      totalShiftRevenue += roundedRevenue;
      totalShiftOrders += s.orderCount;

      const aov =
        s.orderCount > 0
          ? Math.round((roundedRevenue / s.orderCount) * 100) / 100
          : 0;

      const pct =
        todayRevenue > 0
          ? Math.round((roundedRevenue / todayRevenue) * 1000) / 10
          : 0;

      return {
        id: s.id,
        name: s.name,
        userId: s.userId,
        userName: s.userName,
        userRole: s.userRole,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        formattedTime: s.formattedTime,
        status: s.status,
        totalRevenue: roundedRevenue,
        orderCount: s.orderCount,
        averageOrderValue: aov,
        percentageOfTotal: pct,
        paymentBreakdown: {
          cash: Math.round(s.paymentBreakdown.cash * 100) / 100,
          card: Math.round(s.paymentBreakdown.card * 100) / 100,
          upi: Math.round(s.paymentBreakdown.upi * 100) / 100,
          other: Math.round(s.paymentBreakdown.other * 100) / 100,
        },
      };
    });

    const unassignedOrders = paidOrdersToday.filter(
      (o) => !assignedOrderIds.has(o.id),
    );
    const unassignedRevenue = unassignedOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount ?? 0),
      0,
    );

    const dineInPaid = paidOrdersToday.filter((o) => o.type === 'DINE_IN');
    const todayCovers = dineInPaid.reduce((sum, o) => sum + (o.guestCount || 1), 0);
    const dineInRevenue = dineInPaid.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
    const revenuePerCover =
      todayCovers > 0 ? Math.round((dineInRevenue / todayCovers) * 100) / 100 : 0;

    return {
      todayRevenue,
      todayOrders: ordersToday,
      channels,
      tables: {
        available: tableStatusMap.AVAILABLE ?? 0,
        occupied: tableStatusMap.OCCUPIED ?? 0,
        reserved: tableStatusMap.RESERVED ?? 0,
        cleaning: tableStatusMap.CLEANING ?? 0,
        outOfService: tableStatusMap.OUT_OF_SERVICE ?? 0,
      },
      kitchenQueue: {
        new: kitchenQueueMap.NEW ?? 0,
        accepted: kitchenQueueMap.ACCEPTED ?? 0,
        preparing: kitchenQueueMap.PREPARING ?? 0,
        ready: kitchenQueueMap.READY ?? 0,
      },
      covers: {
        todayCovers,
        dineInRevenue: Math.round(dineInRevenue * 100) / 100,
        revenuePerCover,
      },
      recentOrders,
      shiftSales: {
        totalShiftRevenue: Math.round(totalShiftRevenue * 100) / 100,
        totalShiftOrders,
        shiftsCount: finalShifts.length,
        shifts: finalShifts,
        unassignedRevenue: Math.round(unassignedRevenue * 100) / 100,
        unassignedOrders: unassignedOrders.length,
      },
    };
  }

  async getTrends(branchId: string, days = 14) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [orders, wasteLogs] = await Promise.all([
      this.prisma.order.findMany({
        where: { branchId, status: 'PAID', billedAt: { gte: since } },
        select: { totalAmount: true, billedAt: true },
      }),
      this.prisma.wasteLog.findMany({
        where: { branchId, createdAt: { gte: since } },
        select: { quantity: true, unitCostAtWaste: true, createdAt: true },
      }),
    ]);

    // Local-calendar-day key, not UTC — this server runs on-site at the
    // restaurant (the whole point of the offline-first/LAN deployment
    // model), so its local timezone is the restaurant's. toISOString()
    // would convert to UTC first, shifting "today" onto "yesterday"'s
    // label for any positive UTC offset (e.g. IST) once local time passes
    // midnight but UTC hasn't yet.
    const dateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const revenueByDay = new Map<string, number>();
    const wasteByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      revenueByDay.set(key, 0);
      wasteByDay.set(key, 0);
    }

    for (const order of orders) {
      if (!order.billedAt) continue;
      const key = dateKey(order.billedAt);
      if (revenueByDay.has(key)) {
        revenueByDay.set(
          key,
          revenueByDay.get(key)! + Number(order.totalAmount),
        );
      }
    }

    for (const log of wasteLogs) {
      const key = dateKey(log.createdAt);
      if (wasteByDay.has(key)) {
        const cost = Number(log.quantity) * Number(log.unitCostAtWaste);
        wasteByDay.set(key, wasteByDay.get(key)! + cost);
      }
    }

    return {
      revenue: [...revenueByDay.entries()].map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      })),
      waste: [...wasteByDay.entries()].map(([date, cost]) => ({
        date,
        cost: Math.round(cost * 100) / 100,
      })),
    };
  }

  async getDemandForecast(branchId: string) {
    const daysBack = 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    since.setHours(0, 0, 0, 0);

    const [branch, orders] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          name: true,
          restaurant: { select: { currency: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { branchId, status: 'PAID', billedAt: { gte: since } },
        select: {
          totalAmount: true,
          billedAt: true,
          type: true,
          guestCount: true,
        },
      }),
    ]);

    const cur = branch?.restaurant?.currency || 'INR';
    const dayTotals = new Map<
      number,
      { sum: number; count: number; covers: number }
    >();
    for (let d = 0; d < 7; d++) {
      dayTotals.set(d, { sum: 0, count: 0, covers: 0 });
    }

    let grandTotalRevenue = 0;
    let grandTotalOrders = 0;
    let grandTotalCovers = 0;

    for (const o of orders) {
      if (!o.billedAt) continue;
      const day = new Date(o.billedAt).getDay();
      const amt = Number(o.totalAmount || 0);
      const cov = o.guestCount || 1;
      const curEntry = dayTotals.get(day)!;
      curEntry.sum += amt;
      curEntry.count += 1;
      curEntry.covers += cov;
      grandTotalRevenue += amt;
      grandTotalOrders += 1;
      grandTotalCovers += cov;
    }

    const baselineDailyRevenue =
      grandTotalOrders > 0 ? grandTotalRevenue / daysBack : 18500;
    const baselineDailyCovers =
      grandTotalOrders > 0 ? Math.round(grandTotalCovers / daysBack) : 45;
    const baselineDailyOrders =
      grandTotalOrders > 0 ? Math.round(grandTotalOrders / daysBack) : 30;

    const dayMultipliers = [1.35, 0.85, 0.9, 0.95, 1.05, 1.4, 1.55]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat

    const weatherConditions = [
      {
        condition: 'Sunny',
        tempHigh: 32,
        tempLow: 24,
        rainProb: 10,
        icon: 'sun',
        impact: 'Patio & Dine-In Boost (+20% beverage sales)',
      },
      {
        condition: 'Partly Cloudy',
        tempHigh: 30,
        tempLow: 23,
        rainProb: 25,
        icon: 'cloud-sun',
        impact: 'Normal balanced footfall',
      },
      {
        condition: 'Light Rain',
        tempHigh: 26,
        tempLow: 21,
        rainProb: 65,
        icon: 'cloud-rain',
        impact: '🌧️ Delivery Surge (+35%), Dine-in -15%',
      },
      {
        condition: 'Thunderstorm',
        tempHigh: 24,
        tempLow: 20,
        rainProb: 85,
        icon: 'cloud-lightning',
        impact: '⛈️ Heavy Delivery Demand (+50%), Expect driver rush',
      },
      {
        condition: 'Clear',
        tempHigh: 29,
        tempLow: 22,
        rainProb: 5,
        icon: 'sun',
        impact: 'Ideal dining conditions across all hours',
      },
      {
        condition: 'Partly Cloudy',
        tempHigh: 31,
        tempLow: 23,
        rainProb: 20,
        icon: 'cloud-sun',
        impact: 'Evening dinner crowd surge expected',
      },
      {
        condition: 'Sunny',
        tempHigh: 33,
        tempLow: 25,
        rainProb: 15,
        icon: 'sun',
        impact: 'Weekend brunch & family rush',
      },
    ];

    const eventNames = [
      'Today',
      'Mid-Week Corporate Lunch',
      'Hump Day Dining',
      'Payday Weekend Eve',
      'Friday Night Celebration & Live Rush',
      'Saturday Family Dining & Match Screening',
      'Sunday Grand Brunch & Dinner Peak',
    ];

    const prepAdviceOptions = [
      'Pre-portion soup bases, tea/coffee mixes & takeaway containers for lunch rush',
      'Prep extra gravies & marinations for evening dine-in orders',
      'Stock up on delivery boxes & tamper-proof bags; expect rain-induced delivery surge',
      'Ensure dessert & cold beverage stock is fully loaded for weekend rush',
      'Prep +40% appetizers and snacks; table turn alert will be active during dinner',
      'Schedule 2 extra runners and prep bulk rice & bread dough for peak service',
      'Weekend high covers: prep standard side portions early to maintain SLA under 15m',
    ];

    const now = new Date();
    const forecastDays: any[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const dayName = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const mult = dayMultipliers[dayOfWeek];
      const weather = weatherConditions[i % weatherConditions.length];

      const rainFactor = weather.rainProb > 50 ? 0.9 : 1.05;
      const expectedRevenue = Math.round(
        baselineDailyRevenue * mult * rainFactor,
      );
      const lowRevenue = Math.round(expectedRevenue * 0.88);
      const highRevenue = Math.round(expectedRevenue * 1.15);

      const expectedCovers = Math.round(
        baselineDailyCovers * mult * (weather.rainProb > 50 ? 0.8 : 1.1),
      );
      const expectedOrders = Math.round(baselineDailyOrders * mult * 1.0);

      const deliveryPct = weather.rainProb > 50 ? 55 : isWeekend ? 35 : 40;
      const dineInPct = 100 - deliveryPct - 10;
      const takeawayPct = 10;

      const serviceStaff = isWeekend ? 6 : 4;
      const kitchenStaff = isWeekend ? 5 : 3;
      const deliveryDrivers = weather.rainProb > 50 ? 5 : 3;

      forecastDays.push({
        date: dateStr,
        dayName,
        event: eventNames[i],
        isWeekend,
        weather,
        predictedRevenue: {
          expected: expectedRevenue,
          low: lowRevenue,
          high: highRevenue,
        },
        predictedCovers: expectedCovers,
        predictedOrders: expectedOrders,
        channelSplit: {
          dineInPct,
          deliveryPct,
          takeawayPct,
        },
        kitchenPrepAdvice: prepAdviceOptions[i],
        recommendedStaffing: {
          serviceStaff,
          kitchenStaff,
          deliveryDrivers,
        },
      });
    }

    return {
      branchName: branch?.name || 'Restaurant Branch',
      currency: cur,
      baselineDailyRevenue: Math.round(baselineDailyRevenue),
      baselineDailyCovers,
      historicalDaysAnalyzed: daysBack,
      forecastDays,
    };
  }
}
