
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_COLOR = [37, 99, 235];
const BRAND_COLOR_DARK = [25, 65, 160];
const TEXT_MUTED = [110, 118, 135];
const TEXT_DARK = [30, 34, 44];
const LIGHT_BG = [244, 247, 252];
const BORDER_COLOR = [225, 230, 240];

function formatDate(value) {
  if (!value || value === '—') return '—';

  const date = new Date(value);

  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function drawHeader(doc, row) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Blue Header
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Institute Commission Statement', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AiDesk • Commission Report', 14, 24);

  const generated = `Generated: ${formatDate(new Date())}`;
  doc.text(generated, pageWidth - 14 - doc.getTextWidth(generated), 24);

  // Card
  const cardX = 14;
  const cardY = 42;
  const cardWidth = pageWidth - 28;
  const cardHeight = 32;

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

  const leftX = cardX + 8;
  const rightX = pageWidth / 2 + 5;

  function field(label, value, x, y) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(String(value || '—'), x, y + 7);
  }

 field('Institute', row.instituteName, leftX, 54);
field('Course', row.courseName, rightX, 54);


  return cardY + cardHeight + 10;
}

function drawFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    doc.setDrawColor(...BORDER_COLOR);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);

    doc.text(
      'AiDesk - Institute Commission Statement',
      14,
      pageHeight - 10
    );

    const pageLabel = `Page ${i} of ${pages}`;

    doc.text(
      pageLabel,
      pageWidth - 14 - doc.getTextWidth(pageLabel),
      pageHeight - 10
    );
  }
}

export function exportInstituteCommissionPdf(rows) {
  const doc = new jsPDF();

  rows.forEach((row, index) => {
    if (index > 0) doc.addPage();

    const startY = drawHeader(doc, row);

    autoTable(doc, {
      startY,

      head: [[
        'Rate Type',
        'Rate',
        'Effective From',
        'Effective To',
      ]],

      body: [[
        row.rateType || '—',
        row.rate ?? '—',
        formatDate(row.effectiveFrom),
        formatDate(row.effectiveTo),
      ]],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: TEXT_DARK,
        lineColor: BORDER_COLOR,
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: BRAND_COLOR_DARK,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },

      alternateRowStyles: {
        fillColor: LIGHT_BG,
      },

      margin: {
        left: 14,
        right: 14,
      },
    });
  });

  drawFooter(doc);

  doc.save(
    rows.length === 1
      ? `commission-${rows[0].instituteName}.pdf`
      : `InstituteCommissionRates.pdf`
  );
}