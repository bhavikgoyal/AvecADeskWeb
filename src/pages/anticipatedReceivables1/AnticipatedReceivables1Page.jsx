import { useCallback, useEffect, useMemo, useState,useRef,} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { fetchAnticipatedReceivablesMatrix } from '../../api/anticipatedReceivablesApi';
import { fetchInstitutesForReceivables, fetchStudentsLookup } from '../../api/lookupApi';
import { CollegeReceivablesDetailView } from './CollegeReceivablesDetailPage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  headerBg: '#f3f3f3',
  border: '#d0d0d0',
  paidBg: '#c6efce',
  overdueBg: '#ffc7ce',
  overdueText: '#9c0006',
  anticipatedBg: '#bdd7ee',
  totalBg: '#eeeeee',
  stickyBg: '#ffffff',
};

const TAB_BUCKET = [null, 'overdue', 'paid']; // All | Overdue | Received
const TAB_NAMES = ['all', 'overdue', 'received'];

function fmtMoney(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtCell(value) {
  if (value == null || value === '' || Number(value) === 0) return null;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function StatCard({ label, amount, count, color }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 180,
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderTop: `3px solid ${color}`,
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={700} mt={0.5} sx={{ color }}>
        {fmtMoney(amount)}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.25}>
        {count ?? 0} record{count !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}

function cellStyles(status, { colorize = true } = {}) {
  const base = {
    border: `1px solid ${COLORS.border}`,
    px: 0.75,
    py: 0.55,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 84,
  };

  // ALL tab: plain cells, no status colors
  if (!colorize || !status) {
    return { ...base, bgcolor: '#fff', color: status ? '#222' : '#999', fontWeight: status ? 600 : 400 };
  }

  if (status === 'paid') {
    return { ...base, bgcolor: COLORS.paidBg, color: '#006100', fontWeight: 600 };
  }
  if (status === 'overdue') {
    return { ...base, bgcolor: COLORS.overdueBg, color: COLORS.overdueText, fontWeight: 700 };
  }
  if (status === 'anticipated') {
    return { ...base, bgcolor: COLORS.anticipatedBg, color: '#1f4e79', fontWeight: 500 };
  }
  return { ...base, bgcolor: '#fff', color: '#999' };
}

function cellBucketAmount(cell, bucket) {
  if (!cell) return 0;
  if (bucket === 'overdue') return Number(cell.overdue) || 0;
  if (bucket === 'paid') return Number(cell.paid) || 0;
  // ALL: received + overdue + generated invoices (anticipated)
  return (Number(cell.paid) || 0) + (Number(cell.overdue) || 0) + (Number(cell.anticipated) || 0);
}

/**
 * Build a view of the matrix for a tab.
 * - All: paid + overdue + anticipated, no color
 * - Overdue: only overdue bucket amounts
 * - Received: only paid bucket amounts
 */
function filterMatrixByBucket(matrix, bucket) {
  if (!matrix) return null;

  const colleges = [];
  const totals = {};
  for (const m of matrix.months) totals[m.key] = 0;

  for (const college of matrix.colleges || []) {
    const cells = {};
    let hasAny = false;
    for (const m of matrix.months) {
      const src = college.cells?.[m.key];
      const amount = cellBucketAmount(src, bucket);
      if (!amount) continue;

      const status = bucket || src.status;
      cells[m.key] = {
        ...src,
        amount,
        status,
        paid: bucket === 'paid' ? amount : (Number(src.paid) || 0),
        overdue: bucket === 'overdue' ? amount : (Number(src.overdue) || 0),
        anticipated: bucket ? 0 : (Number(src.anticipated) || 0),
      };
      totals[m.key] += amount;
      hasAny = true;
    }
    if (hasAny) colleges.push({ ...college, cells });
  }

  return { ...matrix, colleges, totals };
}

function summarizeMatrix(matrix) {
  const summary = {
    all: { amount: 0, count: 0 },
    anticipated: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
    paid: { amount: 0, count: 0 },
  };
  if (!matrix?.colleges) return summary;

  for (const college of matrix.colleges) {
    for (const cell of Object.values(college.cells || {})) {
      const paid = Number(cell.paid) || 0;
      const overdue = Number(cell.overdue) || 0;
      const anticipated = Number(cell.anticipated) || 0;
      const total = paid + overdue + anticipated;
      if (!total) continue;

      summary.all.amount += total;
      summary.all.count += 1;

      if (paid > 0) {
        summary.paid.amount += paid;
        summary.paid.count += 1;
      }
      if (overdue > 0) {
        summary.overdue.amount += overdue;
        summary.overdue.count += 1;
      }
      if (anticipated > 0) {
        summary.anticipated.amount += anticipated;
        summary.anticipated.count += 1;
      }
    }
  }
  return summary;
}

function matrixToExportRows(matrix) {
  if (!matrix?.months) return { headers: [], rows: [] };
  const headers = [
    { key: 'collegeName', label: 'COLLEGE NAME' },
    ...matrix.months.map((m) => ({ key: m.key, label: m.label })),
  ];
  const rows = (matrix.colleges || []).map((college) => {
    const row = { collegeName: college.collegeName };
    for (const m of matrix.months) {
      const cell = college.cells?.[m.key];
      row[m.key] = cell?.amount ? Math.round(Number(cell.amount)) : '';
    }
    return row;
  });
  const totalRow = { collegeName: 'TOTAL' };
  for (const m of matrix.months) {
    const t = matrix.totals?.[m.key];
    totalRow[m.key] = t ? Math.round(Number(t)) : '';
  }
  rows.push(totalRow);
  return { headers, rows };
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
  XLSX.utils.book_append_sheet(wb, ws, 'Receivables');
  XLSX.writeFile(wb, filename);
}

function exportPdf(rows, headers, filename, title) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [headers.map((h) => h.label)],
    body: rows.map((row) => headers.map((h) => String(row[h.key] ?? ''))),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [25, 118, 210] },
  });
  doc.save(filename);
}

