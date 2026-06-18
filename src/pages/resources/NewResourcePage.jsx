import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, getRecordLabel, isFormValid } from '../../config/resourceConfig';
import { upsertRecord } from '../../utils/resourceStorage';
import { createEmailTemplate } from '../../api/emailTemplates';
import { createReminderRule } from '../../api/reminderApi';

export default function NewResourcePage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };


const handleCreate = async () => {
    setError('');
    setSubmitting(true);

    try {
      // 1. Email Templates handling
      if (basePath === '/templates') {
        const payload = {
          Name: form.templateName,
          Subject: form.subject,
          BodyHtml: form.bodyHtml,
          Category: form.category,
        };
        const created = await createEmailTemplate(payload);
        upsertRecord(basePath, {
          ...form,
          id: created.templateId ?? created.TemplateId,
          name: getRecordLabel(resource, form),
        });
      } 
      // 2. NEW: Reminder Rules handling
      else if (basePath === '/reminders') {
        const payload = {
          RuleType: form.ruleType,
          TriggerAfterDays: parseInt(form.triggerAfterDays),
          IntervalDays: parseInt(form.intervalDays),
          EmailTemplateId: 1, 
          IsActive: form.isActive === 'Yes',
        };
        const createdRule = await createReminderRule(payload);
        upsertRecord(basePath, { ...createdRule, id: createdRule.ruleId });
      }
      // 3. Default Local Storage handling
      else {
        const codeField = form.vendorCode || form.invoiceNumber || form.enrollmentNumber || '';
        const id = codeField.trim() || `${resource.singular.toLowerCase().replace(/\s/g, '-')}-${crypto.randomUUID()}`;
        upsertRecord(basePath, { ...form, id, name: getRecordLabel(resource, form) });
      }

      navigate(basePath);
    } catch (err) {
      console.error('Create failed:', err);
      setError('Failed to create record. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={`Add new ${resource.singular.toLowerCase()}`}
      subtitle={`Complete all required fields per the ${resource.plural} module specification.`}
      metaItems={[
        { label: 'Module', value: resource.plural },
        { label: 'Status', value: 'Draft' },
        { label: 'Required', value: `${resource.requiredFields?.length || 0} fields` },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSectionsLayout sections={resource.sections} form={form} onChange={updateField} />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={submitting ? 'Saving...' : resource.actionLabel}
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}