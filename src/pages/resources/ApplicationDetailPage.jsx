import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getVendorStudentById } from '../../api/vendorStudentApi';
import { API_BASE_URL } from '../../api/api';

function val(data, key) {
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
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path}`;
  
}

function DetailRow({ label, value, isLink = false }) {
  const display = value ?? '—';
  return (
    <Grid size={{ xs: 12, sm: 6, }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, mb: 0.25 }}>
        {label}
      </Typography>
      {isLink && display !== '—' ? (
        <Link href={display} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
          View file
        </Link>
      ) : (
        <Typography sx={{ fontSize: '0.9rem', color: '#0f2d52', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
          {display}
        </Typography>
      )}
    </Grid>
  );
}

function SignaturePreview({ label, path }) {
  const src = fileUrl(path);
  
  if (!src) return <DetailRow label={label} value="—" />;
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        component="img"
        src={src}
        alt={label}
        sx={{ maxWidth: 280, maxHeight: 120, border: '1px solid #e2e8f0', borderRadius: 1, bgcolor: '#fff' }}
      />
    </Grid>
  );
}

function StepAccordion({ title, children, defaultExpanded = false }) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      elevation={0}
      sx={{ border: '1px solid #e2e8f0', borderRadius: '12px !important', '&:before': { display: 'none' }, mb: 1.5 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700, color: '#0f2d52' }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>{children}</Grid>
      </AccordionDetails>
    </Accordion>
  );
}

export default function ApplicationDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await getVendorStudentById(studentId);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load application details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (studentId) load();
    return () => { cancelled = true; };
  }, [studentId]);

  const education = data?.educationHistory ?? data?.EducationHistory ?? [];
  const documents = data?.documents ?? data?.Documents ?? [];
  const summaryRecord = education.find((e) => (e.recordType ?? e.RecordType) === 'Summary') ?? education[0];
  const highSchoolRecord = education.find((e) => (e.recordType ?? e.RecordType) === 'HighSchool');
  const otherQualRecord = education.find((e) => (e.recordType ?? e.RecordType) === 'OtherQualification');

  const workDocs = documents.filter((d) => (d.documentCategory ?? d.DocumentCategory) === 'Work');
  const eduDocs = documents.filter((d) => (d.documentCategory ?? d.DocumentCategory) === 'Education');
  const personalDocs = documents.filter((d) => (d.documentCategory ?? d.DocumentCategory) === 'Personal');
  const englishDocs = documents.filter((d) => (d.documentCategory ?? d.DocumentCategory) === 'English');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f8fc' }}>
     <Container maxWidth={false} disableGutters sx={{ px: 3,  py: { xs: 3, md: 4 },}}>
        <Stack spacing={2.5}>
         <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', md: '1.75rem' }, color: '#0f2d52' }}>
     Application Details
   </Typography>
          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#2f80c9' }} />
            </Box>
          ) : data ? (
            <Paper elevation={0} sx={{ width: "100%", p: { xs: 2, md: 3 }, border: '1px solid #e2e8f0', borderRadius: 2.5,}}>
              <StepAccordion title="Step 1 — Personal Details" defaultExpanded>
                <DetailRow label="Country to Apply" value={val(data, 'CountryToApply')} />
                <DetailRow label="First Name" value={val(data, 'FirstName')} />
                <DetailRow label="Last Name" value={val(data, 'LastName')} />
                <DetailRow label="Mobile" value={val(data, 'MobileNumber')} />
                <DetailRow label="Email" value={val(data, 'Email')} />
                <DetailRow label="Title" value={val(data, 'Title')} />
                <DetailRow label="Family Name" value={val(data, 'FamilyName')} />
                <DetailRow label="Given Names" value={val(data, 'GivenNames')} />
                <DetailRow label="Previous Name" value={val(data, 'PreviousName')} />
                <DetailRow label="Date of Birth" value={formatDate(data.dateOfBirth ?? data.DateOfBirth)} />
                <DetailRow label="Gender" value={val(data, 'Gender')} />
                <DetailRow label="Country of Birth" value={val(data, 'CountryOfBirth')} />
                <DetailRow label="Citizenship" value={val(data, 'Citizenship')} />
                <DetailRow label="Passport Number" value={val(data, 'PassportNumber')} />
                <DetailRow label="Passport Expiry" value={formatDate(data.passportExpiryDate ?? data.PassportExpiryDate)} />
                <DetailRow label="Passport Country of Issue" value={val(data, 'PassportCountryOfIssue')} />
                <DetailRow label="Passport File" value={fileUrl(data.passportFilePath ?? data.PassportFilePath)} isLink />
                <DetailRow label="Address" value={val(data, 'CurrentAddress')} />
                <DetailRow label="Suburb" value={val(data, 'CurrentSuburb')} />
                <DetailRow label="State" value={val(data, 'CurrentState')} />
                <DetailRow label="Country" value={val(data, 'CurrentCountry')} />
                <DetailRow label="Postcode" value={val(data, 'CurrentPostcode')} />
                <DetailRow label="Emergency Contact Name" value={val(data, 'EmergencyContactName')} />
                <DetailRow label="Emergency Relationship" value={val(data, 'EmergencyContactRelationship')} />
                <DetailRow label="Emergency Phone" value={val(data, 'EmergencyContactPhone')} />
                <DetailRow label="Emergency Email" value={val(data, 'EmergencyContactEmail')} />
                <DetailRow label="Course" value={val(data, 'CourseName')} />
              </StepAccordion>

              <StepAccordion title="Step 2 — Authorised Agent Details">
                <DetailRow label="Agency Name" value={val(data, 'AgentAgencyName')} />
                <DetailRow label="Contact Person" value={val(data, 'AgentContactPerson')} />
                <DetailRow label="Email" value={val(data, 'AgentEmail')} />
                <DetailRow label="Telephone" value={val(data, 'AgentTelephone')} />
              </StepAccordion>

              <StepAccordion title="Step 3 — Immigration History">
                <DetailRow label="Applied for visa before" value={val(data, 'VisaAppliedBefore')} />
                <DetailRow label="Visa Type" value={val(data, 'VisaAppliedType')} />
                <DetailRow label="Visa refused" value={val(data, 'VisaRefused')} />
                <DetailRow label="Refused Country" value={val(data, 'RefusedVisaCountry')} />
                <DetailRow label="Refused Visa Type" value={val(data, 'RefusedVisaType')} />
              </StepAccordion>

              <StepAccordion title="Step 4 — English Language">
                <DetailRow label="English Test Type" value={val(data, 'EnglishTestType')} />
                <DetailRow label="Overall Score" value={val(data, 'EnglishOverallScore')} />
                <DetailRow label="Test Date" value={formatDate(data.englishTestDate ?? data.EnglishTestDate)} />
                <DetailRow label="English Evidence" value={fileUrl(data.englishEvidenceFilePath ?? data.EnglishEvidenceFilePath)} isLink />
                {englishDocs.map((doc) => (
                  <DetailRow
                    key={doc.documentID ?? doc.DocumentID}
                    label={doc.documentType ?? doc.DocumentType}
                    value={fileUrl(doc.filePath ?? doc.FilePath)}
                    isLink
                  />
                ))}
              </StepAccordion>

              <StepAccordion title="Step 5 — Education Background">
                <DetailRow label="Highest Qualification" value={val(summaryRecord, 'HighestQualification')} />
                <DetailRow label="Studied High School in Australia" value={val(summaryRecord, 'StudiedHighSchoolAustralia')} />
                <DetailRow label="Has Other Qualifications" value={val(summaryRecord, 'HasSecondaryPostSecondaryQual')} />
                <DetailRow label="High School Details" value={val(highSchoolRecord, 'LocationDetail')} />
                <DetailRow label="Other Qualification Details" value={val(otherQualRecord, 'LocationDetail')} />
                {eduDocs.map((doc) => (
                  <DetailRow
                    key={doc.documentID ?? doc.DocumentID}
                    label={doc.documentType ?? doc.DocumentType}
                    value={fileUrl(doc.filePath ?? doc.FilePath)}
                    isLink
                  />
                ))}
              </StepAccordion>

              <StepAccordion title="Step 6 — Work Experience">
                {workDocs.length === 0 ? (
                  <DetailRow label="Documents" value="—" />
                ) : (
                  workDocs.map((doc) => (
                    <DetailRow
                      key={doc.documentID ?? doc.DocumentID}
                      label={doc.documentType ?? doc.DocumentType}
                      value={fileUrl(doc.filePath ?? doc.FilePath)}
                      isLink
                    />
                  ))
                )}
              </StepAccordion>

              <StepAccordion title="Step 7 — Checklist">
                <DetailRow label="Completed all sections" value={val(data, 'ChkCompletedAllSections')} />
                <DetailRow label="Agent certified transcripts" value={val(data, 'ChkAgentCertifiedTranscripts')} />
                <DetailRow label="Agent certified passport" value={val(data, 'ChkAgentCertifiedPassport')} />
                <DetailRow label="English proficiency evidence" value={val(data, 'ChkEnglishProficiencyEvidence')} />
                <DetailRow label="GS Assessment Form submitted" value={val(data, 'ChkGSAssessmentFormSubmitted')} />
                <DetailRow label="Read and signed declaration" value={val(data, 'ChkReadSignedDeclaration')} />
              </StepAccordion>

              <StepAccordion title="Step 8 — Declaration">
                <DetailRow label="Name" value={val(data, 'DeclarationName')} />
                <SignaturePreview label="Applicant Signature" path={data.applicantSignaturePath ?? data.ApplicantSignaturePath} />
                <DetailRow label="Declaration Date" value={formatDate(data.applicantSignatureDate ?? data.ApplicantSignatureDate)} />
                <DetailRow label="Parent/Guardian Name" value={val(data, 'ParentGuardianName')} />
                <SignaturePreview label="Parent/Guardian Signature" path={data.parentSignaturePath ?? data.ParentSignaturePath} />
                <DetailRow label="Parent/Guardian Date" value={formatDate(data.parentSignatureDate ?? data.ParentSignatureDate)} />
                <DetailRow label="Submitted Date" value={formatDate(data.submittedDate ?? data.SubmittedDate)} />
              </StepAccordion>

              {personalDocs.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography sx={{ fontWeight: 700, color: '#0f2d52', mb: 1 }}>Uploaded Documents</Typography>
                  <Grid container spacing={2}>
                    {personalDocs.map((doc) => (
                      <DetailRow
                        key={doc.documentID ?? doc.DocumentID}
                        label={doc.documentType ?? doc.DocumentType}
                        value={fileUrl(doc.filePath ?? doc.FilePath)}
                        isLink
                      />
                    ))}
                  </Grid>
                </>
              )}
            </Paper>
          ) : (
            <Alert severity="info">Application not found.</Alert>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
