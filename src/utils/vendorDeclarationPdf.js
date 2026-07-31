import jsPDF from "jspdf";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleDateString("en-GB");
}
function getFileUrl(filePath) {
  if (!filePath) return null;

  const relativePath = filePath
    .replace(/\\/g, "/")
    .replace(/^.*\/uploads\//i, "uploads/");

  return `/${relativePath}`;
}
async function loadImage(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);

      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
export async function exportVendorDeclarationPdf(vendor) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const signatureUrl = getFileUrl(vendor?.signature);
console.log("Signature URL:", signatureUrl);
let signature = null;

try {
  if (signatureUrl) {
    signature = await loadImage(signatureUrl);
  }
} catch (e) {
  console.error(e);
}
  let y = 20;

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text("DECLARATION", pageWidth / 2, y, { align: "center" });

  y += 12;

  doc.setFont("times", "normal");
  doc.setFontSize(12);

  const intro = `I, ${vendor?.authorizedSignatoryName || "______________"}, Authorized Signatory of ${vendor?.legalBusinessName || "______________"}, hereby declare that the information and documents submitted in the Vendor Onboarding Form to AVEC A Desk are true, complete and correct to the best of my knowledge and belief.`;

  doc.text(doc.splitTextToSize(intro, 170), 20, y);

  y += 30;

  doc.setFont("times", "bold");
  doc.text("I further declare that:", 20, y);

  y += 8;

  doc.setFont("times", "normal");

  const points = [
    "The organization is legally registered and authorized to conduct its business.",
    "All submitted documents are genuine and authentic.",
    "The information provided is accurate and up to date.",
    "I will inform AVEC A Desk of any future changes.",
    "I agree to comply with AVEC A Desk policies.",
    "AVEC A Desk may verify submitted information.",
    "False information may result in rejection or termination."
  ];

  points.forEach((p) => {
    const lines = doc.splitTextToSize(p, 160);
    doc.text("•", 22, y);
    doc.text(lines, 28, y);
    y += lines.length * 7 + 2;
  });

  y += 5;

  const closing =
    "I hereby declare that the above information is true and correct to the best of my knowledge and belief.";

  doc.text(doc.splitTextToSize(closing, 170), 20, y);

  y += 25;

  doc.setFont("times", "bold");
  doc.text("Place :", 20, y);
  doc.setFont("times", "normal");
  doc.text(vendor?.countryOfRegistration  || "", 40, y);
  doc.line(40, y + 1, 90, y + 1);

  y += 12;

  doc.setFont("times", "bold");
  doc.text("Date :", 20, y);
  doc.setFont("times", "normal");
  doc.text(formatDate(vendor?.declarationDate), 40, y);
  doc.line(40, y + 1, 90, y + 1);

  const rx = 125;
doc.setFont("times", "bold");
doc.text("Yours faithfully,", rx, y - 12);

try {
  if (signature) {
    doc.addImage(signature, "PNG", rx, y - 5, 45, 18);
  } else {
    doc.line(rx, y + 8, rx + 45, y + 8);
  }
} catch (err) {
  console.error("Signature image error:", err);
  doc.line(rx, y + 8, rx + 45, y + 8);
}

y += 20;

doc.setFont("times", "bold");
doc.text("(Authorized Signatory)", rx, y);

  y += 28;

  doc.text("Name :", rx - 20, y);
  doc.setFont("times", "normal");
  doc.text(vendor?.authorizedSignatoryName || "", rx + 5, y);
  doc.line(rx + 5, y + 1, rx + 60, y + 1);

  y += 12;

  doc.setFont("times", "bold");
  doc.text("Designation :", rx - 20, y);
  doc.setFont("times", "normal");
  doc.text(vendor?.primaryContactDesignation || "", rx + 15, y);
  doc.line(rx + 15, y + 1, rx + 60, y + 1);

  y += 15;

  doc.setFont("times", "bold");


  doc.save(`VendorDeclaration-${vendor?.legalBusinessName || "Vendor"}.pdf`);
}