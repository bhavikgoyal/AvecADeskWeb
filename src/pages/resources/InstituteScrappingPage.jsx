import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Backdrop,
  Box,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import {
  FormActions,
  FormPageLayout,
  FormSectionsLayout,
  formPaperSx,
} from '../../components/forms';
import { fetchInstituteScrappingRows, runInstituteScrapping } from '../../api/institutesScrappingApi';
import { getEmptyForm, getResourceConfig, isFormValid } from '../../config/resourceConfig';

const BASE_PATH = '/institutes-scrapping';

const LIST_COLUMNS = [
  { key: 'instituteName', label: 'Institute name' },
  { key: 'logo', label: 'Logo URL' },
  { key: 'campus', label: 'Campus' },
  { key: 'programName', label: 'Program name' },
  { key: 'level', label: 'Level' },
  { key: 'programLink', label: 'Program link' },
  { key: 'cricosCode', label: 'CRICOS code' },
  { key: 'duration', label: 'Duration' },
  { key: 'intake', label: 'Intake' },
  { key: 'feesYearly', label: 'Fees yearly' },
  { key: 'countryRanking', label: 'Country ranking' },
];

function renderCell(row, key) {
  const value = row[key] || '—';
  if (key === 'programLink' && value !== '—') {
    return (
      <Link href={value} target="_blank" rel="noopener noreferrer" underline="hover">
        Link
      </Link>
    );
  }
  if (key === 'logo' && value !== '—') {
    return (
      <Link href={value} target="_blank" rel="noopener noreferrer" underline="hover">
        Logo
      </Link>
    );
  }
  return value;
}

export default function InstituteScrappingPage() {
  const resource = getResourceConfig(BASE_PATH);
  const [form, setForm] = useState(() => getEmptyForm(BASE_PATH));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');

    try {
      const data = await fetchInstituteScrappingRows();
      setRows(data);
    } catch (err) {
      setListError(err.message || 'Failed to load institute scrapping records.');
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const paginatedRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
  );

  if (!resource) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
    setWarning('');
    setError('');
  };

  const handleReset = () => {
    setForm(getEmptyForm(BASE_PATH));
    setError('');
    setSuccess('');
    setWarning('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    setWarning('');

    try {
      const response = await runInstituteScrapping(form);
      if (response.usedAiFallback) {
        setWarning(
          response.message ||
            'Website blocked scraping. ChatGPT generated program data from institute name and URL — please verify before use.',
        );
      } else if ((response.recordsInserted ?? 0) === 0) {
        setWarning(
          response.message || 'Scraping finished but no program records were saved. Check the website URL or API logs.',
        );
      } else {
        setSuccess(
          response.message ||
            `${response.recordsInserted} program record(s) scraped from the website and saved.`,
        );
      }
      setForm(getEmptyForm(BASE_PATH));
      setPage(0);
      await loadList();
    } catch (err) {
      setError(err.message || 'Failed to scrape institute website.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <FormPageLayout title="Institutes Scrapping">
      <Backdrop
        open={submitting}
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
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

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSectionsLayout sections={resource.sections} form={form} onChange={updateField} />
        <FormActions
          onCancel={handleReset}
          onSubmit={handleSubmit}
          submitLabel={submitting ? 'Scraping live website…' : 'Start Scraping'}
          cancelLabel="Clear"
          submitDisabled={!isFormValid(resource, form) || submitting}
        />
      </Paper>

      <Box sx={{ mt: 3, width: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Institute Scrap List
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
          {listLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: 'var(--primary)' }} />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                No scrapping records yet. Use the form above to scrape an institute website.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1400 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'var(--muted-bg)' }}>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>S No</TableCell>
                      {LIST_COLUMNS.map((column) => (
                        <TableCell key={column.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {column.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map((row, index) => (
                      <TableRow key={row.id || `${page}-${index}`} hover>
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        {LIST_COLUMNS.map((column) => (
                          <TableCell key={column.key} sx={{ maxWidth: 220, whiteSpace: 'normal' }}>
                            {renderCell(row, column.key)}
                          </TableCell>
                        ))}
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
        </Paper>
      </Box>
    </FormPageLayout>
  );
}
