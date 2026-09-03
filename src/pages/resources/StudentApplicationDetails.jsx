import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { FormPageLayout, formPaperSx, listOutlinedButtonSx, listSearchFieldSx, listToolbarRowSx } from '../../components/forms';
import TableContentSkeleton from '../../components/TableContentSkeleton';
import {
  resourceTableBodyCellSx,
  resourceTableBodyRowSx,
  resourceTableHeadCellSx,
  resourceTableHeadRowSx,
} from '../../components/resourceTableStyles';
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
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const visibleRows = useMemo(() => {
    if (!isNewOnly) return rows;
    const startIndex = (pageNumber - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [isNewOnly, pageNumber, pageSize, rows]);

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

  const handleChangePage = (_event, newPage) => {
    const nextPage = newPage + 1;
    setPageNumber(nextPage);
    if (!isNewOnly) {
      loadData(search, nextPage, pageSize);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const nextSize = parseInt(event.target.value, 10);
    setPageSize(nextSize);
    setPageNumber(1);
    if (!isNewOnly) {
      loadData(search, 1, nextSize);
    }
  };

  const skeletonColumns = (resource?.columns || []).map((column) => {
    const id = column.id || column.field;
    if (id === 'action') {
      return { id, label: column.label, flex: 0.7, skeletonWidth: 56, skeletonHeight: 28 };
    }
    if (id === 'email' || id === 'vendorName' || id === 'highestQualification') {
      return { id, label: column.label, flex: 1.4, skeletonWidth: '85%' };
    }
    if (id === 'testScore' || id === 'phone') {
      return { id, label: column.label, flex: 0.8, skeletonWidth: '60%' };
    }
    return { id, label: column.label, flex: 1 };
  });

  return (
    <FormPageLayout
      title={resource?.plural || 'Student Applications'}
      subtitle={
        vendorId
          ? `${isNewOnly ? 'New students' : 'Students'} for vendor${filteredVendorName ? `: ${filteredVendorName}` : ''}`
          : 'Student Application Details'
      }
      metaItems={[
        {
          label: 'Total Records',
          value: totalRecords,
        },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%', minWidth: 0, overflow: 'hidden' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            ...listToolbarRowSx,
            px: { xs: 0.25, md: 0.5 },
            pb: 1,
          }}
        >
          {vendorId && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/vendors')}
              sx={listOutlinedButtonSx}
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
            sx={listSearchFieldSx}
          />
        </Box>

        {loading ? (
          <TableContentSkeleton rows={pageSize} columns={skeletonColumns} />
        ) : (
          <>
            <TableContainer
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'block',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Table size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow sx={resourceTableHeadRowSx}>
                    {resource?.columns?.map((column) => (
                      <TableCell
                        key={column.id || column.field}
                        sx={{ ...resourceTableHeadCellSx, whiteSpace: 'nowrap' }}
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
                        sx={resourceTableBodyCellSx}
                      >
                        No Records Found
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row, idx) => (
                      <TableRow key={row.studentID || row.id || idx} hover sx={resourceTableBodyRowSx}>
                        {resource?.columns?.map((column) => (
                          <TableCell key={column.id || column.field} sx={resourceTableBodyCellSx}>
                            {column.id === 'action' ? (
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
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

            <TablePagination
              component="div"
              count={totalRecords}
              page={Math.max(0, pageNumber - 1)}
              onPageChange={handleChangePage}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Rows per page:"
            />
          </>
        )}
      </Paper>
    </FormPageLayout>
  );
}
