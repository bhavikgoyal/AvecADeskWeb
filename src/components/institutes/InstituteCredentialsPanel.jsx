import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  fetchInstituteCredentials,
  createInstituteCredential,
  updateInstituteCredential,
  deleteInstituteCredential,
  getEmptyCredentialForm,
} from '../../api/institutesExtrasApi';
import FormContentSkeleton from '../FormContentSkeleton';

export default function InstituteCredentialsPanel({ instituteId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState(() => new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptyCredentialForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCredentials = async () => {
    setLoading(true);
    setListError('');
    try {
      const data = await fetchInstituteCredentials(instituteId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || 'Failed to load credentials.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(getEmptyCredentialForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      url: row.url || '',
      username: row.username || '',
      password: row.password || '',
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

  const isFormValid =
    form.name.trim() && form.url.trim() && form.username.trim() && form.password.trim();

  const handleSave = async () => {
    if (!isFormValid) {
      setFormError('Name, URL, username and password are all required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingId) {
        await updateInstituteCredential(instituteId, editingId, form);
      } else {
        await createInstituteCredential(instituteId, form);
      }
      setDialogOpen(false);
      await loadCredentials();
    } catch (err) {
      setFormError(err.message || 'Failed to save credential.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete credential "${row.name}"?`)) return;
    try {
      await deleteInstituteCredential(instituteId, row.id);
      await loadCredentials();
    } catch (err) {
      setListError(err.message || 'Failed to delete credential.');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value || '');
    } catch {
      // Ignore clipboard failures (e.g. insecure context).
    }
  };

  if (loading) {
    return <FormContentSkeleton rows={4} />;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Credentials
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={openAddDialog}
          sx={{ textTransform: 'none' }}
        >
          Add credential
        </Button>
      </Box>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {listError}
        </Alert>
      )}

      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'var(--muted)', textAlign: 'center', py: 4 }}>
          No credentials saved yet. Click "Add credential" to create one.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Password</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Link href={row.url} target="_blank" rel="noopener noreferrer" underline="hover">
                      {row.url}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {row.username}
                      <IconButton size="small" onClick={() => handleCopy(row.username)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {visiblePasswordIds.has(row.id) ? row.password : '••••••••'}
                      <IconButton size="small" onClick={() => togglePasswordVisibility(row.id)}>
                        {visiblePasswordIds.has(row.id) ? (
                          <VisibilityOffIcon fontSize="inherit" />
                        ) : (
                          <VisibilityIcon fontSize="inherit" />
                        )}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleCopy(row.password)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
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
        <DialogTitle>{editingId ? 'Edit credential' : 'Add credential'}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => updateFormField('name', e.target.value)}
            fullWidth
            required
            disabled={saving}
          />
          <TextField
            label="URL"
            value={form.url}
            onChange={(e) => updateFormField('url', e.target.value)}
            fullWidth
            required
            disabled={saving}
          />
          <TextField
            label="Username"
            value={form.username}
            onChange={(e) => updateFormField('username', e.target.value)}
            fullWidth
            required
            disabled={saving}
          />
          <TextField
            label="Password"
            value={form.password}
            onChange={(e) => updateFormField('password', e.target.value)}
            fullWidth
            required
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
    </Box>
  );
}
