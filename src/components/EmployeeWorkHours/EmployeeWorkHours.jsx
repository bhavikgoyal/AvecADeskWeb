import React, { useEffect, useState } from 'react';
import { getAllStartStops } from '../../api/EmployeeWorkHours';
import * as XLSX from 'xlsx';

import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const EmployeeWorkHours = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const minStartDefault = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  })();

  const sevenDaysAgoDefault = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const s = d.toISOString().split('T')[0];
    return s < minStartDefault ? minStartDefault : s;
  })();

  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [employeeInput, setEmployeeInput] = useState('All Users');
  const [startInput, setStartInput] = useState(sevenDaysAgoDefault);
  const [endInput, setEndInput] = useState(todayStr);

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllStartStops();
        const list = Array.isArray(data) ? data : [];

        // ── DEBUG: Aa console.log thi tame check kari shako ke API thi
        // ketla records aavya, ane kaya kaya dates na che. F12 -> Console ma joi lo.
        console.log('[EmployeeWorkHours] Total records from API:', list.length);

        // ── DEBUG: Date-wise count, in an easy-to-read TABLE format.
        // Open browser console, you'll see a clean table of every date
        // and how many records exist for that date.
        const dateCounts = {};
        list.forEach((i) => {
          const key = i.startTime ? String(i.startTime).slice(0, 10) : 'NO_START_TIME';
          dateCounts[key] = (dateCounts[key] || 0) + 1;
        });
        console.log('[EmployeeWorkHours] Records per date (raw startTime string):');
        console.table(
          Object.entries(dateCounts)
            .sort((a, b) => (a[0] > b[0] ? 1 : -1))
            .map(([date, count]) => ({ date, count }))
        );

        console.log('[EmployeeWorkHours] Raw sample (first 5 records):', list.slice(0, 5));

        setActivity(list);
      } catch (err) {
        setError(err.message || 'Failed to load activity list');
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, []);

  const computeEndMax = (startVal) => {
    if (!startVal) return todayStr;
    const d = new Date(startVal);
    d.setMonth(d.getMonth() + 2);
    const maxStr = d.toISOString().split('T')[0];
    return maxStr > todayStr ? todayStr : maxStr;
  };

const toLocalDateStr = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
  const handleSearch = () => {
    setPage(0);

    const newFilters = {
      employeeName: employeeInput === 'All Users' ? '' : employeeInput,
      startDate: startInput || null,
      endDate: endInput || null,
    };

    // ── DEBUG: Search dabavta exact filter values console ma dekhay che
    console.log('[EmployeeWorkHours] Applying filters:', newFilters);

    setFilters(newFilters);
  };

  const filteredActivity = !filters
    ? activity
    : activity.filter((item) => {
        // Employee Filter
        if (
          filters.employeeName &&
          (item.userName || '').trim().toLowerCase() !== filters.employeeName.trim().toLowerCase()
        ) {
          return false;
        }

        // Date Filter — agar startDate/endDate set nathi to date check skip
        if (!filters.startDate && !filters.endDate) {
          return true;
        }

        const itemDateStr = toLocalDateStr(item.startTime);

        // Agar item ma valid startTime j nathi, to e record date-filter lagu
        // thay tyare hide thase (kemke compare karva mate date j nathi).
        if (!itemDateStr) {
          return false;
        }

        if (filters.startDate && itemDateStr < filters.startDate) {
          return false;
        }

        if (filters.endDate && itemDateStr > filters.endDate) {
          return false;
        }

        return true;
      });

  // ── DEBUG: Filter lagavya pachi ketla records reh gaya, console ma dekhay che
  useEffect(() => {
    if (filters) {
      console.log(
        '[EmployeeWorkHours] After filtering:',
        filteredActivity.length,
        'records out of',
        activity.length
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const paginatedActivity = filteredActivity.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatMinutes = (m) => {
    const mins = Number(m);
    if (isNaN(mins)) return '';
    if (mins <= 0) return '0 min';
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hours > 0) return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
    return `${rem} min`;
  };

  // ── Excel Export ──────────────────────────────────────
  const handleExport = () => {
    const exportData = filteredActivity.map((item) => {
      let totalMinutes = '';
      if (item.startTime && item.stopTime) {
        const start = new Date(item.startTime);
        const stop = new Date(item.stopTime);
        const diffMs = stop - start;
        if (!isNaN(diffMs) && diffMs > 0) {
          let mins = Math.floor(diffMs / 60000);
          if (mins === 0 && diffMs > 0) mins = 1;
          totalMinutes = mins;
        } else if (!isNaN(diffMs) && diffMs === 0) {
          totalMinutes = 0;
        }
      }
      return {
        'User Name': item.userName || '',
        'Task Name': item.itemName || '',
    'Start Date': toLocalDateStr(item.startTime) || '',
        'Total Time': totalMinutes !== '' ? formatMinutes(totalMinutes) : '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Task Reports');
    XLSX.writeFile(workbook, `Task_Reports_${todayStr}.xlsx`);
  };
  // ─────────────────────────────────────────────────────

  const uniqueUsers = [...new Set(activity.map((a) => a.userName).filter(Boolean))];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Employee Work Hours
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            User
          </Typography>
          <TextField
            select
            size="small"
            fullWidth
            value={employeeInput}
            onChange={(e) => setEmployeeInput(e.target.value)}
          >
            <MenuItem value="All Users">All Users</MenuItem>
            {uniqueUsers.map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            Start Date
          </Typography>
          <TextField
            type="date"
            size="small"
            fullWidth
            value={startInput}
            slotProps={{ htmlInput: { min: minStartDefault, max: todayStr } }}
            onChange={(e) => {
              let v = e.target.value;
              if (v && v < minStartDefault) v = minStartDefault;
              setStartInput(v || '');
              if (endInput && v && endInput < v) setEndInput(v);
            }}
          />
        </Box>

        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            End Date
          </Typography>
          <TextField
            type="date"
            size="small"
            fullWidth
            value={endInput}
            slotProps={{ htmlInput: { min: startInput || minStartDefault, max: computeEndMax(startInput) } }}
            onChange={(e) => setEndInput(e.target.value || '')}
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          sx={{ height: 40 }}
        >
          Search
        </Button>

        {/* Export Button */}
        <Button
          variant="outlined"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={filteredActivity.length === 0}
          sx={{ height: 40 }}
        >
          Export Excel
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <TablePagination
              component="div"
              count={filteredActivity.length}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[50]}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f6fa' }}>
                  <TableCell sx={{ fontWeight: 700 }}>User Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedActivity.map((item, idx) => {
                    let totalMinutes = '';
                    if (item.startTime && item.stopTime) {
                      const start = new Date(item.startTime);
                      const stop = new Date(item.stopTime);
                      const diffMs = stop - start;
                      if (!isNaN(diffMs) && diffMs > 0) {
                        let mins = Math.floor(diffMs / 60000);
                        if (mins === 0 && diffMs > 0) mins = 1;
                        totalMinutes = mins;
                      } else if (!isNaN(diffMs) && diffMs === 0) {
                        totalMinutes = 0;
                      }
                    }
                    const startDateDisplay = toLocalDateStr(item.startTime) || '';
                    return (
                      <TableRow key={item.id || idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell>{item.userName}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{startDateDisplay}</TableCell>
                        <TableCell>{totalMinutes !== '' ? formatMinutes(totalMinutes) : ''}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default EmployeeWorkHours;