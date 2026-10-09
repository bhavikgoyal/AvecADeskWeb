import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import logoSrc from '../assets/avec-global-logo-full.png';

const COMPANY_ADDRESS = 'Unit 3, 380 Clayton Road, Clayton, Victoria 3168';
const COMPANY_NAME = 'AVEC GLOBAL GROUP PTY LTD';
const ABN_NUMBER = '79677235979';
const AMOUNT_COL_WIDTH = 56;
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
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
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
  let words = `${integerToWords(dollars)}`;
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

async function drawLetterhead(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const top = 8;
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

function instituteAddressLines(invoice, lineItems = []) {
  const source = (lineItems || []).find((item) => {
    const street = safeText(item.address || item.Address);
    const zip = safeText(item.zipCode || item.ZipCode);
    return (street && street !== '—') || (zip && zip !== '—');
  }) || {};

  const street = safeText(
    invoice.address || invoice.Address || source.address || source.Address
  ).replace(/,\s*$/, '');
  const zip = safeText(
    invoice.zipCode || invoice.ZipCode || source.zipCode || source.ZipCode
  );

  const lines = [];
  if (street && street !== '—') lines.push(zip && zip !== '—' ? `${street},` : street);
  if (zip && zip !== '—') lines.push(zip);
  return lines;
}

function drawInfoBox(doc, invoice, startY, lineItems = []) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = pageWidth - MARGIN_X * 2;
  const colSplit = MARGIN_X + boxWidth - AMOUNT_COL_WIDTH;
  const leftWidth = colSplit - MARGIN_X - 6;
  const lineHeight = 4.5;
  const invoiceValueWidth = AMOUNT_COL_WIDTH - 6 - 24; 

  const instituteName = safeText(invoice.instituteNameRef || invoice.instituteName);
  const addressParts = instituteAddressLines(invoice, lineItems);

  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  const nameLines = doc.splitTextToSize(instituteName, leftWidth);
  doc.setFont('times', 'normal');
  const addressLines = addressParts.flatMap((line) => doc.splitTextToSize(line, leftWidth));
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
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('To,', MARGIN_X + 3, ty);
  ty += lineHeight;

  doc.setFont('times', 'bold');
  nameLines.forEach((line) => {
    doc.text(line, MARGIN_X + 3, ty);
    ty += lineHeight;
  });
  doc.setFont('times', 'normal');
  addressLines.forEach((line) => {
    doc.text(line, MARGIN_X + 3, ty);
    ty += lineHeight;
  });


  const rightEdgeX = MARGIN_X + boxWidth - 3; 
  const gap = 2;                              

  doc.setFont('times', 'bold');
  const labelWidth = doc.getTextWidth('Invoice No:');

  doc.setFont('times', 'normal');
  const dateText = formatDate(invoice.createdAtRaw || invoice.createdAt);
  const maxValueWidth = Math.max(
    doc.getTextWidth(dateText),
    ...invoiceLines.map((l) => doc.getTextWidth(l))
  );

  const blockWidth = labelWidth + gap + maxValueWidth;
  const labelX = rightEdgeX - blockWidth;
  const valueX = labelX + labelWidth + gap;

  doc.setFont(undefined, 'bold');
  doc.text('Date:', labelX, startY + 7);

  doc.setFont(undefined, 'normal');
  doc.text(dateText, valueX, startY + 7);

  doc.setFont(undefined, 'bold');
  doc.text('Invoice No:', labelX, startY + 12);

  doc.setFont(undefined, 'normal');
  let invoiceY = startY + 12;
  invoiceLines.forEach((line) => {
    doc.text(line, valueX, invoiceY);
    invoiceY += lineHeight;
  });

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
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Sr. No', MARGIN_X + colSr / 2, y + 5.5, { align: 'center' });
  doc.text('PARTICULARS', xPart + colPart / 2, y + 5.5, { align: 'center' });
  doc.text('AMOUNT (AUD$)', xAmount + colAmount / 2, y + 5.5, { align: 'center' });

  return y + headerHeight;
}

