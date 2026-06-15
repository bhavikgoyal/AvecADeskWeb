import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { createInstitute } from '../../api/institutesApi';
import { fetchVendors } from '../../api/lookupApi';
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
      await createInstitute(form);
      navigate(basePath);
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
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {(error || loadError) && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error || loadError}
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
          onSubmit={handleCreate}
          submitLabel={submitting ? 'Saving...' : resource.actionLabel}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
