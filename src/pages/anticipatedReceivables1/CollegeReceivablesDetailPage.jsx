import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchInvoices } from '../../api/invoicesApi';
import { listOutlinedButtonSx } from '../../components/forms';

const COLORS = {
  border: '#d0d0d0',
  headerBg: '#f3f3f3',
  paidBg: '#c6efce',
  overdueBg: '#ffc7ce',
  overdueText: '#9c0006',
  pendingBg: '#bdd7ee',
};

function fmtMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isReceivedStatus(status) {
  const raw = String(status || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  return (
    raw.includes('paid') ||
    raw === 'approved' ||
    raw.includes('settled') ||
    raw.includes('confirm') ||
    raw === 'received'
  );
}

function classifyInvoice(invoice, todayStart) {
  if (isReceivedStatus(invoice.invoiceStatus)) return 'received';

  const rawDate = invoice.createdAtRaw || invoice.createdAt;
  const date = rawDate && rawDate !== '—' ? new Date(rawDate) : null;
  if (date && !Number.isNaN(date.getTime()) && date < todayStart) return 'overdue';
  return 'pending';
}

function StatCard({ label, amount, count, color }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 160,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderTop: `3px solid ${color}`,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} mt={0.5} sx={{ color }}>
        {fmtMoney(amount)}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.25}>
        {count} invoice{count !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}

function statusChip(bucket) {
  if (bucket === 'received') {
    return <Chip label="Received" size="small" sx={{ bgcolor: COLORS.paidBg, color: '#006100', fontWeight: 600 }} />;
  }
  if (bucket === 'overdue') {
    return <Chip label="Overdue" size="small" sx={{ bgcolor: COLORS.overdueBg, color: COLORS.overdueText, fontWeight: 700 }} />;
  }
  return <Chip label="Pending" size="small" sx={{ bgcolor: COLORS.pendingBg, color: '#1f4e79', fontWeight: 500 }} />;
}

export function CollegeReceivablesDetailView({ collegeName, instituteId, onBack }) {
  const [tab, setTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = await fetchInvoices();
      const targetName = normalizeName(collegeName);
      const filtered = (all || []).filter((inv) => {
        if (instituteId != null && instituteId !== '' && inv.instituteId != null) {
          return String(inv.instituteId) === String(instituteId);
        }
        return normalizeName(inv.instituteNameRef) === targetName;
      });
      setInvoices(filtered);
    } catch (err) {
      setInvoices([]);
      setError(err?.message || 'Failed to load college invoices.');
    } finally {
      setLoading(false);
    }
  }, [collegeName, instituteId]);

  useEffect(() => {
    load();
  }, [load]);

  const classified = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return invoices.map((inv) => ({
      ...inv,
      bucket: classifyInvoice(inv, todayStart),
    }));
  }, [invoices]);

  const summary = useMemo(() => {
    const result = {
      all: { amount: 0, count: 0 },
      received: { amount: 0, count: 0 },
      overdue: { amount: 0, count: 0 },
      pending: { amount: 0, count: 0 },
    };
    for (const inv of classified) {
      const amount = Number(inv.totalAmountRaw) || 0;
      result.all.amount += amount;
      result.all.count += 1;
      if (inv.bucket === 'received') {
        result.received.amount += amount;
        result.received.count += 1;
      } else if (inv.bucket === 'overdue') {
        result.overdue.amount += amount;
        result.overdue.count += 1;
      } else {
        result.pending.amount += amount;
        result.pending.count += 1;
      }
    }
    return result;
  }, [classified]);

  const viewRows = useMemo(() => {
    if (tab === 1) return classified.filter((r) => r.bucket === 'overdue');
    if (tab === 2) return classified.filter((r) => r.bucket === 'received');
    return classified;
  }, [classified, tab]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2.5 }}>
        {onBack ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ ...listOutlinedButtonSx, mb: 1.25 }}
          >
            Back to Receivables
          </Button>
        ) : null}
        <Typography variant="h5" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
          {collegeName || 'College'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Invoices for this college — all, received, overdue and total amount
        </Typography>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {loading ? (
          <Box sx={{ py: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <StatCard label="Total Amount" amount={summary.all.amount} count={summary.all.count} color="var(--primary, #1976d2)" />
            <StatCard label="Received" amount={summary.received.amount} count={summary.received.count} color="#2e7d32" />
            <StatCard label="Overdue" amount={summary.overdue.amount} count={summary.overdue.count} color="#d32f2f" />
            <StatCard label="Pending" amount={summary.pending.amount} count={summary.pending.count} color="#1565c0" />
          </>
        )}
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                All
                <Chip label={summary.all.count} size="small" sx={{ height: 18, fontSize: 11 }} />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Overdue
                <Chip
                  label={summary.overdue.count}
                  size="small"
                  color={summary.overdue.count ? 'error' : 'default'}
                  sx={{ height: 18, fontSize: 11 }}
                />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Received
                <Chip label={summary.received.count} size="small" color="success" sx={{ height: 18, fontSize: 11 }} />
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : viewRows.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No invoices found for this college.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: 1 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    {['Invoice #', 'Status', 'Category', 'Amount', 'Created'].map((label) => (
                      <Box
                        component="th"
                        key={label}
                        sx={{
                          borderBottom: `1px solid ${COLORS.border}`,
                          bgcolor: COLORS.headerBg,
                          px: 1.5,
                          py: 1,
                          textAlign: label === 'Amount' ? 'right' : 'left',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </Box>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewRows.map((row) => (
                    <tr key={row.invoiceId || row.id}>
                      <Box component="td" sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1.1, fontSize: 13, fontWeight: 600 }}>
                        {row.invoiceNumber || '—'}
                      </Box>
                      <Box component="td" sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1.1, fontSize: 13 }}>
                        {row.invoiceStatus || '—'}
                      </Box>
                      <Box component="td" sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1.1 }}>
                        {statusChip(row.bucket)}
                      </Box>
                      <Box component="td" sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1.1, fontSize: 13, textAlign: 'right', fontWeight: 600 }}>
                        {fmtMoney(row.totalAmountRaw)}
                      </Box>
                      <Box component="td" sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1.1, fontSize: 13 }}>
                        {row.createdAt || '—'}
                      </Box>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <Box component="td" colSpan={3} sx={{ bgcolor: '#eee', px: 1.5, py: 1.1, fontSize: 13, fontWeight: 800 }}>
                      TOTAL
                    </Box>
                    <Box component="td" sx={{ bgcolor: '#eee', px: 1.5, py: 1.1, fontSize: 13, fontWeight: 800, textAlign: 'right' }}>
                      {fmtMoney(viewRows.reduce((sum, r) => sum + (Number(r.totalAmountRaw) || 0), 0))}
                    </Box>
                    <Box component="td" sx={{ bgcolor: '#eee' }} />
                  </tr>
                </tfoot>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default function CollegeReceivablesDetailPage() {
  const navigate = useNavigate();
  const { collegeName: collegeNameParam } = useParams();
  const [searchParams] = useSearchParams();
  const collegeName = decodeURIComponent(collegeNameParam || searchParams.get('name') || '');
  const instituteId = searchParams.get('instituteId');

  return (
    <CollegeReceivablesDetailView
      collegeName={collegeName}
      instituteId={instituteId}
      onBack={() => navigate('/reports/receivables')}
    />
  );
}
