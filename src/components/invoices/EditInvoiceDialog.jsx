import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import {
  fetchInvoiceById, fetchInvoiceLineItems,
  approveInvoice, rejectInvoice, submitInvoice,
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

  const handleClose = () => {
    if (saving) return;
    setInvoice(null);
    setLineItems([]);
    setStatus('');
    setRejectionReason('');
    setError('');
    onClose?.();
  };

  const handleSave = async () => {
    if (!invoiceId || !status) return;
    if (status === currentNormalizedStatus) {
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
      if (status === 'Paid') await approveInvoice(invoiceId);
      else if (status === 'Rejected') await rejectInvoice(invoiceId, rejectionReason.trim());
      else if (status === 'Invoiced') await submitInvoice(invoiceId);

      onUpdated?.();
      handleClose();
    } catch (err) {
      const apiMessage = err.response?.data;
      setError(typeof apiMessage === 'string' ? apiMessage : err.message || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
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