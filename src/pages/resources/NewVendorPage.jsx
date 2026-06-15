import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { createVendor } from '../../api/vendorsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function NewVendorPage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await createVendor(form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to create vendor.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={`Add new ${resource.singular.toLowerCase()}`}
      subtitle="Vendor is saved to AvecADeskApi. Vendor code is assigned automatically on registration."
      metaItems={[
        { label: 'Module', value: resource.plural },
        { label: 'API', value: 'AvecADeskApi' },
        { label: 'Table', value: 'Vendors' },
      ]}
    >
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
