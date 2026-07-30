import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
 import { useNavigate, useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ResponsiveTable from "../../components/ResponsiveTable";
import TableContentSkeleton from "../../components/TableContentSkeleton";
import { getResourceConfig } from "../../config/resourceConfig";
import {fetchStudentPaymentScheduleList,formatCurrency,formatDisplayDate,} from "../../api/schedulesApi";

const INSTITUTE_SCRAPPING_BASE_PATH = "/institutes-scrapping";

// The row's institute name might come through under any of these keys
// depending on what the API / resource config uses.
function getRowInstituteName(row) {
  return (
    row?.instituteName ||
    row?.institute ||
    row?.InstituteName ||
    row?.Institute ||
    ""
  );
}

export default function PaymentSchedulesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resource = useMemo(
    () => getResourceConfig("/payment-schedules"),
    []
  );

  const [students, setStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Institute filter passed via ?institute=<name> from the
  // "View Student" button on the Institutes Scrapping list.
  const instituteFilter = (searchParams.get("institute") || "").trim();

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

  const displayRows = useMemo(() => {
    if (!instituteFilter) return rows;
    const target = instituteFilter.toLowerCase();
    return rows.filter(
      (row) => getRowInstituteName(row).trim().toLowerCase() === target
    );
  }, [rows, instituteFilter]);

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
              row.nextDueDate ? formatDisplayDate(row.nextDueDate) : "-",
          };

        case "installments":
          return {
            ...column,
            render: (row) =>
              `${row.paidInstallments ?? 0} / ${
                row.totalInstallments ?? row.noOfInstallments ?? 0
              }`,
          };

        case "paymentStatus":
          return {
            ...column,
            render: (row) => row.paymentStatus || "-",
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
          {instituteFilter && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(INSTITUTE_SCRAPPING_BASE_PATH)}
              sx={{ textTransform: "none", mb: 1 }}
            >
              Back to Institute
            </Button>
          )}

          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Student Payment Schedules
            {instituteFilter ? ` — ${instituteFilter}` : ""}
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

<<<<<<< Updated upstream
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
        <TableContentSkeleton
          rows={8}
          columns={[
            { id: 'student', label: 'Student', flex: 1.2 },
            { id: 'institute', label: 'Institute', flex: 1.6 },
            { id: 'course', label: 'Course', flex: 1.3 },
            { id: 'totalFee', label: 'Total Fee', flex: 0.8 },
            { id: 'installments', label: 'Installments', flex: 0.7, skeletonWidth: '40%' },
            { id: 'nextDue', label: 'Next Due', flex: 0.9 },
            { id: 'paid', label: 'Paid', flex: 0.7 },
            { id: 'partial', label: 'Partial Amount', flex: 0.9 },
            { id: 'status', label: 'Status', flex: 0.7, skeletonWidth: '50%' },
          ]}
        />
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
=======
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
        ) : displayRows.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
            }}
          >
            <Typography color="text.secondary">
              {instituteFilter
                ? `No payment schedules found for "${instituteFilter}".`
                : "No payment schedules found."}
            </Typography>
          </Box>
        ) : (
          <ResponsiveTable
            variant="resource"
            alwaysTable
            rows={displayRows}
            columns={columns}
            getRowKey={(row) => row.scheduleId}
            onRowClick={handleRowClick}
          />
        )}
      </Paper>
    </Box>
  );
}
>>>>>>> Stashed changes