function drawEducationCommissionHeader(doc, y, geo) {
  const { tableWidth, xPart, xAmount, colPart } = geo;
  const rowHeight = 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, tableWidth, rowHeight);
  doc.line(xPart, y, xPart, y + rowHeight);
  doc.line(xAmount, y, xAmount, y + rowHeight);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Education Commission', xPart + 3, y + 5.5);

  return y + rowHeight;
}


function buildItemLines(doc, item, colPart) {
  const parsed = parseDescription(item.description);
  const cricos = safeText(item.cricosCode);

  const courseText = cricos
    ? `${safeText(parsed.course)} (${cricos})`
    : safeText(parsed.course);

  const feesAmount = Number(
    item.feesAmount ?? item.FeesAmount ?? 0
  );

  const commissionPercentage = Number(
    item.commissionPercentage ??
    item.CommissionPercentage ??
    0
  );

  const amountVal = Number(
    ((feesAmount * commissionPercentage) / 100).toFixed(2)
  );

  const enrollmentNo = safeText(
    item.enrollmentNo ?? item.EnrollmentNo
  );

  const lines = [
    'Education Commission',
    '',
    `Student Name: ${safeText(item.studentName)}`,
  ];

  if (enrollmentNo) {
    lines.push(`Student Id: ${enrollmentNo}`);
  }

  lines.push(`Course Details: ${courseText}`);
  lines.push(
    `Fees: $ ${formatMoney(feesAmount)} * ${commissionPercentage}/100`
  );

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  const wrapped = lines.flatMap((line) =>
    line === '' ? [''] : doc.splitTextToSize(line, colPart - 6)
  );

  const lineHeight = 5.4;
  const padding = 12;
  const rowHeight = Math.max(
    wrapped.length * lineHeight + padding,
    34
  );

  return {
    wrapped,
    amountVal,
    rowHeight,
    lineHeight,
  };
}


function drawItemRow(doc, y, geo, srNo, itemLines) {
  const { tableWidth, colSr, colAmount, xPart, xAmount } = geo;
  const { wrapped, amountVal, rowHeight, lineHeight } = itemLines;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_X, y, tableWidth, rowHeight);
  doc.line(xPart, y, xPart, y + rowHeight);
  doc.line(xAmount, y, xAmount, y + rowHeight);

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(`${srNo}.`, MARGIN_X + colSr / 2, y + rowHeight / 2, { align: 'center' });

  let ty = y + 8;
  wrapped.forEach((line) => {
    doc.text(line, xPart + 3, ty);
    ty += lineHeight;
  });

  doc.text(formatMoney(amountVal), xAmount + colAmount - 3, y + rowHeight / 2, { align: 'right' });

  return y + rowHeight;
}


function drawTotals(doc, invoice, geo, startY, lineItems = []) {
  const { xAmount, colAmount, tableWidth } = geo;
  const rowHeight = 7;
  let y = startY;

  const total = Number(
    lineItems.reduce((sum, item) => {
      const fees = Number(
        item.feesAmount ?? item.FeesAmount ?? 0
      );

      const percentage = Number(
        item.commissionPercentage ??
        item.CommissionPercentage ??
        0
      );

      return sum + (fees * percentage) / 100;
    }, 0).toFixed(2)
  );

  const bonus = Number(
    lineItems.reduce(
      (sum, item) =>
        sum +
        Number(
          item.bonusAmountRaw ??
          item.bonusAmount ??
          item.BonusAmount ??
          0
        ),
      0
    ).toFixed(2)
  );

  const gstAmount = Number(
    lineItems.reduce(
      (sum, item) =>
        sum +
        Number(item.gstAmount ?? item.GSTAmount ?? 0),
      0
    ).toFixed(2)
  );

  const grandTotal = Number(
    (total + bonus + gstAmount).toFixed(2)
  );

  const drawRow = (label, value) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    doc.rect(MARGIN_X, y, tableWidth, rowHeight);
    doc.line(xAmount, y, xAmount, y + rowHeight);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);

    doc.text(label, xAmount - 3, y + 5, {
      align: 'right',
    });

    doc.text(
      `AUD ${formatMoney(value)}`,
      xAmount + colAmount - 3,
      y + 5,
      { align: 'right' }
    );

    y += rowHeight;
  };

  drawRow('TOTAL', total);

  if (bonus > 0) {
    drawRow('BONUS', bonus);
  }

  drawRow('GST', gstAmount);
  drawRow('GRAND TOTAL', grandTotal);

  doc.rect(MARGIN_X, y, tableWidth, rowHeight);

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('In Words:', MARGIN_X + 3, y + 5);

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(
    numberToWordsAUD(grandTotal),
    MARGIN_X + 25,
    y + 5
  );

  y += rowHeight;

  return y + 16;
}


