import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Paper, Tab, Tabs } from '@mui/material';
import { createVendor } from '../../api/vendorsApi';
import VendorCommissionRatesPanel from '../../components/vendors/VendorCommissionRatesPanel';
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
  const [activeTab, setActiveTab] = useState(0);
  const [createdVendorId, setCreatedVendorId] = useState(null);
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
      const vendor = await createVendor(form);
      setCreatedVendorId(vendor.vendorId);
      setActiveTab(1);
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
            {createdVendorId && (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Vendor saved. Switch to the Commission rates tab to add rates, or update details below.
              </Alert>
            )}
            <FormSectionsLayout
              sections={resource.sections}
              form={form}
              onChange={updateField}
            />
            <FormActions
              onCancel={() => navigate(basePath)}
              onSubmit={createdVendorId ? () => navigate(`${basePath}/${createdVendorId}`) : handleCreate}
              submitLabel={
                createdVendorId
                  ? 'Open vendor'
                  : submitting
                    ? 'Saving...'
                    : resource.actionLabel
              }
              submitDisabled={createdVendorId ? false : !isFormValid(resource, form) || submitting}
            />
          </>
        )}

        {activeTab === 1 && (
          <VendorCommissionRatesPanel defaultVendorId={createdVendorId} />
        )}
      </Paper>
    </FormPageLayout>
  );
}
