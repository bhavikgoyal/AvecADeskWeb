import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { fetchVendorForm, updateVendor } from '../../api/vendorsApi';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function VendorDetailPage({ basePath }) {
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
    setLoading(true);
    setError('');

    fetchVendorForm(id)
      .then(({ form: loadedForm }) => {
        if (active) setForm(loadedForm);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Vendor not found.');
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
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (error) setError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current || !form) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateVendor(id, form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to update vendor.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>Loading vendor...</Typography>
      </Box>
    );
  }

  if (!form) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Vendor not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={`Edit ${resource.singular.toLowerCase()}`}
      subtitle={`${form.businessName} • ${form.vendorStatus}`}
      metaItems={[
        { label: 'Vendor ID', value: id },
        { label: 'Vendor code', value: form.vendorCode || '—' },
        { label: 'API', value: 'AvecADeskApi' },
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
          onSubmit={handleUpdate}
          submitLabel={submitting ? 'Updating...' : 'Update Vendor'}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
