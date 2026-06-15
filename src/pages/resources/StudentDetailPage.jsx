import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { fetchCoursesByInstitute, fetchInstitutes } from '../../api/lookupApi';
import {
  derivePaymentStatus,
  fetchStudentWithSchedule,
  updateStudentWithPaymentSchedule,
} from '../../api/studentsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function StudentDetailPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const submittingRef = useRef(false);

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
    setLoading(true);
    setError('');
    setLoadError('');

    fetchStudentWithSchedule(id)
      .then(({ form: loadedForm }) => {
        if (active) setForm(loadedForm);
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

  useEffect(() => {
    let active = true;

    if (!form?.instituteId) {
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
  }, [form?.instituteId]);

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
      if (!prev) return prev;
      const next = { ...prev, [field]: value };
      if (field === 'instituteId' && value !== prev.instituteId) {
        next.courseId = '';
      }
      if (field === 'amountDue' || field === 'amountPaid') {
        const due = field === 'amountDue' ? value : prev.amountDue;
        const paid = field === 'amountPaid' ? value : prev.amountPaid;
        next.paymentStatus = derivePaymentStatus(due, paid);
      }
      return next;
    });
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current || !form) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateStudentWithPaymentSchedule(id, form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to update student.');
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

  if (!form) {
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
      title={`Edit ${resource.singular.toLowerCase()}`}
      subtitle={`${form.fullName} • ${form.paymentStatus} • ${form.enrolmentStatus}`}
      metaItems={[
        { label: 'Student ID', value: id },
        { label: 'Schedule ID', value: form.scheduleId || '—' },
        { label: 'API', value: 'AvecADeskApi' },
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
          onSubmit={handleUpdate}
          submitLabel={submitting ? 'Updating...' : 'Update Student'}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
