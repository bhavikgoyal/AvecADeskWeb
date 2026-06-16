import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material';
import { fetchInstituteForm, updateInstitute } from '../../api/institutesApi';
import { fetchVendors } from '../../api/lookupApi';
import VendorCommissionRatesPanel from '../../components/vendors/VendorCommissionRatesPanel';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getResourceConfig, isFormValid } from '../../config/resourceConfig';

export default function InstituteDetailPage({ basePath }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchInstituteForm(id)
      .then(({ form: loadedForm }) => {
        if (active) setForm(loadedForm);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Institute not found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const selectOptions = useMemo(
    () => ({
      vendorId: vendors.map((item) => ({
        value: item.vendorId ?? item.VendorId,
        label: item.businessName || item.BusinessName || `Vendor ${item.vendorId ?? item.VendorId}`,
      })),
    }),
    [vendors],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (error) setError('');
    if (loadError) setLoadError('');
  };

  const handleUpdate = async () => {
    if (submittingRef.current || !form) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await updateInstitute(id, form);
      navigate(basePath);
    } catch (err) {
      setError(err.message || 'Failed to update institute.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>Loading institute...</Typography>
      </Box>
    );
  }

  if (!form) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Institute not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={`Edit ${resource.singular.toLowerCase()}`}
      subtitle={`${form.instituteName} • ${form.instituteStatus} • ${form.isPublished === 'Yes' ? 'Published' : 'Not published'}`}
      metaItems={[
        { label: 'Institute ID', value: id },
        { label: 'Module', value: resource.plural },
        { label: 'API', value: 'AvecADeskApi' },
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
            <FormSectionsLayout
              sections={resource.sections}
              form={form}
              onChange={updateField}
              selectOptions={selectOptions}
            />
            <FormActions
              onCancel={() => navigate(basePath)}
              onSubmit={handleUpdate}
              submitLabel={submitting ? 'Updating...' : 'Update Institute'}
              submitDisabled={!isFormValid(resource, form) || submitting}
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
