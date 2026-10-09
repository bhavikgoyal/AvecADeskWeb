

import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
  Checkbox, ListItemText,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import TableContentSkeleton from '../TableContentSkeleton';
import {
  createScrappingCommissionRate,
  fetchScrappingCommissionRates,
  fetchScrappingCommissionHistory,
  getEmptyCommissionRateForm,
} from '../../api/commissionsApi';
import { fetchCoursesByInstitute } from '../../api/lookupApi';
import { listContainedButtonSx } from '../forms';

const ALL_COURSES_VALUE = 'ALL';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCourseDisplay(row, courseMap) {
  if (row?.appliesToAllCourses) return 'All Courses';
  if (row?.courseId) return courseMap[String(row.courseId)] || '—';
  return '—';
}

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
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  const allCourseIds = courses.map((c) => String(c.courseId ?? c.CourseId));
  const allCourseNames = courses
    .map((c) => c.courseName ?? c.CourseName ?? c.name ?? c.Name)
    .filter(Boolean);
  const allSelected = allCourseIds.length > 0 && selectedCourseIds.length === allCourseIds.length;
  const someSelected = selectedCourseIds.length > 0 && !allSelected;

  const handleCoursesChange = (e) => {
    const value = e.target.value;
    if (value.includes(ALL_COURSES_VALUE)) {
      setSelectedCourseIds(allSelected ? [] : allCourseIds);
    } else {
      setSelectedCourseIds(value);
    }
  };

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
    
        const rows = await fetchScrappingCommissionRates(instituteId);
        if (!active) return;
        setRates(rows ?? []);
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
        if (active) {
          setCourses([]);
          setCoursesLoaded(true);
        }
        return;
      }

      if (active) setCoursesLoaded(false);

      try {
        const data = await fetchCoursesByInstitute(courseLookupId);
        if (active) setCourses(Array.isArray(data) ? data : (data?.courses ?? []));
      } catch {
        if (active) setCourses([]);
      } finally {
        if (active) setCoursesLoaded(true);
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
    setSelectedCourseIds([]);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (selectedCourseIds.length === 0) {
      setError('Please select at least one course (or Select all).');
      return;
    }
    if (!form.rateType || !form.rate || !form.effectiveFrom) {
      setError('Rate type, rate, and effective from are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const base = { ...form, instituteId, appliesToAllCourses: false };
      let payloads;
      if (allSelected) {
    
        payloads = [{ ...base, courseId: null, appliesToAllCourses: true }];
      } else if (selectedCourseIds.length === 0) {
        payloads = [{ ...base, courseId: null }];
      } else {
      
        payloads = selectedCourseIds.map((id) => ({ ...base, courseId: id }));
      }
      for (const payload of payloads) {
        await createScrappingCommissionRate(instituteId, payload);
      }
      setDialogOpen(false);
      const rows = await fetchScrappingCommissionRates(instituteId);
      setRates(rows ?? []);
    } catch (err) {
      setError(err.message || 'Failed to save commission rate.');
    } finally {
      setSaving(false);
    }
  };

  const openHistoryDialog = async (row) => {
    try {
      setLoading(true);
      const data = await fetchScrappingCommissionHistory(instituteId, row.courseId, !!row.appliesToAllCourses);
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
    { id: 'course', label: 'Course', render: (row) => getCourseDisplay(row, courseMap) },
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
          disabled={!coursesLoaded || courses.length === 0}
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

      {courseLookupId && coursesLoaded && courses.length === 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          This institute has no courses yet. Add courses first — a commission rate can only be added for courses.
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add commission rate</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            <TextField
              select
              label="Course"
              fullWidth
              disabled={!courseLookupId}
              value={selectedCourseIds}
              onChange={handleCoursesChange}
              slotProps={{
                inputLabel: { shrink: true },
                select: {
                  multiple: true,
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (selected.length === 0) return 'None';
                    if (allSelected) return 'All Courses';
                    return selected.map((id) => courseMap[id] || id).join(', ');
                  },
                  MenuProps: { PaperProps: { sx: { maxHeight: 280 } } },
                },
              }}
            >
              {courses.length === 0 && (
                <MenuItem value="__none__" disabled>No courses available</MenuItem>
              )}
              {courses.length > 0 && (
                <MenuItem value={ALL_COURSES_VALUE}>
                  <Checkbox size="small" checked={allSelected} indeterminate={someSelected} />
                  <ListItemText primary="Select all" />
                </MenuItem>
              )}
              {courses.map((c) => {
                const id = String(c.courseId ?? c.CourseId);
                const name = c.courseName ?? c.CourseName ?? c.name ?? c.Name;
                return (
                  <MenuItem key={id} value={id}>
                    <Checkbox size="small" checked={selectedCourseIds.includes(id)} />
                    <ListItemText primary={name} />
                  </MenuItem>
                );
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

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Commission History</DialogTitle>
        <DialogContent>
           <Box sx={{ mb: 2, p: 1.5, bgcolor: 'var(--muted-bg)', borderRadius: 1 }}>
           <Typography sx={{ fontSize: '0.9rem' }}>
            <Box component="span" sx={{ fontWeight: 600 }}>Institute: </Box>
             {instituteName || '—'}
           </Typography>
           <Typography sx={{ fontSize: '0.9rem', mt: 0.5 }}>
             <Box component="span" sx={{ fontWeight: 600 }}>Course: </Box>
             {historyData[0]?.appliesToAllCourses
               ? (allCourseNames.length ? `All Courses (${allCourseNames.join(', ')})` : 'All Courses')
               : (historyData[0]?.courseId ? (courseMap[String(historyData[0].courseId)] || '—') : '—')}
           </Typography>
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


