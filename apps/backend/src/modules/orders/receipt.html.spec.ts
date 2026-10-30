import { buildReceiptHtml } from './receipt.html';

const base = {
  restaurantName: 'Bar',
  currency: 'EUR',
  branch: {
    name: 'Centro',
    address: null,
    phone: null,
    gstNumber: null,
    taxRegime: 'ES_IVA' as const,
    taxMode: 'INCLUSIVE' as const,
    taxLabel: null,
    taxId: 'B12345678',
  },
  order: {
    orderNumber: '1',
    type: 'TAKEAWAY',
    createdAt: new Date('2026-10-18T10:00:00Z'),
    table: null,
    customer: null,
    subtotal: 11,
    discountAmount: 0,
    taxAmount: 1,
    tipAmount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    totalAmount: 11,
    items: [
      {
        nameSnapshot: 'Paella',
        quantity: 1,
        unitPriceSnapshot: 11,
        lineTotal: 11,
        taxRateSnapshot: 10,
        modifiers: [],
      },
    ],
    payments: [{ method: 'CARD', amount: 11 }],
  },
};
const verifactu = {
  url: 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=T1-000001&fecha=18-10-2026&importe=11.00',
  heading: 'QR tributario:',
  legend: 'Factura verificable en la sede electrónica de la AEAT',
  short: 'VERI*FACTU',
  invoiceNumber: 'T1-000001',
};

describe('receipt HTML with VERI*FACTU', () => {
  it('draws an inline 35 mm QR with the legends on a paid receipt', () => {
    const html = buildReceiptHtml({
      ...base,
      order: { ...base.order, verifactu },
    });
    expect(html).toContain('Factura simplificada T1-000001');
    expect(html).toContain('QR tributario:');
    expect(html).toContain('<svg');
    expect(html).toContain('width="35mm"');
    expect(html).toContain('VERI*FACTU');
  });
  it('omits it without an invoice and on a provisional bill', () => {
    expect(buildReceiptHtml(base)).not.toContain('QR tributario');
    expect(
      buildReceiptHtml({
        ...base,
        order: { ...base.order, verifactu, isProvisional: true },
      }),
    ).not.toContain('QR tributario');
  });
});


describe('receipt HTML with dynamic UPI QR', () => {
  it('renders inline 35mm QR and caption when order.upi is provided', () => {
    const html = buildReceiptHtml({
      ...base,
      restaurantName: 'Hanva Cafe',
      currency: 'INR',
      order: {
        ...base.order,
        orderNumber: 'ORD-77',
        upi: {
          vpa: 'cafe@okhdfcbank',
          name: 'Hanva Cafe',
          amount: 250,
          note: 'ORD-77',
        },
      },
    });
    expect(html).toContain('Scan with GPay / PhonePe / Paytm');
    expect(html).toContain('<svg');
    expect(html).toContain('width="35mm"');
  });

  it('renders UPI QR when branch.upiVpa is configured on provisional bill', () => {
    const html = buildReceiptHtml({
      ...base,
      currency: 'INR',
      branch: {
        ...base.branch,
        upiVpa: 'branch@upi',
        upiPayeeName: 'Main Branch',
      },
      order: {
        ...base.order,
        isProvisional: true,
      },
    });
    expect(html).toContain('Scan with GPay / PhonePe / Paytm');
    expect(html).toContain('<svg');
  });

  it('omits UPI QR on a paid bill without explicit order.upi', () => {
    const html = buildReceiptHtml({
      ...base,
      branch: {
        ...base.branch,
        upiVpa: 'branch@upi',
      },
      order: {
        ...base.order,
        isProvisional: false,
        amountPaid: 11,
        balanceDue: 0,
      },
    });
    expect(html).not.toContain('Scan with GPay / PhonePe / Paytm');
  });
});
