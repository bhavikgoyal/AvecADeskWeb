import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper } from '@mui/material';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getResourceConfig, getRecordLabel, isFormValid } from '../../config/resourceConfig';
import { upsertRecord } from '../../utils/resourceStorage';

export default function NewResourcePage({ basePath }) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);
  const [form, setForm] = useState(() => getEmptyForm(basePath));

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    const codeField = form.vendorCode || form.invoiceNumber || form.enrollmentNumber || '';
    const id = codeField.trim() || `${resource.singular.toLowerCase().replace(/\s/g, '-')}-${Date.now()}`;
    upsertRecord(basePath, { ...form, id, name: getRecordLabel(resource, form) });
    navigate(basePath);
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
        <FormActions
          onCancel={() => navigate(basePath)}
          onSubmit={handleCreate}
          submitLabel={resource.actionLabel}
          submitDisabled={!isFormValid(resource, form)}
        />
      </Paper>
    </FormPageLayout>
  );
}
