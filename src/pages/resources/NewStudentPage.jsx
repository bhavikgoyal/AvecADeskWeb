import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { fetchCoursesByInstitute, fetchInstitutes } from '../../api/lookupApi';
import { createStudentWithPaymentSchedule } from '../../api/studentsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function NewStudentPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    fetchInstitutes()
      .then((data) => {
        if (active) setInstitutes(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load institutes.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.instituteId) {
      setCourses([]);
      return undefined;
    }

    fetchCoursesByInstitute(form.instituteId)
      .then((data) => {
        if (active) setCourses(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load courses.');
      });

    return () => {
      active = false;
    };
  }, [form.instituteId]);

  const selectOptions = useMemo(
    () => ({
      instituteId: institutes.map((item) => ({
        value: item.instituteId,
        label: item.instituteName,
      })),
      courseId: courses.map((item) => ({
        value: item.courseId,
        label: item.courseName,
      })),
    }),
    [institutes, courses],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'instituteId' && value !== prev.instituteId) {
        next.courseId = '';
      }
      return next;
    });
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');

    try {
      await createStudentWithPaymentSchedule(form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to create student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={`Add new ${resource.singular.toLowerCase()}`}
      subtitle="Select institute and course from the list. Student and payment schedule are saved to AvecADeskApi."
      metaItems={[
        { label: 'Module', value: resource.plural },
        { label: 'API', value: 'AvecADeskApi' },
        { label: 'Tables', value: 'Students + PaymentSchedules' },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {(error || loadError) && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error || loadError}
          </Alert>
        )}
        <FormSectionsLayout
          sections={resource.sections}
          form={form}
          onChange={updateField}
          selectOptions={selectOptions}
        />
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={submitting ? 'Saving...' : resource.actionLabel}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
