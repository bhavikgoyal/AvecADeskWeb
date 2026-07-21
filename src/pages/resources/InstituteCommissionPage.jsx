import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ExcelIcon from '@mui/icons-material/TableView';
// or another icon you're using
import ResponsiveTable from '../../components/ResponsiveTable';
import { primaryButtonSx } from '../../components/forms';
import { createInstituteCommissionRate, fetchCommissionRates, fetchCommissionHistory, getEmptyCommissionRateForm, } from '../../api/commissionsApi';
import { fetchInstitutes, fetchCoursesByInstitute, } from '../../api/lookupApi';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import XLSX from 'xlsx-js-style';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { exportInstituteCommissionPdf } from '../../utils/instituteCommissionPdf';

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
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  const filteredRow = useMemo(() => {
    return rates.filter((r) => {
      const instituteMatch =
        !selectedInstitute ||
        String(r.instituteId) === String(selectedInstitute);

      const courseMatch =
        !selectedCourse ||
        String(r.courseId) === String(selectedCourse);

      return instituteMatch && courseMatch;
    });
  }, [rates, selectedInstitute, selectedCourse]);

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

  const allSelected = rates.length > 0 && selectedIds.length === rates.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.length === rates.length ? [] : rates.map((r) => r.commissionId)
    );
  };
  const handleExportPdf = () => {
    const selectedRows = rates
      .filter((r) => selectedIds.includes(r.commissionId))
      .map((r) => ({
        instituteName: instituteMap[String(r.instituteId)] || '—',
        courseName: courseMap[String(r.courseId)] || '—',
        rateType: r.rateType,
        rate: r.rate,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
      }));

    exportInstituteCommissionPdf(selectedRows);
  };
  const columns = [
    {
      id: 'select',
      align: 'center',

      headerSx: {
        width: 44,
        px: 0.5,
      },

      cellSx: {
        width: 44,
        px: 0.5,
      },

      label: (
        <Checkbox
          size="small"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleAll}
          sx={{ p: 0 }}
        />
      ),

      render: (row) => (
        <Checkbox
          size="small"
          checked={selectedIds.includes(row.commissionId)}
          onChange={() => toggleRow(row.commissionId)}
          sx={{ p: 0 }}
        />
      ),
    },

    {
      id: 'institute',
      label: 'Institute',
      render: (row) => instituteMap[String(row.instituteId)] || '—',
    },

    {
      id: 'course',
      label: 'Course',
      render: (row) => courseMap[String(row.courseId)] || '—',
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
        <Button size="small" onClick={() => openHistoryDialog(row)}>History</Button>
      ),
    },
  ];

  function exportExcel() {
    const headers = ["Rate Type", "Rate", "From", "To"];

    const wsData = [
      [`Institute : ${instituteName}`], [`Course: ${courseName}`], [],
      headers,
      ...historyData.map((item) => [
        item.rateType, item.rate, formatDate(item.effectiveFrom), formatDate(item.effectiveTo),]),];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge first two rows
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },];

    // Column Width
    ws["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 },];

    // Institute Row
    ws["A1"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "left", vertical: "center" },
    };

    // Course Row
    ws["A2"].s = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "left", vertical: "center" },
    };

    // Header Style
    ["A4", "B4", "C4", "D4"].forEach((cell) => {
      ws[cell].s = {
        font: { bold: true, color: { rgb: "000000" }, },
        fill: { fgColor: { rgb: "A6A6A6" }, }, // Light gray header background
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "BFBFBF" } },
          bottom: { style: "thin", color: { rgb: "BFBFBF" } },
          left: { style: "thin", color: { rgb: "BFBFBF" } },
          right: { style: "thin", color: { rgb: "BFBFBF" } },
        },
      };
    });

    // Data Rows
    for (let row = 5; row < historyData.length + 5; row++) {
      ["A", "B", "C", "D"].forEach((col) => {
        const ref = `${col}${row}`;

        if (ws[ref]) {
          ws[ref].s = {
            alignment: {
              horizontal: "center",
              vertical: "center",
            },
            border: {
              top: { style: "thin", color: { rgb: "D9D9D9" } },
              bottom: { style: "thin", color: { rgb: "D9D9D9" } },
              left: { style: "thin", color: { rgb: "D9D9D9" } },
              right: { style: "thin", color: { rgb: "D9D9D9" } },
            },
          };
        }
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commission History");
    XLSX.writeFile(wb, "Commission_History.xlsx");
  }

  const history = historyData[0];
  const instituteName =
    history?.instituteName ||
    instituteMap[String(history?.instituteId)] ||
    '—';

  const courseName =
    history?.courseName ||
    courseMap[String(history?.courseId)] ||
    '—';

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mb: 2, }}>
            Institute Commission Rates</Typography> </Box>

       
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Typography sx={{ color: 'var(--muted)', py: 2 }}>Loading...</Typography>
      ) : rates.length ? (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} style={{justifyContent:'space-between'}}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <TextField
                  select
                  label="Institute"
                  size="small"
                  value={selectedInstitute}
                  onChange={(e) => {
                    setSelectedInstitute(e.target.value);
                    setSelectedCourse("");
                  }} sx={{ minWidth: 250 }}
                >
                  <MenuItem value="">All Institutes</MenuItem>

                  {institutes.map((i) => (
                    <MenuItem key={i.instituteId} value={i.instituteId}> {i.instituteName} </MenuItem> 
                  ))}
                </TextField>

                <TextField
                  select
                  label="Course" size="small" value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  sx={{ minWidth: 250 }}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {allCourses.filter( (c) => !selectedInstitute || String(c.instituteId) === String(selectedInstitute) )
                    .map((c) => (<MenuItem key={c.courseId} value={c.courseId}> {c.courseName} </MenuItem>))}
                </TextField>
            </div>
            <div>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                <Tooltip title={selectedIds.length === 0 ? 'Select at least one institute' : ''}>
                  <span>
                    <Button variant="outlined" size="small" startIcon={<PictureAsPdfOutlinedIcon />} onClick={handleExportPdf} disabled={!selectedIds.length} sx={{ textTransform: 'none', height: 38, borderRadius: 2, fontWeight: 600, whiteSpace: 'nowrap', px: 2 }}>
                      Export PDF{selectedIds.length ? ` (${selectedIds.length})` : ''}
                    </Button>
                  </span>
                </Tooltip>

                <Button variant="contained" onClick={openCreateDialog} sx={{ ...primaryButtonSx, minWidth: 160, height: 38, px: 2.25, whiteSpace: 'nowrap' }}>
                  Add Commission Rate
                </Button>
              </Box>
            </div>
          </Stack>
          <ResponsiveTable columns={columns} rows={filteredRow} getRowKey={(row) => row.commissionId} alwaysTable sx={{ mt: 0.5 }} />
        </>
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
            <TextField select label="Institute" value={form.instituteId} fullWidth required onChange={(e) => setForm({ ...form, instituteId: e.target.value })}>
              <MenuItem value="">Select Institute</MenuItem>
              {institutes.map((i) => <MenuItem key={i.instituteId} value={i.instituteId}>{i.instituteName}</MenuItem>)}
            </TextField>

            <TextField select label="Course" value={form.courseId}fullWidth  disabled={!form.instituteId}onChange={(e) => setForm((prev) => ({  ...prev, courseId: e.target.value,}))} >
              <MenuItem value="">Select Course</MenuItem>
              {dialogCourses.map((c) => ( <MenuItem key={c.courseId} value={c.courseId}> {c.courseName} </MenuItem>))}
              {dialogCourses.length === 0 && ( <MenuItem value="" disabled> No courses available </MenuItem>)}
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
        <DialogTitle sx={{ fontWeight: 700, fontSize: '20px', color: '#1f2937', }}>Commission History</DialogTitle>

        <DialogContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2, }} >
            <Box
              sx={{ flex: 1, p: 2, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider', borderRadius: 2, }} >

              <Typography sx={{ mb: 0.5, fontSize: '0.9rem' }}>
                <Box component="span" sx={{ fontWeight: 600 }}> Institute:</Box>{' '}
                {instituteName}
              </Typography>

              <Typography sx={{ fontSize: '0.9rem' }}>
                <Box component="span" sx={{ fontWeight: 600 }}> Course:</Box>{' '}
                {courseName}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<ExcelIcon />}
              onClick={exportExcel}
              disabled={historyData.length === 0}
              sx={{
                height: 35, backgroundColor: '#217346', color: '#fff', textTransform: 'none', fontWeight: 500,
                fontSize: '14px', px: 2,
              }}> Export Excel </Button>
          </Box>
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
          <Button onClick={() => setHistoryOpen(false)}> Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}