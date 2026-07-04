import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_COLOR = [37, 99, 235]; // blue
const BRAND_COLOR_DARK = [25, 65, 160];
const TEXT_MUTED = [110, 118, 135];
const TEXT_DARK = [30, 34, 44];
const LIGHT_BG = [244, 247, 252];
const BORDER_COLOR = [225, 230, 240];

function formatDate(value) {
  if (!value || value === '—') return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function drawHeader(doc, institute) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top brand banner
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Institute Commission Statement', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('AiDesk • Commission Report', 14, 24);

  const generatedLabel = `Generated: ${formatDate(new Date())}`;
  doc.setFontSize(9);
  const genWidth = doc.getTextWidth(generatedLabel);
  doc.text(generatedLabel, pageWidth - 14 - genWidth, 24);

  // ---- Info card ----
  const cardX = 14;
  const cardWidth = pageWidth - 28;
  const cardPaddingX = 8;
  const contentWidth = cardWidth - cardPaddingX * 2;
  const halfWidth = contentWidth / 2 - 6;

  const labelGap = 5; // gap between label and value
  const rowGap = 4; // gap between rows/fields
  const lineGap = 4.2; // gap between wrapped lines within a value

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const addressLines = doc.splitTextToSize(String(institute.address || '—'), contentWidth);
  const serviceLines = doc.splitTextToSize(String(institute.serviceType || '—'), contentWidth);

  const topRowHeight = labelGap + lineGap; // Institute/Vendor: single line each
  const addressHeight = labelGap + addressLines.length * lineGap;
  const serviceHeight = labelGap + serviceLines.length * lineGap;

  const cardTopPad = 9;
  const cardBottomPad = 7;
  const cardHeight =
    cardTopPad + topRowHeight + rowGap + addressHeight + rowGap + serviceHeight + cardBottomPad;

  const cardY = 42;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  let cursorY = cardY + cardTopPad;
  const leftX = cardX + cardPaddingX;
  const rightX = leftX + halfWidth + 12;

  function drawField(label, value, x, width, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    const lines = doc.splitTextToSize(String(value || '—'), width);
    doc.text(lines, x, y + labelGap);
    return lines.length;
  }

  // Row 1: Institute | Vendor
  drawField('Institute', institute.instituteName, leftX, halfWidth, cursorY);
  drawField('Vendor', institute.vendorName, rightX, halfWidth, cursorY);
  cursorY += topRowHeight + rowGap;

  // Row 2: Address (full width)
  const addrLineCount = drawField('Address', institute.address, leftX, contentWidth, cursorY);
  cursorY += labelGap + addrLineCount * lineGap + rowGap;

  // Row 3: Service type (full width)
  drawField('Service type', institute.serviceType, leftX, contentWidth, cursorY);

  return cardY + cardHeight + 10;
}

function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('AiDesk — Institute Commission Statement', 14, pageHeight - 10);

    const pageLabel = `Page ${i} of ${pageCount}`;
    const labelWidth = doc.getTextWidth(pageLabel);
    doc.text(pageLabel, pageWidth - 14 - labelWidth, pageHeight - 10);
  }
}

export function exportInstituteCommissionPdf(institutes) {
  const doc = new jsPDF();

  institutes.forEach((institute, index) => {
    if (index > 0) doc.addPage();

    const tableStartY = drawHeader(doc, institute);

    const rateRows =
      institute.commissionRates?.length
        ? institute.commissionRates
        : [
            {
              rateType: institute.rateType,
              rate: institute.rate,
              effectiveFrom: institute.effectiveFrom,
              effectiveTo: institute.effectiveTo,
            },
          ];

    const body = rateRows.map((r) => [
      r.rateType || '—',
      r.rate !== undefined && r.rate !== null && r.rate !== '—' ? String(r.rate) : '—',
      formatDate(r.effectiveFrom),
      formatDate(r.effectiveTo),
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [['Rate Type', 'Rate', 'Effective From', 'Effective To']],
      body,
      theme: 'grid',
      styles: {
        fontSize: 9.5,
        cellPadding: 4,
        textColor: TEXT_DARK,
        lineColor: BORDER_COLOR,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: BRAND_COLOR_DARK,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: LIGHT_BG,
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
      },
      margin: { left: 14, right: 14 },
    });
  });

  drawFooter(doc);

  const filename =
    institutes.length === 1
      ? `commission-statement-${(institutes[0].instituteName || institutes[0].id).replace(/\s+/g, '-').toLowerCase()}.pdf`
      : `commission-statements-${institutes.length}-institutes.pdf`;

  doc.save(filename);
}