function MonthGrid({ matrix, loading, colorize = true, onCollegeClick }) {
  const tableScrollRef = useRef(null);

  useEffect(() => {
    if (!loading && matrix && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft =
        tableScrollRef.current.scrollWidth;
    }
  }, [loading, matrix]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!matrix) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No records found.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <Box  ref={tableScrollRef} sx={{ overflowX: 'auto', maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            width: 'max-content',
            minWidth: '100%',
            fontFamily: '"Segoe UI", Tahoma, sans-serif',
          }}
        >
          <thead>
            <tr>
              <Box
                component="th"
                sx={{
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 3,
                  minWidth: 240,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: COLORS.headerBg,
                  px: 1.5,
                  py: 1,
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                COLLEGE NAME
              </Box>
              {(matrix.months || []).map((m) => (
                <Box
                  component="th"
                  key={m.key}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.headerBg,
                    px: 0.75,
                    py: 1,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    minWidth: 84,
                  }}
                >
                  {m.label}
                </Box>
              ))}
            </tr>
          </thead>

          <tbody>
            {(matrix.colleges || []).length === 0 ? (
              <tr>
                <Box
                  component="td"
                  colSpan={(matrix.months?.length || 0) + 1}
                  sx={{
                    border: `1px solid ${COLORS.border}`,
                    py: 5,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                  }}
                >
                  No records found.
                </Box>
              </tr>
            ) : (
              matrix.colleges.map((college) => (
                <tr key={college.collegeName}>
                  <Box
                    component="td"
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      minWidth: 240,
                      border: `1px solid ${COLORS.border}`,
                      bgcolor: COLORS.stickyBg,
                      px: 1.5,
                      py: 0.6,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      color: 'var(--primary, #1976d2)',
                      textDecoration: 'underline',
                      userSelect: 'none',
                      '&:hover': { bgcolor: 'var(--primary-soft, #e3f2fd)' },
                    }}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCollegeClick?.(college);
                      }}
                      sx={{
                        all: 'unset',
                        cursor: 'pointer',
                        display: 'inline',
                        color: 'inherit',
                        font: 'inherit',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {college.collegeName}
                    </Box>
                  </Box>
                  {matrix.months.map((m) => {
                    const cell = college.cells?.[m.key];
                    const display = fmtCell(cell?.amount);
                    return (
                      <Box
                        component="td"
                        key={`${college.collegeName}-${m.key}`}
                        sx={cellStyles(display ? cell?.status : null, { colorize })}
                      >
                        {display || '—'}
                      </Box>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

          <tfoot>
            <tr>
              <Box
                component="td"
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  minWidth: 240,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: COLORS.totalBg,
                  px: 1.5,
                  py: 0.85,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                TOTAL
              </Box>
              {(matrix.months || []).map((m) => {
                const display = fmtCell(matrix.totals?.[m.key]);
                return (
                  <Box
                    component="td"
                    key={`total-${m.key}`}
                    sx={{
                      border: `1px solid ${COLORS.border}`,
                      bgcolor: COLORS.totalBg,
                      px: 0.75,
                      py: 0.85,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      minWidth: 84,
                    }}
                  >
                    {display || '—'}
                  </Box>
                );
              })}
            </tr>
          </tfoot>
        </Box>
      </Box>
    </Box>
  );
}

export default function AnticipatedReceivables1Page() {
  const [tab, setTab] = useState(0);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    instituteId: '',
    studentId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: '',
    toDate: '',
    instituteId: '',
    studentId: '',
  });
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInstitutesForReceivables()
      .then((data) => setInstitutes(data || []))
      .catch(() => setInstitutes([]));
    fetchStudentsLookup()
      .then((data) => setStudents(data || []))
      .catch(() => setStudents([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const f = {};
      if (appliedFilters.fromDate) f.fromDate = appliedFilters.fromDate;
      if (appliedFilters.toDate) f.toDate = appliedFilters.toDate;
      if (appliedFilters.instituteId) f.instituteId = appliedFilters.instituteId;
      if (appliedFilters.studentId) f.studentId = appliedFilters.studentId;
      const data = await fetchAnticipatedReceivablesMatrix(f);
      setMatrix(data);
    } catch (err) {
      setMatrix(null);
      setError(err?.message || 'Failed to load receivables data.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarizeMatrix(matrix), [matrix]);

  const viewMatrix = useMemo(() => {
    return filterMatrixByBucket(matrix, TAB_BUCKET[tab]);
  }, [matrix, tab]);

  const handleFilterChange = (field) => (e) =>
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const handleApply = () => setAppliedFilters({ ...filters });
  const handleReset = () => {
    const empty = { fromDate: '', toDate: '', instituteId: '', studentId: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const handleExport = (type) => {
    const { headers, rows } = matrixToExportRows(viewMatrix);
    if (!rows.length) return;
    const name = `receivables-${TAB_NAMES[tab]}`;
    if (type === 'csv') exportCsv(rows, headers, `${name}.csv`);
    if (type === 'excel') exportExcel(rows, headers, `${name}.xlsx`);
    if (type === 'pdf') exportPdf(rows, headers, `${name}.pdf`, `Receivables – ${TAB_NAMES[tab]}`);
  };

  const hasRows = (viewMatrix?.colleges || []).length > 0;

  const handleCollegeClick = useCallback(
    (college) => {
      if (!college?.collegeName) return;
      const institute = institutes.find(
        (i) => String(i.instituteName || '').trim().toLowerCase() === String(college.collegeName).trim().toLowerCase(),
      );
      setSelectedCollege({
        collegeName: college.collegeName,
        instituteId: institute?.instituteId ?? college.instituteId ?? null,
      });
    },
    [institutes],
  );

  if (selectedCollege?.collegeName) {
    return (
      <CollegeReceivablesDetailView
        collegeName={selectedCollege.collegeName}
        instituteId={selectedCollege.instituteId}
        onBack={() => setSelectedCollege(null)}
      />
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Receivables
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track anticipated, overdue, and received payments
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={!hasRows}
          >
            CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TableChartIcon />}
            color="success"
            onClick={() => handleExport('excel')}
            disabled={!hasRows}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            color="error"
            onClick={() => handleExport('pdf')}
            disabled={!hasRows}
          >
            PDF
          </Button>
        </Box>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {loading && !matrix ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <StatCard
              label="Anticipated"
              amount={summary.anticipated.amount}
              count={summary.anticipated.count}
              color="var(--primary, #1976d2)"
            />
            <StatCard
              label="Overdue"
              amount={summary.overdue.amount}
              count={summary.overdue.count}
              color="var(--error, #d32f2f)"
            />
            <StatCard
              label="Received"
              amount={summary.paid.amount}
              count={summary.paid.count}
              color="var(--teal, #00897b)"
            />
          </>
        )}
      </Box> */}

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          alignItems: 'flex-end',
        }}
      >
        <TextField
          label="From Date"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.fromDate}
          onChange={handleFilterChange('fromDate')}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="To Date"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.toDate}
          onChange={handleFilterChange('toDate')}
          sx={{ minWidth: 150 }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Institute</InputLabel>
          <Select
            value={filters.instituteId}
            onChange={handleFilterChange('instituteId')}
            label="Institute"
          >
            <MenuItem value="">All Institutes</MenuItem>
            {institutes.map((inst) => (
              <MenuItem key={inst.instituteId} value={inst.instituteId}>
                {inst.instituteName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Student</InputLabel>
          <Select
            value={filters.studentId}
            onChange={handleFilterChange('studentId')}
            label="Student"
          >
            <MenuItem value="">All Students</MenuItem>
            {students.map((s) => (
              <MenuItem key={s.studentId} value={s.studentId}>
                {s.fullName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" size="small" onClick={handleApply} sx={{ height: 40 }}>
          Apply
        </Button>
        <Button variant="outlined" size="small" onClick={handleReset} sx={{ height: 40 }}>
          Reset
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
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
                <Chip
                  label={summary.paid.count}
                  size="small"
                  color="success"
                  sx={{ height: 18, fontSize: 11 }}
                />
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: 2 }}>
          <MonthGrid
            matrix={viewMatrix}
            loading={loading}
            colorize={tab !== 0}
            onCollegeClick={handleCollegeClick}
          />
        </Box>
      </Box>
    </Box>
  );
}
