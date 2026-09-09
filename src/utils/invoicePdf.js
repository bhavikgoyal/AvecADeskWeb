import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import logoSrc from '../assets/avec-global-logo-full.png';

const COMPANY_ADDRESS = 'Unit 3, 380 Clayton Road, Clayton, Victoria 3168';
const COMPANY_NAME = 'AVEC GLOBAL GROUP PTY LTD';
const ABN_NUMBER = '79677235979';
const AMOUNT_COL_WIDTH = 46;
const MARGIN_X = 14;
const FOOTER_RESERVE = 12;
const PAGE_BOTTOM_SAFE = 12;

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
  if (n > 0) str += `${ONES[n]} `;
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
    if (chunk) parts.unshift(`${threeDigitsToWords(chunk)} ${units[unitIndex]}`.trim());
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
  if (cents > 0) words += ` and ${integerToWords(cents)} Cents`;
  return `${words} Only`;
}

function loadImageAsset(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let cachedLogoPromise = null;
function loadLogoAsset() {
  if (cachedLogoPromise) return cachedLogoPromise;
  cachedLogoPromise = loadImageAsset(logoSrc);
  return cachedLogoPromise;
}

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

/** Full AVEC GLOBAL logo (icon + name + taglines) centered; ABN below */
async function drawLetterhead(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const top = 8;
  // Full lockup is wider than icon-only logo
  const logoWidth = 58;

  const logo = await loadLogoAsset();
  let y = top;

  if (logo) {
    const logoHeight = logoWidth * (logo.height / logo.width);
    doc.addImage(logo.dataUrl, 'PNG', centerX - logoWidth / 2, y, logoWidth, logoHeight);
    y += logoHeight + 3;
  } else {
    drawFallbackLogo(doc, centerX - 10, y, 20);
    y += 24;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 86, 168);
    doc.text('AVEC GLOBAL', centerX, y, { align: 'center' });
    y += 5;
  }

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(30, 100, 200);
  doc.text(`ABN Number: ${ABN_NUMBER}`, centerX, y, { align: 'center' });
  y += 8.5;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('TAX INVOICE', centerX, y, { align: 'center' });

  return y + 4;
}

