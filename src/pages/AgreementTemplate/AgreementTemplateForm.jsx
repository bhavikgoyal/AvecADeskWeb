import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '@mui/material';
import { Box, TextField, Button, Typography, FormControlLabel, Checkbox } from '@mui/material';
import './styles.css';
import {
  fetchAgrrementTemplateById,
  createAgrrementTemplate,
  updateAgrrementTemplate,
} from '../../api/agrrementTemplateApi';
import { Session } from '../../utils/session';

const emptyForm = {
  templateName: '',
  agreementType: '',
  bodyHtml: '',
  isActive: true,
  createdByUserId: 0,
};

export default function AgreementTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && id !== 'new') load();
    else {
      // for new form, populate createdByUserId from session if available
      const uid = Session.getUserId();
      if (uid) setForm((f) => ({ ...f, createdByUserId: uid }));
    }
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      setError('');
      const data = await fetchAgrrementTemplateById(id);
      setForm({
        templateName: data.templateName || '',
        agreementType: data.agreementType || '',
        bodyHtml: data.bodyHtml || '',
        isActive: data.isActive ?? true,
        createdByUserId: data.createdByUserId ?? 0,
      });
    } catch (err) {
      console.error('Load template error', err);
      const resp = err.response || err;
      const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
      const msg = details || 'Failed to load template.';
      setError(msg);
      if (String(msg).toLowerCase().includes('not found')) {
        setTimeout(() => navigate('/agreement-template'), 1200);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const bodyHtml = (form.bodyHtml || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => `<p>${line}</p>`).join('');

    const payload = {
      TemplateName: form.templateName,
      AgreementType: form.agreementType,
      BodyHtml: bodyHtml,
      IsActive: form.isActive,
      CreatedByUserId: form.createdByUserId || Session.getUserId(),
    };
    console.log('Submitting agreement payload:', payload);

    if (id && id !== 'new') {
      try {
        await updateAgrrementTemplate(id, payload);
      } catch (err) {
        console.error('Update template error', err);
        const resp = err.response || err;
        const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
        setError(details || 'Failed to update template.');
        return;
      }
    } else {
      try {
        const result = await createAgrrementTemplate(payload);
        // if backend returns an object (new template) or an id
        const newId = result?.templateId ?? result?.id ?? (typeof result === 'number' ? result : null);
        if (!newId || newId <= 0) {
          const details = result ? JSON.stringify(result) : 'Create did not return a valid id.';
          setError(details);
          return;
        }
      } catch (err) {
        console.error('Create template error', err);
        const resp = err.response || err;
        const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
        setError(details || 'Failed to create template.');
        return;
      }
    }

    navigate('/agreement-template');
  }

  return (
    <Box sx={{ padding: 3 }} className="formRoot">
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>{id && id !== 'new' ? 'Edit Template' : 'New Template'}</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }} className="formField">
          <TextField
            label="Name"
            size="small"
            value={form.templateName}
            onChange={(e) => setForm({ ...form, templateName: e.target.value })}
            sx={{ minWidth: 300 }}
          />

          <TextField
            label="Category"
            size="small"
            value={form.agreementType}
            onChange={(e) => setForm({ ...form, agreementType: e.target.value })}
            sx={{ minWidth: 220 }}
          />
        </Box>

        <Box sx={{ mb: 2 }} className="formField">
          <TextField
            label="Body HTML"
            multiline
            rows={10}
            fullWidth
            value={form.bodyHtml}
            onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
          />
        </Box>

        <FormControlLabel
          control={<Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
          label="Active"
        />

        <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" sx={{ backgroundColor: '#2F80C9' }} disabled={loading}>Save</Button>
          <Button variant="outlined" onClick={() => navigate('/agreement-template')}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
}
