import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Alert } from '@mui/material';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, getRecordLabel, isFormValid } from '../../config/resourceConfig';
import { upsertRecord } from '../../utils/resourceStorage';
import { createEmailTemplate } from '../../api/EmailtemplatesApi';

export default function NewResourcePage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const singularTitle = resource?.singular ? resource.singular.replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  const [form, setForm] = useState(() => getEmptyForm(basePath));

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
  const codeField =
    form.vendorCode || form.invoiceNumber || form.enrollmentNumber || "";

  const id =
    codeField.trim() ||
    `${resource.singular.toLowerCase().replace(/\s/g, "-")}-${crypto.randomUUID()}`;

  if (basePath === '/templates') {
    setError('');
    setSaving(true);
    try {
      await createEmailTemplate({ ...form });
      navigate(basePath, { state: { refresh: true } });
    } catch (err) {
      console.error('createEmailTemplate error:', err);
      setError(err.message || 'Failed to create template via API; saved locally instead.');
      // fallback to local upsert so user doesn't lose data
      upsertRecord(basePath, {
        ...form,
        id,
        name: getRecordLabel(resource, form),
      });
      navigate(basePath, { state: { refresh: true } });
    } finally {
      setSaving(false);
    }
    return;
  }

  upsertRecord(basePath, {
    ...form,
    id,
    name: getRecordLabel(resource, form),
  });

  navigate(basePath);
};

  return (
    <FormPageLayout
      title={`Add ${singularTitle}`}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <FormSectionsLayout sections={resource.sections} form={form} onChange={updateField} />
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={saving ? 'Saving…' : resource.actionLabel}
          submitDisabled={saving || !isFormValid(resource, form)}
        />
      </Paper>
    </FormPageLayout>
  );
}
