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
        console.log('[EmployeeWorkHours] Total records from API:', list.length);
        const dateCounts = {};
        list.forEach((i) => {
          const key = i.startTime ? String(i.startTime).slice(0, 10) : 'NO_START_TIME';
          dateCounts[key] = (dateCounts[key] || 0) + 1;
        });
        console.log('[EmployeeWorkHours] Records per date:');
        console.table(
          Object.entries(dateCounts)
            .sort((a, b) => (a[0] > b[0] ? 1 : -1))
            .map(([date, count]) => ({ date, count }))
        );
        console.log('[EmployeeWorkHours] Raw sample (first 5):', list.slice(0, 5));
        console.table(
          list.map((x) => ({
            userName: x.userName,
            startTime: x.startTime,
            stopTime: x.stopTime,
          }))
        );
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
    console.log("Selected User :", employeeInput);
    console.log("Start Date :", startInput);
    console.log("End Date :", endInput);
    console.log('[EmployeeWorkHours] Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const filteredActivity = !filters
    ? activity
    : activity.filter((item) => {
        if (filters.employeeName) {
          const selectedUser = filters.employeeName.trim().replace(/\s+/g, " ").toLowerCase();
          const currentUser = (item.userName || "").trim().replace(/\s+/g, " ").toLowerCase();
          if (!currentUser.includes(selectedUser)) return false;
        }
        if (!filters.startDate && !filters.endDate) return true;
        const itemDateStr = toLocalDateStr(item.startTime);
        if (!itemDateStr) return false;
        if (filters.startDate && itemDateStr < filters.startDate) return false;
        if (filters.endDate && itemDateStr > filters.endDate) return false;
        return true;
      });

  useEffect(() => {
    if (filters) {
      console.log('[EmployeeWorkHours] After filtering:', filteredActivity.length, 'records out of', activity.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const paginatedActivity = filteredActivity.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatMinutes = (m) => {
    const mins = Number(m);
    if (isNaN(mins)) return '';
    if (mins <= 0) return '0 min';
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hours > 0) return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
    return `${rem} min`;
  };

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Work Hours');
    XLSX.writeFile(workbook, `Employee_Work_Hours_${todayStr}.xlsx`);
  };

  const ExcelIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="5" fill="#1d6f42"/>
      <rect x="16" y="2" width="14" height="18" rx="2" fill="#2ea35a"/>
      <rect x="17" y="3" width="12" height="3" fill="#3cbf6a"/>
      <rect x="17" y="7" width="12" height="2" fill="#2ea35a"/>
      <rect x="17" y="10" width="12" height="2" fill="#3cbf6a"/>
      <rect x="17" y="13" width="12" height="2" fill="#2ea35a"/>
      <rect x="17" y="16" width="12" height="2" fill="#3cbf6a"/>
      <rect x="2" y="8" width="18" height="22" rx="2" fill="#185c37"/>
      <text x="11" y="24" fontSize="13" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">X</text>
    </svg>
  );

  const uniqueUsers = [
    ...new Set(
      activity
        .map((a) => (a.userName || "").trim())
        .filter((a) => a !== "")
    ),
  ].sort();

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
            select size="small" fullWidth
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
            type="date" size="small" fullWidth
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
          />
        </Box>

        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            End Date
          </Typography>
          <TextField
            type="date" size="small" fullWidth
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
          />
        </Box>

        {/* Search Button - same color as Add Vendor #2F80C9 */}
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          sx={{
            height: 40,
            backgroundColor: '#2F80C9',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '8px',
            px: 3,
            boxShadow: '0 3px 8px rgba(47, 128, 201, 0.35)',
            '&:hover': {
              backgroundColor: '#2874B8',
              boxShadow: '0 4px 10px rgba(47, 128, 201, 0.45)',
            },
          }}
        >
          Search
        </Button>

        {/* Export Excel Button - light green */}
        <Button
          variant="contained"
          startIcon={<ExcelIcon />}
          onClick={handleExport}
          disabled={filteredActivity.length === 0}
          sx={{
            height: 40,
            backgroundColor: '#66bb6a',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '14px',
            paddingX: 2,
            '&:hover': { backgroundColor: '#57a85b' },
            '&:disabled': { backgroundColor: '#c8e6c9', color: '#fff' },
          }}
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
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
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