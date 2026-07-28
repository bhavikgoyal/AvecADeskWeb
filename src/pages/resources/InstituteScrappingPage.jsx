import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Backdrop,
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
  Paper,
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
  AUTO_FORM_SECTIONS,
  AUTO_REQUIRED_FIELDS,
  MANUAL_FORM_SECTIONS,
  MANUAL_REQUIRED_FIELDS,
  INSTITUTE_SCRAPPING_BASE_PATH,
} from './instituteScrappingFormConfig';
import { useAuth } from '../../hooks/useAuth';

const LIST_COLUMNS = [
  { key: 'instituteName', label: 'Institute name' },
  { key: 'logo', label: 'Logo' },
  { key: 'websiteUrl', label: 'Website URL' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'campus', label: 'Campus' },
  { key: 'state', label: 'State' },
  { key: 'countryRanking', label: 'Country ranking' },
];

function renderCell(row, key) {
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

export default function InstituteScrappingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAccounting = user?.role === 'Accounting';

  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [rows, setRows] = useState([]);
  const [instituteNameFilter, setInstituteNameFilter] = useState('');
  const [appliedInstituteNameFilter, setAppliedInstituteNameFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manualForm, setManualForm] = useState(() => ({ ...getEmptyManualForm(), autoDataCollection: false }));
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  const loadList = useCallback(async (instituteName = appliedInstituteNameFilter) => {
    setListLoading(true);
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
  }, [appliedInstituteNameFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList();
  }, [loadList]);

  const paginatedRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
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
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    if (manualSaving) return;
    setAddDialogOpen(false);
    setManualError('');
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
        const response = await runInstituteScrapping({
          instituteName: manualForm.instituteName,
          websiteUrl: manualForm.websiteUrl,
        });

        setAddDialogOpen(false);
        setManualForm({ ...getEmptyManualForm(), autoDataCollection: false });

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
      } else {
        await createInstituteScrappingManual(manualForm);
        setAddDialogOpen(false);
        setManualForm({ ...getEmptyManualForm(), autoDataCollection: false });
        setSuccess('Institute added successfully. Add its courses from the Courses page.');
      }

      setPage(0);
      await loadList();
    } catch (err) {
      setManualError(err.message || 'Failed to save institute.');
    } finally {
      setManualSaving(false);
    }
  };

  const handleRowClick = (row) => {
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
      {/* <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Institutes Scrapping
      </Typography> */}

      <Backdrop
        open={manualSaving && manualForm.autoDataCollection}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress color="inherit" size={56} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Scraping website…
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Discovering program pages — usually 3–10 minutes. Do not close this tab.
        </Typography>
      </Backdrop>

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
          <>
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
                    <TableRow sx={{ backgroundColor: 'var(--muted-bg)' }}>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>S No</TableCell>
                      {LIST_COLUMNS.map((column) => (
                        <TableCell key={column.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {column.label}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map((row, index) => (
                      <TableRow
                        key={row.id || `${page}-${index}`}
                        hover
                        onClick={() => handleRowClick(row)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        {LIST_COLUMNS.map((column) => (
                          <TableCell key={column.key} sx={{ maxWidth: 220, whiteSpace: 'normal' }}>
                            {renderCell(row, column.key)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SchoolIcon />}
                              onClick={(event) => handleViewCourses(event, row)}
                              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                            >
                              View Courses
                            </Button>

                            {isAccounting && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<PeopleIcon />}
                                  onClick={handleViewStudents}
                                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                  View Student
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<ReceiptIcon />}
                                  onClick={handleViewInvoices}
                                  sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                >
                                  View Invoice
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={rows.length}
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
        <DialogTitle>Add Institute</DialogTitle>
        <DialogContent dividers>
          {manualError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {manualError}
            </Alert>
          )}

          <FormControlLabel
            sx={{ mb: 1.5 }}
            control={
              <Checkbox
                checked={!!manualForm.autoDataCollection}
                onChange={handleToggleAutoDataCollection}
                disabled={manualSaving}
              />
            }
            label="Auto Data Collection"
          />

          <FormSectionsLayout
            sections={activeSections}
            form={manualForm}
            onChange={updateManualField}
            disabled={manualSaving}
            requiredFields={activeRequiredFields}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeAddDialog} disabled={manualSaving} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
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
        </DialogActions>
      </Dialog>
    </Box>
  );
}
