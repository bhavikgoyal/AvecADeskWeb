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
import {
  fetchUniqueInstituteNames,
  getCampusesForInstitute,
  getUniqueInstituteNames,
  resolveScrappingId,
} from '../../api/institutesScrappingApi';
import {
  fetchPaidStudentsForInvoice,
  generateMonthlyInvoice,
  fetchSettledPaymentStatuses,
  updateInstallmentFeesAndInvoiceAmounts,
} from '../../api/invoicesApi';

function isValidAmountInput(value) {
  return value === '' || /^\d*\.?\d{0,2}$/.test(value);
}

export default function AddInvoiceDialog({
  open,
  onClose,
  onGenerated,
  initialInstituteName = '',
  initialCampus = '',
  lockInstitute = false,
}) {
  const now = useMemo(() => new Date(), []);
  const [institutes, setInstitutes] = useState([]);
  const [instituteName, setInstituteName] = useState('');
  const [campus, setCampus] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editedFees, setEditedFees] = useState({});
  const [editedInvoiceAmts, setEditedInvoiceAmts] = useState({});
  const [editedBonuses, setEditedBonuses] = useState({});
  const [loadingInstitutes, setLoadingInstitutes] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [paidStatuses, setPaidStatuses] = useState([
    'paid',
    'paidbycollege',
    'paidbystudent',
    'confirmedbycollege',
    'confirmedbystudent',
  ]);

  const uniqueInstituteNames = useMemo(
    () => getUniqueInstituteNames(institutes),
    [institutes],
  );

  const campuses = useMemo(
    () => getCampusesForInstitute(institutes, instituteName),
    [institutes, instituteName],
  );

  const resolvedInstituteId = useMemo(() => {
    if (!instituteName || !campus) return '';
    return resolveScrappingId(institutes, instituteName, campus);
  }, [institutes, instituteName, campus]);

  const resetForm = useCallback(() => {
    setInstituteName('');
    setCampus('');
    setStudents([]);
    setSelectedIds([]);
    setEditedFees({});
    setEditedInvoiceAmts({});
    setError('');
    setGenerating(false);
    setEditedBonuses({});
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
    if (!open) return;
    if (initialInstituteName) {
      setInstituteName(initialInstituteName);
    }
    if (initialCampus) {
      setCampus(initialCampus);
    }
  }, [open, initialInstituteName, initialCampus]);

  useEffect(() => {
    if (!open || !resolvedInstituteId || !campus) {
      setStudents([]);
      setSelectedIds([]);
      setEditedFees({});
      setEditedInvoiceAmts({});
      return undefined;
    }

    let cancelled = false;
    setLoadingStudents(true);
    setError('');

    fetchPaidStudentsForInvoice({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      instituteId: Number(resolvedInstituteId),
      campus,
    })
      .then((rows) => {
        if (cancelled) return;
        setStudents(rows);
        setSelectedIds([]);
        const feesSeed = {};
        const invoiceSeed = {};
        const bonusSeed = {};
        rows.forEach((row) => {
          feesSeed[row.id] = String(row.feesAmountRaw ?? 0);
          invoiceSeed[row.id] = String(row.invoiceAmountRaw ?? 0);
          bonusSeed[row.id] = String(row.bonusAmountRaw ?? 0);
        });
        setEditedFees(feesSeed);
        setEditedInvoiceAmts(invoiceSeed);
        setEditedBonuses(bonusSeed);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load students.');
        setStudents([]);
        setSelectedIds([]);
        setEditedFees({});
        setEditedInvoiceAmts({});
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resolvedInstituteId, campus, now]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetchSettledPaymentStatuses()
      .then((list) => {
        if (cancelled) return;

        if (Array.isArray(list) && list.length > 0) {
          setPaidStatuses(
            list.map((status) => String(status).trim().toLowerCase()),
          );
        }
      })
      .catch(() => {
        // Keep fallback statuses
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const isPaidRow = useCallback(
    (row) =>
      paidStatuses.includes(String(row?.paymentStatus ?? '').trim().toLowerCase()),
    [paidStatuses],
  );

  const paidStudents = useMemo(
    () => students.filter(isPaidRow),
    [students, isPaidRow],
  );
  const paidCount = paidStudents.length;

  const selectedPaidCount = useMemo(
    () => paidStudents.filter((s) => selectedIds.includes(s.id)).length,
    [paidStudents, selectedIds],
  );
const totalInvoiceAmount = useMemo(() => {
  const rowsToTotal =
    selectedIds.length > 0
      ? students.filter((row) => selectedIds.includes(row.id))
      : students;

  return rowsToTotal.reduce(
    (total, row) =>
      total + Number(editedInvoiceAmts[row.id] || 0),
    0
  );
}, [students, selectedIds, editedInvoiceAmts]);
  const allPaidSelected =
    paidStudents.length > 0 && selectedPaidCount === paidStudents.length;
  const somePaidSelected = selectedPaidCount > 0 && !allPaidSelected;

  const toggleRow = (row) => {
   // if (!isPaidRow(row)) return;
    setSelectedIds((prev) =>
      prev.includes(row.id)
        ? prev.filter((id) => id !== row.id)
        : [...prev, row.id],
    );
  };

  const toggleSelectAll = () => {
    if (allPaidSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paidStudents.some((s) => s.id === id)),
      );
    } else {
      setSelectedIds((prev) => [
        ...prev.filter((id) => !paidStudents.some((s) => s.id === id)),
        ...paidStudents.map((s) => s.id),
      ]);
    }
  };

  const handleFeesChange = (rowId, value) => {
    if (!isValidAmountInput(value)) return;
    setEditedFees((prev) => ({ ...prev, [rowId]: value }));
  };

  const handleInvoiceAmtChange = (rowId, value) => {
    if (!isValidAmountInput(value)) return;
    setEditedInvoiceAmts((prev) => ({ ...prev, [rowId]: value }));
  };
const handleBonusChange = (rowId, value) => {
  if (!isValidAmountInput(value)) return;

  setEditedBonuses((prev) => ({
    ...prev,
    [rowId]: value,
  }));
};
  const canGenerate = Boolean(resolvedInstituteId && campus) && selectedPaidCount > 0;

  const handleClose = () => {
    if (generating) return;
    resetForm();
    onClose?.();
  };

  const handleInstituteChange = (value) => {
    setInstituteName(value);
    setCampus('');
    setStudents([]);
    setSelectedIds([]);
    setEditedFees({});
    setEditedInvoiceAmts({});
  };

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setError('');
    try {
      const selectedPaid = paidStudents.filter((s) => selectedIds.includes(s.id));

      const amountUpdates = selectedPaid
        .map((row) => {
          const feesNum = Number(editedFees[row.id]);
          const invoiceNum = Number(editedInvoiceAmts[row.id]);
          const feesChanged =
            Number.isFinite(feesNum) && feesNum !== Number(row.feesAmountRaw ?? 0);
          const invoiceChanged =
            Number.isFinite(invoiceNum) &&
            invoiceNum !== Number(row.invoiceAmountRaw ?? 0);

          if (!feesChanged && !invoiceChanged) return null;

          return {
            installmentId: Number(row.id),
            feesAmount: feesChanged ? feesNum : null,
            invoiceAmount: invoiceChanged ? invoiceNum : null,
          };
        })
        .filter(Boolean);

      if (amountUpdates.length > 0) {
        await updateInstallmentFeesAndInvoiceAmounts(amountUpdates);
      }

      const result = await generateMonthlyInvoice({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        instituteId: Number(resolvedInstituteId),
        campus,
        installmentIds: selectedPaid.map((s) => s.id),
      });
      onGenerated?.(result);
      resetForm();
      onClose?.();
    } catch (err) {
      const apiMessage = err.response?.data;
      setError(
        typeof apiMessage === 'string'
          ? apiMessage
          : apiMessage?.message || err.message || 'Failed to generate invoice.',
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
          disabled={paidCount === 0 || generating}
        />
      ),
      field: 'select',
      render: (row) => (
        <Tooltip
          title={
            isPaidRow(row)
              ? 'Checked rows can edit Fees / Invoice Amt and will be included in the invoice'
              : 'Only settled (paid/confirmed) installments can be selected. Partial and Pending stay disabled.'
          }
        >
          <span>
            <Checkbox
              size="small"
              checked={selectedIds.includes(row.id)}
              onChange={() => toggleRow(row)}
              disabled={generating}
            />
          </span>
        </Tooltip>
      ),
    },
    { id: 'fullName', label: 'Student', field: 'fullName' },
 {
  id: 'courseName',
  label: 'Course',
  field: 'courseName',
  render: (row) => (
    <Typography
      variant="body2"
      sx={{
        display: 'block',
        width: 150,
        maxWidth: 150,
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
        wordBreak: 'normal',
        lineHeight: 1.4,
      }}
    >
      {row.courseName || '-'}
    </Typography>
  ),
},
    {
  id: 'installmentNo',
  label: 'Installment',
  field: 'installmentNo',
  render: (row) => (
    <Typography
      variant="body2"
      sx={{
        display: 'block',
        minWidth: 70,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {row.installmentNo}
    </Typography>
  ),
},
    { id: 'feesAmount', label: 'Fees',  field: 'feesAmount', render: (row) => row.feesAmount,},
    {
      id: 'invoiceAmount',
      label: 'Invoice Amt',
      field: 'invoiceAmount',
      render: (row) => {
        const checked = selectedIds.includes(row.id);
        if (checked && isPaidRow(row)) {
          return (
           <TextField
  size="small"
  value={editedInvoiceAmts[row.id] ?? ''}
  onChange={(e) =>
    handleInvoiceAmtChange(row.id, e.target.value)
  }
  disabled={generating}
  inputProps={{
    inputMode: 'decimal',
    style: { textAlign: 'center' },
  }}
  sx={{
    width: 120,
    '& .MuiOutlinedInput-root': {
      borderRadius: '4px',
    },
  }}
/>
          );
        }
        return row.invoiceAmount;
      },
    },
    {
  id: 'bonus',
  label: 'Bonus',
  field: 'bonus',
  render: (row) => {
    const checked = selectedIds.includes(row.id);

    if (checked) {
      return (
        <TextField
  size="small"
  value={editedBonuses[row.id] ?? ''}
  onChange={(e) =>
    handleBonusChange(row.id, e.target.value)
  }
  disabled={generating}
  inputProps={{
    inputMode: 'decimal',
    style: { textAlign: 'center' },
  }}
  sx={{
    width: 110,
    ml: 1,
    '& .MuiOutlinedInput-root': {
      borderRadius: '4px',
    },
  }}
/>
      );
    }

    return row.bonusAmount ?? '-';
  },
},
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
              value={instituteName}
              onChange={(e) => handleInstituteChange(e.target.value)}
              disabled={
                loadingInstitutes ||
                generating ||
                Boolean(initialInstituteName) ||
                lockInstitute
              }
            >
              {uniqueInstituteNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              disabled={!instituteName || generating}
              helperText={
                !instituteName
                  ? 'Select institute first'
                  : campuses.length === 0
                    ? 'No campus available'
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

          {resolvedInstituteId && campus && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
                Students — {now.toLocaleString('en', { month: 'long' })}{' '}
                {now.getFullYear()}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'var(--muted)', display: 'block', mb: 1 }}
              >
                All installments due this month are listed. Only checked (Paid)
                students will be included in the invoice
                {selectedPaidCount > 0
                  ? ` (${selectedPaidCount} selected)`
                  : ''}
                . Fees and Invoice Amt become editable after you check a row.
              </Typography>

              {loadingStudents ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : students.length === 0 ? (
                <Alert severity="info">
                  No student installments found for this institute and campus in
                  the current month.
                </Alert>
              ) : (
                <ResponsiveTable
                  columns={columns}
                  rows={students}
                  getRowKey={(row) => row.id}
                  alwaysTable
                  showInvoiceTotal
                  totalInvoiceAmount={totalInvoiceAmount}
                  sx={{
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}
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
