import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
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
import CloseIcon from '@mui/icons-material/Close';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  fetchInstituteContacts,
  createInstituteContact,
  updateInstituteContact,
  deleteInstituteContact,
  getEmptyContactForm,
} from '../../api/institutesExtrasApi';
import FormContentSkeleton from '../FormContentSkeleton';

const FIELDS = [
  {
    key: 'contactName',
    label: 'Contact person name',
    placeholder: 'Enter full name',
  },
  {
    key: 'designation',
    label: 'Designation',
    placeholder: 'e.g. Principal, Manager',
  },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'Enter email address',
    inputType: 'email',
  },
  {
    key: 'phone',
    label: 'Phone',
    placeholder: 'Enter phone number',
  },
  {
    key: 'alternatePhone',
    label: 'Alternate phone',
    placeholder: 'Enter alternate phone',
  },
  {
    key: 'address',
    label: 'Address',
    placeholder: 'Enter complete address',
    multiline: true,
    gridSize: 6,
  },
  {
    key: 'notes',
    label: 'Notes',
    placeholder: 'Add any additional notes...',
    multiline: true,
    gridSize: 12,
  },
];

export default function InstituteContactDetailsPanel({ instituteId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptyContactForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadContacts = async () => {
    if (!instituteId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setListError('');
    try {
      const data = await fetchInstituteContacts(instituteId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || 'Failed to load contacts.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(getEmptyContactForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row.id);
    setForm({
      contactName: row.contactName || '',
      designation: row.designation || '',
      email: row.email || '',
      phone: row.phone || '',
      alternatePhone: row.alternatePhone || '',
      address: row.address || '',
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

  const handleSave = async () => {
    setSaving(true);
    setFormError('');

    try {
      if (editingId) {
        await updateInstituteContact(instituteId, editingId, form);
      } else {
        await createInstituteContact(instituteId, form);
      }
      setDialogOpen(false);
      await loadContacts();
    } catch (err) {
      setFormError(err.message || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete contact "${row.contactName || 'this person'}"?`)) return;
    try {
      await deleteInstituteContact(instituteId, row.id);
      await loadContacts();
    } catch (err) {
      setListError(err.message || 'Failed to delete contact.');
    }
  };

  if (!instituteId) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--muted)' }}>
          Please save institute details first to add contacts.
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
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Contact details
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.25 }}>
            Add every point of contact for this institute.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          sx={{ textTransform: 'none' }}
        >
          Add contact
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      {rows.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed var(--card-border)',
            borderRadius: 2,
            py: 5,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
            No contacts saved yet. Click "Add contact" to create one.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8f9fc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.contactName || '—'}</TableCell>
                  <TableCell>{row.designation || '—'}</TableCell>
                  <TableCell>{row.email || '—'}</TableCell>
                  <TableCell>{row.phone || '—'}</TableCell>
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

      
<Dialog
  open={dialogOpen}
  onClose={closeDialog}
  fullWidth
  maxWidth="md"
  PaperProps={{
    sx: {
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: '0 12px 45px rgba(0, 0, 0, 0.12)',
    },
  }}
>
  {/* Header */}
  <DialogTitle
    sx={{
      px: 3,
      py: 2.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      backgroundColor: '#fff',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#eaf2ff',
            color: '#1769e0',
          }}
        >
          <PersonAddAlt1Icon fontSize="medium" />
        </Box>

        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: '#172b4d' }}
          >
            {editingId ? 'Edit contact' : 'Add contact'}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.25 }}
          >
            {editingId
              ? 'Update contact information'
              : 'Add a new institute contact'}
          </Typography>
        </Box>
      </Box>

      <IconButton
        onClick={closeDialog}
        disabled={saving}
        size="small"
        sx={{
          backgroundColor: '#f5f7fa',
          '&:hover': { backgroundColor: '#e9edf3' },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  </DialogTitle>

  {/* Form content */}
  <DialogContent
    sx={{
      px: { xs: 2, sm: 3 },
      py: 3,
      backgroundColor: '#fcfdff',
    }}
  >
    {formError && (
      <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
        {formError}
      </Alert>
    )}

    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: 700,
        color: '#172b4d',
        mb: 2,
      }}
    >
      Contact information
    </Typography>

    <Grid container spacing={2.5}>
      {FIELDS.map((field) => (
        <Grid
          item
          xs={12}
          md={field.gridSize || 6}
          key={field.key}
        >
          <TextField
            label={field.label}
            placeholder={field.placeholder}
            type={field.inputType || 'text'}
            value={form[field.key] || ''}
            onChange={(e) =>
              updateFormField(field.key, e.target.value)
            }
            fullWidth
            size="medium"
            variant="outlined"
            multiline={!!field.multiline}
            minRows={field.multiline ? 3 : undefined}
            disabled={saving}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#fff',
                '& fieldset': {
                  borderColor: '#dce2eb',
                },
                '&:hover fieldset': {
                  borderColor: '#90b4ef',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1769e0',
                  borderWidth: 1.5,
                },
              },
              '& .MuiInputLabel-root': {
                color: '#526581',
                fontWeight: 500,
              },
              '& .MuiInputBase-input': {
                fontSize: '0.9rem',
              },
            }}
          />
        </Grid>
      ))}
    </Grid>
  </DialogContent>

  {/* Footer */}
  <DialogActions
    sx={{
      px: { xs: 2, sm: 3 },
      py: 2,
      borderTop: '1px solid',
      borderColor: 'divider',
      backgroundColor: '#fff',
      gap: 1,
    }}
  >
    <Button
      onClick={closeDialog}
      disabled={saving}
      variant="outlined"
      sx={{
        textTransform: 'none',
        borderRadius: 2,
        px: 2.5,
        borderColor: '#d6deea',
        color: '#526581',
        '&:hover': {
          borderColor: '#aab8cb',
          backgroundColor: '#f7f9fc',
        },
      }}
    >
      Cancel
    </Button>

    <Button
      variant="contained"
      onClick={handleSave}
      disabled={saving}
      startIcon={!saving ? <PersonAddAlt1Icon /> : null}
      sx={{
        textTransform: 'none',
        borderRadius: 2,
        px: 3,
        py: 1,
        fontWeight: 600,
        backgroundColor: '#1769e0',
        boxShadow: '0 3px 8px rgba(23, 105, 224, 0.25)',
        '&:hover': {
          backgroundColor: '#1255b8',
          boxShadow: '0 4px 12px rgba(23, 105, 224, 0.3)',
        },
      }}
    >
      {saving ? 'Saving…' : editingId ? 'Update contact' : 'Save contact'}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}
