import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  TextField, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FormPageLayout, formPaperSx } from '../../components/forms';
import { getStudentApplications } from '../../api/StudentApplicationApi';
import { getResourceConfig } from '../../config/resourceConfig';

const RECENT_DATE_KEYS = [
  'createdAt',
  'CreatedAt',
  'createdOn',
  'CreatedOn',
  'applicationDate',
  'ApplicationDate',
  'submittedDate',
  'SubmittedDate',
  'registeredDate',
  'RegisteredDate',
];

const RECENT_ID_KEYS = ['studentID', 'StudentID', 'id', 'ID'];

function getRecentRowRank(row) {
  for (const key of RECENT_DATE_KEYS) {
    const value = row?.[key];
    if (!value) continue;

    const stamp = new Date(value).getTime();
    if (Number.isFinite(stamp)) return stamp;
  }

  for (const key of RECENT_ID_KEYS) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }

  return 0;
}

function getNewestRows(rows, limit) {
  if (!Array.isArray(rows) || limit <= 0) return [];

  return [...rows]
    .sort((left, right) => getRecentRowRank(right) - getRecentRowRank(left))
    .slice(0, limit);
}

export default function StudentApplicationDetailsPage() {
  const resource = getResourceConfig('/reports/student-Inquiry');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendorId');
  const vendorNameFromQuery = searchParams.get('vendorName');
  const isNewOnly = searchParams.get('newOnly') === 'true';
  const newOnlyCount = Number(searchParams.get('newCount') ?? 0);
  const recentLimit = Number.isFinite(newOnlyCount) && newOnlyCount > 0 ? newOnlyCount : 0;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [totalRecords, setTotalRecords] = useState(0);

  const visibleRows = useMemo(() => {
    if (!isNewOnly) return rows;
    const startIndex = (pageNumber - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [isNewOnly, pageNumber, rows]);

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const start = totalRecords === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const end = Math.min(pageNumber * pageSize, totalRecords);

  const startPage = Math.floor((pageNumber - 1) / 5) * 5 + 1;

  const filteredVendorName = useMemo(() => {
    if (vendorNameFromQuery) return vendorNameFromQuery;
    return rows.find((r) => r.vendorName)?.vendorName || '';
  }, [vendorNameFromQuery, rows]);

  useEffect(() => {
    setPageNumber(1);
    loadData(search, 1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, isNewOnly, recentLimit]);

  const loadData = async (searchText = '', pageNo = pageNumber, size = pageSize) => {
    try {
      setLoading(true);
      setError('');

      const requestPage = isNewOnly ? 1 : pageNo;
      const requestSize = isNewOnly ? Math.max(size, recentLimit, 200) : size;

      const response = await getStudentApplications(
        searchText,
        requestPage,
        requestSize,
        vendorId || null,
      );

      const responseRows = response.data || response.Data || [];

      if (isNewOnly) {
        const recentRows = getNewestRows(responseRows, recentLimit || responseRows.length);
        setRows(recentRows);
        setTotalRecords(recentRows.length);
        return;
      }

      setRows(responseRows);
      setTotalRecords(response.totalRecords ?? response.TotalRecords ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load student applications.');
    } finally {
      setLoading(false);
    }
  };

  const pageButtonStyle = {
    width: 34,
    height: 34,
    border: "none",
    borderRight: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8125rem",

    "&:last-child": {
      borderRight: "none",
    },
  };

  return (
    <FormPageLayout
      title={resource?.plural || "Student Applications"}
      subtitle={
        vendorId
          ? `${isNewOnly ? 'New students' : 'Students'} for vendor${filteredVendorName ? `: ${filteredVendorName}` : ''}`
          : "Student Application Details"
      }
      metaItems={[
        {
          label: 'Total Records',
          value: totalRecords,
        },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {vendorId && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/vendors')}
                sx={{ textTransform: 'none', fontWeight: 600, height: 40 }}
              >
                Back to Vendors
              </Button>
            )}
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                setPageNumber(1);
                loadData(value, 1, pageSize);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "350px",
                minWidth: "180px",
                maxWidth: "350px",
                flex: "0 0 350px",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ whiteSpace: "nowrap" }}
            >
              Showing {start}-{end} of {totalRecords}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <Box
                component="button"
                onClick={() => {
                  if (pageNumber > 1) {
                    const prevPage = pageNumber - 1;
                    setPageNumber(prevPage);
                    if (!isNewOnly) {
                      loadData(search, prevPage, pageSize);
                    }
                  }
                }}
                sx={pageButtonStyle}
              >
                ‹
              </Box>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = startPage + i;
                if (page > totalPages) return null;

                return (
                  <Box
                    key={page}
                    component="button"
                    onClick={() => {
                      setPageNumber(page);
                      if (!isNewOnly) {
                        loadData(search, page, pageSize);
                      }
                    }}
                    sx={{
                      ...pageButtonStyle,
                      bgcolor: page === pageNumber ? "#1976d2" : "#fff",
                      color: page === pageNumber ? "#fff" : "#1f2937",
                      fontWeight: 600,
                      "&:hover": {
                        bgcolor: page === pageNumber ? "#1976d2" : "#f3f4f6",
                      },
                    }}
                  >
                    {page}
                  </Box>
                );
              })}

              <Box
                component="button"
                onClick={() => {
                  if (pageNumber < totalPages) {
                    const nextPage = pageNumber + 1;
                    setPageNumber(nextPage);
                    if (!isNewOnly) {
                      loadData(search, nextPage, pageSize);
                    }
                  }
                }}
                sx={pageButtonStyle}
              >
                ›
              </Box>
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box
            sx={{
              py: 5,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead
                sx={{
                  backgroundColor: '#eef2f6',
                }}
              >
                <TableRow>
                  {resource?.columns?.map((column) => (
                    <TableCell
                      key={column.id || column.field}
                      sx={{
                        backgroundColor: '#eef2f6',
                        color: '#23395d',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        borderBottom: '1px solid #d7dde5',
                        padding: '12px 16px',
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={resource?.columns?.length || 8}
                      align="center"
                    >
                      No Records Found
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row, idx) => (
                    <TableRow key={row.studentID || row.id || idx} hover>
                     {resource?.columns?.map((column) => (
                      <TableCell key={column.id || column.field}>
                        {column.id === 'action' ? (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: 'none' }}
                           onClick={() => navigate(`/application-details/${row.studentID}`)}
                          >
                            View
                          </Button>
                        ) : (
                          row[column.field] || '-'
                        )}
                      </TableCell>
                    ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </FormPageLayout>
  );
}
