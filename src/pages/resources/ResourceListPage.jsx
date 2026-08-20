import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
   Badge,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,FormControl, Select, MenuItem
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { deleteInstitute, fetchInstituteRows } from '../../api/institutesApi';
import { fetchCommissionHistory } from '../../api/commissionsApi';
import { fetchPaymentSummary, formatCurrency } from '../../api/schedulesApi';
import { deleteStudent, fetchEnrolmentRows, fetchStudentRows } from '../../api/studentsApi';
import { deleteVendor, fetchVendorRows } from '../../api/vendorsApi';
import { getEmailTemplates, deleteEmailTemplate } from '../../api/EmailtemplatesApi';
import { downloadInvoiceDocument, fetchInvoices } from '../../api/invoicesApi';
import { listOutlinedButtonSx, listSearchFieldSx } from '../../components/forms';
import AddInvoiceDialog from '../../components/invoices/AddInvoiceDialog';
import PageShell from '../../components/PageShell';
import ResponsiveTable from '../../components/ResponsiveTable';
import TableContentSkeleton from '../../components/TableContentSkeleton';
import { PAGE_CONFIG } from '../../config/pageConfig';
import { getResourceConfig } from '../../config/resourceConfig';
import { deleteRecord, loadRecords } from '../../utils/resourceStorage';
import { exportInstituteCommissionPdf } from '../../utils/instituteCommissionPdf';
import { deleteCourse, fetchCourseList } from '../../api/coursesApi';
import connection from '../../services/signalR';
import { downloadInvoiceDocuments } from '../../api/invoicesApi';
import EditInvoiceDialog from '../../components/invoices/EditInvoiceDialog';
const INSTITUTE_SCRAPPING_BASE_PATH = '/institutes-scrapping';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parseValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function isSameLocalMonth(date, referenceDate) {
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

function isSameLocalDay(date, referenceDate) {
  return (
    isSameLocalMonth(date, referenceDate) &&
    date.getDate() === referenceDate.getDate()
  );
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
  isCourses,
  isInvoices,
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
  if (isCourses) {
    const courses = await fetchCourseList();

    return {
      rows: courses.map((item) => ({
        ...item,
        id: String(item.courseId ?? item.id),
      })),
      stats: pageStats ?? [],
    };
  }
  if (basePath === '/templates') {
    return { rows: await getEmailTemplates(), stats: pageStats ?? [] };
  }

  if (isInvoices) {
    return { rows: await fetchInvoices(), stats: pageStats ?? [] };
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
  if (basePath === '/courses') return 'Failed to load courses from the API.';
  if (basePath === '/invoices') return 'Failed to load invoices from the API.';
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
  const isCourses = basePath === '/courses';
  const isInvoices = basePath === '/invoices';
  const usesApi = isStudents || isEnrolment || isInstitutes || isVendors || isTemplates || isCourses || isInvoices;
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(pageStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
    const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [activityFilter, setActivityFilter] = useState('All');

  useEffect(() => {
  if (!success) return;

  const timer = setTimeout(() => {
    setSuccess('');
  }, 3000);

  return () => clearTimeout(timer);
}, [success]);
  // Courses page: institute filter passed via ?institute=<name> from
  // the "View Courses" button on the Institutes Scrapping list.
  const instituteFilter = useMemo(() => {
    if (!isCourses) return '';
    return new URLSearchParams(location.search).get('institute')?.trim() || '';
  }, [isCourses, location.search]);

  const invoiceView = useMemo(() => {
    if (!isInvoices) return '';
    return new URLSearchParams(location.search).get('view')?.trim().toLowerCase() || '';
  }, [isInvoices, location.search]);

 const invoiceYear = useMemo(() => {
    if (!isInvoices) return null;
    const v = new URLSearchParams(location.search).get('year');
    return v ? Number(v) : null;
  }, [isInvoices, location.search]);
  const invoiceMonth = useMemo(() => {
    if (!isInvoices) return null;
    const v = new URLSearchParams(location.search).get('month');
    return v ? Number(v) : null;
  }, [isInvoices, location.search]);

  const studentYear = useMemo(() => {
    if (!isStudents) return null;
    const v = new URLSearchParams(location.search).get('year');
    return v ? Number(v) : null;
  }, [isStudents, location.search]);
  const studentMonth = useMemo(() => {
    if (!isStudents) return null;
    const v = new URLSearchParams(location.search).get('month');
    return v ? Number(v) : null;
  }, [isStudents, location.search]);

  const vendorStatusParam = useMemo(() => {
    if (!isVendors) return '';
    return new URLSearchParams(location.search).get('status')?.trim().toLowerCase() || '';
  }, [isVendors, location.search]);

  const vendorActivityParam = useMemo(() => {
    if (!isVendors) return '';
    return new URLSearchParams(location.search).get('activity')?.trim().toLowerCase() || '';
  }, [isVendors, location.search]);

  const vendorYear = useMemo(() => {
    if (!isVendors) return null;
    const v = new URLSearchParams(location.search).get('year');
    return v ? Number(v) : null;
  }, [isVendors, location.search]);

  const vendorMonth = useMemo(() => {
    if (!isVendors) return null;
    const v = new URLSearchParams(location.search).get('month');
    return v ? Number(v) : null;
  }, [isVendors, location.search]);

  useEffect(() => {
    if (!isVendors) return;

    if (vendorStatusParam === 'active') {
      setStatusFilter('Active');
      return;
    }

    if (vendorStatusParam === 'pending') {
      setStatusFilter('Pending');
      return;
    }

    setStatusFilter('All');
  }, [isVendors, vendorStatusParam]);

  useEffect(() => {
    if (!isVendors) return;

    if (vendorActivityParam === 'active-today') {
      setActivityFilter('Active today');
      return;
    }

    if (vendorActivityParam === 'idle') {
      setActivityFilter('Idle');
      return;
    }

    setActivityFilter('All');
  }, [isVendors, vendorActivityParam]);

  const displayRows = useMemo(() => {
    if (isStudents) {
      if (studentYear || studentMonth) {
        return rows.filter((r) => {
          const dateVal = r.studentCreatedAt ?? r.createdAt ?? r.createdOn ?? r.createdDate ?? r.created_at;
          const d = dateVal ? new Date(dateVal) : null;
          if (!d || isNaN(d.getTime())) return false;
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          if (studentYear && studentMonth) return y === studentYear && m === studentMonth;
          if (studentYear) return y === studentYear;
          if (studentMonth) return m === studentMonth;
          return true;
        });
      }
      return rows;
    }

   if (isCourses) {
      if (!instituteFilter) return rows;
      const target = instituteFilter.toLowerCase();
      return rows.filter((row) => (row.instituteName || '').trim().toLowerCase() === target);
    }

   if (isInvoices) {
      let filtered = rows;
      if (invoiceView) {
        if (invoiceView === 'paid') filtered = filtered.filter((r) => (((r.invoiceStatus || r.status || '') + '').toLowerCase()) === 'approved');
        else if (invoiceView === 'due') filtered = filtered.filter((r) => {
          const s = (((r.invoiceStatus || r.status || '') + '').toLowerCase());
          return s === 'pending' || s === 'invoiced';
        });
      }
      if (invoiceYear || invoiceMonth) {
        filtered = filtered.filter((r) => {
          const dateVal = r.createdAt ?? r.createdOn ?? r.createdDate ?? r.created_at;
          const d = dateVal ? new Date(dateVal) : null;
          if (!d || isNaN(d.getTime())) return false;
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          if (invoiceYear && invoiceMonth) return y === invoiceYear && m === invoiceMonth;
          if (invoiceYear) return y === invoiceYear;
          if (invoiceMonth) return m === invoiceMonth;
          return true;
        });
      }
      return filtered;
    }

    if (isVendors) {
      if (vendorYear || vendorMonth) {
        return rows.filter((row) => {
          const dateVal = row.createdAt ?? row.createdOn ?? row.createdDate ?? row.created_at;
          const d = dateVal ? new Date(dateVal) : null;
          if (!d || isNaN(d.getTime())) return false;
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          if (vendorYear && vendorMonth) return y === vendorYear && m === vendorMonth;
          if (vendorYear) return y === vendorYear;
          if (vendorMonth) return m === vendorMonth;
          return true;
        });
      }

      return rows;
    }

    return rows;
  }, [rows, isCourses, instituteFilter, isInvoices, invoiceView, invoiceYear, invoiceMonth, isStudents, studentYear, studentMonth, isVendors, vendorYear, vendorMonth]);

  const filteredDisplayRows = useMemo(() => {
    if (!isVendors) {
      return displayRows;
    }

    let filteredRows = displayRows;

    if (statusFilter !== 'All') {
      filteredRows = filteredRows.filter(
        (row) =>
          String(row.status || '')
            .toLowerCase()
            .trim() === statusFilter.toLowerCase()
      );
    }

    if (activityFilter !== 'All') {
      const now = new Date();
      filteredRows = filteredRows.filter((row) => {
        const lastLogin = parseValidDate(row.lastLogin);

        if (activityFilter === 'Active today') {
          return lastLogin ? isSameLocalDay(lastLogin, now) : false;
        }

        if (activityFilter === 'Idle') {
          return lastLogin ? !isSameLocalMonth(lastLogin, now) : true;
        }

        return true;
      });
    }

    return filteredRows;
  }, [displayRows, isVendors, statusFilter, activityFilter]);
  // Commission history dialog state (institutes only)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [historyInstituteName, setHistoryInstituteName] = useState('');

  const refreshRows = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchResourceRows({
        basePath,
        isStudents,
        isEnrolment,
        isInstitutes,
        isVendors,
        isCourses,
        isInvoices,
        pageStats,
      });
      setRows(result.rows);
      setStats(result.stats);
    } catch (err) {
      setError(err.message || getLoadErrorMessage(basePath));
      setRows([]);
      setStats(pageStats);
    } finally {
      setLoading(false);
    }
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isCourses, isInvoices, pageStats, usesApi]);
useEffect(() => {
  if (!isVendors) return;

  const startConnection = async () => {
    try {
      if (connection.state === "Disconnected") {
        await connection.start();
      }

      connection.off("VendorStudentCreated");

      connection.on("VendorStudentCreated", (data) => {
        setRows((prev) =>
          prev.map((row) =>
            Number(row.vendorId) === Number(data.vendorId)
              ? {
                  ...row,
                  todayRegisterStudent:
                    (row.todayRegisterStudent || 0) + 1,
                  studentCount:
                    (row.studentCount || 0) + 1,
                }
              : row
          )
        );
      });
    } catch (err) {
      console.error("SignalR error:", err);
    }
  };

  startConnection();

  return () => {
    connection.off("VendorStudentCreated");
  };
}, [isVendors]);
  useEffect(() => {
    let cancelled = false;

    fetchResourceRows({
      basePath,
      isStudents,
      isEnrolment,
      isInstitutes,
      isVendors,
      isCourses,
      isInvoices,
      pageStats,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setStats(result.stats);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || getLoadErrorMessage(basePath));
        setRows([]);
        setStats(pageStats);
        setLoading(false);
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
  }, [basePath, isStudents, isEnrolment, isInstitutes, isVendors, isTemplates, isCourses, isInvoices, pageStats, usesApi]);

  // Reset selection whenever the resource type or the underlying rows change
  useEffect(() => {
    setSelectedIds([]);
  }, [basePath, rows]);

  const handleOpenAddInvoice = useCallback(() => {
    setError('');
    setSuccess('');
    setAddInvoiceOpen(true);
  }, []);

  const handleInvoiceGenerated = useCallback(async (result) => {
    setSuccess(result?.message || 'Invoice generated successfully.');
    await refreshRows();
  }, [refreshRows]);

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
      } else if (isCourses) {
        await deleteCourse(row.id);
        await refreshRows();
      } else {
        deleteRecord(basePath, row.id);
        setRows((prev) => prev.filter((r) => String(r.id) !== String(row.id)));
      }
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    }
  }, [basePath, isStudents, isEnrolment, isVendors, isInstitutes, isTemplates, isCourses, refreshRows]);

  // ---- Selection (institutes only) ----
