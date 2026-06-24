import React, { useEffect, useState } from 'react';
import { getAllStartStops } from '../../api/startstopApi';

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

const StartStopActivity = () => {
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
        setActivity(Array.isArray(data) ? data : []);
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

 const handleSearch = () => {
  setPage(0);

  setFilters({
    employeeName: employeeInput,
  });
};

const filteredActivity = !filters
  ? activity
  : activity.filter((item) => {
      if (!filters.employeeName) {
        return true;
      }

      return (
        (item.userName || '').trim() ===
        filters.employeeName.trim()
      );
    });

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

  const uniqueUsers = [...new Set(activity.map((a) => a.userName).filter(Boolean))];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Task Reports
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
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
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
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
     ) : (
  <>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        mb: 1,
      }}
    >
      <TablePagination
        component="div"
        count={filteredActivity.length}
        page={page}
        onPageChange={(event, newPage) => {
          setPage(newPage);
        }}
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

                  const startDateDisplay = item.startTime
                    ? new Date(item.startTime).toLocaleDateString()
                    : '';

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

export default StartStopActivity;