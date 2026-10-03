import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, MenuItem, Paper, Tab, Tabs, TextField } from '@mui/material';
import { createInstitute } from '../../api/institutesApi';
import { fetchVendors } from '../../api/lookupApi';
import { fetchUniqueInstituteNames } from '../../api/institutesScrappingApi';
import InstituteCommissionRatesPanel from '../../components/institutes/InstituteCommissionRatesPanel';
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
  const [scrapOptions, setScrapOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [createdInstituteId, setCreatedInstituteId] = useState(null);
  const [showSaveFirst, setShowSaveFirst] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetchVendors()
      .then((data) => { if (active) setVendors(data); })
      .catch((err) => { if (active) setLoadError(err.message || 'Failed to load vendors.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetchUniqueInstituteNames()
      .then((data) => { if (active) setScrapOptions(data || []); })
      .catch(() => { if (active) setScrapOptions([]); });
    return () => { active = false; };
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

  const handleTabChange = (_, value) => {
    if (value === 1 && !createdInstituteId) {
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
      const institute = await createInstitute(form);
      setCreatedInstituteId(institute.instituteId);
      setShowSaveFirst(false);
      setActiveTab(1);
    } catch (err) {
      setError(err.message || 'Failed to create institute.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout title={`Add ${resource.singular.toLowerCase()}`}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
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
            {showSaveFirst && !createdInstituteId && (
              <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setShowSaveFirst(false)}>
                Please save institute details first before adding commission rates.
              </Alert>
            )}

            {createdInstituteId && (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Institute saved successfully! You can now add commission rates from the Commission rates tab.
              </Alert>
            )}

            <FormSectionsLayout
              sections={resource.sections}
              form={form}
              onChange={updateField}
              selectOptions={selectOptions}
            />

            <Box sx={{ px: { xs: 2, md: 3 }, mt: 1, mb: 2 }}>
              <TextField
                select
                label="Linked scraped institute (for commission course lookup)"
                value={form.linkedScrappingId || ''}
                onChange={(e) => updateField('linkedScrappingId', e.target.value)}
                fullWidth
                size="small"
                helperText="Optional. Link this institute to its scraped record so commission rates can pull the correct course list."
              >
                <MenuItem value="">None</MenuItem>
                {scrapOptions.map((opt) => (
                  <MenuItem key={opt.id} value={String(opt.id)}>
                    {opt.name}{opt.campusname ? ` — ${opt.campusname}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

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
          <InstituteCommissionRatesPanel
            instituteId={createdInstituteId}
            courseLookupId={form.linkedScrappingId ? Number(form.linkedScrappingId) : null}
             instituteName={form.instituteName}
          />
        )}
      </Paper>
    </FormPageLayout>
  );
}