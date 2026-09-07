import { useEffect, useState } from 'react';
import { Alert, Box, Button, Grid, TextField } from '@mui/material';
import {
  fetchInstituteContact,
  updateInstituteContact,
  getEmptyContactForm,
} from '../../api/institutesExtrasApi';
import FormContentSkeleton from '../FormContentSkeleton';

const FIELDS = [
  { key: 'contactName', label: 'Contact person name' },
  { key: 'designation', label: 'Designation' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'alternatePhone', label: 'Alternate phone' },
  { key: 'address', label: 'Address', multiline: true, gridSize: 12 },
  { key: 'notes', label: 'Notes', multiline: true, gridSize: 12 },
];

export default function InstituteContactDetailsPanel({ instituteId }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchInstituteContact(instituteId)
      .then((data) => {
        if (active) setForm({ ...getEmptyContactForm(), ...data });
      })
      .catch(() => {
        if (active) setForm(getEmptyContactForm());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [instituteId]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const updateFieldValue = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateInstituteContact(instituteId, form);
      setSuccess('Contact details saved.');
    } catch (err) {
      setError(err.message || 'Failed to save contact details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <FormContentSkeleton rows={6} />;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        {FIELDS.map((field) => (
          <Grid item xs={12} md={field.gridSize || 6} key={field.key}>
            <TextField
              label={field.label}
              value={form[field.key] || ''}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              fullWidth
              size="small"
              multiline={!!field.multiline}
              minRows={field.multiline ? 3 : undefined}
              disabled={saving}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving…' : 'Save contact details'}
        </Button>
      </Box>
    </Box>
  );
}
