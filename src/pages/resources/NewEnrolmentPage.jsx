import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { fetchEnrolmentRows, fetchStudentById, updateStudentEnrolment } from '../../api/studentsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function NewEnrolmentPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [students, setStudents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    fetchEnrolmentRows()
      .then((data) => {
        if (active) setStudents(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load students.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!form.studentId) return undefined;

    fetchStudentById(form.studentId)
      .then((student) => {
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          fullName: student.fullName,
          email: student.email,
          phone: student.phone,
          enrolmentStatus: student.enrolmentStatus || prev.enrolmentStatus,
        }));
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load student details.');
      });

    return () => {
      active = false;
    };
  }, [form.studentId]);

  const selectOptions = useMemo(
    () => ({
      studentId: students.map((item) => ({
        value: item.studentId,
        label: item.fullName,
      })),
    }),
    [students],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateStudentEnrolment(form.studentId, form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to update student enrolment.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title="Update student enrolment"
      subtitle="Select a student and update their enrolment stage and contact details via AvecADeskApi."
      metaItems={[
        { label: 'Module', value: resource.plural },
        { label: 'Action', value: 'Update student' },
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
          submitLabel={submitting ? 'Updating...' : resource.actionLabel}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
