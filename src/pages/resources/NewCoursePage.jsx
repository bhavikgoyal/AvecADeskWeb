import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams  } from 'react-router-dom';
import {  Alert,  Paper,  Box,  TextField, Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow, InputAdornment,} from '@mui/material';
import { createCourse, fetchCourseById, updateCourse } from '../../api/coursesApi';
import { fetchUniqueInstituteNames,normalizeInstituteName} from '../../api/institutesScrappingApi';
import { FormActions, FormPageLayout, FormSectionsLayout,  FormSection,formPaperSx } from '../../components/forms';
import { getEmptyForm, getResourceConfig } from '../../config/resourceConfig';
import FormContentSkeleton from '../../components/FormContentSkeleton';
import { formFieldSx } from '../../components/forms/formStyles';

function toCourseForm(data, emptyForm) {
  return {
    ...emptyForm,
    // NOTE: instituteId here temporarily holds the raw value from the DB.
    // It gets resolved into the institute NAME (for the select) right after
    // load, once we know the institute rows (see loadPageData below).
    instituteId: data?.instituteId != null ? String(data.instituteId) : '',
    courseName: data?.courseName || '',
    CourseCategory: data?.CourseCategory || data?.Category || '',
    description: data?.description || '',
    // Fee breakdown (feeds into the auto-computed "fees" total below).
    enrollmentFee: data?.enrollmentFee != null ? String(data.enrollmentFee) : '',
    materialFee: data?.materialFee != null ? String(data.materialFee) : '',
    tuitionFee: data?.tuitionFee != null ? String(data.tuitionFee) : '',
    oshcFee: data?.oshcFee != null ? String(data.oshcFee) : '',
    fees: data?.fees != null ? String(data.fees) : '',
    duration: data?.duration || '',
    eligibility: data?.eligibility || '',
    campus: data?.campus || '',
    level: data?.level || '',
    programLink: data?.programLink || '',
    cricosCode: data?.cricosCode || '',
    intake: data?.intake || '',
    englishReq: data?.englishReq || '',
    scholarshipsDetails: data?.scholarshipsDetails || '',
    programDescription: data?.programDescription || '',
    addmissionRequirements: data?.addmissionRequirements || '',
    programLogo: data?.programLogo || '',
    isApproved: data?.isApproved ? 'Yes' : 'No',
    isActive: data?.isActive !== false ? 'Yes' : 'No',
    isAIFetched: data?.isAIFetched ?? false,
  };
}

// Fee-breakdown fields — editing any of these recomputes the "fees" total.
const FEE_BREAKDOWN_FIELDS = ['enrollmentFee', 'materialFee', 'tuitionFee', 'oshcFee'];

