import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import TableContentSkeleton from '../TableContentSkeleton';
import {
  createInstituteCommissionRate,
  fetchCommissionRates,
  //fetchCommissionHistory,
  fetchInstituteCommissionHistory,
  getEmptyCommissionRateForm,
} from '../../api/commissionsApi';
import { fetchCoursesByInstitute } from '../../api/lookupApi';
import { listContainedButtonSx } from '../forms';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

//export default function InstituteCommissionRatesPanel({ instituteId = null, courseLookupId = null }) {
export default function InstituteCommissionRatesPanel({ instituteId = null, courseLookupId = null, instituteName = '' }) {
  const [rates, setRates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(() => ({ ...getEmptyCommissionRateForm(), instituteId }));
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const courseMap = useMemo(
    () =>
      Object.fromEntries(
        courses.map((c) => [
          String(c.courseId ?? c.CourseId),
          c.courseName ?? c.CourseName ?? c.name ?? c.Name,
        ]),
      ),
    [courses],
  );

  useEffect(() => {
    let active = true;

    const loadRates = async () => {
      if (!instituteId) {
        if (active) {
          setRates([]);
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
        setError('');
      }

      try {
        const rows = await fetchCommissionRates();
        if (!active) return;

        const filtered = (rows ?? []).filter(
          (r) => String(r.instituteId) === String(instituteId),
        );
        setRates(filtered);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load commission rates.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRates();

    return () => {
      active = false;
    };
  }, [instituteId]);

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      if (!courseLookupId) {
        if (active) setCourses([]);
        return;
      }

      try {
        const data = await fetchCoursesByInstitute(courseLookupId);
        if (active) setCourses(Array.isArray(data) ? data : (data?.courses ?? []));
      } catch {
        if (active) setCourses([]);
      }
    };

    void loadCourses();

    return () => {
      active = false;
    };
  }, [courseLookupId]);

  if (!instituteId) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--muted)' }}>
          Please save institute details first to add commission rates.
        </Typography>
      </Box>
    );
  }

  const openCreateDialog = () => {
    setForm({ ...getEmptyCommissionRateForm(), instituteId });
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
      await createInstituteCommissionRate({ ...form, instituteId });
      setDialogOpen(false);
      const rows = await fetchCommissionRates();
      const filtered = (rows ?? []).filter(
        (r) => String(r.instituteId) === String(instituteId),
      );
      setRates(filtered);
    } catch (err) {
      setError(err.message || 'Failed to save commission rate.');
    } finally {
      setSaving(false);
    }
  };

  const openHistoryDialog = async (row) => {
    try {
      setLoading(true);
      //const data = await fetchCommissionHistory(row.vendorId, row.instituteId, row.courseId);
      const data = await fetchInstituteCommissionHistory(instituteId, row.courseId);
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
    { id: 'course', label: 'Course', render: (row) => (row.courseId ? (courseMap[String(row.courseId)] || '—') : '—') },
    { id: 'rateType', label: 'Rate type', field: 'rateType' },
    { id: 'rate', label: 'Rate', field: 'rate' },
    { id: 'effectiveFrom', label: 'From', render: (r) => formatDate(r.effectiveFrom) },
    { id: 'effectiveTo', label: 'To', render: (r) => formatDate(r.effectiveTo) },
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
            Commission rates for this institute.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={openCreateDialog}
          sx={listContainedButtonSx}
        >
          Add commission rate
        </Button>
      </Stack>

      {!courseLookupId && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          No scraped institute is linked yet — link one in the Institute details tab to enable course selection.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <TableContentSkeleton
          rows={5}
          columns={[
            { id: 'course', label: 'Course', flex: 1.4 },
            { id: 'rateType', label: 'Rate type', flex: 0.9 },
            { id: 'rate', label: 'Rate', flex: 0.7, skeletonWidth: '45%' },
            { id: 'effectiveFrom', label: 'From', flex: 0.9 },
            { id: 'effectiveTo', label: 'To', flex: 0.9 },
            { id: 'actions', label: 'Actions', flex: 0.8, skeletonWidth: 64, skeletonHeight: 28 },
          ]}
        />
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
            <TextField select label="Course" value={form.courseId} fullWidth disabled={!courseLookupId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}>
              <MenuItem value="">None</MenuItem>
              {courses.map((c) => {
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
           <Box sx={{ mb: 2, p: 1.5, bgcolor: 'var(--muted-bg)', borderRadius: 1 }}>
           <Typography sx={{ fontSize: '0.9rem' }}>
            <Box component="span" sx={{ fontWeight: 600 }}>Institute: </Box>
             {instituteName || '—'}
           </Typography>
           {historyData[0]?.courseId && (
            <Typography sx={{ fontSize: '0.9rem', mt: 0.5 }}>
               <Box component="span" sx={{ fontWeight: 600 }}>Course: </Box>
               {courseMap[String(historyData[0].courseId)] || '—'}
             </Typography>
          )}
         </Box>
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