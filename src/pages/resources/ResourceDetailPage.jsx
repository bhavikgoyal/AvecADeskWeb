import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import {
  FormBackButton,
  FormPageLayout,
  FormSaveButton,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { getEmptyForm, getRecordLabel, getResourceConfig } from '../../config/resourceConfig';
import { getRecordById, upsertRecord } from '../../utils/resourceStorage';

export default function ResourceDetailPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const resource = getResourceConfig(basePath);
  const existing = getRecordById(basePath, id);
  const [editMode, setEditMode] = useState(location.state?.edit ?? true);
  const [form, setForm] = useState(existing || getEmptyForm(basePath));

  useEffect(() => {
    const record = getRecordById(basePath, id);
    if (record) {
      setForm(record);
      setEditMode(location.state?.edit ?? true);
    }
  }, [basePath, id, location.state?.edit]);

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (editMode) {
      upsertRecord(basePath, { ...form, id: form.id || id });
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  if (!existing) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{resource.singular} not found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(basePath)}>
          Back to list
        </Button>
      </Box>
    );
  }

  return (
    <FormPageLayout
      title={editMode ? `Edit ${resource.singular.toLowerCase()}` : `${resource.singular} details`}
      subtitle={`${getRecordLabel(resource, form)} • ${form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || '—'} • ${form.assignedTo || form.contactPerson || 'Unassigned'}`}
      metaItems={[
        { label: 'ID', value: form.id || id },
        { label: 'Module', value: resource.plural },
        {
          label: 'Status',
          value: form.vendorStatus || form.invoiceStatus || form.taskStatus || form.enrolmentStatus || form.paymentStatus || 'Active',
        },
        { label: 'Mode', value: editMode ? 'Editing' : 'View' },
      ]}
      actions={
        <>
          <FormBackButton onClick={() => navigate(basePath)} />
          <FormSaveButton editMode={editMode} onClick={handleSave} />
        </>
      }
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSectionsLayout
          sections={resource.sections}
          form={form}
          onChange={updateField}
          disabled={!editMode}
        />
      </Paper>
    </FormPageLayout>
  );
}
