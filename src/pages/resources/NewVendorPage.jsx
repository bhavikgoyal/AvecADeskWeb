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
  const [showSaveFirst, setShowSaveFirst] = useState(false);
  const submittingRef = useRef(false);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleTabChange = (_, value) => {
    if (value === 1 && !createdVendorId) {
     
      setShowSaveFirst(true);
      return; 
    }
    setShowSaveFirst(false);
    setActiveTab(value);
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const vendor = await createVendor(form);
      setCreatedVendorId(vendor.vendorId);
      setShowSaveFirst(false);
      setActiveTab(1);
    } catch (err) {
      setError(err.message || 'Failed to create vendor.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout title={`Add new ${resource.singular.toLowerCase()}`}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
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
            {showSaveFirst && !createdVendorId && (
              <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setShowSaveFirst(false)}>
                Please save vendor details first before adding commission rates.
              </Alert>
            )}

            {/* Vendor save */}
            {createdVendorId && (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Vendor saved successfully! You can now add commission rates from the Commission rates tab.
              </Alert>
            )}

            <FormSectionsLayout
              sections={resource.sections}
              form={form}
              onChange={updateField}
              requiredFields={resource.requiredFields}
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