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

describe('receipt HTML with restaurant logo', () => {
  it('renders centered monochrome-filtered logo when logoUrl is provided', () => {
    const logoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=';
    const html = buildReceiptHtml({
      ...base,
      logoUrl,
    });
    expect(html).toContain(
      '<div class="center" style="margin-bottom: 4px;"><img src="' +
        logoUrl +
        '" alt="Logo" style="max-height: 48px; max-width: 140px; object-fit: contain; filter: grayscale(100%) contrast(150%);" /></div>',
    );
    // Logo appears before restaurant name heading
    const logoIndex = html.indexOf('alt="Logo"');
    const h1Index = html.indexOf(`<h1>${base.restaurantName}</h1>`);
    expect(logoIndex).toBeGreaterThan(-1);
    expect(h1Index).toBeGreaterThan(logoIndex);
  });

  it('omits logo element when logoUrl is null or not provided', () => {
    const htmlNull = buildReceiptHtml({
      ...base,
      logoUrl: null,
    });
    expect(htmlNull).not.toContain('alt="Logo"');
    expect(htmlNull).not.toContain('style="max-height: 48px;');

    const htmlOmitted = buildReceiptHtml(base);
    expect(htmlOmitted).not.toContain('alt="Logo"');
  });
});

describe('receipt HTML compliance headers', () => {
  it('renders both GSTIN and Tax ID / FSSAI cleanly when branch.taxId differs from branch.gstNumber under INDIA_GST', () => {
    const html = buildReceiptHtml({
      ...base,
      branch: {
        ...base.branch,
        taxRegime: 'INDIA_GST',
        gstNumber: '27AABCH1234F1Z5',
        taxId: '10019022009876',
      },
    });
    expect(html).toContain('GSTIN: 27AABCH1234F1Z5');
    expect(html).toContain('Tax ID / FSSAI: 10019022009876');
  });

  it('preserves existing FSSAI prefix in taxId when both are provided', () => {
    const html = buildReceiptHtml({
      ...base,
      branch: {
        ...base.branch,
        taxRegime: 'INDIA_GST',
        gstNumber: '27AABCH1234F1Z5',
        taxId: 'FSSAI: 10019022009876',
      },
    });
    expect(html).toContain('GSTIN: 27AABCH1234F1Z5');
    expect(html).toContain('FSSAI: 10019022009876');
    expect(html).not.toContain('Tax ID / FSSAI: FSSAI');
  });

  it('deduplicates when gstNumber and taxId are identical under INDIA_GST', () => {
    const html = buildReceiptHtml({
      ...base,
      branch: {
        ...base.branch,
        taxRegime: 'INDIA_GST',
        gstNumber: '27AABCH1234F1Z5',
        taxId: '27AABCH1234F1Z5',
      },
    });
    expect(html).toContain('GSTIN: 27AABCH1234F1Z5');
    // Ensure it is only shown once
    const matches = html.match(/27AABCH1234F1Z5/g);
    expect(matches).toHaveLength(1);
  });
});
