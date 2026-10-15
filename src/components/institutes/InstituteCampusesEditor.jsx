import { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { FormSection } from '../forms';

const EMPTY_DRAFT = { campus: '', country: '', city: '', state: '', zipCode: '', address: '' };

const FIELDS = [
  { key: 'campus', label: 'Campus', required: true, size: { xs: 12, md: 4 } },
  { key: 'country', label: 'Country', size: { xs: 12, md: 4 } },
  { key: 'city', label: 'City', size: { xs: 12, md: 4 } },
  { key: 'state', label: 'State', size: { xs: 12, md: 6 } },
  { key: 'zipCode', label: 'Zip code', size: { xs: 12, md: 6 } },
  { key: 'address', label: 'Address', multiline: true, size: { xs: 12 } },
];

const COLUMNS = [
  { key: 'campus', label: 'Campus' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'Zip code' },
  { key: 'address', label: 'Address' },
];

let tempKeySeed = 0;
const newCampusKey = () => {
  tempKeySeed += 1;
  return `new-${Date.now()}-${tempKeySeed}`;
};

export default function InstituteCampusesEditor({ campuses = [], onChange, disabled = false }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingKey, setEditingKey] = useState(null);
  const [error, setError] = useState('');

  const updateDraft = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setEditingKey(null);
    setError('');
  };

  const handleSubmit = () => {
    const campusName = draft.campus.trim();
    if (!campusName) {
      setError('Campus is required.');
      return;
    }

    const duplicate = campuses.some(
      (c) => c.key !== editingKey && String(c.campus || '').trim().toLowerCase() === campusName.toLowerCase(),
    );
    if (duplicate) {
      setError('This campus is already added.');
      return;
    }

    const cleaned = Object.fromEntries(
      Object.entries(draft).map(([field, value]) => [field, String(value ?? '').trim()]),
    );

    if (editingKey) {
      onChange(campuses.map((c) => (c.key === editingKey ? { ...c, ...cleaned } : c)));
    } else {
      onChange([...campuses, { key: newCampusKey(), campusId: null, ...cleaned }]);
    }
    resetDraft();
  };

  const handleEdit = (row) => {
    setDraft({
      campus: row.campus ?? '',
      country: row.country ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      zipCode: row.zipCode ?? '',
      address: row.address ?? '',
    });
    setEditingKey(row.key);
    setError('');
  };

  const handleDelete = (row) => {
    onChange(campuses.filter((c) => c.key !== row.key));
    if (editingKey === row.key) resetDraft();
  };

  return (
    <Box sx={{ mt: { xs: 1.25, md: 1.5 } }}>
      <FormSection title="Campuses" description="Add one or more campuses for this institute." divider={false}>
        <Grid size={{ xs: 12, md: 10 }}>
          <Grid container spacing={{ xs: 1.25, md: 1.5 }}>
            {FIELDS.map((field) => (
              <Grid key={field.key} size={field.size}>
                <TextField
                  fullWidth
                  size="small"
                  label={field.label}
                  required={field.required}
                  multiline={field.multiline}
                  minRows={field.multiline ? 3 : undefined}
                  value={draft[field.key]}
                  onChange={(e) => updateDraft(field.key, e.target.value)}
                  disabled={disabled}
                  error={field.key === 'campus' && Boolean(error)}
                  helperText={field.key === 'campus' ? error : undefined}
                  sx={{ bgcolor: '#fff' }}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={editingKey ? null : <AddIcon />}
            onClick={handleSubmit}
            disabled={disabled}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {editingKey ? 'Update Campus' : 'Add Campus'}
          </Button>
          {editingKey && (
            <Button
              variant="outlined"
              onClick={resetDraft}
              disabled={disabled}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
          )}
        </Grid>

        <Grid size={{ xs: 12 }}>
          {campuses.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'var(--muted)', py: 1 }}>
              No campus added yet.
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid var(--card-border)', borderRadius: 2, bgcolor: '#fff' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 48 }}>#</TableCell>
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} sx={{ fontWeight: 700 }}>
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 700, width: 96 }} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campuses.map((row, index) => (
                    <TableRow key={row.key} selected={row.key === editingKey}>
                      <TableCell>{index + 1}</TableCell>
                      {COLUMNS.map((col) => (
                        <TableCell key={col.key} sx={{ whiteSpace: col.key === 'address' ? 'normal' : 'nowrap' }}>
                          {String(row[col.key] ?? '').trim() || '-'}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <span>
                            <IconButton size="small" onClick={() => handleEdit(row)} disabled={disabled}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <span>
                            <IconButton size="small" color="error" onClick={() => handleDelete(row)} disabled={disabled}>
                              <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </FormSection>
    </Box>
  );
}