function drawPageNumber(doc, pageNumber, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Page ${pageNumber}${totalPages ? ` of ${totalPages}` : ''}`, pageWidth / 2, pageHeight - 6, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0);
}

/** Company name and address stay at opposite sides of the page footer. */
function drawAddressFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineY = pageHeight - 11;
  const textY = pageHeight - 6;

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, lineY, pageWidth - MARGIN_X, lineY);

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(COMPANY_NAME, MARGIN_X, textY);
  doc.text(COMPANY_ADDRESS, pageWidth - MARGIN_X, textY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function drawInfoBox(doc, invoice, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - MARGIN_X * 2;
  const colSplit = MARGIN_X + boxWidth - AMOUNT_COL_WIDTH;
  const leftWidth = colSplit - MARGIN_X - 6;
  const lineHeight = 4.5;
  const invoiceValueX = colSplit + 26;
  const invoiceValueWidth = MARGIN_X + boxWidth - 3 - invoiceValueX;

  const instituteName = safeText(invoice.instituteNameRef || invoice.instituteName);
  const instituteAddress = safeText(invoice.instituteAddress);

  doc.setFontSize(9.5);
  const nameLines = doc.splitTextToSize(instituteName, leftWidth);
  const addressLines = instituteAddress ? doc.splitTextToSize(instituteAddress, leftWidth) : [];
  const invoiceLines = doc.splitTextToSize(safeText(invoice.invoiceNumber), invoiceValueWidth);

  const contentLineCount = 1 + nameLines.length + addressLines.length;
  const leftHeight = 4 + contentLineCount * lineHeight;
  const rightHeight = 18 + (invoiceLines.length - 1) * lineHeight;
  const boxHeight = Math.max(20, leftHeight, rightHeight);

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.setFillColor(222, 235, 248);
  doc.rect(MARGIN_X, startY, boxWidth, boxHeight, 'FD');
  doc.line(colSplit, startY, colSplit, startY + boxHeight);

  let ty = startY + 5.5;
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('To,', MARGIN_X + 3, ty);
  ty += lineHeight;

  doc.setFont(undefined, 'normal');
  nameLines.forEach((line) => {
    doc.text(line, MARGIN_X + 3, ty);
    ty += lineHeight;
  });
  addressLines.forEach((line) => {
    doc.text(line, MARGIN_X + 3, ty);
    ty += lineHeight;
  });

  doc.setFont(undefined, 'bold');
  doc.text('Date:', colSplit + 3, startY + 7);
  doc.setFont(undefined, 'normal');
  doc.text(formatDate(invoice.createdAtRaw || invoice.createdAt), colSplit + 22, startY + 7);

  doc.setFont(undefined, 'bold');
  doc.text('Invoice No:', colSplit + 3, startY + 14);
  doc.setFont(undefined, 'normal');
  let invoiceY = startY + 14;
  invoiceLines.forEach((line) => {
    doc.text(line, invoiceValueX, invoiceY);
    invoiceY += lineHeight;
  });

  // Tight gap between To box and particulars table
  return startY + boxHeight + 3;
}

function getTableGeometry(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - MARGIN_X * 2;
  const colSr = 16;
  const colAmount = AMOUNT_COL_WIDTH;
  const colPart = tableWidth - colSr - colAmount;
  return {
    tableWidth,
    colSr,
    colAmount,
    colPart,
    xSr: MARGIN_X,
    xPart: MARGIN_X + colSr,
    xAmount: MARGIN_X + colSr + colPart,
  };
}

function drawTableHeader(doc, y, geo) {
  const { tableWidth, colSr, colPart, colAmount, xPart, xAmount } = geo;
  const headerHeight = 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, tableWidth, headerHeight);
  doc.line(xPart, y, xPart, y + headerHeight);
  doc.line(xAmount, y, xAmount, y + headerHeight);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Sr. No', MARGIN_X + colSr / 2, y + 5.5, { align: 'center' });
  doc.text('PARTICULARS', xPart + colPart / 2, y + 5.5, { align: 'center' });
  doc.text('AMOUNT (AUD$)', xAmount + colAmount / 2, y + 5.5, { align: 'center' });

  return y + headerHeight;
}

/** One-time section title — not repeated per student row */
function drawEducationCommissionHeader(doc, y, geo) {
  const { tableWidth, xPart, xAmount, colPart } = geo;
  const rowHeight = 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, tableWidth, rowHeight);
  doc.line(xPart, y, xPart, y + rowHeight);
  doc.line(xAmount, y, xAmount, y + rowHeight);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.text('Education Commission', xPart + 3, y + 5.5);

  return y + rowHeight;
}

function buildItemLines(doc, item, colPart) {
  const parsed = parseDescription(item.description);
  const cricos = safeText(item.cricosCode);
  const courseText = cricos
    ? `${safeText(parsed.course)} (CRICOS: ${cricos})`
    : safeText(parsed.course);

  const lines = [];
  lines.push(`Student Name: ${safeText(item.studentName)}`);
  if (item.studentId) lines.push(`Student Id: ${safeText(item.studentId)}`);
  lines.push(`Course: ${courseText}`);

  const amountVal = Number(item.amountRaw ?? item.amount ?? 0);
  const feesRaw = Number(String(parsed.fees).replace(/[^0-9.-]/g, ''));
  const feesText = safeText(parsed.fees) || formatMoney(amountVal);
  let feesLine = `Fees: ${feesText}`;
  if (feesRaw > 0 && amountVal > 0) {
    const pct = (amountVal / feesRaw) * 100;
    feesLine += ` (Commission Rate: ${pct.toFixed(2)}%)`;
  }
  lines.push(feesLine);

  const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, colPart - 6));
  const lineHeight = 4.3;
  const padding = 5;
  const rowHeight = Math.max(wrapped.length * lineHeight + padding, 18);

  return { wrapped, amountVal, rowHeight, lineHeight };
}

function drawItemRow(doc, y, geo, srNo, itemLines) {
  const { tableWidth, colSr, colAmount, xPart, xAmount } = geo;
  const { wrapped, amountVal, rowHeight, lineHeight } = itemLines;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, tableWidth, rowHeight);
  doc.line(xPart, y, xPart, y + rowHeight);
  doc.line(xAmount, y, xAmount, y + rowHeight);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9.5);
  doc.text(String(srNo), MARGIN_X + colSr / 2, y + 7, { align: 'center' });

  let ty = y + 6;
  wrapped.forEach((line) => {
    doc.text(line, xPart + 3, ty);
    ty += lineHeight;
  });

  doc.text(formatMoney(amountVal), xAmount + colAmount - 3, y + 7, { align: 'right' });

  return y + rowHeight;
}

function drawTotals(doc, invoice, geo, startY) {
  const { xPart, xAmount, colAmount, tableWidth } = geo;
  const rowHeight = 7;
  let y = startY;

  const total = Number(invoice.totalAmountRaw ?? invoice.totalAmount ?? 0);
  const gstPercent = invoice.gstPercent != null ? Number(invoice.gstPercent) : 0;
  const gstAmount = (total * gstPercent) / 100;

  const drawRow = (label, value) => {
    doc.setDrawColor(0);
    doc.rect(MARGIN_X, y, tableWidth, rowHeight);
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
  drawRow('GRAND TOTAL', total + gstAmount);

  doc.rect(MARGIN_X, y, tableWidth, rowHeight);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9.5);
  doc.text('In Words:', MARGIN_X + 3, y + 5);
  doc.setFont(undefined, 'normal');
  doc.text(numberToWordsAUD(total + gstAmount), MARGIN_X + 25, y + 5);
  y += rowHeight;

  return y + 4;
}

/** Tighter spacing; address removed (moved under bank block) */
function drawBankDetails(doc, startY) {
  let y = startY;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', MARGIN_X, y);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y + 1, MARGIN_X + 24, y + 1);
  y += 4.5;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const lines = [
    'Account Name: AVEC GLOBAL GROUP PTY LTD',
    'BSB: 063-549',
    'Account Number: 1081 0692',
  ];
  lines.forEach((line) => {
    doc.text(line, MARGIN_X, y);
    y += 3.6;
  });

  return y;
}

function pageContentBottom(doc) {
  return doc.internal.pageSize.getHeight() - PAGE_BOTTOM_SAFE - FOOTER_RESERVE;
}

/**
 * Draw one invoice, continuing Sr. No. across pages/invoices.
 * Education Commission header only once (first page of this invoice section).
 */
async function drawInvoiceSection(doc, invoice, lineItems, options = {}) {
  const {
    startSrNo = 1,
    showEducationHeader = true,
    pageNumberStart = 1,
    totalPagesHint = null,
  } = options;

  const geo = getTableGeometry(doc);
  const rows = lineItems.length ? lineItems : [{}];
  let srNo = startSrNo;
  let pageNumber = pageNumberStart;
  let educationHeaderDrawn = false;

  let y = await drawLetterhead(doc);
  y = drawInfoBox(doc, invoice, y);
  y = drawTableHeader(doc, y, geo);

  if (showEducationHeader) {
    y = drawEducationCommissionHeader(doc, y, geo);
    educationHeaderDrawn = true;
  }

  for (let idx = 0; idx < rows.length; idx += 1) {
    const itemLines = buildItemLines(doc, rows[idx], geo.colPart);
    const needed = itemLines.rowHeight + 2;

    if (y + needed > pageContentBottom(doc) - 40) {
      drawAddressFooter(doc);
      drawPageNumber(doc, pageNumber, totalPagesHint);
      doc.addPage();
      pageNumber += 1;
      y = await drawLetterhead(doc);
      y = drawInfoBox(doc, invoice, y);
      y = drawTableHeader(doc, y, geo);
      // Education Commission does NOT repeat on continuation pages
    }

    y = drawItemRow(doc, y, geo, srNo, itemLines);
    srNo += 1;
  }

  const totalsBlock = 7 * 3 + 7 + 6 + 18;
  if (y + totalsBlock > pageContentBottom(doc)) {
    drawAddressFooter(doc);
    drawPageNumber(doc, pageNumber, totalPagesHint);
    doc.addPage();
    pageNumber += 1;
    y = await drawLetterhead(doc);
    y = drawInfoBox(doc, invoice, y);
  }

  y = drawTotals(doc, invoice, geo, y);
  drawBankDetails(doc, y);
  drawAddressFooter(doc);
  drawPageNumber(doc, pageNumber, totalPagesHint);

  return { nextSrNo: srNo, lastPageNumber: pageNumber, educationHeaderDrawn };
}

/** Build one invoice PDF blob (does not download). */
export async function buildInvoicePdf(invoice, lineItems = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await drawInvoiceSection(doc, invoice, lineItems, {
    startSrNo: 1,
    showEducationHeader: true,
  });
  const fileName = `${safeText(invoice.invoiceNumber) || `invoice-${invoice.invoiceId || 'document'}`}.pdf`;
  return { blob: doc.output('blob'), fileName };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function triggerPdfDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function exportInvoicePdf(invoice, lineItems = []) {
  const { blob, fileName } = await buildInvoicePdf(invoice, lineItems);
  saveAs(blob, fileName);
}

/**
 * Never merges invoices into one PDF — each invoice downloads as its own .pdf file.
 */
export async function exportInvoicesPdf(items = []) {
  if (!items.length) return;

  const files = [];
  for (let i = 0; i < items.length; i += 1) {
    const { invoice, lineItems = [] } = items[i] || {};
    // eslint-disable-next-line no-await-in-loop
    files.push(await buildInvoicePdf(invoice, lineItems));
  }

  for (let i = 0; i < files.length; i += 1) {
    triggerPdfDownload(files[i].blob, files[i].fileName);
    if (i < files.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await delay(1500);
    }
  }
}
