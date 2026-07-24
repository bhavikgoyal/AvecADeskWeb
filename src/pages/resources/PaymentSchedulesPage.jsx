import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import ResponsiveTable from "../../components/ResponsiveTable";
import { getResourceConfig } from "../../config/resourceConfig";
import {fetchStudentPaymentScheduleList,formatCurrency,formatDisplayDate,} from "../../api/schedulesApi";

export default function PaymentSchedulesPage() {
  const navigate = useNavigate();

  const resource = useMemo(
    () => getResourceConfig("/payment-schedules"),
    []
  );

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // useEffect(() => {
  //   async function loadStudents() {
  //     try {
  //       const result = await fetchStudentRows();
       
  //       setStudents(result || []);
  //     } catch (err) {
  //       console.error(err);
  //       setStudents([]);
  //     }
  //   }

  //   loadStudents();
  // }, []);
const loadRows = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const result = await fetchStudentPaymentScheduleList(
      studentFilter || undefined
    );

    setRows(result || []);

    // Dropdown mate unique students
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
}, [studentFilter]);

useEffect(() => {
  loadRows();
}, [loadRows]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

const studentOptions = useMemo(
  () =>
    students.map((student) => ({
      value: student.studentId,
      label: student.fullName,
    })),
  [students]
);
const columns = useMemo(() => {
  if (!resource?.columns) return [];

  return resource.columns.map((column) => {
   switch (column.field) {
  case "totalCourseFee":
  case "collectedAmount":
  case "balanceAmount":
    return {
      ...column,
      render: (row) => formatCurrency(row[column.field]),
    };

  case "nextDueDate":
    return {
      ...column,
      render: (row) =>
        row.nextDueDate
          ? formatDisplayDate(row.nextDueDate)
          : "-",
    };

  case "installments":
    return {
      ...column,
      render: (row) =>
        `${row.paidInstallments ?? 0} / ${row.totalInstallments ?? row.noOfInstallments ?? 0}`,
    };

  case "paymentStatus":
    return {
      ...column,
      render: (row) => row.paymentStatus || "-",
    };


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
}, [resource]);

const handleRowClick = useCallback(
  (row) => {
    navigate(`/students/${row.studentId}`);
  },
  [navigate]
);

return (
  <Box>
    {/* Header */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 2,
      }}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Student Payment Schedules
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Add schedules per student, track status and payment details.
        </Typography>
      </Box>

     <Button
  variant="contained"
  startIcon={<AddIcon />}
 onClick={() => {

  navigate("/students/new");
}}
>
  Add Student
</Button>
    </Box>

    {!!error && (
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        onClose={() => setError("")}
      >
        {error}
      </Alert>
    )}

    {/* Student Filter */}
   <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Box sx={{ width: 320 }}>
      <TextField
        select
        fullWidth
        size="small"
        label="Filter by Student"
        value={studentFilter}
        onChange={(e) => setStudentFilter(e.target.value)}
      >
        <MenuItem value="">All Students</MenuItem>

        {studentOptions.map((student) => (
          <MenuItem key={student.value} value={student.value}>
            {student.label}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  </Box>
</Paper>

    {/* Payment Schedule List */}
    <Paper variant="outlined">
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 6,
          }}
        >
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            py: 6,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            No payment schedules found.
          </Typography>
        </Box>
      ) : (
     <ResponsiveTable
  variant="resource"
  alwaysTable
  rows={rows}
  columns={columns}
  getRowKey={(row) => row.scheduleId}
  onRowClick={handleRowClick}
/>
      )}
    </Paper>
  </Box>
);}