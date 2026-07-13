import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
} from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import {
  deleteInstituteScrapping,
  fetchInstituteScrappingById,
  updateInstituteScrapping,
} from '../../api/institutesScrappingApi';
import {
  INSTITUTE_SCRAPPING_BASE_PATH,
  isManualFormValid,
  MANUAL_FORM_SECTIONS,
  MANUAL_REQUIRED_FIELDS,
  recordToManualForm,
} from './instituteScrappingFormConfig';

export default function InstituteScrappingEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(() => recordToManualForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRecord = async () => {
      setLoading(true);
      setError('');

      try {
        const record = await fetchInstituteScrappingById(id);
        if (!active) return;
        setForm(recordToManualForm(record));
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load institute scrapping record.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRecord();

    return () => {
      active = false;
    };
  }, [id]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!isManualFormValid(form)) {
      setError('Institute name and program name are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateInstituteScrapping(id, form);
      navigate(INSTITUTE_SCRAPPING_BASE_PATH);
    } catch (err) {
      setError(err.message || 'Failed to update record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await deleteInstituteScrapping(id);
      setDeleteDialogOpen(false);
      navigate(INSTITUTE_SCRAPPING_BASE_PATH);
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
        <CircularProgress size={36} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  return (
    <FormPageLayout
      title="Edit Institute Scrapping Record"
      subtitle={form.instituteName || form.programName || `Record #${id}`}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSectionsLayout
          sections={MANUAL_FORM_SECTIONS}
          form={form}
          onChange={updateField}
          disabled={saving || deleting}
          requiredFields={MANUAL_REQUIRED_FIELDS}
        />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          sx={{ px: { xs: 2, md: 3 }, pb: 3, pt: 1 }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={saving || deleting}
            sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
          >
            Delete
          </Button>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              onClick={() => navigate(INSTITUTE_SCRAPPING_BASE_PATH)}
              disabled={saving || deleting}
              sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isManualFormValid(form) || saving || deleting}
              sx={{ textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete record?</DialogTitle>
        <DialogContent>
          {error && deleteDialogOpen && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <DialogContentText>
            This will hide the institute scrapping record
            {form.programName ? ` for "${form.programName}"` : ''} from the list (soft delete).
            If this record is linked in the Courses table, delete will be blocked.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: 'none' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </FormPageLayout>
  );
}
