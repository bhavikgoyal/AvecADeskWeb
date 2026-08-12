import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import { fetchUniqueInstituteNames } from '../../api/institutesScrappingApi';
import { fetchCoursesByScrappingId } from '../../api/coursesapi';
import { fetchPaidStudentsForInvoice, generateMonthlyInvoice } from '../../api/invoicesApi';

export default function AddInvoiceDialog({ open, onClose, onGenerated }) {
  const now = useMemo(() => new Date(), []);
  const [institutes, setInstitutes] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [instituteId, setInstituteId] = useState('');
  const [campus, setCampus] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // ids of checked rows
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setInstituteId('');
    setCampus('');
    setCampuses([]);
    setStudents([]);
    setSelectedIds([]);
    setError('');
    setGenerating(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingInstitutes(true);
    setError('');
    fetchUniqueInstituteNames()
      .then((data) => {
        if (cancelled) return;
        setInstitutes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load institutes.');
        setInstitutes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInstitutes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !instituteId) {
      setCampuses([]);
      setCampus('');
      setStudents([]);
      setSelectedIds([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingCampuses(true);
    setCampus('');
    setStudents([]);
    setSelectedIds([]);
    setError('');

    // Courses.InstituteId = ScrappingId — unique Campus values only
    fetchCoursesByScrappingId(instituteId)
      .then((data) => {
        if (cancelled) return;
        const list = data?.courses ?? data?.Courses ?? [];
        const unique = [
          ...new Set(
            list
              .map((c) => (c.campus ?? c.Campus ?? '').trim())
              .filter(Boolean),
          ),
        ].sort((a, b) => a.localeCompare(b));
        setCampuses(unique);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load campuses.');
        setCampuses([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCampuses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, instituteId]);

  useEffect(() => {
    if (!open || !instituteId || !campus) {
      setStudents([]);
      setSelectedIds([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingStudents(true);
    setError('');

    fetchPaidStudentsForInvoice({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      instituteId: Number(instituteId),
      campus,
    })
      .then((rows) => {
        if (cancelled) return;
        setStudents(rows);
        // No auto-selection — user must check each student manually.
        setSelectedIds([]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load students.');
        setStudents([]);
        setSelectedIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, instituteId, campus, now]);

  const isPaidRow = (row) => String(row.paymentStatus).toLowerCase() === 'paid';

  const paidStudents = useMemo(() => students.filter(isPaidRow), [students]);
  const paidCount = paidStudents.length;

  const selectedPaidCount = useMemo(
    () => paidStudents.filter((s) => selectedIds.includes(s.id)).length,
    [paidStudents, selectedIds],
  );

  const allPaidSelected =
    paidStudents.length > 0 && selectedPaidCount === paidStudents.length;
  const somePaidSelected = selectedPaidCount > 0 && !allPaidSelected;

  const toggleRow = (row) => {
    if (!isPaidRow(row)) return; // only Paid rows can be invoiced
    setSelectedIds((prev) =>
      prev.includes(row.id)
        ? prev.filter((id) => id !== row.id)
        : [...prev, row.id],
    );
  };

  const toggleSelectAll = () => {
    if (allPaidSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paidStudents.some((s) => s.id === id)));
    } else {
      setSelectedIds((prev) => [
        ...prev.filter((id) => !paidStudents.some((s) => s.id === id)),
        ...paidStudents.map((s) => s.id),
      ]);
    }
  };

  const canGenerate = Boolean(instituteId && campus) && selectedPaidCount > 0;

  const handleClose = () => {
    if (generating) return;
    resetForm();
    onClose?.();
  };

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setError('');
    try {
      const result = await generateMonthlyInvoice({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        instituteId: Number(instituteId),
        campus,
        installmentIds: selectedIds.filter((id) =>
          paidStudents.some((s) => s.id === id),
        ),
      });
      onGenerated?.(result);
      resetForm();
      onClose?.();
    } catch (err) {
      const apiMessage = err.response?.data;
      setError(
        typeof apiMessage === 'string'
          ? apiMessage
          : err.message || 'Failed to generate invoice.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    {
      id: 'select',
      label: (
        <Checkbox
          size="small"
          checked={allPaidSelected}
          indeterminate={somePaidSelected}
          onChange={toggleSelectAll}
          disabled={paidCount === 0}
        />
      ),
      field: 'select',
      render: (row) => (
        <Tooltip title={isPaidRow(row) ? '' : 'Only paid installments can be invoiced'}>
          <span>
            <Checkbox
              size="small"
              checked={selectedIds.includes(row.id)}
              onChange={() => toggleRow(row)}
              disabled={!isPaidRow(row)}
            />
          </span>
        </Tooltip>
      ),
    },
    { id: 'fullName', label: 'Student', field: 'fullName' },
    { id: 'courseName', label: 'Course', field: 'courseName' },
    { id: 'installmentNo', label: 'Installment', field: 'installmentNo' },
    { id: 'feesAmount', label: 'Fees', field: 'feesAmount' },
    { id: 'invoiceAmount', label: 'Invoice Amt', field: 'invoiceAmount' },
    { id: 'paymentStatus', label: 'Status', field: 'paymentStatus' },
  ];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Add Invoice</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              label="Institute"
              value={instituteId}
              onChange={(e) => setInstituteId(e.target.value)}
              disabled={loadingInstitutes || generating}
            >
              {institutes.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              disabled={!instituteId || loadingCampuses || generating}
              helperText={
                !instituteId
                  ? 'Select institute first'
                  : loadingCampuses
                    ? 'Loading campuses...'
                    : campuses.length === 0
                      ? 'No campus found in Courses for this institute'
                      : ' '
              }
            >
              {campuses.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {instituteId && campus && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
                Students — {now.toLocaleString('en', { month: 'long' })} {now.getFullYear()}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--muted)', display: 'block', mb: 1 }}>
                All installments due this month are listed. Only checked (Paid) students will be
                included in the invoice
                {selectedPaidCount > 0 ? ` (${selectedPaidCount} selected)` : ''}.
              </Typography>

              {loadingStudents ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : students.length === 0 ? (
                <Alert severity="info">
                  No student installments found for this institute and campus in the current month.
                </Alert>
              ) : (
                <ResponsiveTable
                  columns={columns}
                  rows={students}
                  getRowKey={(row) => row.id}
                  alwaysTable
                />
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={generating} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          sx={{
            textTransform: 'none',
            bgcolor: 'var(--primary)',
            '&:hover': { bgcolor: 'var(--primary-dark)' },
            fontWeight: 600,
          }}
        >
          {generating ? 'Generating...' : 'Generate Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

