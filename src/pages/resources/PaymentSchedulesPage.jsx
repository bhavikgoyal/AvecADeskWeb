import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableContentSkeleton from "../../components/TableContentSkeleton";
import { getResourceConfig } from "../../config/resourceConfig";
import { TablePagination } from "@mui/material";
import {
  listContainedButtonSx,
  listOutlinedButtonSx,
  listSelectFieldSx,
  listSelectProps,
  listToolbarRowSx,
  LIST_FILTER_ALL,
} from "../../components/forms";
import { fetchStudentPaymentScheduleList, fetchStudentCourseCompleteList, formatCurrency, formatDisplayDate } from "../../api/schedulesApi";

const INSTITUTE_SCRAPPING_BASE_PATH = "/institutes-scrapping";

function normalizeInstituteName(value) {
  return String(value || "").trim().replace(/:+\s*$/, "").trim().toLowerCase();
}

export default function PaymentSchedulesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedInstituteName = location.state?.instituteName || "";
  const fromInstitute = Boolean(location.state?.fromInstitute);
  const selectedInstituteKey = useMemo(
    () => normalizeInstituteName(selectedInstituteName),
    [selectedInstituteName],
  );

  const resource = useMemo(() => getResourceConfig("/payment-schedules"), []);

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [instituteFilter, setInstituteFilter] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [completeRows, setCompleteRows] = useState([]);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completePage, setCompletePage] = useState(0);
  const [completeRowsPerPage, setCompleteRowsPerPage] = useState(10);
  const initParams = new URLSearchParams(location.search);
  const initCurrent = initParams.has("currentMonth") || initParams.get("currentMonth") === "true";
  const [currentMonthOnly, setCurrentMonthOnly] = useState(initCurrent);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
  };

  const parseFilterFromUrl = () => {
    const params = new URLSearchParams(location.search);

    return {
      y: params.get("year") ? Number(params.get("year")) : null,
      m: params.get("month") ? Number(params.get("month")) : null,
      currentFlag:
        params.has("currentMonth") ||
        params.get("currentMonth") === "true",
      nextMonth: params.get("filter") === "next-month",
    };
  };

  const paginatedRows = useMemo(
    () =>
      rows.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [rows, page, rowsPerPage]
  );
  const completePaginatedRows = useMemo(
    () =>
      completeRows.slice(
        completePage * completeRowsPerPage,
        completePage * completeRowsPerPage + completeRowsPerPage
      ),
    [completeRows, completePage, completeRowsPerPage]
  );
  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { nextMonth } = parseFilterFromUrl();

      // Do not send student name as studentId
      const result = await fetchStudentPaymentScheduleList(
        undefined,
        nextMonth
      );

      let filteredResult = result || [];

      // Existing institute filter from navigation
      if (selectedInstituteKey) {
        filteredResult = filteredResult.filter(
          (item) =>
            normalizeInstituteName(item.instituteName) ===
            selectedInstituteKey
        );
      }

      // Institute dropdown filter
      if (instituteFilter.trim()) {
        const instituteSearch = instituteFilter
          .trim()
          .toLowerCase();

        filteredResult = filteredResult.filter((item) =>
          String(item.instituteName || '')
            .toLowerCase()
            .includes(instituteSearch)
        );
      }

      // Student name textbox filter
      if (studentNameFilter.trim()) {
        const studentSearch = studentNameFilter
          .trim()
          .toLowerCase();

        filteredResult = filteredResult.filter((item) =>
          String(item.studentName || '')
            .toLowerCase()
            .includes(studentSearch)
        );
      }

      setRows(filteredResult);

      const uniqueStudents = [
        ...new Map(
          filteredResult.map((item) => [
            item.studentId,
            {
              studentId: item.studentId,
              fullName: item.studentName,
            },
          ])
        ).values(),
      ];

      setStudents(uniqueStudents);
      setPage(0);
    } catch (err) {
      setRows([]);
      setStudents([]);
      setError(err.message || "Failed to load payment schedules.");
    } finally {
      setLoading(false);
    }
  }, [location.search, selectedInstituteKey, instituteFilter, studentNameFilter,]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const loadComplete = useCallback(async (studentFilterValue) => {
    setCompleteLoading(true);
    try {
      const studentId = studentFilterValue ? Number(studentFilterValue) : undefined;
      const data = await fetchStudentCourseCompleteList(studentId);
      const filteredData = selectedInstituteKey
        ? (data || []).filter(
          (item) => normalizeInstituteName(item.instituteName) === selectedInstituteKey,
        )
        : (data || []);
      setCompleteRows(filteredData);
    } catch (err) {
      setCompleteRows([]);
      setError(err.message || 'Failed to load complete list.');
    } finally {
      setCompleteLoading(false);
    }
  }, [selectedInstituteKey]);

  useEffect(() => {
    if (activeTab === 1) loadComplete(studentFilter);
  }, [activeTab, studentFilter, loadComplete]);

  useEffect(() => {
    if (activeTab === 1) {
      loadComplete(studentFilter);
      setCompletePage(0);
    }
  }, [studentFilter, activeTab, loadComplete]);

  useEffect(() => {
    setCompletePage(0);
  }, [studentFilter]);

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.studentId, label: s.fullName })),
    [students]
  );

  const columns = useMemo(() => {
    if (!resource?.columns) return [];

    return resource.columns.map((column) => {
      switch (column.field) {
        case "totalCourseFee":
        case "collectedAmount":
        case "balanceAmount":
        case "installmentAmount":
          return { ...column, render: (row) => formatCurrency(row[column.field]) };

        case "nextDueDate":
          return { ...column, render: (row) => (row.nextDueDate ? formatDisplayDate(row.nextDueDate) : "-") };
        case "studentCreatedAt":
          return {
            ...column,
            render: (row) =>
              row.studentCreatedAt ? formatDisplayDate(row.studentCreatedAt) : "-",
          };
        case "installments":
          return { ...column, render: (row) => `${row.paidInstallments ?? 0} / ${row.totalInstallments ?? row.noOfInstallments ?? 0}` };

        case "paymentStatus":
          return { ...column, render: (row) => row.paymentStatus || "-" };

        case 'actions':
          return {
            ...column,
            render: (row) => (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/students/${row.studentId}`);
                }}
              >
                View
              </Button>
            ),
          };

        default:
          return column;
      }
    });
  }, [resource, navigate]);

  const handleRowClick = useCallback((row) => navigate(`/students/${row.studentId}`), [navigate]);
  const instituteOptions = useMemo(() => {
    const seen = new Set();

    return rows
      .map((row) => String(row.instituteName || '').trim())
      .filter((name) => {
        if (!name) return false;

        const key = name.toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [rows]);
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Student Payment Schedules
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Add schedules per student, track status and payment details.
          </Typography>
        </Box>

      </Box>

      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}> {error} </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'nowrap', }}
        >
          {/* 1. Institute Dropdown */}
          <Box
            sx={{ width: 280, minWidth: 280, maxWidth: 280, flexShrink: 0, }}
          >
            <TextField
              select
              fullWidth
              size="small"
              value={instituteFilter || LIST_FILTER_ALL}
              onChange={(e) => {
                const next = e.target.value;
                setInstituteFilter(next === LIST_FILTER_ALL ? '' : next);
                setPage(0);
              }}
              SelectProps={{
                ...listSelectProps('All Institutes'),
                renderValue: (selected) => {
                  if (!selected || selected === LIST_FILTER_ALL) { return 'All Institutes'; }
                  return selected;
                },
              }}
              sx={{
                ...listSelectFieldSx(Boolean(instituteFilter)),
                width: '100%',
                '& .MuiSelect-select': { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', },
              }}
            >
              <MenuItem value={LIST_FILTER_ALL}> All Institutes  </MenuItem>

              {instituteOptions.map((institute) => (
                <MenuItem key={institute} value={institute}> {institute}</MenuItem>
              ))} </TextField>
          </Box>

          {/* 2. Student Name TextField */}
          <Box sx={{ width: 280, minWidth: 280, maxWidth: 280, flexShrink: 0 }} >
            <TextField
              fullWidth
              size="small"
              label="Student"
              placeholder="Enter Student Name"
              value={studentNameFilter}
              onChange={(e) => {
                setStudentNameFilter(e.target.value);
                setPage(0);
              }}
              sx={listSelectFieldSx(Boolean(studentNameFilter))}
            />
          </Box>

          {/* 3. Buttons */}
          <Box
            sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'nowrap', ml: 'auto', }}   >
            {fromInstitute && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(INSTITUTE_SCRAPPING_BASE_PATH)
                }
                sx={listOutlinedButtonSx}
              > Back to Institute  </Button>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                navigate('/students/new', {
                  state:
                    location.state?.instituteId ||
                      location.state?.instituteName
                      ? {
                        instituteId: location.state?.instituteId,
                        instituteName: location.state?.instituteName,
                        fromInstitute,
                      }
                      : undefined,
                })
              }
              sx={listContainedButtonSx}
            >
              Add Student
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Current" sx={{ textTransform: 'uppercase', fontWeight: 800, minHeight: 48, px: 3 }} />
          <Tab label="Complete" sx={{ textTransform: 'uppercase', fontWeight: 800, minHeight: 48, px: 3 }} />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            {loading ? (
              <TableContentSkeleton rows={8} columns={[{ id: "student", label: "Student", flex: 1.2 }, { id: "institute", label: "Institute", flex: 1.6 }, { id: "course", label: "Course", flex: 1.3 }, { id: "totalFee", label: "Total Fee", flex: 0.8 }, { id: "installments", label: "Installments", flex: 0.7, skeletonWidth: "40%" }, { id: "nextDue", label: "Next Due", flex: 0.9 }, { id: "paid", label: "Paid", flex: 0.7 }, { id: "partial", label: "Partial Amount", flex: 0.9 }, { id: "status", label: "Status", flex: 0.7, skeletonWidth: "50%" }]} />
            ) : rows.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography color="text.secondary">No payment schedules found.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveTable variant="resource" alwaysTable rows={paginatedRows} columns={columns} getRowKey={(row) => row.scheduleId} onRowClick={handleRowClick} />
                <TablePagination
                  component="div"
                  count={rows.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {completeLoading ? (
              <TableContentSkeleton rows={6} columns={[{ id: 'student', label: 'Student', flex: 1.2 }, { id: 'institute', label: 'Institute', flex: 1.6 }, { id: 'course', label: 'Course', flex: 1.3 }, { id: 'totalFee', label: 'Total Fee', flex: 0.8 }, { id: 'installments', label: 'Installments', flex: 0.7 }, { id: 'nextDue', label: 'Next Due', flex: 0.9 }, { id: 'status', label: 'Status', flex: 0.7 }]} />
            ) : completeRows.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">No completed courses found.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveTable variant="resource" alwaysTable rows={completePaginatedRows} columns={columns} getRowKey={(row) => row.scheduleId} onRowClick={handleRowClick} />
                <TablePagination
                  component="div"
                  count={completeRows.length}
                  page={completePage}
                  onPageChange={(_e, p) => setCompletePage(p)}
                  rowsPerPage={completeRowsPerPage}
                  onRowsPerPageChange={(e) => { setCompleteRowsPerPage(parseInt(e.target.value, 10)); setCompletePage(0); }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}