const allSelected = (isInstitutes || isInvoices) && rows.length > 0 && selectedIds.length === rows.length;
const someSelected = (isInstitutes || isInvoices) && selectedIds.length > 0 && !allSelected;

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
    if (!resource) return [];

    if (isVendors) {
      return [
        ...resource.columns,
        {
          id: '__view_students__',
          label: 'Students',
          align: 'center',
          headerSx: { width: 190, whiteSpace: 'nowrap' },
          cellSx: { width: 190, whiteSpace: 'nowrap' },
          render: (row) => {
            const id = row.vendorId ?? row.id;
            const name = row.businessName || '';
            const newCount = Number(row.todayRegisterStudent ?? 0);

            const goToStudents = (newOnly) => {
              const params = new URLSearchParams({
                vendorId: id,
                vendorName: name,
              });
              if (newOnly) {
                params.set('newOnly', 'true');
                params.set('newCount', String(newCount));
              }
              navigate(`/reports/student-Inquiry?${params.toString()}`);
            };

            return (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'nowrap',
                  gap: 0.75,
                  width: '100%',
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToStudents(false);
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                    flexShrink: 0,
                  }}
                >
                  Student ({row.studentCount ?? 0})
                </Button>

                {newCount > 0 && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRows((prev) =>
                        prev.map((r) =>
                          (r.vendorId ?? r.id) === id
                            ? { ...r, todayRegisterStudent: 0 }
                            : r
                        )
                      );
                      goToStudents(true);
                    }}
                    sx={{ p: 0.5, flexShrink: 0 }}
                  >
                    <Badge
                      badgeContent={newCount}
                      color="error"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '10px !important',
                          minWidth: '14px',
                          height: '14px',
                          padding: '5px 5px',
                          lineHeight: 1,
                        },
                      }}
                    >
                      <NotificationsActiveIcon
                        sx={{
                          color: '#ffc107',
                          fontSize: 23,
                        }}
                      />
                    </Badge>
                  </IconButton>
                )}
              </Box>
            );
          },
        },
      ];
    }
