import React, { useEffect, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import {
  fetchAgrrementTemplateById,
  createAgrrementTemplate,
  updateAgrrementTemplate,
} from '../../api/agrrementTemplateApi';
import { Session } from '../../utils/session';
import {
  FormActions,
  FormPageLayout,
  FormSection,
  FormGridItem,
  formFieldSx,
  formPaperSx,
  listOutlinedButtonSx,
} from '../../components/forms';
import FormContentSkeleton from '../../components/FormContentSkeleton';

const emptyForm = {
  templateName: '',
  agreementType: '',
  bodyHtml: '',
  isActive: true,
  createdByUserId: 0,
};

export default function AgreementTemplateForm() {
  const editorConfig = {
    toolbar: {
      items: [
        'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript',
        '|', 'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', 'highlight',
        '|', 'link', 'specialCharacters',
        '|', 'bulletedList', 'numberedList', 'outdent', 'indent', 'alignment',
        '|', 'insertTable', 'blockQuote', 'codeBlock',
        '|', 'imageUpload', 'mediaEmbed',
        '|', 'removeFormat',
      ],
      shouldNotGroupWhenFull: true,
    },
    image: {
      toolbar: ['imageTextAlternative', 'imageStyle:full', 'imageStyle:side'],
    },
    extraPlugins: [function MyCustomUploadAdapterPlugin(editor) {
      editor.plugins.get('FileRepository').createUploadAdapter = (loader) => ({
        upload() {
          return loader.file.then((file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ default: reader.result });
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }));
        },
        abort() {},
      });
    }],
  };

  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const [htmlMode, setHtmlMode] = useState(false);
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

  async function handleSave() {
    setError('');
    setLoading(true);

    const payload = {
      TemplateName: form.templateName,
      AgreementType: form.agreementType,
      BodyHtml: form.bodyHtml || '',
      IsActive: form.isActive,
      CreatedByUserId: form.createdByUserId || Session.getUserId(),
    };

    if (id && id !== 'new') {
      try {
        await updateAgrrementTemplate(id, payload);
        toast.success('Agreement template updated successfully', { hideProgressBar: true });
      } catch (err) {
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
      <FormPageLayout title={isEdit ? 'Edit Agreement Template' : 'Add Agreement Template'}>
        <FormContentSkeleton rows={8} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title={isEdit ? 'Edit Agreement Template' : 'Add Agreement Template'}>
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
              required
              label="Template name"
              value={form.templateName}
              onChange={(e) => setForm({ ...form, templateName: e.target.value })}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              label="Category"
              placeholder="e.g. Internship, NDA"
              value={form.agreementType}
              onChange={(e) => setForm({ ...form, agreementType: e.target.value })}
              sx={formFieldSx}
            />
          </FormGridItem>
        </FormSection>

        <FormSection title="Body" description="Agreement content. HTML is supported." divider={false}>
          <FormGridItem size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography component="label" sx={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600 }}>
                Body (HTML)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setHtmlMode((v) => !v)}
                sx={listOutlinedButtonSx}
              >
                {htmlMode ? 'Editor' : 'HTML Source'}
              </Button>
            </Box>
            {htmlMode ? (
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={8}
                value={form.bodyHtml || ''}
                onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
                sx={formFieldSx}
              />
            ) : (
              <Box
                sx={{
                  bgcolor: '#fff',
                  border: '1px solid var(--card-border)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  '& .ck-editor__editable': { minHeight: 220 },
                }}
              >
                <CKEditor
                  editor={ClassicEditor}
                  data={form.bodyHtml || ''}
                  config={editorConfig}
                  onChange={(_event, editor) => {
                    setForm((f) => ({ ...f, bodyHtml: editor.getData() }));
                  }}
                />
              </Box>
            )}
          </FormGridItem>
          <FormGridItem size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
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
          onSubmit={handleSave}
          submitLabel={loading ? (isEdit ? 'Updating…' : 'Saving…') : (isEdit ? 'Save' : 'Create')}
          submitDisabled={loading}
        />
      </Paper>
    </FormPageLayout>
  );
}
