import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getRecordLabel, getResourceConfig } from '../../config/resourceConfig';
import { getRecordById, upsertRecord } from '../../utils/resourceStorage';
import { createEmailTemplate, updateEmailTemplate, getEmailTemplateById } from '../../api/EmailtemplatesApi';

export default function ResourceDetailPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const singularTitle = resource?.singular ? resource.singular.replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  const existing = getRecordById(basePath, id);
  const isTemplates = basePath === '/templates';
  const [editMode, setEditMode] = useState(() => location.state?.edit ?? true);
  const [form, setForm] = useState(() => existing || getEmptyForm(basePath));
  const [loading, setLoading] = useState(isTemplates && !!id);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!isTemplates || !id || existing) return;

    setLoading(true);
    setError('');
    getEmailTemplateById(id)
      .then((data) => {
        if (cancelled) return;
        // merge fetched values into the existing form to avoid wiping unexpected keys
        setForm((prev) => ({ ...prev, ...(data || {}) }));
        // only switch to view-mode after load if the caller didn't request edit mode
        if (!location.state?.edit) setEditMode(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load template.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isTemplates, id, existing]);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError('');
    if (editMode) {
      try {
        if (isTemplates) {
          if (form.id || id) {
            const updated = await updateEmailTemplate(form.id || id, form);
            // merge returned values so fields remain consistent
            setForm((prev) => ({ ...prev, ...(updated || form) }));
            setEditMode(false);
          } else {
            await createEmailTemplate(form);
            navigate(basePath, { state: { refresh: true } });
            return;
          }
        } else {
          upsertRecord(basePath, { ...form, id: form.id || id });
          setEditMode(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to save record.');
      }
    } else {
      setEditMode(true);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography>Loading {singularTitle.toLowerCase()}…</Typography>
      </Box>
    );
  }

  if (!existing && !isTemplates) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{resource.singular} not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={editMode ? `Edit ${singularTitle}` : `${singularTitle} details`}
      subtitle={`${getRecordLabel(resource, form)} • ${form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || '—'} • ${form.assignedTo || form.contactPerson || 'Unassigned'}`}
      metaItems={[
        { label: 'ID', value: form.id || id },
        { label: 'Module', value: resource.plural },
        {
          label: 'Status',
          value: form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || 'Active',
        },
        { label: 'Mode', value: editMode ? 'Editing' : 'View' },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSectionsLayout
          sections={resource.sections}
          form={form}
          onChange={updateField}
          disabled={!editMode}
        />
        <FormActions
          onCancel={() => navigate(basePath)}
          cancelLabel="Back"
          onSubmit={handleSave}
          submitLabel={editMode ? 'Save' : 'Edit'}
        />
      </Paper>
    </FormPageLayout>
  );
}
