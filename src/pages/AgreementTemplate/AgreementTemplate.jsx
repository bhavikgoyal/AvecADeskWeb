import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, TextField, Button, Typography, Paper } from '@mui/material';
import AgreementTemplateTable from './AgreementTemplateTable';
import { listContainedButtonSx, listSearchFieldSx, listToolbarRowSx } from '../../components/forms';
import {
  fetchAgrrementTemplates,
  fetchAgrrementTemplateById,
  createAgrrementTemplate,
  updateAgrrementTemplate,
  deleteAgrrementTemplate,
} from '../../api/agrrementTemplateApi';

const emptyForm = {
  templateName: '',
  agreementType: '',
  bodyHtml: '',
  isActive: true,
  createdByUserId: 0,
};

const AgreementTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAgrrementTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.error('Load templates error', err);
      const resp = err.response || err;
      const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
      setError(details || 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  async function openEdit(id) {
    const data = await fetchAgrrementTemplateById(id);
    setForm({
      templateName: data.templateName || '',
      agreementType: data.agreementType || '',
      bodyHtml: data.bodyHtml || '',
      isActive: data.isActive ?? true,
      createdByUserId: data.createdByUserId ?? 0,
    });
    setEditingId(id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    setError('');
    try {
      await deleteAgrrementTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Delete template error', err);
      const resp = err.response || err;
      const details = resp?.data ? JSON.stringify(resp.data) : resp?.statusText || err.message;
      setError(details || 'Failed to delete template.');
    }
  }

  function stripHtml(html) {
    if (!html) return '';
    // basic strip tags
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      TemplateName: form.templateName,
      AgreementType: form.agreementType,
      BodyHtml: form.bodyHtml,
      IsActive: form.isActive,
      CreatedByUserId: form.createdByUserId,
    };

    if (editingId) {
      await updateAgrrementTemplate(editingId, payload);
    } else {
      await createAgrrementTemplate(payload);
    }

    setShowForm(false);
    await loadTemplates();
  }

  const navigate = useNavigate();

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.templateName || '').toLowerCase().includes(q)
      || (t.agreementType || '').toLowerCase().includes(q)
      || (stripHtml(t.bodyHtml) || '').toLowerCase().includes(q)
    );
  });

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: 'var(--text)',
          mb: 1.5,
        }}
      >
        Agreement Templates
      </Typography>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid var(--card-border)',
          borderRadius: 2,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid var(--card-border)' }}>
          <Box sx={listToolbarRowSx}>
            <TextField
              size="small"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={listSearchFieldSx}
            />

            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/agreement-template/new')}
              sx={listContainedButtonSx}
            >
              Add Template
            </Button>
          </Box>
        </Box>

        <AgreementTemplateTable
          templates={filteredTemplates}
          onDelete={handleDelete}
          loading={loading}
        />
      </Paper>
    </Box>
  );
};

export default AgreementTemplate;
