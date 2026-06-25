import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  FormControl, InputLabel, MenuItem, Select,
  Tab, Tabs, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';  
import { fetchAnticipated, fetchOverdue, fetchReceived, fetchReceivablesSummary } from '../../api/receivablesApi';
import { fetchInstitutes, fetchStudentsLookup } from '../../api/lookupApi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmt(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function SimpleTable({ columns, rows, loading }) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={32} /></Box>;
  if (!rows.length) return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No records found.</Typography>;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || 'left', padding: '10px 12px', borderBottom: '2px solid var(--border, #e0e0e0)', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-secondary, #666)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.scheduleId ?? i} style={{ borderBottom: '1px solid var(--border, #f0f0f0)' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '10px 12px', textAlign: col.align || 'left', verticalAlign: 'middle' }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

// ─── column defs ────────────────────────────────────────────────────────────
const COMMON_COLS = [
  { key: 'studentName', label: 'Student' },
  { key: 'instituteName', label: 'Institute' },
  { key: 'dueDate', label: 'Due Date', render: (v) => fmtDate(v) },
  { key: 'amountDue', label: 'Amount Due', align: 'right', render: (v) => fmt(v) },
  { key: 'amountPaid', label: 'Paid', align: 'right', render: (v) => fmt(v) },
  { key: 'balanceDue', label: 'Balance', align: 'right', render: (v) => fmt(v) },
  { key: 'status', label: 'Status', render: (v) => <Chip label={v} size="small" sx={{ fontSize: 11 }} /> },
  { key: 'notes', label: 'Notes' },
];

const ANTICIPATED_COLS = COMMON_COLS;

const OVERDUE_COLS = [
  { key: 'studentName', label: 'Student' },
  { key: 'instituteName', label: 'Institute' },
  { key: 'dueDate', label: 'Due Date', render: (v) => fmtDate(v) },
  { key: 'daysOverdue', label: 'Days Overdue', align: 'right' },
  { key: 'agingBucket', label: 'Aging', render: (v) => <Chip label={v} size="small" color={v?.includes('90') ? 'error' : v?.includes('60') ? 'warning' : 'default'} sx={{ fontSize: 11 }} /> },
  { key: 'amountDue', label: 'Amount Due', align: 'right', render: (v) => fmt(v) },
  { key: 'amountPaid', label: 'Paid', align: 'right', render: (v) => fmt(v) },
  { key: 'balanceDue', label: 'Balance', align: 'right', render: (v) => fmt(v) },
  { key: 'status', label: 'Status', render: (v) => <Chip label={v} size="small" color="error" sx={{ fontSize: 11 }} /> },
  { key: 'notes', label: 'Notes' },
];

const RECEIVED_COLS = [
  { key: 'studentName', label: 'Student' },
  { key: 'instituteName', label: 'Institute' },
  { key: 'dueDate', label: 'Due Date', render: (v) => fmtDate(v) },
  { key: 'paidAt', label: 'Paid On', render: (v) => fmtDate(v) },
  { key: 'amountDue', label: 'Amount Due', align: 'right', render: (v) => fmt(v) },
  { key: 'amountPaid', label: 'Paid', align: 'right', render: (v) => fmt(v) },
  { key: 'balanceDue', label: 'Balance', align: 'right', render: (v) => fmt(v) },
  { key: 'status', label: 'Status', render: (v) => <Chip label={v} size="small" color="success" sx={{ fontSize: 11 }} /> },
  { key: 'notes', label: 'Notes' },
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
  2: [
    { key: 'studentName', label: 'Student' },
    { key: 'instituteName', label: 'Institute' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'paidAt', label: 'Paid On' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'amountPaid', label: 'Paid' },
    { key: 'balanceDue', label: 'Balance' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ],
};

const TAB_NAMES = ['anticipated', 'overdue', 'received'];

export default function ReceivablesPage() {
  const [tab, setTab] = useState(0);
  const [institutes, setInstitutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', instituteId: '', studentId: '' }); 
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState({ 0: [], 1: [], 2: [] });
  const [loadingRows, setLoadingRows] = useState(true);
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

    try {
      const sumData = await fetchReceivablesSummary(f);
      setSummary(sumData);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }

    try {
      const [ant, ov, rec] = await Promise.all([fetchAnticipated(f), fetchOverdue(f), fetchReceived(f)]);
      setRows({ 0: ant ?? [], 1: ov ?? [], 2: rec ?? [] });
    } catch (err) {
      setError(err.message || 'Failed to load receivables data.');
      setRows({ 0: [], 1: [], 2: [] });
    } finally {
      setLoadingRows(false);
    }
  }, [buildFilters]);


  useEffect(() => {
    const controller = new AbortController();
    loadAll();
    return () => controller.abort();
  }, [loadAll]);

  const handleFilterChange = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  const handleApply = () => loadAll();
  const handleReset = () => setFilters({ fromDate: '', toDate: '', instituteId: '', studentId: '' });

  // currentRows, headers, tabName 
  const currentCols = [ANTICIPATED_COLS, OVERDUE_COLS, RECEIVED_COLS][tab];
  const currentRows = rows[tab] ?? [];
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
            <StatCard label="Received" amount={summary?.totalReceived} count={summary?.receivedCount} color="var(--teal, #00897b)" />
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
        <Button variant="text" size="small" onClick={handleReset}>Reset</Button> {/* ✅ handleReset used */}
      </Box>

      {/* Tabs + Table */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Anticipated<Chip label={rows[0].length} size="small" sx={{ height: 18, fontSize: 11 }} /></Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Overdue<Chip label={rows[1].length} size="small" color={rows[1].length ? 'error' : 'default'} sx={{ height: 18, fontSize: 11 }} /></Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Received<Chip label={rows[2].length} size="small" color="success" sx={{ height: 18, fontSize: 11 }} /></Box>} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <SimpleTable columns={currentCols} rows={currentRows} loading={loadingRows} />
        </Box>
      </Box>
    </Box>
  );
}