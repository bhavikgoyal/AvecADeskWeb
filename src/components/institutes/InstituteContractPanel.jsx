import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRef } from 'react';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  fetchInstituteContracts,
  createInstituteContract,
  updateInstituteContract,
  deleteInstituteContract,
  uploadInstituteContractFile,
  getEmptyContractForm,
} from '../../api/institutesExtrasApi';
import InstituteCommissionRatesPanel from './InstituteCommissionRatesPanel';
import FormContentSkeleton from '../FormContentSkeleton';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InstituteContractPanel({ instituteId, courseLookupId, instituteName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptyContractForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef(null);
  const loadContracts = async () => {
    if (!instituteId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError('');
    try {
      const data = await fetchInstituteContracts(instituteId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || 'Failed to load contracts.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(getEmptyContractForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row.id);
    setForm({
      contractStatus: row.contractStatus || 'Active',
      contractStartDate: row.contractStartDate || '',
      contractEndDate: row.contractEndDate || '',
      contractReferenceNo: row.contractReferenceNo || '',
      contractFileUrl: row.contractFileUrl || '',
      notes: row.notes || '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };
const handleFileSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setFormError('');
  try {
    const url = await uploadInstituteContractFile(instituteId, file);
    updateFormField('contractFileUrl', url);
  } catch (err) {
    setFormError(err.message || 'Failed to upload file.');
  } finally {
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};
  const handleSave = async () => {
    setSaving(true);
    setFormError('');

    try {
      if (editingId) {
        await updateInstituteContract(instituteId, editingId, form);
      } else {
        await createInstituteContract(instituteId, form);
      }
      setDialogOpen(false);
      await loadContracts();
    } catch (err) {
      setFormError(err.message || 'Failed to save contract.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete contract "${row.contractReferenceNo || 'this contract'}"?`)) return;
    try {
      await deleteInstituteContract(instituteId, row.id);
      await loadContracts();
    } catch (err) {
      setListError(err.message || 'Failed to delete contract.');
    }
  };

  if (!instituteId) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--muted)' }}>
          Please save institute details first to add contracts.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return <FormContentSkeleton rows={4} />;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Contracts
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          sx={{ textTransform: 'none' }}
        >
          Add contract
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'var(--muted)', textAlign: 'center', py: 4 }}>
          No contracts saved yet. Click "Add contract" to create one.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Reference no.</TableCell>
                <TableCell>Start date</TableCell>
                <TableCell>End date</TableCell>
                <TableCell>File</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.contractStatus}</TableCell>
                  <TableCell>{row.contractReferenceNo || '—'}</TableCell>
                  <TableCell>{formatDate(row.contractStartDate)}</TableCell>
                  <TableCell>{formatDate(row.contractEndDate)}</TableCell>
                  <TableCell>
                    {row.contractFileUrl ? (
                      <Link href={row.contractFileUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                        View file
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(row)}>
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(row)}>
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit contract' : 'Add contract'}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          <TextField
            select
            label="Contract status"
            value={form.contractStatus || 'Active'}
            onChange={(e) => updateFormField('contractStatus', e.target.value)}
            fullWidth
            size="small"
            disabled={saving}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Terminated">Terminated</MenuItem>
          </TextField>

          <TextField
            label="Contract reference no."
            value={form.contractReferenceNo || ''}
            onChange={(e) => updateFormField('contractReferenceNo', e.target.value)}
            fullWidth
            size="small"
            disabled={saving}
          />
<Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Button
        variant="outlined"
        size="small"
        component="label"
        startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
        disabled={saving || uploading}
        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
      >
        {uploading ? 'Uploading…' : 'Upload file'}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />
      </Button>

      {form.contractFileUrl ? (
        <Link
          href={form.contractFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{ fontSize: '0.875rem' }}
        >
          View uploaded file
        </Link>
      ) : (
        <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
          No file uploaded yet
        </Typography>
      )}
    </Box>

  <TextField
    label="Contract file URL"
    value={form.contractFileUrl || ''}
    onChange={(e) => updateFormField('contractFileUrl', e.target.value)}
    fullWidth
    size="small"
    disabled={saving || uploading}
    helperText="Auto-filled after upload, or paste an external link manually."
  />
</Box>
     

          <Box
  sx={{
    display: 'flex',
    gap: 2,
    mt: 1,
    flexDirection: { xs: 'column', sm: 'row' },
  }}
>
  {/* Start Date */}
  <Box sx={{ flex: 1 }}>
    <Typography
      variant="body2"
      sx={{
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.875rem',
      }}
    >
      Start date
    </Typography>

    <TextField
      type="date"
      value={form.contractStartDate || ''}
      onChange={(e) =>
        updateFormField('contractStartDate', e.target.value)
      }
      fullWidth
      size="small"
      disabled={saving}
    />
  </Box>

  {/* End Date */}
  <Box sx={{ flex: 1 }}>
    <Typography
      variant="body2"
      sx={{
        mb: 0.5,
        color: 'text.secondary',
        fontSize: '0.875rem',
      }}
    >
      End date
    </Typography>

    <TextField
      type="date"
      value={form.contractEndDate || ''}
      onChange={(e) =>
        updateFormField('contractEndDate', e.target.value)
      }
      fullWidth
      size="small"
      disabled={saving}
    />
  </Box>
</Box>

          <TextField
            label="Notes"
            value={form.notes || ''}
            onChange={(e) => updateFormField('notes', e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 3 }} />

      
      <InstituteCommissionRatesPanel
        instituteId={instituteId}
        courseLookupId={courseLookupId}
        instituteName={instituteName}
      />
    </Box>
  );
}
