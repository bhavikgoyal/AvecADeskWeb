import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ResponsiveTable from '../../components/ResponsiveTable';
import TableContentSkeleton from '../../components/TableContentSkeleton';
import {
  LIST_FILTER_ALL,
  isListFilterAll,
  listContainedButtonSx,
  listSearchFieldSx,
  listSelectFieldSx,
  listSelectProps,
  listToolbarActionsSx,
  listToolbarRowSx,
  listToolbarSearchGroupSx,
} from '../../components/forms';
import { createAgent, deleteAgent, fetchAgents, getEmptyAgentForm, updateAgent } from '../../api/agentApi';

const TABLE_MIN_WIDTH = 900;

const tableSx = {
  width: '100%',
  '& table': { width: '100%', minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed' },
  '& .MuiTableCell-root': { whiteSpace: 'nowrap', verticalAlign: 'middle' },
};

const ellipsisSx = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

const FIELDS = [
  { key: 'agentName', label: 'Agent name', placeholder: 'Enter agent name', required: true, gridSize: 6 },
  { key: 'contactPerson', label: 'Contact person', placeholder: 'Enter contact person name', gridSize: 6 },
  { key: 'phoneNo', label: 'Phone', placeholder: 'Enter 10 digit phone number', phone: true, gridSize: 6 },
  { key: 'email', label: 'Email', placeholder: 'Enter email address', inputType: 'email', gridSize: 6 },
  { key: 'address', label: 'Address', placeholder: 'Enter complete address', multiline: true, gridSize: 6 },
  { key: 'notes', label: 'Notes', placeholder: 'Add any additional notes...', multiline: true, gridSize: 6 },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#fff',
    '& fieldset': { borderColor: '#dce2eb' },
    '&:hover fieldset': { borderColor: '#90b4ef' },
    '&.Mui-focused fieldset': { borderColor: '#1769e0', borderWidth: 1.5 },
  },
  '& .MuiInputLabel-root': { color: '#526581', fontWeight: 500 },
  '& .MuiInputBase-input': { fontSize: '0.9rem' },
};

function validateForm(form) {
  if (!form.agentName.trim()) return 'Agent name is required.';
  if (form.phoneNo && !/^\d{10}$/.test(form.phoneNo)) return 'Phone must be exactly 10 digits.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email address is not valid.';
  return '';
}

function TextCell({ value, color = 'var(--text)', fontWeight = 400 }) {
  return (
    <Typography variant="body2" component="span" title={value || ''} sx={{ ...ellipsisSx, color, fontWeight }}>
      {value || '—'}
    </Typography>
  );
}

function StatusChip({ isActive }) {
  return (
    <Chip
      size="small"
      label={isActive ? 'Active' : 'Inactive'}
      sx={{
        fontWeight: 600,
        color: isActive ? '#1b7a3d' : 'var(--muted)',
        bgcolor: isActive ? 'rgba(46, 160, 67, 0.12)' : 'rgba(101, 119, 146, 0.12)',
      }}
    />
  );
}

