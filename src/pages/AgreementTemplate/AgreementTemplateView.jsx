import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
} from '@mui/material';
import { fetchAgrrementTemplateById } from '../../api/agrrementTemplateApi';
import {
  FormActions,
  FormGridItem,
  FormPageLayout,
  FormSection,
  formFieldSx,
  formPaperSx,
} from '../../components/forms';
import FormContentSkeleton from '../../components/FormContentSkeleton';

export default function AgreementTemplateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    templateName: '',
    agreementType: '',
    bodyHtml: '',
    isActive: true,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setInitialLoading(true);
    try {
      setError('');
      const data = await fetchAgrrementTemplateById(id);
      setForm({
        templateName: data.templateName || '',
        agreementType: data.agreementType || '',
        bodyHtml: data.bodyHtml || '',
        isActive: data.isActive ?? true,
      });
    } catch (err) {
      const resp = err.response || err;
      const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
      const msg = details || 'Failed to load template.';
      setError(msg);
      if (String(msg).toLowerCase().includes('not found')) {
        setTimeout(() => navigate('/agreement-template'), 1200);
      }
    } finally {
      setInitialLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <FormPageLayout title="View Agreement Template">
        <FormContentSkeleton rows={8} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title="View Agreement Template">
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSection title="Template" description="Name and category for this agreement." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              label="Template name"
              value={form.templateName}
              InputProps={{ readOnly: true }}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              label="Category"
              value={form.agreementType}
              InputProps={{ readOnly: true }}
              sx={formFieldSx}
            />
          </FormGridItem>
        </FormSection>

        <FormSection title="Body" description="Agreement content." divider={false}>
          <FormGridItem size={{ xs: 12 }}>
            <TextField
              size="small"
              fullWidth
              label="Body (HTML)"
              multiline
              minRows={8}
              value={form.bodyHtml}
              InputProps={{ readOnly: true }}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  disabled
                  sx={{ color: 'var(--primary)', '&.Mui-checked': { color: 'var(--primary)' } }}
                />
              }
              label="Active"
              sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.875rem' } }}
            />
          </FormGridItem>
        </FormSection>

        <FormActions
          onCancel={() => navigate('/agreement-template')}
          cancelLabel="Back"
          onSubmit={() => navigate(`/agreement-template/${id}/edit`)}
          submitLabel="Edit"
        />
      </Paper>
    </FormPageLayout>
  );
}
