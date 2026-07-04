import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-toastify';
import {
  fetchAgrrementTemplateById,
  createAgrrementTemplate,
  updateAgrrementTemplate,
} from '../../api/agrrementTemplateApi';
import { Session } from '../../utils/session';
import {
  actionsSx,
  backButtonSx,
  cancelBtnSx,
  cardSx,
  fieldWrapSx,
  fullWidthFieldSx,
  gridSx,
  headerRowSx,
  pageSx,
  submitBtnSx,
  titleSx,
} from './agreementTemplateFormLayout';

const emptyForm = {
  templateName: '',
  agreementType: '',
  bodyHtml: '',
  isActive: true,
  createdByUserId: 0,
};

const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', marginBottom: 6 };
const reqStyle = { color: '#ef4444' };
const inputStyle = {
  display: 'block',
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: '0.875rem',
  color: '#1e293b',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};
const textareaStyle = {
  ...inputStyle,
  minHeight: 220,
  resize: 'vertical',
  lineHeight: 1.6,
  maxWidth: '100%',
};

export default function AgreementTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = id && id !== 'new';

  useEffect(() => {
    if (isEdit) load();
    else {
      const uid = Session.getUserId();
      if (uid) setForm((f) => ({ ...f, createdByUserId: uid }));
    }
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
      setInitialLoading(false);
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
        toast.success('Agreement template updated successfully', { hideProgressBar: true });
      } catch (err) {
        console.error('Update template error', err);
        const resp = err.response || err;
        const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
        setError(details || 'Failed to update template.');
        setLoading(false);
        return;
      }
    } else {
      try {
        const result = await createAgrrementTemplate(payload);
        const newId = result?.templateId ?? result?.id ?? (typeof result === 'number' ? result : null);
        if (!newId || newId <= 0) {
          const details = result ? JSON.stringify(result) : 'Create did not return a valid id.';
          setError(details);
          setLoading(false);
          return;
        }
        toast.success('Agreement template created successfully', { hideProgressBar: true });
      } catch (err) {
        console.error('Create template error', err);
        const resp = err.response || err;
        const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
        setError(details || 'Failed to create template.');
        setLoading(false);
        return;
      }
    }

    navigate('/agreement-template');
  }

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  return (
    <Box sx={pageSx}>
      <Box sx={headerRowSx}>
        <IconButton
          aria-label="Back to agreement templates"
          onClick={() => navigate('/agreement-template')}
          sx={backButtonSx}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box component="h2" sx={titleSx}>
          {isEdit ? 'Edit Agreement Template' : 'Agreement Template Create'}
        </Box>
      </Box>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <Box sx={cardSx}>
        <form onSubmit={handleSubmit} noValidate>
          <Box sx={gridSx}>
            <Box sx={fieldWrapSx}>
              <label style={labelStyle}>
                Template Name <span style={reqStyle}>*</span>
              </label>
              <input
                value={form.templateName}
                onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                style={inputStyle}
              />
            </Box>

            <Box sx={fieldWrapSx}>
              <label style={labelStyle}>
                Category <span style={reqStyle}>*</span>
              </label>
              <input
                value={form.agreementType}
                onChange={(e) => setForm({ ...form, agreementType: e.target.value })}
                placeholder="e.g. Internship, NDA"
                style={inputStyle}
              />
            </Box>

            <Box sx={fullWidthFieldSx}>
              <label style={labelStyle}>
                Body Content <span style={reqStyle}>*</span>
              </label>
              <textarea
                value={form.bodyHtml}
                onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                rows={10}
                style={textareaStyle}
              />
            </Box>

            <Box sx={{ ...fieldWrapSx, display: 'flex', alignItems: 'flex-end', pb: 0.25 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#475569',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#0084fe', cursor: 'pointer' }}
                />
                Active
              </label>
            </Box>
          </Box>

          <Box sx={actionsSx}>
            <Box component="button" type="submit" disabled={loading} sx={submitBtnSx}>
              {isEdit ? 'Update' : 'Create'}
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/agreement-template')}
              sx={cancelBtnSx}
            >
              Cancel
            </Box>
          </Box>
        </form>
      </Box>
    </Box>
  );
}
