import { jsPDF } from 'jspdf';
import logoSrc from '../assets/logo-1.png';


function safeText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parses "Education Commission - Name | Course: X | Campus: Y | Installment #n | Fees: F"
function parseDescription(desc = '') {
  const parts = String(desc).split('|').map((p) => p.trim());
  const result = { course: '', campus: '', installment: '', fees: '' };
  parts.forEach((p) => {
    if (/^course:/i.test(p)) result.course = p.replace(/^course:/i, '').trim();
    else if (/^campus:/i.test(p)) result.campus = p.replace(/^campus:/i, '').trim();
    else if (/^installment/i.test(p)) result.installment = p.trim();
    else if (/^fees:/i.test(p)) result.fees = p.replace(/^fees:/i, '').trim();
  });
  return result;
}

// --- simple number-to-words for AUD amounts ---
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n) {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    str += `${ONES[n]} `;
  }
  return str.trim();
}

function integerToWords(num) {
  if (num === 0) return 'Zero';
  const units = ['', 'Thousand', 'Million', 'Billion'];
  let unitIndex = 0;
  let n = Math.floor(num);
  const parts = [];
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      parts.unshift(`${threeDigitsToWords(chunk)} ${units[unitIndex]}`.trim());
    }
    n = Math.floor(n / 1000);
    unitIndex += 1;
  }
  return parts.join(' ').trim();
}

function numberToWordsAUD(num) {
  const amount = Number(num) || 0;
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  let words = `${integerToWords(dollars)} Dollars`;
  if (cents > 0) {
    words += ` and ${integerToWords(cents)} Cents`;
  }
  return `${words} Only`;
}

let cachedLogoPromise = null;
function loadLogoAsset() {
  if (cachedLogoPromise) return cachedLogoPromise;
  cachedLogoPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = logoSrc;
  }).catch(() => null); // if the logo fails to load, fall back to null (drawn placeholder)
  return cachedLogoPromise;
}

// Fallback vector mark, used only if the real logo image can't be loaded
function drawFallbackLogo(doc, x, y, size = 22) {
  const darkBlue = [22, 68, 148];
  const lightBlue = [78, 154, 217];
  doc.setFillColor(...darkBlue);
  doc.triangle(x, y + size, x + size * 0.58, y, x + size * 0.58, y + size, 'F');
  doc.setFillColor(...lightBlue);
  doc.triangle(x + size * 0.58, y, x + size, y + size * 0.72, x + size * 0.58, y + size, 'F');
  doc.setFillColor(255, 255, 255);
  doc.triangle(x + size * 0.58, y + size * 0.32, x + size * 0.8, y + size * 0.55, x + size * 0.58, y + size, 'F');
}

// --- Header / letterhead ---
async function drawLetterhead(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const top = 14;
  const targetWidth = 24;

  // Logo mark (real image if available, otherwise the drawn fallback)
  const logoAsset = await loadLogoAsset();
  let logoHeight = 22;
  if (logoAsset) {
    logoHeight = targetWidth * (logoAsset.height / logoAsset.width);
    doc.addImage(logoAsset.dataUrl, 'PNG', marginX, top, targetWidth, logoHeight);
  } else {
    drawFallbackLogo(doc, marginX, top, 22);
    logoHeight = 22;
  }

  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30, 86, 168);
  doc.text('AVEC GLOBAL', marginX, top + logoHeight + 6);
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'normal');
  doc.text('ABROAD VISA & EDUCATION CONSULTANTS', marginX, top + logoHeight + 11);
  doc.setFontSize(6);
  doc.text('VISIT | STUDY | WORK | MIGRATE', marginX, top + logoHeight + 15);

  // Company details block
  const infoX = marginX + 56;
  doc.setTextColor(30, 100, 200);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('AVEC GLOBAL GROUP PTY LTD', infoX, top + 2);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8.5);
  doc.text('ABN Number: 79677235979', infoX, top + 7);
  doc.text('Unit 3, 380 Clayton Road, Clayton, Victoria', infoX, top + 12);
  doc.text('E-mail: account@avec-global.com', infoX, top + 17);
  doc.text('Phone: +61 432 301 842', infoX, top + 22);

  doc.setTextColor(0, 0, 0);

  // TAX INVOICE heading
  const headingY = top + 44;
  doc.setFontSize(17);
  doc.setFont(undefined, 'bold');
  doc.text('TAX INVOICE', pageWidth / 2, headingY, { align: 'center' });

  return headingY + 10;
}

