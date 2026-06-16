import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ResponsiveTable from '../ResponsiveTable';
import {
  createVendorCommissionRate,
  deleteVendorCommissionRate,
  fetchCommissionRates,
  getEmptyCommissionRateForm,
  updateVendorCommissionRate,
} from '../../api/commissionsApi';
import { fetchCoursesByInstitute, fetchInstitutes, fetchVendors } from '../../api/lookupApi';
import { primaryButtonSx } from '../forms';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRate(row) {
  if (row.rateType === 'Percentage') return `${row.rate}%`;
  return row.rate?.toLocaleString?.() ?? row.rate;
}

export default function VendorCommissionRatesPanel({ defaultVendorId = null }) {
  const [rates, setRates] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [form, setForm] = useState(() => getEmptyCommissionRateForm(defaultVendorId));
  const [saving, setSaving] = useState(false);

  const vendorMap = useMemo(
    () => Object.fromEntries(
      vendors.map((v) => [
        String(v.vendorId ?? v.VendorId),
        v.businessName ?? v.BusinessName ?? v.name ?? v.Name ?? `Vendor ${v.vendorId ?? v.VendorId}`,
      ]),
    ),
    [vendors],
  );

  const instituteMap = useMemo(
    () => Object.fromEntries(institutes.map((i) => [String(i.instituteId ?? i.InstituteId), i.name ?? i.Name ?? i.instituteName ?? i.InstituteName])),
    [institutes],
  );

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((c) => [String(c.courseId ?? c.CourseId), c.courseName ?? c.CourseName ?? c.name ?? c.Name])),
    [courses],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchCommissionRates();
      setRates(rows);
    } catch (err) {
      setError(err.message || 'Failed to load commission rates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchInstitutes(), fetchVendors()])
      .then(([instituteData, vendorData]) => {
        if (!active) return;
        setInstitutes(instituteData ?? []);
        setVendors(vendorData ?? []);
      })
      .catch(() => {
        if (!active) {
          setInstitutes([]);
          setVendors([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    let active = true;
    if (!form.instituteId) {
      setCourses([]);
      return undefined;
    }

    fetchCoursesByInstitute(form.instituteId)
      .then((data) => {
        if (active) setCourses(data ?? []);
      })
      .catch(() => {
        if (active) setCourses([]);
      });

    return () => {
      active = false;
    };
  }, [form.instituteId]);

  const openCreateDialog = () => {
    setEditingRate(null);
    setForm(getEmptyCommissionRateForm(defaultVendorId));
    setDialogOpen(true);
  };

  const openEditDialog = (rate) => {
    setEditingRate(rate);
    setForm({
      vendorId: rate.vendorId ? String(rate.vendorId) : '',
      instituteId: rate.instituteId ? String(rate.instituteId) : '',
      courseId: rate.courseId ? String(rate.courseId) : '',
      rateType: rate.rateType || 'Fixed',
      rate: String(rate.rate ?? ''),
      effectiveFrom: rate.effectiveFrom ? String(rate.effectiveFrom).slice(0, 10) : '',
      effectiveTo: rate.effectiveTo ? String(rate.effectiveTo).slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingRate(null);
  };

  const handleSave = async () => {
    const vendorId = editingRate?.vendorId ?? Number(form.vendorId);
    if (!vendorId) {
      setError('Vendor is required.');
      return;
    }
    if (!form.rateType || !form.rate || !form.effectiveFrom) {
      setError('Rate type, rate, and effective from are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingRate) {
        await updateVendorCommissionRate(vendorId, editingRate.commissionId, form);
      } else {
        await createVendorCommissionRate(vendorId, form);
      }
      setDialogOpen(false);
      setEditingRate(null);
      await loadRates();
    } catch (err) {
      setError(err.message || 'Failed to save commission rate.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rate) => {
    if (!window.confirm('Delete this commission rate?')) return;

    setError('');
    try {
      await deleteVendorCommissionRate(rate.vendorId, rate.commissionId);
      await loadRates();
    } catch (err) {
      setError(err.message || 'Failed to delete commission rate.');
    }
  };

  const columns = [
    {
      id: 'vendor',
      label: 'Vendor',
      field: 'vendorId',
      render: (row) => vendorMap[String(row.vendorId)] || row.vendorId || '—',
    },
    {
      id: 'institute',
      label: 'Institute',
      field: 'instituteId',
      render: (row) => instituteMap[String(row.instituteId)] || row.instituteId || '—',
    },
    {
      id: 'course',
      label: 'Course',
      field: 'courseId',
      render: (row) => courseMap[String(row.courseId)] || row.courseId || '—',
    },
    { id: 'rateType', label: 'Rate type', field: 'rateType' },
    { id: 'rate', label: 'Rate', field: 'rate', render: (row) => formatRate(row) },
    { id: 'effectiveFrom', label: 'Effective from', field: 'effectiveFrom', render: (row) => formatDate(row.effectiveFrom) },
    { id: 'effectiveTo', label: 'Effective to', field: 'effectiveTo', render: (row) => formatDate(row.effectiveTo) },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={() => openEditDialog(row)} sx={{ textTransform: 'none', minWidth: 0 }}>
            Edit
          </Button>
          <Button size="small" color="error" onClick={() => handleDelete(row)} sx={{ textTransform: 'none', minWidth: 0 }}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.25} sx={{ mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: 'var(--text)' }}>Commission rates</Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.25 }}>
            All commission rates across vendors, institutes, and courses.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={openCreateDialog}
          sx={{
            ...primaryButtonSx,
            minWidth: { xs: '100%', sm: 160 },
            height: 38,
            px: 2.25,
            alignSelf: { xs: 'stretch', sm: 'auto' },
            whiteSpace: 'nowrap',
          }}
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
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>Loading commission rates...</Typography>
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
        <DialogTitle>{editingRate ? 'Edit commission rate' : 'Add commission rate'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              select
              label="Vendor"
              value={form.vendorId}
              onChange={(e) => setForm((prev) => ({ ...prev, vendorId: e.target.value }))}
              fullWidth
              required
              disabled={Boolean(editingRate)}
            >
              <MenuItem value="">Select vendor</MenuItem>
              {vendors.map((vendor) => {
                const id = vendor.vendorId ?? vendor.VendorId;
                const name = vendor.businessName ?? vendor.BusinessName ?? vendor.name ?? vendor.Name;
                return (
                  <MenuItem key={id} value={String(id)}>
                    {name}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              select
              label="Institute"
              value={form.instituteId}
              onChange={(e) => setForm((prev) => ({ ...prev, instituteId: e.target.value, courseId: '' }))}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {institutes.map((institute) => {
                const id = institute.instituteId ?? institute.InstituteId;
                const name = institute.name ?? institute.Name ?? institute.instituteName ?? institute.InstituteName;
                return (
                  <MenuItem key={id} value={String(id)}>
                    {name}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              select
              label="Course"
              value={form.courseId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
              fullWidth
              disabled={!form.instituteId}
            >
              <MenuItem value="">None</MenuItem>
              {courses.map((course) => {
                const id = course.courseId ?? course.CourseId;
                const name = course.courseName ?? course.CourseName ?? course.name ?? course.Name;
                return (
                  <MenuItem key={id} value={String(id)}>
                    {name}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              select
              label="Rate type"
              value={form.rateType}
              onChange={(e) => setForm((prev) => ({ ...prev, rateType: e.target.value }))}
              fullWidth
              required
            >
              <MenuItem value="Fixed">Fixed</MenuItem>
              <MenuItem value="Percentage">Percentage</MenuItem>
            </TextField>

            <TextField
              label="Rate"
              type="number"
              value={form.rate}
              onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Effective from"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Effective to"
              type="date"
              value={form.effectiveTo}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingRate ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
