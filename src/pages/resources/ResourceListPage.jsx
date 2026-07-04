import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { deleteInstitute, fetchInstituteRows } from '../../api/institutesApi';
import { fetchCommissionHistory } from '../../api/commissionsApi';
import { fetchPaymentSummary, formatCurrency } from '../../api/schedulesApi';
import { deleteStudent, fetchEnrolmentRows, fetchStudentRows } from '../../api/studentsApi';
import { deleteVendor, fetchVendorRows } from '../../api/vendorsApi';
import { getEmailTemplates, deleteEmailTemplate } from '../../api/EmailtemplatesApi';
import PageShell from '../../components/PageShell';
import ResponsiveTable from '../../components/ResponsiveTable';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { deleteRecord, loadRecords } from '../../utils/resourceStorage';
import { exportInstituteCommissionPdf } from '../../utils/instituteCommissionPdf';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function applyStudentSummary(baseStats, summary) {
  if (!baseStats?.length || !summary) return baseStats;

  return [
    {
      ...baseStats[0],
      value: String(summary.activeStudents),
      caption: `${summary.activeStudents} active in system`,
    },
    {
      ...baseStats[1],
      value: formatCurrency(summary.collectedTotal),
      caption: 'Total amount paid',
    },
    {
      ...baseStats[2],
      value: formatCurrency(summary.outstandingTotal),
      caption: 'Total amount due',
    },
    {
      ...baseStats[3],
      value: formatCurrency(summary.overdueTotal),
      caption: `${summary.overdueCount} past due schedule(s)`,
    },
  ];
}

async function fetchResourceRows({
  basePath,
  isStudents,
  isEnrolment,
  isInstitutes,
  isVendors,
  pageStats,
}) {
  if (isEnrolment) {
    return { rows: await fetchEnrolmentRows(), stats: pageStats ?? [] };
  }

  if (isInstitutes) {
    return { rows: await fetchInstituteRows(), stats: pageStats ?? [] };
  }

  if (isVendors) {
    return { rows: await fetchVendorRows(), stats: pageStats ?? [] };
  }

  if (basePath === '/templates') {
    return { rows: await getEmailTemplates(), stats: pageStats ?? [] };
  }

  if (!isStudents) {
    return { rows: loadRecords(basePath), stats: pageStats ?? [] };
  }

  const apiRows = await fetchStudentRows();

  try {
    const summary = await fetchPaymentSummary();
    return { rows: apiRows, stats: applyStudentSummary(pageStats, summary) };
  } catch {
    return { rows: apiRows, stats: pageStats ?? [] };
  }
}

function getLoadErrorMessage(basePath) {
  if (basePath === '/status/students') return 'Failed to load student enrolment from the API.';
  if (basePath === '/institutes') return 'Failed to load institutes from the API.';
  if (basePath === '/vendors') return 'Failed to load vendors from the API.';
  if (basePath === '/students') return 'Failed to load students from the API.';
  return 'Failed to load records.';
}

