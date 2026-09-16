import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import {
  fetchInvoiceById, fetchInvoiceLineItems,
  approveInvoice, rejectInvoice, submitInvoice, updateInvoiceLineItemAmounts,
} from '../../api/invoicesApi';

const BASE_STATUS_OPTIONS = ['Pending', 'Invoiced', 'Paid', 'Rejected'];

function normalizeStatusLabel(rawStatus) {
  if (!rawStatus) return '';
  const s = rawStatus.trim().toLowerCase();
  if (s === 'approved' || s === 'paid') return 'Paid';
  if (s === 'pending' || s === 'draft') return 'Pending';
  if (s === 'invoiced' || s === 'pendingapproval') return 'Invoiced';
  if (s === 'rejected') return 'Rejected';
  return rawStatus;
}

export default function EditInvoiceDialog({ open, invoiceId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [status, setStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [editedAmounts, setEditedAmounts] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!open || !invoiceId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([fetchInvoiceById(invoiceId), fetchInvoiceLineItems(invoiceId)])
      .then(([inv, items]) => {
        if (cancelled) return;
        setInvoice(inv);
        setLineItems(items);
        setStatus(normalizeStatusLabel(inv.invoiceStatus));
        const seeded = {};
        items.forEach((item) => {
          seeded[item.id] = String(item.amountRaw ?? 0);
        });
        setEditedAmounts(seeded);
        setSelectedIds([]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load invoice details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, invoiceId]);

  const statusOptions = useMemo(() => {
    const current = normalizeStatusLabel(invoice?.invoiceStatus);

    if (current === 'Paid') {
      return ['Paid'];
    }

    if (current === 'Rejected') {
      return ['Rejected', 'Pending'];
    }

    if (current && !BASE_STATUS_OPTIONS.includes(current)) {
      return [current, ...BASE_STATUS_OPTIONS];
    }
    return BASE_STATUS_OPTIONS;
  }, [invoice]);

  const currentNormalizedStatus = normalizeStatusLabel(invoice?.invoiceStatus);
  const isAmountEditable = currentNormalizedStatus === 'Pending';
  const canSelectRows = isAmountEditable;

  const selectedCount = useMemo(
    () => selectedIds.filter((id) => lineItems.some((item) => item.id === id)).length,
    [selectedIds, lineItems],
  );

  const allSelected =
    lineItems.length > 0 && selectedCount === lineItems.length && canSelectRows;
  const someSelected = selectedCount > 0 && !allSelected;

  const hasAmountChanges = useMemo(() => {
    if (!isAmountEditable) return false;
    return lineItems.some((item) => {
      if (!selectedIds.includes(item.id)) return false;
      const edited = editedAmounts[item.id];
      if (edited === undefined) return false;
      const num = Number(edited);
      if (!Number.isFinite(num)) return false;
      return num !== Number(item.amountRaw ?? 0);
    });
  }, [lineItems, editedAmounts, isAmountEditable, selectedIds]);

  const handleAmountChange = (lineItemId, value) => {
    if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setEditedAmounts((prev) => ({ ...prev, [lineItemId]: value }));
  };

  const toggleRow = (rowId) => {
    if (!canSelectRows) return;
    setSelectedIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
    );
  };

  const toggleSelectAll = () => {
    if (!canSelectRows) return;
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(lineItems.map((item) => item.id));
    }
  };

  const handleClose = () => {
    if (saving) return;
    setInvoice(null);
    setLineItems([]);
    setStatus('');
    setRejectionReason('');
    setEditedAmounts({});
    setSelectedIds([]);
    setError('');
    onClose?.();
  };

  const handleSave = async () => {
    if (!invoiceId || !status) return;

    const statusChanged = status !== currentNormalizedStatus;

    if (!statusChanged && !(isAmountEditable && hasAmountChanges)) {
      handleClose();
      return;
    }

    if (status === 'Rejected' && !rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isAmountEditable && hasAmountChanges) {
        const changedItems = lineItems
          .filter((item) => {
            if (!selectedIds.includes(item.id)) return false;
            const edited = editedAmounts[item.id];
            if (edited === undefined) return false;
            const num = Number(edited);
            return Number.isFinite(num) && num !== Number(item.amountRaw ?? 0);
          })
          .map((item) => ({
            lineItemId: item.id,
            amount: Number(editedAmounts[item.id]),
          }));

        if (changedItems.length > 0) {
          const updatedInvoice = await updateInvoiceLineItemAmounts(invoiceId, changedItems);
          setInvoice(updatedInvoice);
        }
      }

      if (statusChanged) {
        if (status === 'Paid') await approveInvoice(invoiceId);
        else if (status === 'Rejected') await rejectInvoice(invoiceId, rejectionReason.trim());
        else if (status === 'Invoiced') await submitInvoice(invoiceId);
      }

      onUpdated?.();
      handleClose();
    } catch (err) {
      const apiMessage = err.response?.data;
      setError(typeof apiMessage === 'string' ? apiMessage : err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      id: 'select',
      label: (
        <Checkbox
          size="small"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleSelectAll}
          disabled={!canSelectRows || saving || lineItems.length === 0}
        />
      ),
      field: 'select',
      headerSx: { width: 48 },
      render: (row) => (
        <Tooltip
          title={
            canSelectRows
              ? 'Check this row to edit Amount'
              : 'Amount can only be edited while invoice status is Pending'
          }
        >
          <span>
            <Checkbox
              size="small"
              checked={selectedIds.includes(row.id)}
              onChange={() => toggleRow(row.id)}
              disabled={!canSelectRows || saving}
            />
          </span>
        </Tooltip>
      ),
    },
    { id: 'studentName', label: 'Student', field: 'studentName', headerSx: { width: 130 } },
    {
      id: 'description',
      label: 'Description',
      field: 'description',
      cellSx: { whiteSpace: 'normal', wordBreak: 'break-word' },
    },
    {
      id: 'amount',
      label: 'Amount',
      field: 'amount',
      align: 'right',
      headerSx: { width: 110, whiteSpace: 'nowrap' },
      cellSx: { width: 110, whiteSpace: 'nowrap' },
      render: (row) => {
        const rowChecked = selectedIds.includes(row.id);
        if (isAmountEditable && rowChecked) {
          return (
            <TextField
              size="small"
              value={editedAmounts[row.id] ?? ''}
              onChange={(e) => handleAmountChange(row.id, e.target.value)}
              disabled={saving}
              inputProps={{
                inputMode: 'decimal',
                style: { textAlign: 'right' },
              }}
              sx={{ width: 120 }}
            />
          );
        }
        return row.amount;
      },
    },
  ];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Invoice {invoice?.invoiceNumber ? `— ${invoice.invoiceNumber}` : ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Institute"
                  value={invoice?.instituteNameRef || ''}
                  InputProps={{ readOnly: true }}
                  disabled
                />
                <TextField
                  select
                  fullWidth
                  label="Invoice Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={saving}
                >
                  {statusOptions.map((opt) => (
                    <MenuItem
                      key={opt}
                      value={opt}
                      disabled={opt === 'Pending' && currentNormalizedStatus !== 'Pending'}
                    >
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {status === 'Rejected' && (
                <TextField
                  fullWidth
                  label="Rejection Reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={saving}
                  multiline
                  minRows={2}
                  required
                />
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Students on this invoice
                  {selectedCount > 0 ? ` (${selectedCount} selected for amount edit)` : ''}
                </Typography>
                {lineItems.length === 0 ? (
                  <Alert severity="info">No student details found for this invoice.</Alert>
                ) : (
                  <ResponsiveTable
                    columns={columns}
                    rows={lineItems}
                    getRowKey={(row) => row.id}
                    variant="default"
                    tableMinWidth={600}
                  />
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || !status || currentNormalizedStatus === 'Paid'}
          sx={{ textTransform: 'none', bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' }, fontWeight: 600 }}
        >
          {saving ? 'Saving...' : 'Save Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
