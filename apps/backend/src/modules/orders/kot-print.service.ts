import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { buildKotEscPosJob, resolveProfile } from './escpos-receipt';
import { sendToBranchPrinter, type BranchPrinterTarget } from './printer-transport';

export interface KotPrintResult {
  ok: true;
  printed: { id: string; ticketNumber: string; reprint: number }[];
  unsupportedChars: string[];
}

// Prints kitchen tickets (KOTs) on the branch's thermal printer.
//
// Duplicate guard: a first print "claims" the ticket with a conditional
// UPDATE (printedCount 0 -> 1) before any bytes are sent, so two taps, two
// tablets or a client retry can never both print the same ticket. If the
// printer then fails, the claim is released so a retry prints it. A copy of a
// ticket that was already printed only happens with reprint=true, and is
// stamped "*** REPRINT #n ***" on paper.
@Injectable()
export class KotPrintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private load(branchId: string, where: { id?: string; orderId?: string }) {
    return this.prisma.kot.findMany({
      where: {
        ...where,
        order: { branchId },
        status: { not: 'CANCELLED' },
      },
      include: {
        station: true,
        order: {
          include: {
            table: true,
            customer: true,
            branch: true,
          },
        },
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { orderItem: { include: { modifiers: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async printTicket(branchId: string, kotId: string, reprint: boolean) {
    const kots = await this.load(branchId, { id: kotId });
    if (kots.length === 0) throw new NotFoundException('KOT not found');
    return this.run(branchId, kots, reprint);
  }

  async printOrder(branchId: string, orderId: string, reprint: boolean) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const kots = await this.load(branchId, { orderId });
    if (kots.length === 0) {
      throw new ConflictException({
        code: 'NO_TICKETS',
        message: 'This order has no kitchen tickets to print',
      });
    }
    return this.run(branchId, kots, reprint);
  }

  private async run(
    branchId: string,
    kots: Awaited<ReturnType<KotPrintService['load']>>,
    reprint: boolean,
  ): Promise<KotPrintResult> {
    const todo = reprint ? kots : kots.filter((k) => k.printedCount === 0);
    if (todo.length === 0) {
      throw new ConflictException({
        code: 'ALREADY_PRINTED',
        message:
          'This ticket was already printed. Choose Reprint if you really need another copy.',
      });
    }

    const result: KotPrintResult = {
      ok: true,
      printed: [],
      unsupportedChars: [],
    };
    for (const kot of todo) {
      if (!reprint) {
        const claimed = await this.prisma.kot.updateMany({
          where: { id: kot.id, printedCount: 0 },
          data: { printedCount: 1, printedAt: new Date() },
        });
        if (claimed.count === 0) continue; // someone else just printed it
      }

      const branch = kot.order.branch as any;
      const copy = reprint ? kot.printedCount : 0; // REPRINT #n on paper
      const job = buildKotEscPosJob({
        branchName: branch.name,
        profile: resolveProfile({
          paperWidthMm: branch.printerPaperWidthMm,
          codepage: branch.printerCodepage,
          columns: branch.printerColumns,
        }),
        ticket: {
          number: kot.ticketNumber,
          station: kot.station?.name ?? null,
          reprint: copy,
        },
        order: {
          orderNumber: kot.order.orderNumber,
          type: kot.order.type,
          createdAt: kot.order.createdAt,
          table: kot.order.table
            ? {
                label: kot.order.table.name ?? `#${kot.order.table.number}`,
              }
            : null,
          customer: kot.order.customer
            ? { name: kot.order.customer.name ?? 'Guest' }
            : kot.order.guestName
              ? { name: kot.order.guestName }
              : null,
          notes: kot.order.notes,
          items: kot.items.map(({ orderItem }) => ({
            nameSnapshot: orderItem.nameSnapshot,
            quantity: orderItem.quantity,
            kitchenNote: orderItem.kitchenNote,
            modifiers: orderItem.modifiers.map((m) => ({
              nameSnapshot: m.nameSnapshot,
            })),
          })),
        },
      });

      // Build resolved printer target for the station
      let target: BranchPrinterTarget;
      if (kot.station?.printerName) {
        const rawStationPrinter = kot.station.printerName.trim();
        const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(rawStationPrinter);
        if (isIp) {
          const [parsedIp, rawPort] = rawStationPrinter.split(':');
          const parsedPort = rawPort ? parseInt(rawPort, 10) : 9100;
          target = {
            printerConnection: 'NETWORK',
            printerTransport: 'NETWORK',
            printerHost: parsedIp,
            printerIp: parsedIp,
            printerPort: parsedPort || 9100,
          };
        } else {
          target = {
            printerConnection: branch.printerConnection || 'WINDOWS',
            printerTransport: branch.printerTransport || branch.printerConnection || 'WINDOWS',
            printerHost: branch.printerHost || null,
            printerIp: branch.printerIp || branch.printerHost || null,
            printerPort: branch.printerPort || 9100,
            printerName: kot.station.printerName,
          };
        }
      } else {
        target = {
          printerConnection: branch.printerConnection || branch.printerTransport || 'USB',
          printerTransport: branch.printerTransport || branch.printerConnection || 'USB',
          printerHost: branch.printerHost || branch.printerIp || null,
          printerIp: branch.printerIp || branch.printerHost || null,
          printerPort: branch.printerPort || 9100,
          printerName: branch.printerName || null,
        };
      }

      let printError: string | null = null;
      try {
        await sendToBranchPrinter(target, job.buffer);
      } catch (err) {
        // Handle errors cleanly (if printer is unreachable or in serverless cloud, don't crash)
        printError = err instanceof Error ? err.message : 'Printing failed';
      }

      const updated = await this.prisma.kot.update({
        where: { id: kot.id },
        data: {
          lastPrintError: printError ? printError.slice(0, 300) : null,
          ...(reprint
            ? { printedCount: { increment: 1 }, printedAt: new Date() }
            : {}),
        },
      });

      // Always emit a print.job event to the branch room via RealtimeGateway
      this.realtime.emitToBranch(branchId, 'print.job', {
        id: kot.id,
        branchId,
        stationId: kot.stationId,
        stationName: kot.station?.name ?? 'Kitchen',
        targetPrinter:
          kot.station?.printerName || branch.printerName || 'Default KOT Printer',
        jobType: 'KOT',
        ticketNumber: kot.ticketNumber,
        rawEscposBase64: job.buffer.toString('base64'),
        createdAt: new Date().toISOString(),
      });

      result.printed.push({
        id: kot.id,
        ticketNumber: kot.ticketNumber,
        reprint: copy,
      });
      result.unsupportedChars.push(...job.unsupportedChars);
      this.realtime.emitToBranch(branchId, 'kot.reprinted', {
        id: updated.id,
        printedCount: updated.printedCount,
      });
    }
    if (result.printed.length === 0) {
      // Every ticket was claimed by a concurrent request.
      throw new ConflictException({
        code: 'ALREADY_PRINTED',
        message: 'These tickets were just printed by another request.',
      });
    }
    result.unsupportedChars = [...new Set(result.unsupportedChars)];
    return result;
  }
}
