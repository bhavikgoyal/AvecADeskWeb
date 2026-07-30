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
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableContentSkeleton from "../../components/TableContentSkeleton";
import { getResourceConfig } from "../../config/resourceConfig";
import { fetchStudentPaymentScheduleList, formatCurrency, formatDisplayDate } from "../../api/schedulesApi";

export default function PaymentSchedulesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const resource = useMemo(() => getResourceConfig("/payment-schedules"), []);

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // init currentMonthOnly from URL (presence of ?currentMonth or ?currentMonth=true)
  const initParams = new URLSearchParams(location.search);
  const initCurrent = initParams.has("currentMonth") || initParams.get("currentMonth") === "true";
  const [currentMonthOnly, setCurrentMonthOnly] = useState(initCurrent);

  const parseFilterFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const y = params.get("year");
    const m = params.get("month");
    const currentFlag = params.has("currentMonth") || params.get("currentMonth") === "true";
    return { y: y ? Number(y) : null, m: m ? Number(m) : null, currentFlag };
  };

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchStudentPaymentScheduleList(studentFilter || undefined);

      // determine whether to filter by month (either explicit year+month or currentMonth flag)
      const { y, m, currentFlag } = parseFilterFromUrl();
      const shouldFilter = currentFlag || (y && m);
      const now = new Date();
      const targetYear = y && m ? y : currentFlag ? now.getFullYear() : null;
      const targetMonth = y && m ? m - 1 : currentFlag ? now.getMonth() : null; // month 0-based

      const filtered = (result || []).filter((item) => {
        if (!shouldFilter && !currentMonthOnly) return true;
        const v = item.studentCreatedAt ?? item.StudentCreatedAt ?? item.createdAt ?? item.CreatedAt;
        if (!v) return false;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return false;
        if (targetYear != null && targetMonth != null) {
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        }
        // default: filter to current month
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });

      setRows(filtered);

      const uniqueStudents = [
        ...new Map(
          (filtered || []).map((item) => [item.studentId, { studentId: item.studentId, fullName: item.studentName }])
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
  }, [studentFilter, location.search, currentMonthOnly]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

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
        {loading ? (
          <TableContentSkeleton rows={8} columns={[{ id: "student", label: "Student", flex: 1.2 }, { id: "institute", label: "Institute", flex: 1.6 }, { id: "course", label: "Course", flex: 1.3 }, { id: "totalFee", label: "Total Fee", flex: 0.8 }, { id: "installments", label: "Installments", flex: 0.7, skeletonWidth: "40%" }, { id: "nextDue", label: "Next Due", flex: 0.9 }, { id: "paid", label: "Paid", flex: 0.7 }, { id: "partial", label: "Partial Amount", flex: 0.9 }, { id: "status", label: "Status", flex: 0.7, skeletonWidth: "50%" }]} />
        ) : rows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography color="text.secondary">No payment schedules found.</Typography>
          </Box>
        ) : (
          <ResponsiveTable variant="resource" alwaysTable rows={rows} columns={columns} getRowKey={(row) => row.scheduleId} onRowClick={handleRowClick} />
        )}
      </Paper>
    </Box>
  );
}
