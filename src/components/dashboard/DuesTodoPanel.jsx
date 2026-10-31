import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import { dismissDuesTodoItem, getDuesTodoItems } from '../../api/cardApi';

export const OVERDUE_TASKS_PATH = '/dashboard/overdue-tasks';

// Same cell borders as the College Summary table.
export const BORDER = '#d0d0d0';

export const headCellSx = {
  fontWeight: 800,
  fontSize: 11,
  color: '#fff',
  textTransform: 'uppercase',
  bgcolor: 'var(--primary)',
  border: '1px solid var(--primary-dark)',
  whiteSpace: 'nowrap',
  px: 1.25,
  py: 0.6,
  lineHeight: 1.3,
};

export const bodyCellSx = {
  fontSize: 12,
  color: '#000',
  border: `1px solid ${BORDER}`,
  px: 1.25,
  py: 0.4,
  lineHeight: 1.35,
};

export default function DuesTodoPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getDuesTodoItems()
      .then((list) => { if (mounted) setRows(list); })
      .catch(() => { if (mounted) setError('Dues to do could not be loaded.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Hides the task from this panel only; it stays open on the Accounting cards and on View All Tasks.
  const handleDismiss = async (row) => {
    setRows((prev) => prev.filter((r) => r !== row));
    try {
      await dismissDuesTodoItem(row.itemName, row.cardDate);
    } catch (err) {
      console.error('Failed to hide task', err);
      setRows((prev) => (prev.includes(row) ? prev : [...prev, row]));
      toast.error('Task could not be hidden. Please try again.');
    }
  };

  return (
    // Same box and title row as College Summary, so the two tables' header rows line up side by side.
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        p: 1.5,
        boxSizing: 'border-box',
        width: '100%',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>Overdue Team Tasks</Typography>
         
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ListAltOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => navigate(OVERDUE_TASKS_PATH)}
            sx={{
              height: 20,
              minHeight: 0,
              py: 0,
              px: 1,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.7rem',
              lineHeight: 1,
              borderRadius: 999,
              borderColor: 'var(--primary)',
              color: 'var(--primary-dark)',
              whiteSpace: 'nowrap',
              '& .MuiButton-startIcon': { mr: 0.5 },
              '&:hover': { bgcolor: 'var(--primary-soft)', borderColor: 'var(--primary-dark)' },
            }}
          >
            View All Tasks
          </Button>
          {!loading && !error && rows.length > 0 && (
            <Box
              sx={{
                height: 20,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 999,
                bgcolor: 'var(--primary)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {rows.length} item{rows.length === 1 ? '' : 's'}
            </Box>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} sx={{ color: 'var(--primary)' }} />
        </Box>
      ) : error ? (
        <Typography variant="body2" sx={{ py: 1, color: 'var(--danger)' }}>{error}</Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" sx={{ py: 1, color: 'var(--muted)' }}>No pending tasks.</Typography>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <TableContainer sx={{ flex: 1, maxHeight: { xs: 300, lg: 'none' }, overflow: 'auto', border: `1px solid ${BORDER}` }}>
          <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: '30%' }} />
              <col />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCellSx, px: 0.5 }} />
                <TableCell sx={headCellSx}>Member Name</TableCell>
                <TableCell sx={headCellSx}>Task</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.itemName}-${row.cardDate}-${index}`}>
                  <TableCell sx={{ ...bodyCellSx, px: 0.5, textAlign: 'center' }}>
                    <Checkbox
                      size="small"
                      checked={false}
                      onChange={() => handleDismiss(row)}
                      inputProps={{ 'aria-label': 'Hide task from dashboard' }}
                      sx={{ p: 0.25, color: 'var(--primary)', '&.Mui-checked': { color: 'var(--primary)' } }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...bodyCellSx, color: 'var(--muted)' }}>{row.assignedTo}</TableCell>
                  <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }}>{row.itemName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}
    </Paper>
  );
}
