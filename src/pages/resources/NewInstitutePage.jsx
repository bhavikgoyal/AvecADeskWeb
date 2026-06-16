import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Paper, Tab, Tabs } from '@mui/material';
import { createInstitute } from '../../api/institutesApi';
import { fetchVendors } from '../../api/lookupApi';
import VendorCommissionRatesPanel from '../../components/vendors/VendorCommissionRatesPanel';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function NewInstitutePage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [vendors, setVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [createdInstituteId, setCreatedInstituteId] = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    fetchVendors()
      .then((data) => {
        if (active) setVendors(data);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load vendors.');
      });

    return () => {
      active = false;
    };
  }, []);

  const selectOptions = useMemo(
    () => ({
      vendorId: vendors.map((item) => ({
        value: item.vendorId,
        label: item.businessName || item.BusinessName || `Vendor ${item.vendorId}`,
      })),
    }),
    [vendors],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleCreate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const institute = await createInstitute(form);
      setCreatedInstituteId(institute.instituteId);
      setActiveTab(1);
    } catch (err) {
      setError(err.message || 'Failed to create institute.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={`Add new ${resource.singular.toLowerCase()}`}
      subtitle="Institute is saved to AvecADeskApi with primary and secondary brand colours."
      metaItems={[
        { label: 'Module', value: resource.plural },
        { label: 'API', value: 'AvecADeskApi' },
        { label: 'Table', value: 'Institutes' },
      ]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="Institute details" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Commission rates" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {(error || loadError) && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error || loadError}
          </Alert>
        )}

        {activeTab === 0 && (
          <>
            {createdInstituteId && (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Institute saved. Switch to the Commission rates tab to add rates.
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
              onSubmit={createdInstituteId ? () => navigate(`${basePath}/${createdInstituteId}`) : handleCreate}
              submitLabel={
                createdInstituteId
                  ? 'Open institute'
                  : submitting
                    ? 'Saving...'
                    : resource.actionLabel
              }
              submitDisabled={createdInstituteId ? false : !isFormValid(resource, form) || submitting}
            />
          </>
        )}

        {activeTab === 1 && (
          <VendorCommissionRatesPanel defaultVendorId={form.vendorId ? Number(form.vendorId) : null} />
        )}
      </Paper>
    </FormPageLayout>
  );
}
