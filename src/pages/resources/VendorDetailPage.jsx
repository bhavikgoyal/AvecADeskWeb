import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material';
import { fetchVendorForm, updateVendor } from '../../api/vendorsApi';
import VendorCommissionRatesPanel from '../../components/vendors/VendorCommissionRatesPanel';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function VendorDetailPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 0);
  const submittingRef = useRef(false);

  useEffect(() => {
  let active = true;

  (async () => {
    try {
      const { form: loadedForm } = await fetchVendorForm(id);

      if (active) {
        setForm(loadedForm);
      }
    } catch (err) {
      if (active) {
        setError(err.message || 'Vendor not found.');
      }
    } finally {
      if (active) {
        setLoading(false);
      }
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
      subtitle={`${form.businessName} • ${form.vendorStatus} • ${form.contact || form.contactPerson || 'Unassigned'}`}
      metaItems={[
        { label: 'ID', value: `vendors-${id}` },
        { label: 'Module', value: resource.plural },
        { label: 'Status', value: form.vendorStatus || 'Active' },
        { label: 'Mode', value: 'Editing' },
      ]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Vendor details" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Commission rates" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {activeTab === 0 && (
          <>
            <FormSectionsLayout
              sections={resource.sections}
              form={form}
              onChange={updateField}
            />
            <FormActions
              onCancel={() => navigate(basePath)}
              onSubmit={handleUpdate}
              submitLabel={submitting ? 'Saving...' : 'Save'}
              submitDisabled={!isFormValid(resource, form) || submitting}
            />
          </>
        )}

        {activeTab === 1 && <VendorCommissionRatesPanel defaultVendorId={Number(id)} />}
      </Paper>
    </FormPageLayout>
  );
}