export default function ResourceListPage({ basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const resource = getResourceConfig(basePath);
  const page = PAGE_CONFIG[basePath];
  const isStudents = basePath === '/students';
  const isEnrolment = basePath === '/status/students';
  const isInstitutes = basePath === '/institutes';
  const isVendors = basePath === '/vendors';
  const isTemplates = basePath === '/templates';
  const pageStats = useMemo(() => page?.stats ?? [], [page]);
  const usesApi = isStudents || isEnrolment || isInstitutes || isVendors || isTemplates;
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(pageStats);
  const [loading, setLoading] = useState(usesApi);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Commission history dialog state (institutes only)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [historyInstituteName, setHistoryInstituteName] = useState('');

  const refreshRows = useCallback(async () => {
    if (usesApi) setLoading(true);
    setError('');

    try {
      const result = await fetchResourceRows({
        basePath,
        isStudents,
        isEnrolment,
        isInstitutes,
        isVendors,
        pageStats,
      });
      setRows(result.rows);
      setStats(result.stats);
    } catch (err) {
      setError(err.message || getLoadErrorMessage(basePath));
      setRows([]);
      setStats(pageStats);
    } finally {
      if (usesApi) setLoading(false);
    }
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isTemplates, pageStats, usesApi]);

  useEffect(() => {
    let cancelled = false;

    fetchResourceRows({
      basePath,
      isStudents,
      isEnrolment,
      isInstitutes,
      isVendors,
      pageStats,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setStats(result.stats);
        if (usesApi) setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || getLoadErrorMessage(basePath));
        setRows([]);
        setStats(pageStats);
        if (usesApi) setLoading(false);
      });

    // If navigated back with a refresh flag, trigger refresh and clear state
    if (location?.state?.refresh) {
      refreshRows();
      try {
        // clear history state so refresh doesn't loop
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch (e) {
        // ignore
      }
    }

    return () => {
      cancelled = true;
    };
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isTemplates, pageStats, usesApi]);

  // Reset selection whenever the resource type or the underlying rows change
  useEffect(() => {
    setSelectedIds([]);
  }, [basePath, rows]);

  const handleDelete = useCallback(async (row) => {
    const label = row.fullName || row.businessName || row.instituteName || row.name || row.id;
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    setError('');
    try {
      if (isStudents || isEnrolment) {
        await deleteStudent(row.id);
        await refreshRows();
      } else if (isVendors) {
        await deleteVendor(row.id);
        await refreshRows();
        } else if (isInstitutes) {
          await deleteInstitute(row.id);
          await refreshRows();
        } else if (isTemplates) {
          await deleteEmailTemplate(row.id);
          await refreshRows();
        } else {
        deleteRecord(basePath, row.id);
        setRows((prev) => prev.filter((r) => String(r.id) !== String(row.id)));
      }
      } catch (err) {
      setError(err.message || 'Failed to delete record.');
    }
    }, [basePath, isStudents, isEnrolment, isVendors, isInstitutes, isTemplates, refreshRows]);

  // ---- Selection (institutes only) ----
  const allSelected = isInstitutes && rows.length > 0 && selectedIds.length === rows.length;
  const someSelected = isInstitutes && selectedIds.length > 0 && !allSelected;

  const toggleRow = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((r) => r.id)));
  }, [rows]);

  // ---- Commission history (institutes only) ----
  const openHistory = useCallback(async (row) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryInstituteName(row.instituteName || 'Institute');

    try {
      const data = await fetchCommissionHistory(row.vendorId, row.instituteId);
      setHistoryRows(data);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load commission history.');
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    setHistoryRows([]);
    setHistoryError('');
  }, []);

  const columnsWithSelect = useMemo(() => {
    if (!isInstitutes || !resource) return resource?.columns ?? [];
    return [
      {
        id: '__select__',
        label: (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        align: 'center',
        headerSx: { width: 44, px: 0.5 },
        cellSx: { width: 44, px: 0.5 },
        render: (row) => (
          <Checkbox
            size="small"
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleRow(row.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      ...resource.columns,
      {
        id: '__history__',
        label: 'History',
        align: 'center',
        headerSx: { width: 90 },
        render: (row) => (
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openHistory(row);
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            History
          </Button>
        ),
      },
    ];
  }, [isInstitutes, resource, selectedIds, allSelected, someSelected, toggleAll, toggleRow, openHistory]);

  const handleExportPdf = useCallback(() => {
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    if (!selectedRows.length) return;
    exportInstituteCommissionPdf(selectedRows);
  }, [rows, selectedIds]);

  const headerExtra = isInstitutes ? (
    <Tooltip title={selectedIds.length === 0 ? 'Select at least one institute' : ''}>
      <span>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PictureAsPdfOutlinedIcon />}
          onClick={handleExportPdf}
          disabled={selectedIds.length === 0}
          sx={{
            textTransform: 'none',
            height: 40,
            borderRadius: 2,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            px: 2,
          }}
        >
          Export PDF{selectedIds.length ? ` (${selectedIds.length})` : ''}
        </Button>
      </span>
    </Tooltip>
  ) : null;

  if (!resource || !page) return null;

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      <PageShell
        title={page.title}
        subtitle={page.subtitle}
        stats={stats}
        showCharts={isTemplates ? false : (page.showCharts !== false)}
        columns={resource.columns}
        rows={loading ? [] : rows}
        actionLabel={resource.actionLabel}
        searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
        // explicitly hide charts for templates
        showCharts={isTemplates ? false : (basePath !== '/institutes')}
        showCharts={basePath !== '/institutes'}
        columns={columnsWithSelect}
        rows={loading ? [] : rows}
        actionLabel={resource.actionLabel}
        searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
        headerExtra={headerExtra}
        onAdd={() => navigate(`${basePath}/new`)}
        onRowClick={(row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })}
        onDelete={handleDelete}
      />

      {isInstitutes && (
        <Dialog open={historyOpen} onClose={closeHistory} fullWidth maxWidth="md">
          <DialogTitle>Commission History — {historyInstituteName}</DialogTitle>
          <DialogContent>
            {historyError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {historyError}
              </Alert>
            )}
            {historyLoading ? (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Loading history...
              </Alert>
            ) : historyRows.length === 0 && !historyError ? (
              <Alert severity="info">No commission history for this institute yet.</Alert>
            ) : (
              <ResponsiveTable
                columns={[
                  { id: 'rateType', label: 'Rate Type', field: 'rateType' },
                  { id: 'rate', label: 'Rate', field: 'rate' },
                  { id: 'effectiveFrom', label: 'From', render: (r) => formatDate(r.effectiveFrom) },
                  { id: 'effectiveTo', label: 'To', render: (r) => formatDate(r.effectiveTo) },
                ]}
                rows={historyRows}
                getRowKey={(row) => row.commissionId}
                alwaysTable
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeHistory}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