// --- To / Date / Invoice No box ---
function drawInfoBox(doc, invoice, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const boxWidth = pageWidth - marginX * 2;
  const boxHeight = 24;
  const colSplit = marginX + boxWidth - 62;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.setFillColor(222, 235, 248);
  doc.rect(marginX, startY, boxWidth, boxHeight, 'FD');
  doc.line(colSplit, startY, colSplit, startY + boxHeight);

  doc.setFontSize(9.5);
  doc.setFont(undefined, 'bold');
  doc.text('To,', marginX + 3, startY + 7);
  doc.setFont(undefined, 'normal');
  const toValue = safeText(invoice.instituteNameRef || invoice.instituteName);
  const toLines = doc.splitTextToSize(toValue, colSplit - marginX - 6);
  doc.text(toLines, marginX + 3, startY + 13);

  doc.setFont(undefined, 'bold');
  doc.text('Date:', colSplit + 3, startY + 8);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(invoice.createdAtRaw || invoice.createdAt), colSplit + 22, startY + 8);

  doc.setFont(undefined, 'bold');
  doc.text('Invoice No:', colSplit + 3, startY + 16);
  doc.setFont(undefined, 'normal');
  doc.text(safeText(invoice.invoiceNumber), colSplit + 26, startY + 16);

  return startY + boxHeight + 6;
}

// --- Main particulars table ---
function drawItemsTable(doc, invoice, lineItems, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const tableWidth = pageWidth - marginX * 2;
  const colSr = 16;
  const colAmount = 38;
  const colPart = tableWidth - colSr - colAmount;
  const xSr = marginX;
  const xPart = marginX + colSr;
  const xAmount = marginX + colSr + colPart;

  let y = startY;
  const headerHeight = 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(marginX, y, tableWidth, headerHeight);
  doc.line(xPart, y, xPart, y + headerHeight);
  doc.line(xAmount, y, xAmount, y + headerHeight);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.text('Sr. No', xSr + colSr / 2, y + 5.5, { align: 'center' });
  doc.text('PARTICULARS', xPart + colPart / 2, y + 5.5, { align: 'center' });
  doc.text('AMOUNT (AUD$)', xAmount + colAmount / 2, y + 5.5, { align: 'center' });

  y += headerHeight;

  const rows = lineItems.length ? lineItems : [{}];
  const lineHeight = 4.3;
  const padding = 5;

  rows.forEach((item, idx) => {
    const parsed = parseDescription(item.description);
    const lines = ['Education Commission', ''];
    lines.push(`Student Name: ${safeText(item.studentName)}`);
    if (item.studentId) lines.push(`Student Id: ${safeText(item.studentId)}`);
    lines.push(`Course: ${safeText(parsed.course)}`);
    if (parsed.campus) lines.push(`Campus: ${safeText(parsed.campus)}`);
    lines.push(`Fees: ${safeText(parsed.fees) || formatMoney(item.amountRaw ?? item.amount ?? 0)}`);

    const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, colPart - 6));
    const rowHeight = Math.max(wrapped.length * lineHeight + padding, 20);

    doc.rect(marginX, y, tableWidth, rowHeight);
    doc.line(xPart, y, xPart, y + rowHeight);
    doc.line(xAmount, y, xAmount, y + rowHeight);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9.5);
    doc.text(String(idx + 1), xSr + colSr / 2, y + 8, { align: 'center' });

    let ty = y + 6;
    wrapped.forEach((line, i) => {
      if (i === 0) doc.setFont(undefined, 'bold');
      else doc.setFont(undefined, 'normal');
      doc.text(line, xPart + 3, ty);
      ty += lineHeight;
    });

    const amountVal = Number(item.amountRaw ?? item.amount ?? 0);
    doc.setFont(undefined, 'normal');
    doc.text(formatMoney(amountVal), xAmount + colAmount - 3, y + 8, { align: 'right' });

    y += rowHeight;
  });

  return { y, xSr, xPart, xAmount, colSr, colPart, colAmount, tableWidth };
}

