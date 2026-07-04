import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import {
  createVendorCommissionRate,
  fetchCommissionRates,
  fetchCommissionHistory,
  getEmptyCommissionRateForm,
} from '../../api/commissionsApi';
import { fetchCoursesByInstitute, fetchInstitutes } from '../../api/lookupApi';
import { primaryButtonSx } from '../forms';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function VendorCommissionRatesPanel({ defaultVendorId = null }) {
  const [rates, setRates] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [dialogCourses, setDialogCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(() => getEmptyCommissionRateForm(defaultVendorId));
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

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
    const rows = await fetchCommissionRates(defaultVendorId);
    setRates(rows);
  } catch (err) {
    setError(err.message || 'Failed to load commission rates.');
  } finally {
    setLoading(false);
  }
}, [defaultVendorId]);

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

  const run = async () => {
    if (!defaultVendorId || !active) return;
    await loadRates();
  };

  void run();

  return () => {
    active = false;
  };
}, [loadRates, defaultVendorId]);

useEffect(() => {
  let active = true;

  const loadCourses = async () => {
    try {
      if (!form.instituteId) {
        if (active) {
          setDialogCourses([]);
        }
        return;
      }

      const data = await fetchCoursesByInstitute(form.instituteId);

    if (active) {
    setDialogCourses(data?.courses ?? []);
}
    } catch {
      if (active) {
    setDialogCourses(data?.courses ?? []);
}
    }
  };

  void loadCourses();

  return () => {
    active = false;
  };
}, [form.instituteId]);


    if (!defaultVendorId) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--muted)' }}>
          Please save vendor details first to add commission rates.
        </Typography>
      </Box>
    );
  }

  const openCreateDialog = () => {
    setForm(getEmptyCommissionRateForm(defaultVendorId));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!form.rateType || !form.rate || !form.effectiveFrom) {
      setError('Rate type, rate, and effective from are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createVendorCommissionRate(defaultVendorId, form);
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
    setHistoryData(data);
    setHistoryOpen(true);
    setError('');
  } catch {
    setError('Failed to load history.');
  } finally {
    setLoading(false);
  }
};


  const columns = [
    { id: 'institute', label: 'Institute', render: (row) => row.instituteId ? (instituteMap[String(row.instituteId)] || '—') : '—' },
    { id: 'course', label: 'Course', render: (row) => row.courseId ? (courseMap[String(row.courseId)] || '—') : '—' },
    { id: 'rateType', label: 'Rate type', field: 'rateType' },
    { id: 'rate', label: 'Rate', field: 'rate' },
    { id: 'effectiveFrom', label: 'From', render: (r) => formatDate(r.effectiveFrom) },
    {
      id: 'actions', label: 'Actions', align: 'right',
      render: (row) => (
        <Button size="small" onClick={() => openHistoryDialog(row)}>History</Button>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.25} sx={{ mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: 'var(--text)' }}>Commission rates</Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.25 }}>
            Commission rates for this vendor.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={openCreateDialog}
          sx={{ ...primaryButtonSx, minWidth: { xs: '100%', sm: 160 }, height: 38, px: 2.25, whiteSpace: 'nowrap' }}
        >
          Add commission rate
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>Loading...</Typography>
      ) : rates.length === 0 ? (
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>No commission rates yet.</Typography>
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={rates}
          getRowKey={(row) => row.commissionId}
          alwaysTable
          sx={{ mt: 0.5 }}
        />
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add commission rate</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField select label="Institute" value={form.instituteId} fullWidth
              onChange={(e) => setForm((prev) => ({ ...prev, instituteId: e.target.value, courseId: '' }))}>
              <MenuItem value="">None</MenuItem>
              {institutes.map((i) => {
                const id = i.instituteId ?? i.InstituteId;
                const name = i.name ?? i.Name ?? i.instituteName ?? i.InstituteName;
                return <MenuItem key={id} value={String(id)}>{name}</MenuItem>;
              })}
            </TextField>

            <TextField select label="Course" value={form.courseId} fullWidth disabled={!form.instituteId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {(dialogCourses ?? []).map((c) => {
                const id = c.courseId ?? c.CourseId;
                const name = c.courseName ?? c.CourseName ?? c.name ?? c.Name;
                return <MenuItem key={id} value={String(id)}>{name}</MenuItem>;
              })}
            </TextField>

            <TextField select label="Rate type" value={form.rateType} fullWidth required
              onChange={(e) => setForm((prev) => ({ ...prev, rateType: e.target.value }))}>
              <MenuItem value="Fixed">Fixed</MenuItem>
              <MenuItem value="Percentage">Percentage</MenuItem>
            </TextField>

            <TextField label="Rate" type="number" value={form.rate} fullWidth required
              onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))} />

            <TextField label="Effective from" type="date" value={form.effectiveFrom} fullWidth required
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} />

            <TextField label="Effective to" type="date" value={form.effectiveTo} fullWidth
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Commission History</DialogTitle>
        <DialogContent>
          <ResponsiveTable
            columns={[
              { id: 'rateType', label: 'Rate Type', field: 'rateType' },
              { id: 'rate', label: 'Rate', field: 'rate' },
              { id: 'effectiveFrom', label: 'From', render: (r) => formatDate(r.effectiveFrom) },
              { id: 'effectiveTo', label: 'To', render: (r) => formatDate(r.effectiveTo) },
            ]}
            rows={historyData}
            getRowKey={(row) => row.commissionId}
            alwaysTable
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}