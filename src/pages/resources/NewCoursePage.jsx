import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { createCourse, fetchCourseById, updateCourse } from '../../api/coursesApi';
import { fetchUniqueInstituteNames } from '../../api/institutesScrappingApi';
import { FormActions, FormPageLayout, FormSectionsLayout, formPaperSx } from '../../components/forms';
import { getEmptyForm, getResourceConfig } from '../../config/resourceConfig';

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

export default function NewCoursePage({ basePath = '/courses' }) {
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  const submittingRef = useRef(false);
  const resource = getResourceConfig(basePath);
  const isEditMode = Boolean(courseId);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [originalForm, setOriginalForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
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
          setForm(getEmptyForm(basePath));
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

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => {
      if (field === 'instituteId') {
        // Selecting a different institute invalidates the previously
        // chosen campus, since campuses are scoped to one institute.
        return { ...prev, instituteId: value, campus: '' };
      }
      return { ...prev, [field]: value };
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

  const hasChanges =
    originalForm !== null &&
    JSON.stringify(form) !== JSON.stringify(originalForm);

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
    : (!form.instituteId ? ['campus'] : []);

  if (loading) {
    return (
      <FormPageLayout title={isEditMode ? 'Edit course' : 'Add new course'}>
        <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
          Loading course...
        </Paper>
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
        />

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
