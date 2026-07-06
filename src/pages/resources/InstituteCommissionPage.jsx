import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';

import ResponsiveTable from '../../components/ResponsiveTable';
import { primaryButtonSx } from '../../components/forms';

import {
  createInstituteCommissionRate,
  fetchCommissionRates,
  fetchCommissionHistory,
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
  const [form, setForm] = useState(() => getEmptyCommissionRateForm());

  const instituteMap = useMemo(
    () =>
      Object.fromEntries(
        institutes.map((i) => [
          String(i.instituteId ?? i.InstituteId),
          i.name ?? i.Name ?? i.instituteName ?? i.InstituteName,
        ]),
      ),
    [institutes],
  );

  const courseMap = useMemo(
    () =>
      Object.fromEntries(
        allCourses.map((c) => [
          String(c.courseId ?? c.CourseId),
          c.courseName ?? c.CourseName ?? c.name ?? c.Name,
        ]),
      ),
    [allCourses],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const rows = await fetchCommissionRates();
      console.log('Fetched commission rates:', rows);
      setRates(rows ?? []);
    } catch (err) {
      setError(err.message || 'Failed to load commission rates.');
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
    ).then((results) => setAllCourses(results.flat()));
  }, [institutes]);

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      if (!form.instituteId) {
        if (active) setDialogCourses([]);
        return;
      }

      try {
        const data = await fetchCoursesByInstitute(form.instituteId);

        if (active) setDialogCourses(data?.courses ?? []);
      } catch {
        if (active) setDialogCourses([]);
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

    setSaving(true);
    setError('');

    try {
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
        row.courseId,
      );

      setHistoryData(data ?? []);
      setHistoryOpen(true);
      setError('');
    } catch {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
  
    { id: 'institute', label: 'Institute', render: (row) => instituteMap[String(row.instituteId)] || '—' },
    { id: 'course', label: 'Course', render: (row) => courseMap[String(row.courseId)] || '—' },
    { id: 'rateType', label: 'Rate Type', field: 'rateType' },
    { id: 'rate', label: 'Rate', field: 'rate' },
    { id: 'effectiveFrom', label: 'From', render: (row) => formatDate(row.effectiveFrom) },
    { id: 'effectiveTo', label: 'To', render: (row) => formatDate(row.effectiveTo) },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button size="small" onClick={() => openHistoryDialog(row)}>
          History
        </Button>
      ),
    },
  ];
  return (
    <Box>
 <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
  <Box>
    <Typography sx={{ fontWeight: 700, color: 'var(--text)' }}>Institute Commission Rates</Typography>
    <Typography variant="body2" sx={{ color: 'var(--muted)' }}>Manage commission rates for all institutes.</Typography>
  </Box>

  <Button variant="contained" onClick={openCreateDialog} sx={{ ...primaryButtonSx, ml: 'auto', minWidth: 160, height: 38, px: 2.25, whiteSpace: 'nowrap' }}>
    Add Commission Rate
  </Button>
</Stack>
      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>Loading...</Typography>
      ) : rates.length ? (
        <ResponsiveTable columns={columns} rows={rates} getRowKey={(row) => row.commissionId} alwaysTable sx={{ mt: 0.5 }} />
      ) : (
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>No commission rates found.</Typography>
      )}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Commission Rate</DialogTitle>

        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField select label="Institute" value={form.instituteId} fullWidth required onChange={(e) => setForm({ ...form, instituteId: e.target.value, courseId: '' })}>
              <MenuItem value="">Select Institute</MenuItem>
              {institutes.map((i) => <MenuItem key={i.instituteId} value={i.instituteId}>{i.instituteName}</MenuItem>)}
            </TextField>

            <TextField select label="Course" value={form.courseId} fullWidth disabled={!form.instituteId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <MenuItem value="">Select Course</MenuItem>
              {dialogCourses.map((c) => <MenuItem key={c.courseId} value={c.courseId}>{c.courseName}</MenuItem>)}
            </TextField>

            <TextField select label="Rate Type" value={form.rateType} fullWidth required onChange={(e) => setForm({ ...form, rateType: e.target.value })}>
              <MenuItem value="Fixed">Fixed</MenuItem>
              <MenuItem value="Percentage">Percentage</MenuItem>
            </TextField>

            <TextField label="Rate" type="number" value={form.rate} fullWidth required onChange={(e) =>
              setForm({ ...form, rate: e.target.value })} />

            <TextField label="Effective From" type="date" value={form.effectiveFrom} fullWidth required slotProps={{ inputLabel: { shrink: true } }} onChange={(e) =>
              setForm({ ...form, effectiveFrom: e.target.value })} />

            <TextField label="Effective To" type="date" value={form.effectiveTo} fullWidth slotProps={{ inputLabel: { shrink: true } }} onChange={(e) =>
              setForm({ ...form, effectiveTo: e.target.value })} />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
      {/* History Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Commission History</DialogTitle>

        <DialogContent>
          <ResponsiveTable
            columns={[
              { id: 'rateType', label: 'Rate Type', field: 'rateType' },
              { id: 'rate', label: 'Rate', field: 'rate' },
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
            ]}
            rows={historyData}
            getRowKey={(row) => row.commissionId}
            alwaysTable
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}