if (isInvoices) {
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
  ];
}
    if (!isInstitutes) return resource.columns ?? [];

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
  }, [isInstitutes, isInvoices, isVendors, resource, selectedIds, allSelected, someSelected, toggleAll, toggleRow, openHistory, navigate, setRows]);

  const handleExportPdf = useCallback(() => {
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    if (!selectedRows.length) return;
    exportInstituteCommissionPdf(selectedRows);
  }, [rows, selectedIds]);

const handleExportInvoicesPdf = useCallback(async () => {
  if (!selectedIds.length) return;
  try {
    setError('');
    await downloadInvoiceDocuments(selectedIds);
  } catch (err) {
    setError(err.message || 'Failed to download invoice PDF(s).');
  }
}, [selectedIds]);

  const headerExtra = (
    <>
      {isCourses && instituteFilter && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(INSTITUTE_SCRAPPING_BASE_PATH)}
          sx={listOutlinedButtonSx}
        >
          Back to Institute
        </Button>
      )}
      {isInstitutes && (
        <Tooltip title={selectedIds.length === 0 ? 'Select at least one institute' : ''}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdfOutlinedIcon />}
              onClick={handleExportPdf}
              disabled={selectedIds.length === 0}
              sx={listOutlinedButtonSx}
            >
              Export PDF{selectedIds.length ? ` (${selectedIds.length})` : ''}
            </Button>
          </span>
        </Tooltip>
      )}
    </>
  );

  if (!resource || !page) return null;

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {typeof error === 'string' ? error : 'Something went wrong.'}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      <PageShell
        title={isCourses && instituteFilter ? `${page.title} — ${instituteFilter}` : page.title}
        subtitle={page.subtitle}
        stats={stats}
        showCharts={!isTemplates && !isInvoices && (page.showCharts !== false)}
        columns={columnsWithSelect}
        rows={loading ? [] : filteredDisplayRows}
        loading={loading}
        actionLabel={resource.actionLabel}
        searchPlaceholder={`Search ${resource.plural.toLowerCase()}...`}
       headerExtra={isVendors ? (
  <>
    <FormControl size="small" sx={{ display: 'none', ...listSearchFieldSx, minWidth: { xs: 0, md: 130 }, maxWidth: { xs: '100%', md: 160 } }}>
      <Select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <MenuItem value="All">All</MenuItem>
        <MenuItem value="Active">Active</MenuItem>
        <MenuItem value="Pending">Pending</MenuItem>
      </Select>
    </FormControl>

    <FormControl size="small" sx={{ ...listSearchFieldSx, minWidth: { xs: 0, md: 150 }, maxWidth: { xs: '100%', md: 180 } }}>
      <Select
        value={activityFilter}
        onChange={(e) => setActivityFilter(e.target.value)}
      >
        <MenuItem value="All">All activity</MenuItem>
        <MenuItem value="Active today">Active today</MenuItem>
        <MenuItem value="Idle">Idle</MenuItem>
      </Select>
    </FormControl>

    {headerExtra}
  </>
) : headerExtra}
 headerActionsAfterAdd={
    isInvoices ? (
      <Tooltip title={selectedIds.length === 0 ? 'Select at least one invoice' : ''}>
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={handleExportInvoicesPdf}
            disabled={selectedIds.length === 0}
            sx={listOutlinedButtonSx}
          >
            Download PDF{selectedIds.length ? ` (${selectedIds.length})` : ''}
          </Button>
        </span>
      </Tooltip>
    ) : null
  }
        onAdd={isInvoices ? handleOpenAddInvoice : () => navigate(`${basePath}/new`)}
     onRowClick={
  isInvoices
    ? (row) => {
        setError('');
        setEditInvoiceId(row.invoiceId || row.id);
        setEditInvoiceOpen(true);
      }
    : (row) => navigate(`${basePath}/${row.id}`, { state: { edit: true } })
}
        onDelete={isInvoices ? undefined : handleDelete}
      />

      {isInvoices && !invoiceView && (
        <AddInvoiceDialog
          open={addInvoiceOpen}
          onClose={() => setAddInvoiceOpen(false)}
          onGenerated={handleInvoiceGenerated}
        />
      )}
{isInvoices && !invoiceView && (
  <EditInvoiceDialog
    open={editInvoiceOpen}
    invoiceId={editInvoiceId}
    onClose={() => {
      setEditInvoiceOpen(false);
      setEditInvoiceId(null);
    }}
    onUpdated={async () => {
      setSuccess('Invoice status updated.');
      await refreshRows();
    }}
  />
)}
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
              <TableContentSkeleton
                rows={5}
                columns={[
                  { id: 'rateType', label: 'Rate Type', flex: 1 },
                  { id: 'rate', label: 'Rate', flex: 0.8 },
                  { id: 'effectiveFrom', label: 'From', flex: 1 },
                  { id: 'effectiveTo', label: 'To', flex: 1 },
                ]}
              />
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
