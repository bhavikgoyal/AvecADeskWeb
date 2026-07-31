import { useCallback, useEffect, useState, Fragment } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, IconButton,
  FormControl, InputLabel, MenuItem, Select,
  Tab, Tabs, TextField, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  fetchAnticipated,
  fetchOverdue,
  fetchReceivablesSummary,
  fetchReceivedInvoices,
  fetchInvoiceLineItems,
} from '../../api/receivablesApi';
import { fetchInstitutes, fetchStudentsLookup } from '../../api/lookupApi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric'
  });
}

function exportCsv(rows, headers, filename) {
  const lines = [
    headers.map((h) => `"${h.label}"`).join(','),
    ...rows.map((row) => headers.map((h) => `"${row[h.key] ?? ''}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows, headers, filename) {
  const wsData = [
    headers.map((h) => h.label),
    ...rows.map((row) => headers.map((h) => row[h.key] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

function exportPdf(rows, headers, filename, title) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [headers.map((h) => h.label)],
    body: rows.map((row) => headers.map((h) => row[h.key] ?? '')),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [25, 118, 210] },
  });
  doc.save(filename);
}

function StatCard({ label, amount, count, color }) {
  return (
    <Box sx={{ flex: 1, minWidth: 180, p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${color}`, bgcolor: 'background.paper' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={700} mt={0.5}>{fmt(amount)}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.25}>{count ?? 0} record{count !== 1 ? 's' : ''}</Typography>
    </Box>
  );
}


function InstallmentCardList({ rows, loading, variant }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={32} /></Box>;
  if (!rows.length) return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No records found.</Typography>;

  const isOverdue = variant === 'overdue';
  const avatarColor = isOverdue ? 'error.main' : 'primary.main';

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rows.map((row, i) => {
        const rowId = row.scheduleId ?? i;
        const isExpanded = expandedId === rowId;

        return (
          <Box
            key={rowId}
            sx={{
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              overflow: 'hidden',
            }}
          >
            {/* Clickable header row */}
            <Box
              onClick={() => toggleExpand(rowId)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.75,
                cursor: 'pointer',
              }}
            >
              <IconButton size="small" sx={{ p: 0 }}>
                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
              </IconButton>

              {/* Avatar */}
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  bgcolor: avatarColor,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {(row.studentName || '?').charAt(0).toUpperCase()}
              </Box>

              {/* Student + details */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                    {row.studentName}
                  </Typography>
                  <Chip
                    label={row.status}
                    size="small"
                    color={isOverdue ? 'error' : 'default'}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 600 }}
                  />
                  {isOverdue && row.agingBucket && (
                    <Chip
                      icon={<ReceiptLongIcon sx={{ fontSize: 13 }} />}
                      label={row.agingBucket}
                      size="small"
                      color={row.agingBucket?.includes('90') ? 'error' : row.agingBucket?.includes('60') ? 'warning' : 'default'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10.5, fontWeight: 600 }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1 }}>
                    {row.instituteName}
                  </Typography>
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1 }}>
                    Due: {fmtDate(row.dueDate)}
                  </Typography>
                  {isOverdue && (
                    <Typography component="span" variant="caption" sx={{ color: 'error.main', bgcolor: 'error.lighter', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>
                      {row.daysOverdue} days overdue
                    </Typography>
                  )}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1 }}>
                    Paid: {fmt(row.amountPaid)}
                  </Typography>
                </Box>
              </Box>

              {/* Balance amount */}
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="body1" fontWeight={700} color={isOverdue ? 'error.main' : 'text.primary'}>
                  {fmt(row.balanceDue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {fmt(row.amountDue)}
                </Typography>
              </Box>
            </Box>

            {/* Expandable detail panel */}
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: '#f8f9fb', borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5, mt: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Institute</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.instituteName || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Due Date</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtDate(row.dueDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Amount Due</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(row.amountDue)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Amount Paid</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(row.amountPaid)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Balance</Typography>
                    <Typography variant="body2" fontWeight={600} color={isOverdue ? 'error.main' : 'text.primary'}>{fmt(row.balanceDue)}</Typography>
                  </Box>
                  {isOverdue && (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Days Overdue</Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main">{row.daysOverdue}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Aging Bucket</Typography>
                        <Typography variant="body2" fontWeight={600}>{row.agingBucket || '—'}</Typography>
                      </Box>
                    </>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
                    <Typography variant="body2" fontWeight={600}>{row.status || '—'}</Typography>
                  </Box>
                </Box>

                {row.notes && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Notes</Typography>
                    <Typography variant="body2">{row.notes}</Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
function ReceivedInvoicesTable({ rows, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [lineItems, setLineItems] = useState({});
  const [lineItemsLoading, setLineItemsLoading] = useState(false);

  const groupByStudent = (items) => {
    const grouped = items.reduce((acc, item) => {
      const key = item.studentId ?? item.studentName ?? 'unknown';
      if (!acc[key]) {
        acc[key] = {
          lineItemId: key,
          studentId: item.studentId,
          studentName: item.studentName,
          descParts: (item.description || '')
            .split('|')
            .map((p) => p.trim())
            .filter((p) => p && !/^installment/i.test(p)),
          amount: 0,
          count: 0,
        };
      }
      acc[key].amount += Number(item.amount) || 0;
      acc[key].count += 1;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const toggleExpand = async (invoiceId) => {
    if (expandedId === invoiceId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(invoiceId);
    if (!lineItems[invoiceId]) {
      setLineItemsLoading(true);
      try {
        const items = await fetchInvoiceLineItems(invoiceId);
        setLineItems((prev) => ({ ...prev, [invoiceId]: groupByStudent(items) }));
      } catch {
        setLineItems((prev) => ({ ...prev, [invoiceId]: [] }));
      } finally {
        setLineItemsLoading(false);
      }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={32} /></Box>;
  if (!rows.length) return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No invoices found for last month.</Typography>;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
        <thead>
          <tr>
            <th style={{ width: 40 }} />
            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0', fontWeight: 700 }}>Invoice Number</th>
            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0', fontWeight: 700 }}>Institute</th>
            <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e0e0e0', fontWeight: 700 }}>Amount</th>
            <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e0e0e0', fontWeight: 700 }}>Due Date</th>
            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0', fontWeight: 700 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.invoiceId}>
              <tr style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => toggleExpand(row.invoiceId)}>
                <td style={{ padding: '10px 12px' }}>
                  <IconButton size="small">
                    {expandedId === row.invoiceId ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                  </IconButton>
                </td>
                <td style={{ padding: '10px 12px' }}>{row.invoiceNumber}</td>
                <td style={{ padding: '10px 12px' }}>{row.instituteName}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(row.totalAmount)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtDate(row.createdAt)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <Chip label={row.status} size="small" color="success" sx={{ fontSize: 11 }} />
                </td>
              </tr>
              <tr>
                <td colSpan={6} style={{ padding: 0, border: 0 }}>
                  <Collapse in={expandedId === row.invoiceId} timeout="auto" unmountOnExit>
                    <Box sx={{ p: 2, bgcolor: '#f8f9fb' }}>
                      {lineItemsLoading && expandedId === row.invoiceId ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {(lineItems[row.invoiceId] || []).map((item) => (
                            <Box
                              key={item.lineItemId}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 1.75,
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              }}
                            >
                              <Box
                                sx={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  fontWeight: 700,
                                  fontSize: 15,
                                }}
                              >
                                {(item.studentName || '?').charAt(0).toUpperCase()}
                              </Box>

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                                    {item.studentName || `#${item.studentId}`}
                                  </Typography>
                                  {item.count > 1 && (
                                    <Chip
                                      icon={<ReceiptLongIcon sx={{ fontSize: 14 }} />}
                                      label={`${item.count} installments`}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      sx={{ height: 20, fontSize: 10.5, fontWeight: 600 }}
                                    />
                                  )}
                                </Box>

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                  {item.descParts.map((part, idx) => (
                                    <Typography
                                      key={idx}
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        color: 'text.secondary',
                                        bgcolor: 'action.hover',
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {part}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>

                              <Typography variant="body1" fontWeight={700} color="success.main" sx={{ flexShrink: 0 }}>
                                {fmt(item.amount)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

// ─── CSV export column defs (unchanged, used only for export, not for display anymore) ──
const RECEIVED_INVOICE_CSV_HEADERS = [
  { key: 'invoiceNumber', label: 'Invoice Number' },
  { key: 'instituteName', label: 'Institute' },
  { key: 'totalAmount', label: 'Amount' },
  { key: 'createdAt', label: 'Due Date' },
  { key: 'status', label: 'Status' },
];

const CSV_HEADERS = {
  0: [
    { key: 'studentName', label: 'Student' },
    { key: 'instituteName', label: 'Institute' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'amountPaid', label: 'Paid' },
    { key: 'balanceDue', label: 'Balance' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ],
  1: [
    { key: 'studentName', label: 'Student' },
    { key: 'instituteName', label: 'Institute' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'daysOverdue', label: 'Days Overdue' },
    { key: 'agingBucket', label: 'Aging Bucket' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'amountPaid', label: 'Paid' },
    { key: 'balanceDue', label: 'Balance' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ],
  2: RECEIVED_INVOICE_CSV_HEADERS,
};

const TAB_NAMES = ['anticipated', 'overdue', 'received'];

export default function ReceivablesPage() {
  const [tab, setTab] = useState(0);
  const [institutes, setInstitutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', instituteId: '', studentId: '' });
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState({ 0: [], 1: [] }); // anticipated, overdue
  const [receivedInvoices, setReceivedInvoices] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInstitutes().then((data) => setInstitutes(data || [])).catch(() => setInstitutes([]));
    fetchStudentsLookup().then((data) => setStudents(data || [])).catch(() => setStudents([]));
  }, []);

  const buildFilters = useCallback(() => {
    const f = {};
    if (filters.fromDate) f.fromDate = filters.fromDate;
    if (filters.toDate) f.toDate = filters.toDate;
    if (filters.instituteId) f.instituteId = filters.instituteId;
    if (filters.studentId) f.studentId = filters.studentId;
    return f;
  }, [filters]);

  const loadAll = useCallback(async () => {
    const f = buildFilters();
    setError('');
    setLoadingSummary(true);
    setLoadingRows(true);
    setLoadingReceived(true);

    try {
      const sumData = await fetchReceivablesSummary(f);
      setSummary(sumData);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }

    try {
      const [ant, ov] = await Promise.all([fetchAnticipated(f), fetchOverdue(f)]);
      setRows({ 0: ant ?? [], 1: ov ?? [] });
    } catch (err) {
      setError(err.message || 'Failed to load receivables data.');
      setRows({ 0: [], 1: [] });
    } finally {
      setLoadingRows(false);
    }

    try {
      const invoices = await fetchReceivedInvoices();
      setReceivedInvoices(invoices ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load received invoices.');
      setReceivedInvoices([]);
    } finally {
      setLoadingReceived(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load, standard fetch-on-mount pattern
  }, [loadAll]);

  const handleFilterChange = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  const handleApply = () => loadAll();
  const handleReset = () => setFilters({ fromDate: '', toDate: '', instituteId: '', studentId: '' });

  const isReceivedTab = tab === 2;
  const currentRows = isReceivedTab ? receivedInvoices : (rows[tab] ?? []);
  const headers = CSV_HEADERS[tab];
  const tabName = TAB_NAMES[tab];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Receivables</Typography>
          <Typography variant="body2" color="text.secondary">Track anticipated, overdue, and received payments</Typography>
        </Box>

        {/* Export buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
            onClick={() => exportCsv(currentRows, headers, `receivables-${tabName}.csv`)}
            disabled={!currentRows.length}>
            CSV
          </Button>
          <Button variant="outlined" size="small" startIcon={<TableChartIcon />} color="success"
            onClick={() => exportExcel(currentRows, headers, `receivables-${tabName}.xlsx`)}
            disabled={!currentRows.length}>
            Excel
          </Button>
          <Button variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} color="error"
            onClick={() => exportPdf(currentRows, headers, `receivables-${tabName}.pdf`, `Receivables – ${tabName}`)}
            disabled={!currentRows.length}>
            PDF
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {loadingSummary ? <CircularProgress size={24} /> : (
          <>
            <StatCard label="Anticipated" amount={summary?.totalAnticipated} count={summary?.anticipatedCount} color="var(--primary, #1976d2)" />
            <StatCard label="Overdue" amount={summary?.totalOverdue} count={summary?.overdueCount} color="var(--error, #d32f2f)" />
            <StatCard
              label="Received"
              amount={receivedInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)}
              count={receivedInvoices.length}
              color="var(--teal, #00897b)"
            />
          </>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', alignItems: 'flex-end' }}>
        <TextField label="From Date" type="date" size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fromDate} onChange={handleFilterChange('fromDate')} sx={{ minWidth: 150 }} />
        <TextField label="To Date" type="date" size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.toDate} onChange={handleFilterChange('toDate')} sx={{ minWidth: 150 }} />

        {/* Institute */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Institute</InputLabel>
          <Select value={filters.instituteId} onChange={handleFilterChange('instituteId')} label="Institute">
            <MenuItem value="">All Institutes</MenuItem>
            {institutes.map((inst) => (
              <MenuItem key={inst.instituteId} value={inst.instituteId}>{inst.instituteName}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Student filter */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Student</InputLabel>
          <Select value={filters.studentId} onChange={handleFilterChange('studentId')} label="Student">
            <MenuItem value="">All Students</MenuItem>
            {students.map((s) => (
              <MenuItem key={s.studentId} value={s.studentId}>{s.fullName}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" size="small" onClick={handleApply}>Apply</Button>
        <Button variant="text" size="small" onClick={handleReset}>Reset</Button>
      </Box>

      {/* Tabs + Content */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Anticipated<Chip label={rows[0].length} size="small" sx={{ height: 18, fontSize: 11 }} /></Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Overdue<Chip label={rows[1].length} size="small" color={rows[1].length ? 'error' : 'default'} sx={{ height: 18, fontSize: 11 }} /></Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Received<Chip label={receivedInvoices.length} size="small" color="success" sx={{ height: 18, fontSize: 11 }} /></Box>} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {isReceivedTab ? (
            <ReceivedInvoicesTable rows={receivedInvoices} loading={loadingReceived} />
          ) : (
            <InstallmentCardList
              rows={currentRows}
              loading={loadingRows}
              variant={tab === 1 ? 'overdue' : 'anticipated'}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}