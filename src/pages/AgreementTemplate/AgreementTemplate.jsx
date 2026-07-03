import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, TextField, Button, Typography } from '@mui/material';
import './styles.css';
import AgreementTemplateTable from './AgreementTemplateTable';
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

  return (
    <div className="root">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <div className="header">
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)' }}>
            Agreement Templates
          </Typography>
        </div>

        <div style={{ width: '100%', marginTop: 15, marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ backgroundColor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <Button
              variant="contained"
              onClick={() => navigate('/agreement-template/new')}
              sx={{ minWidth: 140, height: 40, backgroundColor: '#2F80C9', color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              Add Template
            </Button>
          </div>
        </div>
      </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <AgreementTemplateTable
            templates={templates.filter((t) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (t.templateName || '').toLowerCase().includes(q)
                || (t.agreementType || '').toLowerCase().includes(q)
                || (stripHtml(t.bodyHtml) || '').toLowerCase().includes(q);
            })}
            onDelete={handleDelete}
          />
        )}
      </div>
  );
};

export default AgreementTemplate;
