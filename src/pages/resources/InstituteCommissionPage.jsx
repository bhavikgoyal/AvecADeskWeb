import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';


import ResponsiveTable from '../../components/ResponsiveTable';

import {
  fetchCommissionRates,
  fetchCommissionHistory,
  createInstituteCommissionRate,
  getEmptyCommissionRateForm,
} from '../../api/commissionsApi';

import {
  fetchInstitutes,
  fetchCoursesByInstitute,
} from '../../api/lookupApi';


function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InstituteCommissionPage() {
  const [rates, setRates] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [dialogCourses, setDialogCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const [form, setForm] = useState(
    getEmptyCommissionRateForm()
  );

  const instituteMap = useMemo(
    () =>
      Object.fromEntries(
        institutes.map((i) => [
          String(i.instituteId ?? i.InstituteId),
          i.name ??
            i.Name ??
            i.instituteName ??
            i.InstituteName,
        ]),
      ),
    [institutes],
  );

  const courseMap = useMemo(
    () =>
      Object.fromEntries(
        allCourses.map((c) => [
          String(c.courseId ?? c.CourseId),
          c.courseName ??
            c.CourseName ??
            c.name ??
            c.Name,
        ]),
      ),
    [allCourses],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Full Institute Commission List
      const rows = await fetchCommissionRates();
console.log(rows);
      setRates(rows ?? []);
    } catch (err) {
      setError(
        err.message || 'Failed to load commission rates.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  useEffect(() => {
    fetchInstitutes()
      .then((data) => setInstitutes(data ?? []))
      .catch(() => setInstitutes([]));
  }, []);

  useEffect(() => {
    if (institutes.length === 0) return;

    Promise.all(
      institutes.map(async (i) => {
        const id = i.instituteId ?? i.InstituteId;

        try {
          const data = await fetchCoursesByInstitute(id);
          return data.courses ?? [];
        } catch {
          return [];
        }
      }),
    ).then((results) => {
      setAllCourses(results.flat());
    });
  }, [institutes]);

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      if (!form.instituteId) {
        if (active) setDialogCourses([]);
        return;
      }

      try {
        const data = await fetchCoursesByInstitute(
          form.instituteId,
        );

        if (active) {
          setDialogCourses(data?.courses ?? []);
        }
      } catch {
        if (active) {
          setDialogCourses([]);
        }
      }
    };

    void loadCourses();

    return () => {
      active = false;
    };
  }, [form.instituteId]);
  const openCreateDialog = () => {
  setForm(getEmptyCommissionRateForm());
  setDialogOpen(true);
};

const closeDialog = () => {
  if (saving) return;
  setDialogOpen(false);
};

const handleSave = async () => {
  if (!form.instituteId) {
    setError('Institute is required.');
    return;
  }

  if (!form.rateType || !form.rate || !form.effectiveFrom) {
    setError('Rate type, rate and effective from are required.');
    return;
  }

  try {
    setSaving(true);
    setError('');

    await createInstituteCommissionRate(form);

    setDialogOpen(false);

    await loadRates();
  } catch (err) {
    setError(err.message || 'Failed to save commission rate.');
  } finally {
    setSaving(false);
  }
};

const openHistoryDialog = async (row) => {
  try {
    setLoading(true);

    const data = await fetchCommissionHistory(
      row.vendorId,
      row.instituteId,
      row.courseId
    );

    setHistoryData(data ?? []);
    setHistoryOpen(true);
  } catch {
    setError('Failed to load history.');
  } finally {
    setLoading(false);
  }
};

