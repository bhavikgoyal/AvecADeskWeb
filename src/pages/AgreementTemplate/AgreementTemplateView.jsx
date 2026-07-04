import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchAgrrementTemplateById } from '../../api/agrrementTemplateApi';
import {
  backButtonSx,
  cardSx,
  fieldWrapSx,
  fullWidthFieldSx,
  gridSx,
  headerRowSx,
  pageSx,
  titleSx,
} from './agreementTemplateFormLayout';

const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', marginBottom: 6 };
const readOnlyInputStyle = {
  display: 'block',
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: '0.875rem',
  color: '#1e293b',
  background: '#f8fafc',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  cursor: 'default',
};
const readOnlyTextareaStyle = {
  ...readOnlyInputStyle,
  minHeight: 220,
  resize: 'none',
  lineHeight: 1.6,
  maxWidth: '100%',
};

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
          View Agreement Template
        </Box>
      </Box>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <Box sx={cardSx}>
        <Box sx={gridSx}>
          <Box sx={fieldWrapSx}>
            <label style={labelStyle}>Template Name</label>
            <input value={form.templateName} readOnly style={readOnlyInputStyle} />
          </Box>

          <Box sx={fieldWrapSx}>
            <label style={labelStyle}>Category</label>
            <input value={form.agreementType} readOnly style={readOnlyInputStyle} />
          </Box>

          <Box sx={fullWidthFieldSx}>
            <label style={labelStyle}>Body Content</label>
            <textarea value={form.bodyHtml} readOnly rows={10} style={readOnlyTextareaStyle} />
          </Box>

          <Box sx={{ ...fieldWrapSx, display: 'flex', alignItems: 'flex-end', pb: 0.25 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.875rem',
                color: '#475569',
                cursor: 'default',
              }}
            >
              <input
                type="checkbox"
                checked={form.isActive}
                readOnly
                disabled
                style={{ width: 18, height: 18, accentColor: '#0084fe', cursor: 'default' }}
              />
              Active
            </label>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