// --- Totals + In Words rows ---
function drawTotals(doc, invoice, table, startY) {
  const marginX = 14;
  const { xPart, xAmount, colAmount, tableWidth } = table;
  const rowHeight = 7;
  let y = startY;

  const total = Number(invoice.totalAmountRaw ?? invoice.totalAmount ?? 0);
  const gstPercent = invoice.gstPercent != null ? Number(invoice.gstPercent) : 0;
  const gstAmount = (total * gstPercent) / 100;

  const drawRow = (label, value) => {
    doc.setDrawColor(0);
    doc.rect(marginX, y, tableWidth, rowHeight);
    doc.line(xPart, y, xPart, y + rowHeight);
    doc.line(xAmount, y, xAmount, y + rowHeight);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    doc.text(label, xAmount - 3, y + 5, { align: 'right' });
    doc.text(`AUD ${formatMoney(value)}`, xAmount + colAmount - 3, y + 5, { align: 'right' });
    y += rowHeight;
  };

  drawRow('TOTAL', total);
  drawRow(`GST ${gstPercent ? `${gstPercent}%` : '%'}`, gstAmount);
  drawRow('TOTAL', total + gstAmount);

  // In Words row
  doc.rect(marginX, y, tableWidth, rowHeight);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.text('In Words:', marginX + 3, y + 5);
  doc.setFont(undefined, 'normal');
  const wordsText = numberToWordsAUD(total + gstAmount);
  doc.text(wordsText, marginX + 25, y + 5);
  y += rowHeight;

  return y + 10;
}

// --- Bank details ---
function drawBankDetails(doc, startY) {
  const marginX = 14;
  let y = startY;

  doc.setFontSize(10.5);
  doc.setFont(undefined, 'bold');
  doc.text('Bank Details', marginX, y);
  doc.line(marginX, y + 1, marginX + 26, y + 1);
  y += 8;

  doc.setFontSize(9.5);
  doc.setFont(undefined, 'normal');
  [
    'Account Name: AVEC GLOBAL GROUP PTY LTD',
    'BSB: 063-549',
    'Account Number: 1081 0692',
    'Address: Unit 3, 380 Clayton Road, Clayton, Vic: 3168',
  ].forEach((line) => {
    doc.text(line, marginX, y);
    y += 6;
  });
}

async function drawInvoicePage(doc, invoice, lineItems = []) {
  doc.setTextColor(0, 0, 0);
  let y = await drawLetterhead(doc);
  y = drawInfoBox(doc, invoice, y);
  const table = drawItemsTable(doc, invoice, lineItems, y);
  y = drawTotals(doc, invoice, table, table.y);
  drawBankDetails(doc, y);
}

export async function exportInvoicePdf(invoice, lineItems = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await drawInvoicePage(doc, invoice, lineItems);
  const fileName = `${safeText(invoice.invoiceNumber) || `invoice-${invoice.invoiceId || 'document'}`}.pdf`;
  doc.save(fileName);
}

export async function exportInvoicesPdf(items = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let idx = 0; idx < items.length; idx += 1) {
    if (idx > 0) doc.addPage();
    // eslint-disable-next-line no-await-in-loop
    await drawInvoicePage(doc, items[idx].invoice, items[idx].lineItems);
  }
  const fileName = items.length === 1
    ? `${safeText(items[0]?.invoice?.invoiceNumber) || 'invoice'}.pdf`
    : `invoices-${items.length}.pdf`;
  doc.save(fileName);
}
