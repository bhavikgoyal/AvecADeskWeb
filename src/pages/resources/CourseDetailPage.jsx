import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { fetchCourseById, updateCourse, buildCourseForm } from '../../api/coursesApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getResourceConfig, isFormValid } from '../../config/resourceConfig';

function toApiForm(form) {
  return { ...form, category: form.courseCategory };
}

function fromApiCourse(course) {
  const base = buildCourseForm(course);
  return { ...base, courseCategory: base.category };
}

export default function CourseDetailPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const course = await fetchCourseById(id);
        if (active) setForm(fromApiCourse(course));
      } catch (err) {
        if (active) setError(err.message || 'Course not found.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (error) setError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current || !form) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateCourse(id, toApiForm(form));
      navigate(basePath, { state: { refresh: true } });
    } catch (err) {
      setError(err.message || 'Failed to update course.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>Loading course...</Typography>
      </Box>
    );
  }

  if (!form) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Course not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  const requiredFields = resource.requiredFields;
  const formIsValid = requiredFields?.length
    ? requiredFields.every((field) => String(form[field] ?? '').trim())
    : isFormValid(resource, form);

  return (
    <FormPageLayout title={`Edit ${resource.singular.toLowerCase()}`}>
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <FormSectionsLayout
          sections={resource.sections}
          form={form}
          onChange={updateField}
          requiredFields={requiredFields}
        />
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleUpdate}
          submitLabel={submitting ? 'Saving...' : 'Save'}
          submitDisabled={!formIsValid || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}