function AgentDialog({ open, agent, onClose, onSaved }) {
  const [form, setForm] = useState(getEmptyAgentForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(agent ? { ...getEmptyAgentForm(), ...agent } : getEmptyAgentForm());
    setError('');
  }, [open, agent]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSave = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (agent) {
        await updateAgent(agent.id, form);
      } else {
        await createAgent(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save agent.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', boxShadow: '0 12px 45px rgba(0, 0, 0, 0.12)' } }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
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
              <SupportAgentIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#172b4d' }}>
                {agent ? 'Edit agent' : 'Add agent'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {agent ? 'Update agent information' : 'Add a new agent'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={saving}
            size="small"
            sx={{ backgroundColor: '#f5f7fa', '&:hover': { backgroundColor: '#e9edf3' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 3, backgroundColor: '#fcfdff' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#172b4d', mb: 2 }}>
          Agent information
        </Typography>

        <Grid container spacing={2.5}>
          {FIELDS.map((field) => (
            <Grid size={{ xs: 12, sm: field.gridSize }} key={field.key}>
              <TextField
                label={field.label}
                placeholder={field.placeholder}
                type={field.inputType || 'text'}
                required={!!field.required}
                value={form[field.key] || ''}
                onChange={(e) =>
                  updateField(
                    field.key,
                    field.phone ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value,
                  )
                }
                inputProps={field.phone ? { inputMode: 'numeric', maxLength: 10 } : undefined}
                fullWidth
                multiline={!!field.multiline}
                minRows={field.multiline ? 4 : undefined}
                disabled={saving}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Grid>
          ))}
        </Grid>

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Switch
              checked={!!form.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              disabled={saving}
            />
          }
          label={form.isActive ? 'Active' : 'Inactive'}
        />
      </DialogContent>

      <DialogActions
        sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: '#fff', gap: 1 }}
      >
        <Button
          onClick={handleClose}
          disabled={saving}
          variant="outlined"
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, borderColor: '#d6dde8', color: '#344563' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          sx={{ textTransform: 'none', borderRadius: 2, px: 3, fontWeight: 600, boxShadow: 'none' }}
        >
          {saving ? 'Saving...' : agent ? 'Update agent' : 'Save agent'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteAgentDialog({ agent, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [agent]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAgent(agent.id);
      onDeleted();
    } catch (err) {
      setError(err.message || 'Failed to delete agent.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!agent} onClose={() => !deleting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete agent</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2">
          Delete <b>{agent?.agentName}</b>? It will be removed from the list.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleting} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={deleting}
          color="error"
          variant="contained"
          sx={{ textTransform: 'none', boxShadow: 'none' }}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(LIST_FILTER_ALL);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [deletingAgent, setDeletingAgent] = useState(null);

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    try {
      setAgents(await fetchAgents());
    } catch (err) {
      setError(err.message || 'Failed to load agents.');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgents();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, status, rowsPerPage]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((agent) => {
      if (status === 'active' && !agent.isActive) return false;
      if (status === 'inactive' && agent.isActive) return false;
      if (!q) return true;
      return [agent.agentName, agent.contactPerson, agent.phoneNo, agent.email].some((value) =>
        (value || '').toLowerCase().includes(q),
      );
    });
  }, [agents, search, status]);

  const pagedAgents = useMemo(
    () => filteredAgents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredAgents, page, rowsPerPage],
  );

  const openAddDialog = () => {
    setEditingAgent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (agent) => {
    setEditingAgent(agent);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        id: 'agentName',
        label: 'Agent Name',
        field: 'agentName',
        render: (row) => <TextCell value={row.agentName} color="var(--primary)" fontWeight={600} />,
      },
      {
        id: 'contactPerson',
        label: 'Contact Person',
        field: 'contactPerson',
        render: (row) => <TextCell value={row.contactPerson} />,
      },
      {
        id: 'phoneNo',
        label: 'Phone',
        field: 'phoneNo',
        headerSx: { width: 140 },
        cellSx: { width: 140 },
        render: (row) => <TextCell value={row.phoneNo} />,
      },
      {
        id: 'email',
        label: 'Email',
        field: 'email',
        render: (row) => <TextCell value={row.email} />,
      },
      {
        id: 'status',
        label: 'Status',
        field: 'isActive',
        align: 'center',
        headerSx: { width: 110 },
        cellSx: { width: 110 },
        render: (row) => <StatusChip isActive={row.isActive} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        field: 'actions',
        align: 'center',
        headerSx: { width: 110 },
        cellSx: { width: 110 },
        render: (row) => (
          <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
            <IconButton
              size="small"
              aria-label="Edit agent"
              onClick={(event) => {
                event.stopPropagation();
                openEditDialog(row);
              }}
              sx={{ color: 'var(--primary)', bgcolor: 'var(--primary-soft, #e8f2fb)' }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Delete agent"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingAgent(row);
              }}
              sx={{ color: 'var(--danger, #d63939)', bgcolor: 'rgba(214, 57, 57, 0.08)' }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mb: 1.5 }}>
        Agents
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid var(--card-border)' }}>
          <Box sx={listToolbarRowSx}>
            <Box sx={listToolbarSearchGroupSx}>
              <TextField
                size="small"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={listSearchFieldSx}
              />
              <TextField
                select
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                SelectProps={{
                  ...listSelectProps('All statuses'),
                  renderValue: (selected) =>
                    isListFilterAll(selected) ? 'All statuses' : selected === 'active' ? 'Active' : 'Inactive',
                }}
                sx={listSelectFieldSx(!isListFilterAll(status))}
              >
                <MenuItem value={LIST_FILTER_ALL}>All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Box>
            <Box sx={listToolbarActionsSx}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAddDialog} sx={listContainedButtonSx}>
                Add Agent
              </Button>
            </Box>
          </Box>
        </Box>

        {loading ? (
          <TableContentSkeleton
            rows={6}
            columns={[
              { id: 'agentName', label: 'Agent Name', flex: 1.4 },
              { id: 'contactPerson', label: 'Contact Person', flex: 1.2 },
              { id: 'phoneNo', label: 'Phone', flex: 0.9 },
              { id: 'email', label: 'Email', flex: 1.5 },
              { id: 'status', label: 'Status', flex: 0.7 },
              { id: 'actions', label: 'Actions', flex: 0.7, skeletonWidth: 64, skeletonHeight: 28 },
            ]}
          />
        ) : filteredAgents.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {agents.length === 0 ? 'No agents yet. Click "Add Agent" to create one.' : 'No agents match your search.'}
            </Typography>
          </Box>
        ) : (
          <>
            <ResponsiveTable
              columns={columns}
              rows={pagedAgents}
              getRowKey={(row) => row.id}
              variant="resource"
              alwaysTable
              tableMinWidth={TABLE_MIN_WIDTH}
              sx={tableSx}
              onRowClick={openEditDialog}
            />
            <TablePagination
              component="div"
              count={filteredAgents.length}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => setRowsPerPage(parseInt(event.target.value, 10))}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Paper>

      <AgentDialog
        open={dialogOpen}
        agent={editingAgent}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void loadAgents();
        }}
      />

      <DeleteAgentDialog
        agent={deletingAgent}
        onClose={() => setDeletingAgent(null)}
        onDeleted={() => {
          setDeletingAgent(null);
          void loadAgents();
        }}
      />
    </Box>
  );
}
