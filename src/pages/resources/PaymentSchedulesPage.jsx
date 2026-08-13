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
import ResponsiveTable from "../../components/ResponsiveTable";
import TableContentSkeleton from "../../components/TableContentSkeleton";
import { getResourceConfig } from "../../config/resourceConfig";
import { TablePagination } from "@mui/material";
import { fetchStudentPaymentScheduleList, fetchStudentCourseCompleteList, formatCurrency, formatDisplayDate } from "../../api/schedulesApi";


export default function PaymentSchedulesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const resource = useMemo(() => getResourceConfig("/payment-schedules"), []);

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
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

      const result = await fetchStudentPaymentScheduleList(
        studentFilter || undefined,
        nextMonth
      );

      setRows(result || []);

      const uniqueStudents = [
        ...new Map(
          (result || []).map((item) => [
            item.studentId,
            {
              studentId: item.studentId,
              fullName: item.studentName,
            },
          ])
        ).values(),
      ];

      setStudents(uniqueStudents);
    } catch (err) {
      setRows([]);
      setStudents([]);
      setError(err.message || "Failed to load payment schedules.");
    } finally {
      setLoading(false);
    }
  }, [studentFilter, location.search]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const loadComplete = useCallback(async (studentFilterValue) => {
    setCompleteLoading(true);
    try {
      const studentId = studentFilterValue ? Number(studentFilterValue) : undefined;
      const data = await fetchStudentCourseCompleteList(studentId);
      setCompleteRows(data || []);
    } catch (err) {
      setCompleteRows([]);
      setError(err.message || 'Failed to load complete list.');
    } finally {
      setCompleteLoading(false);
    }
  }, []);

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

        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/students/new")}>Add Student</Button>
      </Box>

      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}> {error} </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ width: 320 }}>
            <TextField select fullWidth size="small" label="Filter by Student" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
              <MenuItem value="">All Students</MenuItem>
              {studentOptions.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
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
