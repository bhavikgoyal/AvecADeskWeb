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

function validateDraft(draft, amountDue) {
  if (draft.status === 'Partial') {
    const amt = Number(draft.amountPaid);
    if (draft.amountPaid === '' || Number.isNaN(amt)) {
      return 'Enter an amount for Partial status.';
    }
    if (amt <= 0) {
      return 'Partial amount must be greater than 0.';
    }
    if (amt >= amountDue) {
      return `Partial amount must be less than ${amountDue} — use "Paid" instead.`;
    }
  }
  return null;
}

function getTransitionError(currentStatus, newStatus) {
  if (currentStatus === newStatus) return null;

  if (currentStatus === 'Paid') {
    return 'This schedule is already marked Paid and cannot be changed here.';
  }
  if ((currentStatus === 'Partial' || currentStatus === 'Paid') && newStatus === 'Pending') {
    return 'Cannot revert to Pending — a payment has already been recorded.';
  }
  return null;
}

function ScheduleRow({ row, selected, onToggleSelect, draft, onDraftChange, onSaveRow, saving }) {
  const dirty = draft.status !== row.status || String(row.amountPaid ?? '') !== draft.amountPaid;
  const validationError = validateDraft(draft, row.amountDue);
  const transitionError = getTransitionError(row.status, draft.status);
  const rowError = transitionError || validationError;
  const isLocked = row.status === 'Paid'; // 🔒 terminal state — whole row is read-only

  const handleStatusChange = (newStatus) => {
    if (isLocked) return;

    let newAmountPaid = draft.amountPaid;
    if (newStatus === 'Paid') {
      newAmountPaid = String(row.amountDue);
    } else if (newStatus === 'Pending') {
      newAmountPaid = '0';
    } else if (newStatus === 'Partial' && draft.status !== 'Partial') {
      newAmountPaid = '';
    }
    onDraftChange(row.scheduleId, { status: newStatus, amountPaid: newAmountPaid });
  };

  const isAmountLocked = isLocked || draft.status === 'Pending' || draft.status === 'Paid';

  return (
    <tr style={{ borderBottom: '1px solid var(--divider, #f0f0f0)', opacity: isLocked ? 0.7 : 1 }}>
      <td style={{ padding: '8px 12px' }}>
        <Checkbox
          size="small"
          checked={selected}
          onChange={() => onToggleSelect(row.scheduleId)}
          disabled={isLocked}
        />
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
          disabled={isAmountLocked}
          error={Boolean(rowError)}
          helperText={
            isLocked
              ? 'Locked — already paid'
              : rowError
              ? rowError
              : draft.status === 'Paid'
              ? 'Auto-set to amount due'
              : draft.status === 'Pending'
              ? 'Auto-set to zero'
              : ' '
          }
          sx={{ width: 150 }}
        />
      </td>
      <td style={{ padding: '8px 12px' }}>
        <TextField
          select
          size="small"
          value={draft.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isLocked}
          sx={{ width: 130 }}
        >
          {STATUS_OPTIONS.map((opt) => {
            const disallowed = getTransitionError(row.status, opt) !== null && opt !== row.status;
            return (
              <MenuItem key={opt} value={opt} disabled={disallowed}>
                <Chip size="small" label={opt} sx={{ bgcolor: `${statusColor(opt)}1A`, color: statusColor(opt) }} />
              </MenuItem>
            );
          })}
        </TextField>
      </td>
      <td style={{ padding: '8px 12px' }}>{row.notes || '—'}</td>
      <td style={{ padding: '8px 12px' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={!dirty || saving || Boolean(rowError) || isLocked}
          onClick={() => onSaveRow(row.scheduleId)}
        >
          {isLocked ? 'Locked' : saving ? '...' : 'Save row'}
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

  const handleSaveRow = async (scheduleId) => {
    const draft = drafts[scheduleId];
    const row = rows.find((r) => r.scheduleId === scheduleId);
    if (!draft || !row) return;

    const transitionError = getTransitionError(row.status, draft.status);
    if (transitionError) {
      setError(`${row.studentName}: ${transitionError}`);
      return;
    }
    const validationError = validateDraft(draft, row.amountDue);
    if (validationError) {
      setError(`${row.studentName}: ${validationError}`);
      return;
    }

    setSavingRowId(scheduleId);
    setError('');
    try {
      await updatePaymentScheduleStatus(
        scheduleId,
        draft.status,
        draft.status === 'Partial' ? Number(draft.amountPaid) : null,
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
    setSelectedIds((prev) => {
      const selectableRows = rows.filter((r) => r.status !== 'Paid');
      const allSelectableChecked =
        selectableRows.length > 0 && selectableRows.every((r) => prev.has(r.scheduleId));
      return allSelectableChecked ? new Set() : new Set(selectableRows.map((r) => r.scheduleId));
    });
  };

  const handleSaveSelected = async () => {
    setError('');

    const invalidRow = rows.find((row) => {
      if (!selectedIds.has(row.scheduleId)) return false;
      const draft = drafts[row.scheduleId];
      if (!draft) return false;
      return getTransitionError(row.status, draft.status) !== null || validateDraft(draft, row.amountDue) !== null;
    });

    if (invalidRow) {
      const draft = drafts[invalidRow.scheduleId];
      const msg =
        getTransitionError(invalidRow.status, draft.status) || validateDraft(draft, invalidRow.amountDue);
      setError(`${invalidRow.studentName}: ${msg}`);
      return;
    }

    setBulkSaving(true);
    try {
      const items = Array.from(selectedIds)
        .filter((id) => drafts[id])
        .map((scheduleId) => ({
          scheduleId,
          status: drafts[scheduleId].status,
          amountPaid:
            drafts[scheduleId].status === 'Partial' ? Number(drafts[scheduleId].amountPaid) : null,
        }));

      const response = await bulkUpdatePaymentScheduleStatus(items);

      if (response?.failedCount > 0) {
        const rowById = new Map(rows.map((r) => [r.scheduleId, r]));
        const failedDetails = response.items
          .filter((i) => !i.success)
          .map((i) => `${rowById.get(i.scheduleId)?.studentName ?? `#${i.scheduleId}`}: ${i.error}`)
          .join(' | ');
        setError(`${response.updatedCount} updated, ${response.failedCount} failed — ${failedDetails}`);
      } else {
        setError('');
      }

      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to update the selected schedules.');
    } finally {
      setBulkSaving(false);
    }
  };

  const selectableRows = rows.filter((r) => r.status !== 'Paid');
  const allSelected = selectableRows.length > 0 && selectedIds.size === selectableRows.length;

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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/students/new')}>
          Add Student
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
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
              Set each row's status/amount below, then click "Save selected" to update all {selectedIds.size} at
              once. (A row's own "Save row" button only saves that single record. Already-paid rows can't be
              selected.)
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