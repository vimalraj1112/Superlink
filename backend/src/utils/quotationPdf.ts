import PDFDocument from 'pdfkit';

interface PdfQuotationItem {
  description: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
}

interface PdfQuotation {
  quotationNumber: string;
  title: string;
  status: string;
  validityDate: Date | string;
  description?: string | null;
  terms?: string | null;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  createdAt: Date | string;
  customer?: {
    companyName: string;
    customerCode: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber?: string | null;
  } | null;
  site?: {
    siteCode: string;
    installationAddress?: string | null;
    installationCity?: string | null;
    isp?: {
      displayName?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
  createdBy?: { firstName: string; lastName: string } | null;
  items: PdfQuotationItem[];
}

// Standard 14 PDF fonts don't include the ₹ glyph (U+20B9), so use "Rs." for reliable rendering.
const fmt = (value: string | number): string =>
  'Rs. ' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const BRAND = '#1e40af';   // deep indigo
const GRAY = '#6b7280';
const DARK = '#111827';
const LIGHT = '#f3f4f6';
const BORDER = '#e5e7eb';

const fmtDate = (d: Date | string): string =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function buildQuotationPdf(quotation: PdfQuotation): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right; // ~499
    const L = doc.page.margins.left;
    let y = 48;

    // ---------- Header ----------
    doc.fontSize(22).fillColor(BRAND).text('SuperLink', L, y, { continued: false });
    doc.fontSize(10).fillColor(GRAY)
      .text('ISP Solutions & Services', L, doc.y + 2);
    doc.fontSize(26).fillColor(DARK)
      .text('QUOTATION', L + W, y + 2, { width: W - 0, align: 'right' });
    y = doc.y + 6;
    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(1.5).strokeColor(BRAND).stroke();
    y += 14;

    // ---------- Meta row: Bill To (left) / Quotation info (right) ----------
    const customer = quotation.customer;
    doc.fontSize(9).fillColor(GRAY).text('BILL TO', L, y);
    doc.fontSize(11).fillColor(DARK).text(customer?.companyName || '—', L, doc.y + 2);
    doc.fontSize(9).fillColor(DARK);
    if (customer) {
      doc.text(`${customer.address}`, L, doc.y + 1);
      doc.text(`${customer.city}, ${customer.state} - ${customer.pincode}`, L, doc.y + 1);
      doc.text(`Contact: ${customer.contactPerson}  |  ${customer.phone}`, L, doc.y + 1);
      if (customer.email) doc.text(`Email: ${customer.email}`, L, doc.y + 1);
      if (customer.gstNumber) doc.text(`GSTIN: ${customer.gstNumber}`, L, doc.y + 1);
    }
    doc.y += 2;

    const metaX = L + W - 170;
    doc.fontSize(9).fillColor(GRAY).text('QUOTATION DETAILS', metaX, 48);
    const metaLeft = metaX + 78;
    const metaTop = 48 + 12;
    doc.fontSize(9).fillColor(GRAY).text('No:', metaX, metaTop);
    doc.fillColor(DARK).text(quotation.quotationNumber, metaLeft, metaTop);
    doc.fillColor(GRAY).text('Date:', metaX, doc.y + 2);
    doc.fillColor(DARK).text(fmtDate(quotation.createdAt), metaLeft, doc.y - 10);
    doc.fillColor(GRAY).text('Valid Until:', metaX, doc.y + 2);
    doc.fillColor(DARK).text(fmtDate(quotation.validityDate), metaLeft, doc.y - 10);
    doc.fillColor(GRAY).text('Status:', metaX, doc.y + 2);
    doc.fillColor(BRAND).text((quotation.status || 'DRAFT').toUpperCase(), metaLeft, doc.y - 10);

    y = Math.max(doc.y + 6, 130);

    // ---------- Site / ISP block ----------
    const site = quotation.site;
    if (site) {
      doc.fontSize(9).fillColor(GRAY).text('SERVICE LOCATION', L, y);
      doc.fontSize(10).fillColor(DARK)
        .text(`${site.siteCode}${site.installationCity ? ` - ${site.installationCity}` : ''}`, L, doc.y + 2);
      if (site.installationAddress) {
        doc.fontSize(9).fillColor(GRAY).text(site.installationAddress, L, doc.y + 1);
      }
      const isp = site.isp;
      if (isp?.displayName) {
        doc.fontSize(9).fillColor(GRAY).text(`ISP: ${isp.displayName}`, L, doc.y + 1);
      }
      y = doc.y + 10;
    }

    // ---------- Title / Description ----------
    doc.fontSize(14).fillColor(DARK).text(quotation.title, L, y);
    y = doc.y + 4;
    if (quotation.description) {
      doc.fontSize(9).fillColor(GRAY).text(quotation.description, L, y, { width: W, align: 'left' });
      y = doc.y + 8;
    } else {
      y += 8;
    }

    // ---------- Items table ----------
    const col = {
      num: 26,
      desc: 250,
      qty: 42,
      unit: 85,
      total: W - 26 - 250 - 42 - 85, // ~96
    };
    const headerTop = y;
    doc.rect(L, headerTop, W, 20).fill(BRAND);
    doc.fillColor('#ffffff').fontSize(9);
    doc.text('#', L + 6, headerTop + 6);
    doc.text('Description', L + col.num + 6, headerTop + 6);
    doc.text('Qty', L + col.num + col.desc + 6, headerTop + 6);
    doc.text('Unit Price', L + col.num + col.desc + col.qty + 4, headerTop + 6, { width: col.unit - 8, align: 'right' });
    doc.text('Total', L + col.num + col.desc + col.qty + col.unit + 2, headerTop + 6, { width: col.total - 6, align: 'right' });

    y = headerTop + 20;
    const rowH = 22;
    quotation.items.forEach((item, i) => {
      if (i % 2 === 1) {
        doc.rect(L, y, W, rowH).fill(LIGHT);
      }
      doc.fillColor(DARK).fontSize(9);
      doc.text(String(i + 1), L + 6, y + 6);
      doc.text(item.description, L + col.num + 6, y + 6, { width: col.desc - 12 });
      doc.text(String(item.quantity), L + col.num + col.desc + 6, y + 6, { width: col.qty - 6, align: 'right' });
      doc.text(fmt(item.unitPrice), L + col.num + col.desc + col.qty + 4, y + 6, { width: col.unit - 8, align: 'right' });
      doc.text(fmt(item.totalPrice), L + col.num + col.desc + col.qty + col.unit + 2, y + 6, { width: col.total - 6, align: 'right' });
      y += rowH;
    });

    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(BORDER).stroke();

    // ---------- Totals ----------
    y += 10;
    const totalX = L + W - 170;
    doc.fontSize(9);
    doc.fillColor(GRAY).text('Subtotal', totalX, y);
    doc.fillColor(DARK).text(fmt(quotation.subtotal), totalX + 75, y, { width: 95, align: 'right' });
    doc.fillColor(GRAY).text('Tax (18%)', totalX, y + 16);
    doc.fillColor(DARK).text(fmt(quotation.taxAmount), totalX + 75, y + 16, { width: 95, align: 'right' });
    y += 38;
    doc.moveTo(totalX - 10, y).lineTo(totalX + 170, y).lineWidth(0.75).strokeColor(DARK).stroke();
    doc.fontSize(11).fillColor(BRAND).text('GRAND TOTAL', totalX, y + 8);
    doc.fontSize(12).text(fmt(quotation.totalAmount), totalX + 75, y + 8, { width: 95, align: 'right' });
    y += 34;

    // ---------- Terms ----------
    if (quotation.terms) {
      y += 6;
      doc.fontSize(9).fillColor(GRAY).text('TERMS & CONDITIONS', L, y);
      doc.fillColor(DARK).text(quotation.terms, L, doc.y + 2, { width: W, align: 'left' });
    }

    // ---------- Footer ----------
    doc.fontSize(8).fillColor(GRAY).text(
      `This is a computer generated quotation from SuperLink. Prepared by ${quotation.createdBy?.firstName || ''} ${quotation.createdBy?.lastName || ''}.`,
      L, doc.page.height - 60, { width: W, align: 'center' }
    );

    doc.end();
  });
}