function drawBankDetails(doc, startY) {
  let y = startY;

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', MARGIN_X, y);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y + 1.2, MARGIN_X + doc.getTextWidth('Bank Details'), y + 1.2);
  y += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  const lines = [
    'Account Name: AVEC GLOBAL GROUP PTY LTD',
    'BSB: 063-549',
    'Account Number: 1081 0692',
  ];
  lines.forEach((line) => {
    doc.text(line, MARGIN_X, y);
    y += 5.2;
  });

  return y;
}

function pageContentBottom(doc) {
  return doc.internal.pageSize.getHeight() - PAGE_BOTTOM_SAFE - FOOTER_RESERVE;
}

async function drawInvoiceSection(doc, invoice, lineItems, options = {}) {
  const {
    startSrNo = 1,
    pageNumberStart = 1,
    totalPagesHint = null,
  } = options;

  const geo = getTableGeometry(doc);
  const rows = lineItems.length ? lineItems : [{}];
  let srNo = startSrNo;
  let pageNumber = pageNumberStart;

  let y = await drawLetterhead(doc);
  y = drawInfoBox(doc, invoice, y, lineItems);
  y = drawTableHeader(doc, y, geo);

  for (let idx = 0; idx < rows.length; idx += 1) {
    const itemLines = buildItemLines(doc, rows[idx], geo.colPart);
    const needed = itemLines.rowHeight + 2;

    if (y + needed > pageContentBottom(doc) - 40) {
      drawAddressFooter(doc);
      drawPageNumber(doc, pageNumber, totalPagesHint);
      doc.addPage();
      pageNumber += 1;
      y = await drawLetterhead(doc);
      y = drawInfoBox(doc, invoice, y, lineItems);
      y = drawTableHeader(doc, y, geo);
     
    }

    y = drawItemRow(doc, y, geo, srNo, itemLines);
    srNo += 1;
  }

  const hasBonus = lineItems.some(
    item =>
      Number(
        item.bonusAmountRaw ??
        item.bonusAmount ??
        item.BonusAmount ??
        0
      ) > 0
  );

  const totalsBlock = (hasBonus ? 4 : 3) * 7 + 7 + 16 + 26;
  if (y + totalsBlock > pageContentBottom(doc)) {
    drawAddressFooter(doc);
    drawPageNumber(doc, pageNumber, totalPagesHint);
    doc.addPage();
    pageNumber += 1;
    y = await drawLetterhead(doc);
    y = drawInfoBox(doc, invoice, y, lineItems);
  }

  y = drawTotals(doc, invoice, geo, y, lineItems);
  drawBankDetails(doc, y);
  drawAddressFooter(doc);
  drawPageNumber(doc, pageNumber, totalPagesHint);

  return { nextSrNo: srNo, lastPageNumber: pageNumber };
}

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

export async function exportInvoicesPdf(items = []) {
  if (!items.length) return;

  const files = [];
  for (let i = 0; i < items.length; i += 1) {
    const { invoice, lineItems = [] } = items[i] || {};
    
    files.push(await buildInvoicePdf(invoice, lineItems));
  }

  for (let i = 0; i < files.length; i += 1) {
    triggerPdfDownload(files[i].blob, files[i].fileName);
    if (i < files.length - 1) {
      await delay(1500);
    }
  }
}
