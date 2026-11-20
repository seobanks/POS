import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CashClosingDto,
  ExpenseDto,
  ZReportDto,
} from '@nodedr-restaurant/types';
import { zonedRange } from '../../common/time';
import { BranchTimeService } from '../../common/services/branch-time.service';
import { PrismaService } from '../../prisma/prisma.service';
import { expectedCash, gstSummary, round2 } from './accounting.calc';

const dayStart = (d: string) => new Date(`${d}T00:00:00.000Z`);
const dayAfter = (d: string) => new Date(dayStart(d).getTime() + 86_400_000);

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: BranchTimeService,
  ) {}

  // --- Expenses ------------------------------------------------------------

  listExpenses(branchId: string, from: string, to: string) {
    return this.prisma.expense.findMany({
      where: { branchId, spentOn: { gte: dayStart(from), lte: dayStart(to) } },
      orderBy: [{ spentOn: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  createExpense(branchId: string, userId: string, dto: ExpenseDto) {
    return this.prisma.expense.create({
      data: {
        branchId,
        createdById: userId,
        spentOn: dayStart(dto.spentOn),
        category: dto.category,
        amount: dto.amount,
        note: dto.note,
        paidFromCash: dto.paidFromCash,
      },
    });
  }

  async deleteExpense(branchId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, branchId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    const closed = await this.prisma.cashClosing.findUnique({
      where: {
        branchId_businessDate: { branchId, businessDate: expense.spentOn },
      },
    });
    if (closed && expense.paidFromCash)
      throw new BadRequestException(
        'That day is already closed — the cash count includes this expense',
      );
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  // --- Daily cash closing --------------------------------------------------

  /** What the till should hold for a day, before anyone counts it. */
  async closingPreview(branchId: string, date: string, openingFloat = 0) {
    const from = dayStart(date); // @db.Date column: a plain calendar date
    const range = zonedRange(date, date, await this.time.tzForBranch(branchId));
    const [sales, refunds, expenses] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          method: 'CASH',
          createdAt: range,
          order: { branchId },
        },
        _sum: { amount: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          method: 'CASH',
          createdAt: range,
          order: { branchId },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { branchId, spentOn: from, paidFromCash: true },
        _sum: { amount: true },
      }),
    ]);
    const cashSales = Number(sales._sum.amount ?? 0);
    const cashRefunds = Number(refunds._sum.amount ?? 0);
    const cashExpenses = Number(expenses._sum.amount ?? 0);
    return {
      businessDate: date,
      openingFloat,
      cashSales: round2(cashSales - cashRefunds),
      cashExpenses: round2(cashExpenses),
      expectedCash: expectedCash(
        openingFloat,
        cashSales,
        cashRefunds,
        cashExpenses,
      ),
    };
  }

  async closeDay(branchId: string, userId: string, dto: CashClosingDto) {
    const existing = await this.prisma.cashClosing.findUnique({
      where: {
        branchId_businessDate: {
          branchId,
          businessDate: dayStart(dto.businessDate),
        },
      },
    });
    if (existing) throw new BadRequestException('This day is already closed');
    const p = await this.closingPreview(
      branchId,
      dto.businessDate,
      dto.openingFloat,
    );
    return this.prisma.cashClosing.create({
      data: {
        branchId,
        businessDate: dayStart(dto.businessDate),
        openingFloat: dto.openingFloat,
        cashSales: p.cashSales,
        cashExpenses: p.cashExpenses,
        expectedCash: p.expectedCash,
        countedCash: dto.countedCash,
        variance: round2(dto.countedCash - p.expectedCash),
        note: dto.note,
        closedById: userId,
      },
    });
  }

  listClosings(branchId: string) {
    return this.prisma.cashClosing.findMany({
      where: { branchId },
      orderBy: { businessDate: 'desc' },
      take: 60,
    });
  }

  // --- Z-Report & X-Report (Day End & Mid-Day Register Reads) ---------------

  async getXReport(branchId: string, dateStr?: string, openingFloat = 0) {
    const tz = await this.time.tzForBranch(branchId);
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const from = dayStart(date);
    const range = zonedRange(date, date, tz);

    const [branch, orders, payments, refunds, expenses] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          name: true,
          phone: true,
          address: true,
          restaurant: { select: { currency: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { branchId, createdAt: range },
        select: {
          id: true,
          status: true,
          type: true,
          totalAmount: true,
          taxAmount: true,
          discountAmount: true,
          tipAmount: true,
          guestCount: true,
          items: {
            select: {
              quantity: true,
              unitPriceSnapshot: true,
              menuItem: { select: { category: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { order: { branchId }, createdAt: range },
        select: { method: true, amount: true },
      }),
      this.prisma.refund.findMany({
        where: { order: { branchId }, createdAt: range },
        select: { method: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { branchId, spentOn: from },
        select: {
          category: true,
          amount: true,
          paidFromCash: true,
          note: true,
        },
      }),
    ]);

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const openOrders = orders.filter(
      (o) => o.status !== 'PAID' && o.status !== 'CANCELLED',
    );
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

    const grossSales = round2(
      paidOrders.reduce(
        (sum, o) =>
          sum +
          Number(o.totalAmount) +
          Number(o.discountAmount) -
          Number(o.tipAmount),
        0,
      ),
    );
    const totalDiscounts = round2(
      paidOrders.reduce((sum, o) => sum + Number(o.discountAmount), 0),
    );
    const totalTaxes = round2(
      paidOrders.reduce((sum, o) => sum + Number(o.taxAmount), 0),
    );
    const totalTips = round2(
      paidOrders.reduce((sum, o) => sum + Number(o.tipAmount), 0),
    );
    const netSales = round2(grossSales - totalDiscounts);
    const totalRevenue = round2(
      paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    );

    const dineInOrders = paidOrders.filter((o) => o.type === 'DINE_IN');
    const totalCovers = dineInOrders.reduce(
      (sum, o) => sum + (o.guestCount || 1),
      0,
    );
    const dineInRevenue = round2(
      dineInOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    );
    const revPerCover =
      totalCovers > 0 ? round2(dineInRevenue / totalCovers) : 0;

    // Payments by Tender
    const paymentMethods: Record<string, { count: number; amount: number }> = {
      CASH: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      UPI: { count: 0, amount: 0 },
      DUE: { count: 0, amount: 0 },
      OTHER: { count: 0, amount: 0 },
    };
    for (const p of payments) {
      const m = p.method in paymentMethods ? p.method : 'OTHER';
      paymentMethods[m].count += 1;
      paymentMethods[m].amount = round2(
        paymentMethods[m].amount + Number(p.amount),
      );
    }

    // Cash Drawer Reconciliation
    const cashSales = paymentMethods.CASH.amount;
    const cashRefunds = round2(
      refunds
        .filter((r) => r.method === 'CASH')
        .reduce((sum, r) => sum + Number(r.amount), 0),
    );
    const cashExpenses = round2(
      expenses
        .filter((e) => e.paidFromCash)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    );
    const expectedCashInDrawer = expectedCash(
      openingFloat,
      cashSales,
      cashRefunds,
      cashExpenses,
    );

    // Categories breakdown
    const categoryMap = new Map<string, { quantity: number; amount: number }>();
    for (const o of paidOrders) {
      for (const item of o.items) {
        const cat = item.menuItem?.category?.name || 'General';
        const cur = categoryMap.get(cat) || { quantity: 0, amount: 0 };
        cur.quantity += item.quantity;
        cur.amount = round2(
          cur.amount + item.quantity * Number(item.unitPriceSnapshot || 0),
        );
        categoryMap.set(cat, cur);
      }
    }
    const categorySales = Array.from(categoryMap.entries()).map(
      ([category, val]) => ({
        category,
        quantity: val.quantity,
        amount: val.amount,
      }),
    );

    const cur = branch?.restaurant?.currency || 'INR';
    const sym =
      cur === 'INR' ? 'Rs.' : cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur;

    const printableSlip = [
      '========================================',
      '           HANVA RESTAURANT POS         ',
      '           REGISTER X-REPORT            ',
      '========================================',
      `Branch:    ${branch?.name || 'Main Branch'}`,
      `Date:      ${date}`,
      `Generated: ${new Date().toLocaleTimeString()}`,
      '----------------------------------------',
      'SALES SUMMARY',
      `  Gross Sales:        ${sym} ${grossSales.toFixed(2)}`,
      `  Discounts:        - ${sym} ${totalDiscounts.toFixed(2)}`,
      `  Net Sales:          ${sym} ${netSales.toFixed(2)}`,
      `  Taxes (GST):        ${sym} ${totalTaxes.toFixed(2)}`,
      `  Tips:               ${sym} ${totalTips.toFixed(2)}`,
      `  Total Collected:    ${sym} ${totalRevenue.toFixed(2)}`,
      '----------------------------------------',
      'ORDERS & COVERS',
      `  Total Orders:       ${orders.length}`,
      `  Paid Orders:        ${paidOrders.length}`,
      `  Open Orders:        ${openOrders.length}`,
      `  Cancelled Orders:   ${cancelledOrders.length}`,
      `  Dine-In Covers:     ${totalCovers}`,
      `  Revenue / Cover:    ${sym} ${revPerCover.toFixed(2)}`,
      '----------------------------------------',
      'PAYMENT TENDER BREAKDOWN',
      `  Cash:         (${paymentMethods.CASH.count})  ${sym} ${paymentMethods.CASH.amount.toFixed(2)}`,
      `  Card:         (${paymentMethods.CARD.count})  ${sym} ${paymentMethods.CARD.amount.toFixed(2)}`,
      `  UPI:          (${paymentMethods.UPI.count})  ${sym} ${paymentMethods.UPI.amount.toFixed(2)}`,
      `  Due/Credit:   (${paymentMethods.DUE.count})  ${sym} ${paymentMethods.DUE.amount.toFixed(2)}`,
      `  Other:        (${paymentMethods.OTHER.count})  ${sym} ${paymentMethods.OTHER.amount.toFixed(2)}`,
      '----------------------------------------',
      'CASH DRAWER AUDIT',
      `  Opening Float:      ${sym} ${openingFloat.toFixed(2)}`,
      `  (+) Cash Sales:     ${sym} ${cashSales.toFixed(2)}`,
      `  (-) Cash Refunds:   ${sym} ${cashRefunds.toFixed(2)}`,
      `  (-) Cash Expenses:  ${sym} ${cashExpenses.toFixed(2)}`,
      '  --------------------------------------',
      `  EXPECTED IN TILL:   ${sym} ${expectedCashInDrawer.toFixed(2)}`,
      '========================================',
      '    *** MID-DAY / INTERIM READ ONLY *** ',
      '========================================',
    ].join('\n');

    return {
      businessDate: date,
      branchName: branch?.name || 'Main Branch',
      currency: cur,
      openingFloat,
      sales: {
        grossSales,
        totalDiscounts,
        netSales,
        totalTaxes,
        totalTips,
        totalRevenue,
      },
      orders: {
        total: orders.length,
        paid: paidOrders.length,
        open: openOrders.length,
        cancelled: cancelledOrders.length,
        dineIn: dineInOrders.length,
        takeaway: paidOrders.filter((o) => o.type === 'TAKEAWAY').length,
        delivery: paidOrders.filter((o) => o.type === 'DELIVERY').length,
      },
      covers: {
        totalCovers,
        dineInRevenue,
        revenuePerCover: revPerCover,
      },
      payments: paymentMethods,
      refunds: {
        count: refunds.length,
        totalAmount: round2(
          refunds.reduce((sum, r) => sum + Number(r.amount), 0),
        ),
        cashAmount: cashRefunds,
      },
      cashDrawer: {
        openingFloat,
        cashSales,
        cashRefunds,
        cashExpenses,
        expectedCash: expectedCashInDrawer,
      },
      categorySales,
      printableSlip,
    };
  }

  async generateZReport(branchId: string, userId: string, dto: ZReportDto) {
    const xReport = await this.getXReport(
      branchId,
      dto.businessDate,
      dto.openingFloat,
    );
    const date = dto.businessDate;
    const from = dayStart(date);

    // Calculate counted cash: either from denomination breakdown or direct input
    let countedCash = dto.countedCash;
    if (dto.denominations && Object.keys(dto.denominations).length > 0) {
      let calcSum = 0;
      for (const [denomStr, count] of Object.entries(dto.denominations)) {
        const denomVal = parseFloat(denomStr);
        if (!isNaN(denomVal) && count > 0) {
          calcSum += denomVal * count;
        }
      }
      countedCash = round2(calcSum);
    }

    const variance = round2(countedCash - xReport.cashDrawer.expectedCash);
    const zReportNumber = `Z-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const cashierName = user?.name || 'Staff';

    const notePayload = JSON.stringify({
      note: dto.note || '',
      isBlindCount: dto.isBlindCount ?? false,
      denominations: dto.denominations || {},
      zReportNumber,
      cashierName,
      closedAt: new Date().toISOString(),
    });

    const closing = await this.prisma.cashClosing.upsert({
      where: {
        branchId_businessDate: { branchId, businessDate: from },
      },
      update: {
        openingFloat: dto.openingFloat,
        cashSales: xReport.cashDrawer.cashSales,
        cashExpenses: xReport.cashDrawer.cashExpenses,
        expectedCash: xReport.cashDrawer.expectedCash,
        countedCash,
        variance,
        note: notePayload,
        closedById: userId,
      },
      create: {
        branchId,
        businessDate: from,
        openingFloat: dto.openingFloat,
        cashSales: xReport.cashDrawer.cashSales,
        cashExpenses: xReport.cashDrawer.cashExpenses,
        expectedCash: xReport.cashDrawer.expectedCash,
        countedCash,
        variance,
        note: notePayload,
        closedById: userId,
      },
    });

    const sym =
      xReport.currency === 'INR'
        ? 'Rs.'
        : xReport.currency === 'USD'
          ? '$'
          : xReport.currency;
    const varLabel =
      variance === 0
        ? 'BALANCED'
        : variance > 0
          ? `OVER (+${sym} ${variance.toFixed(2)})`
          : `SHORT (-${sym} ${Math.abs(variance).toFixed(2)})`;

    const zSlip = [
      '========================================',
      '           HANVA RESTAURANT POS         ',
      '           OFFICIAL Z-REPORT            ',
      '========================================',
      `Z-Report No: ${zReportNumber}`,
      `Branch:      ${xReport.branchName}`,
      `Date:        ${date}`,
      `Closed At:   ${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`,
      `Cashier:     ${cashierName}`,
      '----------------------------------------',
      'SALES SUMMARY',
      `  Gross Sales:        ${sym} ${xReport.sales.grossSales.toFixed(2)}`,
      `  Discounts:        - ${sym} ${xReport.sales.totalDiscounts.toFixed(2)}`,
      `  Net Sales:          ${sym} ${xReport.sales.netSales.toFixed(2)}`,
      `  Taxes (GST):        ${sym} ${xReport.sales.totalTaxes.toFixed(2)}`,
      `  Tips:               ${sym} ${xReport.sales.totalTips.toFixed(2)}`,
      `  Total Revenue:      ${sym} ${xReport.sales.totalRevenue.toFixed(2)}`,
      '----------------------------------------',
      'ORDERS & COVERS',
      `  Total Orders:       ${xReport.orders.total}`,
      `  Paid Orders:        ${xReport.orders.paid}`,
      `  Covers (Guests):    ${xReport.covers.totalCovers}`,
      `  Rev / Cover:        ${sym} ${xReport.covers.revenuePerCover.toFixed(2)}`,
      '----------------------------------------',
      'PAYMENT TENDER TOTALS',
      `  Cash:         (${xReport.payments.CASH.count})  ${sym} ${xReport.payments.CASH.amount.toFixed(2)}`,
      `  Card:         (${xReport.payments.CARD.count})  ${sym} ${xReport.payments.CARD.amount.toFixed(2)}`,
      `  UPI:          (${xReport.payments.UPI.count})  ${sym} ${xReport.payments.UPI.amount.toFixed(2)}`,
      `  Due/Credit:   (${xReport.payments.DUE.count})  ${sym} ${xReport.payments.DUE.amount.toFixed(2)}`,
      `  Other:        (${xReport.payments.OTHER.count})  ${sym} ${xReport.payments.OTHER.amount.toFixed(2)}`,
      '----------------------------------------',
      'CASH DRAWER RECONCILIATION',
      `  Opening Float:      ${sym} ${dto.openingFloat.toFixed(2)}`,
      `  (+) Cash Sales:     ${sym} ${xReport.cashDrawer.cashSales.toFixed(2)}`,
      `  (-) Cash Refunds:   ${sym} ${xReport.cashDrawer.cashRefunds.toFixed(2)}`,
      `  (-) Cash Paid Out:  ${sym} ${xReport.cashDrawer.cashExpenses.toFixed(2)}`,
      '  --------------------------------------',
      `  Expected in Till:   ${sym} ${xReport.cashDrawer.expectedCash.toFixed(2)}`,
      `  Counted Cash:       ${sym} ${countedCash.toFixed(2)}`,
      `  Variance:           ${varLabel}`,
      `  Blind Count Mode:   ${dto.isBlindCount ? 'YES' : 'NO'}`,
      ...(dto.note ? [`  Manager Note:       ${dto.note}`] : []),
      '----------------------------------------',
      '  Manager / Cashier Signature:          ',
      '                                        ',
      '  ____________________________________  ',
      '========================================',
      '     *** REGISTER CLOSED / RESET ***    ',
      '========================================',
    ].join('\n');

    return {
      closing,
      zReportNumber,
      cashierName,
      xReport,
      countedCash,
      variance,
      isBlindCount: dto.isBlindCount ?? false,
      printableSlip: zSlip,
    };
  }

  // --- Reports -------------------------------------------------------------

  /** Profit & loss for a period (cash-basis on bills paid in the period). */
  async profitAndLoss(branchId: string, from: string, to: string) {
    const f = dayStart(from); // date columns (expenses, payroll periods)
    const t = dayAfter(to);
    const range = zonedRange(from, to, await this.time.tzForBranch(branchId));
    const [orders, refunds, expenses, runs] = await Promise.all([
      this.prisma.order.aggregate({
        where: { branchId, status: 'PAID', billedAt: range },
        _sum: { totalAmount: true, tipAmount: true, taxAmount: true },
        _count: { _all: true },
      }),
      this.prisma.refund.aggregate({
        where: { createdAt: range, order: { branchId } },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { branchId, spentOn: { gte: f, lt: t } },
        _sum: { amount: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.payrollRun.findMany({
        where: {
          branchId,
          status: 'FINALIZED',
          periodEnd: { gte: f, lt: t },
        },
        include: { lines: true },
      }),
    ]);

    // Tips belong to staff, not the restaurant, so they are excluded from
    // revenue (and from payroll cost below).
    const collected =
      Number(orders._sum.totalAmount ?? 0) - Number(orders._sum.tipAmount ?? 0);
    const tax = Number(orders._sum.taxAmount ?? 0);
    const refunded = Number(refunds._sum.amount ?? 0);
    const netSales = round2(collected - tax - refunded);
    const expenseRows = expenses.map((e) => ({
      category: e.category,
      amount: round2(Number(e._sum.amount ?? 0)),
    }));
    const totalExpenses = round2(expenseRows.reduce((s, e) => s + e.amount, 0));
    const payrollCost = round2(
      runs
        .flatMap((r) => r.lines)
        .reduce(
          (s, l) => s + Number(l.basePay) - Number(l.unpaidLeaveDeduction),
          0,
        ),
    );
    return {
      from,
      to,
      orders: orders._count._all,
      grossCollected: round2(collected),
      taxCollected: round2(tax),
      refunds: round2(refunded),
      netSales,
      expenses: expenseRows,
      totalExpenses,
      payrollCost,
      netProfit: round2(netSales - totalExpenses - payrollCost),
    };
  }

  async gstReport(branchId: string, from: string, to: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'PAID',
        billedAt: zonedRange(from, to, await this.time.tzForBranch(branchId)),
      },
      select: {
        subtotal: true,
        discountAmount: true,
        loyaltyDiscountAmount: true,
        items: { select: { lineTotal: true, taxRateSnapshot: true } },
      },
    });
    const lines = orders.flatMap((o) => {
      const subtotal = Number(o.subtotal);
      const charged =
        subtotal - Number(o.discountAmount) - Number(o.loyaltyDiscountAmount);
      const factor = subtotal > 0 ? Math.max(0, charged) / subtotal : 1;
      return o.items.map((i) => ({
        lineTotal: Number(i.lineTotal),
        taxRatePercent: Number(i.taxRateSnapshot),
        factor,
      }));
    });
    return { from, to, orders: orders.length, ...gstSummary(lines) };
  }

  /** Cross-branch snapshot for the whole restaurant. */
  async branchOverview(restaurantId: string, from: string, to: string) {
    const range = zonedRange(
      from,
      to,
      await this.time.tzForRestaurant(restaurantId),
    );
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return Promise.all(
      branches.map(async (b) => {
        const [sales, open, ingredients] = await Promise.all([
          this.prisma.order.aggregate({
            where: {
              branchId: b.id,
              status: 'PAID',
              billedAt: range,
            },
            _sum: { totalAmount: true },
            _count: { _all: true },
          }),
          this.prisma.order.count({
            where: { branchId: b.id, status: 'OPEN' },
          }),
          this.prisma.ingredient.findMany({
            where: { branchId: b.id },
            select: {
              currentStock: true,
              reorderLevel: true,
              costPerUnit: true,
            },
          }),
        ]);
        return {
          branchId: b.id,
          name: b.name,
          orders: sales._count._all,
          sales: round2(Number(sales._sum.totalAmount ?? 0)),
          openOrders: open,
          lowStockItems: ingredients.filter(
            (i) =>
              Number(i.reorderLevel) > 0 &&
              Number(i.currentStock) <= Number(i.reorderLevel),
          ).length,
          inventoryValue: round2(
            ingredients.reduce(
              (s, i) => s + Number(i.currentStock) * Number(i.costPerUnit),
              0,
            ),
          ),
        };
      }),
    );
  }
}
