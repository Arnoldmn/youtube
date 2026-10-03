'use strict';
const PDFDocument = require('pdfkit');
const brand = require('./brand');

const RED = '#e62e04';
const GREY = '#666666';

/** Streams a PDF receipt for `order` (as returned by orderView) into `out`. */
function writeReceipt(out, order, config) {
  const money = (n) => `${config.currency} ${Number(n).toLocaleString('en-US')}`;
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Receipt ${order.code}`, Author: config.storeName } });
  doc.pipe(out);

  const left = 50;
  const right = doc.page.width - 50;
  const width = right - left;

  // Header band (with the main logo on a white card when public/img/IPHIX Logo.png exists)
  doc.rect(0, 0, doc.page.width, 100).fill(RED);
  const logo = brand.mainLogo();
  let textX = left;
  if (logo) {
    const boxH = 70;
    const boxW = Math.min(170, Math.max(70, Math.round((logo.width / logo.height) * (boxH - 12)) + 12));
    doc.roundedRect(left, 15, boxW, boxH, 8).fill('#ffffff');
    try {
      doc.image(logo.file, left + 6, 21, { fit: [boxW - 12, boxH - 12], align: 'center', valign: 'center' });
      textX = left + boxW + 14;
    } catch {
      textX = left; // unreadable image: fall back to text-only header
    }
  }
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(textX === left ? 22 : 18).text(config.storeName, textX, 30);
  doc.font('Helvetica').fontSize(10)
    .text('Phone accessories • Spare parts • Repair services', textX, 58)
    .text(`WhatsApp: +${config.whatsappNumber}${config.storeAddress ? `  •  ${config.storeAddress}` : ''}`, textX, 72);
  doc.font('Helvetica-Bold').fontSize(16).text('RECEIPT', left, 36, { width, align: 'right' });

  // Order meta
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
  let y = 125;
  const meta = [
    ['Receipt / Order No.', order.code],
    ['Date', new Date(`${order.createdAt.replace(' ', 'T')}Z`).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })],
    ['Status', order.statusLabel],
    ['Payment', order.paymentLabel],
    ['Payment status', `${order.paymentStatusLabel}${order.mpesaReceipt ? ` (M-Pesa ${order.mpesaReceipt})` : ''}`],
    ['Delivery', order.deliveryLabel],
  ];
  const billTo = [
    order.customerName,
    `+${order.phone}`,
    order.email,
    order.deliveryMethod === 'delivery' ? [order.address, order.city].filter(Boolean).join(', ') : 'Pickup at shop',
  ].filter(Boolean);

  doc.text('Billed to', left, y);
  doc.text('Order details', left + width / 2, y);
  y += 16;
  doc.font('Helvetica').fontSize(10);
  let billY = y;
  for (const line of billTo) {
    doc.text(line, left, billY, { width: width / 2 - 10 });
    billY = doc.y + 2;
  }
  const metaX = left + width / 2;
  const valueX = metaX + 105;
  let metaY = y;
  for (const [k, v] of meta) {
    doc.fillColor(GREY).text(k, metaX, metaY, { width: 100 });
    doc.fillColor('#000000').text(String(v), valueX, metaY, { width: right - valueX });
    metaY = doc.y + 2;
  }
  y = Math.max(billY, metaY) + 20;

  // Items table
  const cols = [
    { label: '#', x: left, w: 25, align: 'left' },
    { label: 'Item', x: left + 25, w: width - 25 - 60 - 90 - 90, align: 'left' },
    { label: 'Qty', x: right - 240, w: 60, align: 'center' },
    { label: 'Unit price', x: right - 180, w: 90, align: 'right' },
    { label: 'Amount', x: right - 90, w: 90, align: 'right' },
  ];
  doc.rect(left, y, width, 22).fill('#f3f3f3');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
  cols.forEach((c) => doc.text(c.label, c.x + 4, y + 7, { width: c.w - 8, align: c.align }));
  y += 28;
  doc.font('Helvetica').fontSize(10);
  order.items.forEach((item, i) => {
    const h = Math.max(16, doc.heightOfString(item.name, { width: cols[1].w - 8 }) + 4);
    if (y + h > doc.page.height - 160) {
      doc.addPage();
      y = 50;
    }
    const vals = [String(i + 1), item.name, String(item.qty), money(item.unitPrice), money(item.lineTotal)];
    cols.forEach((c, j) => doc.text(vals[j], c.x + 4, y, { width: c.w - 8, align: c.align }));
    y += h + 6;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#e5e5e5').lineWidth(0.5).stroke();
  });

  // Totals
  y += 6;
  const totals = [['Subtotal', money(order.subtotal)]];
  if (order.discount) totals.push(['Referral discount', `- ${money(order.discount)}`]);
  totals.push(['Delivery', order.deliveryFee ? money(order.deliveryFee) : 'FREE']);
  totals.forEach(([k, v]) => {
    doc.fillColor(GREY).text(k, right - 240, y, { width: 140, align: 'right' });
    doc.fillColor('#000000').text(v, right - 90, y, { width: 86, align: 'right' });
    y += 16;
  });
  doc.rect(right - 250, y, 250, 26).fill(RED);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
    .text('TOTAL', right - 240, y + 8, { width: 140, align: 'right' })
    .text(money(order.total), right - 96, y + 8, { width: 92, align: 'right' });
  y += 46;

  if (order.amountPaid > 0 && order.paymentStatus !== 'paid') {
    doc.fillColor('#000000').font('Helvetica').fontSize(10)
      .text(`Paid: ${money(order.amountPaid)}   Balance due: ${money(order.balance)}`, left, y, { width, align: 'right' });
    y = doc.y + 10;
  }
  if (order.paymentStatus === 'paid') {
    doc.fillColor('#0a7d3b').font('Helvetica-Bold').fontSize(14).text('PAID', left, y - 36, { width: 120 });
  } else if (order.status !== 'cancelled' && config.mpesa.paybill) {
    doc.rect(left, y, width, 46).fill('#eaf7ef');
    doc.fillColor('#0a7d3b').font('Helvetica-Bold').fontSize(11)
      .text(`Pay with M-Pesa: Paybill ${config.mpesa.paybill}${config.mpesa.paybillAccount ? `  •  Account ${config.mpesa.paybillAccount}` : ''}`, left + 12, y + 9, { width: width - 24 });
    doc.font('Helvetica').fontSize(9)
      .text(`${config.mpesa.paybillName ? `${config.mpesa.paybillName}. ` : ''}Amount: ${money(order.balance)}. Send us the M-Pesa confirmation code with order ${order.code}.`, left + 12, y + 26, { width: width - 24 });
    y += 60;
  }

  if (order.notes) {
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Notes', left, y);
    doc.font('Helvetica').text(order.notes, left, y + 14, { width });
    y = doc.y + 14;
  }

  // Footer
  doc.fillColor(GREY).font('Helvetica').fontSize(9)
    .text(`Track your order: ${order.trackUrl}`, left, y, { width, link: order.trackUrl })
    .moveDown(0.3)
    .text(`Questions? Chat with us on WhatsApp: +${config.whatsappNumber} and quote ${order.code}.`, { width })
    .moveDown(0.3)
    .text('Spare parts carry a 3-month warranty against factory defects (excludes physical/liquid damage). Keep this receipt as proof of purchase.', { width });
  doc.fillColor(RED).font('Helvetica-Bold').fontSize(11).text(`Thank you for shopping with ${config.storeName}!`, left, doc.y + 12, { width, align: 'center' });

  doc.end();
}

module.exports = { writeReceipt };
