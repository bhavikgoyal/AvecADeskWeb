import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import {
  FormPageLayout,
  FormSaveButton,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getRecordLabel, getResourceConfig } from '../../config/resourceConfig';
import { getRecordById, upsertRecord, deleteRecord } from '../../utils/resourceStorage';
import { getReminderRules, updateReminderRule } from '../../api/reminderApi';

function mapReminderToForm(r) {
  return {
    id: r.ruleId ?? r.RuleId,
    ruleType: r.ruleType ?? r.RuleType,
    triggerAfterDays: String(r.triggerAfterDays ?? r.TriggerAfterDays ?? ''),
    intervalDays: String(r.intervalDays ?? r.IntervalDays ?? ''),
    isActive: (r.isActive ?? r.IsActive) ? 'Yes' : 'No',
    emailTemplateId: r.emailTemplateId ?? r.EmailTemplateId ?? 1,
    templateName: r.templateName ?? r.TemplateName ?? '',
    category: r.category ?? r.Category ?? 'Reminder',
  };
}

export default function ResourceDetailPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const resource = getResourceConfig(basePath);
  const isReminders = basePath === '/reminders';

  const localExisting = useMemo(
    () => (isReminders ? null : getRecordById(basePath, id)),
    [basePath, id, isReminders],
  );

  const [existing, setExisting] = useState(localExisting);
  const [loading, setLoading] = useState(isReminders);
  const [editMode, setEditMode] = useState(location.state?.edit ?? true);
  const [form, setForm] = useState(localExisting || getEmptyForm(basePath));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isReminders) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const rules = await getReminderRules();
        const match = rules.find((r) => String(r.ruleId ?? r.RuleId) === String(id));
        if (active) {
          if (match) {
            const mapped = mapReminderToForm(match);
            setExisting(mapped);
            setForm(mapped);
          } else {
            setExisting(null);
          }
        }
      } catch (err) {
        console.error('Failed to load reminder rule:', err);
        if (active) setExisting(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isReminders, id]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }

    setError('');

    if (isReminders) {
      setSubmitting(true);
      try {
        const payload = {
          RuleType: form.ruleType,
          TriggerAfterDays: parseInt(form.triggerAfterDays, 10) || 0,
          IntervalDays: parseInt(form.intervalDays, 10) || 0,
          EmailTemplateId: form.emailTemplateId || 1,
          IsActive: form.isActive === 'Yes',
        };
        const updated = await updateReminderRule(id, payload);
        setForm(mapReminderToForm(updated));
        setEditMode(false);
      } catch (err) {
        console.error('Update reminder rule failed:', err);
        setError('Failed to update reminder rule. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    upsertRecord(basePath, { ...form, id: form.id || id });
    setEditMode(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteRecord(basePath, id);
      navigate(basePath);
    }
  };

  if (!resource) return null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  if (!existing) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{resource.singular} not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={editMode ? `Edit ${resource.singular.toLowerCase()}` : `${resource.singular} details`}
      subtitle={`${getRecordLabel(resource, form)} • ${form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || form.isActive || '—'} • ${form.assignedTo || form.contactPerson || 'Unassigned'}`}
      metaItems={[
        { label: 'ID', value: form.id || id },
        { label: 'Module', value: resource.plural },
        { label: 'Status', value: form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || form.isActive || 'Active' },
        { label: 'Mode', value: editMode ? 'Editing' : 'View' },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%', p: 3 }}>
        <FormSectionsLayout
          sections={resource.sections}
          form={form}
          onChange={updateField}
          disabled={!editMode}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{
          mt: 4,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 2,
          pt: 2,
          borderTop: '1px solid #e0e0e0',
        }}>
          <Button
            onClick={() => navigate(basePath)}
            sx={{ backgroundColor: 'black', color: 'white', '&:hover': { backgroundColor: '#333' } }}
          >
            Back
          </Button>
          <FormSaveButton editMode={editMode} onClick={handleSave} disabled={submitting} />
          <Button
            variant="contained"
            onClick={handleDelete}
            sx={{
              backgroundColor: 'error.main',
              color: 'white',
              '&:hover': { backgroundColor: 'error.dark' },
            }}
          >
            Delete
          </Button>
        </Box>
      </Paper>
    </FormPageLayout>
  );
}