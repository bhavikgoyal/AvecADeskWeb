import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import TableContentSkeleton from '../../components/TableContentSkeleton';
import {
  resourceTableBodyCellSx,
  resourceTableBodyRowSx,
  resourceTableHeadCellSx,
  resourceTableHeadRowSx,
} from '../../components/resourceTableStyles';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import {
  FormSectionsLayout,
} from '../../components/forms';
import {
  createInstituteScrappingManual,
  exportInstituteScrappingExcel,
  fetchInstituteScrappingRows,
  getEmptyManualForm,
  runInstituteScrapping,
} from '../../api/institutesScrappingApi';
import {
  createInstituteCommissionRate,
  getEmptyCommissionRateForm,
} from '../../api/commissionsApi';
import { fetchCourseList } from '../../api/coursesApi';
import { fetchCoursesByInstitute } from '../../api/lookupApi';
import {
  AUTO_FORM_SECTIONS,
  AUTO_REQUIRED_FIELDS,
  MANUAL_FORM_SECTIONS,
  MANUAL_REQUIRED_FIELDS,
  INSTITUTE_SCRAPPING_BASE_PATH,
} from './instituteScrappingFormConfig';
import { useAuth } from '../../hooks/useAuth';

const PENDING_SCRAPES_STORAGE_KEY = 'institutes-scrapping-pending';

const LIST_COLUMNS = [
  { key: 'instituteName', label: 'Institute name' },
  { key: 'scrapingType', label: 'Scraping Type' },
  { key: 'logo', label: 'Logo' },
  { key: 'websiteUrl', label: 'Website URL' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'campus', label: 'Campus' },
  { key: 'state', label: 'State' },
  { key: 'countryRanking', label: 'Country ranking' },
];

function normalizeScrapeFlag(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
}

function getScrapingType(row) {
  if (row.isPendingScrape) return 'Auto';
  const isScrap = normalizeScrapeFlag(row.isScrap);
  if (isScrap === true) return 'Auto';
  return 'Manual';
}

function buildPendingScrapeRow(form, pendingId) {
  return {
    id: pendingId,
    scrappingId: pendingId,
    instituteName: form.instituteName?.trim() || '',
    websiteUrl: form.websiteUrl?.trim() || '',
    campus: '',
    state: '',
    country: '',
    city: '',
    countryRanking: '',
    isPendingScrape: true,
    scrapingType: 'Auto',
  };
}