const columns = [
  {
    id: 'vendor',
    label: 'Vendor',
    field: 'vendorName',
  },
  {
    id: 'institute',
    label: 'Institute',
    render: (row) =>
      instituteMap[String(row.instituteId)] || '—',
  },
  {
    id: 'course',
    label: 'Course',
    render: (row) =>
      courseMap[String(row.courseId)] || '—',
  },
  {
    id: 'rateType',
    label: 'Rate Type',
    field: 'rateType',
  },
  {
    id: 'rate',
    label: 'Rate',
    field: 'rate',
  },
  {
    id: 'effectiveFrom',
    label: 'From',
    render: (row) => formatDate(row.effectiveFrom),
  },
  {
    id: 'effectiveTo',
    label: 'To',
    render: (row) => formatDate(row.effectiveTo),
  },
  {
    id: 'actions',
    label: 'Actions',
    align: 'right',
    render: (row) => (
      <Button
        size="small"
        onClick={() => openHistoryDialog(row)}
      >
        History
      </Button>
    ),
  },
];
return (
  <Box>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography sx={{ fontWeight: 700 }}>
          Institute Commission Rates
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Manage commission rates for all institutes.
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={openCreateDialog}
       sx={{ minWidth: 220 }}
      >
        Add Commission Rate
      </Button>
    </Stack>

    {error && (
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        onClose={() => setError('')}
      >
        {error}
      </Alert>
    )}

    {loading ? (
      <Typography sx={{ py: 3 }}>
        Loading...
      </Typography>
    ) : (
      <ResponsiveTable
        columns={columns}
        rows={rates}
        getRowKey={(row) => row.commissionId}
        alwaysTable
      />
    )}

    {/* Add Dialog */}

    <Dialog
      open={dialogOpen}
      onClose={closeDialog}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Add Commission Rate
      </DialogTitle>

      <DialogContent>

        <Stack spacing={2} sx={{ mt: 1 }}>

          <TextField
            select
            label="Institute"
            value={form.instituteId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                instituteId: e.target.value,
                courseId: '',
              }))
            }
          >
            <MenuItem value="">
              Select Institute
            </MenuItem>

            {institutes.map((i) => {
              const id =
                i.instituteId ?? i.InstituteId;

              const name =
                i.name ??
                i.Name ??
                i.instituteName ??
                i.InstituteName;

              return (
                <MenuItem
                  key={id}
                  value={String(id)}
                >
                  {name}
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            select
            label="Course"
            value={form.courseId}
            disabled={!form.instituteId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                courseId: e.target.value,
              }))
            }
          >
            <MenuItem value="">
              Select Course
            </MenuItem>

            {dialogCourses.map((c) => {
              const id =
                c.courseId ?? c.CourseId;

              const name =
                c.courseName ??
                c.CourseName ??
                c.name ??
                c.Name;

              return (
                <MenuItem
                  key={id}
                  value={String(id)}
                >
                  {name}
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            select
            label="Rate Type"
            value={form.rateType}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                rateType: e.target.value,
              }))
            }
          >
            <MenuItem value="Fixed">
              Fixed
            </MenuItem>

            <MenuItem value="Percentage">
              Percentage
            </MenuItem>

          </TextField>

          <TextField
            label="Rate"
            type="number"
            value={form.rate}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                rate: e.target.value,
              }))
            }
          />

          <TextField
            type="date"
            label="Effective From"
            value={form.effectiveFrom}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                effectiveFrom: e.target.value,
              }))
            }
          />

          <TextField
            type="date"
            label="Effective To"
            value={form.effectiveTo}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                effectiveTo: e.target.value,
              }))
            }
          />

        </Stack>

      </DialogContent>

      <DialogActions>

        <Button
          onClick={closeDialog}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>

      </DialogActions>
    </Dialog>

    {/* History */}

    <Dialog
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Commission History
      </DialogTitle>

      <DialogContent>

        <ResponsiveTable
          columns={[
            {
              id: 'rateType',
              label: 'Rate Type',
              field: 'rateType',
            },
            {
              id: 'rate',
              label: 'Rate',
              field: 'rate',
            },
            {
              id: 'effectiveFrom',
              label: 'From',
              render: (r) =>
                formatDate(r.effectiveFrom),
            },
            {
              id: 'effectiveTo',
              label: 'To',
              render: (r) =>
                formatDate(r.effectiveTo),
            },
          ]}
          rows={historyData}
          getRowKey={(row) =>
            row.commissionId
          }
          alwaysTable
        />

      </DialogContent>

      <DialogActions>

        <Button
          onClick={() =>
            setHistoryOpen(false)
          }
        >
          Close
        </Button>

      </DialogActions>
    </Dialog>

  </Box>
);
}