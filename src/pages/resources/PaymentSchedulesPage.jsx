import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import {
  bulkUpdatePaymentScheduleStatus,
  fetchScheduleRows,
  formatCurrency,
  formatDisplayDate,
  updatePaymentScheduleStatus,
} from '../../api/schedulesApi';
import { fetchStudentRows } from '../../api/studentsApi';

const STATUS_OPTIONS = ['Pending', 'Partial', 'Paid'];

function statusColor(status) {
  switch (status) {
    case 'Paid':
      return 'var(--success, #2e7d32)';
    case 'Partial':
      return 'var(--warning, #f59f00)';
    default:
      return 'var(--text-secondary, #757575)';
  }
}


function ScheduleRow({ row, selected, onToggleSelect, draft, onDraftChange, onSaveRow, saving }) {
  const dirty = draft.status !== row.status || String(row.amountPaid ?? '') !== draft.amountPaid;

  return (
    <tr style={{ borderBottom: '1px solid var(--divider, #f0f0f0)' }}>
      <td style={{ padding: '8px 12px' }}>
        <Checkbox size="small" checked={selected} onChange={() => onToggleSelect(row.scheduleId)} />
      </td>
      <td style={{ padding: '8px 12px' }}>{row.studentName}</td>
      <td style={{ padding: '8px 12px' }}>{formatDisplayDate(row.dueDate)}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(row.amountDue)}</td>
      <td style={{ padding: '8px 12px' }}>
        <TextField
          type="number"
          size="small"
          value={draft.amountPaid}
          onChange={(e) => onDraftChange(row.scheduleId, { ...draft, amountPaid: e.target.value })}
          disabled={draft.status === 'Pending'}
          sx={{ width: 110 }}
        />
      </td>
      <td style={{ padding: '8px 12px' }}>
        <TextField
          select
          size="small"
          value={draft.status}
          onChange={(e) => onDraftChange(row.scheduleId, { ...draft, status: e.target.value })}
          sx={{ width: 130 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              <Chip size="small" label={opt} sx={{ bgcolor: `${statusColor(opt)}1A`, color: statusColor(opt) }} />
            </MenuItem>
          ))}
        </TextField>
      </td>
      <td style={{ padding: '8px 12px' }}>{row.notes || '—'}</td>
      <td style={{ padding: '8px 12px' }}>
        <Button size="small" variant="outlined" disabled={!dirty || saving} onClick={() => onSaveRow(row.scheduleId)}>
          {saving ? '...' : 'Save'}
        </Button>
      </td>
    </tr>
  );
}

export default function PaymentSchedulesPage() {
  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drafts, setDrafts] = useState({}); 
  const [savingRowId, setSavingRowId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudentRows()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchScheduleRows(studentFilter || undefined);
      setRows(data);
      setSelectedIds(new Set());
      const nextDrafts = {};
      data.forEach((row) => {
        nextDrafts[row.scheduleId] = { status: row.status, amountPaid: String(row.amountPaid ?? '') };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err.message || 'Failed to load payment schedules.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [studentFilter]);

useEffect(() => {
  const id = setTimeout(() => {
    loadRows();
  }, 0);

  return () => clearTimeout(id);
}, [loadRows]);
  const updateDraft = (scheduleId, nextDraft) => {
    setDrafts((prev) => ({ ...prev, [scheduleId]: nextDraft }));
  };

  // Save a single row immediately (used by the per-row Save button).
  const handleSaveRow = async (scheduleId) => {
    const draft = drafts[scheduleId];
    if (!draft) return;
    setSavingRowId(scheduleId);
    setError('');
    try {
      await updatePaymentScheduleStatus(
        scheduleId,
        draft.status,
        draft.amountPaid === '' ? null : Number(draft.amountPaid),
      );
      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to update schedule status.');
    } finally {
      setSavingRowId(null);
    }
  };

  const toggleSelect = (scheduleId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) next.delete(scheduleId);
      else next.add(scheduleId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.scheduleId))));
  };

  const handleSaveSelected = async () => {
    setBulkSaving(true);
    setError('');
    try {
      const items = Array.from(selectedIds)
        .filter((id) => drafts[id])
        .map((scheduleId) => ({
          scheduleId,
          status: drafts[scheduleId].status,
          amountPaid: drafts[scheduleId].amountPaid === '' ? null : Number(drafts[scheduleId].amountPaid),
        }));
      await bulkUpdatePaymentScheduleStatus(items);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to update the selected schedules.');
    } finally {
      setBulkSaving(false);
    }
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.studentId, label: s.fullName })),
    [students],
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Student Payment Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add schedules per student, track status, and update multiple records at once.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/students/new")}>
          Add Student
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4} sx={{ minWidth: 240 }}>
            <TextField
              select
              label="Filter by student"
              size="small"
              fullWidth
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <MenuItem value="">All students</MenuItem>
              {studentOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {selectedIds.size > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedIds.size} selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Each row keeps its own status/amount — set them in the table below, then save all selected at once.
            </Typography>
            <Button variant="contained" disabled={bulkSaving} onClick={handleSaveSelected}>
              {bulkSaving ? 'Saving...' : 'Save selected'}
            </Button>
            <Button variant="text" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </Toolbar>
        </Paper>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No payment schedules found.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--divider, #e0e0e0)' }}>
                  <th style={{ padding: '8px 12px' }}>
                    <Checkbox size="small" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th style={{ padding: '8px 12px' }}>Student</th>
                  <th style={{ padding: '8px 12px' }}>Due date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount due</th>
                  <th style={{ padding: '8px 12px' }}>Amount paid</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Notes</th>
                  <th style={{ padding: '8px 12px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ScheduleRow
                    key={row.scheduleId}
                    row={row}
                    selected={selectedIds.has(row.scheduleId)}
                    onToggleSelect={toggleSelect}
                    draft={drafts[row.scheduleId] || { status: row.status, amountPaid: String(row.amountPaid ?? '') }}
                    onDraftChange={updateDraft}
                    onSaveRow={handleSaveRow}
                    saving={savingRowId === row.scheduleId}
                  />
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
