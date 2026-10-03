import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = [15, 45, 82];
const MUTED = [100, 116, 139];

function pick(data, key) {
  if (!data) return '—';
  const camel = key.charAt(0).toLowerCase() + key.slice(1);
  const v = data[camel] ?? data[key];
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function sectionRows(title, pairs) {
  return {
    title,
    rows: pairs.map(([label, value]) => [label, value ?? '—']),
  };
}

function buildSections(data) {
  const education = data?.educationHistory ?? data?.EducationHistory ?? [];
  const documents = data?.documents ?? data?.Documents ?? [];
  const summary =
    education.find((e) => (e.recordType ?? e.RecordType) === 'Summary') ??
    education[0];
  const highSchool = education.find(
    (e) => (e.recordType ?? e.RecordType) === 'HighSchool',
  );
  const otherQual = education.find(
    (e) => (e.recordType ?? e.RecordType) === 'OtherQualification',
  );

  const uploadedDocs = documents
    .filter((d) => d.filePath ?? d.FilePath)
    .map((d) => [
      d.documentType ?? d.DocumentType ?? 'Document',
      'Uploaded',
    ]);

  return [
    sectionRows('Step 1 — Personal Details', [
      ['Country to Apply', pick(data, 'CountryToApply')],
      ['First Name', pick(data, 'FirstName')],
      ['Last Name', pick(data, 'LastName')],
      ['Mobile', pick(data, 'MobileNumber')],
      ['Email', pick(data, 'Email')],
      ['Title', pick(data, 'Title')],
      ['Family Name', pick(data, 'FamilyName')],
      ['Given Names', pick(data, 'GivenNames')],
      ['Previous Name', pick(data, 'PreviousName')],
      ['Date of Birth', formatDate(data.dateOfBirth ?? data.DateOfBirth)],
      ['Gender', pick(data, 'Gender')],
      ['Country of Birth', pick(data, 'CountryOfBirth')],
      ['Citizenship', pick(data, 'Citizenship')],
      ['Passport Number', pick(data, 'PassportNumber')],
      [
        'Passport Expiry',
        formatDate(data.passportExpiryDate ?? data.PassportExpiryDate),
      ],
      ['Passport Country of Issue', pick(data, 'PassportCountryOfIssue')],
      [
        'Passport File',
        data.passportFilePath || data.PassportFilePath ? 'Uploaded' : '—',
      ],
      ['Address', pick(data, 'CurrentAddress')],
      ['Suburb', pick(data, 'CurrentSuburb')],
      ['State', pick(data, 'CurrentState')],
      ['Country', pick(data, 'CurrentCountry')],
      ['Postcode', pick(data, 'CurrentPostcode')],
      ['Emergency Contact Name', pick(data, 'EmergencyContactName')],
      [
        'Emergency Relationship',
        pick(data, 'EmergencyContactRelationship'),
      ],
      ['Emergency Phone', pick(data, 'EmergencyContactPhone')],
      ['Emergency Email', pick(data, 'EmergencyContactEmail')],
      ['Course', pick(data, 'CourseName')],
    ]),
    sectionRows('Step 2 — Authorised Agent Details', [
      ['Agency Name', pick(data, 'AgentAgencyName')],
      ['Contact Person', pick(data, 'AgentContactPerson')],
      ['Email', pick(data, 'AgentEmail')],
      ['Telephone', pick(data, 'AgentTelephone')],
    ]),
    sectionRows('Step 3 — Immigration History', [
      ['Applied for visa before', pick(data, 'VisaAppliedBefore')],
      ['Visa Type', pick(data, 'VisaAppliedType')],
      ['Visa refused', pick(data, 'VisaRefused')],
      ['Refused Country', pick(data, 'RefusedVisaCountry')],
      ['Refused Visa Type', pick(data, 'RefusedVisaType')],
    ]),
    sectionRows('Step 4 — English Language', [
      ['English Test Type', pick(data, 'EnglishTestType')],
      ['Overall Score', pick(data, 'EnglishOverallScore')],
      [
        'Test Date',
        formatDate(data.englishTestDate ?? data.EnglishTestDate),
      ],
      [
        'English Evidence',
        data.englishEvidenceFilePath || data.EnglishEvidenceFilePath
          ? 'Uploaded'
          : '—',
      ],
    ]),
    sectionRows('Step 5 — Education Background', [
      ['Highest Qualification', pick(summary, 'HighestQualification')],
      [
        'Studied High School in Australia',
        pick(summary, 'StudiedHighSchoolAustralia'),
      ],
      [
        'Has Other Qualifications',
        pick(summary, 'HasSecondaryPostSecondaryQual'),
      ],
      ['High School Details', pick(highSchool, 'LocationDetail')],
      ['Other Qualification Details', pick(otherQual, 'LocationDetail')],
    ]),
    sectionRows('Step 6 — Work Experience', [
      [
        'Work Documents',
        documents.filter(
          (d) => (d.documentCategory ?? d.DocumentCategory) === 'Work',
        ).length > 0
          ? `${
              documents.filter(
                (d) => (d.documentCategory ?? d.DocumentCategory) === 'Work',
              ).length
            } file(s) uploaded`
          : '—',
      ],
    ]),
    sectionRows('Step 7 — Checklist', [
      ['Completed all sections', pick(data, 'ChkCompletedAllSections')],
      [
        'Agent certified transcripts',
        pick(data, 'ChkAgentCertifiedTranscripts'),
      ],
      [
        'Agent certified passport',
        pick(data, 'ChkAgentCertifiedPassport'),
      ],
      [
        'English proficiency evidence',
        pick(data, 'ChkEnglishProficiencyEvidence'),
      ],
      [
        'GS Assessment Form submitted',
        pick(data, 'ChkGSAssessmentFormSubmitted'),
      ],
      [
        'Read and signed declaration',
        pick(data, 'ChkReadSignedDeclaration'),
      ],
    ]),
    sectionRows('Step 8 — Declaration', [
      ['Name', pick(data, 'DeclarationName')],
      [
        'Applicant Signature',
        data.applicantSignaturePath || data.ApplicantSignaturePath
          ? 'Signed'
          : '—',
      ],
      [
        'Declaration Date',
        formatDate(data.applicantSignatureDate ?? data.ApplicantSignatureDate),
      ],
      ['Parent/Guardian Name', pick(data, 'ParentGuardianName')],
      [
        'Parent/Guardian Signature',
        data.parentSignaturePath || data.ParentSignaturePath
          ? 'Signed'
          : '—',
      ],
      [
        'Parent/Guardian Date',
        formatDate(data.parentSignatureDate ?? data.ParentSignatureDate),
      ],
      [
        'Submitted Date',
        formatDate(data.submittedDate ?? data.SubmittedDate),
      ],
    ]),
    sectionRows(
      'Uploaded Documents',
      uploadedDocs.length > 0 ? uploadedDocs : [['Documents', '—']],
    ),
  ];
}

/**
 * Download Student Inquiry application details as PDF.
 */
export function exportStudentApplicationPdf(data) {
  if (!data) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const firstName = pick(data, 'FirstName');
  const lastName = pick(data, 'LastName');
  const fullName = [firstName, lastName].filter((x) => x && x !== '—').join(' ') || 'Student';
  const mobile = pick(data, 'MobileNumber');
  const course = pick(data, 'CourseName');

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Student Application Details', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AiDesk • Student Inquiry', 14, 20);
  const generated = `Generated: ${formatDate(new Date())}`;
  doc.text(generated, pageWidth - 14 - doc.getTextWidth(generated), 20);

  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(fullName, 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Mobile: ${mobile}  |  Course: ${course}`, 14, 44);

  let startY = 50;
  const sections = buildSections(data);
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 18;
  // Header + at least 2 body rows — agar itni jagah na ho to pehle naya page
  const minSectionBlock = 30;

  sections.forEach((section) => {
    if (startY + minSectionBlock > pageHeight - bottomMargin) {
      doc.addPage();
      startY = 16;
    }

    autoTable(doc, {
      startY,
      head: [[section.title, '']],
      body: section.rows,
      theme: 'grid',
      showHead: 'firstPage',
      rowPageBreak: 'auto',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [15, 45, 82],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: BRAND,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: 'bold', textColor: MUTED },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: bottomMargin },
      didParseCell(hookData) {
        if (hookData.section === 'head' && hookData.column.index === 1) {
          hookData.cell.text = [];
        }
      },
    });
    startY = (doc.lastAutoTable?.finalY ?? startY) + 6;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  const safeName = fullName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'student';
  doc.save(`StudentApplication-${safeName}.pdf`);
}
