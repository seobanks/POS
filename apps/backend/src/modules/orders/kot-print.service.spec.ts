import { KotPrintService } from './kot-print.service';
import * as printerTransport from './printer-transport';

jest.mock('./printer-transport', () => ({
  sendToBranchPrinter: jest.fn(),
}));

describe('KotPrintService Multi-Station Routing & Realtime Spooler', () => {
  let service: KotPrintService;
  let mockPrisma: any;
  let mockRealtime: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      kot: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
      },
    };

    mockRealtime = {
      emitToBranch: jest.fn(),
    };

    service = new KotPrintService(mockPrisma as any, mockRealtime as any);
  });

  const baseBranch = {
    id: 'branch-1',
    name: 'Main Restaurant',
    printerConnection: 'USB',
    printerHost: null,
    printerPort: 9100,
    printerPaperWidthMm: 80,
    printerCodepage: 'CP858',
    printerColumns: 48,
  };

  const createMockKot = (options: {
    stationPrinterName?: string | null;
    stationName?: string;
  }) => ({
    id: 'kot-101',
    ticketNumber: 'KOT-001',
    printedCount: 0,
    printedAt: null,
    stationId: 'station-bar',
    station: {
      id: 'station-bar',
      name: options.stationName ?? 'Bar Station',
      printerName: options.stationPrinterName ?? null,
    },
    order: {
      id: 'order-1',
      orderNumber: 'A-101',
      type: 'DINE_IN',
      createdAt: new Date(),
      table: { name: 'T1', number: 1 },
      customer: null,
      guestName: 'Guest 1',
      notes: null,
      branch: baseBranch,
    },
    items: [
      {
        orderItem: {
          nameSnapshot: 'Cocktail',
          quantity: 2,
          kitchenNote: 'Less ice',
          modifiers: [],
        },
      },
    ],
  });

  it('routes KOT to station printer with IP and port overrides and emits print.job event', async () => {
    const kot = createMockKot({ stationPrinterName: '192.168.1.150:9100' });
    mockPrisma.kot.findMany.mockResolvedValue([kot]);
    mockPrisma.kot.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.kot.update.mockResolvedValue({ id: kot.id, printedCount: 1 });
    (printerTransport.sendToBranchPrinter as jest.Mock).mockResolvedValue(undefined);

    const result = await service.printTicket('branch-1', 'kot-101', false);

    expect(result.ok).toBe(true);
    expect(result.printed).toHaveLength(1);

    // Verify station printer target was resolved with NETWORK IP & Port
    expect(printerTransport.sendToBranchPrinter).toHaveBeenCalledWith(
      expect.objectContaining({
        printerConnection: 'NETWORK',
        printerTransport: 'NETWORK',
        printerIp: '192.168.1.150',
        printerHost: '192.168.1.150',
        printerPort: 9100,
      }),
      expect.any(Buffer),
    );

    // Verify realtime print.job event was emitted
    expect(mockRealtime.emitToBranch).toHaveBeenCalledWith(
      'branch-1',
      'print.job',
      expect.objectContaining({
        id: 'kot-101',
        branchId: 'branch-1',
        stationId: 'station-bar',
        stationName: 'Bar Station',
        targetPrinter: '192.168.1.150:9100',
        jobType: 'KOT',
        ticketNumber: 'KOT-001',
        rawEscposBase64: expect.any(String),
      }),
    );
  });

  it('routes KOT to named station printer when not an IP address', async () => {
    const kot = createMockKot({ stationPrinterName: 'Bar Thermal Printer 1' });
    mockPrisma.kot.findMany.mockResolvedValue([kot]);
    mockPrisma.kot.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.kot.update.mockResolvedValue({ id: kot.id, printedCount: 1 });
    (printerTransport.sendToBranchPrinter as jest.Mock).mockResolvedValue(undefined);

    await service.printTicket('branch-1', 'kot-101', false);

    expect(printerTransport.sendToBranchPrinter).toHaveBeenCalledWith(
      expect.objectContaining({
        printerName: 'Bar Thermal Printer 1',
      }),
      expect.any(Buffer),
    );
  });

  it('falls back to default branch printer settings when station has no printerName', async () => {
    const kot = createMockKot({ stationPrinterName: null });
    mockPrisma.kot.findMany.mockResolvedValue([kot]);
    mockPrisma.kot.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.kot.update.mockResolvedValue({ id: kot.id, printedCount: 1 });
    (printerTransport.sendToBranchPrinter as jest.Mock).mockResolvedValue(undefined);

    await service.printTicket('branch-1', 'kot-101', false);

    expect(printerTransport.sendToBranchPrinter).toHaveBeenCalledWith(
      expect.objectContaining({
        printerConnection: 'USB',
        printerHost: null,
        printerPort: 9100,
      }),
      expect.any(Buffer),
    );
  });

  it('does not crash when printer is unreachable and still emits realtime print.job event', async () => {
    const kot = createMockKot({ stationPrinterName: '192.168.1.200:9100' });
    mockPrisma.kot.findMany.mockResolvedValue([kot]);
    mockPrisma.kot.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.kot.update.mockResolvedValue({ id: kot.id, printedCount: 1 });
    (printerTransport.sendToBranchPrinter as jest.Mock).mockRejectedValue(
      new Error('Connection timed out to printer at 192.168.1.200:9100'),
    );

    const result = await service.printTicket('branch-1', 'kot-101', false);

    // Doesn't crash, returns ok: true with printed ticket
    expect(result.ok).toBe(true);
    expect(result.printed).toHaveLength(1);

    // Records error in database
    expect(mockPrisma.kot.update).toHaveBeenCalledWith({
      where: { id: 'kot-101' },
      data: expect.objectContaining({
        lastPrintError: expect.stringContaining('Connection timed out'),
      }),
    });

    // Still emits print.job event so LAN print spoolers can handle it
    expect(mockRealtime.emitToBranch).toHaveBeenCalledWith(
      'branch-1',
      'print.job',
      expect.objectContaining({
        id: 'kot-101',
        jobType: 'KOT',
      }),
    );
  });
});
