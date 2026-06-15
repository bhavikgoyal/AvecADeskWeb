import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { fetchStudentById, updateStudentEnrolment } from '../../api/studentsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function EnrolmentDetailPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  const sections = useMemo(
    () => resource?.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => field !== 'studentId'),
    })) ?? [],
    [resource],
  );

  useEffect(() => {
    let active = true;

    fetchStudentById(id)
      .then((student) => {
        if (!active) return;
        setForm({
          studentId: String(student.studentId),
          fullName: student.fullName,
          enrolmentStatus: student.enrolmentStatus,
          email: student.email,
          phone: student.phone,
          notes: '',
        });
      })
      .catch((err) => {
        if (active) setError(err.message || 'Student not found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateStudentEnrolment(id, form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to update student enrolment.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>Loading student...</Typography>
      </Box>
    );
  }

  if (error && !form.studentId) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Student not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title="Update student enrolment"
      subtitle={`${form.fullName} • ${form.enrolmentStatus}`}
      metaItems={[
        { label: 'Student ID', value: id },
        { label: 'Module', value: resource.plural },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <FormSectionsLayout sections={sections} form={form} onChange={updateField} />
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleUpdate}
          submitLabel={submitting ? 'Updating...' : resource.actionLabel}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