function loadPendingScrapes() {
  try {
    const rawValue = window.localStorage.getItem(PENDING_SCRAPES_STORAGE_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingScrapes(rows) {
  try {
    if (!rows.length) {
      window.localStorage.removeItem(PENDING_SCRAPES_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(PENDING_SCRAPES_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore storage failures and keep runtime behavior intact.
  }
}

function addPendingScrape(row) {
  const nextRows = [row, ...loadPendingScrapes().filter((item) => item.id !== row.id)];
  savePendingScrapes(nextRows);
  return nextRows;
}

function removePendingScrape(pendingId) {
  const nextRows = loadPendingScrapes().filter((row) => row.id !== pendingId);
  savePendingScrapes(nextRows);
  return nextRows;
}

function renderCell(row, key) {
  if (key === 'scrapingType') {
    return getScrapingType(row);
  }

  const value = row[key] || '—';
  if ((key === 'websiteUrl' || key === 'logo') && value !== '—') {
    return (
      <Link
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        onClick={(event) => event.stopPropagation()}
      >
        {key === 'logo' ? 'Logo' : 'Website'}
      </Link>
    );
  }
  return value;
}

function getCoursesButtonLabel(row, courseCount) {
  if (row.isPendingScrape) {
    return 'Processing';
  }

  return `Courses (${courseCount})`;
}

export default function InstituteScrappingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAccounting = user?.role === 'Accounting';

  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [rows, setRows] = useState([]);
  const [backgroundScrapes, setBackgroundScrapes] = useState(() => loadPendingScrapes());
  const [courseCounts, setCourseCounts] = useState({});
  const [instituteNameFilter, setInstituteNameFilter] = useState('');
  const [appliedInstituteNameFilter, setAppliedInstituteNameFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add Institute dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeDialogTab, setActiveDialogTab] = useState(0);
  const [manualForm, setManualForm] = useState(() => ({ ...getEmptyManualForm(), autoDataCollection: false }));
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const [createdInstituteId, setCreatedInstituteId] = useState(null);
  const [showSaveFirst, setShowSaveFirst] = useState(false);

  // Commission rate (tab 2) state
  const [commissionForm, setCommissionForm] = useState(() => getEmptyCommissionRateForm());
  const [commissionCourses, setCommissionCourses] = useState([]);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionError, setCommissionError] = useState('');
  const [commissionSuccess, setCommissionSuccess] = useState('');

  const loadList = useCallback(async (
    instituteName = appliedInstituteNameFilter,
    { showLoader = rows.length === 0 && backgroundScrapes.length === 0 } = {},
  ) => {
    if (showLoader) {
      setListLoading(true);
    }
    setListError('');

    try {
      const data = await fetchInstituteScrappingRows({ instituteName });
      setRows(data);
    } catch (err) {
      setListError(err.message || 'Failed to load institute scrapping records.');
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [appliedInstituteNameFilter, backgroundScrapes.length, rows.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList();
  }, [loadList]);

  useEffect(() => {
    const hasActiveBackgroundScrape = backgroundScrapes.some((row) => row.isPendingScrape);
    if (!hasActiveBackgroundScrape) return undefined;

    const intervalId = window.setInterval(() => {
      void loadList(appliedInstituteNameFilter, { showLoader: false });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [appliedInstituteNameFilter, backgroundScrapes, loadList]);

  useEffect(() => {
    let active = true;

    const loadCourseCounts = async () => {
      const courseLookupIds = new Set(
        rows
          .map((row) => row.scrappingId ?? row.id)
          .filter((lookupId) => lookupId != null && lookupId !== ''),
      );

      if (courseLookupIds.size === 0) {
        if (active) setCourseCounts({});
        return;
      }

      try {
        const courses = await fetchCourseList();
        const counts = {};

        for (const lookupId of courseLookupIds) {
          counts[String(lookupId)] = 0;
        }

        for (const course of courses ?? []) {
          const lookupId = course.instituteId;
          const key = String(lookupId ?? '');

          if (!courseLookupIds.has(lookupId) && !courseLookupIds.has(key)) {
            continue;
          }

          counts[key] = (counts[key] ?? 0) + 1;
        }

        if (active) {
          setCourseCounts(counts);
        }
      } catch {
        if (active) setCourseCounts({});
      }
    };

    void loadCourseCounts();

    return () => {
      active = false;
    };
  }, [rows]);

  // Load courses for the commission-rate tab once an institute has been created/saved
  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      if (!createdInstituteId) {
        if (active) setCommissionCourses([]);
        return;
      }

      try {
        const data = await fetchCoursesByInstitute(createdInstituteId);
        if (active) setCommissionCourses(data?.courses ?? []);
      } catch {
        if (active) setCommissionCourses([]);
      }
    };

    void loadCourses();

    return () => {
      active = false;
    };
  }, [createdInstituteId]);

  const displayRows = useMemo(() => {
    const filterValue = appliedInstituteNameFilter.trim().toLowerCase();
    const persistedKeys = new Set(
      rows.map((row) => `${(row.instituteName || '').trim().toLowerCase()}|${(row.websiteUrl || '').trim().toLowerCase()}`),
    );
    const filteredBackgroundRows = backgroundScrapes.filter((row) => {
      const rowKey = `${(row.instituteName || '').trim().toLowerCase()}|${(row.websiteUrl || '').trim().toLowerCase()}`;
      if (persistedKeys.has(rowKey)) return false;
      if (!filterValue) return true;
      return (row.instituteName || '').toLowerCase().includes(filterValue);
    });

    return [...filteredBackgroundRows, ...rows];
  }, [appliedInstituteNameFilter, backgroundScrapes, rows]);

  const paginatedRows = useMemo(
    () => displayRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [displayRows, page, rowsPerPage],
  );

  const handleInstituteNameFilterChange = (event) => {
    setInstituteNameFilter(event.target.value);
  };

  const handleApplyFilter = async () => {
    setAppliedInstituteNameFilter(instituteNameFilter.trim());
    setPage(0);
    await loadList(instituteNameFilter.trim());
  };

  const handleClearFilter = async () => {
    setInstituteNameFilter('');
    setAppliedInstituteNameFilter('');
    setPage(0);
    await loadList('');
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setListError('');

    try {
      await exportInstituteScrappingExcel({ instituteName: appliedInstituteNameFilter });
    } catch (err) {
      setListError(err.message || 'Failed to export institute scrapping records.');
    } finally {
      setExporting(false);
    }
  };

  const openAddDialog = () => {
    setManualForm({ ...getEmptyManualForm(), autoDataCollection: false });
    setManualError('');
    setActiveDialogTab(0);
    setCreatedInstituteId(null);
    setShowSaveFirst(false);
    setCommissionForm(getEmptyCommissionRateForm());
    setCommissionCourses([]);
    setCommissionError('');
    setCommissionSuccess('');
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    if (manualSaving || commissionSaving) return;
    setAddDialogOpen(false);
    setManualError('');
    setActiveDialogTab(0);
    setCreatedInstituteId(null);
    setShowSaveFirst(false);
    setCommissionForm(getEmptyCommissionRateForm());
    setCommissionCourses([]);
    setCommissionError('');
    setCommissionSuccess('');
  };

  const handleDialogTabChange = (_event, value) => {
    if (value === 1 && !createdInstituteId) {
      setShowSaveFirst(true);
      return;
    }
    setShowSaveFirst(false);
    setActiveDialogTab(value);
  };

  const updateManualField = (field, value) => {
    setManualForm((prev) => ({ ...prev, [field]: value }));
    setManualError('');
  };

  const handleToggleAutoDataCollection = (event) => {
    const checked = event.target.checked;
    setManualForm((prev) => ({ ...prev, autoDataCollection: checked }));
    setManualError('');
  };

  const activeRequiredFields = manualForm.autoDataCollection ? AUTO_REQUIRED_FIELDS : MANUAL_REQUIRED_FIELDS;
  const activeSections = manualForm.autoDataCollection ? AUTO_FORM_SECTIONS : MANUAL_FORM_SECTIONS;
  const isManualFormValid = activeRequiredFields.every((field) => String(manualForm[field] ?? '').trim());

  const handleManualSave = async () => {
    if (!isManualFormValid) {
      setManualError(
        manualForm.autoDataCollection
          ? 'Institute name and Website URL are required.'
          : 'Institute name is required.',
      );
      return;
    }

    setManualSaving(true);
    setManualError('');
    setListError('');
    setWarning('');
    setSuccess('');

    try {
      if (manualForm.autoDataCollection) {
        const scrapeRequest = {
          instituteName: manualForm.instituteName,
          websiteUrl: manualForm.websiteUrl,
        };
        const pendingId = `pending-${Date.now()}`;
        const pendingRow = buildPendingScrapeRow(scrapeRequest, pendingId);

        setBackgroundScrapes(addPendingScrape(pendingRow));
        setAddDialogOpen(false);
        setManualForm({ ...getEmptyManualForm(), autoDataCollection: false });
        setManualSaving(false);
        setSuccess('Scraping started in the background. You can track its status in the records list.');

        void (async () => {
          try {
            const response = await runInstituteScrapping(scrapeRequest);
            setBackgroundScrapes(removePendingScrape(pendingId));
            await loadList();

            if (response.usedAiFallback) {
              setWarning(
                response.message ||
                  'Website blocked scraping. ChatGPT generated data from institute name and URL — please verify before use.',
              );
            } else if ((response.recordsInserted ?? 0) === 0) {
              setWarning(
                response.message || 'Scraping finished but no institute/course records were saved. Check the website URL or API logs.',
              );
            } else {
              setSuccess(
                response.message ||
                  `Institute scraped successfully. ${response.recordsInserted} course(s) saved to Courses.`,
              );
            }
          } catch (err) {
            setBackgroundScrapes(removePendingScrape(pendingId));
            setListError(err.message || 'Failed to save institute.');
          }
        })();

        return;
      } else {
        const created = await createInstituteScrappingManual(manualForm);
        const newInstituteId = created?.instituteId ?? created?.InstituteId ?? created?.id ?? null;
        setCreatedInstituteId(newInstituteId);
        setSuccess('Institute added successfully. You can add its commission rate below, or add courses later from the Courses page.');

        if (newInstituteId) {
          setActiveDialogTab(1);
        } else {
          setAddDialogOpen(false);
        }
      }

      setPage(0);
      await loadList();
    } catch (err) {
      setManualError(err.message || 'Failed to save institute.');
    } finally {
      setManualSaving(false);
    }
  };

  const updateCommissionField = (field, value) => {
    setCommissionForm((prev) => ({ ...prev, [field]: value }));
    setCommissionError('');
  };

  const handleAddCommission = async () => {
    if (!commissionForm.rateType || !commissionForm.rate || !commissionForm.effectiveFrom) {
      setCommissionError('Rate type, rate and effective from are required.');
      return;
    }

    setCommissionSaving(true);
    setCommissionError('');
    setCommissionSuccess('');

    try {
      await createInstituteCommissionRate({
        ...commissionForm,
        instituteId: createdInstituteId,
      });
      setCommissionSuccess('Commission rate added successfully.');
      setCommissionForm(getEmptyCommissionRateForm());
    } catch (err) {
      setCommissionError(err.message || 'Failed to save commission rate.');
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleRowClick = (row) => {
    if (row?.isPendingScrape) return;
    if (row?.id) {
      navigate(`${INSTITUTE_SCRAPPING_BASE_PATH}/${row.id}`);
    }
  };

  const handleViewCourses = (event, row) => {
    event.stopPropagation();
    if (row?.instituteName) {
      navigate(`/courses?institute=${encodeURIComponent(row.instituteName)}`);
    }
  };

  const handleViewStudents = (event) => {
    event.stopPropagation();
    navigate('/students');
  };

  const handleViewInvoices = (event) => {
    event.stopPropagation();
    navigate('/invoices');
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      {warning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warning}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mt: 1, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Institutes
        </Typography>

        {listError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {listError}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            border: '1px solid var(--card-border)',
            borderRadius: 2,
            overflow: 'hidden',
            width: '100%',
          }}
        >
<<<<<<< Updated upstream
          <>
=======
          {listLoading && displayRows.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: 'var(--primary)' }} />
            </Box>
          ) : (
            <>
>>>>>>> Stashed changes
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                  px: 2,
                  py: 2,
                  borderBottom: '1px solid var(--card-border)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
                  <TextField
                    label="Institute name"
                    placeholder="Filter by institute name"
                    size="small"
                    value={instituteNameFilter}
                    onChange={handleInstituteNameFilterChange}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleApplyFilter();
                      }
                    }}
                    sx={{ minWidth: 240, maxWidth: 360 }}
                    disabled={listLoading}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SearchIcon />}
                    onClick={handleApplyFilter}
                    sx={{ textTransform: 'none', height: 40 }}
                    disabled={listLoading}
                  >
                    Search
                  </Button>
                  {appliedInstituteNameFilter && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleClearFilter}
                      sx={{ textTransform: 'none', height: 40 }}
                      disabled={listLoading}
                    >
                      Clear
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={openAddDialog}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    disabled={listLoading}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <TableChartIcon />}
                    onClick={handleExportExcel}
                    disabled={exporting || listLoading || rows.length === 0}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Export to Excel
                  </Button>
                </Box>
              </Box>

<<<<<<< Updated upstream
              {listLoading ? (
                <TableContentSkeleton
                  rows={10}
                  columns={[
                    { id: 'sno', label: 'S No', width: '64px', skeletonWidth: 24 },
                    { id: 'instituteName', label: 'Institute name', flex: 1.8 },
                    { id: 'logo', label: 'Logo', flex: 0.7, skeletonWidth: 48 },
                    { id: 'websiteUrl', label: 'Website URL', flex: 0.8, skeletonWidth: 64 },
                    { id: 'country', label: 'Country', flex: 0.9 },
                    { id: 'city', label: 'City', flex: 0.9 },
                    { id: 'campus', label: 'Campus', flex: 1.2 },
                    { id: 'state', label: 'State', flex: 0.8 },
                    { id: 'countryRanking', label: 'Country ranking', flex: 1.6 },
                    { id: 'actions', label: 'Actions', flex: 1.1, skeletonWidth: 110, skeletonHeight: 28 },
                  ]}
                />
              ) : rows.length === 0 ? (
=======
              {displayRows.length === 0 ? (
>>>>>>> Stashed changes
                <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                    {appliedInstituteNameFilter
                      ? 'No records match the institute name filter.'
                      : 'No scrapping records yet. Click "Add" to create one.'}
                  </Typography>
                </Box>
              ) : (
              <>
              <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1100 }}>
                  <TableHead>
                    <TableRow sx={resourceTableHeadRowSx}>
                      <TableCell sx={{ ...resourceTableHeadCellSx, whiteSpace: 'nowrap' }}>S No</TableCell>
                      {LIST_COLUMNS.map((column) => (
                        <TableCell key={column.key} sx={{ ...resourceTableHeadCellSx, whiteSpace: 'nowrap' }}>
                          {column.label}
                        </TableCell>
                      ))}
                      <TableCell sx={{ ...resourceTableHeadCellSx, whiteSpace: 'nowrap' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map((row, index) => {
                      const courseLookupId = row.scrappingId ?? row.id;
                      const courseCount = courseCounts[String(courseLookupId)] ?? 0;

                      return (
                      <TableRow
                        key={row.id || `${page}-${index}`}
                        hover
                        onClick={() => handleRowClick(row)}
                        sx={{ cursor: 'pointer', ...resourceTableBodyRowSx }}
                      >
                        <TableCell sx={resourceTableBodyCellSx}>{page * rowsPerPage + index + 1}</TableCell>
                        {LIST_COLUMNS.map((column) => (
                          <TableCell
                            key={column.key}
                            sx={{ ...resourceTableBodyCellSx, maxWidth: 220, whiteSpace: 'normal' }}
                          >
                            {renderCell(row, column.key)}
                          </TableCell>
                        ))}
                        <TableCell sx={resourceTableBodyCellSx}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SchoolIcon />}
                              onClick={(event) => handleViewCourses(event, row)}
<<<<<<< Updated upstream
                              sx={{ textTransform: 'none', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
=======
                              disabled={row.isPendingScrape}
                              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
>>>>>>> Stashed changes
                            >
                              {getCoursesButtonLabel(row, courseCount)}
                            </Button>

                            {isAccounting && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PeopleIcon />}
                                  onClick={handleViewStudents}
                                  sx={{ textTransform: 'none', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
                                >
                                  View Student
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ReceiptIcon />}
                                  onClick={handleViewInvoices}
                                  sx={{ textTransform: 'none', whiteSpace: 'nowrap', fontSize: '0.8125rem' }}
                                >
                                  View Invoice
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={displayRows.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Rows per page:"
              />
              </>
              )}
            </>
        </Paper>
      </Box>

      <Dialog open={addDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 0 }}>Add Institute</DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={activeDialogTab} onChange={handleDialogTabChange}>
            <Tab label="Institute details" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Commission rate" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
        </Box>

        <DialogContent dividers>
          {activeDialogTab === 0 && (
            <>
              {manualError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {manualError}
                </Alert>
              )}

              {showSaveFirst && !createdInstituteId && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setShowSaveFirst(false)}>
                  Please save institute details first before adding a commission rate.
                </Alert>
              )}

              {createdInstituteId && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Institute saved. Switch to the "Commission rate" tab to add a rate, or close this dialog.
                </Alert>
              )}

              <FormControlLabel
                sx={{ mb: 1.5 }}
                control={
                  <Checkbox
                    checked={!!manualForm.autoDataCollection}
                    onChange={handleToggleAutoDataCollection}
                    disabled={manualSaving || !!createdInstituteId}
                  />
                }
                label="Auto Data Collection"
              />

              <FormSectionsLayout
                sections={activeSections}
                form={manualForm}
                onChange={updateManualField}
                disabled={manualSaving || !!createdInstituteId}
                requiredFields={activeRequiredFields}
                fieldDefsOverride={{ campus: { type: 'text' } }}
              />
            </>
          )}

          {activeDialogTab === 1 && (
            <>
              {commissionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {commissionError}
                </Alert>
              )}
              {commissionSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {commissionSuccess}
                </Alert>
              )}

              <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                <TextField
                  select
                  label="Course"
                  value={commissionForm.courseId}
                  fullWidth
                  disabled={commissionSaving}
                  onChange={(e) => updateCommissionField('courseId', e.target.value)}
                >
                  <MenuItem value="">Select Course</MenuItem>
                  {commissionCourses.map((c) => (
                    <MenuItem key={c.courseId} value={c.courseId}>
                      {c.courseName}
                    </MenuItem>
                  ))}
                  {commissionCourses.length === 0 && (
                    <MenuItem value="" disabled>
                      No courses available yet
                    </MenuItem>
                  )}
                </TextField>

                <TextField
                  select
                  label="Rate Type"
                  value={commissionForm.rateType}
                  fullWidth
                  required
                  disabled={commissionSaving}
                  onChange={(e) => updateCommissionField('rateType', e.target.value)}
                >
                  <MenuItem value="Fixed">Fixed</MenuItem>
                  <MenuItem value="Percentage">Percentage</MenuItem>
                </TextField>

                <TextField
                  label="Rate"
                  type="number"
                  value={commissionForm.rate}
                  fullWidth
                  required
                  disabled={commissionSaving}
                  onChange={(e) => updateCommissionField('rate', e.target.value)}
                />

                <TextField
                  label="Effective From"
                  type="date"
                  value={commissionForm.effectiveFrom}
                  fullWidth
                  required
                  disabled={commissionSaving}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => updateCommissionField('effectiveFrom', e.target.value)}
                />

                <TextField
                  label="Effective To"
                  type="date"
                  value={commissionForm.effectiveTo}
                  fullWidth
                  disabled={commissionSaving}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => updateCommissionField('effectiveTo', e.target.value)}
                />
              </Stack>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {activeDialogTab === 0 && (
            <>
              <Button onClick={closeAddDialog} disabled={manualSaving} sx={{ textTransform: 'none' }}>
                {createdInstituteId ? 'Done' : 'Cancel'}
              </Button>
              {!createdInstituteId && (
                <Button
                  variant="contained"
                  onClick={handleManualSave}
                  disabled={!isManualFormValid || manualSaving}
                  sx={{ textTransform: 'none' }}
                >
                  {manualSaving
                    ? (manualForm.autoDataCollection ? 'Scraping…' : 'Saving…')
                    : 'Save'}
                </Button>
              )}
            </>
          )}

          {activeDialogTab === 1 && (
            <>
              <Button onClick={closeAddDialog} disabled={commissionSaving} sx={{ textTransform: 'none' }}>
                Done
              </Button>
              <Button
                variant="contained"
                onClick={handleAddCommission}
                disabled={commissionSaving}
                sx={{ textTransform: 'none' }}
              >
                {commissionSaving ? 'Saving…' : 'Add Commission Rate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
