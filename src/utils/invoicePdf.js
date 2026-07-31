import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function drawInvoicePage(doc, invoice, lineItems) {
  const marginX = 14;
  let y = 16;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('TAX INVOICE', marginX, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const details = [
    ['Invoice No:', invoice.invoiceNumber || '—'],
    ['Institute:', invoice.instituteNameRef || invoice.instituteName || '—'],
    ['Status:', invoice.invoiceStatus || invoice.status || '—'],
    ['Created At:', formatDate(invoice.createdAtRaw || invoice.createdAt)],
    ['Total Amount (AUD):', invoice.totalAmount || '—'],
  ];
  details.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, marginX, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), marginX + 45, y);
    y += 7;
  });

  y += 4;
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('Line Items', marginX, y);
  y += 4;

  const rows = lineItems.length
    ? lineItems.map((item, idx) => [
        idx + 1,
        item.studentName || '—',
        item.description || '—',
        item.amount || '—',
      ])
    : [['—', 'No line items', '', '']];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Student', 'Description', 'Amount (AUD)']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [25, 118, 210] },
    margin: { left: marginX, right: marginX },
  });

  let finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text('Bank Details', marginX, finalY);
  finalY += 7;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const bank = [
    'Account Name: AVEC GLOBAL GROUP PTY LTD',
    'BSB: 063-549',
    'Account Number: 1081 0692',
    'Address: Unit 3, 380 Clayton Road, Clayton, Vic: 3168',
  ];
  bank.forEach((line) => {
    doc.text(line, marginX, finalY);
    finalY += 6;
  });
}

export function exportInvoicePdf(invoice, lineItems = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawInvoicePage(doc, invoice, lineItems);
  const fileName = `${invoice.invoiceNumber || `invoice-${invoice.invoiceId}`}.pdf`;
  doc.save(fileName);
}

export function exportInvoicesPdf(items = []) {
  // items: [{ invoice, lineItems }, ...] — one PDF, multiple pages
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  items.forEach(({ invoice, lineItems }, idx) => {
    if (idx > 0) doc.addPage();
    drawInvoicePage(doc, invoice, lineItems);
  });
  const fileName = items.length === 1
    ? `${items[0].invoice.invoiceNumber || 'invoice'}.pdf`
    : `invoices-${items.length}.pdf`;
  doc.save(fileName);
}