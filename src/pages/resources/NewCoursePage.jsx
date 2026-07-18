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
  const [instituteNames, setInstituteNames] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadPageData = async () => {
      try {
        setLoading(true);
        setError('');

        const instituteData = await fetchUniqueInstituteNames();
        if (cancelled) return;

        setInstituteNames(Array.isArray(instituteData) ? instituteData : []);

        if (isEditMode) {
          const courseData = await fetchCourseById(courseId);
          if (cancelled) return;

          if (!courseData) throw new Error('Course not found.');

          const courseForm = toCourseForm(courseData, getEmptyForm(basePath));
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
    setForm((prev) => ({ ...prev, [field]: value }));
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
    if (isEditMode) {
      await updateCourse(courseId, form);
    } else {
      await createCourse(form);
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

  const instituteOptions = [
    { value: '', label: 'Please select institute' },
    ...instituteNames.map((item) => ({
      value: String(item.id),
      label: item.name,
    })),
  ];

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
          selectOptions={{ instituteId: instituteOptions }}
          requiredFields={resource.requiredFields ?? []}
          disabledFields={isEditMode ? ['instituteId'] : []}
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