function CourseFeeTable({ courseCost, form, onChange, disabled = false }) {
  if (!courseCost?.rows?.length) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer component={Paper} elevation={0} sx={{ width: '100%', backgroundColor: 'transparent', overflow: 'hidden' }}>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', '& .MuiTableCell-root': { fontFamily: 'Plus Jakarta Sans', color: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(0, 0, 0, 0.35)' , fontWeight:' 700 !important '} }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '50%', fontWeight: 600, py: 0.75, px: 1, backgroundColor: 'rgba(0, 0, 0, 0.08)' }}>Description</TableCell>
              <TableCell sx={{ width: '50%', fontWeight: 600, py: 0.75, px: 1, backgroundColor: 'rgba(0, 0, 0, 0.08)' }}>Amount</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {courseCost.rows.map((row) => {
              const readOnly = row.readOnly === true;
              const isTotal = row.field === 'fees';

              return (
                <TableRow key={row.field}>
                  <TableCell sx={{ width: '50%', fontWeight: isTotal ? 600 : 400, py: 0.75, px: 1 }}>{row.label}</TableCell>

                  <TableCell sx={{ width: '50%', p: 0.5 }}>
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={form[row.field] ?? ''}
                      onChange={(e) => onChange(row.field, e.target.value)}
                      disabled={disabled || readOnly}
                      InputProps={{
                        readOnly,
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      sx={{
                        ...formFieldSx,
                        '& .MuiInputBase-input': { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', fontWeight: isTotal ? 600 : 400 },
                        '& .MuiInputAdornment-root': { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', color: 'inherit' },
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
export default function NewCoursePage({ basePath = '/courses' }) {
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  //const location = useLocation();
  const submittingRef = useRef(false);
  const resource = getResourceConfig(basePath);
  const isEditMode = Boolean(courseId);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [originalForm, setOriginalForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [instituteLocked, setInstituteLocked] = useState(false);
  const prefillAppliedRef = useRef(false);
  const pendingInstituteNameRef = useRef(null);
  const [loading, setLoading] = useState(isEditMode);
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState('');
  // Raw scrapping rows: [{ id, name, campusname }, ...]
  // One row per institute+campus combination.
  const [instituteRows, setInstituteRows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadPageData = async () => {
      try {
        setLoading(true);
        setError('');

        const instituteData = await fetchUniqueInstituteNames();
        if (cancelled) return;

        const rows = Array.isArray(instituteData) ? instituteData : [];
        setInstituteRows(rows);

        if (isEditMode) {
          const courseData = await fetchCourseById(courseId);
          if (cancelled) return;

          if (!courseData) throw new Error('Course not found.');

          const courseForm = toCourseForm(courseData, getEmptyForm(basePath));

          // Resolve the saved instituteId (a scrappingId) back into the
          // institute NAME (for the institute select) + keep the
          // scrappingId in `campus` (for the campus select).
          const matchedRow = rows.find(
            (item) => String(item.id) === String(courseData?.instituteId)
          );

          if (matchedRow) {
            courseForm.instituteId = matchedRow.name;
            courseForm.campus = String(matchedRow.id);
          }

          setForm(courseForm);
          setOriginalForm(courseForm);
    } else {
  setForm((prev) => {
    let instituteId = prev.instituteId || '';

    const pending = pendingInstituteNameRef.current;
    if (pending) {
      const normalize = (s) =>
        String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

      const target = normalize(pending);
      const matched = rows.find((r) => normalize(r.name) === target);
      instituteId = matched ? matched.name : pending;
    }
    return { ...getEmptyForm(basePath), instituteId };
  });
  setOriginalForm(null);
}
      } catch (err) {
        if (cancelled) return;

        setError(
          err?.message ||
          (isEditMode ? 'Failed to load course.' : 'Failed to load institute names.')
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPageData();

    return () => {
      cancelled = true;
    };
  }, [basePath, courseId, isEditMode]);
useEffect(() => {
  if (isEditMode || prefillAppliedRef.current) return;

  const rawInstituteName = searchParams.get('institute');
  const preselectedInstituteName = normalizeInstituteName(rawInstituteName);
  if (!preselectedInstituteName) return;

  prefillAppliedRef.current = true;
  pendingInstituteNameRef.current = preselectedInstituteName;
  setInstituteLocked(true);

  // Query param clean karo, taaki refresh pe institute dobara "locked" na dikhe
  setSearchParams({}, { replace: true });
}, [isEditMode, searchParams, setSearchParams]);
  if (!resource) return null;


  const updateField = (field, value) => {
    setForm((prev) => {
      let next = field === 'instituteId'
        ? { ...prev, instituteId: value, campus: '' }
        : { ...prev, [field]: value };
      if (FEE_BREAKDOWN_FIELDS.includes(field)) {
        const total =
          Number(next.enrollmentFee || 0) +
          Number(next.materialFee || 0) +
          Number(next.tuitionFee || 0) +
          Number(next.oshcFee || 0);
        next.fees = total.toFixed(2);
      }

      return next;
    });
    if (error) setError('');
  };

  const isCourseFormValid = () => {
    const requiredFields = resource.requiredFields ?? [];

    return requiredFields.every((field) => {
      const value = form[field];

      if (value === null || value === undefined) {
        return false;
      }

      // File upload field
      if (value instanceof File) {
        return true;
      }

      return String(value).trim() !== '';
    });
  };

  const hasChanges = originalForm !== null && JSON.stringify(form) !== JSON.stringify(originalForm);

  // Resolves the UI-level selection (institute name + campus scrappingId)
  // back into the real payload shape the backend expects:
  //   instituteId -> the scrappingId of the chosen institute+campus row
  //   campus      -> the actual campus name text
  const buildSubmissionPayload = () => {
    const matchedRow =
      instituteRows.find((item) => String(item.id) === String(form.campus)) ||
      instituteRows.find((item) => item.name === form.instituteId);

    return {
      ...form,
      instituteId: matchedRow ? matchedRow.id : form.instituteId,
      campus: matchedRow ? (matchedRow.campusname || '') : form.campus,
      enrollmentFee: Number(form.enrollmentFee || 0),
      materialFee: Number(form.materialFee || 0),
      tuitionFee: Number(form.tuitionFee || 0),
      oshcFee: Number(form.oshcFee || 0),
      fees: Number(form.fees || 0),
    };
  };

  const handleSave = async () => {
    if (submittingRef.current) return;

    if (!isCourseFormValid()) {
      setError('Please fill all required fields.');
      return;
    }

    if (isEditMode && !hasChanges) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const payload = buildSubmissionPayload();
  
      if (isEditMode) {
        await updateCourse(courseId, payload);
      } else {
        await createCourse(payload);
      }

      navigate(basePath, {
        replace: true,
        state: { refresh: true },
      });
    } catch (err) {
      setError(
        err?.message ||
          (isEditMode
            ? 'Failed to update course.'
            : 'Failed to create course.')
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Unique institute names for the first dropdown.
  const uniqueInstituteNames = Array.from(
    new Set(instituteRows.map((item) => item.name).filter(Boolean))
  );

  const instituteOptions = [
    { value: '', label: 'Please select institute' },
    ...uniqueInstituteNames.map((name) => ({ value: name, label: name })),
  ];

  // Campus dropdown is scoped to whichever institute name is selected.
  const campusOptions = [
    {
      value: '',
      label: form.instituteId ? 'Please select campus' : 'Select institute first',
    },
    ...instituteRows
      .filter((item) => item.name === form.instituteId)
      .map((item) => ({
        value: String(item.id),
        label: item.campusname || 'Main Campus',
      })),
  ];

  
const disabledFields = isEditMode
  ? ['instituteId', 'campus']
  : instituteLocked
    ? ['instituteId', ...(!form.instituteId ? ['campus'] : [])]
    : (!form.instituteId ? ['campus'] : []);
  if (loading) {
    return (
      <FormPageLayout title={isEditMode ? 'Edit course' : 'Add new course'}>
        <FormContentSkeleton rows={8} sx={{ ...formPaperSx, width: '100%' }} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout
      title={isEditMode ? 'Edit course' : `Add new ${resource.singular.toLowerCase()}`}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <FormSectionsLayout
          sections={resource.sections ?? []}
          form={form}
          onChange={updateField}
          selectOptions={{ instituteId: instituteOptions, campus: campusOptions }}
          requiredFields={resource.requiredFields ?? []}
          disabledFields={disabledFields}
          fieldDefsOverride={{ fees: { readOnly: true } }}
        />
        <FormSection
          title={resource.courseCost?.title}
          description={resource.courseCost?.description}
          divider={false}
          fill
          stretch
        >
          <CourseFeeTable
            courseCost={resource.courseCost}
            form={form}
            onChange={updateField}
          />
        </FormSection>
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleSave}
          submitLabel={
            submitting ? 'Saving...' : isEditMode ? 'Update Course' : resource.actionLabel
          }
          submitDisabled={
            !isCourseFormValid() || submitting || (isEditMode && !hasChanges)
          }
        />
      </Paper>
    </FormPageLayout>
  );
}
