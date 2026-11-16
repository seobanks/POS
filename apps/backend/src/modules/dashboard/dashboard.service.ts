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
}
